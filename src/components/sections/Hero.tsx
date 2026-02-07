"use client";

import { useEffect, useRef, useState } from "react";
import PillSweepRow from "@/components/common/PillSweepRow";
import { getIncluded } from "@/lib/content";

export default function Hero({
  onRecommend,
}: {
  onRecommend?: (slug: string) => void;
}) {
  const included = getIncluded();

  // flip state (desktop/tablet UI only)
  const [flipped, setFlipped] = useState(false);

  // auto flip every 10s (won't matter on mobile because flip is hidden there)
  useEffect(() => {
    const id = window.setInterval(() => {
      setFlipped((v) => !v);
    }, 10_000);
    return () => window.clearInterval(id);
  }, []);

  // swipe support (only used when flip card is visible)
  const touchStartX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? 0;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(dx) > 45) setFlipped((v) => !v);
  }

  function handleTurboClick(e: React.MouseEvent) {
    e.stopPropagation(); // don’t flip when clicking the button
    setFlipped(false);
    onRecommend?.("turbo");
  }

  return (
    <section className="relative">
      {/* background glow */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(900px 500px at 20% 10%, rgba(39,188,216,.35), transparent 60%)," +
              "radial-gradient(900px 500px at 80% 20%, rgba(39,188,216,.18), transparent 55%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-[var(--bg)]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* LEFT (always visible, including mobile) */}
          <div>
            <p className="text-[var(--brand)] uppercase tracking-[0.22em] text-xs">
              Internet Me Fiber Optike
            </p>

            <h1 className="text-4xl md:text-5xl font-extrabold mt-3 leading-tight">
              Internet i shpejtë & stabil,
              <span className="text-[var(--brand)]"> për familje dhe biznese</span>.
            </h1>

            <p className="text-[var(--muted)] mt-4 text-lg max-w-xl">
              Paketat me instalim falas, router dual-band 2.4G & 5G dhe suport teknik 24/7.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
            <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("plans");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
               }}
              className="px-5 py-3 rounded-xl bg-[var(--brand)] text-black font-semibold"
                >
                Shiko Paketat
              </button>

              <a
                className="px-5 py-3 rounded-xl border border-[var(--border)] hover:bg-white/5"
                 href="/apliko"
              >
                Apliko Tani
              </a>
            </div>

            <div className="mt-7">
              <PillSweepRow />
            </div>
          </div>

          {/* RIGHT: FLIP CARD (hidden on mobile, shows from md and up) */}
          <div
            className="hero-flip hidden md:block"
            onClick={() => setFlipped((v) => !v)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            role="button"
            aria-label="Flip card"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setFlipped((v) => !v);
            }}
          >
            <div className={`hero-flip-inner ${flipped ? "is-flipped" : ""}`}>
              {/* FRONT */}
              <div className="hero-flip-face hero-flip-front rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                <h3 className="font-bold text-lg">
                  Në çdo paketë përfshihen: Instalimi FALAS • Wi-Fi 4G & 5G
                </h3>

                <ul className="mt-4 space-y-3 text-[var(--muted)]">
                  {included.map((x) => (
                    <li key={x} className="flex gap-3">
                      <span className="mt-1 w-2 h-2 rounded-full bg-[var(--brand)]" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 p-4 rounded-xl border border-[var(--border)] bg-black/20">
                  <div className="text-sm text-[var(--muted)]">Paketa më e zgjedhur</div>
                  <div className="mt-1 font-bold text-xl">TURBO 300 / 30</div>

                  <button
                    type="button"
                    onClick={handleTurboClick}
                    className="mt-4 inline-block w-full text-center px-4 py-3 rounded-xl bg-[var(--brand)] text-black font-semibold"
                  >
                    Zgjidh TURBO
                  </button>
                </div>

                <div className="mt-4 text-xs text-[var(--muted)] text-center">
                  Kliko / Swipe për ta kthyer
                </div>
              </div>

              {/* BACK */}
              <div className="hero-flip-face hero-flip-back rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                <div className="h-full w-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-[var(--brand)] uppercase tracking-[0.3em] text-xs">
                      ORIENT GROUP
                    </div>
                    <div className="mt-4 text-5xl md:text-6xl font-extrabold tracking-widest">
                      ORIENT NET
                    </div>
                    <div className="mt-4 text-[var(--muted)]">
                      (Këtu mund të vendosim njoftime/oferta të fundit më vonë)
                    </div>
                  </div>
                </div>

                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.06) inset, 0 0 70px rgba(39,188,216,0.22)",
                  }}
                />
              </div>
            </div>
          </div>
          {/* END RIGHT */}
        </div>
      </div>
    </section>
  );
}
