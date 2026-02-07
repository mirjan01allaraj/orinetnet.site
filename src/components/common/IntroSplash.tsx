"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  durationMs?: number; // total splash duration
  onDone?: () => void; // called when animation ends
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function IntroSplash({ durationMs = 2400, onDone }: Props) {
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  // 0..1 progress of the gauge
  const [p, setP] = useState(0);

  useEffect(() => {
    startRef.current = performance.now();

    const tick = (now: number) => {
      const t = clamp((now - startRef.current) / durationMs, 0, 1);

      // Hold a tiny bit at start, then accelerate like a “speed test”
      const shaped =
        t < 0.08
          ? easeOutCubic(t / 0.08) * 0.12
          : t < 0.78
          ? 0.12 + easeInOut((t - 0.08) / 0.7) * 0.78
          : 0.90 + easeOutCubic((t - 0.78) / 0.22) * 0.10;

      setP(clamp(shaped, 0, 1));

      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else onDone?.();
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [durationMs, onDone]);

  // speed from 0..1000 Mbps (== 1 Gbps)
  const speedMbps = useMemo(() => Math.round(p * 1000), [p]);

  const speedLabel = useMemo(() => {
    // switch to Gbps near the end (feels premium)
    if (speedMbps >= 900) return `${(speedMbps / 1000).toFixed(1)} Gbps`;
    return `${speedMbps} Mbps`;
  }, [speedMbps]);

  // Gauge geometry
  const size = 320; // base viewbox
  const cx = size / 2;
  const cy = size / 2;

  // Make it a speedometer: not full circle (e.g. 260° sweep)
  const startAngle = 140; // degrees
  const endAngle = 400; // 140 + 260
  const sweep = endAngle - startAngle;

  const r = 110;
  const stroke = 14;

  function polarToCartesian(angleDeg: number, radius: number) {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  }

  function describeArc(a0: number, a1: number, radius: number) {
    const start = polarToCartesian(a1, radius);
    const end = polarToCartesian(a0, radius);
    const largeArcFlag = a1 - a0 <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  const arcBg = describeArc(startAngle, endAngle, r);
  const arcFill = describeArc(startAngle, startAngle + sweep * p, r);

  // Needle
  const needleAngle = startAngle + sweep * p;
  const needleLen = 90;
  const needle = polarToCartesian(needleAngle, needleLen);

  // ticks
  const majorTicks = 8; // shows 0..1Gbps nicely
  const minorPerMajor = 4;

  const ticks = [];
  for (let i = 0; i <= majorTicks * minorPerMajor; i++) {
    const isMajor = i % minorPerMajor === 0;
    const tp = i / (majorTicks * minorPerMajor);
    const ang = startAngle + sweep * tp;

    const r1 = r + (isMajor ? 14 : 10);
    const r0 = r + (isMajor ? 30 : 22);
    const p0 = polarToCartesian(ang, r0);
    const p1 = polarToCartesian(ang, r1);

    ticks.push(
      <line
        key={i}
        x1={p0.x}
        y1={p0.y}
        x2={p1.x}
        y2={p1.y}
        stroke={isMajor ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)"}
        strokeWidth={isMajor ? 2 : 1.5}
        strokeLinecap="round"
      />
    );
  }

  // labels (0, 250, 500, 750, 1G)
  const labelStops = [
    { tp: 0, text: "0" },
    { tp: 0.25, text: "250" },
    { tp: 0.5, text: "500" },
    { tp: 0.75, text: "750" },
    { tp: 1, text: "1G" },
  ];

  const labels = labelStops.map((s, idx) => {
    const ang = startAngle + sweep * s.tp;
    const pos = polarToCartesian(ang, r + 52);
    return (
      <text
        key={idx}
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        fontWeight={700}
        fill="rgba(255,255,255,0.55)"
      >
        {s.text}
      </text>
    );
  });

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center"
      style={{
        background:
          "radial-gradient(900px 500px at 20% 10%, rgba(39,188,216,.22), transparent 60%)," +
          "radial-gradient(900px 500px at 80% 20%, rgba(39,188,216,.12), transparent 55%)," +
          "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(11,12,16,1))",
      }}
    >
      <div className="relative w-full max-w-[520px] px-6">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="text-[13px] tracking-[0.35em] uppercase text-white/45">
            ORIENT GROUP
          </div>
          <div className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="text-white">ORIENT</span>{" "}
            <span className="text-[var(--brand)]">NET</span>
          </div>
        </div>

        {/* Big speed meter */}
        <div className="relative mx-auto w-[320px] max-w-full aspect-square">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
            <defs>
              <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="
                    1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 0.9 0"
                  result="glow"
                />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(39,188,216,0.45)" />
                <stop offset="55%" stopColor="rgba(39,188,216,0.95)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.7)" />
              </linearGradient>

              <radialGradient id="centerGlow" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="rgba(39,188,216,0.28)" />
                <stop offset="60%" stopColor="rgba(39,188,216,0.08)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
            </defs>

            {/* soft inner glow */}
            <circle cx={cx} cy={cy} r={92} fill="url(#centerGlow)" />

            {/* ticks + labels */}
            <g>{ticks}</g>
            <g>{labels}</g>

            {/* background arc */}
            <path
              d={arcBg}
              fill="none"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={stroke}
              strokeLinecap="round"
            />

            {/* filled arc */}
            <path
              d={arcFill}
              fill="none"
              stroke="url(#arcGrad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              filter="url(#glowCyan)"
            />

            {/* needle */}
            <line
              x1={cx}
              y1={cy}
              x2={needle.x}
              y2={needle.y}
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={3}
              strokeLinecap="round"
              filter="url(#glowCyan)"
            />
            <circle
              cx={cx}
              cy={cy}
              r={10}
              fill="rgba(39,188,216,0.9)"
              filter="url(#glowCyan)"
            />
            <circle cx={cx} cy={cy} r={4.5} fill="rgba(0,0,0,0.55)" />
          </svg>

          {/* Center readout */}
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-white/60 text-xs tracking-[0.22em] uppercase">
                Speed Test
              </div>
              <div className="mt-2 text-4xl sm:text-5xl font-extrabold">
                <span className="text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
                  {speedLabel}
                </span>
              </div>
              <div className="mt-2 text-white/45 text-xs">
                0 Mbps → 1 Gbps
              </div>
            </div>
          </div>
        </div>

        {/* tiny loading hint */}
        <div className="mt-8 text-center text-white/40 text-xs">
          Po ngarkohet…
        </div>

        {/* subtle bottom glow */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-10 h-20 w-[80%] blur-2xl opacity-70"
          style={{ background: "rgba(39,188,216,0.18)" }}
        />
      </div>
    </div>
  );
}
