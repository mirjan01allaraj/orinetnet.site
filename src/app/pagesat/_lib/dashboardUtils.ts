export type PeriodPreset =
  | "today"
  | "yesterday"
  | "last_week"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "last_year"
  | "custom";

export type ReceiptRow = {
  id: number | string;
  customer_id?: number | string;
  receipt_no?: string;
  amount_paid?: number | string;
  customer_name?: string;
  customer_phone?: string | null;
  package_code?: string;
  months_selected?: number;
  created_at?: string;
  payment_date?: string;
};

export function isoToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseISO(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function fmtISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDateDMY(s?: string | null): string {
  if (!s) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  const dt = new Date(String(s));
  if (!Number.isNaN(dt.getTime())) {
    return `${String(dt.getDate()).padStart(2, "0")}/${String(
      dt.getMonth() + 1
    ).padStart(2, "0")}/${dt.getFullYear()}`;
  }

  return String(s);
}

export function formatDateTime(s?: string | null): string {
  if (!s) return "—";
  const dt = new Date(String(s));
  if (Number.isNaN(dt.getTime())) return formatDateDMY(s);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(
    dt.getMonth() + 1
  ).padStart(2, "0")}/${dt.getFullYear()} ${String(dt.getHours()).padStart(
    2,
    "0"
  )}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

export function addMonthsISO(baseISO: string, months: number): string {
  const b = parseISO(baseISO);
  if (!b) return baseISO;
  const dt = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  dt.setMonth(dt.getMonth() + months);
  return fmtISO(dt);
}

export function diffDaysISO(aISO: string, bISO: string): number {
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  if (!a || !b) return 0;
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function formatDebt(days: number): string {
  if (days <= 0) return "0 ditë";
  if (days >= 30) {
    const m = Math.floor(days / 30);
    const rem = days % 30;
    if (rem === 0) return `${m} muaj`;
    return `${m} muaj ${rem} ditë`;
  }
  if (days >= 7) {
    const w = Math.floor(days / 7);
    const rem = days % 7;
    if (rem === 0) return `${w} javë`;
    return `${w} javë ${rem} ditë`;
  }
  return `${days} ditë`;
}

export function getPresetLabel(preset: PeriodPreset): string {
  switch (preset) {
    case "today":
      return "Sot";
    case "yesterday":
      return "Dje";
    case "last_week":
      return "1 javë";
    case "last_month":
      return "1 muaj";
    case "last_3_months":
      return "3 muaj";
    case "last_6_months":
      return "6 muaj";
    case "last_year":
      return "1 vit";
    case "custom":
      return "Periudhë";
    default:
      return "Sot";
  }
}

export function getPresetRange(
  preset: PeriodPreset
): { from: string; to: string } {
  const now = new Date();

  if (preset === "today") {
    const d = fmtISO(now);
    return { from: d, to: d };
  }

  if (preset === "yesterday") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const y = fmtISO(d);
    return { from: y, to: y };
  }

  if (preset === "last_week") {
    const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = current.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const currentWeekMonday = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + mondayOffset
    );
    const lastWeekMonday = new Date(
      currentWeekMonday.getFullYear(),
      currentWeekMonday.getMonth(),
      currentWeekMonday.getDate() - 7
    );
    const lastWeekSunday = new Date(
      currentWeekMonday.getFullYear(),
      currentWeekMonday.getMonth(),
      currentWeekMonday.getDate() - 1
    );
    return { from: fmtISO(lastWeekMonday), to: fmtISO(lastWeekSunday) };
  }

  if (preset === "last_month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmtISO(first), to: fmtISO(last) };
  }

  if (preset === "last_3_months") {
    const first = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmtISO(first), to: fmtISO(last) };
  }

  if (preset === "last_6_months") {
    const first = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: fmtISO(first), to: fmtISO(last) };
  }

  if (preset === "last_year") {
    const y = now.getFullYear() - 1;
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }

  const d = fmtISO(now);
  return { from: d, to: d };
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function sortReceiptsNewest(a: ReceiptRow, b: ReceiptRow) {
  const da =
    new Date(String(a.created_at || a.payment_date || "")).getTime() || 0;
  const db =
    new Date(String(b.created_at || b.payment_date || "")).getTime() || 0;
  if (db !== da) return db - da;
  return Number(b.id || 0) - Number(a.id || 0);
}