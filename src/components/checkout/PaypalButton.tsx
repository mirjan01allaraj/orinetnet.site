"use client";

import { useState } from "react";

export default function PaypalButton({ payload }: { payload: any }){
  const [loading, setLoading] = useState(false);

  async function start(){
    try{
      setLoading(true);
      const res = await fetch("/api/paypal/create-order", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data?.error || "PayPal create error");

      window.location.href = data.approvalUrl;
    }catch(e:any){
      alert(e.message || "PayPal error");
    }finally{
      setLoading(false);
    }
  }

  return (
    <button
      onClick={start}
      disabled={loading}
      className="w-full px-4 py-3 rounded-xl border border-[var(--border)] hover:bg-white/5"
    >
      {loading ? "Duke hapur PayPal..." : "Paguaj me PayPal"}
    </button>
  );
}
