import { NextResponse } from "next/server";
import { getAddress, verifyMessage } from "viem";
import { arenaMessage, scoreRoute, validateRoute } from "../../../lib/arena";
import type { Signals } from "../../../lib/experiment";
import { parseSignals, smallJson } from "../../../lib/server/input";
import { query } from "../../../lib/server/db";
import { enforceRateLimit } from "../../../lib/server/rate-limit";
import { clientIp } from "../../../lib/server/request";
import { arenaEnabled, currentWindow, submitEntry } from "../../../lib/server/arena";
import { MINT_CAMPAIGN } from "../../../lib/server/mint-voucher";

export const dynamic = "force-dynamic";

/**
 * Take one route into the open window, signed by an agent wallet.
 *
 * There is no session cookie here, on purpose: an agent runs on a machine with no
 * browser, so it proves itself with its own wallet signature over the canonical
 * message. The participant behind that agent wallet is whatever the AGENT mission
 * already bound — bind once, then enter every hour. assertSameOrigin() is therefore
 * not applied; the signature is the authentication, and the entry is worthless to
 * anyone who cannot produce it.
 *
 * A human enters the same window by hand at POST /api/arena/enter, which is
 * session-authenticated instead. Both lanes write one row of arena_entries with the
 * same recomputed score, and the close decides between them without caring which door
 * was used — see app/lib/server/arena.ts, `lane`.
 */
export async function POST(request: Request) {
  if (!arenaEnabled()) return NextResponse.json({ error: "The arena is closed" }, { status: 404 });
  try {
    const ip = clientIp(request);
    // Burst protection only. The caps that decide eligibility are the SQL counts in submitEntry.
    await enforceRateLimit("arena_submit", ip, 20, 600);
    const body = await smallJson(request) as {
      agentAddress?: unknown; epoch?: unknown; nonce?: unknown; route?: unknown; signals?: unknown; signature?: unknown;
    };

    if (typeof body.agentAddress !== "string") throw new Error("Agent wallet is required");
    const agentAddress = getAddress(body.agentAddress).toLowerCase();
    if (typeof body.epoch !== "number" || !Number.isInteger(body.epoch)) throw new Error("Epoch is required");
    if (typeof body.nonce !== "string" || !/^0x[0-9a-fA-F]{32,64}$/.test(body.nonce)) throw new Error("Nonce must be 32 to 64 hex characters");
    const nonce = body.nonce.toLowerCase();
    if (typeof body.signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(body.signature)) throw new Error("A route signature is required");

    const window = currentWindow();
    if (body.epoch !== window.epoch) throw new Error("This window has closed. Fetch a fresh brief and submit again.");

    const route = body.route;
    const problem = validateRoute(route, body.signals);
    if (problem) throw new Error(problem);
    const signals = (body.signals as unknown[]).map((station) => parseSignals(station)) as Signals[];

    const bound = await query<{ participant_address: string }>(
      "SELECT participant_address FROM agent_mission_proofs WHERE campaign_id=$1 AND agent_address=$2",
      [MINT_CAMPAIGN, agentAddress]
    );
    const participantAddress = bound.rows[0]?.participant_address;
    if (!participantAddress) {
      throw new Error("This agent wallet is not bound yet. Complete the AGENT mission once, then enter every hour.");
    }

    const message = arenaMessage({
      epoch: body.epoch,
      campaign: MINT_CAMPAIGN,
      chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111),
      agentAddress,
      route: route as string[],
      signals,
      nonce
    });
    const valid = await verifyMessage({ address: agentAddress as `0x${string}`, message, signature: body.signature as `0x${string}` });
    if (!valid) throw new Error("Invalid agent wallet signature");

    const score = scoreRoute(body.epoch, route as string[], signals);
    const result = await submitEntry({
      epoch: body.epoch,
      agentAddress,
      participantAddress,
      lane: "agent",
      route: route as string[],
      signals,
      nonce,
      score,
      ip
    });
    return NextResponse.json({ ...result, decidedAt: window.endsAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not take the entry";
    const conflict = /already been submitted|already used its|already took a Passport|Too many entries/i.test(message);
    return NextResponse.json({ error: message }, { status: conflict ? 409 : 400 });
  }
}
