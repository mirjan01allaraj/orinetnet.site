"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { exportClientsExcel } from "../_lib/exportClientsExcel";

type PaymentStatus = "manual" | "never_paid" | "free";

type CategoryKey =
  | "expired"
  | "near_expiry"
  | "free"
  | "never_paid"
  | "normal_active";

type SortDir = "asc" | "desc";

type SortField =
  | "list_nr"
  | "first_name"
  | "last_name"
  | "phone"
  | "address"
  | "current_package"
  | "connection_date"
  | "last_payment_date"
  | "paid_until"
  | "debt_status";

type CategorySort = {
  field: SortField;
  dir: SortDir;
};

type Row = {
  id: number;
  list_nr: number | null;
  connection_date: string | null;
  address: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  current_package: string;
  payment_status?: PaymentStatus;
  last_payment_date: string | null;
  paid_until: string | null;
  created_at?: string | null;
  debt_days?: number;
  days_left?: number | null;
  expiring_soon?: boolean;
  is_debt?: boolean;
  is_free?: boolean;
  category_key?: CategoryKey;
};

type NewEntry = {
  id: number;
  category: CategoryKey;
  since: number;
};

type StoredNewState = {
  categoryMap: Record<string, CategoryKey>;
  entries: NewEntry[];
};

const CATEGORY_ORDER: CategoryKey[] = [
  "expired",
  "near_expiry",
  "free",
  "never_paid",
  "normal_active",
];

const CATEGORY_META: Record<
  CategoryKey,
  {
    title: string;
    headerClass: string;
    badgeClass: string;
    emptyText: string;
  }
> = {
  expired: {
    title: "Klientët me abonim të mbaruar",
    headerClass:
      "border-orange-500/30 bg-gradient-to-r from-orange-950/70 to-red-900/30 hover:from-orange-900/70 hover:to-red-800/30",
    badgeClass:
      "bg-orange-500/20 text-orange-300 border border-orange-400/20",
    emptyText: "Nuk ka klientë me abonim të mbaruar.",
  },
  near_expiry: {
    title: "Klientët afër mbarimit të abonimit",
    headerClass:
      "border-yellow-500/30 bg-gradient-to-r from-yellow-950/70 to-yellow-900/30 hover:from-yellow-900/70 hover:to-yellow-800/30",
    badgeClass:
      "bg-yellow-500/20 text-yellow-300 border border-yellow-400/20",
    emptyText: "Nuk ka klientë afër mbarimit të abonimit.",
  },
  free: {
    title: "Klientët Free",
    headerClass:
      "border-sky-500/30 bg-gradient-to-r from-sky-950/70 to-sky-900/30 hover:from-sky-900/70 hover:to-sky-800/30",
    badgeClass: "bg-sky-500/20 text-sky-300 border border-sky-400/20",
    emptyText: "Nuk ka klientë Free.",
  },
  never_paid: {
    title: "Klientët që s’kanë paguar asnjëherë",
    headerClass:
      "border-rose-500/30 bg-gradient-to-r from-rose-950/70 to-rose-900/30 hover:from-rose-900/70 hover:to-rose-800/30",
    badgeClass: "bg-rose-500/20 text-rose-300 border border-rose-400/20",
    emptyText: "Nuk ka klientë që s’kanë paguar asnjëherë.",
  },
  normal_active: {
    title: "Klientët normalë aktivë",
    headerClass:
      "border-emerald-500/30 bg-gradient-to-r from-emerald-950/70 to-emerald-900/30 hover:from-emerald-900/70 hover:to-emerald-800/30",
    badgeClass:
      "bg-emerald-500/20 text-emerald-300 border border-emerald-400/20",
    emptyText: "Nuk ka klientë normalë aktivë.",
  },
};

const NOTIFY_CATEGORIES: CategoryKey[] = ["expired", "near_expiry"];
const STORAGE_KEY = "pagesat-client-category-map-v4";
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

function formatDateDMY(v?: string | null) {
  if (!v) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return v;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function isMapLink(v?: string | null) {
  if (!v) return false;
  const s = v.toLowerCase();
  return (
    s.includes("google.com/maps") ||
    s.includes("maps.google.com") ||
    s.includes("goo.gl/maps") ||
    s.includes("maps.app.goo.gl")
  );
}

function cloneRow<T>(r: T): T {
  return JSON.parse(JSON.stringify(r));
}

function buildCategoryMap(rows: Row[]) {
  const out: Record<string, CategoryKey> = {};
  for (const r of rows) {
    out[String(r.id)] = (r.category_key as CategoryKey) || "normal_active";
  }
  return out;
}

function buildEntriesByCategory(entries: NewEntry[]) {
  const grouped: Record<CategoryKey, NewEntry[]> = {
    expired: [],
    near_expiry: [],
    free: [],
    never_paid: [],
    normal_active: [],
  };

  for (const entry of entries) {
    grouped[entry.category].push(entry);
  }

  return grouped;
}

function isStillFresh(ts: number) {
  return Date.now() - ts < NEW_WINDOW_MS;
}

function normalizeWhatsAppPhone(phone?: string | null) {
  if (!phone) return null;

  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0")) {
    digits = "355" + digits.slice(1);
  }

  if (digits.startsWith("355")) return digits;

  return digits;
}

function buildTimeStatusText(row: Row) {
  const category = (row.category_key as CategoryKey) || "normal_active";

  if (category === "never_paid") {
    return "pa asnjë pagesë të regjistruar";
  }

  if (row.is_debt && Number(row.debt_days || 0) > 0) {
    return `${row.debt_days} ditë me vonesë`;
  }

  if (row.expiring_soon && typeof row.days_left === "number") {
    return `${row.days_left} ditë të mbetura`;
  }

  return "abonimi aktiv";
}

function buildWhatsAppMessage(row: Row) {
  const fullName = `${row.first_name} ${row.last_name}`.trim();

  const lastPayment = row.last_payment_date
    ? formatDateDMY(row.last_payment_date)
    : row.payment_status === "never_paid"
      ? "Asnjë pagesë"
      : row.payment_status === "free"
        ? "Free"
        : "-";

  const paidUntil = row.paid_until ? formatDateDMY(row.paid_until) : "-";
  const timeStatus = buildTimeStatusText(row);
  const category = (row.category_key as CategoryKey) || "normal_active";

  if (category === "near_expiry") {
    return `Përshëndetje  ${fullName},
Nga ORIENT NET ISP
Ju njoftojmë se abonimi juaj është afër mbarimit.

Pagesa e fundit: ${lastPayment}✓
Data e mbarimit të abonimit: ${paidUntil}
Ditë të mbetura: ${timeStatus}

Ju lutem na kontaktoni për rinovimin e abonimit.
Kontaktoni: +355 686 666 419 www.orientnet.al
Vendndodhja e zyrës:
https://maps.app.goo.gl/ji9sXL5K9rV745GH6
Faleminderit,
Orient Net`;
  }

  if (category === "expired") {
    return `Përshëndetje ${fullName},
Nga ORIENT NET ISP
Ju njoftojmë se abonimi juaj ka mbaruar.

Pagesa e fundit: ${lastPayment}✓
Data e mbarimit të abonimit: ${paidUntil}
Stausi: ${timeStatus}

Ju lutem na kontaktoni për riaktivizimin / rinovimin e abonimit.
Kontaktoni: +355 686 666 419  www.orientnet.al
Vendndodhja e zyrës:
https://maps.app.goo.gl/ji9sXL5K9rV745GH6
Faleminderit,
Orient Net`;
  }

  if (category === "never_paid") {
    const registeredDate = row.connection_date
      ? formatDateDMY(row.connection_date)
      : "-";

    const debtDays = Number(row.debt_days || 0);

    return `Përshëndetje ${fullName},
Nga ORIENT NET ISP
Ju informojmë se në sistemin tonë 
nuk rezulton asnjë pagesë e regjistruar për shërbimin tuaj.

Data e regjistrimit: ${registeredDate}
Pagesa e fundit: Asnje Pagese!!
Ditët me shërbim aktiv: ${debtDays} ditë

Për të shmangur ndërprerjen e shërbimit!
Ju lutemi të kryeni pagesën ose të na kontaktoni 
sa më shpejt për riaktivizimin e abonimit tuaj.

Vendndodhja e zyrës:
https://maps.app.goo.gl/ji9sXL5K9rV745GH6
Kontaktoni: +355 686 666 419  www.orientnet.al

Faleminderit,
Orient Net`;
  }

  return "";
}

function buildWhatsAppLink(row: Row) {
  const phone = normalizeWhatsAppPhone(row.phone);
  if (!phone) return null;

  const category = (row.category_key as CategoryKey) || "normal_active";

  if (category === "free" || category === "normal_active") {
    return `https://wa.me/${phone}`;
  }

  const message = buildWhatsAppMessage(row);
  if (!message.trim()) {
    return `https://wa.me/${phone}`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function KlientetView({ API }: { API: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [draftRows, setDraftRows] = useState<Record<number, Row>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [categorySorts, setCategorySorts] = useState<
    Record<CategoryKey, CategorySort>
  >({
    expired: { field: "list_nr", dir: "asc" },
    near_expiry: { field: "list_nr", dir: "asc" },
    free: { field: "list_nr", dir: "asc" },
    never_paid: { field: "list_nr", dir: "asc" },
    normal_active: { field: "list_nr", dir: "asc" },
  });

  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [editingIds, setEditingIds] = useState<number[]>([]);
  const [editingPaymentIds, setEditingPaymentIds] = useState<number[]>([]);

  const [openCategories, setOpenCategories] = useState<Record<CategoryKey, boolean>>({
    expired: false,
    near_expiry: false,
    free: false,
    never_paid: false,
    normal_active: true,
  });

  const [allClientsCount, setAllClientsCount] = useState(0);

  const [categoryPages, setCategoryPages] = useState<Record<CategoryKey, number>>({
    expired: 1,
    near_expiry: 1,
    free: 1,
    never_paid: 1,
    normal_active: 1,
  });

  const [categoryLimits, setCategoryLimits] = useState<Record<CategoryKey, number>>({
    expired: 10,
    near_expiry: 10,
    free: 10,
    never_paid: 10,
    normal_active: 10,
  });

  const [newEntriesByCategory, setNewEntriesByCategory] = useState<
    Record<CategoryKey, NewEntry[]>
  >({
    expired: [],
    near_expiry: [],
    free: [],
    never_paid: [],
    normal_active: [],
  });

  const [highlightedIds, setHighlightedIds] = useState<number[]>([]);
  const [pinnedNewCategory, setPinnedNewCategory] = useState<CategoryKey | null>(null);

  const [expandedClientsByCategory, setExpandedClientsByCategory] = useState<
    Record<CategoryKey, number | null>
  >({
    expired: null,
    near_expiry: null,
    free: null,
    never_paid: null,
    normal_active: null,
  });

  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchText = search.trim();
  const isSearchMode = searchText.length >= 2;

  async function load() {
    setBusy(true);
    setMsg(null);

    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "5000",
        search,
      });

      const res = await fetch(`${API}/customers_list.php?${params.toString()}`, {
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg(`Gabim: ${data?.error || "LOAD_FAILED"}`);
        return;
      }

      const savedRows: Row[] = data.rows || [];
      setRows(savedRows);

      if (search.trim().length < 2) {
        setAllClientsCount(savedRows.length);
      }

      const nextDrafts: Record<number, Row> = {};
      for (const r of savedRows) {
        nextDrafts[r.id] = cloneRow(r);
      }
      setDraftRows(nextDrafts);

      const currentMap = buildCategoryMap(savedRows);

      if (search.trim().length < 2) {
        try {
          const rawPrev = localStorage.getItem(STORAGE_KEY);
          const now = Date.now();

          if (!rawPrev) {
            const initialState: StoredNewState = {
              categoryMap: currentMap,
              entries: [],
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
            setNewEntriesByCategory({
              expired: [],
              near_expiry: [],
              free: [],
              never_paid: [],
              normal_active: [],
            });
          } else {
            const parsed: unknown = JSON.parse(rawPrev);

            function isStoredNewState(value: unknown): value is StoredNewState {
              if (!value || typeof value !== "object") return false;

              const v = value as {
                categoryMap?: unknown;
                entries?: unknown;
              };

              return (
                !!v.categoryMap &&
                typeof v.categoryMap === "object" &&
                Array.isArray(v.entries)
              );
            }

            const prevCategoryMap: Record<string, CategoryKey> =
              isStoredNewState(parsed)
                ? parsed.categoryMap
                : (parsed as Record<string, CategoryKey>);

            const prevEntries: NewEntry[] = isStoredNewState(parsed)
              ? parsed.entries
              : [];

            const activeIds = new Set(savedRows.map((r) => r.id));

            const cleanedPrevEntries = prevEntries.filter((entry) => {
              if (!isStillFresh(entry.since)) return false;
              if (!activeIds.has(entry.id)) return false;

              const currentCategory = currentMap[String(entry.id)];
              return (
                currentCategory === entry.category &&
                NOTIFY_CATEGORIES.includes(entry.category)
              );
            });

            const nextEntries = [...cleanedPrevEntries];

            for (const r of savedRows) {
              const idKey = String(r.id);
              const currentCategory =
                (r.category_key as CategoryKey) || "normal_active";
              const previousCategory = prevCategoryMap[idKey];

              const movedIntoNotifyCategory =
                NOTIFY_CATEGORIES.includes(currentCategory) &&
                previousCategory !== undefined &&
                previousCategory !== currentCategory;

              if (movedIntoNotifyCategory) {
                const existingIndex = nextEntries.findIndex(
                  (entry) =>
                    entry.id === r.id &&
                    entry.category === currentCategory &&
                    isStillFresh(entry.since)
                );

                if (existingIndex === -1) {
                  nextEntries.push({
                    id: r.id,
                    category: currentCategory,
                    since: now,
                  });
                } else {
                  nextEntries[existingIndex] = {
                    ...nextEntries[existingIndex],
                    since: now,
                  };
                }
              }
            }

            const nextGrouped = buildEntriesByCategory(nextEntries);
            setNewEntriesByCategory(nextGrouped);

            const nextStored: StoredNewState = {
              categoryMap: currentMap,
              entries: nextEntries,
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStored));
          }
        } catch {
          // ignore
        }
      }
    } catch {
      setMsg("Gabim gjatë ngarkimit të klientëve.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      resetCategoryPages();
      load();
    }, 250);

    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const interval = setInterval(() => {
      load();
    }, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [search]);

  useEffect(() => {
    if (isSearchMode) return;

    for (const key of NOTIFY_CATEGORIES) {
      if (!openCategories[key]) continue;

      const ids = getFreshNewIds(key);
      if (ids.length) {
        setCategoryPages((prev) => ({ ...prev, [key]: 1 }));
        triggerHighlight(ids);
      }
    }
  }, [openCategories, newEntriesByCategory, isSearchMode]);

  useEffect(() => {
    if (!isSearchMode) return;
    resetCategoryPages();
  }, [isSearchMode]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (pinTimerRef.current) clearTimeout(pinTimerRef.current);
    };
  }, []);

  function resetCategoryPages() {
    setCategoryPages({
      expired: 1,
      near_expiry: 1,
      free: 1,
      never_paid: 1,
      normal_active: 1,
    });
  }

  function triggerHighlight(ids: number[], categoryToPin?: CategoryKey) {
    if (!ids.length) return;

    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    if (pinTimerRef.current) clearTimeout(pinTimerRef.current);

    if (categoryToPin) {
      setPinnedNewCategory(categoryToPin);
    }

    setHighlightedIds(ids);

    const clearAll = () => {
      setHighlightedIds([]);
      setPinnedNewCategory(null);
    };

    highlightTimerRef.current = setTimeout(clearAll, 5000);
    pinTimerRef.current = setTimeout(clearAll, 5000);
  }

  function toggleCategory(key: CategoryKey) {
    setOpenCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function getDraft(row: Row): Row {
    return draftRows[row.id] ?? row;
  }

  function updateDraftRow(id: number, updater: (row: Row) => Row) {
    setDraftRows((prev) => {
      const existing = prev[id];
      const found = rows.find((r) => r.id === id);
      const source = existing ?? (found ? cloneRow(found) : undefined);

      if (!source) return prev;

      return {
        ...prev,
        [id]: updater(cloneRow(source)),
      };
    });
  }

  function updateField(id: number, field: keyof Row, value: string) {
    updateDraftRow(id, (r) => ({ ...r, [field]: value }));
  }

  function setPaymentStatus(id: number, status: PaymentStatus) {
    updateDraftRow(id, (r) => {
      if (status === "never_paid") {
        return {
          ...r,
          payment_status: "never_paid",
          last_payment_date: null,
          paid_until: null,
        };
      }

      if (status === "free") {
        return {
          ...r,
          payment_status: "free",
          last_payment_date: null,
          paid_until: null,
        };
      }

      return {
        ...r,
        payment_status: "manual",
      };
    });
  }

  function openEditRow(id: number) {
    setEditingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setEditingPaymentIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function closeEditRow(id: number) {
    setEditingIds((prev) => prev.filter((x) => x !== id));
    closePaymentEditor(id);
  }

  function isEditingRow(id: number) {
    return editingIds.includes(id);
  }

  function openPaymentEditor(id: number) {
    setEditingPaymentIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function closePaymentEditor(id: number) {
    setEditingPaymentIds((prev) => prev.filter((x) => x !== id));
  }

  function isPaymentEditorOpen(id: number) {
    return editingPaymentIds.includes(id);
  }

  async function saveRow(savedRow: Row) {
    const draft = getDraft(savedRow);
    const status: PaymentStatus = draft.payment_status || "manual";

    setSavingId(draft.id);
    setMsg(null);

    try {
      const res = await fetch(`${API}/customers_update.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: draft.id,
          first_name: draft.first_name,
          last_name: draft.last_name,
          phone: draft.phone || "",
          current_package: draft.current_package,
          connection_date: draft.connection_date || "",
          address: draft.address || "",
          payment_status: status,
          last_payment_date:
            status === "manual" ? draft.last_payment_date || "" : "",
          paid_until: status === "manual" ? draft.paid_until || "" : "",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg(`Gabim: ${data?.error || "UPDATE_FAILED"}`);
        return;
      }

      setMsg("Klienti u përditësua me sukses.");
      closeEditRow(draft.id);
      await load();
    } catch {
      setMsg("Gabim gjatë ruajtjes.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRow(savedRow: Row) {
    const full = `${savedRow.first_name} ${savedRow.last_name}`.trim();
    if (!confirm(`Ta fshij klientin: ${full}?`)) return;

    setDeletingId(savedRow.id);
    setMsg(null);

    try {
      const res = await fetch(`${API}/customers_delete.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: savedRow.id }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg(`Gabim: ${data?.error || "DELETE_FAILED"}`);
        return;
      }

      setMsg("Klienti u fshi.");
      await load();
    } catch {
      setMsg("Gabim gjatë fshirjes.");
    } finally {
      setDeletingId(null);
    }
  }

  function getSortableDateValue(v?: string | null) {
    if (!v) return 0;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  function getSortableTextValue(v?: string | null) {
    return String(v || "").toLocaleLowerCase("sq");
  }

  function getDebtSortValue(row: Row, category: CategoryKey) {
    if (category === "expired") {
      return Number(row.debt_days || 0);
    }

    if (category === "near_expiry") {
      return Number(row.days_left ?? 999999);
    }

    return 0;
  }

  function getSortValue(row: Row, field: SortField, category: CategoryKey) {
    switch (field) {
      case "list_nr":
        return Number(row.list_nr || 0);

      case "first_name":
        return getSortableTextValue(row.first_name);

      case "last_name":
        return getSortableTextValue(row.last_name);

      case "phone":
        return getSortableTextValue(row.phone);

      case "address":
        return getSortableTextValue(row.address);

      case "current_package":
        return getSortableTextValue(row.current_package);

      case "connection_date":
        return getSortableDateValue(row.connection_date);

      case "last_payment_date":
        if (row.payment_status === "never_paid") return -1;
        if (row.payment_status === "free") return -2;
        return getSortableDateValue(row.last_payment_date);

      case "paid_until":
        return getSortableDateValue(row.paid_until);

      case "debt_status":
        return getDebtSortValue(row, category);

      default:
        return 0;
    }
  }

  function compareRows(
    a: Row,
    b: Row,
    field: SortField,
    dir: SortDir,
    category: CategoryKey
  ) {
    const av = getSortValue(a, field, category);
    const bv = getSortValue(b, field, category);

    let result = 0;

    if (typeof av === "number" && typeof bv === "number") {
      result = av - bv;
    } else {
      result = String(av).localeCompare(String(bv), "sq");
    }

    return dir === "asc" ? result : -result;
  }

  function canSortField(category: CategoryKey, field: SortField) {
    if (field !== "debt_status") return true;
    return category === "expired" || category === "near_expiry";
  }

  function toggleCategorySort(category: CategoryKey, field: SortField) {
    if (!canSortField(category, field)) return;

    setCategorySorts((prev) => {
      const current = prev[category];

      if (current.field === field) {
        return {
          ...prev,
          [category]: {
            field,
            dir: current.dir === "asc" ? "desc" : "asc",
          },
        };
      }

      return {
        ...prev,
        [category]: {
          field,
          dir: "asc",
        },
      };
    });

    setCategoryPages((prev) => ({
      ...prev,
      [category]: 1,
    }));
  }

  const groupedSavedRows = useMemo(() => {
    const groups: Record<CategoryKey, Row[]> = {
      expired: [],
      near_expiry: [],
      free: [],
      never_paid: [],
      normal_active: [],
    };

    for (const r of rows) {
      const key = (r.category_key as CategoryKey) || "normal_active";
      groups[key].push(r);
    }

    (Object.keys(groups) as CategoryKey[]).forEach((category) => {
      const cfg = categorySorts[category];
      groups[category] = [...groups[category]].sort((a, b) =>
        compareRows(a, b, cfg.field, cfg.dir, category)
      );
    });

    return groups;
  }, [rows, categorySorts]);

  const visibleCategoryOrder = useMemo(() => {
    if (!isSearchMode) return CATEGORY_ORDER;

    return [...CATEGORY_ORDER].sort((a, b) => {
      const aHas = groupedSavedRows[a].length > 0 ? 1 : 0;
      const bHas = groupedSavedRows[b].length > 0 ? 1 : 0;

      if (aHas !== bHas) return bHas - aHas;
      return CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b);
    });
  }, [isSearchMode, groupedSavedRows]);

  function getFreshNewIds(key: CategoryKey) {
    return newEntriesByCategory[key]
      .filter((entry) => isStillFresh(entry.since))
      .map((entry) => entry.id);
  }

  function totalPagesFor(key: CategoryKey) {
    return Math.max(
      1,
      Math.ceil(groupedSavedRows[key].length / categoryLimits[key])
    );
  }

  function setCategoryPage(key: CategoryKey, nextPage: number) {
    setCategoryPages((prev) => ({
      ...prev,
      [key]: Math.max(1, Math.min(totalPagesFor(key), nextPage)),
    }));
  }

  function setCategoryLimit(key: CategoryKey, limit: number) {
    setCategoryLimits((prev) => ({
      ...prev,
      [key]: limit,
    }));
    setCategoryPages((prev) => ({
      ...prev,
      [key]: 1,
    }));
  }

  function getPagedRowsForCategory(key: CategoryKey) {
    const baseItems = groupedSavedRows[key];
    const idsToPin = pinnedNewCategory === key ? getFreshNewIds(key) : [];

    const items =
      idsToPin.length > 0
        ? [
            ...baseItems.filter((r) => idsToPin.includes(r.id)),
            ...baseItems.filter((r) => !idsToPin.includes(r.id)),
          ]
        : baseItems;

    const page = categoryPages[key];
    const limit = categoryLimits[key];
    const start = (page - 1) * limit;

    return items.slice(start, start + limit);
  }

  function getNotificationText(key: CategoryKey) {
    const ids = getFreshNewIds(key);
    if (!ids.length) return null;

    const names = rows
      .filter((r) => ids.includes(r.id))
      .map((r) => `${r.first_name} ${r.last_name}`.trim());

    if (names.length === 1) return `U shtua: ${names[0]}`;
    return `U shtuan: ${names.length} klientë`;
  }

  function toggleClientExpand(category: CategoryKey, clientId: number) {
    setExpandedClientsByCategory((prev) => ({
      ...prev,
      [category]: prev[category] === clientId ? null : clientId,
    }));
  }

  function isClientExpanded(category: CategoryKey, clientId: number) {
    return expandedClientsByCategory[category] === clientId;
  }

  function renderField(label: string, content: ReactNode) {
    return (
      <div>
        <label className="mb-1 block text-xs text-white/60">{label}</label>
        {content}
      </div>
    );
  }

  function renderDesktopCell(
    savedRow: Row,
    field: keyof Row,
    fallback: ReactNode,
    inputType: "text" | "date" = "text"
  ) {
    const draft = getDraft(savedRow);
    const editing = isEditingRow(savedRow.id);

    if (!editing) return fallback;

    return (
      <input
        type={inputType}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[16px]"
        value={(draft[field] as string | null) || ""}
        onChange={(e) => updateField(savedRow.id, field, e.target.value)}
      />
    );
  }

  function renderClientDesktopRow(savedRow: Row) {
    const draft = getDraft(savedRow);
    const status: PaymentStatus = draft.payment_status || "manual";
    const editingPayment = isPaymentEditorOpen(savedRow.id);
    const editing = isEditingRow(savedRow.id);
    const isHighlighted = highlightedIds.includes(savedRow.id);

    const whatsappLink = buildWhatsAppLink(savedRow);
    const showWhatsappButton =
      !!whatsappLink &&
      (savedRow.category_key === "near_expiry" ||
        savedRow.category_key === "expired" ||
        savedRow.category_key === "never_paid" ||
        savedRow.category_key === "free" ||
        savedRow.category_key === "normal_active");

    const baseRowClass = savedRow.is_debt
      ? "border-t border-red-500/10 bg-transparent"
      : savedRow.is_free
        ? "border-t border-sky-500/10 bg-transparent"
        : savedRow.expiring_soon
          ? "border-t border-yellow-500/10 bg-transparent"
          : "border-t border-white/10 bg-transparent";

    const highlightClass = isHighlighted
      ? "animate-[newPulse_1s_ease-in-out_infinite] ring-2 ring-cyan-300/60"
      : "";

    return (
      <tr key={savedRow.id} className={`${baseRowClass} ${highlightClass}`}>
        <td className="px-3 py-3 text-[16px] font-medium">{draft.list_nr ?? "-"}</td>

        <td className="px-3 py-3 min-w-[160px]">
          {renderDesktopCell(
            savedRow,
            "first_name",
            <span className="text-[17px] font-semibold tracking-[0.01em]">{draft.first_name}</span>
          )}
        </td>

        <td className="px-3 py-3 min-w-[160px]">
          {renderDesktopCell(
            savedRow,
            "last_name",
            <span className="text-[17px] font-semibold tracking-[0.01em]">{draft.last_name}</span>
          )}
        </td>

        <td className="px-3 py-3 min-w-[150px]">
          {renderDesktopCell(
            savedRow,
            "phone",
            <span className="text-[16px]">{draft.phone || "-"}</span>
          )}
        </td>

        <td className="px-3 py-3 min-w-[280px]">
          {editing ? (
            <div>
              <input
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[16px]"
                value={draft.address || ""}
                placeholder="Adresa ose Google Maps link"
                onChange={(e) => updateField(savedRow.id, "address", e.target.value)}
              />
              {isMapLink(draft.address) && (
                <a
                  href={draft.address || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-medium text-[#27BCD8] hover:underline"
                >
                  📍 Open Map
                </a>
              )}
            </div>
          ) : (
            <div className="text-[15px] leading-6">
              <div>{draft.address || "-"}</div>
              {isMapLink(draft.address) && (
                <a
                  href={draft.address || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-medium text-[#27BCD8] hover:underline"
                >
                  📍 Open Map
                </a>
              )}
            </div>
          )}
        </td>

        <td className="px-3 py-3 min-w-[150px]">
          {editing ? (
            <select
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[15px]"
              value={draft.current_package}
              onChange={(e) =>
                updateField(savedRow.id, "current_package", e.target.value)
              }
            >
              <option value="standarte">STANDARTE</option>
              <option value="smart">SMART</option>
              <option value="turbo">TURBO</option>
              <option value="ultra">ULTRA</option>
            </select>
          ) : (
            <span className="text-[15px] font-medium">
              {String(draft.current_package).toUpperCase()}
            </span>
          )}
        </td>

        <td className="px-3 py-3 min-w-[150px]">
          {editing ? (
            <input
              type="date"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[15px]"
              value={draft.connection_date || ""}
              onChange={(e) =>
                updateField(savedRow.id, "connection_date", e.target.value)
              }
            />
          ) : (
            <span className="text-[16px] font-semibold text-white/90 tabular-nums">
              {formatDateDMY(draft.connection_date)}
            </span>
          )}
        </td>

        <td className="px-3 py-3 min-w-[230px]">
          {editingPayment ? (
            <div className="space-y-2">
              <select
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[15px]"
                value={status}
                onChange={(e) =>
                  setPaymentStatus(savedRow.id, e.target.value as PaymentStatus)
                }
              >
                <option value="manual">Vendos manualisht</option>
                <option value="never_paid">Asnjë pagesë</option>
                <option value="free">Free</option>
              </select>

              <div
                className={`text-sm font-semibold tabular-nums ${
                  status === "never_paid"
                    ? "text-amber-300"
                    : status === "free"
                      ? "text-sky-300"
                      : "text-white/70"
                }`}
              >
                {status === "never_paid"
                  ? "Asnjë pagesë"
                  : status === "free"
                    ? "Free"
                    : formatDateDMY(draft.last_payment_date)}
              </div>

              {status === "manual" && (
                <input
                  type="date"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[15px]"
                  value={draft.last_payment_date || ""}
                  onChange={(e) =>
                    updateField(savedRow.id, "last_payment_date", e.target.value)
                  }
                />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`text-[16px] font-semibold tabular-nums ${
                  status === "never_paid"
                    ? "text-amber-300"
                    : status === "free"
                      ? "text-sky-300"
                      : "text-white"
                }`}
              >
                {status === "never_paid"
                  ? "Asnjë pagesë"
                  : status === "free"
                    ? "Free"
                    : draft.last_payment_date
                      ? formatDateDMY(draft.last_payment_date)
                      : "-"}
              </span>
              {editing && (
                <button
                  type="button"
                  onClick={() => openPaymentEditor(savedRow.id)}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                  title="Ndrysho pagesën"
                >
                  ✏️
                </button>
              )}
            </div>
          )}
        </td>

        <td className="px-3 py-3 min-w-[190px]">
          {editing && status === "manual" ? (
            <input
              type="date"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[15px]"
              value={draft.paid_until || ""}
              onChange={(e) => updateField(savedRow.id, "paid_until", e.target.value)}
            />
          ) : (
            <div
              className={`text-[16px] font-semibold tabular-nums ${
                savedRow.is_debt
                  ? "text-red-400"
                  : savedRow.is_free
                    ? "text-sky-300"
                    : savedRow.expiring_soon
                      ? "text-yellow-300"
                      : "text-white"
              }`}
            >
              {status === "manual" ? formatDateDMY(draft.paid_until) : "—"}
            </div>
          )}
        </td>

        <td className="px-3 py-3 min-w-[140px]">
          {savedRow.is_debt && Number(savedRow.debt_days || 0) > 0 ? (
            <span className="text-[16px] font-bold tabular-nums text-red-400">
              {savedRow.debt_days} ditë
            </span>
          ) : savedRow.is_free && Number(savedRow.debt_days || 0) > 0 ? (
            <span className="text-[16px] font-bold tabular-nums text-sky-300">
              {savedRow.debt_days} ditë
            </span>
          ) : savedRow.expiring_soon && typeof savedRow.days_left === "number" ? (
            <span className="text-[16px] font-bold tabular-nums text-yellow-300">
              {savedRow.days_left} ditë
            </span>
          ) : (
            <span className="text-[16px] font-semibold text-green-400">Aktiv</span>
          )}
        </td>

        <td className="px-3 py-3 min-w-[360px]">
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => saveRow(savedRow)}
                  disabled={savingId === savedRow.id}
                  className="rounded-lg bg-[#27BCD8] px-3.5 py-2.5 text-[15px] font-semibold text-black disabled:opacity-60"
                >
                  {savingId === savedRow.id ? "Duke ruajtur…" : "Ruaj"}
                </button>

                <button
                  type="button"
                  onClick={() => closeEditRow(savedRow.id)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-[15px] font-semibold hover:bg-white/10"
                >
                  Mbyll
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openEditRow(savedRow.id)}
                className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-[15px] font-semibold hover:bg-white/10"
              >
                ✏️
              </button>
            )}

            <button
              type="button"
              onClick={() => deleteRow(savedRow)}
              disabled={deletingId === savedRow.id}
              className="rounded-lg border border-rose-400/20 bg-rose-500/20 px-3.5 py-2.5 text-[15px] text-rose-300 disabled:opacity-60"
            >
              {deletingId === savedRow.id ? "…" : "Fshi"}
            </button>

            {showWhatsappButton && (
              <a
                href={whatsappLink || "#"}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-green-400/20 bg-green-500/20 px-3.5 py-2.5 text-[15px] font-semibold text-green-300 hover:bg-green-500/30"
                title="Hap bisedën në WhatsApp"
              >
                WhatsApp
              </a>
            )}
          </div>
        </td>
      </tr>
    );
  }

  function renderExpandedClient(savedRow: Row, category: CategoryKey) {
    const draft = getDraft(savedRow);
    const status: PaymentStatus = draft.payment_status || "manual";
    const editingPayment = isPaymentEditorOpen(savedRow.id);
    const editing = isEditingRow(savedRow.id);
    const whatsappLink = buildWhatsAppLink(savedRow);
    const showWhatsappButton = !!whatsappLink;

    return (
      <div className="border-t border-white/10 px-4 py-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {renderField(
              "Emri",
              editing ? (
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                  value={draft.first_name}
                  onChange={(e) =>
                    updateField(savedRow.id, "first_name", e.target.value)
                  }
                />
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-semibold">
                  {draft.first_name}
                </div>
              )
            )}

            {renderField(
              "Mbiemri",
              editing ? (
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                  value={draft.last_name}
                  onChange={(e) =>
                    updateField(savedRow.id, "last_name", e.target.value)
                  }
                />
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-semibold">
                  {draft.last_name}
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {renderField(
              "Telefoni",
              editing ? (
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                  value={draft.phone || ""}
                  onChange={(e) => updateField(savedRow.id, "phone", e.target.value)}
                />
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  {draft.phone || "-"}
                </div>
              )
            )}

            {renderField(
              "Adresa",
              editing ? (
                <div>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                    value={draft.address || ""}
                    placeholder="Adresa ose Google Maps link"
                    onChange={(e) =>
                      updateField(savedRow.id, "address", e.target.value)
                    }
                  />
                  {isMapLink(draft.address) && (
                    <a
                      href={draft.address || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-medium text-[#27BCD8] hover:underline"
                    >
                      📍 Open Map
                    </a>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <div>{draft.address || "-"}</div>
                  {isMapLink(draft.address) && (
                    <a
                      href={draft.address || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-medium text-[#27BCD8] hover:underline"
                    >
                      📍 Open Map
                    </a>
                  )}
                </div>
              )
            )}
          </div>

          {renderField(
            "Paketa",
            editing ? (
              <select
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                value={draft.current_package}
                onChange={(e) =>
                  updateField(savedRow.id, "current_package", e.target.value)
                }
              >
                <option value="standarte">STANDARTE</option>
                <option value="smart">SMART</option>
                <option value="turbo">TURBO</option>
                <option value="ultra">ULTRA</option>
              </select>
            ) : (
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                {String(draft.current_package).toUpperCase()}
              </div>
            )
          )}

          <div className="grid grid-cols-2 gap-3">
            {renderField(
              "Data e lidhjes",
              editing ? (
                <input
                  type="date"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                  value={draft.connection_date || ""}
                  onChange={(e) =>
                    updateField(savedRow.id, "connection_date", e.target.value)
                  }
                />
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  {formatDateDMY(draft.connection_date)}
                </div>
              )
            )}

            {renderField(
              "Statusi / Borxhi",
              <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                {savedRow.is_debt && Number(savedRow.debt_days || 0) > 0 ? (
                  <span className="font-bold text-red-400">{savedRow.debt_days} ditë</span>
                ) : savedRow.is_free && Number(savedRow.debt_days || 0) > 0 ? (
                  <span className="font-bold text-sky-300">{savedRow.debt_days} ditë</span>
                ) : savedRow.expiring_soon &&
                  typeof savedRow.days_left === "number" ? (
                  <span className="font-bold text-yellow-300">{savedRow.days_left} ditë</span>
                ) : (
                  <span className="font-semibold text-green-400">Aktiv</span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {renderField(
              "Pagesa e fundit",
              editingPayment ? (
                <div className="space-y-2">
                  <select
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                    value={status}
                    onChange={(e) =>
                      setPaymentStatus(savedRow.id, e.target.value as PaymentStatus)
                    }
                  >
                    <option value="manual">Vendos manualisht</option>
                    <option value="never_paid">Asnjë pagesë</option>
                    <option value="free">Free</option>
                  </select>

                  <div
                    className={`text-sm font-semibold tabular-nums ${
                      status === "never_paid"
                        ? "text-amber-300"
                        : status === "free"
                          ? "text-sky-300"
                          : "text-white/70"
                    }`}
                  >
                    {status === "never_paid"
                      ? "Asnjë pagesë"
                      : status === "free"
                        ? "Free"
                        : formatDateDMY(draft.last_payment_date)}
                  </div>

                  {status === "manual" && (
                    <input
                      type="date"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                      value={draft.last_payment_date || ""}
                      onChange={(e) =>
                        updateField(savedRow.id, "last_payment_date", e.target.value)
                      }
                    />
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  {status === "never_paid"
                    ? "Asnjë pagesë"
                    : status === "free"
                      ? "Free"
                      : draft.last_payment_date
                        ? formatDateDMY(draft.last_payment_date)
                        : "-"}
                </div>
              )
            )}

            {renderField(
              "Mbarimi i abonimit",
              editing && status === "manual" ? (
                <input
                  type="date"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2"
                  value={draft.paid_until || ""}
                  onChange={(e) => updateField(savedRow.id, "paid_until", e.target.value)}
                />
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  {status === "manual" ? formatDateDMY(draft.paid_until) : "—"}
                </div>
              )
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => saveRow(savedRow)}
                  disabled={savingId === savedRow.id}
                  className="rounded-lg bg-[#27BCD8] px-3 py-2 font-semibold text-black disabled:opacity-60"
                >
                  {savingId === savedRow.id ? "Duke ruajtur…" : "Ruaj"}
                </button>

                <button
                  type="button"
                  onClick={() => closeEditRow(savedRow.id)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold hover:bg-white/10"
                >
                  Mbyll
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openEditRow(savedRow.id)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold hover:bg-white/10"
              >
                ✏️ Edito
              </button>
            )}

            <button
              type="button"
              onClick={() => deleteRow(savedRow)}
              disabled={deletingId === savedRow.id}
              className="rounded-lg border border-rose-400/20 bg-rose-500/20 px-3 py-2 text-rose-300 disabled:opacity-60"
            >
              {deletingId === savedRow.id ? "…" : "Fshi"}
            </button>

            {showWhatsappButton && (
              <a
                href={whatsappLink || "#"}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-green-400/20 bg-green-500/20 px-3 py-2 font-semibold text-green-300 hover:bg-green-500/30"
              >
                WhatsApp
              </a>
            )}

            {editing && !editingPayment && (
              <button
                type="button"
                onClick={() => openPaymentEditor(savedRow.id)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold hover:bg-white/10"
              >
                Ndrysho pagesën
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderMobileCard(savedRow: Row, category: CategoryKey) {
    const isExpanded = isClientExpanded(category, savedRow.id);
    const isHighlighted = highlightedIds.includes(savedRow.id);

    return (
      <div
        key={savedRow.id}
        className={`overflow-hidden rounded-2xl border border-white/10 bg-black/20 ${
          isHighlighted ? "animate-[newPulse_1s_ease-in-out_infinite] ring-2 ring-cyan-300/60" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => toggleClientExpand(category, savedRow.id)}
          className="w-full px-4 py-4 text-left"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold">
                {savedRow.first_name} {savedRow.last_name}
              </div>
              <div className="mt-1 text-sm text-white/60">
                {savedRow.phone || "Pa numër"} • {String(savedRow.current_package).toUpperCase()}
              </div>
            </div>
            <span className="text-lg">{isExpanded ? "▾" : "▸"}</span>
          </div>
        </button>

        {isExpanded && renderExpandedClient(savedRow, category)}
      </div>
    );
  }

  return (
    <div className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 p-4">
      <style jsx>{`
        @keyframes newPulse {
          0% {
            background-color: rgba(34, 211, 238, 0.06);
            box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.25);
          }
          50% {
            background-color: rgba(34, 211, 238, 0.18);
            box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.65);
          }
          100% {
            background-color: rgba(34, 211, 238, 0.06);
            box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.25);
          }
        }
      `}</style>

      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <div className="text-xl font-semibold">
            Klientët{" "}
            <span className="font-medium text-white/60">({allClientsCount})</span>
          </div>
          <div className="mt-1 text-sm text-white/60">
            Lista është e organizuar në 5 kategori për menaxhim më të lehtë.
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className="min-w-[260px] rounded-xl border border-white/10 bg-black/40 px-4 py-3"
            placeholder="Kërko me emër, mbiemër, telefon ose adresë…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            type="button"
            onClick={() => exportClientsExcel(rows)}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 font-semibold hover:bg-white/15"
          >
            Export Excel
          </button>
        </div>
      </div>

      {msg && <div className="mt-3 text-sm text-white/80">{msg}</div>}

      <div className="mt-4 space-y-3">
        {visibleCategoryOrder.map((key) => {
          const allItems = groupedSavedRows[key];
          const items = getPagedRowsForCategory(key);
          const meta = CATEGORY_META[key];
          const isOpen = isSearchMode ? allItems.length > 0 : !!openCategories[key];
          const page = categoryPages[key];
          const limit = categoryLimits[key];
          const totalPages = totalPagesFor(key);
          const freshNewIds = getFreshNewIds(key);
          const newCount = freshNewIds.length;
          const notificationText = getNotificationText(key);

          return (
            <div
              key={key}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
            >
              <button
                type="button"
                onClick={() => {
                  if (!isSearchMode) {
                    toggleCategory(key);
                  }

                  if (newCount > 0) {
                    setCategoryPage(key, 1);
                    triggerHighlight(freshNewIds, key);
                  }
                }}
                className={`w-full border-b px-4 py-4 text-left transition ${meta.headerClass}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{isOpen ? "▾" : "▸"}</span>
                    <div>
                      <div className="font-semibold text-white">{meta.title}</div>
                      <div className="text-sm text-white/70">{allItems.length} klientë</div>
                      {notificationText && (
                        <div className="mt-1 text-xs font-semibold text-cyan-300">
                          {notificationText}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {newCount > 0 && (
                      <div className="rounded-full border border-cyan-400/20 bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-300">
                        +{newCount} NEW
                      </div>
                    )}
                    <div className={`rounded-full px-3 py-1 text-sm font-semibold ${meta.badgeClass}`}>
                      {allItems.length}
                    </div>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="overflow-x-auto">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3">
                    <div className="text-sm text-white/60">
                      Totali në kategori:{" "}
                      <span className="font-semibold text-white">{allItems.length}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {newCount > 0 && !isSearchMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryPage(key, 1);
                            triggerHighlight(freshNewIds, key);
                          }}
                          className="rounded-xl border border-cyan-400/20 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20"
                        >
                          NEW ({newCount})
                        </button>
                      )}

                      <select
                        className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                        value={limit}
                        onChange={(e) => setCategoryLimit(key, parseInt(e.target.value, 10))}
                      >
                        <option value={10}>10 / faqe</option>
                        <option value={25}>25 / faqe</option>
                        <option value={50}>50 / faqe</option>
                        <option value={100}>100 / faqe</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setCategoryPage(key, page - 1)}
                        disabled={page <= 1}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 disabled:opacity-60"
                      >
                        Prev
                      </button>

                      <div className="text-sm text-white/70">
                        Faqja <span className="font-semibold text-white">{page}</span> / {totalPages}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCategoryPage(key, page + 1)}
                        disabled={page >= totalPages}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 disabled:opacity-60"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  <div className="hidden md:block w-full">
                    <table className="min-w-[2100px] w-full text-sm">
                      <thead className="bg-black/40 text-white/70">
                        <tr>
                          <Th
                            onClick={() => toggleCategorySort(key, "list_nr")}
                            active={categorySorts[key].field === "list_nr"}
                            dir={categorySorts[key].dir}
                          >
                            Nr
                          </Th>

                          <Th
                            onClick={() => toggleCategorySort(key, "first_name")}
                            active={categorySorts[key].field === "first_name"}
                            dir={categorySorts[key].dir}
                          >
                            Emri
                          </Th>

                          <Th
                            onClick={() => toggleCategorySort(key, "last_name")}
                            active={categorySorts[key].field === "last_name"}
                            dir={categorySorts[key].dir}
                          >
                            Mbiemri
                          </Th>

                          <Th
                            onClick={() => toggleCategorySort(key, "phone")}
                            active={categorySorts[key].field === "phone"}
                            dir={categorySorts[key].dir}
                          >
                            Telefoni
                          </Th>

                          <Th
                            onClick={() => toggleCategorySort(key, "address")}
                            active={categorySorts[key].field === "address"}
                            dir={categorySorts[key].dir}
                          >
                            Adresa
                          </Th>

                          <Th
                            onClick={() => toggleCategorySort(key, "current_package")}
                            active={categorySorts[key].field === "current_package"}
                            dir={categorySorts[key].dir}
                          >
                            Paketa
                          </Th>

                          <Th
                            onClick={() => toggleCategorySort(key, "connection_date")}
                            active={categorySorts[key].field === "connection_date"}
                            dir={categorySorts[key].dir}
                          >
                            Data e Lidhjes
                          </Th>

                          <Th
                            onClick={() => toggleCategorySort(key, "last_payment_date")}
                            active={categorySorts[key].field === "last_payment_date"}
                            dir={categorySorts[key].dir}
                          >
                            Pagesa e fundit
                          </Th>

                          <Th
                            onClick={() => toggleCategorySort(key, "paid_until")}
                            active={categorySorts[key].field === "paid_until"}
                            dir={categorySorts[key].dir}
                          >
                            Mbarimi i Abonimit
                          </Th>

                          <Th
                            onClick={() => toggleCategorySort(key, "debt_status")}
                            active={categorySorts[key].field === "debt_status"}
                            dir={categorySorts[key].dir}
                            disabled={!(key === "expired" || key === "near_expiry")}
                          >
                            Borxh
                          </Th>

                          <Th disabled>Veprime</Th>
                        </tr>
                      </thead>

                      <tbody>
                        {items.length ? (
                          items.map(renderClientDesktopRow)
                        ) : (
                          <tr>
                            <td colSpan={11} className="px-3 py-6 text-center text-white/50">
                              {meta.emptyText}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 p-3 md:hidden">
                    {items.length ? (
                      items.map((savedRow) => renderMobileCard(savedRow, key))
                    ) : (
                      <div className="px-3 py-6 text-center text-white/50">{meta.emptyText}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  active = false,
  dir = "asc",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
  disabled?: boolean;
}) {
  return (
    <th
      className={`select-none whitespace-nowrap px-3 py-3 text-left text-[15px] font-semibold transition ${
        disabled
          ? "cursor-default text-white/45"
          : "cursor-pointer text-white/85 hover:text-white"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <span className="inline-flex items-center gap-2">
        {children}
        {!disabled && (
          <span className={`text-xs ${active ? "text-cyan-300" : "text-white/35"}`}>
            {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        )}
      </span>
    </th>
  );
}