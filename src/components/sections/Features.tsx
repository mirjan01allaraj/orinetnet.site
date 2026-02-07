"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Feature = {
  title: string;
  desc: string;
};

const FEATURES: Feature[] = [
  { title: "Fiber Optik", desc: "Lidhje e qëndrueshme dhe shpejtësi reale." },
  { title: "Router Dual-Band", desc: "2.4G & 5G për mbulim dhe performancë." },
  { title: "Suport 24/7", desc: "Ndihmë teknike kur të duhet." },
  { title: "Instalim Falas", desc: "Aktivizim i shpejtë pa kosto instalimi." },
  { title: "Zgjidhje Biznesi", desc: "Paketa të personalizuara + opsione profesionale." },
  { title: "Stabilitet", desc: "Rrjet i monitoruar për të reduktuar problemet." },
];

function cx(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}

export default function Features() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  // ===== MOBILE slider refs/state =====
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedRef = useRef(false);

  const [page, setPage] = useState(0); // 0..2

  // Build 3 pages: each page shows 1 card per row (2 rows)
  const pages = useMemo(() => {
    return [
      { top: FEATURES[0], bottom: FEATURES[3] },
      { top: FEATURES[1], bottom: FEATURES[4] },
      { top: FEATURES[2], bottom: FEATURES[5] },
    ];
  }, []);

  // ===== DESKTOP entrance observer (keep your animation logic) =====
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const mq = window.matchMedia("(min-width: 1024px)");
    if (!mq.matches) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ===== helpers =====
  function clearAuto() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }
  function clearResumeTimeout() {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }

  function scrollToPage(nextPage: number, behavior: ScrollBehavior = "smooth") {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const width = scroller.clientWidth || 1;
    scroller.scrollTo({ left: width * nextPage, behavior });
  }

  function pauseFor(ms = 5000) {
    isPausedRef.current = true;
    clearAuto();
    clearResumeTimeout();

    resumeTimeoutRef.current = setTimeout(() => {
      isPausedRef.current = false;
      startAuto();
    }, ms);
  }

  function startAuto() {
    clearAuto();
    const scroller = scrollerRef.current;
    if (!scroller) return;

    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;

      setPage((prev) => {
        const next = (prev + 1) % 3;
        scrollToPage(next, "smooth");
        return next;
      });
    }, 5000);
  }

  // ===== MOBILE init + keep dots synced with scroll =====
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const onResize = () => scrollToPage(page, "auto");

    const onScroll = () => {
      const width = scroller.clientWidth || 1;
      const idx = Math.round(scroller.scrollLeft / width);
      const clamped = Math.max(0, Math.min(2, idx));
      setPage(clamped);
    };

    scrollToPage(0, "auto");
    startAuto();

    window.addEventListener("resize", onResize);
    scroller.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      scroller.removeEventListener("scroll", onScroll as any);
      clearAuto();
      clearResumeTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== pause interactions =====
  function handlePointerDown() {
    isPausedRef.current = true;
    clearAuto();
    clearResumeTimeout();
  }
  function handlePointerUp() {
    pauseFor(5000);
  }
  function handleClickPause() {
    pauseFor(5000);
  }

  // ===== shared card (uses same glass as Paketat) =====
  function GlassFeatureCard({ f }: { f: Feature }) {
    return (
      <div className="glass-card glass-hover feature-glass-card">
        <div className="glass-vignette" aria-hidden="true" />
        <div className="feature-checkbox-mobile" aria-hidden="true" />
        <div className="mt-10">
          <div className="text-xl font-extrabold text-white">{f.title}</div>
          <div className="mt-2 text-white/85 font-medium">{f.desc}</div>
        </div>
      </div>
    );
  }

  return (
    <section
      ref={sectionRef as any}
      className={cx("relative py-16", inView && "features-inview")}
      id="features"
    >
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-extrabold">Pse ORIENT NET?</h2>
        <p className="text-[var(--muted)] mt-2">
          Shërbim i fokusuar te cilësia dhe eksperienca e klientit.
        </p>

        {/* =========================
            DESKTOP GRID (animated) - KEEP ANIMATION
           ========================= */}
        <div className="hidden lg:grid mt-10 grid-cols-3 gap-6">
          {FEATURES.map((f, idx) => (
            <div
              key={f.title}
              className={cx(
                "feature-card glass-card glass-hover",
                idx === 0 ? "feature-drop" : "feature-slide"
              )}
              style={
                {
                  ["--card-delay" as any]: `${idx}s`,
                  ["--check-delay" as any]: `${6 + idx * 0.25}s`,
                } as React.CSSProperties
              }
            >
              <div className="glass-vignette" aria-hidden="true" />
              <div className="feature-checkbox" aria-hidden="true" />

              <div className="mt-10">
                <div className="text-xl font-extrabold text-white">{f.title}</div>
                <div className="mt-2 text-white/85 font-medium">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* =========================
            MOBILE: 3 pages snap (1 card per row)
           ========================= */}
        <div className="lg:hidden mt-10">
          <div
            ref={scrollerRef}
            className="feature-snap-scroller"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchEnd={handlePointerUp}
            onClick={handleClickPause}
          >
            {pages.map((pg, i) => (
              <div key={i} className="feature-snap-page">
                <GlassFeatureCard f={pg.top} />
                <GlassFeatureCard f={pg.bottom} />
              </div>
            ))}
          </div>

          {/* Dots (synced) */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className={cx("feature-dot", page === 0 && "is-active")} />
            <span className={cx("feature-dot", page === 1 && "is-active")} />
            <span className={cx("feature-dot", page === 2 && "is-active")} />
          </div>
        </div>
      </div>
    </section>
  );
}
