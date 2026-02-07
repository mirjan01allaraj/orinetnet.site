import { NextResponse } from "next/server";
import { paypalAccessToken } from "@/lib/paypal/client";

export async function POST(req: Request){
  try{
    const payload = await req.json();
    const { access_token, base } = await paypalAccessToken();

    const chargeCurrency = process.env.PAYPAL_CHARGE_CURRENCY || "EUR";
    const value = Number(payload.totalEur || 0).toFixed(2);

    const origin = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: `Orient Net - ${payload.planName} (${payload.customer?.duration} muaj)`,
            amount: { currency_code: chargeCurrency, value }
          }
        ],
        application_context: {
          return_url: `${origin}/api/paypal/capture-order`,
          cancel_url: `${origin}/checkout/cancel`
        }
      })
    });

    const data = await res.json();
    if(!res.ok) return NextResponse.json({ error: data }, { status: 400 });

    const approval = data.links?.find((l:any)=> l.rel === "approve")?.href;
    return NextResponse.json({ id: data.id, approvalUrl: approval });
  }catch(e:any){
    return NextResponse.json({ error: e.message || "create-order error" }, { status: 500 });
  }
}
