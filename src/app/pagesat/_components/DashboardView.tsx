"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MONTH_PRESETS, PACKAGES, REASONS } from "../_lib/constants";
import type { Customer, User } from "../_lib/types";

type Props = {
  API: string;
  user: User;

  q: string;
  setQ: (v: string) => void;
  customers: Customer[];
  selected: Customer | null;
  setSelected: (c: Customer | null) => void;
  searchBusy: boolean;

  pkg: (typeof PACKAGES)[number]["key"];
  setPkg: (v: (typeof PACKAGES)[number]["key"]) => void;

  monthsSelected: number;
  monthsInput: string;
  setMonthsFromPreset: (m: number) => void;
  onMonthsInputChange: (v: string) => void;

  expectedAmount: number;
  paidAmount: number;
  setPaidAmount: (n: number) => void;

  reason: string;
  setReason: (v: string) => void;
  note: string;
  setNote: (v: string) => void;

  saving: boolean;
  toast: string | null;
  confirmPayment: () => void;

  today: { date: string; total: number; receipts: any[] } | null;
  todayBusy: boolean;
  refreshToday: () => void;
  lastCreatedPayment: LastCreatedPayment | null;
  openLastPaymentWhatsApp: () => void;
};

const PACKAGE_LOWER = ["standarte", "smart", "turbo", "ultra"] as const;
type PackageLower = (typeof PACKAGE_LOWER)[number];


type LastCreatedPayment = {
  paymentId: number;
  receiptNo: string;
  publicReceiptUrl: string;
  publicPdfUrl: string;
  customerPhone: string | null;
  customerName: string;
};

type ReceiptRow = {
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

type ClientGroup = {
  key: string;
  customer_id?: number | string;
  customer_name: string;
  customer_phone: string | null;
  receipt_count: number;
  total_paid: number;
  latest_receipt_date: string | null;
  receipts: ReceiptRow[];
};

type ViewMode = "receipts" | "clients";

type PeriodPreset =
  | "today"
  | "yesterday"
  | "last_week"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "last_year"
  | "custom";

function toUpperKey(p: string): (typeof PACKAGES)[number]["key"] {
  const u = String(p || "").toUpperCase();
  if (u === "SMART" || u === "TURBO" || u === "ULTRA" || u === "STANDARTE") {
    return u as (typeof PACKAGES)[number]["key"];
  }
  return "STANDARTE";
}

function isoToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseISO(s?: string | null): Date | null {
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

function fmtISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateDMY(s?: string | null): string {
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

function formatDateTime(s?: string | null): string {
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

function addMonthsISO(baseISO: string, months: number): string {
  const b = parseISO(baseISO);
  if (!b) return baseISO;
  const dt = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  dt.setMonth(dt.getMonth() + months);
  return fmtISO(dt);
}

function diffDaysISO(aISO: string, bISO: string): number {
  const a = parseISO(aISO);
  const b = parseISO(bISO);
  if (!a || !b) return 0;
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatDebt(days: number): string {
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

function getStatusMeta(c: Customer | null): {
  label: string;
  chipClass: string;
} {
  if (!c) {
    return {
      label: "Pa zgjedhur",
      chipClass: "border-white/10 bg-white/5 text-white/70",
    };
  }

  const p = ((c as any).payment_status || "manual") as string;
  const paidUntil = (c as any).paid_until as string | null | undefined;
  const todayISO = isoToday();

  if (p === "free") {
    return {
      label: "FREE",
      chipClass: "border-sky-400/20 bg-sky-500/15 text-sky-300",
    };
  }

  if (p === "never_paid") {
    return {
      label: "S’ka paguar",
      chipClass: "border-rose-400/20 bg-rose-500/15 text-rose-300",
    };
  }

  if (paidUntil) {
    const left = diffDaysISO(paidUntil, todayISO);

    if (left < 0) {
      return {
        label: "I mbaruar",
        chipClass: "border-red-400/20 bg-red-500/15 text-red-300",
      };
    }

    if (left <= 7) {
      return {
        label: "Afër mbarimit",
        chipClass: "border-amber-400/20 bg-amber-500/15 text-amber-300",
      };
    }

    return {
      label: "Aktiv",
      chipClass: "border-emerald-400/20 bg-emerald-500/15 text-emerald-300",
    };
  }

  return {
    label: "Manual",
    chipClass: "border-white/10 bg-white/5 text-white/70",
  };
}

function getPresetLabel(preset: PeriodPreset): string {
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

function getPresetRange(preset: PeriodPreset): { from: string; to: string } {
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

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(
  text: string | number | null | undefined,
  query: string
) {
  const value = String(text ?? "");
  const q = query.trim();

  if (!q) return value;

  const safe = escapeRegExp(q);
  const regex = new RegExp(`(${safe})`, "ig");
  const parts = value.split(regex);

  return parts.map((part, i) =>
    new RegExp(`^${safe}$`, "i").test(part) ? (
      <mark
        key={`${part}-${i}`}
        className="rounded bg-amber-300/25 px-1 text-amber-200"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${i}`}>{part}</span>
    )
  );
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadFilteredReceiptsCsv(rows: ReceiptRow[]) {
  const headers = [
    "Receipt No",
    "Klienti",
    "Telefoni",
    "Paketa",
    "Muaj",
    "Shuma",
    "Data",
  ];

  const lines = rows.map((r) => [
    r.receipt_no || `Fatura #${r.id}`,
    r.customer_name || "",
    r.customer_phone || "",
    r.package_code || "",
    r.months_selected || 0,
    r.amount_paid || 0,
    r.created_at || r.payment_date || "",
  ]);

  const csv = [headers, ...lines]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "receipts_filtered.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadFilteredClientsCsv(rows: ClientGroup[]) {
  const headers = [
    "ID",
    "Klienti",
    "Telefoni",
    "Numri i faturave",
    "Totali i paguar",
    "Fatura e fundit",
  ];

  const lines = rows.map((r) => [
    r.customer_id || "",
    r.customer_name || "",
    r.customer_phone || "",
    r.receipt_count || 0,
    r.total_paid || 0,
    r.latest_receipt_date || "",
  ]);

  const csv = [headers, ...lines]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "clients_with_receipts_filtered.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function sortReceiptsNewest(a: ReceiptRow, b: ReceiptRow) {
  const da =
    new Date(String(a.created_at || a.payment_date || "")).getTime() || 0;
  const db =
    new Date(String(b.created_at || b.payment_date || "")).getTime() || 0;
  if (db !== da) return db - da;
  return Number(b.id || 0) - Number(a.id || 0);
}

export default function DashboardView(props: Props) {
  const {
    API,
    q,
    setQ,
    customers,
    selected,
    setSelected,
    searchBusy,
    pkg,
    setPkg,
    monthsSelected,
    monthsInput,
    setMonthsFromPreset,
    onMonthsInputChange,
    expectedAmount,
    paidAmount,
    setPaidAmount,
    reason,
    setReason,
    note,
    setNote,
    saving,
    toast,
    confirmPayment,
    today,
    todayBusy,
    refreshToday,
    lastCreatedPayment,
    openLastPaymentWhatsApp,
  } = props;

  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPkg, setEditPkg] = useState<PackageLower>("standarte");

  const [updBusy, setUpdBusy] = useState(false);
  const [updMsg, setUpdMsg] = useState<string | null>(null);
  const [clientMenuOpen, setClientMenuOpen] = useState(false);

  const [flashMissing, setFlashMissing] = useState(false);

  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("today");
  const firstRange = getPresetRange("today");
  const [dateFrom, setDateFrom] = useState(firstRange.from);
  const [dateTo, setDateTo] = useState(firstRange.to);
  const [periodBusy, setPeriodBusy] = useState(false);
  const [periodMsg, setPeriodMsg] = useState<string | null>(null);
  const [periodData, setPeriodData] = useState<{
    label: string;
    from: string | null;
    to: string | null;
    total: number;
    receipts: ReceiptRow[];
  }>({
    label: "Sot",
    from: today?.date || firstRange.from,
    to: today?.date || firstRange.to,
    total: Number(today?.total || 0),
    receipts: (today?.receipts || []) as ReceiptRow[],
  });

  const [receiptsSearch, setReceiptsSearch] = useState("");
  const [globalSearchBusy, setGlobalSearchBusy] = useState(false);
  const [globalSearchMsg, setGlobalSearchMsg] = useState<string | null>(null);
  const [globalSearchReceipts, setGlobalSearchReceipts] = useState<ReceiptRow[]>(
    []
  );

  const [viewMode, setViewMode] = useState<ViewMode>("receipts");
  const [expandedClientKeys, setExpandedClientKeys] = useState<string[]>([]);

  const [allClientsBusy, setAllClientsBusy] = useState(false);
  const [allClientsMsg, setAllClientsMsg] = useState<string | null>(null);
  const [allClientsReceipts, setAllClientsReceipts] = useState<ReceiptRow[]>([]);
  const [clientNoPaymentsMsg, setClientNoPaymentsMsg] = useState<string | null>(
    null
  );

  const periodWrapRef = useRef<HTMLDivElement | null>(null);

  const hasChanges =
    !!selected &&
    (editFirst.trim() !== (selected.first_name ?? "") ||
      editLast.trim() !== (selected.last_name ?? "") ||
      editPhone.trim() !== (selected.phone ?? "") ||
      editLocation.trim() !==
        (((selected as any).location as string | null) ?? "") ||
      editPkg !== ((selected as any).current_package ?? "standarte"));

  useEffect(() => {
    setUpdMsg(null);
    setClientMenuOpen(false);

    if (!selected) return;

    setEditFirst(selected.first_name ?? "");
    setEditLast(selected.last_name ?? "");
    setEditPhone(selected.phone ?? "");
    setEditLocation(((selected as any).location as string | null) ?? "");

    const cp = (selected as any).current_package as string | undefined;
    if (cp && (PACKAGE_LOWER as readonly string[]).includes(cp)) {
      setEditPkg(cp as PackageLower);
    } else {
      setEditPkg("standarte");
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setFlashMissing(false);
      return;
    }

    const missingPhone = !String(selected.phone || "").trim();
    const missingLocation = !String((selected as any).location || "").trim();

    if (missingPhone || missingLocation) {
      setFlashMissing(true);
      const t = setTimeout(() => setFlashMissing(false), 3000);
      return () => clearTimeout(t);
    }

    setFlashMissing(false);
  }, [selected]);

  useEffect(() => {
    if (periodPreset === "custom") return;
    const r = getPresetRange(periodPreset);
    setDateFrom(r.from);
    setDateTo(r.to);
  }, [periodPreset]);

  useEffect(() => {
    if (periodPreset !== "today") return;
    setPeriodData({
      label: "Sot",
      from: today?.date || firstRange.from,
      to: today?.date || firstRange.to,
      total: Number(today?.total || 0),
      receipts: (today?.receipts || []) as ReceiptRow[],
    });
  }, [today, periodPreset, firstRange.from, firstRange.to]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-client-menu="wrap"]')) return;
      if (periodWrapRef.current?.contains(target)) return;
      setClientMenuOpen(false);
      setPeriodOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setClientMenuOpen(false);
        setPeriodOpen(false);
      }
    }

    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    setReceiptsSearch("");
    setExpandedClientKeys([]);
    setViewMode("receipts");
    setAllClientsMsg(null);
    setClientNoPaymentsMsg(null);
  }, [
    periodPreset,
    receiptsDataKey(periodPreset, today?.date, periodData.from, periodData.to),
  ]);

  useEffect(() => {
    if (viewMode === "clients") return;

    const qv = receiptsSearch.trim();

    if (qv.length < 2) {
      setGlobalSearchReceipts([]);
      setGlobalSearchMsg(null);
      setGlobalSearchBusy(false);
      return;
    }

    const t = setTimeout(async () => {
      setGlobalSearchBusy(true);
      setGlobalSearchMsg(null);

      try {
        const params = new URLSearchParams();
        params.set("search", qv);
        params.set("all", "1");

        const res = await fetch(`${API}/receipts_range.php?${params.toString()}`, {
          credentials: "include",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) {
          setGlobalSearchMsg(`Gabim: ${data?.error || "SEARCH_FAILED"}`);
          setGlobalSearchReceipts([]);
          return;
        }

        const rows = Array.isArray(data.receipts) ? data.receipts : [];
        setGlobalSearchReceipts(rows);
      } catch {
        setGlobalSearchMsg("Gabim gjatë kërkimit të faturave.");
        setGlobalSearchReceipts([]);
      } finally {
        setGlobalSearchBusy(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [API, receiptsSearch, viewMode]);

  async function loadAllClientsReceipts() {
    setAllClientsBusy(true);
    setAllClientsMsg(null);

    try {
      const params = new URLSearchParams();
      params.set("all", "1");

      const res = await fetch(`${API}/receipts_range.php?${params.toString()}`, {
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setAllClientsMsg(
          `Gabim: ${data?.error || "LOAD_ALL_CLIENTS_FAILED"}`
        );
        setAllClientsReceipts([]);
        return;
      }

      const rows = Array.isArray(data.receipts) ? data.receipts : [];
      setAllClientsReceipts(rows);
    } catch {
      setAllClientsMsg("Gabim gjatë ngarkimit të klientëve me pagesa.");
      setAllClientsReceipts([]);
    } finally {
      setAllClientsBusy(false);
    }
  }

  useEffect(() => {
    if (viewMode !== "clients") return;
    loadAllClientsReceipts();
  }, [viewMode]);

  async function updateCustomer() {
    if (!selected) return;

    const first_name = editFirst.trim();
    const last_name = editLast.trim();
    const phone = editPhone.trim();
    const location = editLocation.trim();
    const current_package = editPkg;

    if (!first_name || !last_name) {
      setUpdMsg("Emri dhe mbiemri janë të detyrueshëm.");
      return;
    }

    setUpdBusy(true);
    setUpdMsg(null);

    try {
      const res = await fetch(`${API}/customers_update.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_id: selected.id,
          first_name,
          last_name,
          phone,
          location,
          current_package,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setUpdMsg(
          data?.error ? `Gabim: ${data.error}` : "Gabim gjatë përditësimit."
        );
        return;
      }

      setSelected({
        ...selected,
        first_name,
        last_name,
        phone: phone || null,
        location: location || null,
        current_package,
      } as any);

      setPkg(toUpperKey(current_package));
      setUpdMsg("U përditësua me sukses.");
    } catch {
      setUpdMsg("Gabim gjatë përditësimit.");
    } finally {
      setUpdBusy(false);
    }
  }

  async function deleteSelectedCustomer() {
    if (!selected) return;

    const full = `${selected.first_name} ${selected.last_name}`.trim();
    if (!confirm(`Ta fshij klientin: ${full}?`)) return;

    setUpdMsg(null);
    setUpdBusy(true);
    try {
      const res = await fetch(`${API}/customers_delete.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customer_id: selected.id }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        if (data?.error === "HAS_PAYMENTS") {
          setUpdMsg("Nuk mund të fshihet: klienti ka pagesa të regjistruara.");
        } else {
          setUpdMsg(`Gabim: ${data?.error || "DELETE_FAILED"}`);
        }
        return;
      }

      setUpdMsg("Klienti u fshi (u ç’aktivizua).");
      setClientMenuOpen(false);
      setSelected(null);
      setQ("");
    } catch {
      setUpdMsg("Gabim gjatë fshirjes.");
    } finally {
      setUpdBusy(false);
    }
  }

  function clearSelected() {
    setSelected(null);
    setUpdMsg(null);
    setClientMenuOpen(false);
  }

  async function loadReceiptsForRange(
    from: string | null,
    to: string | null,
    label: string
  ) {
    if (!from && !to) return;

    if (label === "Sot") {
      refreshToday();
      setPeriodData({
        label,
        from: today?.date || isoToday(),
        to: today?.date || isoToday(),
        total: Number(today?.total || 0),
        receipts: (today?.receipts || []) as ReceiptRow[],
      });
      return;
    }

    setPeriodBusy(true);
    setPeriodMsg(null);

    try {
      const params = new URLSearchParams();

      if (from && to && from === to) {
        params.set("from", from);
        params.set("to", to);
      } else {
        if (from) params.set("from", from);
        if (to) params.set("to", to);
      }

      const res = await fetch(`${API}/receipts_range.php?${params.toString()}`, {
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setPeriodMsg(`Gabim: ${data?.error || "LOAD_RECEIPTS_FAILED"}`);
        setPeriodData({ label, from, to, total: 0, receipts: [] });
        return;
      }

      const rows = Array.isArray(data.receipts)
        ? data.receipts
        : Array.isArray(data.rows)
          ? data.rows
          : [];

      const total =
        typeof data.total === "number"
          ? data.total
          : rows.reduce(
              (sum: number, r: any) => sum + Number(r?.amount_paid || 0),
              0
            );

      setPeriodData({
        label,
        from,
        to,
        total,
        receipts: rows,
      });
    } catch {
      setPeriodMsg("Gabim gjatë ngarkimit të faturave.");
      setPeriodData({ label, from, to, total: 0, receipts: [] });
    } finally {
      setPeriodBusy(false);
    }
  }

  function applyPreset(preset: PeriodPreset) {
    setPeriodPreset(preset);
    setPeriodOpen(false);

    if (preset === "custom") return;

    const range = getPresetRange(preset);
    loadReceiptsForRange(range.from, range.to, getPresetLabel(preset));
  }

  function applyCustomPeriod() {
    const f = dateFrom.trim() || null;
    const t = dateTo.trim() || null;

    if (!f && !t) {
      setPeriodMsg("Vendos të paktën një datë te From ose To.");
      return;
    }

    if (f && t) {
      const fromDt = parseISO(f);
      const toDt = parseISO(t);

      if (fromDt && toDt && fromDt.getTime() > toDt.getTime()) {
        setPeriodMsg("From nuk mund të jetë më e madhe se To.");
        return;
      }
    }

    setPeriodPreset("custom");
    setPeriodOpen(false);
    loadReceiptsForRange(f, t, "Periudhë");
  }

  function toggleClientGroup(key: string) {
    setExpandedClientKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const paymentInfo = useMemo(() => {
    if (!selected) return null;

    const todayISO = today?.date || isoToday();

    const paymentStatus =
      ((selected as any).payment_status as string | null | undefined) ||
      "manual";

    const connectionDateRaw = (selected as any).connection_date as
      | string
      | null
      | undefined;
    const lastPayRaw = (selected as any).last_payment_date as
      | string
      | null
      | undefined;
    const paidUntilRaw = (selected as any).paid_until as
      | string
      | null
      | undefined;

    const hasConnectionDate = !!(
      connectionDateRaw && parseISO(connectionDateRaw)
    );
    const hasLastPay = !!(lastPayRaw && parseISO(lastPayRaw));
    const hasPaidUntil = !!(paidUntilRaw && parseISO(paidUntilRaw));

    let lastPayLabel = "—";
    if (paymentStatus === "never_paid" || !hasLastPay) {
      lastPayLabel = "Asnjë pagesë";
    } else if (paymentStatus === "free") {
      lastPayLabel = "Free";
    } else {
      lastPayLabel = formatDateDMY(lastPayRaw);
    }

    let debtDays = 0;
    if (hasPaidUntil && paidUntilRaw) {
      const d = diffDaysISO(todayISO, paidUntilRaw);
      debtDays = d > 0 ? d : 0;
    } else if (
      (paymentStatus === "never_paid" || !hasLastPay) &&
      hasConnectionDate &&
      connectionDateRaw
    ) {
      const d = diffDaysISO(todayISO, connectionDateRaw);
      debtDays = d > 0 ? d : 0;
    }

    const hasDebt = debtDays > 0;

    let baseStart = todayISO;
    let calculationMode:
      | "debt_from_old_expiry"
      | "extend_from_current_expiry"
      | "from_connection_date_no_previous_payment" =
      "from_connection_date_no_previous_payment";

    if (hasPaidUntil && paidUntilRaw) {
      baseStart = paidUntilRaw;
      calculationMode = hasDebt
        ? "debt_from_old_expiry"
        : "extend_from_current_expiry";
    } else {
      baseStart =
        hasConnectionDate && connectionDateRaw ? connectionDateRaw : todayISO;
      calculationMode = "from_connection_date_no_previous_payment";
    }

    const nextEnd =
      monthsSelected > 0 ? addMonthsISO(baseStart, monthsSelected) : baseStart;

    let explanationTitle = "";
    let explanationText = "";

    if (calculationMode === "debt_from_old_expiry") {
      explanationTitle = "Llogaritja me vonesë";
      explanationText = `Klienti ka ${formatDebt(
        debtDays
      )} vonesë. Skadimi i ri llogaritet nga skadimi i fundit ${formatDateDMY(
        baseStart
      )} + ${monthsSelected} muaj = ${formatDateDMY(nextEnd)}.`;
    } else if (calculationMode === "extend_from_current_expiry") {
      explanationTitle = "Llogaritja për klient aktiv";
      explanationText = `Klienti është aktiv. Skadimi i ri llogaritet nga skadimi aktual ${formatDateDMY(
        baseStart
      )} + ${monthsSelected} muaj = ${formatDateDMY(nextEnd)}.`;
    } else {
      explanationTitle = "Llogaritja pa pagesë të mëparshme";
      explanationText = `Klienti nuk ka pagesë të mëparshme. Skadimi i ri llogaritet nga data e lidhjes ${formatDateDMY(
        baseStart
      )} + ${monthsSelected} muaj = ${formatDateDMY(nextEnd)}.`;
    }

    return {
      paymentStatus,
      connectionDateLabel: hasConnectionDate
        ? formatDateDMY(connectionDateRaw)
        : "—",
      lastPayLabel,
      paidUntilLabel: hasPaidUntil ? formatDateDMY(paidUntilRaw) : "—",
      hasDebt,
      debtText: hasDebt ? formatDebt(debtDays) : "Nuk ka",
      baseStartLabel: formatDateDMY(baseStart),
      nextEndLabel: formatDateDMY(nextEnd),
      monthsDuration: monthsSelected,
      explanationTitle,
      explanationText,
    };
  }, [selected, monthsSelected, today?.date]);

  const receiptsData = useMemo(() => {
    if (periodPreset === "today") {
      return {
        label: "Sot",
        from: today?.date || isoToday(),
        to: today?.date || isoToday(),
        total: Number(today?.total || 0),
        receipts: (today?.receipts || []) as ReceiptRow[],
      };
    }
    return periodData;
  }, [periodPreset, today, periodData]);

  const sourceReceipts = useMemo(() => {
    if (viewMode === "clients") {
      return allClientsReceipts;
    }

    return receiptsSearch.trim().length >= 2
      ? globalSearchReceipts
      : ((receiptsData?.receipts || []) as ReceiptRow[]);
  }, [
    viewMode,
    allClientsReceipts,
    receiptsSearch,
    globalSearchReceipts,
    receiptsData,
  ]);

  const filteredReceipts = useMemo(() => {
    const rows = [...sourceReceipts];
    const qv = receiptsSearch.trim().toLowerCase();

    const filtered = !qv
      ? rows
      : rows.filter((r) => {
          const customerId = String(r.customer_id || "").toLowerCase();
          const customerName = String(r.customer_name || "").toLowerCase();
          const customerPhone = String(r.customer_phone || "").toLowerCase();
          const receiptNo = String(r.receipt_no || "").toLowerCase();
          const packageCode = String(r.package_code || "").toLowerCase();

          if (viewMode === "clients") {
            return (
              customerId.includes(qv) ||
              customerName.includes(qv) ||
              customerPhone.includes(qv)
            );
          }

          return (
            customerName.includes(qv) ||
            customerPhone.includes(qv) ||
            receiptNo.includes(qv) ||
            packageCode.includes(qv)
          );
        });

    return filtered.sort(sortReceiptsNewest);
  }, [sourceReceipts, receiptsSearch, viewMode]);

  const clientGroups = useMemo<ClientGroup[]>(() => {
    const map = new Map<string, ClientGroup>();

    for (const r of filteredReceipts) {
      const name = String(r.customer_name || "Klient").trim() || "Klient";
      const phone = String(r.customer_phone || "").trim() || null;
      const customerId = r.customer_id;
      const key =
        customerId !== undefined && customerId !== null && customerId !== ""
          ? `id:${customerId}`
          : `${name.toLowerCase()}|${phone || ""}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          customer_id: customerId,
          customer_name: name,
          customer_phone: phone,
          receipt_count: 0,
          total_paid: 0,
          latest_receipt_date: null,
          receipts: [],
        });
      }

      const group = map.get(key)!;
      group.receipt_count += 1;
      group.total_paid += Number(r.amount_paid || 0);
      group.receipts.push(r);
    }

    const out = Array.from(map.values()).map((g) => {
      const sorted = [...g.receipts].sort(sortReceiptsNewest);
      return {
        ...g,
        receipts: sorted,
        latest_receipt_date:
          sorted[0]?.created_at || sorted[0]?.payment_date || null,
      };
    });

    return out.sort((a, b) =>
      a.customer_name.localeCompare(b.customer_name, "sq", {
        sensitivity: "base",
      })
    );
  }, [filteredReceipts]);

  useEffect(() => {
    if (viewMode !== "clients") {
      setClientNoPaymentsMsg(null);
      return;
    }

    const qv = receiptsSearch.trim();

    if (qv.length < 2) {
      setClientNoPaymentsMsg(null);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API}/customers_search.php?q=${encodeURIComponent(qv)}`,
          { credentials: "include" }
        );

        const data = await res.json().catch(() => null);
        const matchedCustomers = Array.isArray(data?.customers)
          ? data.customers
          : Array.isArray(data)
            ? data
            : [];

        if (matchedCustomers.length > 0 && clientGroups.length === 0) {
          setClientNoPaymentsMsg(
            "Ky klient nuk ka asnje pagese/fature te rregjistruar ne sistem"
          );
        } else {
          setClientNoPaymentsMsg(null);
        }
      } catch {
        setClientNoPaymentsMsg(null);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [API, viewMode, receiptsSearch, clientGroups.length]);

  const receiptsLoading =
    viewMode === "clients"
      ? allClientsBusy
      : globalSearchBusy || periodBusy || (periodPreset === "today" && todayBusy);

  const displayedTotal = useMemo(() => {
    if (viewMode === "clients") {
      return clientGroups.reduce((sum, c) => sum + Number(c.total_paid || 0), 0);
    }
    return filteredReceipts.reduce(
      (sum, r) => sum + Number(r.amount_paid || 0),
      0
    );
  }, [viewMode, clientGroups, filteredReceipts]);

  const displayedCount =
    viewMode === "clients" ? clientGroups.length : filteredReceipts.length;

  const averageReceipt =
    viewMode === "clients"
      ? clientGroups.length
        ? displayedTotal / clientGroups.length
        : 0
      : filteredReceipts.length
        ? displayedTotal / filteredReceipts.length
        : 0;

  return (
    <>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">Kërko klientin</div>
          <div className="text-white/60 text-sm mt-1">
            Shkruaj të paktën 2 shkronja.
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
              placeholder="Emër / Mbiemër / Telefon"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={!!selected}
            />

            {selected && (
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
                onClick={clearSelected}
              >
                Ndrysho
              </button>
            )}
          </div>

          <div className="mt-3 text-white/60 text-sm">
            {searchBusy ? "Duke kërkuar…" : ""}
          </div>

          {!selected ? (
            <div className="mt-3 max-h-72 overflow-auto space-y-2">
              {customers.map((c) => {
                const meta = getStatusMeta(c);
                return (
                  <button
                    key={c.id}
                    className="w-full text-left rounded-xl border border-white/10 bg-black/30 px-4 py-3 hover:bg-black/40"
                    onClick={() => {
                      setSelected(c);
                      setQ(`${c.first_name} ${c.last_name}`);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {c.first_name} {c.last_name}
                        </div>
                        <div className="text-white/60 text-sm">
                          {c.phone || "Pa numër telefoni"}
                        </div>
                        <div className="text-white/45 text-xs mt-1">
                          {(c as any).location || "Pa location"}
                        </div>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.chipClass}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </button>
                );
              })}

              {!customers.length && q.trim().length >= 2 && !searchBusy && (
                <div className="text-white/50 text-sm">
                  Nuk u gjet asnjë klient.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="w-full text-left rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {selected.first_name} {selected.last_name}
                    </div>
                    <div className="text-white/60 text-sm">
                      {selected.phone || "Pa numër telefoni"}
                    </div>
                    <div className="text-white/45 text-xs mt-1">
                      {((selected as any).location as string | null) ||
                        "Pa location"}
                    </div>
                  </div>

                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      getStatusMeta(selected).chipClass
                    }`}
                  >
                    {getStatusMeta(selected).label}
                  </span>
                </div>
              </div>

              <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="font-semibold">Të dhënat e klientit</div>
                <div className="text-white/60 text-sm mt-1">
                  Ndrysho dhe ruaj të dhënat e klientit.
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-white/60 text-sm">Emri</div>
                    <input
                      className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                      value={editFirst}
                      onChange={(e) => setEditFirst(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="text-white/60 text-sm">Mbiemri</div>
                    <input
                      className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                      value={editLast}
                      onChange={(e) => setEditLast(e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="text-white/60 text-sm">Telefoni</div>
                    <input
                      className={[
                        "mt-1 w-full rounded-xl bg-black/40 border px-4 py-3 transition",
                        flashMissing && !editPhone.trim()
                          ? "border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.6)] animate-pulse"
                          : "border-white/10",
                      ].join(" ")}
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="06…"
                    />
                  </div>

                  <div>
                    <div className="text-white/60 text-sm">Location</div>
                    <input
                      className={[
                        "mt-1 w-full rounded-xl bg-black/40 border px-4 py-3 transition",
                        flashMissing && !editLocation.trim()
                          ? "border-amber-400 shadow-[0_0_0_1px_rgba(251,191,36,0.6)] animate-pulse"
                          : "border-white/10",
                      ].join(" ")}
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="Location / adresë"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-white/60 text-sm">Paketa aktuale</div>
                    <select
                      className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                      value={editPkg}
                      onChange={(e) => setEditPkg(e.target.value as PackageLower)}
                    >
                      <option value="standarte">STANDARTE</option>
                      <option value="smart">SMART</option>
                      <option value="turbo">TURBO</option>
                      <option value="ultra">ULTRA</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={updateCustomer}
                  disabled={updBusy || !selected || !hasChanges}
                  className={[
                    "mt-4 w-full rounded-xl border border-white/10 py-3 font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed",
                    hasChanges
                      ? "bg-[#27BCD8] text-black shadow-[0_0_24px_rgba(39,188,216,0.35)] hover:brightness-110"
                      : "bg-white/10 hover:bg-white/15 text-white/80",
                    hasChanges
                      ? "animate-[pulseSoft_1.4s_ease-in-out_infinite]"
                      : "",
                  ].join(" ")}
                >
                  {updBusy
                    ? "Duke ruajtur…"
                    : hasChanges
                      ? "● RUAJ NDRYSHIMET"
                      : "UPDATE CLIENT"}
                </button>

                {updMsg && (
                  <div className="mt-3 text-sm text-white/80">{updMsg}</div>
                )}

                <style jsx>{`
                  @keyframes pulseSoft {
                    0% {
                      transform: scale(1);
                      filter: brightness(1);
                    }
                    50% {
                      transform: scale(1.01);
                      filter: brightness(1.08);
                    }
                    100% {
                      transform: scale(1);
                      filter: brightness(1);
                    }
                  }
                `}</style>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">Krijo pagesë (Cash)</div>

          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 relative">
            <div className="flex items-center justify-between gap-2">
              <div className="text-white/60 text-sm">Klienti i zgjedhur</div>

              {selected && (
                <div className="relative" data-client-menu="wrap">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/90 flex items-center justify-center"
                    onClick={() => setClientMenuOpen((v) => !v)}
                    title="Opsione"
                    aria-label="Opsione"
                  >
                    ⋯
                  </button>

                  {clientMenuOpen && (
                    <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-black/90 backdrop-blur p-1 shadow-lg z-20">
                      <button
                        type="button"
                        className="w-full text-left rounded-lg px-3 py-2 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 disabled:opacity-60"
                        onClick={deleteSelectedCustomer}
                        disabled={updBusy}
                      >
                        Fshije Klientin
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-2">
              {selected ? (
                <>
                  <div className="font-medium">
                    {selected.first_name} {selected.last_name}
                  </div>
                  <div className="text-white/60 text-sm">
                    {selected.phone || "Pa numër telefoni"}
                  </div>
                </>
              ) : (
                <div className="text-white/50 text-sm">
                  Zgjidh një klient nga lista.
                </div>
              )}
            </div>

            {selected && paymentInfo && (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 shrink-0">
                      Pagesa e fundit:
                    </span>
                    <span
                      className={`font-semibold ${
                        paymentInfo.paymentStatus === "never_paid"
                          ? "text-amber-300"
                          : paymentInfo.paymentStatus === "free"
                            ? "text-sky-300"
                            : "text-white"
                      }`}
                    >
                      {paymentInfo.lastPayLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-white/60 shrink-0">
                      Përfundimi aktual:
                    </span>
                    <span className="font-semibold">
                      {paymentInfo.paidUntilLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-white/60 shrink-0">Vonesë:</span>
                    <span
                      className={`font-semibold ${
                        paymentInfo.hasDebt ? "text-red-400" : "text-white/80"
                      }`}
                    >
                      {paymentInfo.debtText}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-white/60 shrink-0">
                      Përfundimi i radhës:
                    </span>
                    <span className="font-semibold">
                      {paymentInfo.nextEndLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-white/50">
                  Data e lidhjes:{" "}
                  <span className="text-white/70">
                    {paymentInfo.connectionDateLabel}
                  </span>
                </div>

                <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="text-xs uppercase tracking-wide text-white/50">
                    {paymentInfo.explanationTitle}
                  </div>

                  <div className="mt-2 text-sm text-white/80">
                    {paymentInfo.explanationText}
                  </div>

                  <div className="mt-2 text-xs text-white/50">
                    Bazë llogaritjeje:{" "}
                    <span className="text-white/70">
                      {paymentInfo.baseStartLabel}
                    </span>
                    {" + "}
                    <span className="text-white/70">
                      {paymentInfo.monthsDuration} muaj
                    </span>
                    {" → "}
                    <span className="text-white/70">
                      {paymentInfo.nextEndLabel}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-white/60 text-sm">Paketa</div>
              <select
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                value={pkg}
                onChange={(e) =>
                  setPkg(e.target.value as (typeof PACKAGES)[number]["key"])
                }
              >
                {PACKAGES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.key} — {p.price} L / muaj
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-white/60 text-sm">Muaj</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {MONTH_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonthsFromPreset(m)}
                    className={`rounded-lg border border-white/10 px-3 py-2 ${
                      monthsSelected === m
                        ? "bg-white/15"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {m}
                  </button>
                ))}

                <input
                  className="ml-auto w-[120px] rounded-xl bg-black/40 border border-white/10 px-3 py-2"
                  type="number"
                  min={1}
                  placeholder="p.sh. 2"
                  value={monthsInput}
                  onChange={(e) => onMonthsInputChange(e.target.value)}
                />
              </div>

              <div className="text-white/40 text-xs mt-1">
                Preset: 3/6/12 (me ofertë). Ose vendos muajt manualisht
                (1,2,4,5…).
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-white/60 text-sm">Shuma e pritshme</div>
              <div className="mt-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-semibold">
                {expectedAmount.toLocaleString("sq-AL")} L
              </div>
            </div>

            <div>
              <div className="text-white/60 text-sm">Shuma e paguar</div>
              <input
                className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                type="number"
                value={paidAmount}
                onChange={(e) =>
                  setPaidAmount(parseInt(e.target.value || "0", 10))
                }
              />
            </div>
          </div>

          {paidAmount !== expectedAmount && (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <div className="text-white/60 text-sm">Arsyeja (kërkohet)</div>
                <select
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="">Zgjidh…</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-white/60 text-sm">
                  Shënim {reason === "Tjetër" ? "(kërkohet)" : "(opsionale)"}
                </div>
                <input
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Shkruaj shënimin…"
                />
              </div>
            </div>
          )}

          <button
            className="mt-5 w-full rounded-xl bg-[#27BCD8] text-black font-semibold py-3 disabled:opacity-60"
            disabled={!selected || saving}
            onClick={confirmPayment}
          >
            {saving ? "Duke ruajtur…" : "Konfirmo Pagesën"}
          </button>

          {toast && <div className="mt-3 text-sm text-white/80">{toast}</div>}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative" ref={periodWrapRef}>
              <button
                type="button"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 min-w-[220px]"
                onClick={() => setPeriodOpen((v) => !v)}
              >
                <div className="text-xs uppercase tracking-wide text-white/50">
                  Faturat
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-semibold">{receiptsData.label}</span>
                  <span className="text-white/50 text-sm">▼</span>
                </div>
              </button>

              {periodOpen && (
                <div className="absolute left-0 top-[calc(100%+10px)] z-40 w-[320px] rounded-2xl border border-white/10 bg-[#0E1625] p-3 shadow-2xl">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                      onClick={() => applyPreset("yesterday")}
                    >
                      Dje
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                      onClick={() => applyPreset("last_week")}
                    >
                      1 javë
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                      onClick={() => applyPreset("last_month")}
                    >
                      1 muaj
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                      onClick={() => applyPreset("last_3_months")}
                    >
                      3 muaj
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                      onClick={() => applyPreset("last_6_months")}
                    >
                      6 muaj
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                      onClick={() => applyPreset("last_year")}
                    >
                      1 vit
                    </button>
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="font-medium">Periudhë specifike</div>

                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <div>
                        <div className="text-white/60 text-sm">From</div>
                        <input
                          type="date"
                          className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>

                      <div>
                        <div className="text-white/60 text-sm">To</div>
                        <input
                          type="date"
                          className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-white/50 text-xs">
                      Nëse plotësohet vetëm From, ngarkohen faturat nga ajo datë e
                      tutje. Nëse From dhe To janë të njëjta, shfaqen vetëm faturat
                      e asaj date.
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="rounded-xl bg-[#27BCD8] px-4 py-2 font-semibold text-black"
                        onClick={applyCustomPeriod}
                      >
                        Load
                      </button>

                      <button
                        type="button"
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
                        onClick={() => applyPreset("today")}
                      >
                        Sot
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <input
              type="text"
              className="w-full sm:w-[320px] rounded-2xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
              placeholder={
                viewMode === "clients"
                  ? "Kërko klient / tel / client ID"
                  : "Kërko klient / tel / receipt / paketë"
              }
              value={receiptsSearch}
              onChange={(e) => setReceiptsSearch(e.target.value)}
            />

            {receiptsSearch.trim() && (
              <button
                type="button"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
                onClick={() => setReceiptsSearch("")}
              >
                Pastro
              </button>
            )}

            <button
              type="button"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 disabled:opacity-60"
              onClick={() =>
                viewMode === "clients"
                  ? downloadFilteredClientsCsv(clientGroups)
                  : downloadFilteredReceiptsCsv(filteredReceipts)
              }
              disabled={
                viewMode === "clients"
                  ? !clientGroups.length
                  : !filteredReceipts.length
              }
            >
              Export filtro
            </button>

            <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  viewMode === "receipts"
                    ? "bg-[#27BCD8] text-black"
                    : "text-white/80 hover:bg-white/10"
                }`}
                onClick={() => setViewMode("receipts")}
              >
                Faturat
              </button>
              <button
                type="button"
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  viewMode === "clients"
                    ? "bg-[#27BCD8] text-black"
                    : "text-white/80 hover:bg-white/10"
                }`}
                onClick={() => setViewMode("clients")}
              >
                Klientët
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-white/50 text-xs uppercase tracking-wide">
                Totali
              </div>
              <div className="mt-1 font-semibold">
                {Number(displayedTotal || 0).toLocaleString("sq-AL")} L
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-white/50 text-xs uppercase tracking-wide">
                {viewMode === "clients" ? "Klientë" : "Fatura"}
              </div>
              <div className="mt-1 font-semibold">{displayedCount}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-white/50 text-xs uppercase tracking-wide">
                Mesatarja
              </div>
              <div className="mt-1 font-semibold">
                {averageReceipt.toLocaleString("sq-AL", {
                  maximumFractionDigits: 0,
                })}{" "}
                L
              </div>
            </div>

            <button
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 disabled:opacity-60"
              onClick={() => {
                if (viewMode === "clients") {
                  loadAllClientsReceipts();
                  return;
                }

                if (periodPreset === "today") {
                  refreshToday();
                } else {
                  loadReceiptsForRange(
                    receiptsData.from,
                    receiptsData.to,
                    receiptsData.label
                  );
                }
              }}
              disabled={receiptsLoading}
            >
              {receiptsLoading ? "…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-3 text-white/60 text-sm">
          {viewMode === "clients" ? (
            <span className="text-cyan-300/80">
              Po shfaqen të gjithë klientët me pagesa në DB, pavarësisht periudhës së zgjedhur.
            </span>
          ) : receiptsSearch.trim().length >= 2 ? (
            <span className="text-cyan-300/80">
              Duke kërkuar në të gjitha faturat, pavarësisht periudhës së zgjedhur.
            </span>
          ) : receiptsData.from && receiptsData.to ? (
            <>
              Nga{" "}
              <span className="font-semibold text-white">
                {formatDateDMY(receiptsData.from)}
              </span>{" "}
              deri më{" "}
              <span className="font-semibold text-white">
                {formatDateDMY(receiptsData.to)}
              </span>
            </>
          ) : receiptsData.from ? (
            <>
              Nga{" "}
              <span className="font-semibold text-white">
                {formatDateDMY(receiptsData.from)}
              </span>
            </>
          ) : (
            "Pa interval"
          )}
        </div>

        {periodMsg && viewMode !== "clients" && receiptsSearch.trim().length < 2 && (
          <div className="mt-3 text-sm text-white/80">{periodMsg}</div>
        )}

        {globalSearchMsg &&
          viewMode !== "clients" &&
          receiptsSearch.trim().length >= 2 && (
            <div className="mt-3 text-sm text-white/80">{globalSearchMsg}</div>
          )}

        {allClientsMsg && viewMode === "clients" && (
          <div className="mt-3 text-sm text-white/80">{allClientsMsg}</div>
        )}

        {clientNoPaymentsMsg && viewMode === "clients" && (
          <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {clientNoPaymentsMsg}
          </div>
        )}

        {viewMode === "receipts" ? (
          <div className="mt-4 space-y-2">
            {filteredReceipts.map((r) => (
              <a
                key={r.id}
                className="block rounded-xl border border-white/10 bg-black/30 px-4 py-3 hover:bg-black/40"
                href={`/pagesat/receipt/?id=${r.id}`}
                target="_blank"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">
                    {highlightMatch(
                      r.receipt_no || `Fatura #${r.id}`,
                      receiptsSearch
                    )}
                  </div>
                  <div className="font-semibold">
                    {Number(r.amount_paid || 0).toLocaleString("sq-AL")} L
                  </div>
                </div>
                <div className="text-white/60 text-sm">
                  {highlightMatch(r.customer_name || "Klient", receiptsSearch)} •{" "}
                  {highlightMatch(
                    r.customer_phone || "Pa numër",
                    receiptsSearch
                  )}{" "}
                  • {highlightMatch(r.package_code || "—", receiptsSearch)} •{" "}
                  {r.months_selected || 0} muaj •{" "}
                  {formatDateTime(r.created_at || r.payment_date || null)}
                </div>
              </a>
            ))}

            {!filteredReceipts.length && !receiptsLoading && (
              <div className="text-white/50 text-sm">
                {receiptsSearch.trim()
                  ? "S’u gjet asnjë faturë për këtë kërkim."
                  : "S’ka asnjë faturë për këtë periudhë."}
              </div>
            )}

            {receiptsLoading && (
              <div className="text-white/50 text-sm">Duke ngarkuar faturat…</div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {clientGroups.map((group) => {
              const isOpen = expandedClientKeys.includes(group.key);
              return (
                <div
                  key={group.key}
                  className="rounded-xl border border-white/10 bg-black/30 overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-black/40 transition"
                    onClick={() => toggleClientGroup(group.key)}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="font-semibold">
                          {group.customer_id !== undefined &&
                          group.customer_id !== null ? (
                            <>
                              <span className="text-white/40 mr-2">
                                #{group.customer_id}
                              </span>
                              {highlightMatch(group.customer_name, receiptsSearch)}
                            </>
                          ) : (
                            highlightMatch(group.customer_name, receiptsSearch)
                          )}
                        </div>
                        <div className="text-white/60 text-sm">
                          {highlightMatch(
                            group.customer_phone || "Pa numër",
                            receiptsSearch
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                          <div className="text-white/50 text-xs uppercase">
                            Fatura
                          </div>
                          <div className="font-semibold">{group.receipt_count}</div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                          <div className="text-white/50 text-xs uppercase">
                            Totali
                          </div>
                          <div className="font-semibold">
                            {group.total_paid.toLocaleString("sq-AL")} L
                          </div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 col-span-2 lg:col-span-1">
                          <div className="text-white/50 text-xs uppercase">
                            Fatura e fundit
                          </div>
                          <div className="font-semibold">
                            {formatDateTime(group.latest_receipt_date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-white/10 p-3 space-y-2">
                      {group.receipts.map((r) => (
                        <a
                          key={`${group.key}-${r.id}`}
                          className="block rounded-xl border border-white/10 bg-black/20 px-4 py-3 hover:bg-black/30"
                          href={`/pagesat/receipt/?id=${r.id}`}
                          target="_blank"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium">
                              {highlightMatch(
                                r.receipt_no || `Fatura #${r.id}`,
                                receiptsSearch
                              )}
                            </div>
                            <div className="font-semibold">
                              {Number(r.amount_paid || 0).toLocaleString("sq-AL")} L
                            </div>
                          </div>
                          <div className="text-white/60 text-sm">
                            {highlightMatch(r.package_code || "—", receiptsSearch)} •{" "}
                            {r.months_selected || 0} muaj •{" "}
                            {formatDateTime(r.created_at || r.payment_date || null)}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {!clientGroups.length && !receiptsLoading && !clientNoPaymentsMsg && (
              <div className="text-white/50 text-sm">
                {receiptsSearch.trim()
                  ? "S’u gjet asnjë klient me fatura për këtë kërkim."
                  : "S’ka klientë me fatura të regjistruara në sistem."}
              </div>
            )}

            {receiptsLoading && (
              <div className="text-white/50 text-sm">Duke ngarkuar klientët…</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function receiptsDataKey(
  periodPreset: PeriodPreset,
  todayDate?: string | null,
  from?: string | null,
  to?: string | null
) {
  return `${periodPreset}|${todayDate || ""}|${from || ""}|${to || ""}`;
}