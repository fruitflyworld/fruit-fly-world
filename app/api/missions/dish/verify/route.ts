import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { currentSession } from "../../../../lib/server/session";
import { smallJson } from "../../../../lib/server/input";
import { query } from "../../../../lib/server/db";
import { enforceRateLimit } from "../../../../lib/server/rate-limit";
import { assertSameOrigin, clientIp } from "../../../../lib/server/request";
import { dishEvidenceHash, verifyDishEvidence, type DishEvidence } from "../../../../lib/dish";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await currentSession();
    if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    await enforceRateLimit("dish_verify", `${clientIp(request)}:${session.address}`, 10, 600);
    const body = await smallJson(request);
    // verifyDishEvidence validates and clamps every field; it throws on forgery patterns
    const quest = verifyDishEvidence(body);
    const evidence = body as DishEvidence;
    const evidenceHash = dishEvidenceHash(evidence, (data) => createHash("sha256").update(data).digest("hex"));
    const evidenceRef = `dish:${quest}:g${evidence.gen}:${evidence.ts}`;
    await query(
      `INSERT INTO mission_completions(participant_address,mission_type,campaign_id,evidence_type,evidence_ref,evidence_hash)
       VALUES($1,'DISH','genesis','dish_quest',$2,$3) ON CONFLICT DO NOTHING`,
      [session.address, evidenceRef, evidenceHash]
    );
    return NextResponse.json({ verified: true, mission: "DISH", quest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dish quest verification failed";
    const conflict = /unique|duplicate/i.test(message);
    return NextResponse.json({ error: conflict ? "Dish quest already recorded for this wallet" : message }, { status: conflict ? 409 : 400 });
  }
}
