"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";

const API = "/pagesat-api";

type PrintMode = "a4" | "a5" | "58mm";

async function getPayment(id: string, token: string) {
  const res = await fetch(
    `${API}/receipt_get.php?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );
  return res.json();
}

function fmtMoney(n: any) {
  const num = Number(n || 0);
  return `${num.toLocaleString("sq-AL")} L`;
}

function fmtDate(d: any) {
  if (!d) return "—";
  const s = String(d);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${Number(m[3])}/${Number(m[2])}/${m[1]}`;

  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("sq-AL");
}

function fmtDateTime(d: any) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);

  return `${String(dt.getDate()).padStart(2, "0")}/${String(
    dt.getMonth() + 1
  ).padStart(2, "0")}/${dt.getFullYear()} ${String(dt.getHours()).padStart(
    2,
    "0"
  )}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

function chip(label: string, value: any, className = "") {
  return (
    <div
      className={`receipt-chip flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 ${className}`}
    >
      <span className="receipt-chip-label text-black/60">{label}</span>
      <span className="receipt-chip-value font-semibold text-right">
        {value || "—"}
      </span>
    </div>
  );
}

function buildAmountLine(data: any, printMode: PrintMode) {
  const price = Number(data.package_price || 0);
  const monthsSelected = Number(data.months_selected || 0);
  const monthsPaid = Number(data.months_paid || 0);
  const expected = Number(data.expected_amount || 0);
  const paid = Number(data.amount_paid || 0);
  const freeMonths = Math.max(0, monthsSelected - monthsPaid);
  const hasDeal = paid !== expected;
  const is58mm = printMode === "58mm";

  if (!price || !monthsSelected) return null;

  if (hasDeal) {
    return (
      <div
        className={`receipt-amount-line mt-2 space-y-1 ${
          is58mm ? "text-[8px] text-black" : "text-xs text-black/70"
        }`}
      >
        <div>
          Çmimi standard: {price.toLocaleString("sq-AL")} L × {monthsPaid} muaj të
          paguar
          {freeMonths > 0 ? ` (+ ${freeMonths} muaj falas)` : ""} ={" "}
          <span className="font-semibold text-black">
            {expected.toLocaleString("sq-AL")} L
          </span>
        </div>

        <div
          className={`receipt-deal-box rounded-lg px-3 py-2 ${
            is58mm
              ? "border border-black bg-white text-black"
              : "border border-amber-300 bg-amber-50 text-amber-800"
          }`}
        >
          Shuma e rënë dakord:{" "}
          <span className="font-bold">{paid.toLocaleString("sq-AL")} L</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`receipt-amount-line mt-2 ${
        is58mm ? "text-[8px] text-black" : "text-xs text-black/60"
      }`}
    >
      {price.toLocaleString("sq-AL")} L × {monthsPaid} muaj të paguar
      {freeMonths > 0 ? ` (+ ${freeMonths} muaj falas)` : ""} ={" "}
      <span className="font-semibold text-black">
        {paid.toLocaleString("sq-AL")} L
      </span>
    </div>
  );
}

export default function PublicReceiptPage() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>("a4");

  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const id = params?.get("id") || "";
  const token = params?.get("token") || "";

  useEffect(() => {
    document.body.classList.remove("print-mode-a4", "print-mode-a5", "print-mode-58mm");
    document.body.classList.add(`print-mode-${printMode}`);
    return () => {
      document.body.classList.remove(
        "print-mode-a4",
        "print-mode-a5",
        "print-mode-58mm"
      );
    };
  }, [printMode]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!id || !token) {
        setErr("Mungon linku i faturës.");
        setBusy(false);
        return;
      }

      setBusy(true);
      setErr(null);

      try {
        const j = await getPayment(id, token);

        if (!active) return;

        if (!j?.ok || !j?.payment) {
          setErr("Fatura nuk u gjet ose linku nuk është i vlefshëm.");
          setData(null);
        } else {
          setData(j.payment);
        }
      } catch {
        if (!active) return;
        setErr("Ndodhi një gabim gjatë ngarkimit të faturës.");
        setData(null);
      } finally {
        if (active) setBusy(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id, token]);

  const derived = useMemo(() => {
    if (!data) return null;

    const paid = Number(data.amount_paid || 0);
    const expected = Number(data.expected_amount || 0);
    const hasDeal = paid !== expected;

    const debtDays = Number(data.debt_days || 0);
    const previousPaidUntil = data.previous_paid_until || null;
    const previousLastPaymentDate = data.previous_last_payment_date || null;
    const connectionDate =
      data.connection_date || data.customer_connection_date || null;

    const paymentStatusBefore = String(
      data.payment_status_before || data.customer_payment_status || "manual"
    ).toLowerCase();

    let lastPaymentLabel = "—";
    if (
      paymentStatusBefore === "never_paid" ||
      (!previousLastPaymentDate && connectionDate)
    ) {
      lastPaymentLabel = "Asnjë pagesë";
    } else if (paymentStatusBefore === "free") {
      lastPaymentLabel = "Free";
    } else if (previousLastPaymentDate) {
      lastPaymentLabel = fmtDate(previousLastPaymentDate);
    }

    let calculationTitle = "Llogaritja e skadimit";
    let calculationText = "";

    if (previousPaidUntil && debtDays > 0) {
      calculationTitle = "Llogaritja me vonesë";
      calculationText =
        `Klienti ka qenë me vonesë ${debtDays} ditë. ` +
        `Skadimi i ri është llogaritur nga skadimi i mëparshëm ${fmtDate(
          previousPaidUntil
        )} + ${Number(data.months_selected || 0)} muaj = ${fmtDate(
          data.service_to
        )}.`;
    } else if (previousPaidUntil && debtDays <= 0) {
      calculationTitle = "Llogaritja për klient aktiv";
      calculationText =
        `Klienti ka qenë aktiv. ` +
        `Skadimi i ri është llogaritur nga skadimi aktual ${fmtDate(
          previousPaidUntil
        )} + ${Number(data.months_selected || 0)} muaj = ${fmtDate(
          data.service_to
        )}.`;
    } else if (connectionDate) {
      calculationTitle = "Llogaritja pa pagesë të mëparshme";
      calculationText =
        `Klienti nuk ka pasur pagesë të mëparshme. ` +
        `Skadimi i ri është llogaritur nga data e lidhjes ${fmtDate(
          connectionDate
        )} + ${Number(data.months_selected || 0)} muaj = ${fmtDate(
          data.service_to
        )}.`;
    } else {
      calculationText =
        `Skadimi i ri është llogaritur nga ${fmtDate(
          data.service_from
        )} + ${Number(data.months_selected || 0)} muaj = ${fmtDate(
          data.service_to
        )}.`;
    }

    return {
      paid,
      expected,
      hasDeal,
      debtDays,
      previousPaidUntil,
      previousLastPaymentDate,
      connectionDate,
      lastPaymentLabel,
      calculationTitle,
      calculationText,
    };
  }, [data]);

  const qrValue = useMemo(() => {
    if (!data || typeof window === "undefined") return "";

    if (data.public_pdf_url) return String(data.public_pdf_url);

    const t = String(data.receipt_token || "").trim();
    if (t) {
      return `${window.location.origin}${API}/export_receipt_pdf.php?id=${encodeURIComponent(
        data.id
      )}&token=${encodeURIComponent(t)}`;
    }

    return "";
  }, [data]);

  const publicPdfUrl = useMemo(() => {
    if (!id || !token) return null;
    if (data?.public_pdf_url) return String(data.public_pdf_url);

    return `${API}/export_receipt_pdf.php?id=${encodeURIComponent(
      id
    )}&token=${encodeURIComponent(token)}`;
  }, [id, token, data]);

  function printWithMode(mode: PrintMode) {
    setPrintMode(mode);
    setTimeout(() => window.print(), 80);
  }

  if (busy) {
    return (
      <div className="min-h-screen bg-neutral-100 px-4 py-10 text-black">
        <div className="mx-auto max-w-5xl rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          Duke ngarkuar faturën...
        </div>
      </div>
    );
  }

  if (err || !data || !derived) {
    return (
      <div className="min-h-screen bg-neutral-100 px-4 py-10 text-black">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          {err || "Fatura nuk u gjet."}
        </div>
      </div>
    );
  }

  return (
    <div className={`receipt-root print-mode-${printMode} min-h-screen bg-neutral-100 px-4 py-8 text-black`}>
      <style>{`
        @page {
          margin: 10mm;
        }

        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .receipt-sheet {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          background: #ffffff;
          color: #111111;
          border: 1px solid rgba(0,0,0,0.10);
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
          overflow: hidden;
        }

        .receipt-header {
          background: #000000;
          color: #ffffff;
        }

        .receipt-card,
        .receipt-box,
        .receipt-chip,
        .receipt-detail-box,
        .receipt-note,
        .receipt-footer-box,
        .receipt-payment-qr,
        .receipt-qr-bottom {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .print-mode-a4 .receipt-payment-grid,
        .print-mode-a5 .receipt-payment-grid {
          display: grid;
        }

        @media print {
          html, body {
            background: #ffffff !important;
          }

          .receipt-root {
            background: #ffffff !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .receipt-sheet {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            border: 1px solid rgba(0,0,0,0.12) !important;
            box-shadow: none !important;
          }

          .print-mode-a4 .receipt-payment-grid {
            grid-template-columns: 1fr 145px !important;
            gap: 10px !important;
          }

          .print-mode-a5 .receipt-payment-grid {
            grid-template-columns: 1fr 128px !important;
            gap: 8px !important;
          }

          .print-mode-58mm .receipt-payment-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }

          .print-mode-58mm .receipt-payment-qr {
            display: none !important;
          }

          .print-mode-a4 .receipt-qr-bottom,
          .print-mode-a5 .receipt-qr-bottom {
            display: none !important;
          }

          .print-mode-58mm .receipt-qr-bottom {
            display: block !important;
            margin-top: 8px !important;
          }
        }
      `}</style>

      <div className="receipt-toolbar mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-end gap-3 no-print">
        {publicPdfUrl ? (
          <a
            href={publicPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Shkarko PDF
          </a>
        ) : null}

        <button
          onClick={() => printWithMode("a4")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
            printMode === "a4"
              ? "border-black bg-black text-white"
              : "border-black/10 bg-white text-black hover:bg-black/[0.03]"
          }`}
        >
          Printo A4
        </button>

        <button
          onClick={() => printWithMode("a5")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
            printMode === "a5"
              ? "border-black bg-black text-white"
              : "border-black/10 bg-white text-black hover:bg-black/[0.03]"
          }`}
        >
          Printo A5
        </button>

        <button
          onClick={() => printWithMode("58mm")}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
            printMode === "58mm"
              ? "border-black bg-black text-white"
              : "border-black/10 bg-white text-black hover:bg-black/[0.03]"
          }`}
        >
          Printo 58mm
        </button>
      </div>

      <div className="receipt-sheet rounded-3xl">
        <div className="receipt-header px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-2xl font-extrabold tracking-wide">ORIENT NET ISP</div>
              <div className="mt-1 text-sm text-white/80">NIPT: M32217031B</div>
              <div className="text-sm text-white/80">
                Adresa: Rr “Demokracia”, Paskuqan 2, Tiranë
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.18em] text-white/70">
                Konfirmim Pagese
              </div>
              <div className="mt-1 text-xl font-bold">{data.receipt_no || "—"}</div>
              <div className="mt-1 text-sm text-white/80">
                {fmtDateTime(data.created_at)}
              </div>
              <div className="text-sm text-white/80">
                Pika: {data.point_name || "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="receipt-card rounded-2xl border border-black/10 p-4">
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-black/50">
                Klienti
              </div>

              <div className="text-xl font-bold">{data.customer_name || "—"}</div>
              <div className="mt-2 text-sm text-black/70">
                <b>Tel:</b> {data.customer_phone || "—"}
              </div>

              <div className="mt-4 space-y-2">
                {chip(
                  "Paketa",
                  `${String(data.package_code || "").toUpperCase()} (${fmtMoney(
                    data.package_price
                  )} / muaj)`
                )}

                <div className="grid gap-2 md:grid-cols-3">
                  {chip("Abonimi", `${Number(data.months_selected || 0)} muaj`)}
                  {chip("Muaj të paguar", Number(data.months_paid || 0))}
                  {chip(
                    "Muaj falas",
                    Math.max(
                      0,
                      Number(data.months_selected || 0) -
                        Number(data.months_paid || 0)
                    )
                  )}
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {chip("Shuma standarde", fmtMoney(data.expected_amount))}
                  {chip(
                    derived.hasDeal
                      ? "Shuma e paguar (marrëveshje)"
                      : "Shuma e paguar",
                    fmtMoney(data.amount_paid)
                  )}
                </div>
              </div>

              {buildAmountLine(data, printMode)}
            </div>

            <div className="receipt-card rounded-2xl border border-black/10 p-4">
              <div className="receipt-text-xs text-xs uppercase tracking-widest text-black/60">
                Pagesa
              </div>

              <div className="receipt-payment-grid mt-3 grid grid-cols-[1fr_150px] gap-4 items-start">
                <div>
                  <div className="receipt-main-total rounded-2xl border border-black/10 bg-black/[0.02] p-4">
                    <div className="receipt-text-sm text-black/60 text-sm">
                      {derived.hasDeal ? "Shuma e rënë dakord" : "Totali i paguar"}
                    </div>
                    <div className="receipt-big-money mt-1 text-3xl font-extrabold">
                      {fmtMoney(derived.paid)}
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="receipt-chip-label text-black/60">Arsyeja</span>
                      <span className="font-semibold text-right text-black">
                        {data.reason || "—"}
                      </span>
                    </div>
                  </div>

                  {data.note ? (
                    <div className="mt-2 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="receipt-chip-label text-black/60">Shënim</span>
                        <span className="font-semibold text-right text-black">
                          {data.note}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {qrValue && printMode !== "58mm" ? (
                  <div className="receipt-payment-qr rounded-2xl border border-black/10 bg-black/[0.02] p-3 text-center">
                    <div className="mb-3 text-[11px] text-black/60">
                      Skano për verifikim online
                    </div>
                    <div className="inline-flex rounded-lg border border-black/10 bg-white p-2">
                      <QRCode value={qrValue} size={108} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="receipt-card mt-4 rounded-2xl border border-black/10 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-black/50">
                Detaje abonimi
              </div>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                  derived.debtDays > 0
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {derived.debtDays > 0
                  ? `VONESË: ${derived.debtDays} ditë`
                  : "PA VONESË"}
              </span>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {chip("Data e lidhjes", fmtDate(derived.connectionDate))}
              {chip("Pagesa e fundit (para pagesës)", derived.lastPaymentLabel)}
              {chip(
                "Skadimi aktual (para pagesës)",
                fmtDate(derived.previousPaidUntil)
              )}
              {chip(
                "Periudha e re",
                `${fmtDate(data.service_from)} → ${fmtDate(data.service_to)}`
              )}
            </div>

            <div className="receipt-detail-box mt-4 rounded-2xl border border-black/10 bg-black/[0.03] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xl font-extrabold">Skadimi i ri</div>
                <div className="text-3xl font-extrabold">
                  {fmtDate(data.service_to)}
                </div>
              </div>

              <div className="mt-2 text-xs text-black/60">
                Baza e llogaritjes: {fmtDate(data.service_from)} (+{" "}
                {Number(data.months_selected || 0)} muaj).
              </div>
            </div>

            <div className="receipt-note mt-4 rounded-2xl border border-black/10 bg-black/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-black/50">
                {derived.calculationTitle}
              </div>
              <div className="mt-2 text-sm text-black/75">
                {derived.calculationText}
              </div>
            </div>
          </div>

          {qrValue && printMode === "58mm" ? (
            <div className="receipt-qr-bottom mt-4 rounded-2xl border border-black/10 bg-black/[0.02] p-3 text-center">
              <div className="mb-3 text-[11px] text-black/60">
                Skano për verifikim online
              </div>
              <div className="inline-flex rounded-lg border border-black/10 bg-white p-2">
                <QRCode value={qrValue} size={108} />
              </div>
            </div>
          ) : null}

          <div className="receipt-footer-box mt-6 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-center text-xs text-black/70">
            Ky dokument është mandat pagese / Nuk është kupon fiskal.
          </div>
        </div>
      </div>
    </div>
  );
}