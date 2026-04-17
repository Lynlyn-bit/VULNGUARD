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
} from "lucide-react";
import { motion } from "framer-motion";
import { apiClient, type UserSettings } from "@/lib/api-client";
import { getSeverityBg, type Severity } from "@/lib/scanner";

interface Scan {
  _id: string;
  url: string;
  createdAt: string;
  vulnerabilities: Array<{ severity: string }>;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface ActivityLog {
  _id: string;
  action: string;
  entityType: string;
  targetUrl?: string;
  createdAt: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [scans, setScans] = useState<Scan[]>([]);
  const [totalScans, setTotalScans] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const recentScansRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const response = await apiClient.getScans(1, 50);
        setScans(response.data.scans || []);
        setTotalScans(response.data.pagination?.total || response.data.scans?.length || 0);
      } catch (error) {
        console.error("Failed to fetch scans:", error);
        setScans([]);
        setTotalScans(0);
      } finally {
        setLoading(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const response = await apiClient.getUserSettings();
        setSettings(response.data);
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };

    const fetchActivity = async () => {
      try {
        const response = await apiClient.getActivityLogs(8);
        setActivityLogs(response.data.logs || []);
      } catch (error) {
        console.error("Failed to fetch activity logs:", error);
      }
    };

    fetchScans();
    fetchSettings();
    fetchActivity();
  }, []);

  const totalVulns = scans.reduce((acc, s) => acc + (s.vulnerabilities?.length || 0), 0);

  const criticalVulns = scans.reduce(
    (acc, s) => acc + (s.summary?.critical || 0) + (s.summary?.high || 0),
    0,
  );

  const getTrend = () => {
    if (scans.length < 2) return { direction: "neutral" as const, percent: 0 };
    const latest = scans[0].vulnerabilities?.length ?? 0;
    const previous = scans[1].vulnerabilities?.length ?? 0;
    if (previous === 0) return { direction: "neutral" as const, percent: 0 };
    const change = Math.round(((latest - previous) / previous) * 100);
    if (change > 0) return { direction: "up" as const, percent: change };
    if (change < 0) return { direction: "down" as const, percent: Math.abs(change) };
    return { direction: "neutral" as const, percent: 0 };
  };
  const trend = getTrend();

  const getNextScanCountdown = () => {
    if (!settings?.automatedScans?.enabled) return null;

    const scheduledDay = settings.automatedScans.dayOfWeek;
    const [hourValue, minuteValue] = settings.automatedScans.timeOfDay.split(":");
    const target = new Date();
    const dayMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const targetDayIndex = dayMap.indexOf(scheduledDay);

    if (targetDayIndex === -1) return null;

    const daysUntil = (targetDayIndex - target.getDay() + 7) % 7;
    target.setDate(target.getDate() + daysUntil);
    target.setHours(Number(hourValue), Number(minuteValue), 0, 0);

    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 7);
    }

    const diffMs = target.getTime() - Date.now();
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return `${days}d ${hours}h`;
  };
  const nextScan = getNextScanCountdown();

  const scrollToRecent = () => {
    recentScansRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const stats = [
    {
      label: "Total Scans",
      value: totalScans,
      icon: Search,
      color: "text-primary",
      clickable: true,
      onClick: () => scrollToRecent(),
    },
    {
      label: "Vulnerabilities",
      value: totalVulns,
      icon: AlertTriangle,
      color: "text-severity-medium",
      trend,
      clickable: true,
      onClick: () => scrollToRecent(),
    },
    {
      label: "Critical / High",
      value: criticalVulns,
      icon: Shield,
      color: "text-severity-high",
      clickable: true,
      onClick: () => scrollToRecent(),
    },
    {
      label: "Sites Scanned",
      value: new Set(scans.map((s) => s.url)).size,
      icon: Globe,
      color: "text-accent",
      clickable: true,
      onClick: () => scrollToRecent(),
    },
  ];

  const checklist = [
    {
      label: "Run your first scan",
      done: scans.length > 0,
      action: () => navigate("/scan"),
      icon: Search,
    },
    {
      label: "Review vulnerability results",
      done: scans.some((s) => (s.vulnerabilities?.length || 0) > 0),
      action: () => (scans.length > 0 ? navigate(`/results/${scans[0]._id}`) : navigate("/scan")),
      icon: ListChecks,
    },
    {
      label: "Set up automated weekly scans",
      done: settings?.automatedScans?.enabled || false,
      action: () => navigate("/settings"),
      icon: CalendarClock,
    },
    {
      label: "Secure your site & earn a badge",
      done: settings?.badge?.enabled || false,
      action: () => navigate("/settings"),
      icon: BadgeCheck,
    },
  ];
  const completedSteps = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your security scanning activity</p>
      </div>

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
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
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
            {nextScan && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                Next automated scan in <span className="font-mono font-semibold text-primary">{nextScan}</span>
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

      <div ref={recentScansRef}>
        <h2 className="mb-3 text-lg font-semibold">Recent Scans</h2>
        {loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading scans...</p>
          </div>
        ) : scans.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Shield className="mx-auto h-10 w-10 text-muted-foreground/50" strokeWidth={2} />
            <p className="mt-3 text-sm text-muted-foreground">No scans yet. Start your first scan to see results here.</p>
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
            {scans.slice(0, 10).map((scan) => (
              <motion.div
                key={scan._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/20 hover:bg-secondary/50"
                onClick={() => navigate(`/results/${scan._id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">{scan.url}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(scan.createdAt).toLocaleDateString()} · {scan.summary?.total ?? 0} vulnerabilities
                  </p>
                </div>
                <div className="ml-4 flex gap-1.5">
                  {(["critical", "high", "medium", "low"] as Severity[]).map((sev) => {
                    let count = 0;
                    if (sev === "critical") count = scan.summary?.critical || 0;
                    else if (sev === "high") count = scan.summary?.high || 0;
                    else if (sev === "medium") count = scan.summary?.medium || 0;
                    else if (sev === "low") count = scan.summary?.low || 0;

                    if (count === 0) return null;
                    return (
                      <span
                        key={sev}
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-medium ${getSeverityBg(sev)}`}
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

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          {activityLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Activity logs will appear here after scans, report exports, and resolution updates.
            </p>
          ) : (
            <div className="space-y-3">
              {activityLogs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{log.targetUrl || log.entityType}</p>
                  </div>
                  <p className="whitespace-nowrap text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
