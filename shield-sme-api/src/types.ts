export type SubscriptionStatus = "none" | "active" | "canceled" | "past_due";
export type PlanTier = "free" | "pro" | "enterprise";
export type Severity = "low" | "medium" | "high" | "critical";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  role: string;
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

export interface ScanVulnerability {
  id: string;
  type: string;
  severity: Severity;
  description: string;
  recommendation: string;
  location: string;
  category?: string;
  passed?: boolean;
  details?: string;
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
  };
}

export interface ScheduleRecord {
  id: string;
  userId: string;
  targetUrl: string;
  cronExpression: string;
  description?: string;
  createdAt: string;
}

export interface ResetTokenRecord {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface CheckoutSessionRecord {
  id: string;
  userId: string;
  planTier: PlanTier;
  createdAt: string;
  verified: boolean;
}

export interface DatabaseState {
  users: UserRecord[];
  settings: Record<string, UserSettings>;
  scans: ScanRecord[];
  schedules: ScheduleRecord[];
  resetTokens: ResetTokenRecord[];
  checkoutSessions: CheckoutSessionRecord[];
}
