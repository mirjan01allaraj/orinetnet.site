"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  durationMs?: number; // total time before auto-close
  onDone?: () => void;
};

function cx(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(!!mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  return reduced;
}

function Ring({ p }: { p: number }) {
  // p: 0..1
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(c, c * p));
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="4"
      />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="rgba(39,188,216,0.95)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}

export default function IntroSplash({ durationMs = 2200, onDone }: Props) {
  const reduced = usePrefersReducedMotion();

  const [phase, setPhase] = useState<"in" | "out">("in");
  const [progress, setProgress] = useState(0);

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const doneRef = useRef(false);

  const particles = useMemo(() => {
    // deterministic-ish random layout (but only on client; splash is client-only)
    const count = 22;
    return Array.from({ length: count }).map((_, i) => {
      const size = 3 + Math.random() * 10;
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const dur = 3.8 + Math.random() * 4.2;
      const delay = Math.random() * 1.6;
      const drift = 14 + Math.random() * 26;
      const alpha = 0.12 + Math.random() * 0.22;
      const isBrand = i % 3 !== 0; // more turquoise than white
      return { size, left, top, dur, delay, drift, alpha, isBrand };
    });
  }, []);

  useEffect(() => {
    if (reduced) {
      // minimal: show briefly then fade
      const t1 = window.setTimeout(() => setPhase("out"), Math.max(350, durationMs - 450));
      const t2 = window.setTimeout(() => {
        if (doneRef.current) return;
        doneRef.current = true;
        onDone?.();
      }, durationMs);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }

    startRef.current = performance.now();

    const tick = (t: number) => {
      const elapsed = t - startRef.current;
      const p = Math.max(0, Math.min(1, elapsed / durationMs));
      setProgress(p);

      // start fade-out near end
      if (p >= 0.82 && phase !== "out") setPhase("out");

      if (p >= 1) {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, onDone, reduced]);

  return (
    <div
      className={cx(
        "fixed inset-0 z-[100] grid place-items-center",
        "bg-[var(--bg)]",
        phase === "out" ? "animate-introFadeOut" : "animate-introFadeIn"
      )}
      aria-label="Intro splash"
      role="dialog"
      aria-modal="true"
    >
      {/* Background: soft glows + grid + scanline */}
      <div className="absolute inset-0 pointer-events-none">
        {/* glow blobs */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(900px 540px at 30% 20%, rgba(39,188,216,0.22), transparent 60%)," +
              "radial-gradient(700px 520px at 70% 70%, rgba(168,85,247,0.16), transparent 60%)," +
              "radial-gradient(800px 460px at 60% 10%, rgba(255,255,255,0.06), transparent 55%)",
          }}
        />

        {/* neon grid */}
        <div className="absolute inset-0 opacity-[0.32] bg-introGrid" />

        {/* scanline */}
        {!reduced && <div className="absolute inset-0 bg-introScanline opacity-[0.18]" />}

        {/* fine noise */}
        <div className="absolute inset-0 bg-introNoise opacity-[0.08]" />

        {/* floating particles */}
        {!reduced &&
          particles.map((p, idx) => (
            <span
              key={idx}
              className="absolute rounded-full blur-[1px]"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.isBrand ? "rgba(39,188,216,1)" : "rgba(255,255,255,1)",
                opacity: p.alpha,
                boxShadow: p.isBrand
                  ? "0 0 18px rgba(39,188,216,0.55)"
                  : "0 0 18px rgba(255,255,255,0.25)",
                animation: `introFloat ${p.dur}s ease-in-out ${p.delay}s infinite`,
                transform: `translateY(${p.drift}px)`,
              }}
            />
          ))}
      </div>

      {/* Center: glass card */}
      <div
        className={cx(
          "relative w-[min(560px,92vw)] rounded-[28px] overflow-hidden",
          "border border-white/10",
          "bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150",
          "shadow-[0_40px_140px_rgba(0,0,0,0.75)]"
        )}
      >
        {/* stroke overlay */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-introStroke opacity-90" />
          <div className="absolute inset-0 bg-introVignette opacity-90" />
        </div>

        <div className="relative z-10 px-7 py-8 md:px-10 md:py-10">
          {/* mini top label */}
          <div className="text-[11px] tracking-[0.35em] uppercase text-white/45">
            ORIENT GROUP
          </div>

          {/* Logo */}
          <div className="mt-5">
            <div className={cx("text-4xl md:text-5xl font-extrabold leading-none", !reduced && "animate-introGlowPulse")}>
              <span className="text-white">ORIENT</span>{" "}
              <span className="text-[var(--brand)] drop-shadow-[0_0_24px_rgba(39,188,216,0.65)]">
                NET
              </span>
            </div>

            {/* subtle tech subtitle */}
            <div className="mt-3 text-white/55 text-sm md:text-base max-w-[52ch]">
              Fiber optike • Stabilitet • Suport 24/7
            </div>
          </div>

          {/* Divider */}
          <div className="mt-7 h-px w-full bg-white/10" />

          {/* Bottom row: “initializing” + ring */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-white/80 font-semibold tracking-wide">
                Initializing network layer…
              </div>
              <div className="mt-1 text-xs text-white/45">
                {Math.round(progress * 100)}% • secure handshake
              </div>

              {/* progress bar (soft) */}
              <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(progress * 100)}%`,
                    background:
                      "linear-gradient(90deg, rgba(39,188,216,0.2), rgba(39,188,216,0.95), rgba(255,255,255,0.25))",
                    boxShadow: "0 0 30px rgba(39,188,216,0.35)",
                    transition: "width 120ms linear",
                  }}
                />
              </div>
            </div>

            {/* ring */}
            <div className="shrink-0">
              <div className="grid place-items-center rounded-2xl border border-white/10 bg-black/20 p-2">
                <Ring p={progress} />
              </div>
            </div>
          </div>
        </div>

        {/* bottom neon edge */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-introEdge" />
      </div>

      {/* Local CSS (scoped) */}
      <style jsx>{`
        .bg-introGrid {
          background-image:
            linear-gradient(rgba(39,188,216,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(39,188,216,0.10) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: radial-gradient(circle at 50% 45%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
        }

        .bg-introStroke {
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.18),
            rgba(255,255,255,0.06) 35%,
            rgba(39,188,216,0.12) 60%,
            rgba(255,255,255,0.07)
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          padding: 1px;
          border-radius: 28px;
        }

        .bg-introVignette {
          background:
            radial-gradient(700px 260px at 50% 0%, rgba(39,188,216,0.12), transparent 62%),
            radial-gradient(600px 320px at 50% 110%, rgba(0,0,0,0.55), transparent 65%);
        }

        .bg-introEdge {
          background: linear-gradient(
            90deg,
            rgba(39,188,216,0),
            rgba(39,188,216,0.95),
            rgba(255,255,255,0.15),
            rgba(39,188,216,0.95),
            rgba(39,188,216,0)
          );
          filter: blur(0.2px);
        }

        .bg-introNoise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E");
          background-size: 220px 220px;
          mix-blend-mode: overlay;
        }

        .bg-introScanline {
          background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.08),
            rgba(255,255,255,0.08) 1px,
            transparent 1px,
            transparent 8px
          );
          animation: introScan 2.6s linear infinite;
          mask-image: radial-gradient(circle at 50% 35%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
        }

        @keyframes introScan {
          0% { transform: translateY(-10px); }
          100% { transform: translateY(10px); }
        }

        @keyframes introFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
        }

        /* Fade in/out wrapper */
        :global(.animate-introFadeIn) {
          animation: introFadeIn 260ms ease-out forwards;
        }
        :global(.animate-introFadeOut) {
          animation: introFadeOut 520ms ease-in forwards;
        }
        @keyframes introFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes introFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* Logo pulse (subtle) */
        :global(.animate-introGlowPulse) {
          animation: introGlowPulse 1.7s ease-in-out infinite;
        }
        @keyframes introGlowPulse {
          0%, 100% {
            filter: drop-shadow(0 0 0 rgba(39,188,216,0.0));
            transform: translateY(0px);
          }
          50% {
            filter: drop-shadow(0 0 18px rgba(39,188,216,0.18));
            transform: translateY(-1px);
          }
        }
      `}</style>
    </div>
  );
}
