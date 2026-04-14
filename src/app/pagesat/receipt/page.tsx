"use client";

import { useEffect, useState } from "react";

const API = "/pagesat-api";

async function getPayment(id: string) {
  const res = await fetch(`${API}/receipt_get.php?id=${encodeURIComponent(id)}`, { credentials: "include" });
  return res.json();
}

export default function ReceiptPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) { setErr("Mungon ID."); return; }
    (async () => {
      const j = await getPayment(id);
      if (!j.ok) { setErr("Nuk lejohet / Nuk u gjet."); return; }
      setData(j.payment);
      setTimeout(() => window.print(), 300);
    })();
  }, []);

  if (err) return <div className="min-h-screen bg-white text-black p-6">{err}</div>;
  if (!data) return <div className="min-h-screen bg-white text-black p-6">Duke ngarkuar…</div>;

  return (
    <div className="bg-white text-black min-h-screen p-6">
      <style>{`
        @media print {
          .no-print { display: none; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="max-w-lg mx-auto border border-black/20 p-5">
        <div className="text-center">
          <div className="text-xl font-bold">ORIENT NET ISP</div>
          <div className="text-sm">NIPT: ________</div>
          <div className="text-sm">Adresa: ________</div>
        </div>

        <hr className="my-4 border-black/20" />

        <div className="text-sm space-y-1">
          <div><b>Konfirmim Pagese</b></div>
          <div><b>Nr. Fatures:</b> {data.receipt_no}</div>
          <div><b>Data/Ora:</b> {new Date(data.created_at).toLocaleString("sq-AL")}</div>
          <div><b>Pika e pagesës:</b> {data.point_name}</div>
        </div>

        <hr className="my-4 border-black/20" />

        <div className="text-sm space-y-1">
          <div><b>Klienti:</b> {data.customer_name}</div>
          <div><b>Telefoni:</b> {data.customer_phone || "—"}</div>
          <div><b>Paketa:</b> {String(data.package_code).toUpperCase()}</div>
          <div><b>Muaj:</b> {data.months_selected}</div>
          <div><b>Totali i paguar:</b> {Number(data.amount_paid).toLocaleString("sq-AL")} L</div>
          <div><b>Arsyeja:</b> {data.reason}</div>
          {data.note ? <div><b>Shënim:</b> {data.note}</div> : null}
        </div>

        <hr className="my-4 border-black/20" />

        <div className="text-xs text-center text-black/70">
          Ky dokument nuk është kupon fiskal.
        </div>

        <div className="no-print mt-4 flex gap-2 justify-center">
          <button className="border border-black/30 px-4 py-2" onClick={() => window.print()}>Printo</button>
          <button className="border border-black/30 px-4 py-2" onClick={() => window.close()}>Mbyll</button>
        </div>
      </div>
    </div>
  );
}
