import plansSq from "@/content/sq/plans.json";

export type Plan = {
  slug: string;
  name: string;
  priceAll: number;
  unit?: string;
  accentLabel?: string;
  topBadge?: string;
  down: number;
  up: number;
  features?: string[];
  popular?: boolean; // (old)
};

export function getPlans(): Plan[] {
  return (plansSq as any).plans as Plan[];
}

export function getPlanBySlug(slug: string): Plan | undefined {
  return getPlans().find((p) => p.slug === slug);
}

/** ✅ Needed by Hero.tsx */
export function getIncluded(): string[] {
  return ((plansSq as any).included || []) as string[];
}

/** ✅ Needed by the new Plans.tsx (pricing header text) */
export function getPricingMeta() {
  return {
    small: ((plansSq as any).pricingTitleSmall || "ÇMIMET") as string,
    big: ((plansSq as any).pricingTitleBig || "ZGJIDHNI OFERTËN MË TË\nMIRË PËR NEVOJAT TUAJA.") as string,
    subtitle: ((plansSq as any).pricingSubtitle || "") as string
  };
}
