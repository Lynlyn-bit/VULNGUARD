import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Clock,
  Globe,
  ListChecks,
  CalendarClock,
  BadgeCheck,
  Minus,
  Loader2,
  Radio,
} from "lucide-react";
import { motion } from "framer-motion";
import { getStoredScans } from "@/lib/scanStore";
import { getSeverityBg } from "@/lib/scanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ScanJob {
  id: string;
  target_url: string;
  status: string;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scans = getStoredScans();
  const recentScansRef = useRef<HTMLDivElement>(null);

  // Live scan jobs from database
  const [liveJobs, setLiveJobs] = useState<ScanJob[]>([]);
  const [vulnCounts, setVulnCounts] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    if (!user) return;
    const fetchJobs = async () => {
      const { data } = await supabase
        .from("scan_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setLiveJobs(data);

      // Fetch vuln counts per job
      const completedIds = (data || []).filter(j => j.status === "completed").map(j => j.id);
      if (completedIds.length > 0) {
        const { data: vulns } = await supabase
          .from("scan_vulnerabilities")
          .select("scan_job_id, risk_level")
          .in("scan_job_id", completedIds);
        if (vulns) {
          const counts: Record<string, Record<string, number>> = {};
          vulns.forEach(v => {
            if (!counts[v.scan_job_id]) counts[v.scan_job_id] = {};
            const level = v.risk_level.toLowerCase();
            counts[v.scan_job_id][level] = (counts[v.scan_job_id][level] || 0) + 1;
          });
          setVulnCounts(counts);
        }
      }
    };
    fetchJobs();

    // Subscribe to realtime updates for running scans
    const channel = supabase
      .channel("scan-jobs-live")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "scan_jobs",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchJobs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const totalVulns = scans.reduce((acc, s) => acc + s.vulnerabilities.length, 0);
  const criticalVulns = scans.reduce(
    (acc, s) =>
      acc +
      s.vulnerabilities.filter(
        (v) => v.severity === "critical" || v.severity === "high"
      ).length,
    0
  );

  const getTrend = () => {
    if (scans.length < 2) return { direction: "neutral" as const, percent: 0 };
    const latest = scans[0].vulnerabilities.length;
    const previous = scans[1].vulnerabilities.length;
    if (previous === 0) return { direction: "neutral" as const, percent: 0 };
    const change = Math.round(((latest - previous) / previous) * 100);
    if (change > 0) return { direction: "up" as const, percent: change };
    if (change < 0) return { direction: "down" as const, percent: Math.abs(change) };
    return { direction: "neutral" as const, percent: 0 };
  };
  const trend = getTrend();

  // Next scheduled scan from DB
  const [nextScheduled, setNextScheduled] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("scheduled_scans")
        .select("next_run_at")
        .eq("user_id", user.id)
        .eq("enabled", true)
        .order("next_run_at", { ascending: true })
        .limit(1);
      if (data && data.length > 0 && data[0].next_run_at) {
        const diff = new Date(data[0].next_run_at).getTime() - Date.now();
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          setNextScheduled(`${days}d ${hours}h`);
        }
      }
    })();
  }, [user]);

  const scrollToRecent = () => {
    recentScansRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const runningJobs = liveJobs.filter(j => ["spidering", "scanning", "pending"].includes(j.status));

  const stats = [
    {
      label: "Total Scans",
      value: scans.length + liveJobs.filter(j => j.status === "completed").length,
      icon: Search,
      color: "text-primary",
      clickable: true,
      onClick: () => scrollToRecent(),
    },
    {
      label: "Vulnerabilities",
      value: totalVulns + Object.values(vulnCounts).reduce((a, c) => a + Object.values(c).reduce((x, y) => x + y, 0), 0),
      icon: AlertTriangle,
      color: "text-severity-medium",
      trend,
      clickable: true,
      onClick: () => scrollToRecent(),
    },
    {
      label: "Critical / High",
      value: criticalVulns + Object.values(vulnCounts).reduce((a, c) => a + (c["high"] || 0) + (c["critical"] || 0), 0),
      icon: Shield,
      color: "text-severity-high",
      clickable: true,
      onClick: () => scrollToRecent(),
    },
    {
      label: "Sites Scanned",
      value: new Set([...scans.map(s => s.url), ...liveJobs.filter(j => j.status === "completed").map(j => j.target_url)]).size,
      icon: Globe,
      color: "text-accent",
      clickable: true,
      onClick: () => scrollToRecent(),
    },
  ];

  const checklist = [
    {
      label: "Run your first scan",
      done: scans.length > 0 || liveJobs.length > 0,
      action: () => navigate("/scan"),
      icon: Search,
    },
    {
      label: "Review vulnerability results",
      done: scans.some((s) => s.vulnerabilities.length > 0) || Object.keys(vulnCounts).length > 0,
      action: () => scans.length > 0 ? navigate(`/results/${scans[0].id}`) : navigate("/results"),
      icon: ListChecks,
    },
    {
      label: "Set up automated weekly scans",
      done: nextScheduled !== null,
      action: () => navigate("/settings"),
      icon: CalendarClock,
    },
    {
      label: "Secure your site & earn a badge",
      done: false,
      action: () => navigate("/settings"),
      icon: BadgeCheck,
    },
  ];
  const completedSteps = checklist.filter((c) => c.done).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "spidering": return "text-blue-400";
      case "scanning": return "text-amber-400";
      case "completed": return "text-accent";
      case "failed": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your security scanning activity
        </p>
      </div>

      {/* Live running scans indicator */}
      {runningJobs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-primary/30 bg-primary/5 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Radio className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">Live Scans Running</span>
          </div>
          <div className="space-y-2">
            {runningJobs.map(job => (
              <div key={job.id} className="flex items-center gap-3 rounded-md bg-card/50 px-3 py-2 border border-border">
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs">{job.target_url}</p>
                  <p className={`text-[10px] font-medium ${getStatusColor(job.status)}`}>
                    {job.status === "spidering" ? "Spider crawling..." : job.status === "scanning" ? "Active scanning..." : "Pending..."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      animate={{ width: `${job.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground w-8">{job.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={stat.onClick}
            className="group cursor-pointer rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.15)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <stat.icon
                className={`h-4 w-4 ${stat.color} transition-transform group-hover:scale-110`}
                strokeWidth={2}
              />
            </div>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-3xl font-bold font-mono">{stat.value}</p>
              {"trend" in stat && stat.trend && stat.trend.direction !== "neutral" && (
                <span
                  className={`mb-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    stat.trend.direction === "down"
                      ? "bg-accent/15 text-accent"
                      : "bg-severity-high/15 text-severity-high"
                  }`}
                >
                  {stat.trend.direction === "down" ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {stat.trend.percent}%
                </span>
              )}
              {"trend" in stat && stat.trend && stat.trend.direction === "neutral" && scans.length >= 2 && (
                <span className="mb-1 inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  <Minus className="h-3 w-3" />
                  0%
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Start Scan + Scheduled countdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-lg border border-primary/20 bg-primary/5 p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Start a New Scan</h2>
            <p className="text-sm text-muted-foreground">
              Enter your website URL to check for vulnerabilities
            </p>
            {nextScheduled && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                Next automated scan in{" "}
                <span className="font-mono font-semibold text-primary">{nextScheduled}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate("/scan")}
            className="glow-primary inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_25px_-3px_hsl(var(--primary)/0.6)]"
          >
            Start Scan
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </motion.div>

      {/* Getting Started Checklist */}
      {completedSteps < checklist.length && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-lg border border-border bg-card p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Getting Started</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-primary">
              {completedSteps}/{checklist.length}
            </span>
          </div>
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(completedSteps / checklist.length) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {checklist.map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                onClick={item.action}
                className={`group flex items-center gap-3 rounded-md border px-4 py-3 text-left text-sm transition-all ${
                  item.done
                    ? "border-accent/20 bg-accent/5 text-muted-foreground"
                    : "border-border hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                {item.done ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
                ) : (
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" strokeWidth={2} />
                )}
                <span className={item.done ? "line-through" : ""}>{item.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent scans — merges local + live DB scans */}
      <div ref={recentScansRef}>
        <h2 className="mb-3 text-lg font-semibold">Recent Scans</h2>
        {scans.length === 0 && liveJobs.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Shield className="mx-auto h-10 w-10 text-muted-foreground/50" strokeWidth={2} />
            <p className="mt-3 text-sm text-muted-foreground">
              No scans yet. Start your first scan to see results here.
            </p>
            <button
              onClick={() => navigate("/scan")}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Search className="h-4 w-4" strokeWidth={2} />
              Run Your First Scan
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Live DB scans */}
            {liveJobs.slice(0, 10).map((job) => {
              const jVulns = vulnCounts[job.id] || {};
              const totalJobVulns = Object.values(jVulns).reduce((a, b) => a + b, 0);
              const isRunning = ["spidering", "scanning", "pending"].includes(job.status);
              return (
                <motion.div
                  key={`db-${job.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center justify-between rounded-lg border bg-card p-4 transition-all cursor-pointer ${
                    isRunning ? "border-primary/30" : "border-border hover:border-primary/20 hover:bg-secondary/50"
                  }`}
                  onClick={() => job.status === "completed" && navigate(`/results`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
                      <p className="truncate font-mono text-sm">{job.target_url}</p>
                      {isRunning && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()} ·{" "}
                      <span className={getStatusColor(job.status)}>
                        {job.status === "completed" ? `${totalJobVulns} vulnerabilities` : job.status}
                      </span>
                      {isRunning && ` · ${job.progress}%`}
                    </p>
                  </div>
                  {job.status === "completed" && (
                    <div className="ml-4 flex gap-1.5">
                      {["critical", "high", "medium", "low"].map((sev) => {
                        const count = jVulns[sev] || 0;
                        if (count === 0) return null;
                        return (
                          <span
                            key={sev}
                            className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-medium ${getSeverityBg(sev as any)}`}
                          >
                            {count} {sev[0].toUpperCase()}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {isRunning && (
                    <div className="ml-4 h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Local simulated scans */}
            {scans.slice(0, 5).map((scan) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/20 hover:bg-secondary/50 cursor-pointer"
                onClick={() => navigate(`/results/${scan.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">{scan.url}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(scan.date).toLocaleDateString()} ·{" "}
                    {scan.vulnerabilities.length} vulnerabilities
                    <span className="ml-1 text-muted-foreground/60">(simulated)</span>
                  </p>
                </div>
                <div className="ml-4 flex gap-1.5">
                  {["critical", "high", "medium", "low"].map((sev) => {
                    const count = scan.vulnerabilities.filter(
                      (v) => v.severity === sev
                    ).length;
                    if (count === 0) return null;
                    return (
                      <span
                        key={sev}
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-medium ${getSeverityBg(
                          sev as any
                        )}`}
                      >
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
