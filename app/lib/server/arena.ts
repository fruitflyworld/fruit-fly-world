import "server-only";
import { createHash, createHmac } from "node:crypto";
import { query, transaction } from "./db";
import { runExperiment, type Signals } from "../experiment";
import { experimentHash, MODEL_VERSION, publicId } from "../canonical";
import { MINT_CAMPAIGN } from "./mint-voucher";
import {
  ARENA_E0, ARENA_STEPS, ARENA_WINDOW_SEC, CELLS, ENERGY_DELTA, MAP_COLUMNS, MAP_ROWS,
  NEW_CELL_BONUS, TRAVEL_COST, scoreRoute, seedTable, windowInfo,
  type RouteScore, type StepScore, type Window
} from "../arena";

/* ── app/lib/server/arena.ts ────────────────────────────────────────────────
   Everything that needs the database: opening windows, taking entries, and
   closing the window that has just run out.

   The scoring itself is not here. It is in app/lib/arena.ts, which is pure and
   public, so an agent can re-derive its own score before it ever submits. This
   file only decides who is allowed to enter, who wins when the clock stops, and
   what the world records afterwards.

   Two lanes write the same table for the same window. An agent signs its route
   (POST /api/arena/submit, attributed by signature); the operator submits by hand
   from the browser (POST /api/arena/enter, attributed by session) — and because
   the score is recomputed here from the route, neither lane needs to be trusted
   with a number. `lane` records which door was used; it is never a ranking input.

   There is no cron. Every request calls finalizeDue(), and closing a window is
   one atomic UPDATE guarded by status='open', so two instances racing over the
   same hour still produce exactly one winner.
   ------------------------------------------------------------------------- */

export function arenaEnabled() {
  return process.env.ARENA_ENABLED === "1";
}

/** The window length in seconds. Shorter only for local end-to-end runs. */
export function arenaWindowSec() {
  const configured = Number(process.env.ARENA_WINDOW_SEC);
  return Number.isFinite(configured) && configured >= 60 ? Math.floor(configured) : ARENA_WINDOW_SEC;
}

function cap(name: string, fallback: number) {
  const configured = Number(process.env[name]);
  return Number.isFinite(configured) && configured >= 0 ? Math.floor(configured) : fallback;
}

export function arenaCaps() {
  return {
    perWindowTries: cap("ARENA_PER_WINDOW_TRIES", 8),
    perWalletDay: cap("ARENA_PER_WALLET_DAY", 1),
    perIpDay: cap("ARENA_PER_IP_DAY", 4)
  };
}

export function currentWindow(now: number = Date.now()): Window {
  return windowInfo(now, arenaWindowSec());
}

/** Never the raw address of a caller. Same secret the rate limiter uses. */
export function ipTag(ip: string) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error("RATE_LIMIT_SECRET is not configured securely");
  return createHmac("sha256", secret).update(`arena:${ip}`).digest("hex");
}

/** The puzzle for one window, exactly as the agent SDK needs it. */
export function briefFor(epoch: number) {
  return {
    epoch,
    windowSec: arenaWindowSec(),
    map: { columns: MAP_COLUMNS, rows: MAP_ROWS, cells: CELLS, edges: "orthogonal" },
    steps: ARENA_STEPS,
    e0: ARENA_E0,
    energy: { min: 0, max: 999, travelCost: TRAVEL_COST, newCellBonus: NEW_CELL_BONUS },
    behaviorDelta: ENERGY_DELTA,
    seeds: seedTable(epoch)
  };
}

/** Which door an entry came through. `agent` is a wallet signature, `manual` a
 *  browser session. Bookkeeping for the board — never an input to the ranking. */
export type Lane = "agent" | "manual";

export type Standing = {
  address: string | null;
  agentAddress: string | null;
  lane: Lane | null;
  exact: number | null;
  score: number | null;
  energy: number | null;
  cells: string[] | null;
  entries: number;
};

type EntryRow = {
  participant_address: string;
  agent_address: string;
  lane: Lane;
  route: string[];
  signals: Signals[];
  exact: string;
  score: number;
  energy: number;
  created_at: Date;
};

/** Create the row for a window the first time anyone asks about it. */
export async function ensureWindow(window: Window) {
  await query(
    `INSERT INTO arena_windows(epoch,starts_at,ends_at) VALUES($1,to_timestamp($2),to_timestamp($3))
     ON CONFLICT (epoch) DO NOTHING`,
    [window.epoch, window.startsAt, window.endsAt]
  );
}

export async function windowRow(epoch: number) {
  const result = await query<{
    epoch: string; starts_at: Date; ends_at: Date; status: string; entries: number;
    winner_address: string | null; winner_agent_address: string | null;
    winning_exact: string | null; winning_score: number | null;
  }>("SELECT * FROM arena_windows WHERE epoch=$1", [epoch]);
  return result.rows[0] ?? null;
}

/** The best entry of a window, or null when nobody has entered yet. */
export async function standingFor(epoch: number): Promise<Standing> {
  const result = await query<Omit<EntryRow, "signals">>(
    `SELECT participant_address,agent_address,lane,route,exact,score,energy,created_at
     FROM arena_entries WHERE epoch=$1 ORDER BY exact DESC, created_at ASC, id ASC LIMIT 1`,
    [epoch]
  );
  const counted = await query<{ entries: number }>("SELECT entries FROM arena_windows WHERE epoch=$1", [epoch]);
  const entries = counted.rows[0]?.entries ?? 0;
  const row = result.rows[0];
  if (!row) return { address: null, agentAddress: null, lane: null, exact: null, score: null, energy: null, cells: null, entries };
  return {
    address: row.participant_address,
    agentAddress: row.agent_address,
    lane: row.lane,
    exact: Number(row.exact),
    score: row.score,
    energy: row.energy,
    cells: row.route,
    entries
  };
}

/** The winner of the most recently closed window, for the scoreboard header. */
export async function lastWinner() {
  const result = await query<{ epoch: string; participant_address: string; agent_address: string; lane: Lane; exact: string; created_at: Date }>(
    "SELECT epoch,participant_address,agent_address,lane,exact,created_at FROM arena_wins ORDER BY epoch DESC LIMIT 1"
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    epoch: Number(row.epoch),
    address: row.participant_address,
    agentAddress: row.agent_address,
    lane: row.lane,
    exact: Number(row.exact),
    at: row.created_at.toISOString()
  };
}

/**
 * Close every window whose hour has run out. Safe to call on every request:
 * the UPDATE is guarded by status='open', so only one caller can claim an epoch
 * and the losers simply see the window already closed.
 */
export async function finalizeDue(now: number = Date.now()) {
  const due = await query<{ epoch: string }>(
    "SELECT epoch FROM arena_windows WHERE status='open' AND ends_at<=to_timestamp($1) ORDER BY epoch", [Math.floor(now / 1000)]
  );
  const closed: number[] = [];
  for (const row of due.rows) {
    const winner = await finalizeWindow(Number(row.epoch));
    if (winner) closed.push(Number(row.epoch));
  }
  return closed;
}

/**
 * Rank the window, hand the slot to the best route, and write that route into
 * the shared world. One experiment and one world_event per hour — the arena
 * itself is a sandbox and does not touch world_state while entries are arriving.
 */
export async function finalizeWindow(epoch: number) {
  return transaction(async (client) => {
    const claimed = await client.query(
      "UPDATE arena_windows SET status='closed', finalized_at=now() WHERE epoch=$1 AND status='open' RETURNING epoch", [epoch]
    );
    if (!claimed.rowCount) return null;

    const best = await client.query<EntryRow>(
      `SELECT participant_address,agent_address,lane,route,signals,exact,score,energy,created_at
       FROM arena_entries WHERE epoch=$1 ORDER BY exact DESC, created_at ASC, id ASC LIMIT 1`, [epoch]
    );
    const winner = best.rows[0];
    if (!winner) return null;

    // Re-derive the route rather than trusting the stored numbers: same pure function,
    // so the world write and the recorded score can never drift apart.
    const scored = scoreRoute(epoch, winner.route, winner.signals);
    const final = scored.steps[scored.steps.length - 1];
    const cell = final.cell;

    // The world records the last station of the winning route: where the fly ended up.
    const experiment = runExperiment(final.signals, final.seed);
    const id = publicId();
    const hash = experimentHash(final.signals, final.seed, experiment);
    await client.query("SELECT singleton FROM world_state WHERE singleton=true FOR UPDATE");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO experiments(public_id,participant_address,seed,food,threat,light,novelty,behavior,confidence,event,sector,model_version,record_hash)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [id, winner.participant_address, final.seed, final.signals.food, final.signals.threat, final.signals.light, final.signals.novelty,
        experiment.behavior, experiment.confidence, routeEvent(scored, epoch), cell, MODEL_VERSION, hash]
    );
    const experimentId = inserted.rows[0].id;

    // The world's energy moves by the last station's behavior, the same rule every
    // other write site uses. The route's own 100-point energy is the arena's scale.
    const energyDelta = ENERGY_DELTA[experiment.behavior];
    const world = await client.query<{ revision: string }>(
      `UPDATE world_state SET revision=revision+1, energy=GREATEST(0,LEAST(999,energy+$1)),
       mapped_sectors=CASE WHEN NOT ($2=ANY(mapped_sectors)) THEN array_append(mapped_sectors,$2) ELSE mapped_sectors END,
       updated_at=now() WHERE singleton=true RETURNING revision`, [energyDelta, cell]
    );
    await client.query(
      `INSERT INTO world_events(experiment_id,revision,behavior,description,sector,energy_delta) VALUES($1,$2,$3,$4,$5,$6)`,
      [experimentId, world.rows[0].revision, experiment.behavior, routeEvent(scored, epoch), cell, energyDelta]
    );
    await client.query(
      "INSERT INTO arena_wins(epoch,participant_address,agent_address,lane,exact) VALUES($1,$2,$3,$4,$5) ON CONFLICT (epoch) DO NOTHING",
      [epoch, winner.participant_address, winner.agent_address, winner.lane, winner.exact]
    );
    const evidenceHash = createHash("sha256").update(`arena:${epoch}:${winner.agent_address}:${winner.exact}`).digest("hex");
    await client.query(
      `INSERT INTO mission_completions(participant_address,mission_type,evidence_experiment_id,campaign_id,evidence_type,evidence_ref,evidence_hash)
       VALUES($1,'ARENA',$2,$3,'arena_route',$4,$5) ON CONFLICT DO NOTHING`,
      [winner.participant_address, experimentId, MINT_CAMPAIGN, `epoch:${epoch}`, evidenceHash]
    );
    await client.query(
      `UPDATE arena_windows SET winner_address=$2, winner_agent_address=$3, winning_exact=$4, winning_score=$5 WHERE epoch=$1`,
      [epoch, winner.participant_address, winner.agent_address, winner.exact, winner.score]
    );
    return { epoch, address: winner.participant_address, agentAddress: winner.agent_address, lane: winner.lane, exact: Number(winner.exact) };
  });
}

function routeEvent(scored: RouteScore, epoch: number) {
  return `Foraging Hour ${epoch}: ${scored.cells.join(" → ")} (score ${scored.exact}, energy ${scored.energy})`;
}

export type SubmitResult = {
  accepted: true;
  epoch: number;
  lane: Lane;
  exact: number;
  score: number;
  energy: number;
  cells: string[];
  steps: StepScore[];
  leading: boolean;
  triesUsed: number;
  standing: Standing;
};

/**
 * Take one entry, from either lane. Every cap is checked here, on the way in, so
 * that whoever is leading when the window shuts is always allowed to take the slot.
 */
export async function submitEntry(input: {
  epoch: number;
  agentAddress: string;
  participantAddress: string;
  lane: Lane;
  route: string[];
  signals: Signals[];
  nonce: string;
  score: RouteScore;
  ip: string;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const caps = arenaCaps();
  const window = windowInfo(now, arenaWindowSec());
  if (input.epoch !== window.epoch) {
    throw new Error("This window has closed. Fetch a fresh brief and submit again.");
  }

  const tries = await query<{ count: string }>(
    "SELECT count(*)::text AS count FROM arena_entries WHERE epoch=$1 AND agent_address=$2", [input.epoch, input.agentAddress]
  );
  const triesUsed = Number(tries.rows[0].count) + 1;
  if (triesUsed > caps.perWindowTries) {
    throw new Error(`This agent already used its ${caps.perWindowTries} tries in this window`);
  }

  const wins = await query<{ count: string }>(
    "SELECT count(*)::text AS count FROM arena_wins WHERE participant_address=$1 AND created_at > now() - interval '24 hours'",
    [input.participantAddress]
  );
  if (Number(wins.rows[0].count) >= caps.perWalletDay) {
    throw new Error("This wallet already took a Passport today. The next slot is open tomorrow.");
  }

  const tag = ipTag(input.ip);
  const fromIp = await query<{ count: string }>(
    "SELECT count(*)::text AS count FROM arena_entries WHERE ip_tag=$1 AND created_at > now() - interval '24 hours'", [tag]
  );
  if (Number(fromIp.rows[0].count) >= caps.perIpDay) {
    throw new Error("Too many entries from this network today. Try again tomorrow.");
  }

  await ensureWindow(window);
  const inserted = await query(
    `INSERT INTO arena_entries(epoch,participant_address,agent_address,lane,route,signals,exact,score,energy,cells_mapped,nonce,ip_tag)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (epoch,agent_address,nonce) DO NOTHING RETURNING id`,
    [input.epoch, input.participantAddress, input.agentAddress, input.lane, JSON.stringify(input.route), JSON.stringify(input.signals),
      input.score.exact, input.score.score, input.score.energy, new Set(input.route).size, input.nonce, tag]
  );
  if (!inserted.rowCount) throw new Error("This entry has already been submitted");
  await query("UPDATE arena_windows SET entries=entries+1 WHERE epoch=$1", [input.epoch]);

  const standing = await standingFor(input.epoch);
  return {
    accepted: true,
    epoch: input.epoch,
    lane: input.lane,
    exact: input.score.exact,
    score: input.score.score,
    energy: input.score.energy,
    cells: input.score.cells,
    steps: input.score.steps,
    leading: standing.agentAddress === input.agentAddress && standing.exact === input.score.exact,
    triesUsed,
    standing
  } satisfies SubmitResult;
}

/** Cumulative standings: one row per runner, best route ever, and how often it won.
 *  A runner is one (participant, agent) pair, so its lane is the same on every row
 *  of the group — the operator's own address is only ever the agent of a manual entry. */
export async function leaderboard(limit = 50) {
  const result = await query<{
    agent_address: string; participant_address: string; lane: Lane; best: string; best_epoch: string; entries: string; wins: string;
  }>(
    `SELECT e.agent_address, e.participant_address,
            min(e.lane)::text AS lane,
            max(e.exact)::text AS best,
            (array_agg(e.epoch ORDER BY e.exact DESC, e.created_at ASC))[1]::text AS best_epoch,
            count(*)::text AS entries,
            (SELECT count(*)::text FROM arena_wins w WHERE w.agent_address=e.agent_address) AS wins
     FROM arena_entries e GROUP BY e.agent_address, e.participant_address
     ORDER BY max(e.exact) DESC, count(*) ASC LIMIT $1`, [limit]
  );
  return result.rows.map((row, index) => ({
    rank: index + 1,
    agentAddress: row.agent_address,
    address: row.participant_address,
    lane: row.lane,
    best: Number(row.best),
    bestEpoch: Number(row.best_epoch),
    entries: Number(row.entries),
    wins: Number(row.wins)
  }));
}

/** The recent windows and who took them, newest first. */
export async function recentWinners(limit = 10) {
  const result = await query<{ epoch: string; participant_address: string; agent_address: string; lane: Lane; exact: string; created_at: Date }>(
    "SELECT epoch,participant_address,agent_address,lane,exact,created_at FROM arena_wins ORDER BY epoch DESC LIMIT $1", [limit]
  );
  return result.rows.map((row) => ({
    epoch: Number(row.epoch),
    address: row.participant_address,
    agentAddress: row.agent_address,
    lane: row.lane,
    exact: Number(row.exact),
    at: row.created_at.toISOString()
  }));
}
