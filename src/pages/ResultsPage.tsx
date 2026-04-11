import { useNavigate } from "react-router-dom";
import { FileText, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { getStoredScans } from "@/lib/scanStore";
import { getSeverityBg } from "@/lib/scanner";

const ResultsPage = () => {
  const navigate = useNavigate();
  const scans = getStoredScans();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scan Results</h1>
        <p className="text-sm text-muted-foreground">View all your vulnerability scan reports</p>
      </div>

      {scans.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No scan results yet.</p>
          <button
            onClick={() => navigate("/scan")}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Run Your First Scan
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">URL</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Vulnerabilities</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Severity</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scans.map((scan, i) => (
                <motion.tr
                  key={scan.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="cursor-pointer transition-colors hover:bg-secondary/30"
                  onClick={() => navigate(`/results/${scan.id}`)}
                >
                  <td className="max-w-[200px] truncate px-4 py-3 font-mono text-sm">{scan.url}</td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                    {new Date(scan.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{scan.vulnerabilities.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {["critical", "high", "medium", "low"].map((sev) => {
                        const count = scan.vulnerabilities.filter((v) => v.severity === sev).length;
                        if (count === 0) return null;
                        return (
                          <span key={sev} className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium ${getSeverityBg(sev as any)}`}>
                            {count}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
