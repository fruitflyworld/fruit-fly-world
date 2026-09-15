import { NextResponse } from "next/server";
import { query } from "../../../lib/server/db";
import { currentSession, SESSION_COOKIE } from "../../../lib/server/session";
import { tokenHash } from "../../../lib/canonical";
import { assertSameOrigin } from "../../../lib/server/request";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ session: await currentSession() });
}
export async function DELETE(request: Request) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Invalid request origin" }, { status: 403 }); }
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await query("DELETE FROM wallet_sessions WHERE token_hash=$1", [tokenHash(token)]);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return response;
}
