"use client";

import { useEffect, useMemo, useState } from "react";

function waLink(phoneDigits: string, text: string) {
  const digits = phoneDigits.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export default function Coverage() {
  const OFFICE_WA = "355686666419";

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Mobile-only expand/collapse
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      setOpen(!mobile); // desktop always open
    };
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const message = useMemo(() => {
    const fullName = `${first} ${last}`.trim();

    return [
      "📍 KONTROLL PËR MBULIM",
      "",
      `👤 Emër Mbiemër: ${fullName || "-"}`,
      `📞 Nr. i tel: ${phone || "-"}`,
      `📌 Adresa / Link: ${address || "-"}`,
    ].join("\n");
  }, [first, last, phone, address]);

  function handleWhatsApp() {
    const url = waLink(OFFICE_WA, message);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="max-w-6xl mx-auto px-6 py-10" id="coverage">
      <div className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="glass-vignette" aria-hidden="true" />

        {/* Header */}
        <div className="relative">
          <h2 className="text-3xl md:text-3xl font-extrabold">Kontrollo mbulimin</h2>
          <p className="text-[var(--muted)] mt-2">
            Shkruaj të dhënat dhe ne të kontaktojmë për konfirmim.
          </p>
        </div>

        {/* Mobile toggle button (like “Hap pyetjet”) */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center font-semibold text-white/90 hover:bg-white/10 transition"
          >
            {open ? "Mbyll formularin" : "Hap formularin"}
          </button>
        )}

        {/* Expand area */}
        <div
          className={[
            "grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out",
            open ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0 mt-0",
          ].join(" ")}
        >
          <div className="overflow-hidden">
            {/* Form */}
            <div className="relative">
              {/* Emër + Mbiemër (side-by-side even on mobile) */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  placeholder="Emër"
                  className="px-4 py-3 rounded-xl bg-black/20 border border-[var(--border)] outline-none focus:border-white/20"
                />
                <input
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  placeholder="Mbiemër"
                  className="px-4 py-3 rounded-xl bg-black/20 border border-[var(--border)] outline-none focus:border-white/20"
                />
              </div>

              {/* Phone */}
              <div className="mt-3">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Numri i telefonit"
                  inputMode="tel"
                  className="w-full px-4 py-3 rounded-xl bg-black/20 border border-[var(--border)] outline-none focus:border-white/20"
                />
              </div>

              {/* Address */}
              <div className="mt-3">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Adresa ose Location Link nga MAPS"
                  className="w-full px-4 py-3 rounded-xl bg-black/20 border border-[var(--border)] outline-none focus:border-white/20"
                />
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={handleWhatsApp}
                className="mt-4 w-full px-5 py-3 rounded-xl bg-[var(--brand)] text-black font-semibold text-center"
              >
                Apliko
              </button>

              <div className="mt-3 text-xs text-[var(--muted)] text-center">
                Dërgohet automatikisht në WhatsApp te zyra.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
