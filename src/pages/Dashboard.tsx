import { useNavigate } from "react-router-dom";
import { Shield, Search, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { getStoredScans } from "@/lib/scanStore";
import { getSeverityBg } from "@/lib/scanner";

const Dashboard = () => {
  const navigate = useNavigate();
  const scans = getStoredScans();

  const totalVulns = scans.reduce((acc, s) => acc + s.vulnerabilities.length, 0);
  const criticalVulns = scans.reduce(
    (acc, s) => acc + s.vulnerabilities.filter((v) => v.severity === "critical" || v.severity === "high").length,
    0
  );

  const stats = [
    { label: "Total Scans", value: scans.length, icon: Search, color: "text-primary" },
    { label: "Vulnerabilities", value: totalVulns, icon: AlertTriangle, color: "text-severity-medium" },
    { label: "Critical/High", value: criticalVulns, icon: Shield, color: "text-severity-high" },
    { label: "Sites Scanned", value: new Set(scans.map((s) => s.url)).size, icon: CheckCircle, color: "text-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your security scanning activity</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-lg border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="mt-2 text-3xl font-bold font-mono">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-lg border border-primary/20 bg-primary/5 p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Start a New Scan</h2>
            <p className="text-sm text-muted-foreground">Enter your website URL to check for vulnerabilities</p>
          </div>
          <button
            onClick={() => navigate("/scan")}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start Scan
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Recent scans */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent Scans</h2>
        {scans.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Shield className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No scans yet. Start your first scan to see results here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scans.slice(0, 5).map((scan) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary/50 cursor-pointer"
                onClick={() => navigate(`/results/${scan.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">{scan.url}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(scan.date).toLocaleDateString()} · {scan.vulnerabilities.length} vulnerabilities
                  </p>
                </div>
                <div className="ml-4 flex gap-1.5">
                  {["critical", "high", "medium", "low"].map((sev) => {
                    const count = scan.vulnerabilities.filter((v) => v.severity === sev).length;
                    if (count === 0) return null;
                    return (
                      <span key={sev} className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-medium ${getSeverityBg(sev as any)}`}>
                        {count} {sev[0].toUpperCase()}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
