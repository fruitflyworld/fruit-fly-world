import { NextResponse } from "next/server";
import { currentSession } from "../../../../lib/server/session";
import { opaqueToken, tokenHash } from "../../../../lib/canonical";
import { query } from "../../../../lib/server/db";
import { enforceRateLimit } from "../../../../lib/server/rate-limit";
import { assertSameOrigin, clientIp } from "../../../../lib/server/request";
import { xPostText, xIntentUrl } from "../../../../lib/server/x-proof";

const CAMPAIGN = "genesis";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await currentSession();
    if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    await enforceRateLimit("x_challenge", `${clientIp(request)}:${session.address}`, 4, 600);
    const campaign = await query<{ official_x_post_id: string }>(
      `SELECT official_x_post_id FROM mission_campaigns
       WHERE id=$1 AND enabled=true AND official_x_post_id IS NOT NULL AND starts_at<=now() AND ends_at>now()`, [CAMPAIGN]
    );
    if (!campaign.rows[0]) throw new Error("X mission is not open");
    const code = `FFW-${opaqueToken(9).replace(/[-_]/g, "").toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 30 * 60_000);
    await query("INSERT INTO x_mission_challenges(code_hash,campaign_id,participant_address,expires_at) VALUES($1,$2,$3,$4)",
      [tokenHash(code), CAMPAIGN, session.address, expiresAt]);
    const officialPostId = campaign.rows[0].official_x_post_id;
    // The template and the composer link are generated here rather than in the
    // component so the UI, an agent, and the verifier all describe the same post.
    const postText = xPostText({ code, officialPostId });
    return NextResponse.json({ code, officialPostId, postText, intentUrl: xIntentUrl(postText), expiresAt: expiresAt.toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create X mission" }, { status: 400 });
  }
}
