import { NextResponse } from "next/server";
import { arenaEnabled, finalizeDue, leaderboard, recentWinners } from "../../../lib/server/arena";

export const dynamic = "force-dynamic";

/** Cumulative standings. Every entry ever taken ranks here, winners included —
 *  the Passport is one per wallet, but the scoreboard is permanent. */
export async function GET() {
  if (!arenaEnabled()) return NextResponse.json({ enabled: false, top: [], winners: [] });
  try {
    await finalizeDue();
    const [top, winners] = await Promise.all([leaderboard(50), recentWinners(12)]);
    return NextResponse.json({ enabled: true, top, winners });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read the leaderboard" }, { status: 503 });
  }
}
