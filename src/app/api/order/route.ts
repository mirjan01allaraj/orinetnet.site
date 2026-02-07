import { NextResponse } from "next/server";

export async function POST(req: Request){
  const body = await req.json();

  // TODO later: save to DB / Google Sheet / send email / Telegram
  console.log("NEW ORDER (manual):", body);

  return NextResponse.json({ ok: true });
}
