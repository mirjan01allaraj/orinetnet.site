"use client";

import { useState } from "react";
import { PACKAGES } from "../_lib/constants";

type Props = {
  API: string;
};

type PkgLower = "standarte" | "smart" | "turbo" | "ultra";

export default function AddCustomerView({ API }: Props) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");

  // ✅ NEW: package selector (default standarte)
  const [pkg, setPkg] = useState<PkgLower>("standarte");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function createCustomer() {
    setMsg(null);

    const first_name = first.trim();
    const last_name = last.trim();
    const phone_clean = phone.trim();

    if (!first_name || !last_name) {
      setMsg("Emri dhe mbiemri janë të detyrueshëm.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API}/customers_create.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          first_name,
          last_name,
          phone: phone_clean,
          // ✅ send selected package
          current_package: pkg,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg(`Gabim: ${data?.error || "CREATE_FAILED"}`);
        return;
      }

      setMsg("Klienti u krijua me sukses.");
      setFirst("");
      setLast("");
      setPhone("");
      setPkg("standarte"); // reset to default
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="font-semibold">Shto Klient</div>
        <div className="text-white/60 text-sm mt-1">
          Plotëso të dhënat dhe ruaj klientin.
        </div>

        <div className="mt-4 space-y-3">
          <input
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
            placeholder="Emri"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
          />

          <input
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
            placeholder="Mbiemri"
            value={last}
            onChange={(e) => setLast(e.target.value)}
          />

          <input
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
            placeholder="Telefoni (opsionale)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {/* ✅ NEW: Package dropdown */}
          <div>
            <div className="text-white/60 text-sm">Paketa</div>
            <select
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
              value={pkg}
              onChange={(e) => setPkg(e.target.value as PkgLower)}
            >
              {/* Show nice labels using PACKAGES if you want */}
              <option value="standarte">
                STANDARTE — {PACKAGES.find((p) => p.key === "STANDARTE")?.price ?? 1300} L / muaj
              </option>
              <option value="smart">
                SMART — {PACKAGES.find((p) => p.key === "SMART")?.price ?? 1400} L / muaj
              </option>
              <option value="turbo">
                TURBO — {PACKAGES.find((p) => p.key === "TURBO")?.price ?? 1500} L / muaj
              </option>
              <option value="ultra">
                ULTRA — {PACKAGES.find((p) => p.key === "ULTRA")?.price ?? 1700} L / muaj
              </option>
            </select>
          </div>

          <button
            className="w-full rounded-xl bg-[#27BCD8] text-black font-semibold py-3 shadow-[0_0_24px_rgba(39,188,216,0.35)] hover:brightness-110 transition disabled:opacity-60"
            onClick={createCustomer}
            disabled={busy}
          >
            {busy ? "Duke ruajtur…" : "Ruaj Klientin"}
          </button>

          {msg && <div className="text-sm text-white/80">{msg}</div>}
        </div>
      </div>
    </div>
  );
}