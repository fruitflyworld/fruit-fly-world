import { NextResponse } from "next/server";
import { ARENA_E0, ARENA_STEPS, CELLS, MAP_COLUMNS, MAP_ROWS } from "../../lib/arena";
import { arenaCaps, arenaEnabled, currentWindow, ensureWindow, finalizeDue, lastWinner, standingFor } from "../../lib/server/arena";

export const dynamic = "force-dynamic";

/** The live state of the Foraging Hour: the clock, who leads, and the last slot taken.
 *  Public, and it drives finalizeDue() — there is no cron. */
export async function GET() {
  if (!arenaEnabled()) return NextResponse.json({ enabled: false, arena: null });
  try {
    const window = currentWindow();
    await ensureWindow(window);
    await finalizeDue();
    const [standing, lastWinnerClosed] = await Promise.all([standingFor(window.epoch), lastWinner()]);
    return NextResponse.json({
      enabled: true,
      window,
      map: { columns: MAP_COLUMNS, rows: MAP_ROWS, cells: CELLS },
      steps: ARENA_STEPS,
      e0: ARENA_E0,
      caps: arenaCaps(),
      standing,
      lastWinner: lastWinnerClosed
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read the arena" }, { status: 503 });
  }
}
