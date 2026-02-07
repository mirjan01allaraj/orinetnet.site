"use client";

import { useEffect, useRef, useState } from "react";

const PILL_ITEMS = [
  { label: "Instalim FALAS", color: "#27bcd8" }, // cyan
  { label: "Wi-Fi Dual-Band", color: "#a855f7" }, // purple
  { label: "Suport 24/7", color: "#f97316" }, // orange
  { label: "Fiber Optike", color: "#22c55e" }, // green
];

type Phase = "filling" | "hold";

export default function PillSweepRow({
  fillMs = 700,
  holdMs = 1000,
}: {
  fillMs?: number;
  holdMs?: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fillingIndex, setFillingIndex] = useState<number | null>(0);
  const [drainingIndex, setDrainingIndex] = useState<number | null>(null);

  // refs to avoid stale state closures
  const activeRef = useRef(0);
  const phaseRef = useRef<Phase>("filling");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    function tick() {
      const prev = activeRef.current;
      const next = (prev + 1) % PILL_ITEMS.length;

      if (phaseRef.current === "filling") {
        // next fills while prev drains
        setDrainingIndex(prev);
        setFillingIndex(next);

        // switch active immediately (so the "top glow" logic follows the next)
        setActiveIndex(next);
        activeRef.current = next;

        // after fill finishes -> hold
        clearTimer();
        timerRef.current = setTimeout(() => {
          setFillingIndex(null);
          setDrainingIndex(null);
          phaseRef.current = "hold";
          tick();
        }, fillMs);

        return;
      }

      // HOLD phase: keep the active pill fully filled for holdMs
      clearTimer();
      timerRef.current = setTimeout(() => {
        phaseRef.current = "filling";
        tick();
      }, holdMs);
    }

    // start with pill 0 filling, then hold, then loop
    clearTimer();
    setFillingIndex(0);
    setDrainingIndex(null);
    setActiveIndex(0);
    activeRef.current = 0;
    phaseRef.current = "filling";

    timerRef.current = setTimeout(() => {
      setFillingIndex(null);
      phaseRef.current = "hold";
      tick();
    }, fillMs);

    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillMs, holdMs]);

  return (
    <div className="mt-7 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
      {PILL_ITEMS.map((item, idx) => {
        const isFilling = idx === fillingIndex;
        const isDraining = idx === drainingIndex;
        const isFilled = idx === activeIndex && !isFilling && !isDraining; // during hold

        return (
          <div
            key={item.label}
            className={[
              "pill-liquid",
              "px-3 py-2 rounded-xl",
              isFilling ? "filling" : "",
              isFilled ? "filled" : "",
              isDraining ? "draining" : "",
            ].join(" ")}
            style={
              {
                ["--pill" as any]: item.color,
                ["--fill-ms" as any]: `${fillMs}ms`,
              } as React.CSSProperties
            }
          >
            <span
              className={
                isFilling || isFilled || isDraining
                  ? "text-white font-semibold"
                  : "text-white/80"
              }
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
