import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Shield, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { simulateScan } from "@/lib/scanner";
import { storeScan } from "@/lib/scanStore";

const scanStages = [
  "Resolving DNS...",
  "Checking SSL/TLS configuration...",
  "Analyzing HTTP headers...",
  "Testing for SQL Injection...",
  "Testing for XSS vulnerabilities...",
  "Checking CSRF protections...",
  "Scanning for open redirects...",
  "Analyzing cookie security...",
  "Checking for information disclosure...",
  "Generating report...",
];

const ScanPage = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [error, setError] = useState("");

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

    // Animate through stages
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
      const result = await simulateScan(normalizedUrl);
      clearInterval(stageInterval);
      storeScan(result);
      navigate(`/results/${result.id}`);
    } catch {
      clearInterval(stageInterval);
      setScanning(false);
      setError("Scan failed. Please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Scan</h1>
        <p className="text-sm text-muted-foreground">Enter a website URL to scan for vulnerabilities</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Website URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && !scanning && handleScan()}
                  placeholder="e.g., example.com"
                  disabled={scanning}
                  className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 font-mono text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleScan}
                disabled={scanning || !url.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Scan
                  </>
                )}
              </button>
            </div>
            {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
          </div>
        </div>
      </div>

      {/* Scan progress */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-lg border border-primary/20 bg-card p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Scanning in progress...</span>
            </div>
            <div className="space-y-1.5">
              {scanStages.map((stage, i) => (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: i <= currentStage ? 1 : 0.3 }}
                  className="flex items-center gap-2 font-mono text-xs"
                >
                  {i < currentStage ? (
                    <CheckCircle className="h-3.5 w-3.5 text-accent" />
                  ) : i === currentStage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <div className="h-3.5 w-3.5" />
                  )}
                  <span className={i <= currentStage ? "text-foreground" : "text-muted-foreground"}>
                    {stage}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info section */}
      {!scanning && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-3 text-sm font-semibold">What We Check</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              "SQL Injection",
              "Cross-Site Scripting (XSS)",
              "Security Headers",
              "Cookie Configuration",
              "SSL/TLS Version",
              "CSRF Protection",
              "Open Redirects",
              "Information Disclosure",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
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
