import { Link } from "react-router-dom";
import { Shield, Zap, BarChart3, Lock, ArrowRight, ChevronDown, Globe, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const stats = [
  { value: "10K+", label: "Scans Completed" },
  { value: "500+", label: "SMEs Protected" },
  { value: "99.2%", label: "Detection Rate" },
  { value: "< 2min", label: "Avg Scan Time" },
];

const features = [
  {
    icon: Zap,
    title: "Lightning Fast Scans",
    description: "Scan your entire e-commerce platform in under 2 minutes with our optimized scanning engine.",
  },
  {
    icon: Shield,
    title: "OWASP Top 10 Coverage",
    description: "Comprehensive checks for SQL Injection, XSS, CSRF, and all major vulnerability categories.",
  },
  {
    icon: BarChart3,
    title: "Detailed Reports",
    description: "Get severity-coded results with actionable remediation steps your team can follow.",
  },
  {
    icon: Lock,
    title: "Secure by Design",
    description: "Your data is encrypted end-to-end. We never store sensitive information from your scans.",
  },
];

const vulnerabilities = [
  { name: "SQL Injection", severity: "critical", found: true },
  { name: "Cross-Site Scripting", severity: "high", found: true },
  { name: "CSRF Token Missing", severity: "medium", found: true },
  { name: "Secure Headers", severity: "low", found: false },
  { name: "SSL/TLS Config", severity: "low", found: false },
];

const FloatingOrb = ({ delay, size, x, y }: { delay: number; size: number; x: string; y: string }) => (
  <motion.div
    className="absolute rounded-full bg-primary/10 blur-3xl"
    style={{ width: size, height: size, left: x, top: y }}
    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
    transition={{ duration: 4, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

const ScanAnimation = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % vulnerabilities.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5 font-mono text-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
          <div className="w-3 h-3 rounded-full bg-destructive/80" />
          <div className="w-3 h-3 rounded-full bg-warning/80" />
          <div className="w-3 h-3 rounded-full bg-accent/80" />
          <span className="ml-2 text-muted-foreground text-xs">vulnguard-scanner</span>
        </div>
        <div className="space-y-2">
          {vulnerabilities.map((v, i) => (
            <motion.div
              key={v.name}
              className={`flex items-center justify-between rounded-md px-3 py-2 transition-colors ${
                i === activeIndex ? "bg-primary/10 border border-primary/30" : "bg-transparent"
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="flex items-center gap-2">
                {v.found ? (
                  <AlertTriangle className={`h-3.5 w-3.5 ${
                    v.severity === "critical" ? "text-severity-critical" :
                    v.severity === "high" ? "text-severity-high" :
                    v.severity === "medium" ? "text-severity-medium" : "text-severity-low"
                  }`} />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                )}
                <span className="text-foreground/90 text-xs">{v.name}</span>
              </div>
              <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                v.severity === "critical" ? "bg-severity-critical/20 text-severity-critical" :
                v.severity === "high" ? "bg-severity-high/20 text-severity-high" :
                v.severity === "medium" ? "bg-severity-medium/20 text-severity-medium" :
                "bg-severity-low/20 text-severity-low"
              }`}>
                {v.severity}
              </span>
            </motion.div>
          ))}
        </div>
        <motion.div
          className="mt-4 h-1.5 rounded-full bg-secondary overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Floating orbs */}
      <FloatingOrb delay={0} size={400} x="10%" y="10%" />
      <FloatingOrb delay={1.5} size={300} x="70%" y="20%" />
      <FloatingOrb delay={3} size={250} x="50%" y="60%" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 border-b border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <span className="text-xl font-semibold tracking-tight">
            Vuln<span className="text-primary">Guard</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#demo" className="hover:text-foreground transition-colors">Demo</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="glow-primary">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-16 lg:pt-32 lg:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-8">
            <Globe className="h-3.5 w-3.5" />
            Trusted by 500+ SME businesses worldwide
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Protect Your Store
            <br />
            <span className="text-primary text-glow">Before Hackers Do</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10">
            Automated vulnerability scanning built for e-commerce. Find and fix security issues in minutes, not months.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" className="glow-primary text-base px-8 h-12">
                Start Free Scan <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#demo">
              <Button variant="outline" size="lg" className="text-base px-8 h-12">
                Watch Demo
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8"
        >
          <a href="#demo">
            <ChevronDown className="h-6 w-6 text-muted-foreground animate-bounce" />
          </a>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 border-y border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-10">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Live Demo */}
      <section id="demo" className="relative z-10 px-6 py-20 lg:py-28">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See It <span className="text-primary">In Action</span>
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Our scanner crawls your site, tests for vulnerabilities, and delivers a prioritized report — all in real-time.
            </p>
            <ul className="space-y-3 text-sm">
              {["Automated crawling & discovery", "OWASP Top 10 vulnerability checks", "Severity-based prioritization", "One-click remediation guides"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-foreground/80">
                  <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <ScanAnimation />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 py-20 lg:py-28 bg-card/20">
        <div className="max-w-5xl mx-auto text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to <span className="text-primary">Stay Secure</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Built specifically for SME e-commerce platforms. No security expertise required.
          </p>
        </div>
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="group rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 hover:border-primary/40 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-4 group-hover:glow-primary transition-shadow">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-20 lg:py-28">
        <motion.div
          className="max-w-3xl mx-auto text-center rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-sm p-10 lg:p-14"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Secure Your Business?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join hundreds of SMEs who trust VulnGuard to keep their e-commerce platforms safe.
          </p>
          <Link to="/signup">
            <Button size="lg" className="glow-primary text-base px-10 h-12">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span>VulnGuard © 2026</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
