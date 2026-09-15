/* ── app/lib/server/x-proof.ts ──────────────────────────────────────────────
   Reading an X post well enough to trust it.

   Why this exists: the X_QUOTE mission pays out on "you quoted the campaign
   post and put your code in it", which is only worth anything if the server
   can actually see the post. Everything here is that read, and nothing else.

   THE READER IS twitterapi.io, and post ids are handed to it whole. X's own
   keyless oEmbed endpoint was the first reader tried and is deliberately not
   kept as a second path: it truncates at ~275 visible characters, t.co-shortens
   every link, and returns no author id at all — and `x_mission_proofs` requires
   a numeric `x_author_id` (see db/migrations/002_conditional_mint.sql). So an
   oEmbed read could not complete a proof even on a good day; it could only fail
   later and less clearly. One reader, and a precise reason when it misses.

   THE POST TIME COMES OUT OF THE ID, not out of the payload. X snowflake ids
   carry their own millisecond timestamp, so the window check works even when a
   reader omits or mangles `createdAt` — and it cannot be influenced by whoever
   wrote the post.

   TWITTERAPI_IO_KEY must be set for the mission to open at all. X_API_KEY is
   read as a fallback because the previous variable name is still what is on the
   production server's /etc/fruit-fly-world.env.
   ------------------------------------------------------------------------- */

import "server-only";
import { createHash } from "node:crypto";

export type XPost = {
  id: string;
  /** Numeric X user id — the value `x_mission_proofs.x_author_id` stores, and
   *  the thing that makes "one X account, one proof" enforceable. */
  authorId: string;
  authorHandle: string;
  text: string;
  /** The post this one quotes, when the reader surfaced the structure. */
  quotedPostId?: string;
  createdAt: Date;
  via: "twitterapi";
};

/** A miss with a machine-readable reason, so the route can decide 400 vs 409:
 *  X takes a few seconds to index a fresh post, and that is a retry, not a
 *  rejection. */
export class XProofError extends Error {
  readonly reason: string;
  readonly retryable: boolean;
  constructor(reason: string, retryable = false) {
    super(reason);
    this.name = "XProofError";
    this.reason = reason;
    this.retryable = retryable;
  }
}

const API_BASE = (process.env.TWITTERAPI_IO_BASE || "https://api.twitterapi.io").replace(/\/+$/, "");
const API_KEY = process.env.TWITTERAPI_IO_KEY || process.env.X_API_KEY || "";

/** Post url → post id. Accepts /status/ and /statuses/ on x.com or twitter.com,
 *  with or without the /i/web/ hop X inserts on mobile. */
export function parseXPostId(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Paste a valid X post URL"); }
  if (!["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"].includes(url.hostname.toLowerCase())) throw new Error("Only X post URLs are accepted");
  const match = url.pathname.match(/^\/(?:i\/web\/status|[A-Za-z0-9_]+\/status(?:es)?)\/(\d+)\/?$/);
  if (!match) throw new Error("Paste a direct X post URL");
  return match[1];
}

/** @handle out of a bare handle, an @handle, a profile URL, or a post URL — the
 *  no-paste path. A winner on a phone hunts for their permalink badly; typing
 *  their own handle is the difference between a proof and a drop-off. */
export function parseXHandle(value: string) {
  const raw = String(value || "").trim();
  const fromUrl = /(?:x|twitter)\.com\/(@?[A-Za-z0-9_]{1,15})(?:[/?#]|$)/i.exec(raw);
  if (fromUrl && !/^(i|intent|home|search|hashtag|explore|status)$/i.test(fromUrl[1])) return fromUrl[1].replace(/^@/, "");
  const bare = /^@?([A-Za-z0-9_]{1,15})$/.exec(raw);
  return bare ? bare[1] : null;
}

/** The timestamp X put in the id itself. 0 for anything that is not a
 *  plausible snowflake (the epoch of the scheme is 2010-11-04). */
export function postTimeMs(id: string) {
  try {
    const ms = Number(BigInt(String(id)) >> 22n) + 1288834974657;
    return ms > 1288834974657 && ms < Date.now() + 86_400_000 ? ms : 0;
  } catch {
    return 0;
  }
}

/** Best value found under any of the shapes the reader has returned a field in. */
function valueAt(source: unknown, paths: string[][]) {
  for (const path of paths) {
    let value: unknown = source;
    for (const key of path) value = value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
    if (value !== undefined && value !== null) return value;
  }
}

/** The id this post quotes, from the structured field. Checked against a real
 *  quote: `quoted_tweet` is an object carrying `.id`. The linked-in-body
 *  fallback is deliberately absent — X strips the quoted URL out of `text` when
 *  it builds the card, so a status link left in the body means the read was too
 *  thin to show structure, not that the post quoted. */
function structuredQuoteId(tweet: Record<string, unknown>) {
  for (const candidate of [valueAt(tweet, [["quoted_tweet", "id"], ["quoted_tweet_id"], ["quoted_status_id_str"], ["quoted_status", "id"]])]) {
    const match = /(\d{10,25})/.exec(String(candidate ?? ""));
    if (match) return match[1];
  }
  return "";
}

function asPost(tweet: Record<string, unknown>, expectedId: string): XPost {
  const id = String(valueAt(tweet, [["id"], ["id_str"], ["tweet_id"]]) || "");
  const authorId = String(valueAt(tweet, [["author", "id"], ["author_id"], ["user", "id"], ["user", "id_str"]]) || "");
  const authorHandle = String(valueAt(tweet, [["author", "userName"], ["author", "username"], ["user", "screen_name"]]) || "");
  const text = String(valueAt(tweet, [["text"], ["full_text"]]) || "");
  if (id !== expectedId || !/^\d+$/.test(authorId) || !text) throw new XProofError("post-unreadable");
  const quotedPostId = structuredQuoteId(tweet) || undefined;
  const fromId = postTimeMs(id);
  const fromPayload = new Date(String(valueAt(tweet, [["createdAt"], ["created_at"]]) || ""));
  const createdAt = fromId ? new Date(fromId) : fromPayload;
  if (Number.isNaN(createdAt.getTime())) throw new XProofError("post-unreadable");
  return { id, authorId, authorHandle, text, quotedPostId, createdAt, via: "twitterapi" };
}

async function api(path: string) {
  if (!API_KEY) throw new Error("X verification is not configured");
  let response: Response;
  try {
    response = await fetch(API_BASE + path, { headers: { "X-API-Key": API_KEY }, cache: "no-store", signal: AbortSignal.timeout(8_000) });
  } catch {
    throw new XProofError("x-unreachable", true);
  }
  if (!response.ok) throw new XProofError(`x-http-${response.status}`, response.status === 429 || response.status >= 500);
  return response.json() as Promise<{ tweets?: unknown[]; data?: { tweets?: unknown[] } | unknown[] }>;
}

/** One post, whole. Throws XProofError with a reason the route can act on. */
export async function fetchXPost(postId: string): Promise<XPost> {
  const payload = await api(`/twitter/tweets?tweet_ids=${encodeURIComponent(postId)}`);
  const list = (Array.isArray(payload.tweets) ? payload.tweets : Array.isArray(payload.data) ? payload.data : (payload.data as { tweets?: unknown[] })?.tweets) || [];
  const tweet = list[0] as Record<string, unknown> | undefined;
  if (!tweet) throw new XProofError("post-not-found", true);
  return asPost(tweet, postId);
}

/** Scan a handle's recent posts for `code` — the no-paste path. Returns null
 *  when the reader cannot be reached, so the caller can say "retry" rather than
 *  "your post is bad". */
export async function findXPostByHandle(handle: string, code: string): Promise<XPost | null> {
  const userName = parseXHandle(handle);
  if (!userName || !code) return null;
  const payload = await api(`/twitter/user/last_tweets?userName=${encodeURIComponent(userName)}`);
  const list = (payload.data as { tweets?: unknown[] })?.tweets || payload.tweets || [];
  for (const raw of list) {
    const tweet = raw as Record<string, unknown>;
    if (!String(tweet?.text || "").includes(code)) continue;
    const id = String(valueAt(tweet, [["id"], ["id_str"]]) || "");
    if (!id) continue;
    try { return asPost(tweet, id); } catch { /* a malformed row is not the winner's problem */ }
  }
  return null;
}

/** The official account and the announcement post a proof has to quote. Both
 *  come from the campaign row (`mission_campaigns.official_x_post_id`), so the
 *  template cannot point somewhere the check does not. */
export const X_HANDLE = (process.env.X_HANDLE || "fruitflyworld").replace(/^@/, "");

/** The exact body a participant is asked to publish, generated server-side so
 *  the web UI, an agent, and any future surface all hand out the same string —
 *  and so the copy can be corrected without shipping a frontend.
 *
 *  It ENDS on the announcement link. X renders a trailing status link of a post
 *  you are not replying to as a quote card, so publishing the template unchanged
 *  is what makes the post a quote; the code sits above the link because a read
 *  that ever truncates will eat the tail before it eats the proof. */
export function xPostText({ code, officialPostId }: { code: string; officialPostId: string }) {
  return [
    `Unlocking a @${X_HANDLE} Genesis Passport 🪰`,
    "",
    "One 6×4 map an hour. Everyone gets the same seeds; the best route takes it.",
    "",
    String(code),
    "",
    `https://x.com/${X_HANDLE}/status/${officialPostId}`
  ].join("\n");
}

/** One-tap composer link, so nobody has to copy a template by hand. */
export function xIntentUrl(text: string) {
  return "https://x.com/intent/post?text=" + encodeURIComponent(text);
}

export function xEvidenceHash(post: XPost, campaign: string) {
  return createHash("sha256").update(JSON.stringify({ campaign, id: post.id, authorId: post.authorId, text: post.text, quotedPostId: post.quotedPostId, createdAt: post.createdAt.toISOString() })).digest("hex");
}
