const base = (process.env.PAYPAL_ENV === "live")
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

export async function paypalAccessToken(){
  const id = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await res.json();
  if(!res.ok) throw new Error(data?.error_description || "PayPal token error");
  return { access_token: data.access_token as string, base };
}
