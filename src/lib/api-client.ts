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
  codeFix?: string;
  location: string;
  category?: string;
  passed?: boolean;
  details?: string;
  resolved?: boolean;
  resolvedAt?: string;
}

export interface ScanRecord {
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
    resolved?: number;
  };
}

export interface ActivityLogRecord {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  targetUrl?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

interface ApiResponse<T> {
  data: T;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

function defaultSettings(): UserSettings {
  return {
    theme: "dark",
    language: "en",
    notifications: {
      email: true,
      scanComplete: true,
      vulnerabilityFound: true,
    },
    defaultScanInterval: 7,
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

class ApiClient {
  private accessToken: string | null = localStorage.getItem("accessToken");
  private refreshToken: string | null = localStorage.getItem("refreshToken");

  private setTokens(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken ?? null;
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  private async request<T>(path: string, init: RequestInit = {}, requiresAuth = true): Promise<T> {
    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
    if (requiresAuth && this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    }).catch(() => {
      throw new ApiError(503, "API_UNAVAILABLE", "The backend API is unavailable.");
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message =
        payload?.error || payload?.message || `Request failed with status ${response.status}.`;

      if (response.status === 401) {
        this.clearTokens();
      }

      throw new ApiError(response.status, "API_ERROR", message, payload);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  async signup(email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>(
      "/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({
          email: this.normalizeEmail(email),
          password,
          firstName,
          lastName,
        }),
      },
      false,
    );

    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async signin(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email: this.normalizeEmail(email), password }),
      },
      false,
    );

    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async logout() {
    if (this.accessToken) {
      try {
        await this.request("/auth/logout", { method: "POST" });
      } catch {
        // We still clear the local session even if the server is unavailable.
      }
    }
    this.clearTokens();
  }

  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    const user = await this.request<AuthUser>("/auth/me");
    return { data: this.normalizeUser(user) };
  }

  async forgotPassword(email: string) {
    const data = await this.request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: this.normalizeEmail(email) }),
    }, false);
    return { data };
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    const data = await this.request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    }, false);
    return { data };
  }

  async verifyResetToken(token: string) {
    return this.request<{ valid: boolean; email: string }>("/auth/verify-reset-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    }, false);
  }

  async createScan(url: string, vulnerabilities: ScanVulnerability[] = [], duration = 0) {
    const data = await this.request<{ message: string; scan: ScanRecord }>("/scans", {
      method: "POST",
      body: JSON.stringify({ url, vulnerabilities, duration }),
    });
    return { data };
  }

  async getScans(page = 1, limit = 10) {
    const payload = await this.request<{
      scans: ScanRecord[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/scans?page=${page}&limit=${limit}`);
    return { data: payload };
  }

  async getScanById(id: string) {
    const data = await this.request<ScanRecord>(`/scans/${id}`);
    return { data };
  }

  async updateScan(id: string, data: Partial<ScanRecord>) {
    const payload = await this.request<{ message: string; scan: ScanRecord }>(`/scans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return { data: payload.scan };
  }

  async updateVulnerabilityStatus(scanId: string, vulnerabilityId: string, resolved: boolean) {
    const payload = await this.request<{ message: string; scan: ScanRecord }>(
      `/scans/${scanId}/vulnerabilities/${vulnerabilityId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ resolved }),
      },
    );
    return { data: payload.scan };
  }

  async deleteScan(id: string) {
    const data = await this.request<{ message: string }>(`/scans/${id}`, { method: "DELETE" });
    return { data };
  }

  async exportScanReport(id: string) {
    const headers = new Headers();
    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    const response = await fetch(`${API_BASE}/scans/${id}/report`, { headers });
    if (!response.ok) {
      throw new ApiError(response.status, "EXPORT_FAILED", "Failed to export report.");
    }

    const blob = await response.blob();
    const filename = response.headers.get("Content-Disposition")?.match(/filename=\"?([^"]+)\"?/)?.[1] || `scan-report-${id}.html`;
    return { blob, filename };
  }

  async getUserProfile() {
    const data = await this.request<AuthUser>("/users/profile");
    return { data: this.normalizeUser(data) };
  }

  async updateUserProfile(data: Partial<AuthUser>) {
    const payload = await this.request<{ message: string; user: AuthUser }>("/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return { data: this.normalizeUser(payload.user) };
  }

  async getUserSettings() {
    const data = await this.request<Partial<UserSettings>>("/users/settings");
    return { data: { ...defaultSettings(), ...data } };
  }

  async updateUserSettings(data: UserSettings) {
    const payload = await this.request<{ message: string; settings: UserSettings }>("/users/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return { data: { ...defaultSettings(), ...payload.settings } };
  }

  async createSchedule(targetUrl: string, cronExpression: string, description?: string) {
    const data = await this.request<{ message: string; schedule: unknown }>("/schedules", {
      method: "POST",
      body: JSON.stringify({ targetUrl, cronExpression, description }),
    });
    return { data };
  }

  async getSchedules() {
    const data = await this.request<unknown[]>("/schedules");
    return { data };
  }

  async updateSchedule(id: string, data: Record<string, unknown>) {
    const payload = await this.request<{ message: string; schedule: unknown }>(`/schedules/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return { data: payload.schedule };
  }

  async deleteSchedule(id: string) {
    const data = await this.request<{ message: string }>(`/schedules/${id}`, { method: "DELETE" });
    return { data };
  }

  async getActivityLogs(limit = 20) {
    const payload = await this.request<{ logs: ActivityLogRecord[] }>(`/activity?limit=${limit}`);
    return { data: payload };
  }

  async createCheckoutSession(_planTier: string) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Checkout is not required for this project scope.");
  }

  async verifyCheckoutSession(_sessionId: string) {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Checkout verification is not required for this project scope.");
  }

  async getSubscriptionStatus() {
    return {
      data: {
        planTier: "free" as PlanTier,
        subscriptionStatus: "none" as SubscriptionStatus,
      },
    };
  }

  async cancelSubscription() {
    return { data: { success: true } };
  }

  async updatePaymentMethod() {
    return {
      data: {
        success: true,
        message: "Payment settings are outside this project's core requirements.",
      },
    };
  }

  private normalizeUser(user: any): AuthUser {
    return {
      id: user.id || user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      stripeCustomerId: user.stripeCustomerId,
      subscriptionStatus: user.subscriptionStatus || "none",
      planTier: user.planTier || "free",
      currentPeriodEnd: user.currentPeriodEnd,
    };
  }
}

export const apiClient = new ApiClient();
