import dns from "node:dns";
import path from "node:path";
import dotenv from "dotenv";

const cwdEnv = path.join(process.cwd(), ".env");
const repoRootEnv = path.join(__dirname, "..", "..", ".env");
dotenv.config({ path: repoRootEnv });
dotenv.config({ path: cwdEnv });

/** Helps Atlas `mongodb+srv://` DNS on Windows / some networks (IPv6/SRV quirks). */
dns.setDefaultResultOrder("ipv4first");

import bcrypt from "bcryptjs";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { connectMongo } from "./db";
import { makeId } from "./ids";
import * as repo from "./repository";
import { summarizeVulnerabilities } from "./storage";
import { runSecurityTests } from "./scanner";
import type { CheckoutSessionRecord, PlanTier, ScanRecord, ScanVulnerability, UserRecord } from "./types";

const app = express();
const PORT = Number(process.env.PORT ?? 5000);
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const MONGODB_URI = process.env.MONGODB_URI;

function routeParam(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

function signTokens(user: UserRecord) {
  const payload = { sub: user.id, email: user.email };
  return {
    accessToken: jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" }),
    refreshToken: jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" }),
  };
}

function sanitizeUser(user: UserRecord) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function createError(status: number, code: string, message: string) {
  return { status, code, message };
}

interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

async function authRequired(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      next(createError(401, "UNAUTHORIZED", "Missing bearer token."));
      return;
    }

    const token = authorization.slice("Bearer ".length);
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await repo.findUserById(payload.sub);

    if (!user) {
      next(createError(401, "UNAUTHORIZED", "User not found."));
      return;
    }

    req.user = user;
    next();
  } catch {
    next(createError(401, "UNAUTHORIZED", "Invalid or expired token."));
  }
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "shield-sme-api", storage: "mongodb" });
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    };

    if (!email || !password) {
      throw createError(400, "INVALID_INPUT", "Email and password are required.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await repo.findUserByEmail(normalizedEmail);
    if (existing) {
      throw createError(409, "EMAIL_EXISTS", "This email is already registered.");
    }

    const user: UserRecord = {
      id: makeId("user"),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 10),
      firstName,
      lastName,
      role: "user",
      subscriptionStatus: "none",
      planTier: "free",
    };

    await repo.createUser(user);

    res.status(201).json({
      ...signTokens(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const user = await repo.findUserByEmail(String(email ?? ""));

    if (!user || !password || !(await bcrypt.compare(password, user.passwordHash))) {
      throw createError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    res.json({
      ...signTokens(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      throw createError(400, "INVALID_INPUT", "Refresh token is required.");
    }
    const payload = jwt.verify(refreshToken, JWT_SECRET) as { sub: string };
    const user = await repo.findUserById(payload.sub);
    if (!user) {
      throw createError(401, "UNAUTHORIZED", "User not found.");
    }
    res.json(signTokens(user));
  } catch {
    next(createError(401, "UNAUTHORIZED", "Invalid or expired refresh token."));
  }
});

app.post("/api/auth/logout", (_req, res) => {
  res.json({ success: true });
});

app.get("/api/auth/me", authRequired, (req: AuthenticatedRequest, res) => {
  res.json(sanitizeUser(req.user!));
});

app.post("/api/auth/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body as { email?: string };
    const user = await repo.findUserByEmail(String(email ?? ""));

    if (!user) {
      res.json({ success: true });
      return;
    }

    await repo.deleteResetTokensForUser(user.id);
    const token = makeId("reset");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await repo.addResetToken({ token, userId: user.id, expiresAt });

    res.json({
      success: true,
      resetToken: token,
      resetUrl: `${CLIENT_URL}/reset-password/${token}`,
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/verify-reset-token", async (req, res, next) => {
  try {
    const { token } = req.body as { token?: string };
    const resetToken = await repo.findResetToken(String(token ?? ""));
    if (!resetToken || new Date(resetToken.expiresAt).getTime() < Date.now()) {
      throw createError(400, "INVALID_RESET_TOKEN", "Invalid or expired reset link.");
    }
    const user = await repo.findUserById(resetToken.userId);
    if (!user) {
      throw createError(404, "NOT_FOUND", "User not found.");
    }
    res.json({ valid: true, email: user.email });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body as {
      token?: string;
      newPassword?: string;
      confirmPassword?: string;
    };
    if (!token || !newPassword || !confirmPassword) {
      throw createError(400, "INVALID_INPUT", "Token and passwords are required.");
    }
    if (newPassword !== confirmPassword) {
      throw createError(400, "PASSWORD_MISMATCH", "Passwords do not match.");
    }

    const resetToken = await repo.findResetToken(token);
    if (!resetToken || new Date(resetToken.expiresAt).getTime() < Date.now()) {
      throw createError(400, "INVALID_RESET_TOKEN", "Invalid or expired reset link.");
    }

    const user = await repo.findUserById(resetToken.userId);
    if (!user) {
      throw createError(404, "NOT_FOUND", "User not found.");
    }

    await repo.updateUserPassword(user.id, await bcrypt.hash(newPassword, 10));
    await repo.deleteResetToken(token);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/scan/security", async (req, res, next) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url) {
      throw createError(400, "INVALID_URL", "A target URL is required.");
    }
    const tests = await runSecurityTests(url);
    res.json({ tests });
  } catch (error) {
    next(error);
  }
});

app.post("/api/scans", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { url, vulnerabilities = [], duration = 0 } = req.body as {
      url?: string;
      vulnerabilities?: ScanVulnerability[];
      duration?: number;
    };
    if (!url) {
      throw createError(400, "INVALID_URL", "A target URL is required.");
    }

    const scan: ScanRecord = {
      _id: makeId("scan"),
      userId: req.user!.id,
      url,
      createdAt: new Date().toISOString(),
      duration,
      vulnerabilities,
      summary: summarizeVulnerabilities(vulnerabilities),
    };
    await repo.createScan(scan);
    await repo.logActivity(req.user!.id, "scan_completed", "scan", {
      entityId: scan._id,
      targetUrl: url,
    });

    res.status(201).json({ message: "Scan saved", scan });
  } catch (error) {
    next(error);
  }
});

app.get("/api/scans", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const { scans, total } = await repo.listScansForUser(req.user!.id, page, limit);
    res.json({
      scans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/scans/:id", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const scan = await repo.getScan(req.user!.id, routeParam(req.params.id));
    if (!scan) {
      throw createError(404, "NOT_FOUND", "Scan not found.");
    }
    res.json(scan);
  } catch (error) {
    next(error);
  }
});

app.get("/api/scans/:id/report", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const scan = await repo.getScan(req.user!.id, routeParam(req.params.id));
    if (!scan) {
      throw createError(404, "NOT_FOUND", "Scan not found.");
    }
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const rows = scan.vulnerabilities
      .map(
        (v) =>
          `<tr><td>${esc(v.severity)}</td><td>${esc(v.type)}</td><td>${esc(v.description)}</td><td>${esc(v.recommendation)}</td></tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Scan ${esc(scan._id)}</title></head><body>
<h1>VulnGuard scan report</h1><p><strong>URL:</strong> ${esc(scan.url)}</p><p><strong>Date:</strong> ${esc(scan.createdAt)}</p>
<table border="1" cellpadding="6"><thead><tr><th>Severity</th><th>Type</th><th>Description</th><th>Recommendation</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="scan-${scan._id}.html"`);
    res.send(html);
  } catch (error) {
    next(error);
  }
});

app.put("/api/scans/:id", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await repo.updateScanRecord(
      req.user!.id,
      routeParam(req.params.id),
      req.body as Partial<ScanRecord>,
    );
    if (!updated) {
      throw createError(404, "NOT_FOUND", "Scan not found.");
    }
    res.json({ message: "Scan updated", scan: updated });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/scans/:id/vulnerabilities/:vulnId", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { resolved } = req.body as { resolved?: boolean };
    if (typeof resolved !== "boolean") {
      throw createError(400, "INVALID_INPUT", "resolved boolean is required.");
    }
    const scan = await repo.patchVulnerabilityResolved(
      req.user!.id,
      routeParam(req.params.id),
      routeParam(req.params.vulnId),
      resolved,
    );
    if (!scan) {
      throw createError(404, "NOT_FOUND", "Scan or vulnerability not found.");
    }
    res.json({ message: "Updated", scan });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/scans/:id", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    await repo.deleteScan(req.user!.id, routeParam(req.params.id));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/profile", authRequired, (req: AuthenticatedRequest, res) => {
  res.json(sanitizeUser(req.user!));
});

app.put("/api/users/profile", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    await repo.updateUserNames(req.user!.id, req.body?.firstName, req.body?.lastName);
    const user = await repo.findUserById(req.user!.id);
    res.json({ message: "Profile updated", user: sanitizeUser(user!) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/settings", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const settings = await repo.getUserSettings(req.user!.id);
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

app.put("/api/users/settings", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const current = await repo.getUserSettings(req.user!.id);
    const merged = {
      ...current,
      ...req.body,
      notifications: {
        ...current.notifications,
        ...(req.body?.notifications ?? {}),
      },
      automatedScans: {
        ...current.automatedScans,
        ...(req.body?.automatedScans ?? {}),
      },
      badge: {
        ...current.badge,
        ...(req.body?.badge ?? {}),
      },
    };
    await repo.saveUserSettings(req.user!.id, merged);
    res.json({ message: "Settings saved", settings: merged });
  } catch (error) {
    next(error);
  }
});

app.get("/api/activity", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const limit = Math.min(100, Number(req.query.limit ?? 20));
    const logs = await repo.listActivity(req.user!.id, limit);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

app.post("/api/schedules", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { targetUrl, cronExpression, description } = req.body as {
      targetUrl?: string;
      cronExpression?: string;
      description?: string;
    };
    if (!targetUrl || !cronExpression) {
      throw createError(400, "INVALID_INPUT", "targetUrl and cronExpression are required.");
    }
    const schedule = {
      id: makeId("schedule"),
      userId: req.user!.id,
      targetUrl,
      cronExpression,
      description,
      createdAt: new Date().toISOString(),
    };
    await repo.createSchedule(schedule);
    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
});

app.get("/api/schedules", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.json(await repo.listSchedules(req.user!.id));
  } catch (error) {
    next(error);
  }
});

app.put("/api/schedules/:id", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const schedule = await repo.updateScheduleRecord(req.user!.id, routeParam(req.params.id), req.body);
    if (!schedule) {
      throw createError(404, "NOT_FOUND", "Schedule not found.");
    }
    res.json(schedule);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/schedules/:id", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    await repo.deleteSchedule(req.user!.id, routeParam(req.params.id));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/stripe/checkout-session", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const planTier = (req.body?.planTier ?? "free") as PlanTier;
    const session: CheckoutSessionRecord = {
      id: makeId("checkout"),
      userId: req.user!.id,
      planTier,
      createdAt: new Date().toISOString(),
      verified: false,
    };
    await repo.createCheckoutSession(session);
    res.json({
      sessionId: session.id,
      sessionUrl: `${CLIENT_URL}/success?session_id=${session.id}`,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/stripe/verify-session", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    const session = await repo.findCheckoutSession(req.user!.id, String(sessionId ?? ""));
    if (!session) {
      throw createError(404, "NOT_FOUND", "Checkout session not found.");
    }

    const planTier = session.planTier;
    await repo.updateUserSubscription(req.user!.id, {
      planTier,
      subscriptionStatus: planTier === "free" ? "none" : "active",
      currentPeriodEnd:
        planTier === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await repo.markCheckoutVerified(req.user!.id, session.id);

    const user = await repo.findUserById(req.user!.id);
    res.json({ success: true, user: sanitizeUser(user!) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/stripe/subscription-status", authRequired, (req: AuthenticatedRequest, res) => {
  res.json({
    planTier: req.user!.planTier,
    subscriptionStatus: req.user!.subscriptionStatus,
    currentPeriodEnd: req.user!.currentPeriodEnd,
  });
});

app.post("/api/stripe/cancel-subscription", authRequired, async (req: AuthenticatedRequest, res, next) => {
  try {
    await repo.updateUserSubscription(req.user!.id, {
      subscriptionStatus: "canceled",
      currentPeriodEnd: null,
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/stripe/update-payment-method", authRequired, (_req, res) => {
  res.json({
    success: true,
    message: "Payment method updates are stubbed in local development mode.",
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status =
    typeof error === "object" && error !== null && "status" in error ? Number((error as { status: number }).status) : 500;
  const code =
    typeof error === "object" && error !== null && "code" in error ? String((error as { code: string }).code) : "INTERNAL_ERROR";
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: string }).message)
      : "Something went wrong.";

  res.status(status).json({ error: message, code });
});

async function bootstrap() {
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI. Set it in shield-sme-api/.env or the environment.");
    process.exit(1);
  }
  await connectMongo(MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`shield-sme-api listening on http://localhost:${PORT} (MongoDB)`);
  });
}

void bootstrap().catch((err: unknown) => {
  const hint = err && typeof err === "object" && "mongoDnsHint" in err ? String((err as { mongoDnsHint: string }).mongoDnsHint) : "";
  if (hint) console.error(hint);
  console.error(err);
  process.exit(1);
});
