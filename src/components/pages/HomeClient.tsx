"use client";

import { useState } from "react";
import PlanRecommender from "@/components/sections/PlanRecommender";
import Plans from "@/components/sections/Plans";

export default function HomeClient() {
  const [recommendedSlug, setRecommendedSlug] = useState<string | null>(null);

  return (
    <>
      <PlanRecommender
        onRecommend={(slug) => {
          setRecommendedSlug(slug);
        }}
      />

      <Plans recommendedSlug={recommendedSlug} />
    </>
  );
}
