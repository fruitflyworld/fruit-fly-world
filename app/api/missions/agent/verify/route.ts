import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { currentSession } from "../../../../lib/server/session";
import { smallJson } from "../../../../lib/server/input";
import { tokenHash } from "../../../../lib/canonical";
import { query } from "../../../../lib/server/db";
import { enforceRateLimit } from "../../../../lib/server/rate-limit";
import { assertSameOrigin, clientIp } from "../../../../lib/server/request";
import { persistAgentExperiment } from "../../../../lib/server/missions";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await currentSession();
    if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    await enforceRateLimit("agent_verify", `${clientIp(request)}:${session.address}`, 8, 600);
    const body = await smallJson(request) as { nonce?: unknown; signature?: unknown };
    if (typeof body.nonce !== "string" || typeof body.signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(body.signature)) throw new Error("Challenge signature is required");
    const nonceHash = tokenHash(body.nonce);
    const found = await query<{ campaign_id: string; agent_address: `0x${string}`; challenge_message: string; food: number; threat: number; light: number; novelty: number }>(
      `SELECT campaign_id,agent_address,challenge_message,food,threat,light,novelty FROM agent_challenges
       WHERE nonce_hash=$1 AND participant_address=$2 AND consumed_at IS NULL AND expires_at>now()`, [nonceHash, session.address]
    );
    const challenge = found.rows[0];
    if (!challenge) throw new Error("Agent challenge expired or already used");
    const valid = await verifyMessage({ address: challenge.agent_address, message: challenge.challenge_message, signature: body.signature as `0x${string}` });
    if (!valid) throw new Error("Invalid agent wallet signature");
    const evidenceHash = createHash("sha256").update(`${challenge.challenge_message}\n${body.signature.toLowerCase()}`).digest("hex");
    const experiment = await persistAgentExperiment({
      participant: session.address, agent: challenge.agent_address, campaign: challenge.campaign_id,
      signals: { food: challenge.food, threat: challenge.threat, light: challenge.light, novelty: challenge.novelty },
      evidenceHash, nonceHash
    });
    return NextResponse.json({ verified: true, mission: "AGENT", experiment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent verification failed";
    const conflict = /unique|duplicate/i.test(message);
    return NextResponse.json({ error: conflict ? "This wallet is already bound to a mission" : message }, { status: conflict ? 409 : 400 });
  }
}
