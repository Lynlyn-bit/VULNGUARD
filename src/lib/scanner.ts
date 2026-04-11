export type Severity = "low" | "medium" | "high" | "critical";

export interface Vulnerability {
  id: string;
  type: string;
  severity: Severity;
  description: string;
  recommendation: string;
  location: string;
}

export interface ScanResult {
  id: string;
  url: string;
  date: string;
  status: "completed" | "failed";
  duration: number;
  vulnerabilities: Vulnerability[];
}

const vulnTemplates: Omit<Vulnerability, "id" | "location">[] = [
  {
    type: "SQL Injection",
    severity: "critical",
    description: "Potential SQL injection vulnerability detected in query parameters. User input appears to be directly concatenated into SQL queries without proper parameterization.",
    recommendation: "Use parameterized queries or prepared statements. Never concatenate user input directly into SQL strings.",
  },
  {
    type: "Cross-Site Scripting (XSS)",
    severity: "high",
    description: "Reflected XSS vulnerability found. User input is echoed back in the response without proper encoding, allowing script injection.",
    recommendation: "Sanitize and encode all user input before rendering. Use Content-Security-Policy headers.",
  },
  {
    type: "Missing Security Headers",
    severity: "medium",
    description: "Important security headers are missing: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security.",
    recommendation: "Add security headers: X-Content-Type-Options: nosniff, X-Frame-Options: DENY, HSTS with max-age of at least 31536000.",
  },
  {
    type: "Insecure Cookie Configuration",
    severity: "medium",
    description: "Session cookies are set without the Secure and HttpOnly flags, making them vulnerable to interception and XSS attacks.",
    recommendation: "Set Secure, HttpOnly, and SameSite=Strict flags on all session cookies.",
  },
  {
    type: "Outdated SSL/TLS",
    severity: "high",
    description: "Server supports outdated TLS 1.0/1.1 protocols which have known vulnerabilities.",
    recommendation: "Disable TLS 1.0 and 1.1. Only allow TLS 1.2 and 1.3.",
  },
  {
    type: "Directory Listing Enabled",
    severity: "low",
    description: "Web server directory listing is enabled, exposing file structure to potential attackers.",
    recommendation: "Disable directory listing in web server configuration. Add index files to directories.",
  },
  {
    type: "CSRF Token Missing",
    severity: "high",
    description: "Forms do not include anti-CSRF tokens, making the application vulnerable to Cross-Site Request Forgery attacks.",
    recommendation: "Implement CSRF tokens for all state-changing requests. Use the SameSite cookie attribute.",
  },
  {
    type: "Information Disclosure",
    severity: "low",
    description: "Server version information exposed in HTTP response headers, aiding attacker reconnaissance.",
    recommendation: "Remove or obfuscate server version headers. Configure server to suppress version info.",
  },
  {
    type: "Open Redirect",
    severity: "medium",
    description: "Application accepts user-controlled URLs for redirects without validation, enabling phishing attacks.",
    recommendation: "Validate redirect URLs against a whitelist of allowed domains. Never redirect to user-provided URLs.",
  },
  {
    type: "Sensitive Data Exposure",
    severity: "critical",
    description: "API endpoints expose sensitive user data without proper authentication or authorization checks.",
    recommendation: "Implement proper authentication and authorization. Apply principle of least privilege to API responses.",
  },
];

const locations = [
  "/login", "/api/users", "/search?q=", "/checkout", "/api/products",
  "/admin", "/account/settings", "/api/orders", "/contact", "/api/payment",
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function simulateScan(url: string): Promise<ScanResult> {
  return new Promise((resolve) => {
    const duration = 3000 + Math.random() * 5000;

    setTimeout(() => {
      const numVulns = 2 + Math.floor(Math.random() * 6);
      const shuffled = [...vulnTemplates].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, numVulns);

      const vulnerabilities: Vulnerability[] = selected.map((v, i) => ({
        ...v,
        id: generateId(),
        location: url + locations[i % locations.length],
      }));

      resolve({
        id: generateId(),
        url,
        date: new Date().toISOString(),
        status: "completed",
        duration: Math.round(duration / 1000),
        vulnerabilities,
      });
    }, duration);
  });
}

export function getSeverityColor(severity: Severity): string {
  const map: Record<Severity, string> = {
    low: "text-severity-low",
    medium: "text-severity-medium",
    high: "text-severity-high",
    critical: "text-severity-critical",
  };
  return map[severity];
}

export function getSeverityBg(severity: Severity): string {
  const map: Record<Severity, string> = {
    low: "bg-severity-low/15 text-severity-low border-severity-low/30",
    medium: "bg-severity-medium/15 text-severity-medium border-severity-medium/30",
    high: "bg-severity-high/15 text-severity-high border-severity-high/30",
    critical: "bg-severity-critical/15 text-severity-critical border-severity-critical/30",
  };
  return map[severity];
}
