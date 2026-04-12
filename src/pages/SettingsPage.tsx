import { Shield } from "lucide-react";
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
}

const SettingsPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    organization: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.getUserSettings();
        setSettings(response.data);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

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
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
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
            <h3 className="mb-2 text-sm font-semibold">About VulnGuard</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>VulnGuard v1.0 — Web Vulnerability Scanner for SMEs</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              This tool performs simulated security scans to help identify common web vulnerabilities. For production use, connect to real scanning engines like OWASP ZAP.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsPage;
