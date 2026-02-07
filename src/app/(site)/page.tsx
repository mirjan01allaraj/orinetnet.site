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

import CTA from "@/components/sections/CTA";

export default function HomePage() {
  const [recommendedSlug, setRecommendedSlug] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ splash (only first visit)
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const seen = window.localStorage.getItem("orient_intro_seen") === "1";
    if (seen) {
      setShowSplash(false);
      setReady(true);
    } else {
      setShowSplash(true);
      setReady(true); // render page but splash overlays it
    }
  }, []);

  function finishSplash() {
    window.localStorage.setItem("orient_intro_seen", "1");
    setShowSplash(false);
  }

  function handleRecommend(slug: string) {
    setRecommendedSlug(slug);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setRecommendedSlug(null);
      timerRef.current = null;
    }, 10_000);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ✅ prevents any client/server mismatch flash
  if (!ready) return null;

  return (
    <>
      {showSplash && <IntroSplash durationMs={2200} onDone={finishSplash} />}

      <Hero onRecommend={handleRecommend} />

      {/* 👇 Anchor target for "Paketat" menu click */}
      <div id="packages-section">
        <PlanRecommender onRecommend={handleRecommend} />
        <Plans recommendedSlug={recommendedSlug} />
      </div>

      <Features />
      <Coverage />
      <FAQ />
      <InfoKontakt />
      {false && <CTA />}
    </>
  );
}
