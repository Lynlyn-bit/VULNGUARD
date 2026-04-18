import dns from "node:dns";
import mongoose from "mongoose";

const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 25_000,
  /** Prefer IPv4 when resolving Atlas hosts (often fixes Windows + SRV). */
  family: 4,
  dbName: process.env.MONGODB_DB_NAME ?? "vulnguard",
} as const;

/** Public resolvers — used only when default resolver fails SRV for mongodb+srv:// */
const FALLBACK_DNS_SERVERS = ["8.8.8.8", "1.1.1.1"];

function applyMongoDnsServersFromEnv() {
  const raw = process.env.MONGODB_DNS_SERVERS?.trim();
  if (!raw) return;
  dns.setServers(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

function isMongoSrvDnsFailure(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as NodeJS.ErrnoException & { syscall?: string };
  if (e.syscall === "querySrv") return true;
  const msg = String((err as Error).message ?? "");
  return msg.includes("querySrv") || msg.includes("_mongodb._tcp");
}

export async function connectMongo(uri: string) {
  mongoose.set("strictQuery", true);
  applyMongoDnsServersFromEnv();

  try {
    await mongoose.connect(uri, CONNECT_OPTIONS);
    return;
  } catch (first) {
    const allowFallback =
      uri.startsWith("mongodb+srv://") &&
      isMongoSrvDnsFailure(first) &&
      process.env.MONGODB_DNS_FALLBACK !== "0";
    if (!allowFallback) {
      throw first;
    }

    console.warn(
      "[mongo] SRV DNS lookup failed with the current resolver; retrying with %s (set MONGODB_DNS_FALLBACK=0 to skip).",
      FALLBACK_DNS_SERVERS.join(", "),
    );

    await mongoose.disconnect().catch(() => {});
    const previous = dns.getServers();
    try {
      dns.setServers(FALLBACK_DNS_SERVERS);
      await mongoose.connect(uri, CONNECT_OPTIONS);
    } catch (second) {
      const hint =
        "SRV DNS for mongodb+srv:// still failed. Options: set MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 in .env; " +
        "fix VPN/firewall/DNS; or use Atlas \"standard connection string\" (mongodb:// host list, no +srv).";
      const err = second instanceof Error ? second : new Error(String(second));
      (err as Error & { mongoDnsHint?: string }).mongoDnsHint = hint;
      throw err;
    } finally {
      dns.setServers(previous);
    }
  }
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}
