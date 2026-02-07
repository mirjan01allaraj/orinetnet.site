"use client";

import { useState } from "react";

import Hero from "@/components/sections/Hero";
import PlanRecommender from "@/components/sections/PlanRecommender";
import Features from "@/components/sections/Features";
import Plans from "@/components/sections/Plans";
import Coverage from "@/components/sections/Coverage";
import FAQ from "@/components/sections/FAQ";
import CTA from "@/components/sections/CTA";

export default function HomePage() {
  const [recommendedSlug, setRecommendedSlug] = useState<string | null>(null);

  return (
    <>
      <Hero />

      <PlanRecommender
        onRecommend={(slug) => {
          setRecommendedSlug(slug);
        }}
      />

      <Features />

      <Plans recommendedSlug={recommendedSlug} />

      <Coverage />
      <FAQ />
      <CTA />
    </>
  );
}
