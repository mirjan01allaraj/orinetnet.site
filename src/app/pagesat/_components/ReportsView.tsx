"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
} from "chart.js";
import type { Plugin } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { exportReportsExcel } from "../_lib/exportReportsExcel";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title
);

type Props = {
  API: string;
  points: string[];
  reportDate: string;
  setReportDate: (v: string) => void;
  reportPoint: string;
  setReportPoint: (v: string) => void;
};

type ByItem = { key: string; total: number; count: number };
type TrendItem = { day: string; total: number; count: number };

type SummaryResp = {
  ok: boolean;
  error?: string;
  period_days?: number;
  point_name?: string | null;
  total_amount?: number;
  total_count?: number;
  by_point?: ByItem[];
  by_package?: ByItem[];
  trend?: TrendItem[];
  raw?: any[];
};

const PERIODS: { label: string; days: number }[] = [
  { label: "1 ditë", days: 1 },
  { label: "3 ditë", days: 3 },
  { label: "1 javë", days: 7 },
  { label: "2 javë", days: 14 },
  { label: "1 muaj", days: 30 },
  { label: "3 muaj", days: 90 },
  { label: "6 muaj", days: 180 },
  { label: "1 vit", days: 365 },
];

function fmtL(n: number) {
  return Number(n || 0).toLocaleString("sq-AL") + " L";
}

function pct(part: number, total: number) {
  if (!total) return "0%";
  return Math.round((part / total) * 100) + "%";
}

const hoverLinePlugin: Plugin<"line"> = {
  id: "hoverLinePlugin",
  afterDatasetsDraw(chart) {
    const { ctx, tooltip, chartArea, scales } = chart;

    if (!tooltip || !tooltip.getActiveElements || !tooltip.getActiveElements().length) return;

    const activePoint = tooltip.getActiveElements()[0];
    if (!activePoint) return;

    const x = activePoint.element.x;
    const topY = chartArea.top;
    const bottomY = scales.y.bottom;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, bottomY);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(39,188,216,0.35)";
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  },
};

export default function ReportsView({
  API,
  points,
  reportPoint,
  setReportPoint,
}: Props) {
  const [periodDays, setPeriodDays] = useState<number>(30);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [data, setData] = useState<SummaryResp | null>(null);

  const pointPieRef = useRef<any>(null);
  const packagePieRef = useRef<any>(null);
  const lineRef = useRef<any>(null);

  const reqIdRef = useRef(0);

  async function load() {
    setBusy(true);
    setMsg(null);

    const myReqId = ++reqIdRef.current;

    try {
      const res = await fetch(`${API}/reports_summary.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_days: periodDays,
          point_name: reportPoint || "",
        }),
      });

      const j = (await res.json().catch(() => null)) as SummaryResp | null;

      if (myReqId !== reqIdRef.current) return;

      if (!res.ok || !j?.ok) {
        setData(null);
        setMsg(`Gabim: ${j?.error || "REPORTS_FAILED"}`);
        return;
      }

      setData(j);
    } catch {
      if (myReqId !== reqIdRef.current) return;
      setData(null);
      setMsg("Gabim gjatë ngarkimit të raporteve.");
    } finally {
      if (myReqId === reqIdRef.current) setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays, reportPoint]);

  const totals = useMemo(() => {
    const total_amount = data?.total_amount ?? 0;
    const total_count = data?.total_count ?? 0;
    return { total_amount, total_count };
  }, [data]);

  const byPoint = data?.by_point ?? [];
  const byPackage = data?.by_package ?? [];
  const trend = data?.trend ?? [];

  const palette = ["#27BCD8", "#10B981", "#F59E0B", "#EF4444", "#6366F1", "#22C55E", "#FB7185", "#A78BFA"];

  const pointChart = useMemo(() => {
    const labels = byPoint.map((x) => x.key || "Pa pikë");
    const values = byPoint.map((x) => Number(x.total || 0));
    return {
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: labels.map((_, i) => palette[i % palette.length]),
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            hoverOffset: 6,
          },
        ],
      },
      total: values.reduce((a, b) => a + b, 0),
    };
  }, [byPoint]);

  const packageChart = useMemo(() => {
    const labels = byPackage.map((x) => String(x.key || "").toUpperCase());
    const values = byPackage.map((x) => Number(x.total || 0));
    return {
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: labels.map((_, i) => palette[(i + 2) % palette.length]),
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            hoverOffset: 6,
          },
        ],
      },
      total: values.reduce((a, b) => a + b, 0),
    };
  }, [byPackage]);

  const lineChart = useMemo(() => {
    const labels = trend.map((t) => t.day);
    const values = trend.map((t) => Number(t.total || 0));

    return {
      data: {
        labels,
        datasets: [
          {
            label: "Të ardhurat",
            data: values,
            tension: 0.35,
            fill: true,
            borderColor: "#27BCD8",
            backgroundColor: (context: any) => {
              const chart = context.chart;
              const { ctx, chartArea } = chart;

              if (!chartArea) return "rgba(39,188,216,0.18)";

              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, "rgba(39,188,216,0.38)");
              gradient.addColorStop(0.45, "rgba(39,188,216,0.18)");
              gradient.addColorStop(1, "rgba(39,188,216,0.02)");
              return gradient;
            },
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "#27BCD8",
            pointBorderColor: "#27BCD8",
            pointBorderWidth: 0,
            hitRadius: 16,
          },
        ],
      },
    };
  }, [trend]);

  const donutOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const val = Number(ctx.raw || 0);
              return `${ctx.label}: ${fmtL(val)}`;
            },
          },
        },
      },
      cutout: "68%",
    }),
    []
  );

  const lineOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: false,
          backgroundColor: "rgba(10,10,10,0.92)",
          borderColor: "rgba(39,188,216,0.28)",
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: (items: any[]) => items?.[0]?.label || "",
            label: (ctx: any) => `Të ardhurat: ${fmtL(Number(ctx.raw || 0))}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.65)" },
          grid: {
            color: "rgba(255,255,255,0.06)",
            drawBorder: false,
          },
          border: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "rgba(255,255,255,0.65)",
            callback: function (value: any) {
              return Number(value || 0).toLocaleString("sq-AL");
            },
          },
          grid: {
            color: "rgba(255,255,255,0.06)",
            drawBorder: false,
          },
          border: {
            display: false,
          },
        },
      },
      elements: {
        line: {
          capBezierPoints: true,
        },
      },
    }),
    []
  );

  const periodLabel = useMemo(() => PERIODS.find((p) => p.days === periodDays)?.label || `${periodDays} ditë`, [periodDays]);
  const pointLabel = reportPoint ? reportPoint : "Të gjitha";

  async function doExport() {
    if (!data?.ok) return;

    try {
      const pointPng = pointPieRef.current?.toBase64Image?.();
      const packagePng = packagePieRef.current?.toBase64Image?.();
      const linePng = lineRef.current?.toBase64Image?.();

      const fileName = `Raport_${periodLabel.replaceAll(" ", "_")}_${pointLabel.replaceAll(" ", "_")}.xlsx`;

      await exportReportsExcel({
        fileName,
        periodLabel,
        pointLabel,
        totalAmount: totals.total_amount,
        totalCount: totals.total_count,
        byPoint,
        byPackage: byPackage.map((x) => ({ ...x, key: String(x.key || "").toUpperCase() })),
        trend,
        linePng,
        pointPiePng: pointPng,
        packagePiePng: packagePng,
        rawRows: (data as any)?.raw || [],
      });
    } catch {
      setMsg("Gabim gjatë export-it të Excel.");
    }
  }

  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <div className="text-white/70 text-sm">Kohëzgjatja</div>
            <select
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
              value={periodDays}
              onChange={(e) => setPeriodDays(parseInt(e.target.value, 10))}
            >
              {PERIODS.map((p) => (
                <option key={p.days} value={p.days}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <div className="text-white/70 text-sm">Pika (opsionale)</div>
            <select
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
              value={reportPoint}
              onChange={(e) => setReportPoint(e.target.value)}
            >
              <option value="">Të gjitha</option>
              {points.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="rounded-xl bg-[#27BCD8] text-black font-semibold px-5 py-3 disabled:opacity-60"
          >
            {busy ? "…" : "Rifresko"}
          </button>

          <button
            type="button"
            onClick={doExport}
            disabled={busy || !data?.ok}
            className="rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 font-semibold px-5 py-3 disabled:opacity-60"
            title={!data?.ok ? "Nuk ka të dhëna" : "Eksporto Excel"}
          >
            Export Excel
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-white/70 text-sm">
            Totali: <span className="text-white font-semibold">{fmtL(totals.total_amount)}</span>{" "}
            <span className="text-white/40">•</span> Pagesa:{" "}
            <span className="text-white font-semibold">{Number(totals.total_count || 0).toLocaleString("sq-AL")}</span>
          </div>

          {busy && (
            <div className="text-white/60 text-sm">
              Duke u përditësuar…
              <span className="inline-block ml-2 h-2 w-2 rounded-full bg-[#27BCD8] animate-pulse" />
            </div>
          )}
        </div>

        {msg && <div className="mt-2 text-sm text-red-300">{msg}</div>}
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">Të ardhura sipas Pikës</div>
          <div className="text-white/60 text-sm mt-1">Pie chart (majtas) + legjendë (djathtas)</div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 min-h-[260px]">
              {byPoint.length ? (
                <Doughnut ref={pointPieRef} data={pointChart.data as any} options={donutOpts as any} />
              ) : (
                <Empty />
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <LegendList items={byPoint} total={pointChart.total} palette={palette} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">Të ardhura sipas Paketës</div>
          <div className="text-white/60 text-sm mt-1">Shikon cilat paketa po gjenerojnë më shumë të ardhura</div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 min-h-[260px]">
              {byPackage.length ? (
                <Doughnut ref={packagePieRef} data={packageChart.data as any} options={donutOpts as any} />
              ) : (
                <Empty />
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <LegendList
                items={byPackage.map((x) => ({ ...x, key: String(x.key || "").toUpperCase() }))}
                total={packageChart.total}
                palette={palette.map((_, i) => palette[(i + 2) % palette.length])}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">Revenue Trend</div>
            <div className="text-white/60 text-sm mt-1">Line chart (cash). Tregon trendin e të ardhurave me kohën.</div>
          </div>

          <div className="text-right">
            <div className="text-white/60 text-xs">Totali</div>
            <div className="text-white font-semibold">{fmtL(totals.total_amount)}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 h-[320px]">
          {trend.length ? (
            <Line
              ref={lineRef}
              data={lineChart.data as any}
              options={lineOpts as any}
              plugins={[hoverLinePlugin]}
            />
          ) : (
            <Empty />
          )}
        </div>
      </div>
    </div>
  );
}

function Empty() {
  return <div className="h-full min-h-[220px] flex items-center justify-center text-white/50 text-sm">S’ka të dhëna.</div>;
}

function LegendList({
  items,
  total,
  palette,
}: {
  items: { key: string; total: number; count: number }[];
  total: number;
  palette: string[];
}) {
  return (
    <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
      {!items.length && <div className="text-white/50 text-sm">S’ka të dhëna.</div>}

      {items.map((it, i) => (
        <div
          key={it.key + ":" + i}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: palette[i % palette.length] }} />
            <div className="min-w-0">
              <div className="font-medium truncate">{it.key || "Pa emër"}</div>
              <div className="text-white/60 text-xs">
                {Number(it.count || 0).toLocaleString("sq-AL")} pagesa • {pct(Number(it.total || 0), total)}
              </div>
            </div>
          </div>

          <div className="font-semibold whitespace-nowrap">{fmtL(Number(it.total || 0))}</div>
        </div>
      ))}
    </div>
  );
}