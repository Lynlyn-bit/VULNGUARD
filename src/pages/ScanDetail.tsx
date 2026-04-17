import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Clock,
  Globe,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { apiClient, type ScanVulnerability } from "@/lib/api-client";
import { getSeverityBg, type Severity } from "@/lib/scanner";

interface Scan {
  _id: string;
  url: string;
  createdAt: string;
  duration: number;
  vulnerabilities: ScanVulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    resolved?: number;
  };
}

const ScanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedVuln, setExpandedVuln] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [updatingVulnerability, setUpdatingVulnerability] = useState<string | null>(null);

  useEffect(() => {
    const fetchScan = async () => {
      try {
        const response = await apiClient.getScanById(id || "");
        setScan(response.data as Scan);
      } catch (error) {
        console.error("Failed to fetch scan:", error);
        setScan(null);
      } finally {
        setLoading(false);
      }
    };

    fetchScan();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Loading scan...</p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">Scan not found</p>
        <button onClick={() => navigate("/results")} className="mt-4 text-sm text-primary hover:underline">
          Back to Results
        </button>
      </div>
    );
  }

  const severityCounts: Record<Severity, number> = {
    critical: scan.summary?.critical || 0,
    high: scan.summary?.high || 0,
    medium: scan.summary?.medium || 0,
    low: scan.summary?.low || 0,
  };

  const handleExportReport = async () => {
    if (!scan) return;

    try {
      setExporting(true);
      const { blob, filename } = await apiClient.exportScanReport(scan._id);
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Failed to export report:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleToggleResolved = async (vulnerability: ScanVulnerability) => {
    if (!scan) return;

    try {
      setUpdatingVulnerability(vulnerability.id);
      const response = await apiClient.updateVulnerabilityStatus(
        scan._id,
        vulnerability.id,
        !vulnerability.resolved,
      );
      setScan(response.data as Scan);
    } catch (error) {
      console.error("Failed to update vulnerability status:", error);
    } finally {
      setUpdatingVulnerability(null);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/results")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Results
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scan Report</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> {scan.url}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {new Date(scan.createdAt).toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> {scan.duration}s scan time
            </span>
          </div>
        </div>
        <button
          onClick={handleExportReport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Export Report"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {(["critical", "high", "medium", "low"] as Severity[]).map((sev) => (
          <motion.div
            key={sev}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg border p-4 transition-all ${getSeverityBg(sev)} ${
              sev === "critical" || sev === "high" ? "shadow-[0_0_15px_-3px] shadow-current/20" : ""
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wider opacity-70">{sev}</p>
            <p className="mt-1 font-mono text-2xl font-bold">{severityCounts[sev]}</p>
          </motion.div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          <AlertTriangle className="mr-2 inline h-5 w-5 text-severity-medium" />
          Vulnerabilities ({scan.vulnerabilities?.length ?? 0})
        </h2>
        <div className="space-y-2">
          {(scan.vulnerabilities || []).map((vuln, i) => (
            <motion.div
              key={vuln.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 p-4 text-left"
                onClick={() => setExpandedVuln(expandedVuln === vuln.id ? null : vuln.id)}
              >
                <span
                  className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${getSeverityBg(vuln.severity)}`}
                >
                  {vuln.severity}
                </span>
                <span className="flex-1 text-sm font-medium">{vuln.type}</span>
                {expandedVuln === vuln.id ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {expandedVuln === vuln.id && (
                <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Location</p>
                    <p className="font-mono text-xs text-foreground/80">{vuln.location}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</p>
                    <p className="text-sm text-foreground/80">{vuln.description}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recommendation</p>
                    <p className="text-sm text-accent">{vuln.recommendation}</p>
                  </div>
                  {vuln.codeFix && (
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Code Fix</p>
                      <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-xs text-foreground/90">
                        <code>{vuln.codeFix}</code>
                      </pre>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-xs font-medium ${vuln.resolved ? "text-accent" : "text-muted-foreground"}`}>
                      {vuln.resolved ? "Resolved" : "Open finding"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleResolved(vuln)}
                      disabled={updatingVulnerability === vuln.id}
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
                    >
                      {vuln.resolved ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Mark Open
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Resolved
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {(scan.vulnerabilities || []).length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Shield className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No vulnerabilities recorded for this scan.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanDetail;
