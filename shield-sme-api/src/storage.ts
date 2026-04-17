import type { ScanVulnerability, UserSettings } from "./types";

export function buildDefaultSettings(): UserSettings {
  return {
    theme: "light",
    language: "en",
    defaultScanInterval: 7,
    notifications: {
      email: true,
      scanComplete: true,
      vulnerabilityFound: true,
    },
    automatedScans: {
      enabled: false,
      dayOfWeek: "Monday",
      timeOfDay: "09:00",
      targetUrl: "",
    },
    badge: {
      enabled: false,
      color: "primary",
      style: "shield",
    },
  };
}

export function summarizeVulnerabilities(vulnerabilities: ScanVulnerability[]) {
  const failed = vulnerabilities.filter((item) => item.passed !== true);
  return {
    total: failed.length,
    critical: failed.filter((item) => item.severity === "critical").length,
    high: failed.filter((item) => item.severity === "high").length,
    medium: failed.filter((item) => item.severity === "medium").length,
    low: failed.filter((item) => item.severity === "low").length,
  };
}
