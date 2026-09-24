// /api/race/reveal — publish the committed policy after the draw.
// Body: { address, signature, brain, preference } — the server re-derives the
// commitment; it must equal what was committed pre-draw, otherwise the entry
// stays unrevealed and is voided at grading.
import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import {
  RACE_BRAINS, commitmentOf, phaseOf, revealMessage, weekOf,
} from "../../../lib/server/race-core";
import { ensureDrawn, saveReveal, weekEntries } from "../../../lib/server/race";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 16 * 1024) return NextResponse.json({ error: "body too large" }, { status: 413 });
  let body: { address?: unknown; signature?: unknown; brain?: unknown; preference?: unknown };
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  if (typeof body.address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(body.address.trim())) {
    return NextResponse.json({ error: "bad address" }, { status: 400 });
  }
  const address = body.address.trim().toLowerCase() as `0x${string}`;
  if (typeof body.signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(body.signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const brain = body.brain;
  if (typeof brain !== "string" || !(RACE_BRAINS as readonly string[]).includes(brain)) {
    return NextResponse.json({ error: "bad brain" }, { status: 400 });
  }
  if (!Array.isArray(body.preference) || !body.preference.every((p) => typeof p === "string" && /^[a-z0-9_+-]{1,24}$/.test(p))) {
    return NextResponse.json({ error: "bad preference" }, { status: 400 });
  }
  const preference = [...new Set(body.preference as string[])];

  const week = weekOf(Date.now());
  const phase = phaseOf(Date.now(), week);
  if (phase === "commit") return NextResponse.json({ error: "draw has not happened yet" }, { status: 409 });

  try {
    const entry = (await weekEntries(week)).find((e) => e.entrant === address);
    if (!entry) return NextResponse.json({ error: "no entry for this week" }, { status: 404 });
    if (entry.revealed_policy != null) return NextResponse.json({ error: "already revealed" }, { status: 409 });

    const commitment = commitmentOf(week, { brain: brain as (typeof RACE_BRAINS)[number], preference });
    if (commitment !== entry.commitment) {
      return NextResponse.json({ error: "policy does not match the committed hash", expectedCommitment: entry.commitment }, { status: 400 });
    }
    const valid = await verifyMessage({
      address, message: revealMessage(week, entry.commitment), signature: body.signature as `0x${string}`,
    }).catch(() => false);
    if (!valid) return NextResponse.json({ error: "signature does not verify" }, { status: 401 });

    await saveReveal(week, address, { brain: brain as (typeof RACE_BRAINS)[number], preference });
    const draw = await ensureDrawn(week);
    return NextResponse.json({
      week, revealed: true,
      draw,
      note: phase === "closed" ? "grading runs on the next status poll" : "grading runs when the week closes",
    });
  } catch (e) {
    return NextResponse.json({ error: "reveal failed", detail: String((e as Error)?.message).slice(0, 200) }, { status: 500 });
  }
}
