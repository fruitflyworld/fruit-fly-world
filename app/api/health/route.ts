import { NextResponse } from "next/server";
import { query } from "../../lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await query("SELECT 1");
    return NextResponse.json({ ok: true, service: "fruit-fly-world" });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
