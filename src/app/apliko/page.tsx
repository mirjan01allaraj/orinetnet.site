"use client";

import { useMemo, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { getPlans } from "@/lib/content";

type Plan = {
  slug: string;
  name: string;
  priceAll?: number; // e.g. 1300
  // optional, if you have them in your data (not required)
  down?: number;
  up?: number;
  features?: string[];
};

const OFFICE_WA = "355686666419"; // no + for wa.me

function formatLek(n?: number) {
  if (typeof n !== "number") return "";
  // 1300 -> "1,300"
  return `${Math.round(n)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function extractSpeeds(p: Plan): { down?: number; up?: number; label?: string } {
  // 1) direct fields
  if (typeof p.down === "number" && typeof p.up === "number") {
    return { down: p.down, up: p.up, label: `${p.down}↓ / ${p.up}↑` };
  }

  // 2) try to parse from features text like "100 Mbps ↓ / 10 Mbps ↑"
  const txt = (p.features || []).join(" | ");
  const m1 = txt.match(/(\d+)\s*Mbps.*?(\d+)\s*Mbps/i);
  if (m1) {
    const down = Number(m1[1]);
    const up = Number(m1[2]);
    if (!Number.isNaN(down) && !Number.isNaN(up)) {
      return { down, up, label: `${down}↓ / ${up}↑` };
    }
  }

  // 3) try "300 / 30" style
  const m2 = txt.match(/(\d+)\s*\/\s*(\d+)/);
  if (m2) {
    const down = Number(m2[1]);
    const up = Number(m2[2]);
    if (!Number.isNaN(down) && !Number.isNaN(up)) {
      return { down, up, label: `${down}↓ / ${up}↑` };
    }
  }

  return {};
}

export default function AplikoPage() {
  const plans = useMemo(() => (getPlans() as Plan[]).filter(Boolean), []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [planSlug, setPlanSlug] = useState("");
  const [notes, setNotes] = useState("");

  const selectedPlan = useMemo(
    () => plans.find((p) => p.slug === planSlug),
    [plans, planSlug]
  );

  function handleSubmit() {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !planSlug
    ) {
      alert("Ju lutem plotësoni të gjitha fushat (përfshirë paketën).");
      return;
    }

    const sp = selectedPlan ? extractSpeeds(selectedPlan) : {};
    const planLine = selectedPlan
      ? `${selectedPlan.name}${
          selectedPlan.priceAll ? ` — ${formatLek(selectedPlan.priceAll)}L/muaj` : ""
        }${sp.label ? ` — ${sp.label}` : ""}`
      : planSlug;

    const msg =
`📩 *APLIKIM I RI – ORIENT NET*
━━━━━━━━━━━━━━━━━━
👤 *Emër Mbiemër:* ${firstName.trim()} ${lastName.trim()}
📞 *Nr. i tel:* ${phone.trim()}
📦 *Paketa:* ${planLine}
📍 *Adresa / Location:* ${address.trim()}
📝 *Shënime:* ${notes.trim() || "-"}`;

    const url = `https://wa.me/${OFFICE_WA}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen">
      {/* ✅ Header visible everywhere */}
      <Navbar />

      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="glass-card rounded-[28px] overflow-hidden relative">
          <div className="glass-vignette pointer-events-none" />

          <div className="p-7 md:p-10">
            <div className="text-center">
              <div className="text-xs tracking-[0.35em] text-white/45 uppercase">
                ORIENT NET
              </div>
              <h1 className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight">
                Aplikim i shpejtë
              </h1>
              <p className="mt-3 text-white/60">
                Plotësoni të dhënat dhe ne ju kontaktojmë menjëherë.
              </p>
            </div>

            <div className="mt-10 grid gap-4">
              {/* Emër / Mbiemër */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Emër"
                  className="px-4 py-3 rounded-xl bg-black/20 border border-[var(--border)] text-white outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                />
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Mbiemër"
                  className="px-4 py-3 rounded-xl bg-black/20 border border-[var(--border)] text-white outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                />
              </div>

              {/* Telefon */}
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Numri i telefonit"
                inputMode="tel"
                className="px-4 py-3 rounded-xl bg-black/20 border border-[var(--border)] text-white outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
              />

              {/* Adresa / Maps link */}
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Adresa ose Location Link nga MAPS"
                className="px-4 py-3 rounded-xl bg-black/20 border border-[var(--border)] text-white outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
              />

              {/* ✅ Paketat dropdown */}
              <div>
                <label className="block text-sm font-semibold text-white/75 mb-2">
                  Zgjidhni 1 nga paketat tona
                </label>

                <select
                  value={planSlug}
                  onChange={(e) => setPlanSlug(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/20 border border-[var(--border)] text-white outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                >
                  <option value="" disabled>
                    Zgjidh paketën…
                  </option>

                  {plans.map((p) => {
                    const sp = extractSpeeds(p);
                    const label =
                      `${p.name}` +
                      (p.priceAll ? ` — ${formatLek(p.priceAll)}L/muaj` : "") +
                      (sp.label ? ` — ${sp.label}` : "");
                    return (
                      <option key={p.slug} value={p.slug}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* ✅ Shënime shtesë */}
              <div>
                <label className="block text-sm font-semibold text-white/75 mb-2">
                  Shënime shtesë nga ana e klientit
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Shkruani ndonjë detaj shtesë (opsionale)…"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-black/20 border border-[var(--border)] text-white outline-none focus:ring-2 focus:ring-[var(--brand)]/30 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                className="mt-2 px-5 py-3 rounded-xl bg-[var(--brand)] text-black font-extrabold text-center hover:brightness-110 active:brightness-95 transition"
              >
                Dërgo aplikimin
              </button>

              <p className="text-center text-xs text-white/55 mt-2">
                Ky aplikim do të dërgohet përmes WhatsApp tek përfaqësuesit e zyrës tonë dhe do t’ju kontaktojnë.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
