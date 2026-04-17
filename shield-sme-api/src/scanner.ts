import { Severity } from "./types";

export interface SecurityTest {
  name: string;
  category: string;
  description: string;
  severity: Severity;
  remediation: string;
  passed: boolean;
  details?: string;
  location?: string;
}

async function headOrGet(url: string) {
  try {
    return await fetch(url, { method: "HEAD", redirect: "follow" });
  } catch {
    return fetch(url, { method: "GET", redirect: "follow" });
  }
}

export async function runSecurityTests(url: string): Promise<SecurityTest[]> {
  const tests: SecurityTest[] = [];
  const parsedUrl = new URL(url);

  try {
    if (parsedUrl.protocol !== "https:") {
      tests.push({
        name: "SSL/TLS Certificate",
        category: "Transport Security",
        description: "Website does not use HTTPS",
        severity: "critical",
        remediation: "Enable HTTPS with a valid TLS certificate.",
        passed: false,
        location: parsedUrl.origin,
      });
    } else {
      tests.push({
        name: "SSL/TLS Certificate",
        category: "Transport Security",
        description: "Website uses HTTPS",
        severity: "low",
        remediation: "Keep the certificate valid and renewed.",
        passed: true,
        location: parsedUrl.origin,
      });
    }

    const response = await headOrGet(url);
    const headers = response.headers;

    const headerChecks = [
      ["x-content-type-options", "nosniff"],
      ["x-frame-options", "DENY"],
      ["content-security-policy", "default-src 'self'"],
      ["strict-transport-security", "max-age=31536000"],
    ] as const;

    for (const [name, recommendation] of headerChecks) {
      const value = headers.get(name);
      tests.push({
        name: name,
        category: "HTTP Headers",
        description: value ? `${name} header is present` : `${name} header is missing`,
        severity: value ? "low" : "high",
        remediation: `Set ${name}: ${recommendation}`,
        passed: Boolean(value),
        details: value ?? "Not set",
        location: parsedUrl.origin,
      });
    }

    const server = headers.get("server");
    tests.push({
      name: "Server Information Disclosure",
      category: "Information Disclosure",
      description: server ? "Server header is exposed" : "Server header is not exposed",
      severity: server ? "low" : "low",
      remediation: "Hide or minimize server version disclosure.",
      passed: !server,
      details: server ?? "Hidden",
      location: parsedUrl.origin,
    });

    const cors = headers.get("access-control-allow-origin");
    tests.push({
      name: "CORS Configuration",
      category: "Cross-Origin Security",
      description: cors === "*" ? "CORS allows all origins" : "CORS is restricted or absent",
      severity: cors === "*" ? "medium" : "low",
      remediation: "Restrict CORS to trusted origins.",
      passed: cors !== "*",
      details: cors ?? "Not set",
      location: parsedUrl.origin,
    });

    tests.push({
      name: "Domain Accessibility",
      category: "Availability",
      description: `Website responded with status ${response.status}`,
      severity: response.ok ? "low" : "medium",
      remediation: "Investigate server availability if responses are failing.",
      passed: response.ok,
      details: `${response.status} ${response.statusText}`,
      location: parsedUrl.origin,
    });
  } catch (error) {
    tests.push({
      name: "Domain Accessibility",
      category: "Availability",
      description: "Unable to reach the target URL",
      severity: "high",
      remediation: "Check the URL, DNS, and server availability.",
      passed: false,
      details: error instanceof Error ? error.message : String(error),
      location: parsedUrl.origin,
    });
  }

  return tests;
}
