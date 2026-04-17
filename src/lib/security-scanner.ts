/**
 * Custom Security Testing Module
 * Performs real security checks on websites
 * Safe, non-destructive testing
 */

export interface SecurityTest {
  name: string;
  category: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  remediation: string;
  codeFix?: string;
  passed: boolean;
  details?: string;
  location?: string;
}

interface ScanConfig {
  timeout?: number;
  followRedirects?: boolean;
}

/**
 * Test 1: SSL/TLS Certificate Check
 */
async function testSSLCertificate(url: string): Promise<SecurityTest> {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.protocol !== "https:") {
      return {
        name: "SSL/TLS Certificate",
        category: "Transport Security",
        description: "Website does not use HTTPS/SSL encryption",
        severity: "critical",
        remediation: "Obtain an SSL certificate and enable HTTPS on your server",
        passed: false,
        details: "HTTP protocol detected instead of HTTPS",
        location: urlObj.origin,
      };
    }

    // Try to fetch the URL to check certificate validity
    const response = await fetch(url, { 
      method: "HEAD",
      credentials: "omit",
      timeout: 5000,
    }).catch(() => null);

    if (response && response.ok) {
      return {
        name: "SSL/TLS Certificate",
        category: "Transport Security",
        description: "Website uses valid SSL/TLS certificate",
        severity: "low",
        remediation: "Keep SSL certificate updated and renew before expiration",
        passed: true,
        location: urlObj.origin,
      };
    }

    throw new Error("Could not verify certificate");
  } catch (error) {
    return {
      name: "SSL/TLS Certificate",
      category: "Transport Security",
      description: "Could not verify SSL/TLS certificate",
      severity: "high",
      remediation: "Install a valid SSL certificate from a trusted CA",
      passed: false,
      details: String(error),
    };
  }
}

/**
 * Test 2: Security Headers Check
 */
async function testSecurityHeaders(url: string): Promise<SecurityTest[]> {
  const tests: SecurityTest[] = [];
  
  try {
    const response = await fetch(url, {
      method: "HEAD",
      credentials: "omit",
      timeout: 5000,
    }).catch(async () => {
      // Fallback to GET if HEAD fails
      return fetch(url, {
        method: "GET",
        credentials: "omit",
        timeout: 5000,
      });
    });

    if (!response) {
      return [{
        name: "Security Headers",
        category: "HTTP Headers",
        description: "Unable to retrieve security headers",
        severity: "medium",
        remediation: "Ensure server is accessible and responds to HTTP requests",
        passed: false,
      }];
    }

    const headers = response.headers;
    const securityHeaders = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=31536000",
      "Content-Security-Policy": "default-src 'self'",
    };

    for (const [header, recommended] of Object.entries(securityHeaders)) {
      const value = headers.get(header);
      const passed = !!value;

      tests.push({
        name: header,
        category: "HTTP Headers",
        description: passed ? `${header} header is present` : `${header} header is missing`,
        severity: passed ? "low" : "high",
        remediation: `Add header: ${header}: ${recommended}`,
        passed,
        details: value || "Not set",
        location: new URL(url).origin,
      });
    }
  } catch (error) {
    tests.push({
      name: "Security Headers",
      category: "HTTP Headers",
      description: "Could not check security headers",
      severity: "medium",
      remediation: "Ensure server is accessible",
      passed: false,
      details: String(error),
    });
  }

  return tests;
}

/**
 * Test 3: HTTP to HTTPS Redirect
 */
async function testHTTPRedirect(url: string): Promise<SecurityTest> {
  try {
    const httpUrl = url.replace("https://", "http://");
    const response = await fetch(httpUrl, {
      method: "HEAD",
      redirect: "manual",
      timeout: 5000,
    }).catch(() => null);

    if (response && (response.status === 301 || response.status === 302 || response.status === 307)) {
      const location = response.headers.get("location");
      if (location && location.includes("https")) {
        return {
          name: "HTTP to HTTPS Redirect",
          category: "Transport Security",
          description: "HTTP traffic is automatically redirected to HTTPS",
          severity: "low",
          remediation: "Ensure all HTTP requests redirect to HTTPS",
          passed: true,
          location: httpUrl,
        };
      }
    }

    return {
      name: "HTTP to HTTPS Redirect",
      category: "Transport Security",
      description: "HTTP traffic is NOT redirected to HTTPS",
      severity: "high",
      remediation: "Configure server to redirect all HTTP traffic to HTTPS",
      passed: false,
      location: httpUrl,
    };
  } catch (error) {
    return {
      name: "HTTP to HTTPS Redirect",
      category: "Transport Security",
      description: "Could not test HTTP redirect",
      severity: "medium",
      remediation: "Manually test HTTP to HTTPS redirect",
      passed: false,
      details: String(error),
    };
  }
}

/**
 * Test 4: Server Information Disclosure
 */
async function testServerDisclosure(url: string): Promise<SecurityTest> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      credentials: "omit",
      timeout: 5000,
    }).catch(() => null);

    if (!response) {
      return {
        name: "Server Information Disclosure",
        category: "Information Disclosure",
        description: "Could not retrieve server headers",
        severity: "low",
        remediation: "Monitor server responses",
        passed: true,
      };
    }

    const server = response.headers.get("server");
    const xPoweredBy = response.headers.get("x-powered-by");
    const xAspNetVersion = response.headers.get("x-aspnet-version");

    const disclosures = [server, xPoweredBy, xAspNetVersion].filter(Boolean);

    if (disclosures.length > 0) {
      return {
        name: "Server Information Disclosure",
        category: "Information Disclosure",
        description: "Server exposes version information in headers",
        severity: "low",
        remediation: "Remove or obfuscate server version headers in configuration",
        passed: false,
        details: `Exposed: ${disclosures.join(", ")}`,
        location: new URL(url).origin,
      };
    }

    return {
      name: "Server Information Disclosure",
      category: "Information Disclosure",
      description: "Server does not expose version information",
      severity: "low",
      remediation: "Continue hiding server version information",
      passed: true,
      location: new URL(url).origin,
    };
  } catch (error) {
    return {
      name: "Server Information Disclosure",
      category: "Information Disclosure",
      description: "Could not check server disclosure",
      severity: "low",
      remediation: "Manually verify server headers",
      passed: true,
    };
  }
}

/**
 * Test 5: CORS Configuration
 */
async function testCORSConfiguration(url: string): Promise<SecurityTest> {
  try {
    const response = await fetch(url, {
      method: "OPTIONS",
      headers: {
        "Origin": "https://attacker.com",
      },
      timeout: 5000,
    }).catch(() => null);

    if (!response) {
      return {
        name: "CORS Configuration",
        category: "Cross-Origin Security",
        description: "Server does not respond to CORS preflight requests",
        severity: "low",
        remediation: "Configure CORS appropriately for your use case",
        passed: true,
      };
    }

    const corsHeader = response.headers.get("access-control-allow-origin");

    if (corsHeader === "*") {
      return {
        name: "CORS Configuration",
        category: "Cross-Origin Security",
        description: "CORS is permissive - allows requests from any origin",
        severity: "medium",
        remediation: "Restrict CORS to specific trusted domains instead of '*'",
        passed: false,
        details: `Header: Access-Control-Allow-Origin: *`,
        location: new URL(url).origin,
      };
    }

    if (corsHeader) {
      return {
        name: "CORS Configuration",
        category: "Cross-Origin Security",
        description: "CORS is configured with specific allowed origins",
        severity: "low",
        remediation: "Continue to restrict CORS to trusted domains only",
        passed: true,
        details: `Header: Access-Control-Allow-Origin: ${corsHeader}`,
        location: new URL(url).origin,
      };
    }

    return {
      name: "CORS Configuration",
      category: "Cross-Origin Security",
      description: "CORS headers not set (default-deny)",
      severity: "low",
      remediation: "Configure CORS only if cross-origin requests are needed",
      passed: true,
      location: new URL(url).origin,
    };
  } catch (error) {
    return {
      name: "CORS Configuration",
      category: "Cross-Origin Security",
      description: "Could not check CORS configuration",
      severity: "low",
      remediation: "Manually test CORS configuration",
      passed: true,
    };
  }
}

/**
 * Test 6: Domain Accessibility
 */
async function testDomainAccessibility(url: string): Promise<SecurityTest> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      timeout: 5000,
    }).catch(() => null);

    if (response && response.ok) {
      return {
        name: "Domain Accessibility",
        category: "Availability",
        description: "Website is accessible and responding",
        severity: "low",
        remediation: "Maintain server uptime and monitoring",
        passed: true,
        location: url,
      };
    }

    return {
      name: "Domain Accessibility",
      category: "Availability",
      description: "Website may not be accessible or responds with error",
      severity: "medium",
      remediation: "Check server status and availability",
      passed: false,
      details: `Status: ${response?.status || "No response"}`,
      location: url,
    };
  } catch (error) {
    return {
      name: "Domain Accessibility",
      category: "Availability",
      description: "Domain is not accessible",
      severity: "high",
      remediation: "Ensure domain DNS is configured and server is online",
      passed: false,
      details: String(error),
      location: url,
    };
  }
}

/**
 * Main scan function - runs all security tests
 */
export async function runSecurityTests(
  url: string,
  config?: ScanConfig
): Promise<SecurityTest[]> {
  const tests: SecurityTest[] = [];

  try {
    // Validate URL
    new URL(url);

    // Run all tests in parallel
    const [
      sslTest,
      headerTests,
      redirectTest,
      disclosureTest,
      corsTest,
      accessibilityTest,
    ] = await Promise.allSettled([
      testSSLCertificate(url),
      testSecurityHeaders(url),
      testHTTPRedirect(url),
      testServerDisclosure(url),
      testCORSConfiguration(url),
      testDomainAccessibility(url),
    ]);

    // Collect results
    if (sslTest.status === "fulfilled") tests.push(sslTest.value);
    if (headerTests.status === "fulfilled") tests.push(...headerTests.value);
    if (redirectTest.status === "fulfilled") tests.push(redirectTest.value);
    if (disclosureTest.status === "fulfilled") tests.push(disclosureTest.value);
    if (corsTest.status === "fulfilled") tests.push(corsTest.value);
    if (accessibilityTest.status === "fulfilled") tests.push(accessibilityTest.value);
  } catch (error) {
    tests.push({
      name: "URL Validation",
      category: "Input Validation",
      description: "Invalid URL format",
      severity: "critical",
      remediation: "Enter a valid URL (e.g., https://example.com)",
      passed: false,
      details: String(error),
    });
  }

  return tests;
}

/**
 * Get summary statistics
 */
export function getScanSummary(tests: SecurityTest[]) {
  return {
    total: tests.length,
    passed: tests.filter((t) => t.passed).length,
    failed: tests.filter((t) => !t.passed).length,
    critical: tests.filter((t) => t.severity === "critical" && !t.passed).length,
    high: tests.filter((t) => t.severity === "high" && !t.passed).length,
    medium: tests.filter((t) => t.severity === "medium" && !t.passed).length,
    low: tests.filter((t) => t.severity === "low" && !t.passed).length,
  };
}
