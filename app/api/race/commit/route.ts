// /api/race/commit — lock an exam entry for the current week.
// Body: { address, signature, brain, preference: string[] } — the signature is
// EIP-191 over the commit message; the server derives and stores the sha256
// commitment of the canonical policy and NEVER stores the plaintext policy at
// commit time (that is the reveal's job, after the draw).
import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import {
  RACE_BRAINS, commitmentOf, commitMessage, isAddressLike, phaseOf, weekOf,
} from "../../../lib/server/race-core";
import { saveEntry, weekEntries } from "../../../lib/server/race";

export const dynamic = "force-dynamic";

const RATE_LIMIT = 10; // per IP per minute
const WINDOW_MS = 60_000;
const MAX_PER_WEEK = 256;
const hits = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= RATE_LIMIT) return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  list.push(now);
  hits.set(ip, list);

  const raw = await req.text();
  if (raw.length > 16 * 1024) return NextResponse.json({ error: "body too large" }, { status: 413 });
  let body: { address?: unknown; signature?: unknown; brain?: unknown; preference?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  if (!isAddressLike(body.address)) return NextResponse.json({ error: "address must be a 0x address" }, { status: 400 });
  const address = body.address.trim().toLowerCase() as `0x${string}`;
  if (typeof body.signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(body.signature)) {
    return NextResponse.json({ error: "signature must be hex" }, { status: 400 });
  }
  const brain = body.brain;
  if (typeof brain !== "string" || !(RACE_BRAINS as readonly string[]).includes(brain)) {
    return NextResponse.json({ error: `brain must be one of ${RACE_BRAINS.join("/")}` }, { status: 400 });
  }
  if (!Array.isArray(body.preference) || body.preference.length > 24 || !body.preference.every((p) => typeof p === "string" && /^[a-z0-9_+-]{1,24}$/.test(p))) {
    return NextResponse.json({ error: "preference must be an array of trait ids" }, { status: 400 });
  }
  // duplicates are legal but meaningless; canonical form sorts
  const preference = [...new Set(body.preference as string[])];

  const week = weekOf(Date.now());
  if (phaseOf(Date.now(), week) !== "commit") {
    return NextResponse.json({ error: "commit window closed for this week" }, { status: 409 });
  }

  const commitment = commitmentOf(week, { brain: brain as (typeof RACE_BRAINS)[number], preference });
  const message = commitMessage(week, brain, commitment);
  const valid = await verifyMessage({ address, message, signature: body.signature as `0x${string}` }).catch(() => false);
  if (!valid) return NextResponse.json({ error: "signature does not verify" }, { status: 401 });

  try {
    const existing = await weekEntries(week);
    if (existing.some((e) => e.entrant === address)) {
      return NextResponse.json({ error: "already committed this week" }, { status: 409 });
    }
    if (existing.length >= MAX_PER_WEEK) {
      return NextResponse.json({ error: "week is full" }, { status: 409 });
    }
    await saveEntry(week, address, brain as (typeof RACE_BRAINS)[number], commitment);
  } catch (e) {
    return NextResponse.json({ error: "commit failed", detail: String((e as Error)?.message).slice(0, 200) }, { status: 500 });
  }

  return NextResponse.json({ week, commitment, note: "policy plaintext is revealed after the draw via /api/race/reveal" });
}
