import { NextResponse } from "next/server";
import { paypalAccessToken } from "@/lib/paypal/client";

export async function GET(req: Request){
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token"); // PayPal order id
  if(!token) return NextResponse.redirect(new URL("/checkout/cancel", req.url));

  try{
    const { access_token, base } = await paypalAccessToken();

    const res = await fetch(`${base}/v2/checkout/orders/${token}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await res.json();
    if(!res.ok){
      console.log("CAPTURE ERROR:", data);
      return NextResponse.redirect(new URL("/checkout/cancel", req.url));
    }

    console.log("PAYPAL CAPTURE OK:", data);
    return NextResponse.redirect(new URL("/checkout/success", req.url));
  }catch(e:any){
    console.log("CAPTURE EX:", e);
    return NextResponse.redirect(new URL("/checkout/cancel", req.url));
  }
}
