"use client";

import React from "react";

type Props = {
  paypalEnabled?: boolean;
  cardEnabled?: boolean;

  planSlug: string;
  planName: string;
  totalAll: number;
  totalEur: number;

  customer: {
    duration: "1" | "3" | "6" | "12";
    type: "rinovim" | "lidhjeRe";
    firstName: string;
    lastName: string;
    country: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    notes: string;
  };

  onManualOrder: () => void;
};

function cx(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}

export default function PaymentMethods({
  paypalEnabled,
  cardEnabled,
  onManualOrder,
}: Props) {
  // ✅ Force-disable UI for now (all devices)
  const PAYPAL_UI_DISABLED = true;
  const CARD_UI_DISABLED = true;

  const disabledWrap =
    "opacity-45 grayscale pointer-events-none select-none";
  const disabledBadge =
    "inline-flex items-center gap-2 text-xs font-semibold text-white/60 bg-white/5 border border-white/10 px-3 py-1 rounded-full";

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-black/10 p-5">
      <h3 className="font-extrabold text-lg">Metoda e Pagesës</h3>

      {/* =========================
          1) MANUAL / CASH (ACTIVE)
         ========================= */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="font-extrabold">PAGUAJ FIZIKISHT</div>
          <span className="text-xs text-[var(--muted)]">Aktive</span>
        </div>

        <p className="mt-2 text-sm text-[var(--muted)]">
          Ju lutem paguani fizikisht në zyrat tona për të rinovuar/aktivizuar
          abonimin.
        </p>

        <button
          type="button"
          onClick={onManualOrder}
          className="mt-4 w-full text-center px-4 py-3 rounded-xl bg-[var(--brand)] text-black font-extrabold tracking-wider"
        >
          PLACE ORDER
        </button>
      </div>

      {/* =========================
          2) PAYPAL (DISABLED UI)
         ========================= */}
      <div
        className={cx(
          "mt-4 rounded-2xl border border-white/10 bg-black/20 p-5",
          PAYPAL_UI_DISABLED && disabledWrap
        )}
        aria-disabled={PAYPAL_UI_DISABLED}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="font-extrabold">PayPal (Online)</div>
          <span className={disabledBadge}>Së shpejti</span>
        </div>

        <p className="mt-2 text-sm text-[var(--muted)]">
          Pagesë online me PayPal. Shuma shfaqet në LEK, por tarifohet në EUR.
        </p>

        <button
          type="button"
          disabled
          className="mt-4 w-full text-center px-4 py-3 rounded-xl border border-white/12 bg-white/5 text-white/60 font-semibold"
          title="Së shpejti"
        >
          Paguaj me PayPal
        </button>

        {!paypalEnabled && (
          <div className="mt-2 text-xs text-white/40">
            (PayPal është i çaktivizuar në sistem.)
          </div>
        )}
      </div>

      {/* =========================
          3) CARD (DISABLED UI)
         ========================= */}
      <div
        className={cx(
          "mt-4 rounded-2xl border border-white/10 bg-black/20 p-5",
          CARD_UI_DISABLED && disabledWrap
        )}
        aria-disabled={CARD_UI_DISABLED}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="font-extrabold">Kartë (Coming soon)</div>
          <span className={disabledBadge}>Së shpejti</span>
        </div>

        <p className="mt-2 text-sm text-[var(--muted)]">
          Pagesa me kartë është e çaktivizuar për momentin. Sepse është në
          zhvillim/development. FALEMINDERIT!
        </p>

        <button
          type="button"
          disabled
          className="mt-4 w-full text-center px-4 py-3 rounded-xl border border-white/12 bg-white/5 text-white/60 font-semibold"
          title="Së shpejti"
        >
          Paguaj me Kartë
        </button>

        {!cardEnabled && (
          <div className="mt-2 text-xs text-white/40">
            (Pagesa me kartë është e çaktivizuar në sistem.)
          </div>
        )}
      </div>
    </div>
  );
}
