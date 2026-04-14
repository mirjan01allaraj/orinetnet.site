"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../_lib/api";
import { PACKAGES, promoPayMonths } from "../_lib/constants";
import type { Customer, User } from "../_lib/types";

import LoginView from "./LoginView";
import HeaderBar from "./HeaderBar";
import DashboardView from "./DashboardView";
import KlientetView from "./KlientetView";
import ReportsView from "./ReportsView";
import UsersView from "./UsersView";
import AddCustomerView from "./AddCustomerView";

type Tab = "dashboard" | "klientet" | "reports" | "users" | "add_customer";

type LastCreatedPayment = {
  paymentId: number;
  receiptNo: string;
  publicReceiptUrl: string;
  publicPdfUrl: string;
  customerPhone: string | null;
  customerName: string;
};

const API = "/pagesat-api";

function isValidTab(v: string | null): v is Tab {
  return (
    v === "dashboard" ||
    v === "klientet" ||
    v === "reports" ||
    v === "users" ||
    v === "add_customer"
  );
}

export default function PagesatApp() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const [tab, setTabState] = useState<Tab>("dashboard");

  // login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  // dashboard search
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);

  // payment
  const [pkg, setPkg] = useState<(typeof PACKAGES)[number]["key"]>("STANDARTE");
  const [monthsSelected, setMonthsSelected] = useState<number>(3);
  const [monthsInput, setMonthsInput] = useState<string>("3");

  const expectedAmount = useMemo(() => {
    const p = PACKAGES.find((x) => x.key === pkg)!.price;
    return p * promoPayMonths(monthsSelected);
  }, [pkg, monthsSelected]);

  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [lastCreatedPayment, setLastCreatedPayment] =
    useState<LastCreatedPayment | null>(null);

  // today
  const [today, setToday] = useState<{
    date: string;
    total: number;
    receipts: any[];
  } | null>(null);
  const [todayBusy, setTodayBusy] = useState(false);

  // reports
  const [reportDate, setReportDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [reportPoint, setReportPoint] = useState<string>("");
  const [points, setPoints] = useState<string[]>([]);

  function setTab(next: Tab) {
    setTabState(next);

    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
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

  function openLastPaymentWhatsApp() {
    const phone = normalizeWhatsAppPhone(lastCreatedPayment?.customerPhone);
    const pdfUrl = lastCreatedPayment?.publicPdfUrl;

    if (!phone || !pdfUrl) {
      setToast("Mungon numri ose linku i PDF.");
      setTimeout(() => setToast(null), 2500);
      return;
    }

    const text =
      `Përshëndetje ${lastCreatedPayment?.customerName || ""},\n\n` +
      `Fatura juaj është gati:\n${pdfUrl}\n\n` +
      `Faleminderit,\nOrient Net`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // auto-fill paid amount when expected changes
  useEffect(() => {
    setPaidAmount(expectedAmount);
    setReason("");
    setNote("");
  }, [expectedAmount]);

  // session check
  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ ok: boolean; user?: User }>("/me.php");
        if (r.ok && r.user) {
          setUser(r.user);

          try {
            const url = new URL(window.location.href);
            const initialTab = url.searchParams.get("tab");
            if (isValidTab(initialTab)) {
              setTabState(initialTab);
            }
          } catch {
            // ignore
          }
        }
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // when logged in
  useEffect(() => {
    if (!user) return;
    refreshToday();
    if (user.role === "admin") {
      fetchPoints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // debounced search
  useEffect(() => {
    if (!user) return;
    if (q.trim().length < 2) {
      setCustomers([]);
      return;
    }

    const t = setTimeout(async () => {
      setSearchBusy(true);
      try {
        const res = await fetch(
          `${API}/customers_search.php?q=${encodeURIComponent(q.trim())}`,
          {
            credentials: "include",
          }
        );
        const j = await res.json();
        setCustomers(j.customers || []);
      } finally {
        setSearchBusy(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, user]);

  async function doLogin() {
    setLoginErr(null);
    setLoginBusy(true);

    try {
      const res = await fetch(`${API}/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.user) {
        setLoginErr("Kredencialet janë gabim.");
        return;
      }

      setUser(data.user);

      try {
        const url = new URL(window.location.href);
        const initialTab = url.searchParams.get("tab");
        if (isValidTab(initialTab)) {
          setTabState(initialTab);
        } else {
          setTabState("dashboard");
        }
      } catch {
        setTabState("dashboard");
      }
    } finally {
      setLoginBusy(false);
    }
  }

  async function doLogout() {
    await api("/logout.php", { method: "POST", body: JSON.stringify({}) });
    setUser(null);

    setSelected(null);
    setCustomers([]);
    setToday(null);
    setPoints([]);
    setTabState("dashboard");
    setQ("");
    setLastCreatedPayment(null);

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  }

  async function refreshToday() {
    setTodayBusy(true);
    try {
      const r = await fetch(`${API}/receipts_today.php`, {
        credentials: "include",
      });
      setToday(await r.json());
    } finally {
      setTodayBusy(false);
    }
  }

  async function fetchPoints() {
    const r = await api<{ ok: boolean; points?: string[] }>("/users_manage.php", {
      method: "POST",
      body: JSON.stringify({ action: "list_points" }),
    });
    if (r.ok && r.points) setPoints(r.points);
  }

  function setMonthsFromPreset(m: number) {
    setMonthsSelected(m);
    setMonthsInput(String(m));
  }

  function onMonthsInputChange(v: string) {
    setMonthsInput(v);
    const n = parseInt(v || "0", 10);
    if (!Number.isFinite(n) || n <= 0) return;
    setMonthsSelected(n);
  }

  async function confirmPayment() {
    if (!selected) return;
    if (monthsSelected <= 0) {
      return setToast("Vendos muajt (1, 2, 3...).");
    }

    const needReason = paidAmount !== expectedAmount;
    if (needReason && !reason) {
      return setToast("Zgjidh arsyen (kërkohet kur shuma ndryshon).");
    }
    if (reason === "Tjetër" && !note.trim()) {
      return setToast("Shkruaj shënimin (kërkohet kur arsyeja është “Tjetër”).");
    }

    setSaving(true);
    try {
      const r = await api<{
        ok: boolean;
        payment_id?: number;
        receipt_no?: string;
        receipt_token?: string | null;
        public_receipt_url?: string | null;
        public_pdf_url?: string | null;
        error?: string;
      }>("/payment_create.php", {
        method: "POST",
        body: JSON.stringify({
          customer_id: selected.id,
          package_code: pkg.toLowerCase(),
          months_selected: monthsSelected,
          expected_amount: expectedAmount,
          amount_paid: paidAmount,
          reason: paidAmount !== expectedAmount ? reason : "Pagesë standarde",
          note: reason === "Tjetër" ? note.trim() : note.trim() || "",
        }),
      });

      if (!r.ok || !r.payment_id) {
        setToast(`Gabim gjatë ruajtjes.${r.error ? ` (${r.error})` : ""}`);
        return;
      }

      const publicReceiptUrl = String(r.public_receipt_url || "");
      const publicPdfUrl = String(r.public_pdf_url || "");

      setLastCreatedPayment({
        paymentId: Number(r.payment_id || 0),
        receiptNo: String(r.receipt_no || ""),
        publicReceiptUrl,
        publicPdfUrl,
        customerPhone: selected.phone || null,
        customerName: `${selected.first_name} ${selected.last_name}`.trim(),
      });

      setToast(`U ruajt: ${r.receipt_no}`);
      setSelected(null);
      setQ("");
      setCustomers([]);

      setPkg("STANDARTE");
      setMonthsSelected(3);
      setMonthsInput("3");
      setReason("");
      setNote("");

      await refreshToday();

      if (publicReceiptUrl) {
        window.open(`/pagesat/receipt/?id=${r.payment_id}`, "_blank");
      } else {
        window.open(`/pagesat/receipt/?id=${r.payment_id}`, "_blank");
      }
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 2500);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Duke u ngarkuar…
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        username={username}
        password={password}
        loginErr={loginErr}
        loginBusy={loginBusy}
        setUsername={setUsername}
        setPassword={setPassword}
        doLogin={doLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-[2200px] mx-auto">
        <HeaderBar user={user} tab={tab} setTab={setTab} doLogout={doLogout} />

        {tab === "dashboard" && (
          <DashboardView
            API={API}
            user={user}
            q={q}
            setQ={setQ}
            customers={customers}
            selected={selected}
            setSelected={setSelected}
            searchBusy={searchBusy}
            pkg={pkg}
            setPkg={setPkg}
            monthsSelected={monthsSelected}
            monthsInput={monthsInput}
            setMonthsFromPreset={setMonthsFromPreset}
            onMonthsInputChange={onMonthsInputChange}
            expectedAmount={expectedAmount}
            paidAmount={paidAmount}
            setPaidAmount={setPaidAmount}
            reason={reason}
            setReason={setReason}
            note={note}
            setNote={setNote}
            saving={saving}
            toast={toast}
            confirmPayment={confirmPayment}
            today={today}
            todayBusy={todayBusy}
            refreshToday={refreshToday}
            lastCreatedPayment={lastCreatedPayment}
            openLastPaymentWhatsApp={openLastPaymentWhatsApp}
          />
        )}

        {user.role === "admin" && tab === "klientet" && <KlientetView API={API} />}

        {user.role === "admin" && tab === "reports" && (
          <ReportsView
            API={API}
            points={points}
            reportDate={reportDate}
            setReportDate={setReportDate}
            reportPoint={reportPoint}
            setReportPoint={setReportPoint}
          />
        )}

        {user.role === "admin" && tab === "users" && <UsersView api={api} />}

        {user.role === "admin" && tab === "add_customer" && (
          <AddCustomerView API={API} />
        )}
      </div>
    </div>
  );
}