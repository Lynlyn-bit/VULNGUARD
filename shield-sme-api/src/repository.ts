import {
  ActivityLogModel,
  CheckoutSessionModel,
  ResetTokenModel,
  ScanModel,
  ScheduleModel,
  UserModel,
  UserSettingsModel,
} from "./models";
import { makeId } from "./ids";
import { buildDefaultSettings, summarizeVulnerabilities } from "./storage";
import type {
  CheckoutSessionRecord,
  ResetTokenRecord,
  ScanRecord,
  ScanVulnerability,
  ScheduleRecord,
  UserRecord,
  UserSettings,
} from "./types";

function toUserRecord(doc: {
  _id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  role: string;
  subscriptionStatus: string;
  planTier: string;
  currentPeriodEnd?: string;
}): UserRecord {
  return {
    id: doc._id,
    email: doc.email,
    passwordHash: doc.passwordHash,
    firstName: doc.firstName,
    lastName: doc.lastName,
    role: doc.role,
    subscriptionStatus: doc.subscriptionStatus as UserRecord["subscriptionStatus"],
    planTier: doc.planTier as UserRecord["planTier"],
    currentPeriodEnd: doc.currentPeriodEnd,
  };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const doc = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean();
  return doc ? toUserRecord(doc as Parameters<typeof toUserRecord>[0]) : null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const doc = await UserModel.findById(id).lean();
  return doc ? toUserRecord(doc as Parameters<typeof toUserRecord>[0]) : null;
}

export async function createUser(user: UserRecord): Promise<UserRecord> {
  await UserModel.create({
    _id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    planTier: user.planTier,
    currentPeriodEnd: user.currentPeriodEnd,
  });
  await ensureUserSettings(user.id);
  return user;
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  await UserModel.updateOne({ _id: userId }, { $set: { passwordHash } });
}

export async function updateUserNames(userId: string, firstName?: string, lastName?: string) {
  await UserModel.updateOne({ _id: userId }, { $set: { firstName, lastName } });
}

export async function deleteResetTokensForUser(userId: string) {
  await ResetTokenModel.deleteMany({ userId });
}

export async function addResetToken(record: ResetTokenRecord) {
  await ResetTokenModel.create(record);
}

export async function findResetToken(token: string): Promise<ResetTokenRecord | null> {
  const doc = await ResetTokenModel.findOne({ token }).lean();
  if (!doc) return null;
  return { token: doc.token, userId: doc.userId, expiresAt: doc.expiresAt };
}

export async function deleteResetToken(token: string) {
  await ResetTokenModel.deleteOne({ token });
}

export async function ensureUserSettings(userId: string): Promise<UserSettings> {
  const row = await UserSettingsModel.findOne({ userId }).lean();
  if (row?.settings) {
    return row.settings as UserSettings;
  }
  const settings = buildDefaultSettings();
  await UserSettingsModel.create({ userId, settings });
  return settings;
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  return ensureUserSettings(userId);
}

export async function saveUserSettings(userId: string, settings: UserSettings) {
  await UserSettingsModel.updateOne({ userId }, { $set: { settings } }, { upsert: true });
}

export async function createScan(scan: ScanRecord) {
  await ScanModel.create({
    _id: scan._id,
    userId: scan.userId,
    url: scan.url,
    createdAt: scan.createdAt,
    duration: scan.duration,
    vulnerabilities: scan.vulnerabilities,
    summary: scan.summary,
  });
}

export async function listScansForUser(
  userId: string,
  page: number,
  limit: number,
): Promise<{ scans: ScanRecord[]; total: number }> {
  const skip = (page - 1) * limit;
  const [scans, total] = await Promise.all([
    ScanModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ScanModel.countDocuments({ userId }),
  ]);
  return {
    scans: scans.map((s: (typeof scans)[number]) => ({
      _id: s._id,
      userId: s.userId,
      url: s.url,
      createdAt: s.createdAt,
      duration: s.duration,
      vulnerabilities: (s.vulnerabilities ?? []) as ScanVulnerability[],
      summary: s.summary as ScanRecord["summary"],
    })),
    total,
  };
}

export async function getScan(userId: string, scanId: string): Promise<ScanRecord | null> {
  const s = await ScanModel.findOne({ _id: scanId, userId }).lean();
  if (!s) return null;
  return {
    _id: s._id,
    userId: s.userId,
    url: s.url,
    createdAt: s.createdAt,
    duration: s.duration,
    vulnerabilities: (s.vulnerabilities ?? []) as ScanVulnerability[],
    summary: s.summary as ScanRecord["summary"],
  };
}

export async function updateScanRecord(userId: string, scanId: string, patch: Partial<ScanRecord>) {
  const existing = await getScan(userId, scanId);
  if (!existing) return null;
  const next: ScanRecord = { ...existing, ...patch };
  if (Array.isArray(patch.vulnerabilities)) {
    next.summary = summarizeVulnerabilities(patch.vulnerabilities);
  }
  await ScanModel.updateOne(
    { _id: scanId, userId },
    {
      $set: {
        url: next.url,
        duration: next.duration,
        vulnerabilities: next.vulnerabilities,
        summary: next.summary,
      },
    },
  );
  return getScan(userId, scanId);
}

export async function deleteScan(userId: string, scanId: string) {
  await ScanModel.deleteOne({ _id: scanId, userId });
}

export async function patchVulnerabilityResolved(
  userId: string,
  scanId: string,
  vulnerabilityId: string,
  resolved: boolean,
): Promise<ScanRecord | null> {
  const scan = await getScan(userId, scanId);
  if (!scan) return null;
  const vulnerabilities = scan.vulnerabilities.map((v) =>
    v.id === vulnerabilityId
      ? {
          ...v,
          resolved,
          resolvedAt: resolved ? new Date().toISOString() : undefined,
        }
      : v,
  );
  await ScanModel.updateOne(
    { _id: scanId, userId },
    { $set: { vulnerabilities, summary: summarizeVulnerabilities(vulnerabilities) } },
  );
  return getScan(userId, scanId);
}

export async function createSchedule(schedule: ScheduleRecord) {
  await ScheduleModel.create({
    _id: schedule.id,
    userId: schedule.userId,
    targetUrl: schedule.targetUrl,
    cronExpression: schedule.cronExpression,
    description: schedule.description,
    createdAt: schedule.createdAt,
  });
}

export async function listSchedules(userId: string): Promise<ScheduleRecord[]> {
  const rows = await ScheduleModel.find({ userId }).sort({ createdAt: -1 }).lean();
  return rows.map((r: (typeof rows)[number]) => ({
    id: r._id,
    userId: r.userId,
    targetUrl: r.targetUrl,
    cronExpression: r.cronExpression,
    description: r.description,
    createdAt: r.createdAt,
  }));
}

export async function updateScheduleRecord(userId: string, scheduleId: string, patch: Partial<ScheduleRecord>) {
  const s = await ScheduleModel.findOne({ _id: scheduleId, userId }).lean();
  if (!s) return null;
  await ScheduleModel.updateOne(
    { _id: scheduleId, userId },
    {
      $set: {
        targetUrl: patch.targetUrl ?? s.targetUrl,
        cronExpression: patch.cronExpression ?? s.cronExpression,
        description: patch.description ?? s.description,
      },
    },
  );
  const next = await ScheduleModel.findOne({ _id: scheduleId, userId }).lean();
  if (!next) return null;
  return {
    id: next._id,
    userId: next.userId,
    targetUrl: next.targetUrl,
    cronExpression: next.cronExpression,
    description: next.description,
    createdAt: next.createdAt,
  };
}

export async function deleteSchedule(userId: string, scheduleId: string) {
  await ScheduleModel.deleteOne({ _id: scheduleId, userId });
}

export async function createCheckoutSession(session: CheckoutSessionRecord) {
  await CheckoutSessionModel.create({
    _id: session.id,
    userId: session.userId,
    planTier: session.planTier,
    createdAt: session.createdAt,
    verified: session.verified,
  });
}

export async function findCheckoutSession(userId: string, sessionId: string): Promise<CheckoutSessionRecord | null> {
  const doc = await CheckoutSessionModel.findOne({ _id: sessionId, userId }).lean();
  if (!doc) return null;
  return {
    id: doc._id,
    userId: doc.userId,
    planTier: doc.planTier as CheckoutSessionRecord["planTier"],
    createdAt: doc.createdAt,
    verified: doc.verified,
  };
}

export async function markCheckoutVerified(userId: string, sessionId: string) {
  await CheckoutSessionModel.updateOne({ _id: sessionId, userId }, { $set: { verified: true } });
}

export async function updateUserSubscription(
  userId: string,
  patch: { planTier?: string; subscriptionStatus?: string; currentPeriodEnd?: string | null },
) {
  const $set: Record<string, string> = {};
  const $unset: Record<string, 1> = {};
  if (patch.planTier !== undefined) $set.planTier = patch.planTier;
  if (patch.subscriptionStatus !== undefined) $set.subscriptionStatus = patch.subscriptionStatus;
  if (patch.currentPeriodEnd === null) {
    $unset.currentPeriodEnd = 1;
  } else if (patch.currentPeriodEnd !== undefined) {
    $set.currentPeriodEnd = patch.currentPeriodEnd;
  }
  if (Object.keys($set).length === 0 && Object.keys($unset).length === 0) return;
  await UserModel.updateOne(
    { _id: userId },
    { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) },
  );
}

export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  opts?: { entityId?: string; targetUrl?: string; details?: Record<string, unknown> },
) {
  await ActivityLogModel.create({
    _id: makeId("act"),
    userId,
    action,
    entityType,
    entityId: opts?.entityId,
    targetUrl: opts?.targetUrl,
    details: opts?.details,
    createdAt: new Date().toISOString(),
  });
}

export async function listActivity(userId: string, limit: number) {
  const rows = await ActivityLogModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((r: (typeof rows)[number]) => ({
    _id: r._id,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    targetUrl: r.targetUrl,
    details: r.details as Record<string, unknown> | undefined,
    createdAt: r.createdAt,
  }));
}
