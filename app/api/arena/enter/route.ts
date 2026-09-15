import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { scoreRoute, validateRoute } from "../../../lib/arena";
import type { Signals } from "../../../lib/experiment";
import { parseSignals, smallJson } from "../../../lib/server/input";
import { enforceRateLimit } from "../../../lib/server/rate-limit";
import { assertSameOrigin, clientIp } from "../../../lib/server/request";
import { currentSession } from "../../../lib/server/session";
import { arenaEnabled, currentWindow, submitEntry } from "../../../lib/server/arena";

export const dynamic = "force-dynamic";

/**
 * Take one route into the open window from the browser, as the signed-in operator.
 *
 * This is the same entry as POST /api/arena/submit, through the other door: the
 * agent lane proves itself with a wallet signature because an agent has no browser;
 * here the session cookie is the proof, so the route needs no signature at all. That
 * is not a weakening — the server recomputes every score from the route with the same
 * pure function (app/lib/arena.ts), so nothing an entry *claims* is trusted on either
 * lane. The signature and the session only decide whose entry it is.
 *
 * Unlike /api/arena/submit this one MUST check the origin: the credential is a cookie,
 * which a browser attaches to a cross-site request on its own.
 */
export async function POST(request: Request) {
  if (!arenaEnabled()) return NextResponse.json({ error: "The arena is closed" }, { status: 404 });
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Invalid request origin" }, { status: 403 }); }
  try {
    const ip = clientIp(request);
    // Burst protection only. The caps that decide eligibility are the SQL counts in submitEntry.
    await enforceRateLimit("arena_enter", ip, 20, 600);

    const session = await currentSession();
    if (!session) throw new Error("Sign in to enter this window");

    const body = await smallJson(request) as { epoch?: unknown; route?: unknown; signals?: unknown };
    if (typeof body.epoch !== "number" || !Number.isInteger(body.epoch)) throw new Error("Epoch is required");

    const window = currentWindow();
    if (body.epoch !== window.epoch) throw new Error("This window has closed. Fetch a fresh brief and submit again.");

    const route = body.route;
    const problem = validateRoute(route, body.signals);
    if (problem) throw new Error(problem);
    const signals = (body.signals as unknown[]).map((station) => parseSignals(station)) as Signals[];

    // The nonce guards the (epoch, agent, nonce) uniqueness. Nothing is signed here, so
    // it is the server's to mint — a client-chosen one would only be a way to overwrite
    // a try, and there is nothing to overwrite: this lane pays by retrying a route.
    const nonce = `0x${randomBytes(16).toString("hex")}`;
    const score = scoreRoute(body.epoch, route as string[], signals);
    const result = await submitEntry({
      epoch: body.epoch,
      // A manual entry is its own agent: the operator's address occupies both slots,
      // which keeps the per-window try cap counting one person, one window.
      agentAddress: session.address,
      participantAddress: session.address,
      lane: "manual",
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
    const unauthorized = /Sign in to enter/i.test(message);
    return NextResponse.json({ error: message }, { status: unauthorized ? 401 : conflict ? 409 : 400 });
  }
}
