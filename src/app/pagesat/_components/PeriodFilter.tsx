"use client";

import type { RefObject } from "react";
import type { PeriodPreset } from "../_lib/dashboardUtils";

type Props = {
  periodWrapRef: RefObject<HTMLDivElement | null>;
  periodOpen: boolean;
  setPeriodOpen: (v: boolean | ((prev: boolean) => boolean)) => void;

  currentLabel: string;

  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;

  applyPreset: (preset: PeriodPreset) => void;
  applyCustomPeriod: () => void;
};

export default function PeriodFilter({
  periodWrapRef,
  periodOpen,
  setPeriodOpen,
  currentLabel,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  applyPreset,
  applyCustomPeriod,
}: Props) {
  return (
    <div className="relative" ref={periodWrapRef}>
      <button
        type="button"
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 min-w-[220px]"
        onClick={() => setPeriodOpen((v) => !v)}
      >
        <div className="text-xs uppercase tracking-wide text-white/50">
          Faturat
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-semibold">{currentLabel}</span>
          <span className="text-white/50 text-sm">▼</span>
        </div>
      </button>

      {periodOpen && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-40 w-[320px] rounded-2xl border border-white/10 bg-[#0E1625] p-3 shadow-2xl">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
              onClick={() => applyPreset("yesterday")}
            >
              Dje
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
              onClick={() => applyPreset("last_week")}
            >
              1 javë
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
              onClick={() => applyPreset("last_month")}
            >
              1 muaj
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
              onClick={() => applyPreset("last_3_months")}
            >
              3 muaj
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
              onClick={() => applyPreset("last_6_months")}
            >
              6 muaj
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
              onClick={() => applyPreset("last_year")}
            >
              1 vit
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="font-medium">Periudhë specifike</div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <div className="text-white/60 text-sm">From</div>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div>
                <div className="text-white/60 text-sm">To</div>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3 text-white/50 text-xs">
              Nëse plotësohet vetëm From, ngarkohen faturat nga ajo datë e
              tutje. Nëse From dhe To janë të njëjta, shfaqen vetëm faturat e
              asaj date.
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-xl bg-[#27BCD8] px-4 py-2 font-semibold text-black"
                onClick={applyCustomPeriod}
              >
                Load
              </button>

              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
                onClick={() => applyPreset("today")}
              >
                Sot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}