"use client";

import { useEffect, useMemo, useRef } from "react";
import { getPlans, getPricingMeta } from "@/lib/content";
import { formatALL } from "@/lib/money";

function CheckIcon() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/15 border border-orange-500/35">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 6L9 17l-5-5"
          stroke="rgb(249 115 22)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function cx(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}

export default function Plans({
  showTitle = true,
  recommendedSlug,
}: {
  showTitle?: boolean;
  recommendedSlug?: string | null;
}) {
  const plans = getPlans();
  const meta = getPricingMeta();

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const recommendedPlanName = useMemo(() => {
    if (!recommendedSlug) return null;
    return plans.find((p) => p.slug === recommendedSlug)?.name || null;
  }, [recommendedSlug, plans]);

  // When recommendation changes:
  // 1) scroll to offers section
  // 2) mobile: center the recommended card in horizontal swipe
  useEffect(() => {
    if (!recommendedSlug) return;

    // ✅ CHANGED: offers -> plans
    const section = document.getElementById("plans");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });

    const t = window.setTimeout(() => {
      const card = document.querySelector<HTMLElement>(
        `[data-plan="${recommendedSlug}"]`
      );
      if (!card) return;

      const isMobile = window.matchMedia("(max-width: 1023px)").matches;

      if (isMobile) {
        card.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      } else {
        card.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }, 450);

    return () => window.clearTimeout(t);
  }, [recommendedSlug]);

  return (
    // ✅ CHANGED: id="offers" -> id="plans"
    <section id="plans" className="relative py-16">
      {/* background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(900px 500px at 50% 0%, rgba(255,255,255,0.06), transparent 65%)",
          }}
        />
        <div className="absolute inset-0 bg-[var(--bg)]" />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {showTitle && (
          <div className="text-center max-w-3xl mx-auto">
            <div className="text-xs tracking-[0.28em] text-[var(--muted)] uppercase">
              {meta.small}
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold leading-tight whitespace-pre-line">
              {meta.big}
            </h2>
            <p className="mt-4 text-sm md:text-base text-[var(--muted)]">
              {meta.subtitle}
            </p>
          </div>
        )}

        {/* Recommended label above cards */}
        {recommendedPlanName && (
          <div
            className="
              mt-10 text-center font-extrabold tracking-widest uppercase
              text-[var(--brand)]
              drop-shadow-[0_0_22px_rgba(39,188,216,0.85)]
            "
          >
            REKOMANDUAR PËR JU:{" "}
            <span className="text-white">{recommendedPlanName}</span>
          </div>
        )}

        {/* Swipe row (mobile) + Grid (desktop) */}
        <div
          ref={scrollerRef}
          className="
            relative mt-12
            flex gap-5
            overflow-x-auto
            pb-4
            snap-x snap-mandatory
            scrollbar-hide

            lg:grid lg:grid-cols-5 lg:gap-5 lg:items-end
            lg:overflow-visible
            lg:snap-none
          "
        >
          {/* Edge fade swipe hint (mobile only) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--bg)] to-transparent lg:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--bg)] to-transparent lg:hidden" />

          {plans.map((p, idx) => {
            const isPremium = p.slug === "premium";
            const isTurbo = p.slug === "turbo";
            const isRecommended = recommendedSlug === p.slug;

            // Taller on top, but same baseline on bottom (grid items-end handles this)
            const sizeClass = isPremium
              ? "min-h-[540px] pt-10 lg:min-h-[640px] lg:pt-14"
              : isTurbo
              ? "min-h-[510px] pt-9 lg:min-h-[600px] lg:pt-12"
              : "min-h-[480px] pt-7 lg:min-h-[545px] lg:pt-7";

            // Float classes stay on wrapper only (desktop-only via globals.css)
            const floatClass =
              idx % 3 === 0 ? "floaty" : idx % 3 === 1 ? "floaty2" : "floaty3";

            return (
              // OUTER wrapper: width + snap + float only
              <div
                key={p.slug}
                data-plan={p.slug}
                className={cx(
                  "min-w-[280px] sm:min-w-[300px] lg:min-w-0",
                  "snap-center lg:self-end",
                  floatClass
                )}
              >
                {/* ✅ iOS Liquid Glass card */}
                <div
                  className={cx(
                    "relative rounded-2xl overflow-hidden",
                    "px-6 pb-6 flex flex-col",
                    sizeClass,

                    // glass base
                    "bg-white/[0.06] border border-white/[0.14]",
                    "backdrop-blur-xl backdrop-saturate-150",
                    "shadow-[0_28px_90px_rgba(0,0,0,0.62)]",

                    // hover lift
                    "transition-transform duration-300",
                    "hover:-translate-y-2 hover:shadow-[0_34px_105px_rgba(0,0,0,0.72)]",

                    // recommended glow
                    isRecommended
                      ? "border-[var(--brand)]/55 ring-[3px] ring-[var(--brand)]/60 shadow-[0_0_0_2px_rgba(39,188,216,0.42),0_0_70px_rgba(39,188,216,0.42),0_30px_110px_rgba(0,0,0,0.75)] scale-[1.03] z-20"
                      : ""
                  )}
                >
                  {/* gradient stroke overlay */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl">
                    <div
                      className="absolute inset-0 opacity-90"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.24), rgba(255,255,255,0.06) 35%, rgba(39,188,216,0.10) 60%, rgba(255,255,255,0.08))",
                        WebkitMask:
                          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude" as any,
                        padding: "1px",
                        borderRadius: "16px",
                      }}
                    />
                  </div>

                  {/* specular top highlight */}
                  <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[130%] -translate-x-1/2 rotate-[-6deg] opacity-90">
                    <div
                      className="h-full w-full"
                      style={{
                        background:
                          "radial-gradient(closest-side at 50% 60%, rgba(255,255,255,0.18), rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.0) 70%)",
                      }}
                    />
                  </div>

                  {/* depth vignette */}
                  <div className="pointer-events-none absolute inset-0 opacity-85">
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(800px 260px at 50% 10%, rgba(39,188,216,0.10), transparent 65%), radial-gradient(700px 320px at 50% 95%, rgba(0,0,0,0.38), transparent 65%)",
                      }}
                    />
                  </div>

                  {/* Spotlight glow layer (recommended only) */}
                  {isRecommended && (
                    <div className="pointer-events-none absolute inset-0 rounded-2xl">
                      <div
                        className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl opacity-70"
                        style={{ background: "rgba(39,188,216,0.55)" }}
                      />
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
                    </div>
                  )}

                  {/* REKOMANDUAR badge (very visible) */}
                  {isRecommended && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
                      {/* Mobile: glow only (no text) */}
                      <div
                        className="
                          block lg:hidden
                          h-12 w-56 rounded-full
                          bg-[var(--brand)]/70
                          opacity-70
                          blur-2xl
                          shadow-[0_0_60px_rgba(39,188,216,0.9)]
                        "
                        aria-hidden="true"
                      />
                      {/* Desktop: actual badge with text */}
                      <div
                        className="
                          hidden lg:block
                          px-5 py-2 rounded-full
                          text-sm font-extrabold tracking-widest uppercase
                          bg-[var(--brand)] text-black
                          shadow-[0_0_28px_rgba(39,188,216,0.95)]
                          whitespace-nowrap
                        "
                      >
                        REKOMANDUAR PËR JU
                      </div>
                    </div>
                  )}

                  {/* Top badge (e.g., MË E PËLQYERA / PREMIUM / BIZNESE) */}
                  {p.topBadge && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs font-bold tracking-wider uppercase px-5 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/90 whitespace-nowrap backdrop-blur-md">
                      {p.topBadge}
                    </div>
                  )}

                  {/* Title (push down if top badge exists) */}
                  <div
                    className={cx(
                      "relative z-10 text-orange-400",
                      "text-lg md:text-xl font-extrabold tracking-wide",
                      p.topBadge ? "mt-10" : "mt-2"
                    )}
                  >
                    {p.name}
                  </div>

                  {/* Pricing */}
                  {isPremium ? (
                    <div className="relative z-10 mt-8">
                      <div className="text-orange-400 font-semibold">
                        {p.accentLabel || "Paketa e Personalizuar"}
                      </div>

                      <div className="mt-4 text-5xl font-extrabold tracking-tight drop-shadow-[0_8px_22px_rgba(0,0,0,0.55)]">
                        Çmimi
                      </div>
                      <div className="text-[var(--muted)] font-medium mt-1">
                        i personalizuar
                      </div>

                      <div className="mt-8 h-px w-full bg-white/5" />
                    </div>
                  ) : (
                    <div className="relative z-10 mt-8">
                      <div className="text-5xl font-extrabold tracking-tight drop-shadow-[0_8px_22px_rgba(0,0,0,0.55)]">
                        {`${Math.round(p.priceAll)}`.replace(
                          /\B(?=(\d{3})+(?!\d))/g,
                          ","
                        )}
                        L
                      </div>
                      <div className="text-[var(--muted)] mt-2 text-sm">
                        {p.unit || "/muaj"}
                      </div>

                      <div className="mt-8 h-px w-full bg-white/5" />
                    </div>
                  )}

                  {/* Features */}
                  <ul className="relative z-10 mt-6 space-y-3 text-sm text-[var(--muted)] lg:mt-8 lg:space-y-4">
                    {(p.features || []).map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <CheckIcon />
                        <span className="leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Button */}
                  <div className="relative z-10 mt-auto pt-8 lg:pt-10">
                    <a
                      href={`/checkout?plan=${p.slug}`}
                      className={cx(
                        "block w-full text-center px-4 py-3 rounded-xl font-semibold transition-all duration-700 ease-in-out",
                        isRecommended
                          ? "bg-[var(--brand)] text-black shadow-[0_0_35px_rgba(39,188,216,0.85)] hover:shadow-[0_0_55px_rgba(39,188,216,1)]"
                          : "bg-[var(--brand)] text-black hover:opacity-90"
                      )}
                    >
                      Zgjidhe
                    </a>
                  </div>

                  {/* Optional bottom text inside card */}
                  {isRecommended && (
                    <div className="relative z-10 mt-4 text-center text-[var(--brand)] font-extrabold tracking-wider uppercase drop-shadow-[0_0_16px_rgba(39,188,216,0.7)]">
                      REKOMANDUAR PËR JU
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
