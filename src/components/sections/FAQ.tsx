"use client";

import { useMemo, useRef, useState, useEffect } from "react";

type FaqItem = { q: string; a: string };

function cx(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={cx(
        "h-5 w-5 shrink-0 transition-transform duration-300",
        open && "rotate-180"
      )}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Typewriter runs ONLY when trigger increments */
function TypedAnswer({
  text,
  trigger,
  speedMs = 14,
}: {
  text: string;
  trigger: number;
  speedMs?: number;
}) {
  const [shown, setShown] = useState("");
  const rafRef = useRef<number | null>(null);
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) return;

    setShown("");

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (tRef.current) window.clearTimeout(tRef.current);

    let i = 0;

    const step = () => {
      i += 1;
      setShown(text.slice(0, i));
      if (i < text.length) {
        tRef.current = window.setTimeout(() => {
          rafRef.current = requestAnimationFrame(step);
        }, speedMs);
      }
    };

    tRef.current = window.setTimeout(() => {
      rafRef.current = requestAnimationFrame(step);
    }, 60);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (tRef.current) window.clearTimeout(tRef.current);
      rafRef.current = null;
      tRef.current = null;
    };
  }, [trigger, text, speedMs]);

  return (
    <p className="text-white/75 leading-relaxed">
      {shown}
      <span className="inline-block w-[0.6ch] animate-pulse text-white/40">
        ▍
      </span>
    </p>
  );
}

export default function FAQ() {
  const items: FaqItem[] = useMemo(
    () => [
      {
        q: "A ofroni instalim dhe pajisje falas?",
        a: "Po, instalimi dhe routerat Wi-Fi 2.4G & 5G përfshihen falas në shumë nga paketat tona.",
      },
      {
        q: "Cilat janë planet e internetit që ofron Orient Net?",
        a: "Ne ofrojmë plane të ndryshme për individë dhe biznese, me shpejtësi të ndryshme dhe çmime konkurruese për çdo nevojë.",
      },
      {
        q: "A mund ta ndryshoj planin e abonimit tim?",
        a: "Po, ju mund të kaloni në një plan tjetër në çdo kohë duke kontaktuar suportin tonë.",
      },
      {
        q: "Si funksionon monitorimi i rrjetit tuaj?",
        a: "Ne monitorojmë rrjetin 24/7 për të garantuar stabilitet dhe për të zgjidhur çdo problem përpara se të ndikojë tek ju.",
      },
      {
        q: "A ofroni asistencë për konfigurimin e routerit?",
        a: "Po, ekipi ynë teknik ju ndihmon për çdo konfigurim të routerit Wi-Fi 2.4G & 5G.",
      },
      {
        q: "Çfarë duhet të bëj në rast të një problemi me internetin?",
        a: "Në rast problemi, kontaktoni suportin tonë teknik. Shumica e çështjeve zgjidhen menjëherë në distancë.",
      },
    ],
    []
  );

  // desktop/tablet: behave as before
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});
  const [typeTrigger, setTypeTrigger] = useState<Record<number, number>>({});

  // ✅ MOBILE: collapsed panel behavior
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [revealCount, setRevealCount] = useState(0);

  // stagger reveal on mobile once expanded
  useEffect(() => {
    if (!mobileExpanded) {
      setRevealCount(0);
      return;
    }

    let i = 0;
    setRevealCount(0);

    const t = window.setInterval(() => {
      i += 1;
      setRevealCount((prev) => Math.max(prev, i));
      if (i >= items.length) window.clearInterval(t);
    }, 110);

    return () => window.clearInterval(t);
  }, [mobileExpanded, items.length]);

  function toggle(i: number) {
    setOpenMap((prev) => {
      const nextOpen = !prev[i];
      if (nextOpen) {
        setTypeTrigger((tPrev) => ({ ...tPrev, [i]: (tPrev[i] || 0) + 1 }));
      }
      return { ...prev, [i]: nextOpen };
    });
  }

  return (
    <section id="faq" className="relative py-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* ✅ Liquid glass panel */}
        <div
          className={cx(
            "glass-card rounded-[34px] overflow-hidden relative",
            "transition-[max-height] duration-700 ease-out"
          )}
        >
          {/* left glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(520px 520px at 12% 28%, rgba(168,85,247,0.28), transparent 60%)",
            }}
          />
          <div className="glass-vignette pointer-events-none" />

          <div className="px-8 py-14 md:px-14 md:py-16">
            <div className="text-center">
              <div className="text-xs tracking-[0.35em] text-white/45 uppercase">
                ORIENT NET
              </div>
              <h2 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight">
                Keni ende pyetje?
              </h2>

              {/* ✅ mobile helper text */}
              <p className="mt-5 text-sm text-white/55 md:hidden">
                Kliko për pyetjet më të shpeshta.
              </p>
            </div>

            {/* ✅ MOBILE collapsed overlay click target */}
            <button
              type="button"
              className={cx(
                "md:hidden mt-8 w-full rounded-2xl",
                "border border-white/10 bg-white/0",
                "py-4 text-white/70 font-semibold",
                "transition hover:bg-white/5",
                mobileExpanded && "hidden"
              )}
              onClick={() => setMobileExpanded(true)}
            >
              Hap pyetjet
            </button>

            {/* =========================
                DESKTOP/TABLET: always visible grid
               ========================= */}
            <div className="hidden md:grid mt-12 gap-x-14 gap-y-8 md:grid-cols-2">
              {items.map((it, i) => {
                const open = !!openMap[i];
                const trig = typeTrigger[i] || 0;

                return (
                  <div key={it.q} className="border-b border-white/12 pb-6">
                    <button
                      type="button"
                      onClick={() => toggle(i)}
                      className="w-full flex items-center justify-between gap-6 text-left focus:outline-none"
                      aria-expanded={open}
                    >
                      <span
                        className={cx(
                          "text-lg md:text-xl font-extrabold",
                          open ? "text-orange-400" : "text-white"
                        )}
                      >
                        {it.q}
                      </span>
                      <span className="text-white/80">
                        <Chevron open={open} />
                      </span>
                    </button>

                    <div
                      className={cx(
                        "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-4 pr-6">
                          {open ? (
                            <TypedAnswer text={it.a} trigger={trig} />
                          ) : (
                            <p className="text-white/75 leading-relaxed">{it.a}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* =========================
                MOBILE: hidden until panel expanded + stagger reveal
               ========================= */}
            <div
              className={cx(
                "md:hidden mt-10",
                mobileExpanded ? "block" : "hidden"
              )}
            >
              <div className="space-y-6">
                {items.map((it, i) => {
                  const open = !!openMap[i];
                  const trig = typeTrigger[i] || 0;

                  const visible = i < revealCount;

                  return (
                    <div
                      key={it.q}
                      className={cx(
                        "border-b border-white/12 pb-5",
                        "transition-all duration-500 ease-out",
                        visible
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 -translate-y-2 pointer-events-none"
                      )}
                      style={{
                        transitionDelay: `${i * 40}ms`,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(i)}
                        className="w-full flex items-center justify-between gap-6 text-left focus:outline-none"
                        aria-expanded={open}
                      >
                        <span
                          className={cx(
                            "text-lg font-extrabold",
                            open ? "text-orange-400" : "text-white"
                          )}
                        >
                          {it.q}
                        </span>
                        <span className="text-white/80">
                          <Chevron open={open} />
                        </span>
                      </button>

                      <div
                        className={cx(
                          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="mt-3 pr-2">
                            {open ? (
                              <TypedAnswer text={it.a} trigger={trig} />
                            ) : (
                              <p className="text-white/75 leading-relaxed">{it.a}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* optional: small close button */}
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  className="text-xs font-semibold tracking-widest uppercase text-white/45 hover:text-white/70 transition"
                  onClick={() => {
                    setMobileExpanded(false);
                    setOpenMap({});
                  }}
                >
                  Mbyll
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* end panel */}
      </div>
    </section>
  );
}
