"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  durationMs?: number;
  onDone?: () => void;
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

// Soft elastic just for the final "settle"
function easeOutElasticSoft(t: number) {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// Deterministic formatting for SVG attrs to avoid hydration mismatches
const fmt = (n: number) => n.toFixed(3);

export default function IntroSplash({ durationMs = 2400, onDone }: Props) {
  // React state: only for text + mode indicator (NOT per-frame animation)
  const [speedLabel, setSpeedLabel] = useState("0 Mbps");
  const [lowPower, setLowPower] = useState(false);

  // Animation refs
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  // FPS tracking
  const lastFrameRef = useRef<number>(0);
  const emaFpsRef = useRef<number>(60);
  const lowStreakRef = useRef<number>(0);
  const highStreakRef = useRef<number>(0);

  // Visual update throttling (used in lowPower mode)
  const lastVisualCommitRef = useRef<number>(0);

  // SVG refs (animate without React re-render)
  const fillPathRef = useRef<SVGPathElement | null>(null);
  const needleGroupRef = useRef<SVGGElement | null>(null);
  const fillLenRef = useRef<number>(0);

  // Gauge geometry (static)
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;

  const startAngle = 140;
  const endAngle = 400;
  const sweep = endAngle - startAngle;

  const r = 110;
  const stroke = 14;
  const needleLen = 90;

  function polarToCartesian(angleDeg: number, radius: number) {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    const x = cx + radius * Math.cos(a);
    const y = cy + radius * Math.sin(a);
    return { x, y };
  }

  function describeArc(a0: number, a1: number, radius: number) {
    const start = polarToCartesian(a0, radius);
    const end = polarToCartesian(a1, radius);
    const largeArcFlag = a1 - a0 <= 180 ? "0" : "1";

    // IMPORTANT: sweep-flag = 1 to draw CLOCKWISE (matches needle direction)
    return `M ${fmt(start.x)} ${fmt(start.y)} A ${fmt(radius)} ${fmt(
      radius
    )} 0 ${largeArcFlag} 1 ${fmt(end.x)} ${fmt(end.y)}`;
  }

  // Static arc path for FULL sweep (animate fill using dashoffset)
  const arcD = useMemo(
    () => describeArc(startAngle, endAngle, r),
    [startAngle, endAngle, r]
  );

  // Static ticks
  const ticks = useMemo(() => {
    const majorTicks = 8;
    const minorPerMajor = 4;
    const arr: React.ReactElement[] = [];


    for (let i = 0; i <= majorTicks * minorPerMajor; i++) {
      const isMajor = i % minorPerMajor === 0;
      const tp = i / (majorTicks * minorPerMajor);
      const ang = startAngle + sweep * tp;

      const r1 = r + (isMajor ? 14 : 10);
      const r0 = r + (isMajor ? 30 : 22);

      const p0 = polarToCartesian(ang, r0);
      const p1 = polarToCartesian(ang, r1);

      arr.push(
        <line
          key={i}
          x1={fmt(p0.x)}
          y1={fmt(p0.y)}
          x2={fmt(p1.x)}
          y2={fmt(p1.y)}
          stroke={isMajor ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)"}
          strokeWidth={isMajor ? 2 : 1.5}
          strokeLinecap="round"
        />
      );
    }
    return arr;
  }, [startAngle, sweep, r]);

  // Static labels
  const labels = useMemo(() => {
    const labelStops = [
      { tp: 0, text: "0" },
      { tp: 0.25, text: "250" },
      { tp: 0.5, text: "500" },
      { tp: 0.75, text: "750" },
      { tp: 1, text: "1G" },
    ];

    return labelStops.map((s, idx) => {
      const ang = startAngle + sweep * s.tp;
      const pos = polarToCartesian(ang, r + 52);
      return (
        <text
          key={idx}
          x={fmt(pos.x)}
          y={fmt(pos.y)}
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
  }, [startAngle, sweep, r]);

  // After mount: compute path length for dash animation
  useEffect(() => {
    if (!fillPathRef.current) return;

    const len = fillPathRef.current.getTotalLength();
    fillLenRef.current = len;

    // Initialize dash settings
    fillPathRef.current.style.strokeDasharray = `${len}`;
    fillPathRef.current.style.strokeDashoffset = `${len}`; // 0% filled
  }, []);

  // Main animation loop (full refresh rate; adapts quality live)
  useEffect(() => {
    startRef.current = performance.now();
    lastFrameRef.current = startRef.current;
    lastVisualCommitRef.current = 0;

    // reset adaptive counters
    lowStreakRef.current = 0;
    highStreakRef.current = 0;
    emaFpsRef.current = 60;

    let lastTextCommit = 0;
    let doneCalled = false;

    const tick = (now: number) => {
      // FPS estimate
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;

      const instFps = dt > 0 ? 1000 / dt : 60;
      emaFpsRef.current = emaFpsRef.current * 0.9 + instFps * 0.1;

      // Adaptive switching with hysteresis:
      // - If FPS < 30 for ~10 frames -> lowPower
      // - If FPS >= 30 for ~30 frames -> power mode
      const fps = emaFpsRef.current;

      if (fps < 30) {
        lowStreakRef.current += 1;
        highStreakRef.current = 0;
      } else {
        highStreakRef.current += 1;
        lowStreakRef.current = 0;
      }

      // Switch to lowPower faster, return to highPower slower (stability)
      if (!lowPower && lowStreakRef.current >= 10) {
        setLowPower(true);
      }
      if (lowPower && highStreakRef.current >= 30) {
        setLowPower(false);
      }

      // Progress
      const t = clamp((now - startRef.current) / durationMs, 0, 1);

      const shaped =
        t < 0.08
          ? easeOutCubic(t / 0.08) * 0.12
          : t < 0.78
          ? 0.12 + easeInOut((t - 0.08) / 0.7) * 0.78
          : 0.9 + easeOutCubic((t - 0.78) / 0.22) * 0.1;

      let p = clamp(shaped, 0, 1);

      // Subtle elastic settle near the end (high-power only)
      if (!lowPower && t > 0.92) {
        const localT = (t - 0.92) / 0.08; // last 8%
        const elastic = easeOutElasticSoft(clamp(localT, 0, 1));
        // overshoot by max ~2.5%, then settle back
        p = Math.min(1.025, 1 + (elastic - 1) * 0.025);
      }

      // Visual commit:
      // - Power mode: update every rAF (60/90/120Hz)
      // - Low power: cap visual updates ~30fps
      const minVisualDelta = lowPower ? 33 : 0; // ms
      if (
        minVisualDelta === 0 ||
        now - lastVisualCommitRef.current >= minVisualDelta ||
        t === 1
      ) {
        lastVisualCommitRef.current = now;

        // Arc fill via dashoffset
        const len = fillLenRef.current;
        if (fillPathRef.current && len > 0) {
          const off = (1 - clamp(p, 0, 1)) * len;
          fillPathRef.current.style.strokeDashoffset = `${off}`;
        }

        // Needle rotation
        if (needleGroupRef.current) {
          const deg = startAngle + sweep * clamp(p, 0, 1);
          needleGroupRef.current.setAttribute(
            "transform",
            `rotate(${fmt(deg)} ${fmt(cx)} ${fmt(cy)})`
          );
        }
      }

      // Text commit (no need ultra high fps)
      const minTextDelta = lowPower ? 80 : 50;
      if (now - lastTextCommit >= minTextDelta || t === 1) {
        lastTextCommit = now;
        const mbps = Math.round(clamp(p, 0, 1) * 1000);
        const label =
          mbps >= 900 ? `${(mbps / 1000).toFixed(1)} Gbps` : `${mbps} Mbps`;
        setSpeedLabel(label);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!doneCalled) {
        doneCalled = true;
        // tiny hold at max so it "lands" before exiting
        const holdMs = lowPower ? 80 : 140;
        window.setTimeout(() => onDone?.(), holdMs);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, onDone]);

  // Filters: heavy glow disabled in lowPower
  const glowFilter = lowPower ? undefined : "url(#glowCyan)";
  const needleStroke = lowPower ? 2.5 : 3.5;
  const needleColor = lowPower
    ? "rgba(255,255,255,0.65)"
    : "rgba(255,255,255,0.92)";

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
                <feGaussianBlur
                  stdDeviation={lowPower ? "2" : "4"}
                  result="blur"
                />
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
            <circle
              cx={fmt(cx)}
              cy={fmt(cy)}
              r={fmt(92)}
              fill="url(#centerGlow)"
            />

            {/* ticks + labels */}
            <g>{ticks}</g>
            <g>{labels}</g>

            {/* background arc */}
            <path
              d={arcD}
              fill="none"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={stroke}
              strokeLinecap="round"
            />

            {/* filled arc (animated via dashoffset) */}
            <path
              ref={fillPathRef}
              d={arcD}
              fill="none"
              stroke="url(#arcGrad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              filter={glowFilter}
            />

            {/* needle (always visible; enhanced on high power) */}
            <g
              ref={needleGroupRef}
              transform={`rotate(${fmt(startAngle)} ${fmt(cx)} ${fmt(cy)})`}
            >
              <line
                x1={fmt(cx)}
                y1={fmt(cy)}
                x2={fmt(cx)}
                y2={fmt(cy - needleLen)}
                stroke={needleColor}
                strokeWidth={needleStroke}
                strokeLinecap="round"
                filter={glowFilter}
              />
              {!lowPower && (
                <line
                  x1={fmt(cx)}
                  y1={fmt(cy)}
                  x2={fmt(cx)}
                  y2={fmt(cy - needleLen)}
                  stroke="rgba(39,188,216,0.55)"
                  strokeWidth={1}
                  strokeLinecap="round"
                />
              )}
            </g>

            <circle
              cx={fmt(cx)}
              cy={fmt(cy)}
              r={fmt(10)}
              fill="rgba(39,188,216,0.9)"
              filter={glowFilter}
            />
            <circle
              cx={fmt(cx)}
              cy={fmt(cy)}
              r={fmt(4.5)}
              fill="rgba(0,0,0,0.55)"
            />
          </svg>

          {/* Center readout */}
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-white/60 text-xs tracking-[0.22em] uppercase">
                SHPEJTESI
              </div>

              <div className="mt-2 text-4xl sm:text-5xl font-extrabold">
                <span className="text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
                  {speedLabel}
                </span>
              </div>

              <div className="mt-2 text-white/45 text-xs">100 Mbps → 1 GBps</div>

              {lowPower && (
                <div className="mt-2 text-white/30 text-[10px] tracking-wider uppercase">
                  FPS
                </div>
              )}
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
