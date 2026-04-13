import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Shield, Clock, Globe, AlertTriangle, ChevronDown, ChevronUp,
  Download, Search, Filter, EyeOff, Sparkles, Database, Code, ShieldOff,
  Lock, FolderOpen, ShieldAlert, Eye, ExternalLink, KeyRound, Timer,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getScanById, updateScan } from "@/lib/scanStore";
import { getSeverityBg, getVulnIcon, type Severity, type Vulnerability } from "@/lib/scanner";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

const iconMap: Record<string, React.ElementType> = {
  Database, Code, ShieldOff, Lock, FolderOpen, ShieldAlert, Eye, ExternalLink, KeyRound, AlertTriangle,
};

const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "hsl(0, 85%, 55%)",
  high: "hsl(25, 95%, 55%)",
  medium: "hsl(45, 95%, 55%)",
  low: "hsl(200, 70%, 55%)",
};

const ScanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(() => getScanById(id || ""));
  const [expandedVuln, setExpandedVuln] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
  const [showFalsePositives, setShowFalsePositives] = useState(true);
  const [aiGenerating, setAiGenerating] = useState<string | null>(null);
  const [aiFixResults, setAiFixResults] = useState<Record<string, string>>({});

  const filteredVulns = useMemo(() => {
    if (!scan) return [];
    return scan.vulnerabilities
      .filter(v => {
        if (!showFalsePositives && v.falsePositive) return false;
        if (filterSeverity !== "all" && v.severity !== filterSeverity) return false;
        if (searchTerm && !v.type.toLowerCase().includes(searchTerm.toLowerCase()) && !v.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [scan, filterSeverity, searchTerm, showFalsePositives]);

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
  scan.vulnerabilities.filter(v => !v.falsePositive).forEach((v) => severityCounts[v.severity]++);

  const chartData = (["critical", "high", "medium", "low"] as Severity[])
    .filter(s => severityCounts[s] > 0)
    .map(s => ({ name: s, value: severityCounts[s], color: SEVERITY_COLORS[s] }));

  const totalFixTime = scan.vulnerabilities
    .filter(v => !v.falsePositive)
    .reduce((acc, v) => acc + (v.estimatedFixMinutes || 0), 0);

  const filteredVulns = useMemo(() => {
    return scan.vulnerabilities
      .filter(v => {
        if (!showFalsePositives && v.falsePositive) return false;
        if (filterSeverity !== "all" && v.severity !== filterSeverity) return false;
        if (searchTerm && !v.type.toLowerCase().includes(searchTerm.toLowerCase()) && !v.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [scan.vulnerabilities, filterSeverity, searchTerm, showFalsePositives]);

  const toggleFalsePositive = (vulnId: string) => {
    updateScan(scan.id, (s) => ({
      ...s,
      vulnerabilities: s.vulnerabilities.map(v =>
        v.id === vulnId ? { ...v, falsePositive: !v.falsePositive } : v
      ),
    }));
    setScan(getScanById(scan.id));
    toast.success("Vulnerability status updated");
  };

  const generateAiFix = async (vuln: Vulnerability) => {
    setAiGenerating(vuln.id);
    // Simulate AI generation
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    const fixes: Record<string, string> = {
      "SQL Injection": `// Before (vulnerable):\nconst query = "SELECT * FROM users WHERE id = '" + userId + "'";\n\n// After (parameterized):\nconst query = "SELECT * FROM users WHERE id = $1";\nconst result = await pool.query(query, [userId]);`,
      "Cross-Site Scripting (XSS)": `// Add Content-Security-Policy header:\napp.use((req, res, next) => {\n  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'");\n  next();\n});\n\n// Sanitize output:\nimport DOMPurify from 'dompurify';\nconst safe = DOMPurify.sanitize(userInput);`,
      "Missing Security Headers": `// Express middleware:\nconst helmet = require('helmet');\napp.use(helmet());\n\n// Or manually:\napp.use((req, res, next) => {\n  res.setHeader('X-Content-Type-Options', 'nosniff');\n  res.setHeader('X-Frame-Options', 'DENY');\n  res.setHeader('Strict-Transport-Security', 'max-age=31536000');\n  next();\n});`,
      "Insecure Cookie Configuration": `// Secure cookie settings:\nres.cookie('session', token, {\n  httpOnly: true,\n  secure: true,\n  sameSite: 'strict',\n  maxAge: 3600000\n});`,
      "Outdated SSL/TLS": `# Nginx configuration:\nssl_protocols TLSv1.2 TLSv1.3;\nssl_prefer_server_ciphers on;\nssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';`,
      "Directory Listing Enabled": `# Apache - add to .htaccess:\nOptions -Indexes\n\n# Nginx:\nautoindex off;`,
      "CSRF Token Missing": `// Express + csurf middleware:\nconst csrf = require('csurf');\napp.use(csrf({ cookie: { httpOnly: true, secure: true, sameSite: 'strict' } }));\n\n// In your form:\n<input type="hidden" name="_csrf" value="<%= csrfToken %>" />`,
      "Information Disclosure": `# Nginx:\nserver_tokens off;\n\n# Apache:\nServerTokens Prod\nServerSignature Off\n\n# Express:\napp.disable('x-powered-by');`,
      "Open Redirect": `// Validate redirect URL:\nconst allowedDomains = ['yourdomain.com'];\nconst url = new URL(redirectUrl);\nif (!allowedDomains.includes(url.hostname)) {\n  return res.redirect('/');\n}`,
      "Sensitive Data Exposure": `// Add auth middleware:\napp.get('/api/users/:id', authenticate, authorize, (req, res) => {\n  // Only return necessary fields\n  const { name, email } = user;\n  res.json({ name, email });\n});`,
    };
    setAiFixResults(prev => ({ ...prev, [vuln.id]: fixes[vuln.type] || vuln.recommendation }));
    setAiGenerating(null);
  };

  const handleExportPdf = () => {
    toast.success("Report exported", { description: "PDF download will begin shortly" });
    // In production this would generate a real PDF
  };

  const VulnIcon = ({ type }: { type: string }) => {
    const iconName = getVulnIcon(type);
    const Icon = iconMap[iconName] || AlertTriangle;
    return <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate("/results")} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Results
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">Scan Report</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> {scan.url}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {new Date(scan.date).toLocaleString()}</span>
            <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> {scan.duration}s</span>
          </div>
        </div>
        <button
          onClick={handleExportPdf}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Download className="h-4 w-4" strokeWidth={2} /> Export PDF
        </button>
      </div>

      {/* Summary row: cards + chart */}
      <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
        <div className="grid gap-3 sm:grid-cols-4">
          {(["critical", "high", "medium", "low"] as Severity[]).map((sev) => (
            <motion.div
              key={sev}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg border p-4 transition-all cursor-pointer ${getSeverityBg(sev)} ${
                sev === "critical" || sev === "high"
                  ? "shadow-[0_0_15px_-3px] shadow-current/20"
                  : ""
              } ${filterSeverity === sev ? "ring-2 ring-current/40" : ""}`}
              onClick={() => setFilterSeverity(filterSeverity === sev ? "all" : sev)}
            >
              <p className="text-xs font-medium uppercase tracking-wider opacity-70">{sev}</p>
              <p className="mt-1 text-2xl font-bold font-mono">{severityCounts[sev]}</p>
            </motion.div>
          ))}
        </div>

        {/* Severity doughnut */}
        {chartData.length > 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3">
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} strokeWidth={0}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded border border-border bg-card px-2 py-1 text-xs shadow">
                        <span className="capitalize">{d.name}</span>: {d.value}
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" /> Est. fix: <span className="font-mono font-semibold text-foreground">{totalFixTime}m</span>
            </div>
          </div>
        )}
      </div>

      {/* Search & filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vulnerabilities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={() => setShowFalsePositives(!showFalsePositives)}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
            showFalsePositives ? "border-border bg-card" : "border-primary/30 bg-primary/10 text-primary"
          }`}
        >
          <EyeOff className="h-3.5 w-3.5" /> {showFalsePositives ? "Hide" : "Show"} False Positives
        </button>
        {filterSeverity !== "all" && (
          <button
            onClick={() => setFilterSeverity("all")}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary"
          >
            <Filter className="h-3.5 w-3.5" /> {filterSeverity} ✕
          </button>
        )}
      </div>

      {/* Vulnerability list */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          <AlertTriangle className="mr-2 inline h-5 w-5 text-severity-medium" />
          Vulnerabilities ({filteredVulns.length})
        </h2>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredVulns.map((vuln, i) => (
              <motion.div
                key={vuln.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-lg border bg-card overflow-hidden transition-colors ${
                  vuln.falsePositive ? "border-border/50 opacity-60" : "border-border"
                }`}
              >
                <button
                  className="flex w-full items-center gap-3 p-4 text-left"
                  onClick={() => setExpandedVuln(expandedVuln === vuln.id ? null : vuln.id)}
                >
                  <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${getSeverityBg(vuln.severity)}`}>
                    <VulnIcon type={vuln.type} />
                    {vuln.severity}
                  </span>
                  <span className={`flex-1 text-sm font-medium ${vuln.falsePositive ? "line-through" : ""}`}>{vuln.type}</span>
                  {vuln.estimatedFixMinutes && (
                    <span className="hidden sm:inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      <Timer className="h-3 w-3" /> {vuln.estimatedFixMinutes}m
                    </span>
                  )}
                  {expandedVuln === vuln.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedVuln === vuln.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border"
                    >
                      <div className="space-y-4 px-4 pb-4 pt-3">
                        {/* Location */}
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Location</p>
                          <p className="font-mono text-xs text-foreground/80">{vuln.location}</p>
                        </div>

                        {/* Proof of Exploit */}
                        {vuln.proofOfExploit && (
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-severity-high">
                              Proof of Exploit
                            </p>
                            <div className="rounded-md border border-severity-high/20 bg-severity-high/5 p-3">
                              <code className="block whitespace-pre-wrap font-mono text-xs text-foreground/90">
                                {vuln.proofOfExploit}
                              </code>
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</p>
                          <p className="text-sm text-foreground/80">{vuln.description}</p>
                        </div>

                        {/* Recommendation */}
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Recommendation</p>
                          <p className="text-sm text-accent">{vuln.recommendation}</p>
                        </div>

                        {/* AI Fix */}
                        {aiFixResults[vuln.id] ? (
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
                              <Sparkles className="mr-1 inline h-3 w-3" /> AI-Generated Fix
                            </p>
                            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-foreground/90">
                                {aiFixResults[vuln.id]}
                              </pre>
                            </div>
                          </div>
                        ) : null}

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            disabled={aiGenerating === vuln.id}
                            onClick={() => generateAiFix(vuln)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                          >
                            {aiGenerating === vuln.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            {aiGenerating === vuln.id ? "Generating..." : "Generate Fix with AI"}
                          </button>
                          <button
                            onClick={() => toggleFalsePositive(vuln.id)}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                              vuln.falsePositive
                                ? "border-accent/30 bg-accent/10 text-accent"
                                : "border-border hover:bg-secondary"
                            }`}
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            {vuln.falsePositive ? "Unmark False Positive" : "Mark as False Positive"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredVulns.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No vulnerabilities match your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanDetail;
