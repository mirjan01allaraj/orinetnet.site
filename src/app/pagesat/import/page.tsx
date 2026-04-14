"use client";

import { useEffect, useState } from "react";

const API = "/pagesat-api";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch(`${API}/me.php`, { credentials: "include" });
      const j = await r.json();
      if (!j.user || j.user.role !== "admin") window.location.href = "/pagesat/";
    })();
  }, []);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/import_customers.php`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      setResult(await res.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-2xl font-semibold">Import Klientësh (Excel)</div>
        <div className="text-white/70 text-sm mt-1">
          Headers: <b>Emri</b>, <b>Mbiemri</b>, <b>Tel</b> / <b>Telefoni</b>
        </div>

        <div className="mt-5 space-y-3">
          <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full" />

          <button onClick={upload} disabled={!file || busy}
            className="w-full rounded-xl bg-[#27BCD8] text-black font-semibold py-3 disabled:opacity-60">
            {busy ? "Duke importuar…" : "Importo"}
          </button>

          {result && (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
              <div><b>Inserted:</b> {result.inserted ?? "-"}</div>
              <div><b>Skipped duplicates:</b> {result.skipped_duplicates ?? "-"}</div>
              <div><b>Errors:</b> {result.errors ?? "-"}</div>
              {!result.ok && <div className="text-red-300 mt-2">Gabim: {result.error}</div>}
            </div>
          )}

          <a className="text-white/80 underline" href="/pagesat/">Kthehu</a>
        </div>
      </div>
    </div>
  );
}
