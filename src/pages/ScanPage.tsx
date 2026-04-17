import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Shield, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import { getUserFriendlyError } from "@/lib/error-handler";
import { runSecurityTests, type SecurityTest } from "@/lib/security-scanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const scanStages = [
  { label: "Validating URL...", detail: "Confirming the target format and hostname" },
  { label: "Checking HTTPS...", detail: "Verifying transport security and certificate reachability" },
  { label: "Testing redirect behavior...", detail: "Checking whether HTTP is redirected to HTTPS" },
  { label: "Inspecting security headers...", detail: "Reviewing common browser-protection headers" },
  { label: "Reviewing disclosure & CORS...", detail: "Looking for exposed server details and permissive CORS" },
  { label: "Checking availability...", detail: "Confirming the site responds successfully" },
  { label: "Preparing remediation...", detail: "Generating actionable recommendations for each finding" },
];

const fetchBackendSecurityTests = async (url: string): Promise<SecurityTest[]> => {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const token = apiClient.getAccessToken();
  const response = await fetch(`${apiBase}/scan/security`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`Backend scan failed with status ${response.status}`);
  }

  const result = (await response.json()) as { tests?: SecurityTest[] };
  return result.tests ?? [];
};

const ScanPage = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const isValidUrl = (input: string) => {
    try {
      const u = new URL(input.startsWith("http") ? input : `https://${input}`);
      return u.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const handleScan = async () => {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    if (!isValidUrl(normalizedUrl)) {
      setError("Please enter a valid URL (e.g., example.com)");
      return;
    }
    setError("");
    setScanning(true);
    setCurrentStage(0);
    setShowModal(true);

    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev >= scanStages.length - 1) {
          clearInterval(stageInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 600);

    try {
      const startedAt = performance.now();
      let tests: SecurityTest[] = [];

      try {
        tests = await fetchBackendSecurityTests(normalizedUrl);
      } catch (backendError) {
        console.warn("Backend scanner unavailable, falling back to browser scanner.", backendError);
        tests = await runSecurityTests(normalizedUrl);
      }
      const duration = Math.max(1, Math.round((performance.now() - startedAt) / 1000));
      
      clearInterval(stageInterval);
      
      // Convert local scanner results to persisted vulnerability records
      const vulnerabilities = tests
        .filter((test: SecurityTest) => !test.passed)
        .map((test: SecurityTest) => ({
        id: Math.random().toString(36).substring(7),
        type: test.name,
        severity: test.severity,
        description: test.description,
        recommendation: test.remediation,
        location: test.location || normalizedUrl,
        category: test.category,
        passed: test.passed,
        details: test.details,
      }));
      
      // Save scan to API
      try {
        const saveResponse = await apiClient.createScan(
          normalizedUrl,
          vulnerabilities,
          duration
        );
        setShowModal(false);
        navigate(`/results/${saveResponse.data.scan._id}`);
      } catch (apiError) {
        console.error('Failed to save scan:', apiError);
        setScanning(false);
        setShowModal(false);
        setError(getUserFriendlyError(apiError));
      }
    } catch (error) {
      clearInterval(stageInterval);
      console.error('Security scan failed:', error);
      setScanning(false);
      setShowModal(false);
      setError(getUserFriendlyError(error));
    }
  };

  const progressPercent = ((currentStage + 1) / scanStages.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Scan</h1>
        <p className="text-sm text-muted-foreground">
          Enter a website URL to run lightweight, non-destructive security checks
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Website URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={2}
                />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !scanning && handleScan()}
                  placeholder="e.g., example.com"
                  disabled={scanning}
                  className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 font-mono text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleScan}
                disabled={scanning || !url.trim()}
                className="glow-primary inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_25px_-3px_hsl(var(--primary)/0.6)] disabled:opacity-50 disabled:shadow-none"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" strokeWidth={2} />
                    Scan
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-destructive">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stepped Progress Modal */}
      <Dialog open={showModal} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Scanning in progress
            </DialogTitle>
            <DialogDescription className="font-mono text-xs truncate">
              {url.startsWith("http") ? url : `https://${url}`}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          <div className="max-h-[280px] space-y-1 overflow-y-auto py-1">
            {scanStages.map((stage, i) => (
              <motion.div
                key={stage.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: i <= currentStage ? 1 : 0.25,
                  x: 0,
                }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2.5 rounded-md px-2 py-1.5"
              >
                {i < currentStage ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
                ) : i === currentStage ? (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" strokeWidth={2} />
                ) : (
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-border" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      i <= currentStage
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {stage.label}
                  </p>
                  {i === currentStage && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-muted-foreground"
                    >
                      {stage.detail}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {currentStage + 1} of {scanStages.length} steps completed
          </p>
        </DialogContent>
      </Dialog>

      {/* Info section */}
      {!scanning && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-3 text-sm font-semibold">Checks Performed</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              "SSL/TLS Certificate Validation",
              "HTTP to HTTPS Redirect Check",
              "Security Headers Analysis",
              "Server Information Disclosure",
              "CORS Configuration Assessment",
              "Domain Accessibility & Reachability",
              "Actionable remediation guidance",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanPage;
