import { Shield, Copy, Check, Clock, Badge, Link2, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface UserSettings {
  theme: 'light' | 'dark';
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

const SettingsPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [badgeCopied, setBadgeCopied] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    organization: '',
  });
  const [automatedScanData, setAutomatedScanData] = useState({
    enabled: false,
    dayOfWeek: 'Monday',
    timeOfDay: '09:00',
    targetUrl: '',
  });
  const [badgeData, setBadgeData] = useState({
    enabled: false,
    color: 'primary',
    style: 'shield',
  });

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
        console.error('Failed to fetch settings:', error);
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
      toast.success(automatedScanData.enabled ? 'Automated scans disabled' : 'Automated scans enabled');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update automated scans');
    } finally {
      setSaving(false);
    }
  };

  const handleAutomatedScanConfig = async () => {
    if (!automatedScanData.targetUrl) {
      toast.error('Please enter a target URL');
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
      toast.success('Automated scan configuration saved');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to save configuration');
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
      toast.success(badgeData.enabled ? 'Badge hidden' : 'Badge enabled');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update badge settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBadgeStyleChange = async (style: string, color: string) => {
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
      toast.success('Badge style updated');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update badge style');
    } finally {
      setSaving(false);
    }
  };

  const copyBadgeCode = () => {
    const embedCode = `<iframe src="https://vulnguard.io/badge/${user?.id}" width="200" height="100" frameborder="0" allow="none"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setBadgeCopied(true);
    setTimeout(() => setBadgeCopied(false), 2000);
    toast.success('Badge code copied to clipboard');
  };

  const handleProfileUpdate = async () => {
    setSaving(true);
    try {
      await apiClient.updateUserProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = async (key: 'email' | 'scanComplete' | 'vulnerabilityFound') => {
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
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update notification preferences');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account, scanning, and security preferences</p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading settings...</p>
        </div>
      ) : (
        <>
          {/* Profile Section */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
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
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Automated Scans Section */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Automated Weekly Scans
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">Automatically scan your site on a regular schedule</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
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
                        onChange={(e) => setAutomatedScanData({ ...automatedScanData, dayOfWeek: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Time of Day</label>
                      <input
                        type="time"
                        value={automatedScanData.timeOfDay}
                        onChange={(e) => setAutomatedScanData({ ...automatedScanData, timeOfDay: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Target URL to Scan</label>
                    <input
                      type="url"
                      value={automatedScanData.targetUrl}
                      onChange={(e) => setAutomatedScanData({ ...automatedScanData, targetUrl: e.target.value })}
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

          {/* Security Badge Section */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Badge className="h-4 w-4 text-primary" />
                Security Badge
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">Display your security scan status on your website</p>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
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
                      {['shield', 'badge', 'minimal'].map((style) => (
                        <button
                          key={style}
                          onClick={() => handleBadgeStyleChange(style, badgeData.color)}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                            badgeData.style === style
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-input hover:border-primary/30'
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
                      {['primary', 'accent', 'success', 'warning'].map((color) => (
                        <button
                          key={color}
                          onClick={() => handleBadgeStyleChange(badgeData.style, color)}
                          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                            badgeData.color === color
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-input hover:border-primary/30'
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
                        value={`<iframe src="https://vulnguard.io/badge/${user?.id}" width="200" height="100" frameborder="0"></iframe>`}
                        readOnly
                        className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-xs text-muted-foreground font-mono"
                      />
                      <button
                        onClick={copyBadgeCode}
                        className="rounded-md bg-primary/10 p-2 text-primary hover:bg-primary/20 transition-colors"
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

          {/* Notification Preferences */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.notifications?.email || false}
                  onChange={() => handleNotificationChange('email')}
                  className="rounded border-input"
                />
                <span className="text-sm">Enable email notifications</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.notifications?.scanComplete || false}
                  onChange={() => handleNotificationChange('scanComplete')}
                  className="rounded border-input"
                />
                <span className="text-sm">Notify when scans complete</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.notifications?.vulnerabilityFound || false}
                  onChange={() => handleNotificationChange('vulnerabilityFound')}
                  className="rounded border-input"
                />
                <span className="text-sm">Alert on critical vulnerabilities</span>
              </label>
            </div>
          </div>

          {/* About */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              About VulnGuard
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-2">VulnGuard v1.0 — Real Web Vulnerability Scanner for SMEs</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  VulnGuard performs real, non-destructive security scans on your web applications. Our advanced security testing engine analyzes your infrastructure for critical vulnerabilities without causing any harm to your systems.
                </p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Security Tests Performed:</p>
                <ul className="space-y-1.5">
                  {[
                    "SSL/TLS Certificate & HTTPS Configuration",
                    "Security Headers Analysis (X-Content-Type-Options, X-Frame-Options, CSP, HSTS)",
                    "HTTP to HTTPS Redirect Verification",
                    "Server Information Disclosure Detection",
                    "CORS Configuration Assessment",
                    "Domain Accessibility & Reachability Testing"
                  ].map((test) => (
                    <li key={test} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-primary mt-1">✓</span>
                      <span>{test}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Key Features:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automated scanning with detailed remediation guidance, real-time vulnerability alerts, customizable scan scheduling, and security badge for your website. All data is encrypted end-to-end with no sensitive information stored.
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
