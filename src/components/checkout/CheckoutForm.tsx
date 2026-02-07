"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPlanBySlug } from "@/lib/content";
import { FLAGS } from "@/lib/featureFlags";
import { allToEur } from "@/lib/money";
import PaymentMethods from "@/components/checkout/PaymentMethods";

type FormState = {
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

// ✅ deterministic formatter (prevents hydration mismatch)
function formatLek(n: number) {
  const v = Math.round(Number(n) || 0);
  return `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}L`;
}

function cx(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}

// ✅ Office WhatsApp (digits only for wa.me)
const OFFICE_WA = "355686666419";

function clean(s: string) {
  return (s || "").trim();
}

function buildWhatsAppMessage(args: {
  planName: string;
  planSlug: string;
  pricePerMonthAll: number;
  totalAll: number;
  form: FormState;
}) {
  const { planName, planSlug, pricePerMonthAll, totalAll, form } = args;

  const fullName = `${clean(form.firstName)} ${clean(form.lastName)}`.trim();
  const typeLabel = form.type === "rinovim" ? "Rinovim" : "Lidhje e Re";

  const notes = clean(form.notes) ? clean(form.notes) : "—";

  return [
    "🟦 *PAGESE – ORIENT NET*",
    "",
    "📦 *Paketa*",
    `• ${planName} (${planSlug})`,
    `• Çmimi: ${formatLek(pricePerMonthAll)} / muaj`,
    `• Kohëzgjatja: ${form.duration} muaj`,
    `• Total: *${formatLek(totalAll)}*`,
    "",
    "🔁 *Lloji*",
    `• ${typeLabel}`,
    "",
    "👤 *Të dhënat e klientit*",
    `• Emër Mbiemër: ${fullName || "—"}`,
    `• Nr. Tel: ${clean(form.phone) || "—"}`,
    `• Email: ${clean(form.email) || "—"}`,
    "",
    "📍 *Adresa*",
    `• Shteti: ${clean(form.country) || "—"}`,
    `• Qyteti/Fshati: ${clean(form.city) || "—"}`,
    `• Adresa/Maps: ${clean(form.address) || "—"}`,
    "",
    "📝 *Shënime shtesë*",
    `${notes}`,
  ].join("\n");
}

export default function CheckoutForm() {
  const sp = useSearchParams();
  const planSlug = sp.get("plan") || "turbo";
  const plan = getPlanBySlug(planSlug);
  // ⛔ STOP rendering if plan is invalid
if (!plan) {
  return <div>Plan not found.</div>;
}

// ✅ SAFE reference (TypeScript now knows it's NOT undefined)
const planSafe = plan;

  const [form, setForm] = useState<FormState>({
    duration: "1",
    type: "lidhjeRe",
    firstName: "",
    lastName: "",
    country: "Shqipëri / Albania",
    city: "",
    address: "",
    phone: "",
    email: "",
    notes: "",
  });

  const totalAll = useMemo(() => {
    const months = Number(form.duration);
    const base = plan?.priceAll ?? 0;
    return base * months;
  }, [form.duration, plan?.priceAll]);

  const totalEur = useMemo(() => allToEur(totalAll), [totalAll]);

  if (!plan) return <div>Plan not found.</div>;

  const onChange =
    (k: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function submitManualOrder() {
    // ✅ 1) Open WhatsApp immediately (avoids popup blockers)
    const waMsg = buildWhatsAppMessage({
      planName: planSafe.name,
      planSlug: planSafe.slug,
      pricePerMonthAll: planSafe.priceAll,
      totalAll,
      form,
    });

    const waUrl = `https://wa.me/${OFFICE_WA}?text=${encodeURIComponent(waMsg)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // ✅ 2) Save order in backend (same as before)
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planSlug: planSafe.slug,
        planName: planSafe.name,
        totalAll,
        ...form,
      }),
    });

    if (res.ok) window.location.href = "/checkout/success";
    else alert("Gabim gjatë dërgimit. Provo përsëri.");
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* ✅ ORDER SUMMARY (TOP on mobile) */}
      <div className="order-first lg:order-last rounded-2xl glass-card p-6 h-fit">
        <div className="glass-vignette pointer-events-none" />
        <h2 className="relative z-10 font-extrabold text-lg">Your order</h2>

        <div className="relative z-10 mt-4 text-sm text-[var(--muted)] flex justify-between">
          <span>{plan.name}</span>
          <span>{formatLek(plan.priceAll)} / muaj</span>
        </div>

        <div className="relative z-10 mt-3 border-t border-white/10 pt-3 text-sm flex justify-between">
          <span>Kohëzgjatja</span>
          <span>{form.duration} muaj</span>
        </div>

        <div className="relative z-10 mt-3 border-t border-white/10 pt-3 font-extrabold flex justify-between">
          <span>Total (LEK)</span>
          <span>{formatLek(totalAll)}</span>
        </div>

        <div className="relative z-10 mt-3 text-xs text-[var(--muted)]">
          PayPal do të tarifohet në EUR (konvertim nga kursi i vendosur në sistem).
        </div>
      </div>

      {/* ✅ BILLING DETAILS (BOTTOM on mobile) */}
      <div className="order-last lg:order-first lg:col-span-2 rounded-2xl glass-card p-6">
        <div className="glass-vignette pointer-events-none" />

        <h2 className="relative z-10 font-extrabold text-xl">Billing details</h2>

        <div className="relative z-10 mt-5">
          <label className="text-sm text-[var(--muted)]">
            Kohëzgjatja e Abonimit *
          </label>
          <select
            className="mt-2 w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10"
            value={form.duration}
            onChange={onChange("duration")}
          >
            <option value="1">1 muaj</option>
            <option value="3">3 muaj</option>
            <option value="6">6 muaj</option>
            <option value="12">12 muaj</option>
          </select>
        </div>

        {/* ✅ Pills instead of radio */}
        <div className="relative z-10 mt-5">
          <div className="text-sm text-[var(--muted)] mb-2">Lloji *</div>

          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, type: "rinovim" }))}
              className={cx(
                "px-4 py-2 rounded-full border text-sm font-semibold transition",
                "bg-black/20",
                form.type === "rinovim"
                  ? "border-orange-400/60 text-orange-300 shadow-[0_0_25px_rgba(249,115,22,0.25)]"
                  : "border-white/10 text-white/80 hover:border-white/20"
              )}
            >
              Rinovim
            </button>

            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, type: "lidhjeRe" }))}
              className={cx(
                "px-4 py-2 rounded-full border text-sm font-semibold transition",
                "bg-black/20",
                form.type === "lidhjeRe"
                  ? "border-[var(--brand)]/60 text-white shadow-[0_0_28px_rgba(39,188,216,0.25)]"
                  : "border-white/10 text-white/80 hover:border-white/20"
              )}
            >
              Lidhje e Re
            </button>
          </div>
        </div>

        {/* ✅ Form fields */}
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
          {/* Emri / Mbiemri always same row (mobile too) */}
          <div>
            <label className="text-sm text-[var(--muted)]">Emri *</label>
            <input
              className="mt-2 w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10"
              value={form.firstName}
              onChange={onChange("firstName")}
              placeholder="Emri"
            />
          </div>

          <div>
            <label className="text-sm text-[var(--muted)]">Mbiemri *</label>
            <input
              className="mt-2 w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10"
              value={form.lastName}
              onChange={onChange("lastName")}
              placeholder="Mbiemri"
            />
          </div>

          {/* Shteti locked */}
          <div className="col-span-2 md:col-span-1">
            <label className="text-sm text-[var(--muted)]">Shteti *</label>
            <input
              className="mt-2 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50"
              value={form.country}
              disabled
              aria-disabled="true"
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="text-sm text-[var(--muted)]">Qyteti / Fshati *</label>
            <input
              className="mt-2 w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10"
              value={form.city}
              onChange={onChange("city")}
              placeholder="p.sh. Kamëz, Paskuqan, Bathore..."
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm text-[var(--muted)]">Adresa e plotë *</label>
            <input
              className="mt-2 w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10"
              value={form.address}
              onChange={onChange("address")}
              placeholder="Adresa ose Location Link nga MAPS"
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="text-sm text-[var(--muted)]">Numri i telefonit *</label>
            <input
              className="mt-2 w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10"
              value={form.phone}
              onChange={onChange("phone")}
              placeholder="+355..."
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="text-sm text-[var(--muted)]">Adresa e emailit *</label>
            <input
              className="mt-2 w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10"
              value={form.email}
              onChange={onChange("email")}
              placeholder="email@..."
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm text-[var(--muted)]">
              Shënime shtesë (optional)
            </label>
            <textarea
              className="mt-2 w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 min-h-[110px]"
              value={form.notes}
              onChange={onChange("notes")}
              placeholder="Shënime shtesë..."
            />
          </div>
        </div>

        {/* Payment methods */}
        <div className="relative z-10 mt-8">
          <PaymentMethods
            paypalEnabled={FLAGS.PAYPAL_ENABLED}
            cardEnabled={FLAGS.CARD_ENABLED}
            planSlug={plan.slug}
            planName={plan.name}
            totalAll={totalAll}
            totalEur={totalEur}
            customer={form}
            onManualOrder={submitManualOrder}
          />
        </div>
      </div>
    </div>
  );
}
