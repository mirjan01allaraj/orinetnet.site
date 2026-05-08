"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { hyperspeedPresets } from "./HyperSpeedPresets.js";

type HyperspeedProps = {
  effectOptions?: any;
};

const Hyperspeed = dynamic(
  () =>
    import("./Hyperspeed.jsx") as Promise<{
      default: ComponentType<HyperspeedProps>;
    }>,
  { ssr: false }
);

export default function HyperspeedHeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-100"
        style={{
          filter: "brightness(2.4) saturate(1.8) contrast(1.25)",
          transform: "scale(1.08) translateY(20px)",
          transformOrigin: "center bottom",
        }}
      >
        <Hyperspeed
          effectOptions={{
            ...hyperspeedPresets.one,
            length: 300,
            roadWidth: 8,
            islandWidth: 2,
            totalSideLightSticks: 36,
            lightPairsPerRoadWay: 80,
            carLightsFade: 0.25,
            colors: {
              ...hyperspeedPresets.one.colors,
              background: 0x000000,
              roadColor: 0x020505,
              islandColor: 0x020505,
              leftCars: [0x27bcd8, 0x8b5cf6, 0xd856bf, 0xff7a1a],
              rightCars: [0x27bcd8, 0x03b3c3, 0x0e5ea5, 0x55c22a],
              sticks: 0x27bcd8,
            },
          }}
        />
      </div>

      {/* Very light overlays, only for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#02070a]/75 via-[#02070a]/20 to-black/45" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-[var(--bg)]/75" />

      {/* Soft cyan glow behind content */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(700px 360px at 55% 70%, rgba(39,188,216,0.22), transparent 65%)",
        }}
      />
    </div>
  );
}