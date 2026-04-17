import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: String,
    lastName: String,
    role: { type: String, default: "user" },
    subscriptionStatus: { type: String, default: "none" },
    planTier: { type: String, default: "free" },
    currentPeriodEnd: String,
  },
  { collection: "users" },
);

const userSettingsSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    settings: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { collection: "usersettings" },
);

const scanSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    createdAt: { type: String, required: true },
    duration: { type: Number, default: 0 },
    vulnerabilities: { type: [mongoose.Schema.Types.Mixed], default: [] },
    summary: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { collection: "scans" },
);

const scheduleSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    targetUrl: { type: String, required: true },
    cronExpression: { type: String, required: true },
    description: String,
    createdAt: { type: String, required: true },
  },
  { collection: "schedules" },
);

const resetTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    expiresAt: { type: String, required: true },
  },
  { collection: "resettokens" },
);

const checkoutSessionSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    planTier: { type: String, required: true },
    createdAt: { type: String, required: true },
    verified: { type: Boolean, default: false },
  },
  { collection: "checkoutsessions" },
);

const activityLogSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: String,
    targetUrl: String,
    details: mongoose.Schema.Types.Mixed,
    createdAt: { type: String, required: true },
  },
  { collection: "activitylogs" },
);

export const UserModel = mongoose.models.VgUser || mongoose.model("VgUser", userSchema);
export const UserSettingsModel =
  mongoose.models.VgUserSettings || mongoose.model("VgUserSettings", userSettingsSchema);
export const ScanModel = mongoose.models.VgScan || mongoose.model("VgScan", scanSchema);
export const ScheduleModel = mongoose.models.VgSchedule || mongoose.model("VgSchedule", scheduleSchema);
export const ResetTokenModel = mongoose.models.VgResetToken || mongoose.model("VgResetToken", resetTokenSchema);
export const CheckoutSessionModel =
  mongoose.models.VgCheckoutSession || mongoose.model("VgCheckoutSession", checkoutSessionSchema);
export const ActivityLogModel =
  mongoose.models.VgActivityLog || mongoose.model("VgActivityLog", activityLogSchema);
