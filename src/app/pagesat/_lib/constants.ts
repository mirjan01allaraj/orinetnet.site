export const API = "/pagesat-api";

export const PACKAGES = [
  { key: "STANDARTE", price: 1300 },
  { key: "SMART", price: 1400 },
  { key: "TURBO", price: 1500 },
  { key: "ULTRA", price: 1700 },
] as const;

export const MONTH_PRESETS = [3, 6, 12] as const;

export const REASONS = [
  "Pagesë standarde",
  "Pagesë e pjesshme",
  "Zbritje / Marrëveshje",
  "Shlyerje debie",
  "Korrigjim",
  "Tjetër",
] as const;

export function promoPayMonths(m: number) {
  if (m === 6) return 5;
  if (m === 12) return 10;
  return m;
}