"use client";

import { useMemo, useState } from "react";

type Devices = {
  gaming: boolean;
  tvpc: boolean;
  camera: boolean;
};

function TogglePill({
  checked,
  onChange,
  label,
  color,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  color: string;
  disabled?: boolean;
}) {
  const glow =
    checked && !disabled
      ? {
          borderColor: `color-mix(in srgb, ${color} 75%, transparent)`,
          boxShadow: `
            0 0 0 2px color-mix(in srgb, ${color} 45%, transparent),
            0 0 40px color-mix(in srgb, ${color} 35%, transparent),
            0 0 90px color-mix(in srgb, ${color} 18%, transparent)
          `,
        }
      : {};

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      aria-pressed={checked}
      aria-disabled={disabled}
      disabled={disabled}
      className={[
        "relative inline-flex items-center gap-3",
        "px-4 sm:px-5 py-3 rounded-full",
        "border transition-all duration-300 select-none",
        disabled
          ? "cursor-not-allowed opacity-40 bg-black/20 border-white/5"
          : "cursor-pointer bg-black/25 border-white/10 hover:border-white/20",
        "active:scale-[0.98]",
      ].join(" ")}
      style={glow}
    >
      <span
        className="absolute inset-0 rounded-full transition-all duration-300"
        style={{
          background:
            checked && !disabled
              ? `linear-gradient(90deg, ${color}55, ${color}AA)`
              : "transparent",
          opacity: checked && !disabled ? 1 : 0,
        }}
        aria-hidden="true"
      />

      <span
        className="relative z-10 inline-flex items-center justify-center w-7 h-7 rounded-full border"
        style={{
          borderColor: disabled
            ? "rgba(255,255,255,0.15)"
            : checked
            ? `color-mix(in srgb, ${color} 70%, transparent)`
            : "rgba(255,255,255,0.2)",
          background: disabled
            ? "rgba(0,0,0,0.3)"
            : checked
            ? `color-mix(in srgb, ${color} 25%, rgba(0,0,0,0.35))`
            : "rgba(0,0,0,0.25)",
          boxShadow: checked && !disabled ? `0 0 18px ${color}80` : "none",
        }}
      >
        <span
          className="font-black text-sm"
          style={{
            color: disabled
              ? "rgba(255,255,255,0.35)"
              : checked
              ? "#0b0c10"
              : "rgba(255,255,255,0.6)",
          }}
        >
          ✓
        </span>
      </span>

      <span className="relative z-10 font-extrabold tracking-wide text-sm sm:text-base">
        {label}
      </span>
    </button>
  );
}

export default function PlanRecommender({
  onRecommend,
  showHeader = true,
}: {
  onRecommend: (slug: string) => void;
  showHeader?: boolean;
}) {
  const [users, setUsers] = useState<string>("");
  const [devices, setDevices] = useState<Devices>({
    gaming: false,
    tvpc: false,
    camera: false,
  });

  const isPremiumOrBiznes = users === "premium" || users === "biznes";

  const recommendedSlug = useMemo(() => {
    if (users === "premium" || users === "biznes") return "premium";

    let score = {
      standarte: 0,
      smart: 4,
      turbo: 0,
      ultra: 0,
      premium: 0,
    };

    if (users === "1-3") {
      score.smart += 2;
      score.standarte += 1;
      if (devices.gaming) score.turbo += 3;
      if (devices.tvpc) score.smart += 2;
      if (devices.camera) score.smart += 1;
    } else if (users === "4-7") {
      score.smart += 2;
      score.turbo += 2;
      if (devices.gaming) score.turbo += 3;
      if (devices.tvpc) score.turbo += 2;
      if (devices.camera) score.ultra += 2;
    } else {
      if (devices.gaming) score.turbo += 2;
      if (devices.camera) score.ultra += 1;
    }

    const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0];
    return (best as string) || "smart";
  }, [users, devices]);

  function handleSubmit() {
    const nothingSelected =
      !users && !devices.gaming && !devices.tvpc && !devices.camera;

    const slug = nothingSelected ? "smart" : recommendedSlug;
    onRecommend(slug);
  }

  return (
    <section id="plan-recommender" className="relative py-20">
      <div className="max-w-6xl mx-auto px-6 text-center">
        {showHeader && (
          <>
            <p className="text-sm text-[var(--muted)]">
              <span className="text-[var(--brand)] font-semibold">Orient Net</span>, pjesë e{" "}
              <span className="text-[var(--brand)] font-semibold">ORIENT GROUP</span> — të parët në Shqipëri që
              përdorim{" "}
              <span className="text-[var(--brand)] font-semibold">Inteligjencën Artificiale (AI)</span> për të
              rekomanduar planet më të përshtatshme sipas nevojave të klientit.
            </p>

            <h2 className="mt-8 text-4xl md:text-6xl font-extrabold tracking-tight uppercase">
              SI TË ZGJIDHNI OFERTËN QË JU PËRSHTATET MË SHUMË?
            </h2>
          </>
        )}

        <div className={showHeader ? "mt-10" : "mt-2"}>
          <div className="text-lg font-semibold">
            Sa përdorues keni në shtëpi shumicën e kohës?
          </div>

          <div className="mt-3 flex justify-center">
            <select
              value={users}
              onChange={(e) => setUsers(e.target.value)}
              className="w-[320px] md:w-[380px] rounded-xl bg-black/35 border border-[var(--brand)]/60 px-5 py-4 outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
            >
              <option value="">Zgjidh këtu …</option>
              <option value="1-3">1–3</option>
              <option value="4-7">4–7</option>
              <option value="premium">👑 Premium</option>
              <option value="biznes">💼 Biznes</option>
            </select>
          </div>

          {isPremiumOrBiznes && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--muted)]">
              <span className="text-[var(--brand)]">💡</span>
              <span>
                Për paketat <strong>Biznes</strong> dhe <strong>Premium</strong>, zgjedhja e pajisjeve nuk aplikohet.
              </span>
            </div>
          )}

          <div className="mt-12 text-xl font-bold">
            Zgjidhni pajisjet e tjera që përdorni rregullisht në shtëpi
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-10">
            <TogglePill
              checked={devices.gaming}
              onChange={(v) => setDevices((d) => ({ ...d, gaming: v }))}
              label="Playstation / Xbox"
              color="#ff8a00"
              disabled={isPremiumOrBiznes}
            />
            <TogglePill
              checked={devices.tvpc}
              onChange={(v) => setDevices((d) => ({ ...d, tvpc: v }))}
              label="Smart TV / Desktop PC"
              color="#27bcd8"
              disabled={isPremiumOrBiznes}
            />
            <TogglePill
              checked={devices.camera}
              onChange={(v) => setDevices((d) => ({ ...d, camera: v }))}
              label="Kamera / Pajisje të tjera"
              color="#b26bff"
              disabled={isPremiumOrBiznes}
            />
          </div>

          <button
            onClick={handleSubmit}
            className="mt-10 px-10 py-4 rounded-2xl font-extrabold tracking-widest uppercase bg-[var(--brand)] text-black shadow-[0_0_45px_rgba(39,188,216,0.35)] hover:opacity-95"
          >
            SHFAQ OFERTËN IDEALE
          </button>
        </div>
      </div>
    </section>
  );
}
