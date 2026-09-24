// race.ts — the DB-backed weekly race: entries, the beacon draw, and grading
// by replaying every revealed entry through the vendored world.js.
import "server-only";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { query } from "./db";
import {
  type RaceBrain, type RacePolicy, RACE_BRAINS, RACE_GENS, WEEK_SECONDS,
  commitmentOf, normalizeAddress, phaseOf, policyFn, rankEntries, seedFromBlockHash, weekBounds, weekOf,
} from "./race-core";

let tablesReady: Promise<void> | null = null;
function ensureTables() {
  tablesReady ??= (async () => {
    await query(`CREATE TABLE IF NOT EXISTS race_weeks (
      week bigint PRIMARY KEY,
      draw_seed text,
      draw_block bigint,
      draw_hash text,
      drawn_at timestamptz
    )`);
    await query(`CREATE TABLE IF NOT EXISTS race_entries (
      week bigint NOT NULL,
      entrant text NOT NULL,
      brain text NOT NULL,
      commitment text NOT NULL,
      revealed_policy jsonb,
      eggs bigint,
      survived_gens bigint,
      log_hashes jsonb,
      rank bigint,
      graded_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (week, entrant)
    )`);
  })().catch((e) => {
    tablesReady = null;
    throw e;
  });
  return tablesReady;
}

const RPCS = [
  process.env.SEPOLIA_RPC_URL,
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://1rpc.io/sepolia",
].filter(Boolean) as string[];

async function rpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(4000),
  });
  const j = await res.json();
  if (j.error) throw new Error(String(j.error.message || j.error));
  return j.result;
}

/** Draw the exam seed for a closed-commit week: the latest Sepolia block whose
 *  timestamp is strictly after the cutoff — unknowable at commit time. */
export async function drawWeek(week: number): Promise<{ seed: number; block: number; hash: string }> {
  const { cutoffMs } = weekBounds(week);
  let lastError = "no rpc";
  for (const url of RPCS) {
    try {
      const tip = await rpc(url, "eth_blockNumber", []);
      // walk back at most 64 slots looking for a block past the cutoff
      const tipNum = parseInt(String(tip), 16);
      for (let n = tipNum; n > tipNum - 64 && n > 0; n--) {
        const block = (await rpc(url, "eth_getBlockByNumber", ["0x" + n.toString(16), false])) as
          { hash?: string; timestamp?: string } | null;
        const ts = parseInt(String(block?.timestamp), 16) * 1000;
        if (ts <= cutoffMs) break; // everything older is pre-cutoff
        if (block?.hash && /^0x[0-9a-f]{64}$/i.test(block.hash)) {
          return { seed: seedFromBlockHash(block.hash), block: n, hash: block.hash };
        }
      }
      lastError = `${new URL(url).host}: no post-cutoff block`;
    } catch (e) {
      lastError = `${new URL(url).host}: ${(e as Error).name}`;
    }
  }
  throw new Error(lastError);
}

export async function ensureDrawn(week: number): Promise<{ seed: number; block: number; hash: string } | null> {
  await ensureTables();
  const existing = await query<{ draw_seed: string; draw_block: string; draw_hash: string }>(
    "SELECT draw_seed, draw_block, draw_hash FROM race_weeks WHERE week = $1", [week],
  );
  if (existing.rows.length > 0) {
    const r = existing.rows[0];
    return { seed: Number(r.draw_seed), block: Number(r.draw_block), hash: r.draw_hash };
  }
  // Only draw once the commit window has closed.
  if (phaseOf(Date.now(), week) === "commit") return null;
  const draw = await drawWeek(week);
  await query(
    "INSERT INTO race_weeks (week, draw_seed, draw_block, draw_hash, drawn_at) VALUES ($1,$2,$3,$4,now()) ON CONFLICT (week) DO NOTHING",
    [week, draw.seed, draw.block, draw.hash],
  );
  const stored = await query<{ draw_seed: string; draw_block: string; draw_hash: string }>(
    "SELECT draw_seed, draw_block, draw_hash FROM race_weeks WHERE week = $1", [week],
  );
  const r = stored.rows[0];
  return { seed: Number(r.draw_seed), block: Number(r.draw_block), hash: r.draw_hash };
}

// ---- entries ----

export async function saveEntry(week: number, entrant: string, brain: RaceBrain, commitment: string) {
  await ensureTables();
  await query(
    "INSERT INTO race_entries (week, entrant, brain, commitment) VALUES ($1,$2,$3,$4)",
    [week, normalizeAddress(entrant), brain, commitment],
  );
}

export async function saveReveal(week: number, entrant: string, policy: RacePolicy) {
  await ensureTables();
  await query(
    "UPDATE race_entries SET revealed_policy = $3 WHERE week = $1 AND entrant = $2 AND revealed_policy IS NULL",
    [week, normalizeAddress(entrant), JSON.stringify(policy)],
  );
}

type EntryRow = {
  entrant: string; brain: string; commitment: string; revealed_policy: unknown;
  eggs: string | null; survived_gens: string | null; log_hashes: unknown; rank: string | null;
  created_at: Date;
};

export async function weekEntries(week: number): Promise<EntryRow[]> {
  await ensureTables();
  const res = await query<EntryRow>(
    "SELECT entrant, brain, commitment, revealed_policy, eggs, survived_gens, log_hashes, rank, created_at FROM race_entries WHERE week = $1 ORDER BY created_at ASC",
    [week],
  );
  return res.rows;
}

// ---- grading ----

type WorldMod = typeof import("../../../public/play/js/world.js");

let worldMod: Promise<WorldMod> | null = null;
export function loadWorld(): Promise<WorldMod> {
  // Same runtime-import discipline as /api/exam/replay: the exact bytes the
  // browser runs, imported from public/ — never bundled.
  worldMod ??= import(/* webpackIgnore: true */ pathToFileURL(join(process.cwd(), "public", "play", "js", "world.js")).href)
    .then((m) => {
      const w = (m as { runLineage?: unknown }).runLineage
        ? m
        : ((m as { default?: unknown }).default as typeof m);
      if (!w || typeof (w as { runLineage?: unknown }).runLineage !== "function") {
        throw new Error("world.js did not export runLineage");
      }
      return w as WorldMod;
    });
  return worldMod;
}

/** Replay every revealed entry of a drawn week on the same seed and persist
 *  ranks. Idempotent — re-grading recomputes and overwrites. */
export async function gradeWeek(week: number) {
  const draw = await ensureDrawn(week);
  if (!draw) throw new Error("week not drawn yet");
  const entries = await weekEntries(week);
  const revealed = entries.filter((e) => e.revealed_policy != null);
  const { runLineage } = await loadWorld();

  const graded = [];
  for (const entry of revealed) {
    const policy = JSON.parse(String(entry.revealed_policy)) as RacePolicy;
    const gens = (await runLineage({
      seed: draw.seed,
      brain: entry.brain,
      gens: RACE_GENS,
      policy: policyFn(policy),
    })) as Array<{ eggs: number; survived: boolean }>;
    graded.push({
      entrant: entry.entrant,
      eggs: gens.reduce((a, g) => a + g.eggs, 0),
      survivedGens: gens.filter((g) => g.survived).length,
      logHashes: gens.map((g) => (g as { logHash?: string }).logHash ?? null),
      createdAt: entry.created_at.getTime(),
    });
  }

  const ranked = rankEntries(graded);
  for (const r of ranked) {
    await query(
      `UPDATE race_entries SET eggs = $3, survived_gens = $4, log_hashes = $5, rank = $6, graded_at = now()
       WHERE week = $1 AND entrant = $2`,
      [week, r.entrant, r.eggs, r.survivedGens, JSON.stringify(r.logHashes), r.rank],
    );
  }
  return { draw, ranked };
}

// ---- status ----

export async function raceStatus(nowMs = Date.now()) {
  const week = weekOf(nowMs);
  const phase = phaseOf(nowMs, week);
  const bounds = weekBounds(week);
  let draw: { seed: number; block: number; hash: string } | null = null;
  if (phase !== "commit") {
    try { draw = await ensureDrawn(week); } catch { draw = null; }
  }
  const entries = await weekEntries(week);
  // lazy grading: a closed week with revealed entries gets graded on read
  let lazyGraded = false;
  if (phase === "closed" && draw && entries.some((e) => e.revealed_policy != null && e.rank == null)) {
    try { await gradeWeek(week); lazyGraded = true; } catch { /* surfaced by /api/race/grade */ }
  }
  return {
    week,
    phase,
    commitCutoffUnix: Math.floor(bounds.cutoffMs / 1000),
    weekEndUnix: Math.floor(bounds.endMs / 1000),
    draw,
    entries: entries.length,
    revealed: entries.filter((e) => e.revealed_policy != null).length,
    graded: entries.filter((e) => e.rank != null).length,
    lazyGraded,
    worldGens: RACE_GENS,
    brains: RACE_BRAINS,
  };
}

export async function leaderboard(week: number) {
  await ensureTables();
  const res = await query<EntryRow>(
    "SELECT entrant, brain, commitment, revealed_policy, eggs, survived_gens, log_hashes, rank, created_at FROM race_entries WHERE week = $1 AND rank IS NOT NULL ORDER BY rank ASC",
    [week],
  );
  return res.rows.map((r) => ({
    rank: Number(r.rank), entrant: r.entrant, brain: r.brain,
    eggs: Number(r.eggs), survivedGens: Number(r.survived_gens),
    logHashes: r.log_hashes, policy: r.revealed_policy,
  }));
}
