import { NextResponse } from "next/server";
import { query } from "../../lib/server/db";
import { currentSession } from "../../lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ session: null, eligible: false, completed: [] });
  const result = await query<{ mission_type: string }>("SELECT mission_type FROM mission_completions WHERE participant_address=$1 AND campaign_id='genesis' AND mission_type IN ('AGENT','X_QUOTE','ARENA') ORDER BY created_at", [session.address]);
  const completed = result.rows.map((row) => row.mission_type);
  // ARENA is awarded by the close of an hourly window, not claimed by the entrant: the
  // route itself is submitted while the window is open (by hand or by an agent).
  return NextResponse.json({ session, eligible: completed.some((mission) => mission === "AGENT" || mission === "X_QUOTE" || mission === "ARENA"), completed });
}
