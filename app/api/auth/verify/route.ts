import { NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { opaqueToken, tokenHash } from "../../../lib/canonical";
import { transaction } from "../../../lib/server/db";
import { sessionCookie } from "../../../lib/server/session";
import { smallJson } from "../../../lib/server/input";
import { assertSameOrigin, clientIp } from "../../../lib/server/request";
import { enforceRateLimit } from "../../../lib/server/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit("auth_verify", clientIp(request), 10, 600);
    const body = await smallJson(request) as { message?: string; signature?: string };
    if (!body.message || !body.signature) throw new Error("Message and signature are required");
    const message = new SiweMessage(body.message);
    const host = request.headers.get("host") || "";
    const result = await message.verify({ signature: body.signature, domain: host, nonce: message.nonce });
    if (!result.success || Number(message.chainId) !== Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111)) throw new Error("Invalid signature");
    const address = message.address.toLowerCase();
    const token = opaqueToken();
    await transaction(async (client) => {
      const nonce = await client.query(
        `UPDATE wallet_nonces SET consumed_at = now()
         WHERE nonce_hash = $1 AND consumed_at IS NULL AND expires_at > now()
         RETURNING nonce_hash`, [tokenHash(message.nonce)]
      );
      if (!nonce.rowCount) throw new Error("Nonce expired or already used");
      await client.query(`INSERT INTO participants(address) VALUES($1)
        ON CONFLICT(address) DO UPDATE SET last_seen_at = now()`, [address]);
      await client.query("INSERT INTO wallet_sessions(token_hash,address,expires_at) VALUES($1,$2,now() + interval '7 days')", [tokenHash(token), address]);
    });
    const response = NextResponse.json({ address });
    response.cookies.set(sessionCookie(token));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Authentication failed" }, { status: 401 });
  }
}
