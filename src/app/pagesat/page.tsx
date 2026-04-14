"use client";

import { useEffect, useMemo, useState } from "react";

const API = "/pagesat-api";

const PACKAGES = [
  { key: "STANDARTE", price: 1300 },
  { key: "SMART", price: 1400 },
  { key: "TURBO", price: 1500 },
  { key: "ULTRA", price: 1700 },
] as const;

const MONTHS = ["3", "6", "12"] as const;

const REASONS = [
  "Pagesë standarde",
  "Pagesë e pjesshme",
  "Zbritje / Marrëveshje",
  "Shlyerje debie",
  "Korrigjim",
  "Tjetër",
] as const;

function promoPayMonths(m: (typeof MONTHS)[number]) {
  if (m === "6") return 5;
  if (m === "12") return 10;
  return 3;
}

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return (await res.json()) as T;
}

type User = { id: number; username: string; role: "point" | "admin"; point_name: string };
type Customer = { id: number; first_name: string; last_name: string; phone: string | null };

export default function Pagesat() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const [tab, setTab] = useState<"dashboard" | "reports" | "users">("dashboard");

  // login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  // search
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);

  // payment
  const [pkg, setPkg] = useState<(typeof PACKAGES)[number]["key"]>("STANDARTE");
  const [months, setMonths] = useState<(typeof MONTHS)[number]>("3");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // today
  const [today, setToday] = useState<{ date: string; total: number; receipts: any[] } | null>(null);
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
  const [reportBusy, setReportBusy] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // users
  const [usersBusy, setUsersBusy] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newU, setNewU] = useState({ username: "", password: "", role: "point", point_name: "" });
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const expectedAmount = useMemo(() => {
    const p = PACKAGES.find((x) => x.key === pkg)!.price;
    return p * promoPayMonths(months);
  }, [pkg, months]);

  useEffect(() => {
    setPaidAmount(expectedAmount);
    setReason("");
    setNote("");
  }, [expectedAmount]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ ok: boolean; user?: User }>("/me.php");
        if (r.ok && r.user) setUser(r.user);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshToday();
    if (user.role === "admin") {
      fetchPoints();
      loadUsers();
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
        const r = await fetch(`${API}/customers_search.php?q=${encodeURIComponent(q.trim())}`, {
          credentials: "include",
        });
        const j = await r.json();
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
      const r = await api<{ ok: boolean; user?: User }>("/login.php", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok || !r.user) {
        setLoginErr("Kredencialet janë gabim.");
        return;
      }
      setUser(r.user);
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
    setReportData(null);
    setUsersList([]);
    setPoints([]);
    setTab("dashboard");
  }

  async function refreshToday() {
    setTodayBusy(true);
    try {
      const r = await fetch(`${API}/receipts_today.php`, { credentials: "include" });
      setToday(await r.json());
    } finally {
      setTodayBusy(false);
    }
  }

  async function confirmPayment() {
    if (!selected) return;

    const needReason = paidAmount !== expectedAmount;
    if (needReason && !reason) return setToast("Zgjidh arsyen (kërkohet kur shuma ndryshon).");
    if (reason === "Tjetër" && !note.trim()) return setToast("Shkruaj shënimin (kërkohet kur arsyeja është “Tjetër”).");

    setSaving(true);
    try {
      const r = await api<{ ok: boolean; payment_id?: number; receipt_no?: string }>("/payment_create.php", {
        method: "POST",
        body: JSON.stringify({
          customer_id: selected.id,
          package_code: pkg.toLowerCase(),
          months,
          expected_amount: expectedAmount,
          amount_paid: paidAmount,
          reason: paidAmount !== expectedAmount ? reason : "Pagesë standarde",
          note: reason === "Tjetër" ? note.trim() : note.trim() || "",
        }),
      });

      if (!r.ok || !r.payment_id) return setToast("Gabim gjatë ruajtjes.");

      setToast(`U ruajt: ${r.receipt_no}`);
      setSelected(null);
      setQ("");
      setCustomers([]);
      await refreshToday();
      window.open(`/pagesat/receipt/?id=${r.payment_id}`, "_blank");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 2500);
    }
  }

  async function fetchPoints() {
    const r = await api<{ ok: boolean; points?: string[] }>("/users_manage.php", {
      method: "POST",
      body: JSON.stringify({ action: "list_points" }),
    });
    if (r.ok && r.points) setPoints(r.points);
  }

  async function runReport() {
    setReportBusy(true);
    setReportData(null);
    try {
      const url = `${API}/reports.php?date=${encodeURIComponent(reportDate)}&point=${encodeURIComponent(reportPoint)}`;
      const res = await fetch(url, { credentials: "include" });
      setReportData(await res.json());
    } finally {
      setReportBusy(false);
    }
  }

  async function loadUsers() {
    setUsersBusy(true);
    try {
      const r = await api<{ ok: boolean; users?: any[] }>("/users_manage.php", {
        method: "POST",
        body: JSON.stringify({ action: "list" }),
      });
      setUsersList(r.users || []);
    } finally {
      setUsersBusy(false);
    }
  }

  async function createUser() {
    setUserMsg(null);
    setUsersBusy(true);
    try {
      const r = await api<any>("/users_manage.php", {
        method: "POST",
        body: JSON.stringify({ action: "create", ...newU }),
      });
      if (!r.ok) return setUserMsg(`Gabim: ${r.error || "CREATE_FAILED"}`);

      setUserMsg("User u krijua me sukses.");
      setNewU({ username: "", password: "", role: "point", point_name: "" });
      await loadUsers();
      await fetchPoints();
    } finally {
      setUsersBusy(false);
    }
  }

  async function setUserActive(id: number, is_active: 0 | 1) {
    setUsersBusy(true);
    try {
      const r = await api<any>("/users_manage.php", {
        method: "POST",
        body: JSON.stringify({ action: "set_active", id, is_active }),
      });
      if (!r.ok && r.error) setUserMsg(`Gabim: ${r.error}`);
      await loadUsers();
      await fetchPoints();
    } finally {
      setUsersBusy(false);
    }
  }

  async function resetUserPassword(id: number) {
    setUserMsg(null);
    setUsersBusy(true);
    try {
      const r = await api<any>("/users_manage.php", {
        method: "POST",
        body: JSON.stringify({ action: "reset_password", id }),
      });
      if (r.ok && r.temp_password) setUserMsg(`Password i ri (temporary): ${r.temp_password}`);
      else setUserMsg("Gabim në reset.");
    } finally {
      setUsersBusy(false);
    }
  }

  if (checking) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Duke u ngarkuar…</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-2xl font-semibold">Pagesat — Portal</div>
          <div className="mt-1 text-white/70 text-sm">Hyrja kërkohet për akses.</div>

          <div className="mt-6 space-y-3">
            <input className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
              placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            <input className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
              placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />

            {loginErr && <div className="text-red-300 text-sm">{loginErr}</div>}

            <button onClick={doLogin} disabled={loginBusy}
              className="w-full rounded-xl bg-[#27BCD8] text-black font-semibold py-3 disabled:opacity-60">
              {loginBusy ? "Duke hyrë…" : "Hyr"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold">Pagesat</div>
            <div className="text-white/70 text-sm">{user.point_name} • {user.role === "admin" ? "Admin" : "Point"}</div>
          </div>

          <div className="flex items-center gap-2">
            {user.role === "admin" ? (
              <>
                <button className={`rounded-xl border border-white/10 px-4 py-2 ${tab === "dashboard" ? "bg-white/15" : "bg-white/5 hover:bg-white/10"}`}
                  onClick={() => setTab("dashboard")}>Dashboard</button>
                <button className={`rounded-xl border border-white/10 px-4 py-2 ${tab === "reports" ? "bg-white/15" : "bg-white/5 hover:bg-white/10"}`}
                  onClick={() => setTab("reports")}>Reports</button>
                <button className={`rounded-xl border border-white/10 px-4 py-2 ${tab === "users" ? "bg-white/15" : "bg-white/5 hover:bg-white/10"}`}
                  onClick={() => setTab("users")}>Users</button>
                <a className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10" href="/pagesat/import/">Import Excel</a>
              </>
            ) : (
              <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
                onClick={() => setTab("dashboard")}>Dashboard</button>
            )}

            <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10" onClick={doLogout}>Dil</button>
          </div>
        </header>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <>
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold">Kërko klientin</div>
                <div className="text-white/60 text-sm mt-1">Shkruaj të paktën 2 shkronja.</div>

                <input className="mt-3 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
                  placeholder="Emër / Mbiemër" value={q} onChange={(e) => setQ(e.target.value)} />

                <div className="mt-3 text-white/60 text-sm">{searchBusy ? "Duke kërkuar…" : ""}</div>

                <div className="mt-3 max-h-72 overflow-auto space-y-2">
                  {customers.map((c) => (
                    <button key={c.id}
                      className="w-full text-left rounded-xl border border-white/10 bg-black/30 px-4 py-3 hover:bg-black/40"
                      onClick={() => setSelected(c)}>
                      <div className="font-medium">{c.first_name} {c.last_name}</div>
                      <div className="text-white/60 text-sm">{c.phone || "Pa numër telefoni"}</div>
                    </button>
                  ))}
                  {!customers.length && q.trim().length >= 2 && !searchBusy && (
                    <div className="text-white/50 text-sm">Nuk u gjet asnjë klient.</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold">Krijo pagesë (Cash)</div>

                <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="text-white/60 text-sm">Klienti i zgjedhur</div>
                  <div className="mt-1">
                    {selected ? (
                      <>
                        <div className="font-medium">{selected.first_name} {selected.last_name}</div>
                        <div className="text-white/60 text-sm">{selected.phone || "Pa numër telefoni"}</div>
                      </>
                    ) : (
                      <div className="text-white/50 text-sm">Zgjidh një klient nga lista.</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-white/60 text-sm">Paketa</div>
                    <select className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                      value={pkg} onChange={(e) => setPkg(e.target.value as any)}>
                      {PACKAGES.map((p) => (
                        <option key={p.key} value={p.key}>{p.key} — {p.price} L / muaj</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-white/60 text-sm">Muaj</div>
                    <select className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                      value={months} onChange={(e) => setMonths(e.target.value as any)}>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
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
                    <input className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                      type="number" value={paidAmount} onChange={(e) => setPaidAmount(parseInt(e.target.value || "0", 10))} />
                  </div>
                </div>

                {paidAmount !== expectedAmount && (
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div>
                      <div className="text-white/60 text-sm">Arsyeja (kërkohet)</div>
                      <select className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                        value={reason} onChange={(e) => setReason(e.target.value)}>
                        <option value="">Zgjidh…</option>
                        {REASONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="text-white/60 text-sm">Shënim {reason === "Tjetër" ? "(kërkohet)" : "(opsionale)"}</div>
                      <input className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                        value={note} onChange={(e) => setNote(e.target.value)} placeholder="Shkruaj shënimin…" />
                    </div>
                  </div>
                )}

                <button className="mt-5 w-full rounded-xl bg-[#27BCD8] text-black font-semibold py-3 disabled:opacity-60"
                  disabled={!selected || saving} onClick={confirmPayment}>
                  {saving ? "Duke ruajtur…" : "Konfirmo Pagesën"}
                </button>

                {toast && <div className="mt-3 text-sm text-white/80">{toast}</div>}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Sot</div>
                  <div className="text-white/60 text-sm">
                    Totali: <span className="font-semibold text-white">{(today?.total ?? 0).toLocaleString("sq-AL")} L</span>
                  </div>
                </div>

                <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 disabled:opacity-60"
                  onClick={refreshToday} disabled={todayBusy}>
                  {todayBusy ? "…" : "Refresh"}
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {(today?.receipts ?? []).map((r: any) => (
                  <a key={r.id}
                    className="block rounded-xl border border-white/10 bg-black/30 px-4 py-3 hover:bg-black/40"
                    href={`/pagesat/receipt/?id=${r.id}`} target="_blank">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{r.receipt_no}</div>
                      <div className="font-semibold">{Number(r.amount_paid).toLocaleString("sq-AL")} L</div>
                    </div>
                    <div className="text-white/60 text-sm">
                      {r.customer_name} • {r.customer_phone || "Pa numër"} • {r.package_code} • {r.months_selected} muaj
                    </div>
                  </a>
                ))}
                {!today?.receipts?.length && <div className="text-white/50 text-sm">S’ka asnjë pagesë sot.</div>}
              </div>
            </div>
          </>
        )}

        {/* REPORTS */}
        {user.role === "admin" && tab === "reports" && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <div className="text-white/60 text-sm">Data</div>
                <input type="date" className="mt-1 rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                  value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
              </div>

              <div>
                <div className="text-white/60 text-sm">Pika (opsionale)</div>
                <select className="mt-1 rounded-xl bg-black/40 border border-white/10 px-4 py-3 min-w-[260px]"
                  value={reportPoint} onChange={(e) => setReportPoint(e.target.value)}>
                  <option value="">Të gjitha</option>
                  {points.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>

              <button className="rounded-xl bg-[#27BCD8] text-black font-semibold px-5 py-3 disabled:opacity-60"
                onClick={runReport} disabled={reportBusy}>
                {reportBusy ? "…" : "Kërko"}
              </button>
            </div>

            <div className="mt-4">
              <div className="text-white/60 text-sm">
                Totali: <span className="text-white font-semibold">{(reportData?.total ?? 0).toLocaleString("sq-AL")} L</span>
              </div>

              <div className="mt-3 space-y-2">
                {(reportData?.items ?? []).map((r: any) => (
                  <a key={r.id}
                    className="block rounded-xl border border-white/10 bg-black/30 px-4 py-3 hover:bg-black/40"
                    href={`/pagesat/receipt/?id=${r.id}`} target="_blank">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{r.receipt_no}</div>
                      <div className="font-semibold">{Number(r.amount_paid).toLocaleString("sq-AL")} L</div>
                    </div>
                    <div className="text-white/60 text-sm">
                      {r.point_name} • {r.customer_name} • {r.customer_phone || "Pa numër"} • {r.package_code} • {r.months_selected} muaj
                    </div>
                    {(r.note || r.reason) && (
                      <div className="text-white/50 text-xs mt-1">{r.reason}{r.note ? ` — ${r.note}` : ""}</div>
                    )}
                  </a>
                ))}
                {!reportBusy && reportData?.ok && !(reportData?.items?.length) && (
                  <div className="text-white/50 text-sm">S’ka rezultate për këto filtra.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {user.role === "admin" && tab === "users" && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold">Krijo User</div>

              <div className="mt-3 space-y-3">
                <input className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                  placeholder="Username" value={newU.username} onChange={(e) => setNewU((s) => ({ ...s, username: e.target.value }))} />
                <input className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                  placeholder="Password" type="text" value={newU.password} onChange={(e) => setNewU((s) => ({ ...s, password: e.target.value }))} />

                <select className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                  value={newU.role} onChange={(e) => setNewU((s) => ({ ...s, role: e.target.value }))}>
                  <option value="point">point</option>
                  <option value="admin">admin</option>
                </select>

                <input className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                  placeholder="Point name (p.sh. Pika - Kombinat)" value={newU.point_name}
                  onChange={(e) => setNewU((s) => ({ ...s, point_name: e.target.value }))} />

                <button className="w-full rounded-xl bg-[#27BCD8] text-black font-semibold py-3 disabled:opacity-60"
                  onClick={createUser} disabled={usersBusy}>Krijo</button>

                {userMsg && <div className="text-sm text-white/80">{userMsg}</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Users</div>
                <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 disabled:opacity-60"
                  onClick={loadUsers} disabled={usersBusy}>Refresh</button>
              </div>

              <div className="mt-3 space-y-2 max-h-[520px] overflow-auto">
                {usersList.map((u: any) => (
                  <div key={u.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{u.username} <span className="text-white/60 text-sm">({u.role})</span></div>
                        <div className="text-white/60 text-sm">{u.point_name}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                          onClick={() => resetUserPassword(u.id)} disabled={usersBusy}>Reset PW</button>

                        {u.is_active ? (
                          <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                            onClick={() => setUserActive(u.id, 0)} disabled={usersBusy}>Disable</button>
                        ) : (
                          <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
                            onClick={() => setUserActive(u.id, 1)} disabled={usersBusy}>Enable</button>
                        )}
                      </div>
                    </div>

                    <div className="text-white/40 text-xs mt-2">Status: {u.is_active ? "Active" : "Disabled"}</div>
                  </div>
                ))}
                {!usersList.length && <div className="text-white/50 text-sm">S’ka user-a.</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
