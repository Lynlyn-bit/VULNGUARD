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

function buildHeaderRemediation(headerName: string, recommendedValue: string) {
  return [
    `Add the ${headerName} response header with a value like "${recommendedValue}".`,
    "Set it in your web server, CDN, or application middleware so it is returned on every page.",
    "Re-scan after deployment to confirm the header is present.",
  ].join(" ");
}

function buildServerDisclosureRemediation(disclosures: string[]) {
  return [
    `Remove or minimize these identifying headers: ${disclosures.join(", ")}.`,
    "For Express, disable X-Powered-By and avoid custom server banners.",
    "For Nginx or Apache, turn off version tokens so attackers get less fingerprinting data.",
  ].join(" ");
}

function buildCorsRemediation(actualValue: string | null) {
  if (actualValue === "*") {
    return [
      "Replace Access-Control-Allow-Origin: * with an allowlist of trusted frontend origins.",
      "If credentials or cookies are used, do not combine them with a wildcard origin.",
      "Review preflight responses to ensure methods and headers are restricted to what your app needs.",
    ].join(" ");
  }

  return [
    "Keep CORS restricted to the minimum set of trusted origins your frontend requires.",
    "Review allowed methods, headers, and credential usage so they match your real application flow.",
  ].join(" ");
}

function buildAvailabilityRemediation(status: number | null) {
  if (status === null) {
    return [
      "Verify the hostname resolves correctly in DNS and that the web server is online.",
      "Check firewall, reverse proxy, and TLS termination settings to ensure inbound requests can reach the app.",
      "Confirm the target URL is the public site entry point.",
    ].join(" ");
  }

  return [
    `Investigate why the site returned HTTP ${status}.`,
    "Review the origin server, reverse proxy, and application logs for the failing request.",
    "Confirm health checks, upstream routing, and deployment status before re-running the scan.",
  ].join(" ");
}

async function testSslCertificate(url: string): Promise<SecurityTest> {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:") {
    return {
      name: "SSL/TLS Certificate",
      category: "Transport Security",
      description: "The scanned URL is using HTTP instead of HTTPS.",
      severity: "critical",
      remediation: [
        "Serve the site over HTTPS with a valid certificate from a trusted certificate authority.",
        "Redirect all HTTP traffic to HTTPS and update any hard-coded HTTP links.",
        "Enable HSTS after HTTPS is working reliably across the site.",
      ].join(" "),
      passed: false,
      location: parsedUrl.origin,
    };
  }

  try {
    const response = await headOrGet(url);
    return {
      name: "SSL/TLS Certificate",
      category: "Transport Security",
      description: response.ok
        ? "The site responded successfully over HTTPS."
        : "The site is using HTTPS but did not return a successful response.",
      severity: response.ok ? "low" : "medium",
      remediation: response.ok
        ? "Keep the TLS certificate renewed, monitor expiry dates, and disable weak legacy protocols in your edge configuration."
        : "Review TLS termination, certificate validity, and upstream HTTPS routing to make sure secure requests complete successfully.",
      passed: response.ok,
      details: `${response.status} ${response.statusText}`,
      location: parsedUrl.origin,
    };
  } catch (error) {
    return {
      name: "SSL/TLS Certificate",
      category: "Transport Security",
      description: "The site uses HTTPS, but the TLS-enabled endpoint could not be verified.",
      severity: "high",
      remediation: [
        "Confirm the certificate chain is valid and trusted.",
        "Check whether the host is reachable over HTTPS from the public internet.",
        "Inspect CDN, load balancer, or reverse proxy TLS configuration for handshake failures.",
      ].join(" "),
      passed: false,
      details: error instanceof Error ? error.message : String(error),
      location: parsedUrl.origin,
    };
  }
}

async function testHttpRedirect(url: string): Promise<SecurityTest> {
  const parsedUrl = new URL(url);
  const httpUrl = parsedUrl.protocol === "https:" ? url.replace(/^https:/, "http:") : url;

  try {
    const response = await fetch(httpUrl, { method: "HEAD", redirect: "manual" });
    const location = response.headers.get("location");
    const redirectsToHttps =
      [301, 302, 307, 308].includes(response.status) &&
      typeof location === "string" &&
      location.startsWith("https://");

    return {
      name: "HTTP to HTTPS Redirect",
      category: "Transport Security",
      description: redirectsToHttps
        ? "HTTP requests are redirected to HTTPS."
        : "HTTP requests are not consistently redirected to HTTPS.",
      severity: redirectsToHttps ? "low" : "high",
      remediation: redirectsToHttps
        ? "Keep the HTTP to HTTPS redirect in place for every public route and hostname."
        : [
            "Add a permanent redirect from HTTP to HTTPS at the load balancer, CDN, or web server layer.",
            "Make sure every host and path redirects before application logic runs.",
            "Update canonical URLs and external links so users land on HTTPS directly.",
          ].join(" "),
      passed: redirectsToHttps,
      details: `Status ${response.status}${location ? ` -> ${location}` : ""}`,
      location: parsedUrl.origin,
    };
  } catch (error) {
    return {
      name: "HTTP to HTTPS Redirect",
      category: "Transport Security",
      description: "The scanner could not verify whether HTTP is redirected to HTTPS.",
      severity: "medium",
      remediation: [
        "Test the plain HTTP version of the site directly.",
        "If it is intended to be public, configure an unconditional redirect to HTTPS.",
      ].join(" "),
      passed: false,
      details: error instanceof Error ? error.message : String(error),
      location: parsedUrl.origin,
    };
  }
}

async function testSecurityHeaders(url: string): Promise<SecurityTest[]> {
  const parsedUrl = new URL(url);
  const response = await headOrGet(url);
  const headers = response.headers;

  const headerChecks = [
    ["x-content-type-options", "nosniff"],
    ["x-frame-options", "DENY"],
    ["content-security-policy", "default-src 'self'"],
    ["strict-transport-security", "max-age=31536000; includeSubDomains"],
  ] as const;

  return headerChecks.map(([name, recommendation]) => {
    const value = headers.get(name);
    return {
      name: name,
      category: "HTTP Headers",
      description: value ? `${name} is present.` : `${name} is missing from the response.`,
      severity: value ? "low" : "high",
      remediation: value
        ? `Keep ${name} configured and review its value during future deployment changes. Current value: ${value}.`
        : buildHeaderRemediation(name, recommendation),
      passed: Boolean(value),
      details: value ?? "Not set",
      location: parsedUrl.origin,
    };
  });
}

async function testServerDisclosure(url: string): Promise<SecurityTest> {
  const parsedUrl = new URL(url);
  const response = await headOrGet(url);
  const exposures = [
    response.headers.get("server") ? `server=${response.headers.get("server")}` : null,
    response.headers.get("x-powered-by") ? `x-powered-by=${response.headers.get("x-powered-by")}` : null,
    response.headers.get("x-aspnet-version") ? `x-aspnet-version=${response.headers.get("x-aspnet-version")}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    name: "Server Information Disclosure",
    category: "Information Disclosure",
    description: exposures.length > 0
      ? "The server exposes identifying technology headers."
      : "No common identifying server headers were exposed.",
    severity: exposures.length > 0 ? "low" : "low",
    remediation: exposures.length > 0
      ? buildServerDisclosureRemediation(exposures)
      : "Keep version and framework headers disabled where possible so less infrastructure information is exposed.",
    passed: exposures.length === 0,
    details: exposures.length > 0 ? exposures.join(", ") : "Hidden",
    location: parsedUrl.origin,
  };
}

async function testCorsConfiguration(url: string): Promise<SecurityTest> {
  const parsedUrl = new URL(url);

  try {
    const response = await fetch(url, {
      method: "OPTIONS",
      headers: { Origin: "https://scanner-origin.example" },
      redirect: "follow",
    });
    const actualValue = response.headers.get("access-control-allow-origin");
    const permissive = actualValue === "*";

    return {
      name: "CORS Configuration",
      category: "Cross-Origin Security",
      description: permissive
        ? "The site allows requests from any origin with Access-Control-Allow-Origin: *."
        : actualValue
          ? `The site restricts CORS to ${actualValue}.`
          : "No CORS allow-origin header was returned in the preflight response.",
      severity: permissive ? "medium" : "low",
      remediation: buildCorsRemediation(actualValue),
      passed: !permissive,
      details: actualValue ?? "Not set",
      location: parsedUrl.origin,
    };
  } catch (error) {
    return {
      name: "CORS Configuration",
      category: "Cross-Origin Security",
      description: "The scanner could not complete a CORS preflight request.",
      severity: "low",
      remediation: [
        "Review your CORS policy manually in the server or gateway configuration.",
        "If the app serves a browser frontend, allow only the exact origins it needs.",
      ].join(" "),
      passed: true,
      details: error instanceof Error ? error.message : String(error),
      location: parsedUrl.origin,
    };
  }
}

async function testDomainAccessibility(url: string): Promise<SecurityTest> {
  const parsedUrl = new URL(url);

  try {
    const response = await headOrGet(url);
    return {
      name: "Domain Accessibility",
      category: "Availability",
      description: response.ok
        ? `The site responded successfully with HTTP ${response.status}.`
        : `The site responded, but returned HTTP ${response.status}.`,
      severity: response.ok ? "low" : "medium",
      remediation: response.ok
        ? "Maintain uptime monitoring and alerting so future availability regressions are caught quickly."
        : buildAvailabilityRemediation(response.status),
      passed: response.ok,
      details: `${response.status} ${response.statusText}`,
      location: parsedUrl.origin,
    };
  } catch (error) {
    return {
      name: "Domain Accessibility",
      category: "Availability",
      description: "The scanner could not reach the target URL.",
      severity: "high",
      remediation: buildAvailabilityRemediation(null),
      passed: false,
      details: error instanceof Error ? error.message : String(error),
      location: parsedUrl.origin,
    };
  }
}

export async function runSecurityTests(url: string): Promise<SecurityTest[]> {
  const parsedUrl = new URL(url);

  try {
    const [sslTest, redirectTest, headerTests, disclosureTest, corsTest, accessibilityTest] =
      await Promise.all([
        testSslCertificate(url),
        testHttpRedirect(url),
        testSecurityHeaders(url),
        testServerDisclosure(url),
        testCorsConfiguration(url),
        testDomainAccessibility(url),
      ]);

    return [sslTest, redirectTest, ...headerTests, disclosureTest, corsTest, accessibilityTest];
  } catch (error) {
    return [
      {
        name: "URL Validation",
        category: "Input Validation",
        description: "The supplied URL could not be scanned.",
        severity: "critical",
        remediation: "Enter a valid public URL such as https://example.com and run the scan again.",
        passed: false,
        details: error instanceof Error ? error.message : String(error),
        location: parsedUrl.origin,
      },
    ];
  }
}
