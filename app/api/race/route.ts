// /api/race — the weekly race: current week status + leaderboard.
import { NextResponse } from "next/server";
import { leaderboard, raceStatus, weekEntries } from "../../lib/server/race";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const weekParam = url.searchParams.get("week");
  try {
    const status = await raceStatus();
    let board: unknown = [];
    let entries: unknown[] = [];
    const week = weekParam !== null && /^\d+$/.test(weekParam) ? Number(weekParam) : status.week;
    if (status.phase === "closed" || week < status.week) {
      board = await leaderboard(week);
    } else {
      // live week: show commitments, not policies
      entries = (await weekEntries(week)).map((e) => ({
        entrant: e.entrant, brain: e.brain, commitment: e.commitment,
        revealed: e.revealed_policy != null, graded: e.rank != null,
      }));
    }
    return NextResponse.json({
      ...status,
      note: "commit a policy hash before the cutoff; the exam seed is drawn from an Ethereum block mined after it; grading replays world.js — anyone can re-run it",
      liveEntries: entries,
      leaderboard: board,
    });
  } catch (e) {
    return NextResponse.json({ error: "race status failed", detail: String((e as Error)?.message).slice(0, 200) }, { status: 500 });
  }
}
