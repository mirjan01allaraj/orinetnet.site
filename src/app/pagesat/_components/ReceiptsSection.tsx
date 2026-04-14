"use client";

import type { ReactNode } from "react";
import type { ClientGroup, ReceiptRow, ViewMode } from "../_lib/dashboardTypes";

type Props = {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;

  receiptsSearch: string;
  setReceiptsSearch: (v: string) => void;

  receiptsLoading: boolean;

  displayedTotal: number;
  displayedCount: number;
  averageReceipt: number;

  receiptsData: {
    label: string;
    from: string | null;
    to: string | null;
  };

  periodMsg: string | null;
  globalSearchMsg: string | null;
  allClientsMsg?: string | null;
  clientNoPaymentsMsg?: string | null;

  filteredReceipts: ReceiptRow[];
  clientGroups: ClientGroup[];
  expandedClientKeys: string[];
  toggleClientGroup: (key: string) => void;

  refreshAction: () => void;
  exportReceipts: () => void;
  exportClients: () => void;

  highlightMatch: (
    text: string | number | null | undefined,
    query: string
  ) => ReactNode;

  formatDateDMY: (s?: string | null) => string;
  formatDateTime: (s?: string | null) => string;
};

export default function ReceiptsSection({
  viewMode,
  setViewMode,
  receiptsSearch,
  setReceiptsSearch,
  receiptsLoading,
  displayedTotal,
  displayedCount,
  averageReceipt,
  receiptsData,
  periodMsg,
  globalSearchMsg,
  allClientsMsg,
  clientNoPaymentsMsg,
  filteredReceipts,
  clientGroups,
  expandedClientKeys,
  toggleClientGroup,
  refreshAction,
  exportReceipts,
  exportClients,
  highlightMatch,
  formatDateDMY,
  formatDateTime,
}: Props) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            className="w-full sm:w-[320px] rounded-2xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
            placeholder={
              viewMode === "clients"
                ? "Kërko klient / tel / client ID"
                : "Kërko klient / tel / receipt / paketë"
            }
            value={receiptsSearch}
            onChange={(e) => setReceiptsSearch(e.target.value)}
          />

          {receiptsSearch.trim() && (
            <button
              type="button"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
              onClick={() => setReceiptsSearch("")}
            >
              Pastro
            </button>
          )}

          <button
            type="button"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 disabled:opacity-60"
            onClick={viewMode === "clients" ? exportClients : exportReceipts}
            disabled={
              viewMode === "clients"
                ? !clientGroups.length
                : !filteredReceipts.length
            }
          >
            Export filtro
          </button>

          <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                viewMode === "receipts"
                  ? "bg-[#27BCD8] text-black"
                  : "text-white/80 hover:bg-white/10"
              }`}
              onClick={() => setViewMode("receipts")}
            >
              Faturat
            </button>
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                viewMode === "clients"
                  ? "bg-[#27BCD8] text-black"
                  : "text-white/80 hover:bg-white/10"
              }`}
              onClick={() => setViewMode("clients")}
            >
              Klientët
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="text-white/50 text-xs uppercase tracking-wide">
              Totali
            </div>
            <div className="mt-1 font-semibold">
              {Number(displayedTotal || 0).toLocaleString("sq-AL")} L
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="text-white/50 text-xs uppercase tracking-wide">
              {viewMode === "clients" ? "Klientë" : "Fatura"}
            </div>
            <div className="mt-1 font-semibold">{displayedCount}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="text-white/50 text-xs uppercase tracking-wide">
              Mesatarja
            </div>
            <div className="mt-1 font-semibold">
              {averageReceipt.toLocaleString("sq-AL", {
                maximumFractionDigits: 0,
              })}{" "}
              L
            </div>
          </div>

          <button
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 disabled:opacity-60"
            onClick={refreshAction}
            disabled={receiptsLoading}
          >
            {receiptsLoading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mt-3 text-white/60 text-sm">
        {viewMode === "clients" ? (
          <span className="text-cyan-300/80">
            Po shfaqen të gjithë klientët me pagesa në DB, pavarësisht
            periudhës së zgjedhur.
          </span>
        ) : receiptsSearch.trim().length >= 2 ? (
          <span className="text-cyan-300/80">
            Duke kërkuar në të gjitha faturat, pavarësisht periudhës së zgjedhur.
          </span>
        ) : receiptsData.from && receiptsData.to ? (
          <>
            Nga{" "}
            <span className="font-semibold text-white">
              {formatDateDMY(receiptsData.from)}
            </span>{" "}
            deri më{" "}
            <span className="font-semibold text-white">
              {formatDateDMY(receiptsData.to)}
            </span>
          </>
        ) : receiptsData.from ? (
          <>
            Nga{" "}
            <span className="font-semibold text-white">
              {formatDateDMY(receiptsData.from)}
            </span>
          </>
        ) : (
          "Pa interval"
        )}
      </div>

      {periodMsg && viewMode !== "clients" && receiptsSearch.trim().length < 2 && (
        <div className="mt-3 text-sm text-white/80">{periodMsg}</div>
      )}

      {globalSearchMsg &&
        viewMode !== "clients" &&
        receiptsSearch.trim().length >= 2 && (
          <div className="mt-3 text-sm text-white/80">{globalSearchMsg}</div>
        )}

      {allClientsMsg && viewMode === "clients" && (
        <div className="mt-3 text-sm text-white/80">{allClientsMsg}</div>
      )}

      {clientNoPaymentsMsg && viewMode === "clients" && (
        <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {clientNoPaymentsMsg}
        </div>
      )}

      {viewMode === "receipts" ? (
        <div className="mt-4 space-y-2">
          {filteredReceipts.map((r) => (
            <a
              key={r.id}
              className="block rounded-xl border border-white/10 bg-black/30 px-4 py-3 hover:bg-black/40"
              href={`/pagesat/receipt/?id=${r.id}`}
              target="_blank"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">
                  {highlightMatch(r.receipt_no || `Fatura #${r.id}`, receiptsSearch)}
                </div>
                <div className="font-semibold">
                  {Number(r.amount_paid || 0).toLocaleString("sq-AL")} L
                </div>
              </div>
              <div className="text-white/60 text-sm">
                {highlightMatch(r.customer_name || "Klient", receiptsSearch)} •{" "}
                {highlightMatch(r.customer_phone || "Pa numër", receiptsSearch)} •{" "}
                {highlightMatch(r.package_code || "—", receiptsSearch)} •{" "}
                {r.months_selected || 0} muaj •{" "}
                {formatDateTime(r.created_at || r.payment_date || null)}
              </div>
            </a>
          ))}

          {!filteredReceipts.length && !receiptsLoading && (
            <div className="text-white/50 text-sm">
              {receiptsSearch.trim()
                ? "S’u gjet asnjë faturë për këtë kërkim."
                : "S’ka asnjë faturë për këtë periudhë."}
            </div>
          )}

          {receiptsLoading && (
            <div className="text-white/50 text-sm">Duke ngarkuar faturat…</div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {clientGroups.map((group) => {
            const isOpen = expandedClientKeys.includes(group.key);

            return (
              <div
                key={group.key}
                className="rounded-xl border border-white/10 bg-black/30 overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-black/40 transition"
                  onClick={() => toggleClientGroup(group.key)}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="font-semibold">
                        {group.customer_id !== undefined &&
                        group.customer_id !== null ? (
                          <>
                            <span className="text-white/40 mr-2">
                              #{group.customer_id}
                            </span>
                            {highlightMatch(group.customer_name, receiptsSearch)}
                          </>
                        ) : (
                          highlightMatch(group.customer_name, receiptsSearch)
                        )}
                      </div>
                      <div className="text-white/60 text-sm">
                        {highlightMatch(
                          group.customer_phone || "Pa numër",
                          receiptsSearch
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <div className="text-white/50 text-xs uppercase">
                          Fatura
                        </div>
                        <div className="font-semibold">{group.receipt_count}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <div className="text-white/50 text-xs uppercase">
                          Totali
                        </div>
                        <div className="font-semibold">
                          {group.total_paid.toLocaleString("sq-AL")} L
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 col-span-2 lg:col-span-1">
                        <div className="text-white/50 text-xs uppercase">
                          Fatura e fundit
                        </div>
                        <div className="font-semibold">
                          {formatDateTime(group.latest_receipt_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/10 p-3 space-y-2">
                    {group.receipts.map((r) => (
                      <a
                        key={`${group.key}-${r.id}`}
                        className="block rounded-xl border border-white/10 bg-black/20 px-4 py-3 hover:bg-black/30"
                        href={`/pagesat/receipt/?id=${r.id}`}
                        target="_blank"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium">
                            {highlightMatch(
                              r.receipt_no || `Fatura #${r.id}`,
                              receiptsSearch
                            )}
                          </div>
                          <div className="font-semibold">
                            {Number(r.amount_paid || 0).toLocaleString("sq-AL")} L
                          </div>
                        </div>
                        <div className="text-white/60 text-sm">
                          {highlightMatch(r.package_code || "—", receiptsSearch)} •{" "}
                          {r.months_selected || 0} muaj •{" "}
                          {formatDateTime(r.created_at || r.payment_date || null)}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {!clientGroups.length && !receiptsLoading && !clientNoPaymentsMsg && (
            <div className="text-white/50 text-sm">
              {receiptsSearch.trim()
                ? "S’u gjet asnjë klient me fatura për këtë kërkim."
                : "S’ka klientë me fatura të regjistruara në sistem."}
            </div>
          )}

          {receiptsLoading && (
            <div className="text-white/50 text-sm">Duke ngarkuar klientët…</div>
          )}
        </div>
      )}
    </div>
  );
}