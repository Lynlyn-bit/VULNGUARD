import { useState, useEffect } from "react";
import { Shield, Save, Loader2, CheckCircle, Eye, EyeOff, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SettingsPage = () => {
  const { user } = useAuth();
  const [zapUrl, setZapUrl] = useState("");
  const [zapKey, setZapKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_scan_config")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setZapUrl(data.zap_api_url || "");
        setZapKey(data.zap_api_key || "");
        setHasConfig(true);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (hasConfig) {
        const { error } = await supabase
          .from("user_scan_config")
          .update({ zap_api_url: zapUrl, zap_api_key: zapKey })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_scan_config")
          .insert({ user_id: user.id, zap_api_url: zapUrl, zap_api_key: zapKey });
        if (error) throw error;
        setHasConfig(true);
      }
      toast.success("ZAP configuration saved");
    } catch (e: any) {
      toast.error("Failed to save", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and scanning configuration</p>
      </div>

      {/* Account */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">Account</h3>
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

      {/* OWASP ZAP Configuration */}
      <div className="rounded-lg border border-primary/20 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" strokeWidth={2} />
              OWASP ZAP Configuration
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect to your self-hosted ZAP instance for real DAST scanning
            </p>
          </div>
          {hasConfig && zapUrl && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              <CheckCircle className="h-3 w-3" /> Connected
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                ZAP API URL
              </label>
              <input
                type="url"
                value={zapUrl}
                onChange={(e) => setZapUrl(e.target.value)}
                placeholder="http://localhost:8080"
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                The base URL of your ZAP API (e.g., http://your-server:8080)
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                ZAP API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={zapKey}
                  onChange={(e) => setZapKey(e.target.value)}
                  placeholder="Your ZAP API key"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 font-mono text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Found in ZAP → Options → API → API Key
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !zapUrl.trim() || !zapKey.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Configuration
            </button>
          </div>
        )}

        {/* Setup guide */}
        <div className="mt-6 rounded-md border border-border bg-muted/30 p-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Quick Setup Guide</h4>
          <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal pl-4">
            <li>Download & install <a href="https://www.zaproxy.org/download/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">OWASP ZAP <ExternalLink className="h-2.5 w-2.5" /></a></li>
            <li>Start ZAP in daemon mode: <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">zap.sh -daemon -port 8080</code></li>
            <li>Find your API key in Options → API</li>
            <li>If ZAP is on a remote server, ensure the API is accessible from the internet</li>
            <li>Enter your URL and key above, then run a scan from the Scan page</li>
          </ol>
        </div>
      </div>

      {/* About */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-2 text-sm font-semibold">About VulnGuard</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          <span>VulnGuard v2.0 — Web Vulnerability Scanner for SMEs</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Powered by OWASP ZAP for real DAST scanning. Supports spider crawling, active vulnerability scanning, and detailed CVE-based reporting.
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
