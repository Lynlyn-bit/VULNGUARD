import { ApiError } from "./error-handler";

export type SubscriptionStatus = "none" | "active" | "canceled" | "past_due";
export type PlanTier = "free" | "pro" | "enterprise";

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  stripeCustomerId?: string;
  subscriptionStatus: SubscriptionStatus;
  planTier: PlanTier;
  currentPeriodEnd?: string;
}

export interface UserSettings {
  theme: "light" | "dark";
  notifications: {
    email: boolean;
    scanComplete: boolean;
    vulnerabilityFound: boolean;
  };
  language: string;
  defaultScanInterval?: number;
  automatedScans?: {
    enabled: boolean;
    dayOfWeek: string;
    timeOfDay: string;
    targetUrl?: string;
  };
  badge?: {
    enabled: boolean;
    color: string;
    style: string;
  };
}

export type VulnerabilitySeverity = "low" | "medium" | "high" | "critical";

export interface ScanVulnerability {
  id: string;
  type: string;
  severity: VulnerabilitySeverity;
  description: string;
  recommendation: string;
  location: string;
  category?: string;
  passed?: boolean;
  details?: string;
}

interface StoredUser extends AuthUser {
  password: string;
}

interface StoredResetToken {
  token: string;
  userId: string;
  expiresAt: string;
}

interface StoredSchedule {
  id: string;
  userId: string;
  targetUrl: string;
  cronExpression: string;
  description?: string;
  createdAt: string;
}

interface StoredCheckoutSession {
  id: string;
  userId: string;
  planTier: PlanTier;
  createdAt: string;
  verified: boolean;
}

interface StoredScan {
  _id: string;
  userId: string;
  url: string;
  createdAt: string;
  duration: number;
  vulnerabilities: ScanVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface StorageState {
  users: StoredUser[];
  scans: StoredScan[];
  settings: Record<string, UserSettings>;
  resetTokens: StoredResetToken[];
  schedules: StoredSchedule[];
  checkoutSessions: StoredCheckoutSession[];
}

interface ApiResponse<T> {
  data: T;
}

const STORAGE_KEY = "vulnguard_local_api_state";

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function defaultSettings(): UserSettings {
  return {
    theme: "light",
    language: "en",
    defaultScanInterval: 7,
    notifications: {
      email: true,
      scanComplete: true,
      vulnerabilityFound: true,
    },
    automatedScans: {
      enabled: false,
      dayOfWeek: "Monday",
      timeOfDay: "09:00",
      targetUrl: "",
    },
    badge: {
      enabled: false,
      color: "primary",
      style: "shield",
    },
  };
}

function loadState(): StorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        users: [],
        scans: [],
        settings: {},
        resetTokens: [],
        schedules: [],
        checkoutSessions: [],
      };
    }

    const parsed = JSON.parse(raw) as Partial<StorageState>;
    return {
      users: parsed.users ?? [],
      scans: parsed.scans ?? [],
      settings: parsed.settings ?? {},
      resetTokens: parsed.resetTokens ?? [],
      schedules: parsed.schedules ?? [],
      checkoutSessions: parsed.checkoutSessions ?? [],
    };
  } catch {
    return {
      users: [],
      scans: [],
      settings: {},
      resetTokens: [],
      schedules: [],
      checkoutSessions: [],
    };
  }
}

function saveState(state: StorageState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sanitizeUser(user: StoredUser): AuthUser {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

function ok<T>(data: T): ApiResponse<T> {
  return { data };
}

function summarizeVulnerabilities(vulnerabilities: ScanVulnerability[]) {
  const failed = vulnerabilities.filter((item) => item.passed !== true);
  return {
    total: failed.length,
    critical: failed.filter((item) => item.severity === "critical").length,
    high: failed.filter((item) => item.severity === "high").length,
    medium: failed.filter((item) => item.severity === "medium").length,
    low: failed.filter((item) => item.severity === "low").length,
  };
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem("accessToken");
    this.refreshToken = localStorage.getItem("refreshToken");
  }

  private setTokens(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken ?? accessToken;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", this.refreshToken);
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  private getCurrentUserRecord(state = loadState()): StoredUser {
    if (!this.accessToken) {
      throw new ApiError(401, "UNAUTHORIZED", "Please log in to continue.");
    }

    const user = state.users.find((item) => item.id === this.accessToken);
    if (!user) {
      this.clearTokens();
      throw new ApiError(401, "UNAUTHORIZED", "Your session is no longer valid.");
    }

    return user;
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  async signup(email: string, password: string, firstName?: string, lastName?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const state = loadState();

    if (state.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      throw new ApiError(409, "EMAIL_EXISTS", "This email is already registered.");
    }

    const user: StoredUser = {
      id: createId("user"),
      email: normalizedEmail,
      password,
      firstName,
      lastName,
      role: "user",
      subscriptionStatus: "none",
      planTier: "free",
    };

    state.users.push(user);
    state.settings[user.id] = defaultSettings();
    saveState(state);

    this.setTokens(user.id, user.id);

    return {
      accessToken: user.id,
      refreshToken: user.id,
      user: sanitizeUser(user),
    };
  }

  async signin(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const state = loadState();
    const user = state.users.find((item) => item.email.toLowerCase() === normalizedEmail);

    if (!user || user.password !== password) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    this.setTokens(user.id, user.id);

    return {
      accessToken: user.id,
      refreshToken: user.id,
      user: sanitizeUser(user),
    };
  }

  async logout() {
    this.clearTokens();
  }

  async getCurrentUser() {
    const user = this.getCurrentUserRecord();
    return ok(sanitizeUser(user));
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const state = loadState();
    const user = state.users.find((item) => item.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return ok({
        sent: true,
      });
    }

    state.resetTokens = state.resetTokens.filter((item) => item.userId !== user.id);

    const token = createId("reset");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    state.resetTokens.push({ token, userId: user.id, expiresAt });
    saveState(state);

    return ok({
      sent: true,
      resetToken: token,
      resetUrl: `${window.location.origin}/reset-password/${token}`,
      expiresAt,
    });
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
      throw new ApiError(400, "PASSWORD_MISMATCH", "Passwords do not match.");
    }

    const state = loadState();
    const resetToken = state.resetTokens.find((item) => item.token === token);

    if (!resetToken || new Date(resetToken.expiresAt).getTime() < Date.now()) {
      throw new ApiError(400, "INVALID_RESET_TOKEN", "Invalid or expired reset link.");
    }

    const user = state.users.find((item) => item.id === resetToken.userId);
    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found.");
    }

    user.password = newPassword;
    state.resetTokens = state.resetTokens.filter((item) => item.token !== token);
    saveState(state);

    return ok({ success: true });
  }

  async verifyResetToken(token: string) {
    const state = loadState();
    const resetToken = state.resetTokens.find((item) => item.token === token);

    if (!resetToken || new Date(resetToken.expiresAt).getTime() < Date.now()) {
      throw new ApiError(400, "INVALID_RESET_TOKEN", "Invalid or expired reset link.");
    }

    const user = state.users.find((item) => item.id === resetToken.userId);
    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found.");
    }

    return {
      valid: true,
      email: user.email,
    };
  }

  async createScan(url: string, vulnerabilities: ScanVulnerability[] = [], duration = 0) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    const scan: StoredScan = {
      _id: createId("scan"),
      userId: user.id,
      url,
      createdAt: new Date().toISOString(),
      duration,
      vulnerabilities,
      summary: summarizeVulnerabilities(vulnerabilities),
    };

    state.scans.unshift(scan);
    saveState(state);

    return ok({ scan });
  }

  async getScans(page = 1, limit = 10) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    const userScans = state.scans
      .filter((scan) => scan.userId === user.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    const start = (page - 1) * limit;
    const scans = userScans.slice(start, start + limit);

    return ok({
      scans,
      page,
      limit,
      total: userScans.length,
    });
  }

  async getScanById(id: string) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    const scan = state.scans.find((item) => item._id === id && item.userId === user.id);

    if (!scan) {
      throw new ApiError(404, "NOT_FOUND", "Scan not found.");
    }

    return ok(scan);
  }

  async updateScan(id: string, data: Partial<StoredScan>) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    const scan = state.scans.find((item) => item._id === id && item.userId === user.id);

    if (!scan) {
      throw new ApiError(404, "NOT_FOUND", "Scan not found.");
    }

    Object.assign(scan, data);
    if (data.vulnerabilities) {
      scan.summary = summarizeVulnerabilities(data.vulnerabilities);
    }
    saveState(state);

    return ok(scan);
  }

  async deleteScan(id: string) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    state.scans = state.scans.filter((item) => !(item._id === id && item.userId === user.id));
    saveState(state);
    return ok({ success: true });
  }

  async getUserProfile() {
    const user = this.getCurrentUserRecord();
    return ok(sanitizeUser(user));
  }

  async updateUserProfile(data: Partial<AuthUser>) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    user.firstName = data.firstName ?? user.firstName;
    user.lastName = data.lastName ?? user.lastName;
    saveState(state);
    return ok(sanitizeUser(user));
  }

  async getUserSettings() {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    if (!state.settings[user.id]) {
      state.settings[user.id] = defaultSettings();
      saveState(state);
    }
    return ok(state.settings[user.id]);
  }

  async updateUserSettings(data: UserSettings) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    state.settings[user.id] = {
      ...defaultSettings(),
      ...state.settings[user.id],
      ...data,
    };
    saveState(state);
    return ok(state.settings[user.id]);
  }

  async createSchedule(targetUrl: string, cronExpression: string, description?: string) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    const schedule: StoredSchedule = {
      id: createId("schedule"),
      userId: user.id,
      targetUrl,
      cronExpression,
      description,
      createdAt: new Date().toISOString(),
    };
    state.schedules.unshift(schedule);
    saveState(state);
    return ok(schedule);
  }

  async getSchedules() {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    return ok(state.schedules.filter((item) => item.userId === user.id));
  }

  async updateSchedule(id: string, data: Partial<StoredSchedule>) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    const schedule = state.schedules.find((item) => item.id === id && item.userId === user.id);

    if (!schedule) {
      throw new ApiError(404, "NOT_FOUND", "Schedule not found.");
    }

    Object.assign(schedule, data);
    saveState(state);
    return ok(schedule);
  }

  async deleteSchedule(id: string) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    state.schedules = state.schedules.filter((item) => !(item.id === id && item.userId === user.id));
    saveState(state);
    return ok({ success: true });
  }

  async createCheckoutSession(planTier: string) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    const safeTier: PlanTier =
      planTier === "enterprise" ? "enterprise" : planTier === "pro" ? "pro" : "free";
    const sessionId = createId("checkout");

    state.checkoutSessions.push({
      id: sessionId,
      userId: user.id,
      planTier: safeTier,
      createdAt: new Date().toISOString(),
      verified: false,
    });
    saveState(state);

    return ok({
      sessionId,
      sessionUrl: `${window.location.origin}/success?session_id=${sessionId}`,
    });
  }

  async verifyCheckoutSession(sessionId: string) {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    const session = state.checkoutSessions.find(
      (item) => item.id === sessionId && item.userId === user.id,
    );

    if (!session) {
      throw new ApiError(404, "NOT_FOUND", "Checkout session not found.");
    }

    const userRecord = state.users.find((item) => item.id === user.id);
    if (!userRecord) {
      throw new ApiError(404, "NOT_FOUND", "User not found.");
    }

    userRecord.planTier = session.planTier;
    userRecord.subscriptionStatus = session.planTier === "free" ? "none" : "active";
    userRecord.currentPeriodEnd =
      session.planTier === "free"
        ? undefined
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    session.verified = true;
    saveState(state);

    return ok({
      success: true,
      user: sanitizeUser(userRecord),
    });
  }

  async getSubscriptionStatus() {
    const user = this.getCurrentUserRecord();
    return ok({
      planTier: user.planTier,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
    });
  }

  async cancelSubscription() {
    const state = loadState();
    const user = this.getCurrentUserRecord(state);
    user.subscriptionStatus = "canceled";
    user.currentPeriodEnd = undefined;
    saveState(state);
    return ok({ success: true });
  }

  async updatePaymentMethod() {
    return ok({
      success: true,
      message: "Payment method management is not available in local mode.",
    });
  }
}

export const apiClient = new ApiClient();
