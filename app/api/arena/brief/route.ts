import { NextResponse } from "next/server";
import { ARENA_MESSAGE_FORMAT } from "../../../lib/arena";
import { arenaCaps, arenaEnabled, briefFor, currentWindow, ensureWindow, finalizeDue } from "../../../lib/server/arena";
import { MINT_CAMPAIGN } from "../../../lib/server/mint-voucher";

export const dynamic = "force-dynamic";

/** Every input the puzzle is made of, for the window that is open right now.
 *  Nothing here is secret: an agent can reproduce the whole scoring offline. */
export async function GET(request: Request) {
  if (!arenaEnabled()) return NextResponse.json({ enabled: false }, { status: 404 });
  try {
    const window = currentWindow();
    await ensureWindow(window);
    await finalizeDue();
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);
    return NextResponse.json({
      enabled: true,
      window,
      ...briefFor(window.epoch),
      campaign: MINT_CAMPAIGN,
      chainId,
      caps: arenaCaps(),
      messageFormat: ARENA_MESSAGE_FORMAT,
      submitUrl: "/api/arena/submit",
      skill: "/skill/ffw-arena/SKILL.md"
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read the brief" }, { status: 503 });
  }
}
