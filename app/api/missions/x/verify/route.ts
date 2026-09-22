import { NextResponse } from "next/server";
import { currentSession } from "../../../../lib/server/session";
import { smallJson } from "../../../../lib/server/input";
import { tokenHash } from "../../../../lib/canonical";
import { transaction } from "../../../../lib/server/db";
import { enforceRateLimit } from "../../../../lib/server/rate-limit";
import { assertSameOrigin, clientIp } from "../../../../lib/server/request";
import { fetchXPost, findXPostByHandle, parseXPostId, xEvidenceHash, xFollowsUs, X_HANDLE, X_REQUIRED_TAGS, XProofError, type XPost } from "../../../../lib/server/x-proof";

/** Reasons that mean "X has not caught up yet", not "your post is wrong". A
 *  freshly published post takes a few seconds to become readable, and treating
 *  that as a rejection is how a working flow loses people at the last step. */
const RETRYABLE = new Set(["post-not-found", "x-unreachable"]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await currentSession();
    if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    await enforceRateLimit("x_verify", `${clientIp(request)}:${session.address}`, 5, 600);
    const body = await smallJson(request) as { code?: unknown; postUrl?: unknown; handle?: unknown };
    if (typeof body.code !== "string") throw new Error("A proof code is required");
    if (!/^FFW-[A-Z0-9]{8,20}$/.test(body.code)) throw new Error("Invalid proof code");
    const postInput = typeof body.postUrl === "string" ? body.postUrl.trim() : "";
    const handleInput = typeof body.handle === "string" ? body.handle.trim() : "";
    if (!postInput && !handleInput) throw new Error("Paste the post link, or just your @handle");

    const codeHash = tokenHash(body.code);
    const challengeResult = await transaction(async (client) => {
      const result = await client.query<{ campaign_id: string; official_x_post_id: string; created_at: Date; expires_at: Date }>(
        `SELECT c.campaign_id,m.official_x_post_id,c.created_at,c.expires_at
         FROM x_mission_challenges c JOIN mission_campaigns m ON m.id=c.campaign_id
         WHERE c.code_hash=$1 AND c.participant_address=$2 AND c.consumed_at IS NULL AND c.expires_at>now()
           AND m.enabled=true AND m.starts_at<=now() AND m.ends_at>now() FOR UPDATE`, [codeHash, session.address]
      );
      if (!result.rows[0]) throw new Error("X proof code expired or already used");
      return result.rows[0];
    });

    // Two ways in. `postUrl` is exact; `handle` scans the last few posts for the
    // code, because hunting for your own permalink on a phone is the step this
    // mission loses the most people on.
    let post: XPost;
    try {
      post = postInput ? await fetchXPost(parseXPostId(postInput)) : (await findXPostByHandle(handleInput, body.code)) ?? (() => { throw new XProofError("not-found-in-timeline", true); })();
    } catch (error) {
      if (error instanceof XProofError) {
        const retry = error.retryable || RETRYABLE.has(error.reason);
        return NextResponse.json({
          error: error.reason === "not-found-in-timeline"
            ? `No post on @${handleInput.replace(/^@/, "")} contains ${body.code} yet. Give X ~15 seconds, then send the same handle again.`
            : "X could not read that post yet. Wait ~15 seconds and send the same thing again.",
          reason: error.reason, retryable: retry
        }, { status: retry ? 409 : 400 });
      }
      throw error;
    }

    if (!post.text.includes(body.code)) throw new Error(`The post does not contain the proof code ${body.code}`);
    if (post.quotedPostId !== challengeResult.official_x_post_id) throw new Error("That post has to quote the official campaign post — the template in this box already ends on the link, so publishing it unchanged is enough");
    const low = post.text.toLowerCase();
    const missingTags = X_REQUIRED_TAGS.filter((tag) => !low.includes(tag));
    if (missingTags.length) throw new Error(`The post is missing ${missingTags.join(" ")} — publish the template unchanged (code and tags included), then verify again`);
    // The follow is the other machine-checkable half of the ask. Only a definite
    // "not following" refuses; a reader that cannot tell passes the winner through.
    if ((await xFollowsUs(post.authorHandle)) === false) {
      throw new Error(`@${post.authorHandle} does not follow @${X_HANDLE} yet — follow it, then send the same link again. Nothing needs reposting`);
    }
    if (post.createdAt < challengeResult.created_at || post.createdAt > challengeResult.expires_at) throw new Error("The Quote Post is outside the proof window");
    const evidenceHash = xEvidenceHash(post, challengeResult.campaign_id);
    await transaction(async (client) => {
      const consumed = await client.query(
        `UPDATE x_mission_challenges SET consumed_at=now()
         WHERE code_hash=$1 AND participant_address=$2 AND consumed_at IS NULL AND expires_at>now() RETURNING code_hash`,
        [codeHash, session.address]
      );
      if (!consumed.rowCount) throw new Error("X proof code expired or already used");
      await client.query(`INSERT INTO x_mission_proofs(campaign_id,participant_address,x_author_id,x_post_id,evidence_hash)
        VALUES($1,$2,$3,$4,$5)`, [challengeResult.campaign_id, session.address, post.authorId, post.id, evidenceHash]);
      await client.query(`INSERT INTO mission_completions(participant_address,mission_type,campaign_id,evidence_type,evidence_ref,evidence_hash)
        VALUES($1,'X_QUOTE',$2,'x_post',$3,$4) ON CONFLICT DO NOTHING`, [session.address, challengeResult.campaign_id, post.id, evidenceHash]);
    });
    return NextResponse.json({ verified: true, mission: "X_QUOTE", postId: post.id, handle: post.authorHandle });
  } catch (error) {
    const message = error instanceof Error ? error.message : "X verification failed";
    const conflict = /unique|duplicate/i.test(message);
    return NextResponse.json({ error: conflict ? "This X account or post is already used" : message }, { status: conflict ? 409 : 400 });
  }
}
