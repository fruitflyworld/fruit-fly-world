// /api/exam/replay — the server-side grader.
//
// The exam room's promise is "same paper, same grader, no favors". The
// browser proves it for yourself with ?bench=1 (double-run, compare hashes).
// This route closes the loop for everyone else: the SERVER replays a
// deterministic lineage with the same pure world module the game vendors
// (public/play/js/world.js, imported from disk — never bundled, so the bytes
// served to browsers and the bytes graded here are the same file) and returns
// the sealed per-generation outcomes. Submit an optional `claim` and the
// grader answers match/mismatch field by field.
//
// Only deterministic brains are gradeable (genes / circuit / judgment=local
// heuristic). Oracle (remote-model) runs are not replayable by definition.
import { NextResponse } from "next/server";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024; // a claim carries per-gen sealed records; logs stay client-side
const RATE_LIMIT = 10; // replays per minute per IP (each is real CPU)
const RATE_WINDOW_MS = 60_000;
const MAX_GENS = 3;
const BRAINS = ["genes", "circuit", "judgment"] as const;

const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_LIMIT) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

type GenOutcome = {
  gen: number; eggs: number; rivalEggs: number; survived: boolean;
  deathReason: string; decisions: number; logHash: string;
};

// world.js output is deterministic, so caching by (seed, brain, gens) is safe
// and keeps repeated verification of the same run free.
const cache = new Map<string, { worldVersion: string; gens: GenOutcome[] }>();
const CACHE_CAP = 256;

let worldMod: Promise<typeof import("../../../../public/play/js/world.js")> | null = null;
function loadWorld() {
  // Runtime import from public/ (the exact bytes served to browsers); the
  // webpackIgnore keeps the bundler from snapshotting a copy that could drift.
  // Interop note: under some loaders (tsx in tests) the ESM namespace arrives
  // wrapped in `default` — unwrap so both shapes work.
  worldMod ??= import(/* webpackIgnore: true */ pathToFileURL(join(process.cwd(), "public", "play", "js", "world.js")).href)
    .then((m) => {
      const w = (m as { runLineage?: unknown }).runLineage
        ? m
        : ((m as { default?: unknown }).default as typeof m);
      if (!w || typeof (w as { runLineage?: unknown }).runLineage !== "function") {
        throw new Error("world.js did not export runLineage");
      }
      return w as typeof import("../../../../public/play/js/world.js");
    });
  return worldMod;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate limit exceeded (10 req/min)" }, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "body too large" }, { status: 413 });
  }
  let body: { seed?: unknown; brain?: unknown; gens?: unknown; claim?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const seed = Number(body.seed);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    return NextResponse.json({ error: "seed must be an integer in [0, 2^32-1]" }, { status: 400 });
  }
  if (typeof body.brain !== "string" || !(BRAINS as readonly string[]).includes(body.brain)) {
    return NextResponse.json({ error: `brain must be one of ${BRAINS.join("/")}` }, { status: 400 });
  }
  const gens = body.gens === undefined ? 3 : Number(body.gens);
  if (!Number.isInteger(gens) || gens < 1 || gens > MAX_GENS) {
    return NextResponse.json({ error: `gens must be an integer in [1, ${MAX_GENS}]` }, { status: 400 });
  }

  let claim: { gens?: unknown } | undefined;
  if (body.claim !== undefined) {
    if (typeof body.claim !== "object" || body.claim === null || !Array.isArray((body.claim as { gens?: unknown }).gens)) {
      return NextResponse.json({ error: "claim.gens must be an array" }, { status: 400 });
    }
    claim = body.claim as { gens?: unknown };
  }

  const key = `${seed}/${body.brain}/${gens}`;
  let result = cache.get(key);
  if (!result) {
    let run: GenOutcome[];
    let worldVersion: string;
    try {
      const { runLineage, WORLD_VERSION } = await loadWorld();
      worldVersion = WORLD_VERSION;
      run = (await runLineage({ seed, brain: body.brain, gens })) as GenOutcome[];
    } catch (e) {
      return NextResponse.json({ error: "replay failed", detail: String((e as Error)?.message).slice(0, 200) }, { status: 500 });
    }
    result = { worldVersion, gens: run.map((g) => ({
      gen: g.gen, eggs: g.eggs, rivalEggs: g.rivalEggs, survived: g.survived,
      deathReason: g.deathReason, decisions: g.decisions, logHash: g.logHash,
    })) };
    if (cache.size >= CACHE_CAP) cache.delete(cache.keys().next().value as string);
    cache.set(key, result);
  }

  let verdict: { verdict: "match" | "mismatch"; diffs?: string[] } | undefined;
  if (claim) {
    const diffs: string[] = [];
    const claimed = claim.gens as Array<Record<string, unknown>>;
    if (claimed.length !== result.gens.length) {
      diffs.push(`genCount: claimed ${claimed.length}, server ${result.gens.length}`);
    }
    const n = Math.min(claimed.length, result.gens.length);
    for (let i = 0; i < n; i++) {
      for (const field of ["gen", "eggs", "rivalEggs", "survived", "deathReason", "decisions", "logHash"] as const) {
        const a = claimed[i]?.[field], b = (result.gens[i] as unknown as Record<string, unknown>)[field];
        if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(`gen ${i + 1} ${field}: claimed ${JSON.stringify(a)}, server ${JSON.stringify(b)}`);
      }
    }
    verdict = { verdict: diffs.length ? "mismatch" : "match", ...(diffs.length ? { diffs: diffs.slice(0, 20) } : {}) };
  }

  return NextResponse.json({ ...result, ...(verdict ? { claim: verdict } : {}) });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "exam/replay",
    brains: BRAINS,
    maxGens: MAX_GENS,
    note: "POST {seed, brain, gens, claim?} — the server replays the deterministic lineage and grades an optional claim",
  });
}
