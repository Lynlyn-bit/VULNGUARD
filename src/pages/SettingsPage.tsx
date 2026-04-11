import { Shield } from "lucide-react";

const SettingsPage = () => {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">Account</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value="user@example.com"
              disabled
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Organization</label>
            <input
              type="text"
              placeholder="Your company name"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default SettingsPage;
