import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Clock, Globe, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { getScanById } from "@/lib/scanStore";
import { getSeverityBg, getSeverityColor, type Severity } from "@/lib/scanner";
import { useState } from "react";

const ScanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const scan = getScanById(id || "");
  const [expandedVuln, setExpandedVuln] = useState<string | null>(null);

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

  const severityCounts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  scan.vulnerabilities.forEach((v) => severityCounts[v.severity]++);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/results")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Results
      </button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scan Report</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> {scan.url}</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {new Date(scan.date).toLocaleString()}</span>
          <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> {scan.duration}s scan time</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        {(["critical", "high", "medium", "low"] as Severity[]).map((sev) => (
          <div key={sev} className={`rounded-lg border p-4 ${getSeverityBg(sev)}`}>
            <p className="text-xs font-medium uppercase tracking-wider opacity-70">{sev}</p>
            <p className="mt-1 text-2xl font-bold font-mono">{severityCounts[sev]}</p>
          </div>
        ))}
      </div>

      {/* Vulnerability list */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          <AlertTriangle className="mr-2 inline h-5 w-5 text-severity-medium" />
          Vulnerabilities ({scan.vulnerabilities.length})
        </h2>
        <div className="space-y-2">
          {scan.vulnerabilities
            .sort((a, b) => {
              const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
              return order[a.severity] - order[b.severity];
            })
            .map((vuln, i) => (
              <motion.div
                key={vuln.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-border bg-card overflow-hidden"
              >
                <button
                  className="flex w-full items-center gap-3 p-4 text-left"
                  onClick={() => setExpandedVuln(expandedVuln === vuln.id ? null : vuln.id)}
                >
                  <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${getSeverityBg(vuln.severity)}`}>
                    {vuln.severity}
                  </span>
                  <span className="flex-1 text-sm font-medium">{vuln.type}</span>
                  {expandedVuln === vuln.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedVuln === vuln.id && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    className="border-t border-border px-4 pb-4 pt-3"
                  >
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Location</p>
                        <p className="font-mono text-xs text-foreground/80">{vuln.location}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</p>
                        <p className="text-foreground/80">{vuln.description}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recommendation</p>
                        <p className="text-accent">{vuln.recommendation}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ScanDetail;
