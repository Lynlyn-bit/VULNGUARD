import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { loadDb, saveDb, ensureUserSettings, summarizeVulnerabilities } from "./storage";
import { runSecurityTests } from "./scanner";
import {
  CheckoutSessionRecord,
  PlanTier,
  ScanRecord,
  ScanVulnerability,
  ScheduleRecord,
  UserRecord,
} from "./types";

const app = express();
const PORT = Number(process.env.PORT ?? 5000);
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
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

function authRequired(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    next(createError(401, "UNAUTHORIZED", "Missing bearer token."));
    return;
  }

  try {
    const token = authorization.slice("Bearer ".length);
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const db = loadDb();
    const user = db.users.find((item) => item.id === payload.sub);

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "shield-sme-api" });
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

    const db = loadDb();
    const normalizedEmail = email.trim().toLowerCase();
    if (db.users.some((item) => item.email.toLowerCase() === normalizedEmail)) {
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

    db.users.push(user);
    ensureUserSettings(db, user.id);
    saveDb(db);

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
    const db = loadDb();
    const user = db.users.find((item) => item.email.toLowerCase() === String(email).trim().toLowerCase());

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

app.post("/api/auth/refresh", (req, res, next) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      throw createError(400, "INVALID_INPUT", "Refresh token is required.");
    }
    const payload = jwt.verify(refreshToken, JWT_SECRET) as { sub: string };
    const db = loadDb();
    const user = db.users.find((item) => item.id === payload.sub);
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

app.post("/api/auth/forgot-password", (req, res, next) => {
  try {
    const { email } = req.body as { email?: string };
    const db = loadDb();
    const user = db.users.find((item) => item.email.toLowerCase() === String(email).trim().toLowerCase());

    if (!user) {
      res.json({ success: true });
      return;
    }

    db.resetTokens = db.resetTokens.filter((item) => item.userId !== user.id);
    const token = makeId("reset");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.resetTokens.push({ token, userId: user.id, expiresAt });
    saveDb(db);

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

app.post("/api/auth/verify-reset-token", (req, res, next) => {
  try {
    const { token } = req.body as { token?: string };
    const db = loadDb();
    const resetToken = db.resetTokens.find((item) => item.token === token);
    if (!resetToken || new Date(resetToken.expiresAt).getTime() < Date.now()) {
      throw createError(400, "INVALID_RESET_TOKEN", "Invalid or expired reset link.");
    }
    const user = db.users.find((item) => item.id === resetToken.userId);
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

    const db = loadDb();
    const resetToken = db.resetTokens.find((item) => item.token === token);
    if (!resetToken || new Date(resetToken.expiresAt).getTime() < Date.now()) {
      throw createError(400, "INVALID_RESET_TOKEN", "Invalid or expired reset link.");
    }

    const user = db.users.find((item) => item.id === resetToken.userId);
    if (!user) {
      throw createError(404, "NOT_FOUND", "User not found.");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    db.resetTokens = db.resetTokens.filter((item) => item.token !== token);
    saveDb(db);

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

app.post("/api/scans", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const { url, vulnerabilities = [], duration = 0 } = req.body as {
      url?: string;
      vulnerabilities?: ScanVulnerability[];
      duration?: number;
    };
    if (!url) {
      throw createError(400, "INVALID_URL", "A target URL is required.");
    }

    const db = loadDb();
    const scan: ScanRecord = {
      _id: makeId("scan"),
      userId: req.user!.id,
      url,
      createdAt: new Date().toISOString(),
      duration,
      vulnerabilities,
      summary: summarizeVulnerabilities(vulnerabilities),
    };
    db.scans.unshift(scan);
    saveDb(db);

    res.status(201).json({ scan });
  } catch (error) {
    next(error);
  }
});

app.get("/api/scans", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const db = loadDb();
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const scans = db.scans.filter((item) => item.userId === req.user!.id);
    const start = (page - 1) * limit;
    res.json({
      scans: scans.slice(start, start + limit),
      total: scans.length,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/scans/:id", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const db = loadDb();
    const scan = db.scans.find((item) => item._id === req.params.id && item.userId === req.user!.id);
    if (!scan) {
      throw createError(404, "NOT_FOUND", "Scan not found.");
    }
    res.json(scan);
  } catch (error) {
    next(error);
  }
});

app.put("/api/scans/:id", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const db = loadDb();
    const scan = db.scans.find((item) => item._id === req.params.id && item.userId === req.user!.id);
    if (!scan) {
      throw createError(404, "NOT_FOUND", "Scan not found.");
    }
    Object.assign(scan, req.body);
    if (Array.isArray(req.body?.vulnerabilities)) {
      scan.summary = summarizeVulnerabilities(req.body.vulnerabilities as ScanVulnerability[]);
    }
    saveDb(db);
    res.json(scan);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/scans/:id", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const db = loadDb();
    db.scans = db.scans.filter((item) => !(item._id === req.params.id && item.userId === req.user!.id));
    saveDb(db);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/profile", authRequired, (req: AuthenticatedRequest, res) => {
  res.json(sanitizeUser(req.user!));
});

app.put("/api/users/profile", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const db = loadDb();
    const user = db.users.find((item) => item.id === req.user!.id)!;
    user.firstName = req.body?.firstName ?? user.firstName;
    user.lastName = req.body?.lastName ?? user.lastName;
    saveDb(db);
    res.json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/settings", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const db = loadDb();
    const settings = ensureUserSettings(db, req.user!.id);
    saveDb(db);
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

app.put("/api/users/settings", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const db = loadDb();
    const current = ensureUserSettings(db, req.user!.id);
    db.settings[req.user!.id] = {
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
    saveDb(db);
    res.json(db.settings[req.user!.id]);
  } catch (error) {
    next(error);
  }
});

app.post("/api/schedules", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const { targetUrl, cronExpression, description } = req.body as {
      targetUrl?: string;
      cronExpression?: string;
      description?: string;
    };
    if (!targetUrl || !cronExpression) {
      throw createError(400, "INVALID_INPUT", "targetUrl and cronExpression are required.");
    }
    const db = loadDb();
    const schedule: ScheduleRecord = {
      id: makeId("schedule"),
      userId: req.user!.id,
      targetUrl,
      cronExpression,
      description,
      createdAt: new Date().toISOString(),
    };
    db.schedules.unshift(schedule);
    saveDb(db);
    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
});

app.get("/api/schedules", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const db = loadDb();
    res.json(db.schedules.filter((item) => item.userId === req.user!.id));
  } catch (error) {
    next(error);
  }
});

app.put("/api/schedules/:id", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const db = loadDb();
    const schedule = db.schedules.find((item) => item.id === req.params.id && item.userId === req.user!.id);
    if (!schedule) {
      throw createError(404, "NOT_FOUND", "Schedule not found.");
    }
    Object.assign(schedule, req.body);
    saveDb(db);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/schedules/:id", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const db = loadDb();
    db.schedules = db.schedules.filter((item) => !(item.id === req.params.id && item.userId === req.user!.id));
    saveDb(db);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/stripe/checkout-session", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const planTier = (req.body?.planTier ?? "free") as PlanTier;
    const db = loadDb();
    const session: CheckoutSessionRecord = {
      id: makeId("checkout"),
      userId: req.user!.id,
      planTier,
      createdAt: new Date().toISOString(),
      verified: false,
    };
    db.checkoutSessions.push(session);
    saveDb(db);
    res.json({
      sessionId: session.id,
      sessionUrl: `${CLIENT_URL}/success?session_id=${session.id}`,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/stripe/verify-session", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    const db = loadDb();
    const session = db.checkoutSessions.find((item) => item.id === sessionId && item.userId === req.user!.id);
    if (!session) {
      throw createError(404, "NOT_FOUND", "Checkout session not found.");
    }

    const user = db.users.find((item) => item.id === req.user!.id)!;
    user.planTier = session.planTier;
    user.subscriptionStatus = session.planTier === "free" ? "none" : "active";
    user.currentPeriodEnd =
      session.planTier === "free"
        ? undefined
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    session.verified = true;
    saveDb(db);

    res.json({ success: true, user: sanitizeUser(user) });
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

app.post("/api/stripe/cancel-subscription", authRequired, (req: AuthenticatedRequest, res, next) => {
  try {
    const db = loadDb();
    const user = db.users.find((item) => item.id === req.user!.id)!;
    user.subscriptionStatus = "canceled";
    user.currentPeriodEnd = undefined;
    saveDb(db);
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

app.listen(PORT, () => {
  // Small startup log that makes copy/paste testing easier.
  console.log(`shield-sme-api listening on http://localhost:${PORT}`);
});
