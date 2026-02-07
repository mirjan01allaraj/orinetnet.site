"use client";

import { useState } from "react";
import IntroSplash from "@/components/common/IntroSplash";

import Hero from "@/components/sections/Hero";
import PlanRecommender from "@/components/sections/PlanRecommender";
import Plans from "@/components/sections/Plans";
import Features from "@/components/sections/Features";
import Coverage from "@/components/sections/Coverage";
import FAQ from "@/components/sections/FAQ";
import InfoKontakt from "@/components/sections/InfoKontakt";

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [recommendedSlug, setRecommendedSlug] = useState<string | null>(null);

  function handleRecommend(slug: string) {
    setRecommendedSlug(slug);
    setTimeout(() => setRecommendedSlug(null), 10_000);
  }

  return (
    <>
      {showSplash && (
        <IntroSplash
          durationMs={2200}
          onDone={() => setShowSplash(false)}
        />
      )}

      {!showSplash && (
        <>
          <Hero onRecommend={handleRecommend} />

          <div id="packages-section">
            <PlanRecommender onRecommend={handleRecommend} />
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
