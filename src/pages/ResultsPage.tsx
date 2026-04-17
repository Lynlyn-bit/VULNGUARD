import { useNavigate } from "react-router-dom";
import { FileText, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { getSeverityBg, type Severity } from "@/lib/scanner";

interface Scan {
  _id: string;
  url: string;
  createdAt: string;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const ResultsPage = () => {
  const navigate = useNavigate();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const response = await apiClient.getScans(1, 50);
        setScans(response.data.scans || []);
      } catch (error) {
        console.error('Failed to fetch scans:', error);
        setScans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scan Results</h1>
        <p className="text-sm text-muted-foreground">View all your vulnerability scan reports</p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading scans...</p>
        </div>
      ) : scans.length === 0 ? (
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
                  key={scan._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="cursor-pointer transition-colors hover:bg-secondary/30"
                  onClick={() => navigate(`/results/${scan._id}`)}
                >
                  <td className="max-w-[200px] truncate px-4 py-3 font-mono text-sm">{scan.url}</td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{scan.summary?.total || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(["critical", "high", "medium", "low"] as Severity[]).map((sev) => {
                        let count = 0;
                        if (sev === "critical") count = scan.summary?.critical || 0;
                        else if (sev === "high") count = scan.summary?.high || 0;
                        else if (sev === "medium") count = scan.summary?.medium || 0;
                        else if (sev === "low") count = scan.summary?.low || 0;
                        
                        if (count === 0) return null;
                        return (
                          <span key={sev} className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium ${getSeverityBg(sev)}`}>
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
