import { Shield, Copy, Check, Clock, Badge } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient, type UserSettings } from "@/lib/api-client";
import { toast } from "sonner";

const SettingsPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [badgeCopied, setBadgeCopied] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    organization: "",
  });
  const [automatedScanData, setAutomatedScanData] = useState({
    enabled: false,
    dayOfWeek: "Monday",
    timeOfDay: "09:00",
    targetUrl: "",
  });
  const [badgeData, setBadgeData] = useState({
    enabled: false,
    color: "primary",
    style: "shield",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.getUserSettings();
        setSettings(response.data);
        if (response.data.automatedScans) {
          setAutomatedScanData(response.data.automatedScans);
        }
        if (response.data.badge) {
          setBadgeData(response.data.badge);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleAutomatedScansChange = async () => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      automatedScans: {
        ...automatedScanData,
        enabled: !automatedScanData.enabled,
      },
    };

    try {
      setSaving(true);
      await apiClient.updateUserSettings(newSettings);
      setSettings(newSettings);
      toast.success(automatedScanData.enabled ? "Automated scans disabled" : "Automated scans enabled");
      setAutomatedScanData(newSettings.automatedScans!);
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast.error("Failed to update automated scans");
    } finally {
      setSaving(false);
    }
  };

  const handleAutomatedScanConfig = async () => {
    if (!automatedScanData.targetUrl) {
      toast.error("Please enter a target URL");
      return;
    }

    if (!settings) return;

    const newSettings = {
      ...settings,
      automatedScans: automatedScanData,
    };

    try {
      setSaving(true);
      await apiClient.updateUserSettings(newSettings);
      setSettings(newSettings);
      toast.success("Automated scan configuration saved");
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleBadgeToggle = async () => {
    if (!settings) return;

    const newBadgeData = {
      ...badgeData,
      enabled: !badgeData.enabled,
    };

    const newSettings = {
      ...settings,
      badge: newBadgeData,
    };

    try {
      setSaving(true);
      await apiClient.updateUserSettings(newSettings);
      setSettings(newSettings);
      setBadgeData(newBadgeData);
      toast.success(badgeData.enabled ? "Badge hidden" : "Badge enabled");
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast.error("Failed to update badge settings");
    } finally {
      setSaving(false);
    }
  };

  const handleBadgeStyleChange = async (style: string, color: string) => {
    if (!settings) return;

    const newBadgeData = {
      ...badgeData,
      style,
      color,
    };

    const newSettings = {
      ...settings,
      badge: newBadgeData,
    };

    try {
      setSaving(true);
      await apiClient.updateUserSettings(newSettings);
      setSettings(newSettings);
      setBadgeData(newBadgeData);
      toast.success("Badge style updated");
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast.error("Failed to update badge style");
    } finally {
      setSaving(false);
    }
  };

  const copyBadgeCode = () => {
    const embedCode = `<iframe src="https://vulnguard.io/badge/${user?.id}" width="200" height="100" frameborder="0" allow="none"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setBadgeCopied(true);
    setTimeout(() => setBadgeCopied(false), 2000);
    toast.success("Badge code copied to clipboard");
  };

  const handleProfileUpdate = async () => {
    setSaving(true);
    try {
      await apiClient.updateUserProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = async (key: "email" | "scanComplete" | "vulnerabilityFound") => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    };

    try {
      await apiClient.updateUserSettings(newSettings);
      setSettings(newSettings);
      toast.success("Notification preferences updated");
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast.error("Failed to update notification preferences");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, scanning, and security preferences
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Loading settings...</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <button
                onClick={handleProfileUpdate}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-primary" />
                  Automated Weekly Scans
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">Automatically scan your site on a regular schedule</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={automatedScanData.enabled}
                  onChange={handleAutomatedScansChange}
                  disabled={saving}
                  className="rounded border-input"
                />
                <span className="text-sm font-medium">Enable automated weekly scans</span>
              </label>

              {automatedScanData.enabled && (
                <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Day of Week</label>
                      <select
                        value={automatedScanData.dayOfWeek}
                        onChange={(e) =>
                          setAutomatedScanData({ ...automatedScanData, dayOfWeek: e.target.value })
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Time of Day</label>
                      <input
                        type="time"
                        value={automatedScanData.timeOfDay}
                        onChange={(e) =>
                          setAutomatedScanData({ ...automatedScanData, timeOfDay: e.target.value })
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Target URL to Scan</label>
                    <input
                      type="url"
                      value={automatedScanData.targetUrl}
                      onChange={(e) =>
                        setAutomatedScanData({ ...automatedScanData, targetUrl: e.target.value })
                      }
                      placeholder="https://example.com"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <button
                    onClick={handleAutomatedScanConfig}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    Save Schedule
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Badge className="h-4 w-4 text-primary" />
                Security Badge
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">Display your security scan status on your website</p>
            </div>
            <div className="space-y-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={badgeData.enabled}
                  onChange={handleBadgeToggle}
                  disabled={saving}
                  className="rounded border-input"
                />
                <span className="text-sm font-medium">Enable security badge</span>
              </label>

              {badgeData.enabled && (
                <div className="space-y-4 rounded-md border border-primary/20 bg-primary/5 p-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Badge Style</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {["shield", "badge", "minimal"].map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => handleBadgeStyleChange(style, badgeData.color)}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                            badgeData.style === style
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-input hover:border-primary/30"
                          }`}
                        >
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Badge Color</label>
                    <div className="grid gap-2 sm:grid-cols-4">
                      {["primary", "accent", "success", "warning"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleBadgeStyleChange(badgeData.style, color)}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                            badgeData.color === color
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-input hover:border-primary/30"
                          }`}
                        >
                          {color.charAt(0).toUpperCase() + color.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Embed Code</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`<iframe src="https://vulnguard.io/badge/${user?.id}" width="200" height="100" frameborder="0"></iframe>`}
                        className="flex-1 rounded-md border border-input bg-muted px-3 py-2 font-mono text-xs text-muted-foreground"
                      />
                      <button
                        type="button"
                        onClick={copyBadgeCode}
                        className="rounded-md bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
                        title="Copy badge code"
                      >
                        {badgeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Copy this code to embed the badge on your website</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Notifications</h3>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings?.notifications?.email || false}
                  onChange={() => handleNotificationChange("email")}
                  className="rounded border-input"
                />
                <span className="text-sm">Enable email notifications</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings?.notifications?.scanComplete || false}
                  onChange={() => handleNotificationChange("scanComplete")}
                  className="rounded border-input"
                />
                <span className="text-sm">Notify when scans complete</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings?.notifications?.vulnerabilityFound || false}
                  onChange={() => handleNotificationChange("vulnerabilityFound")}
                  className="rounded border-input"
                />
                <span className="text-sm">Alert on critical vulnerabilities</span>
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-4 w-4 text-primary" />
              About VulnGuard
            </h3>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  VulnGuard v1.0 — Lightweight Website Security Checks for SMEs
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  VulnGuard performs real, non-destructive checks against your public website configuration. It focuses on transport security,
                  security headers, disclosure signals, CORS behavior, and site reachability.
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Security Tests Performed:</p>
                <ul className="space-y-1.5">
                  {[
                    "SSL/TLS Certificate & HTTPS Configuration",
                    "Security Headers Analysis (X-Content-Type-Options, X-Frame-Options, CSP, HSTS)",
                    "HTTP to HTTPS Redirect Verification",
                    "Server Information Disclosure Detection",
                    "CORS Configuration Assessment",
                    "Domain Accessibility & Reachability Testing",
                  ].map((test) => (
                    <li key={test} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1 text-primary">✓</span>
                      <span>{test}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Key Features:</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Automated scanning, detailed remediation guidance, customizable schedules, and a security badge for your website. All checks are
                  designed to stay lightweight and non-destructive.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsPage;
