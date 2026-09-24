// /api/race/grade — replay a closed week and persist ranks.
// Open: POST { week, token } where token matches RACE_OPERATOR_TOKEN. If the
// token env is unset, grading is also triggered lazily by GET /api/race once a
// week is closed and all entries are revealed — this route just lets the
// operator do it on demand and see the receipts.
import { NextResponse } from "next/server";
import { gradeWeek, weekEntries } from "../../../lib/server/race";
import { phaseOf, weekOf } from "../../../lib/server/race-core";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { week?: unknown; token?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const operatorToken = process.env.RACE_OPERATOR_TOKEN;
  if (!operatorToken) return NextResponse.json({ error: "grading is not operator-enabled on this server" }, { status: 501 });
  if (body.token !== operatorToken) return NextResponse.json({ error: "bad token" }, { status: 401 });

  const week = Number(body.week);
  if (!Number.isInteger(week) || week < 0 || week > weekOf(Date.now())) {
    return NextResponse.json({ error: "week must be a past or current week number" }, { status: 400 });
  }
  if (phaseOf(Date.now(), week) !== "closed") {
    return NextResponse.json({ error: "week has not ended yet" }, { status: 409 });
  }

  try {
    const result = await gradeWeek(week);
    const entries = await weekEntries(week);
    return NextResponse.json({
      week,
      draw: result.draw,
      ranked: result.ranked,
      voided: entries.filter((e) => e.revealed_policy == null).map((e) => e.entrant),
    });
  } catch (e) {
    return NextResponse.json({ error: "grading failed", detail: String((e as Error)?.message).slice(0, 200) }, { status: 500 });
  }
}
