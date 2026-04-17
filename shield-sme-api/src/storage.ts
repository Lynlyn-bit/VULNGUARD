import fs from "node:fs";
import path from "node:path";
import { DatabaseState, ScanVulnerability, UserSettings } from "./types";

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

function defaultSettings(): UserSettings {
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

function defaultState(): DatabaseState {
  return {
    users: [],
    settings: {},
    scans: [],
    schedules: [],
    resetTokens: [],
    checkoutSessions: [],
  };
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultState(), null, 2));
  }
}

export function loadDb(): DatabaseState {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    return {
      users: parsed.users ?? [],
      settings: parsed.settings ?? {},
      scans: parsed.scans ?? [],
      schedules: parsed.schedules ?? [],
      resetTokens: parsed.resetTokens ?? [],
      checkoutSessions: parsed.checkoutSessions ?? [],
    };
  } catch {
    return defaultState();
  }
}

export function saveDb(db: DatabaseState) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

export function ensureUserSettings(db: DatabaseState, userId: string): UserSettings {
  if (!db.settings[userId]) {
    db.settings[userId] = defaultSettings();
  }
  return db.settings[userId];
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
