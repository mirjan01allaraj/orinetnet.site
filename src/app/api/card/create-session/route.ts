import { NextResponse } from "next/server";

export async function POST(){
  return NextResponse.json(
    { error: "Card payments disabled (enable later)" },
    { status: 400 }
  );
}
