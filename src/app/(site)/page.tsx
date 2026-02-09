"use client";

import { useEffect, useRef, useState } from "react";
import IntroSplash from "@/components/common/IntroSplash";

import Hero from "@/components/sections/Hero";
import PlanRecommender from "@/components/sections/PlanRecommender";
import Plans from "@/components/sections/Plans";
import Features from "@/components/sections/Features";
import Coverage from "@/components/sections/Coverage";
import FAQ from "@/components/sections/FAQ";
import InfoKontakt from "@/components/sections/InfoKontakt";

function cx(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [recommendedSlug, setRecommendedSlug] = useState<string | null>(null);

  // ✅ mobile collapsible state
  const [recoOpen, setRecoOpen] = useState(false);

  // ✅ better timer cleanup (avoid piling timeouts)
  const recoTimer = useRef<number | null>(null);

  function handleRecommend(slug: string) {
    setRecommendedSlug(slug);

    // ✅ On mobile: auto-open recommender if it was closed? (optional)
    // We keep it AS-IS: do NOT force close; user asked to leave it open.

    // ✅ Always scroll to the top of Plans (avoid micro scroll)
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        const top = document.getElementById("plans-top") || document.getElementById("plans");
        top?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (recoTimer.current) window.clearTimeout(recoTimer.current);
    recoTimer.current = window.setTimeout(() => setRecommendedSlug(null), 10_000);
  }

  useEffect(() => {
    return () => {
      if (recoTimer.current) window.clearTimeout(recoTimer.current);
    };
  }, []);

  return (
    <>
      {showSplash && (
        <IntroSplash durationMs={2200} onDone={() => setShowSplash(false)} />
      )}

      {!showSplash && (
        <>
          <Hero onRecommend={handleRecommend} />

          <div id="packages-section">
            {/* =========================
                DESKTOP (unchanged)
               ========================= */}
            <div className="hidden lg:block">
              <PlanRecommender onRecommend={handleRecommend} />
            </div>

            {/* =========================
                MOBILE ONLY: collapsible
               ========================= */}
            <div className="lg:hidden">
              <section className="relative py-10">
                <div className="max-w-6xl mx-auto px-6">
                  {/* Collapsed header block */}
                  <div className="text-center">
                    <p className="text-sm text-[var(--muted)] leading-relaxed">
                      <span className="text-[var(--brand)] font-semibold">Orient Net</span>, pjesë e{" "}
                      <span className="text-[var(--brand)] font-semibold">ORIENT GROUP</span>{" "}
                      — rekomandim AI inteligjent sipas nevojave tuaja.
                    </p>

                    <h2 className="mt-6 text-3xl font-extrabold tracking-tight uppercase">
                      SI TË ZGJIDHNI OFERTËN?
                    </h2>

                    <button
                      type="button"
                      onClick={() => setRecoOpen((v) => !v)}
                      className={cx(
                        "mt-6 w-full rounded-[18px] border border-white/10",
                        "bg-white/[0.06] backdrop-blur-xl backdrop-saturate-150",
                        "px-5 py-4 text-center font-extrabold tracking-widest uppercase",
                        "text-white/90 hover:text-white transition",
                        "shadow-[0_18px_65px_rgba(0,0,0,0.55)]"
                      )}
                    >
                      {recoOpen ? "Mbyll Rekomandimin" : "Hap Rekomandimin"}
                    </button>

                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Kliko për të plotësuar pyetjet dhe për të marrë ofertën ideale.
                    </p>
                  </div>

                  {/* Expand content */}
                  <div
                    className={cx(
                      "mt-6 grid transition-[grid-template-rows,opacity] duration-500 ease-out",
                      recoOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <PlanRecommender onRecommend={handleRecommend} showHeader={false} />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Plans always visible under it */}
            <Plans recommendedSlug={recommendedSlug} />
          </div>

          <Features />
          <Coverage />
          <FAQ />
          <InfoKontakt />
        </>
      )}
    </>
  );
}
