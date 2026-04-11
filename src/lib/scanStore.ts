import { ScanResult } from "./scanner";

const STORAGE_KEY = "vulnguard_scans";

export function getStoredScans(): ScanResult[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function storeScan(result: ScanResult): void {
  const scans = getStoredScans();
  scans.unshift(result);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
}

export function getScanById(id: string): ScanResult | undefined {
  return getStoredScans().find((s) => s.id === id);
}
