"use client";

import { useEffect, useState } from "react";

export default function IntroSplash({
  durationMs = 2200,
  onDone,
}: {
  durationMs?: number;
  onDone: () => void;
}) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setFade(true), durationMs - 450);
    const t2 = window.setTimeout(() => onDone(), durationMs);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [durationMs, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] grid place-items-center bg-[var(--bg)] transition-opacity duration-500 ${
        fade ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className="text-center px-6">
        <div className="text-xs tracking-[0.35em] text-white/50 uppercase">
          ORIENT GROUP
        </div>

        <div className="mt-4 text-5xl font-extrabold tracking-tight">
          <span className="text-white">ORIENT</span>{" "}
          <span className="text-[var(--brand)]">NET</span>
        </div>

        <div className="mt-4 text-white/60 text-sm">
          Duke u ngarkuar...
        </div>
      </div>
    </div>
  );
}
