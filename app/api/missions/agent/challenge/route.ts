import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { currentSession } from "../../../../lib/server/session";
import { parseSignals, smallJson } from "../../../../lib/server/input";
import { opaqueToken, tokenHash } from "../../../../lib/canonical";
import { query } from "../../../../lib/server/db";
import { enforceRateLimit } from "../../../../lib/server/rate-limit";
import { assertSameOrigin, clientIp } from "../../../../lib/server/request";

const CAMPAIGN = "genesis";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await currentSession();
    if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    await enforceRateLimit("agent_challenge", `${clientIp(request)}:${session.address}`, 5, 600);
    const body = await smallJson(request) as { agentAddress?: unknown; signals?: unknown };
    if (typeof body.agentAddress !== "string") throw new Error("Agent wallet is required");
    const agentAddress = getAddress(body.agentAddress).toLowerCase();
    if (agentAddress === session.address) throw new Error("Use a separate agent wallet");
    const signals = parseSignals(body.signals);
    const campaign = await query<{ enabled: boolean; ends_at: Date }>(
      "SELECT enabled,ends_at FROM mission_campaigns WHERE id=$1 AND enabled=true AND starts_at<=now() AND ends_at>now()", [CAMPAIGN]
    );
    if (!campaign.rows[0]) throw new Error("Agent mission is not open");
    const nonce = opaqueToken(24);
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const origin = new URL(request.url).origin;
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);
    const message = [
      "Fruit Fly World Agent Mission", `Domain: ${origin}`, `Chain ID: ${chainId}`,
      `Human wallet: ${session.address}`, `Agent wallet: ${agentAddress}`, `Campaign: ${CAMPAIGN}`,
      `Signals: food=${signals.food},threat=${signals.threat},light=${signals.light},novelty=${signals.novelty}`,
      `Nonce: ${nonce}`, `Expires: ${expiresAt.toISOString()}`
    ].join("\n");
    await query(
      `INSERT INTO agent_challenges(nonce_hash,campaign_id,participant_address,agent_address,challenge_message,food,threat,light,novelty,expires_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [tokenHash(nonce), CAMPAIGN, session.address, agentAddress, message, signals.food, signals.threat, signals.light, signals.novelty, expiresAt]
    );
    return NextResponse.json({ nonce, message, agentAddress, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create challenge" }, { status: 400 });
  }
}
