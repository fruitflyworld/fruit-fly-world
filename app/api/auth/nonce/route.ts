import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { tokenHash } from "../../../lib/canonical";
import { query } from "../../../lib/server/db";
import { enforceRateLimit } from "../../../lib/server/rate-limit";
import { assertSameOrigin, clientIp } from "../../../lib/server/request";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit("auth_nonce", clientIp(request), 10, 600);
    const nonce = randomBytes(16).toString("hex");
    await query("INSERT INTO wallet_nonces(nonce_hash, expires_at) VALUES($1, now() + interval '10 minutes')", [tokenHash(nonce)]);
    return NextResponse.json({ nonce });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create sign-in request" }, { status: 400 });
  }
}
