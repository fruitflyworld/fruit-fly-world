/* ── app/lib/arena.ts ───────────────────────────────────────────────────────
   The Foraging Hour: one hour, one map, one task, best route wins.

   THE RULE
     Time is sliced into fixed windows (epoch = floor(unixSec / ARENA_WINDOW_SEC)).
     Every window holds exactly ONE free-Passport slot. Every agent in the window
     solves the SAME instance — the map, the seed table and the starting energy are
     derived from the epoch alone — and the slot goes to the BEST score, decided only
     when the window closes.

   WHY BEST SCORE AND NOT FIRST PAST THE POST
     An agent closes the loop in seconds; a person planning a route by hand needs
     minutes. If the slot went to the first passing entry, a human could never win
     one, no matter how good the route was. Ranking at the close makes submission
     time worth nothing and route quality worth everything.

   WHY THIS MODULE IS PURE AND PUBLIC
     Everything here is deterministic and recomputable by anyone: the map, the seed
     table, the energy table, the scoring. There is no hidden reference path. An agent
     can run this exact function locally, and the server runs the same one — so a
     score can always be re-derived from (epoch, route, signals). The point of the
     game is finding a good route, not guessing a secret.

   WHY A ROUTE AND NOT ONE PARAMETER
     A single four-number answer has a tiny search space: brute-force it and every
     capable agent lands on the same optimum, the window becomes a mass tie, and
     "strictly greater" hands it to whoever submitted first — a latency race. A route
     across 24 cells with a per-cell inner optimisation is a real search problem with
     no closed form, which is what makes best-score-wins meaningful.

   LOCATION vs DECISION
     The route decides WHERE the fly is; runExperiment() decides WHAT it does there.
     Each cell has its own seed, so the same signals produce a different decision on
     a different cell. runExperiment()'s own `sector` output is therefore ignored here
     — the visited cell is the route's, not the one the seed would have named.
   ------------------------------------------------------------------------- */
import { runExperiment, type Behavior, type Signals } from "./experiment";

export const ARENA_WINDOW_SEC = 3600;
export const ARENA_STEPS = 6;
export const ARENA_E0 = 100;
export const ARENA_MAX_SUPPLY = 4444;

export const ENERGY_MIN = 0;
export const ENERGY_MAX = 999;
/** One energy per map edge travelled. */
export const TRAVEL_COST = 1;
/** Awarded once per distinct cell on a route. */
export const NEW_CELL_BONUS = 40;

/** Copied verbatim from the world rule already inlined at
 *  app/api/experiments/route.ts and app/lib/server/missions.ts — the arena must not
 *  invent a second energy table. */
export const ENERGY_DELTA: Record<Behavior, number> = {
  APPROACH: 12,
  AVOID: -4,
  FREEZE: 2,
  EXPLORE: -2
};

export const MAP_COLUMNS = 6;
export const MAP_ROWS = 4;

/** How much of a station's yield comes from the ground behind it. See stationValue(). */
export const TRAIL_SHARE = 0.35;
/** How fast that memory of the ground behind fades with every further station. */
export const TRAIL_DECAY = 0.5;

/** F-01 … F-24, row-major over a 6x4 grid. */
export const CELLS: string[] = Array.from({ length: MAP_COLUMNS * MAP_ROWS }, (_, i) =>
  `F-${String(i + 1).padStart(2, "0")}`
);

export function cellIndex(cell: string): number {
  const index = CELLS.indexOf(cell);
  if (index < 0) throw new Error(`Unknown map cell: ${cell}`);
  return index;
}

/** Orthogonal neighbours, in reading order. Edges are only horizontal and vertical. */
export function neighbours(cell: string): string[] {
  const index = cellIndex(cell);
  const column = index % MAP_COLUMNS;
  const row = Math.floor(index / MAP_COLUMNS);
  const out: string[] = [];
  if (column > 0) out.push(CELLS[index - 1]);
  if (column < MAP_COLUMNS - 1) out.push(CELLS[index + 1]);
  if (row > 0) out.push(CELLS[index - MAP_COLUMNS]);
  if (row < MAP_ROWS - 1) out.push(CELLS[index + MAP_COLUMNS]);
  return out;
}

export function isAdjacent(a: string, b: string): boolean {
  return neighbours(a).includes(b);
}

/** FNV-1a with a splitmix32 finalizer: a small, dependency-free string hash whose
 *  output is identical in Node and in the browser, so the shipped agent SDK can
 *  re-derive the seed table without any crypto import. */
export function hash32(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h = (h + 0x9e3779b9) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x21f0aaad) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x735a2d97) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

/** The world a cell is, for one window. Kept under 2e9 so it lands in the same
 *  range the site already uses for experiment seeds. */
export function seedOf(epoch: number, cell: string): number {
  return hash32(`ffw:arena:${Math.floor(epoch)}:${cell}`) % 2_000_000_000;
}

/** The published seed table for a window: every cell, so an agent can plan offline. */
export function seedTable(epoch: number): Record<string, number> {
  const table: Record<string, number> = {};
  for (const cell of CELLS) table[cell] = seedOf(epoch, cell);
  return table;
}

/**
 * How rich this cell's ground is in this window: 1.000000 … 1.999999.
 *
 * WHY THIS EXISTS: without it every cell pays the same, and a single signal vector
 * drives the fly to a decisive APPROACH on all 24 of them. Every six-station walk
 * then scores exactly the same 345.12, the "best score wins" rule collapses into a
 * tie, and the slot goes to whoever submitted first — a latency race, which is the
 * one outcome this game is built to avoid. Richness gives each cell a payoff of its
 * own, so the map is worth reading and the best route is a real optimum rather than
 * a coin flip. It comes from the same published seed as everything else, so an agent
 * can still recompute every number before it signs anything.
 *
 * It scales the gain in BOTH directions: rich ground amplifies a good decision and
 * an expensive one equally. It does not touch energy — the world's physics and the
 * arena's scoring are separate ledgers.
 *
 * The resolution matters. A route is six of these summed, then rounded to 2dp for
 * ranking, so a coarse value would put several routes in the same 0.01 bucket. One
 * part in a million leaves the top of the table a single route in practice, which is
 * what `displaces` needs to be a fair rule. tests/arena.test.ts holds that line.
 */
export function richnessOf(epoch: number, cell: string): number {
  return 1 + (seedOf(epoch, cell) % 1_000_000) / 1_000_000;
}

export type Window = {
  epoch: number;
  windowSec: number;
  startsAt: number; // unix seconds
  endsAt: number; // unix seconds
  secondsLeft: number;
};

/** Current window, derived from the wall clock so every instance agrees with no
 *  coordination. */
export function windowInfo(now: number = Date.now(), windowSec: number = ARENA_WINDOW_SEC): Window {
  const sec = Math.floor(now / 1000);
  const epoch = Math.floor(sec / windowSec);
  const startsAt = epoch * windowSec;
  const endsAt = startsAt + windowSec;
  return { epoch, windowSec, startsAt, endsAt, secondsLeft: endsAt - sec };
}

/**
 * The scent trail: what the fly smells behind it at this point on the route. Rich
 * ground smells strongly and every station back still contributes, fading by
 * TRAIL_DECAY each step. `trail` starts at 0 and is carried from station to station.
 */
export function trailAt(epoch: number, previous: string | null, trail: number): number {
  if (previous === null) return 0;
  return richnessOf(epoch, previous) + TRAIL_DECAY * trail;
}

/**
 * What one station pays before the behaviour is applied: the ground the fly stands
 * on, plus a share of the trail behind it.
 *
 * WHY THE TRAIL EXISTS: without it the score is a sum over the SET of cells a route
 * visits, so a route and its reverse — always a legal route — score exactly the same,
 * and so does every reordering. A tie at the top of a window would then be guaranteed
 * rather than unlucky, and "best score wins" would quietly become "first to submit
 * wins": the latency race this game is built to avoid. Remembering the WHOLE route
 * behind it, not just the last cell, is what makes the order of the middle of a route
 * count, and what leaves the top of the table a single route.
 */
export function stationValue(epoch: number, cell: string, trail: number): number {
  return (richnessOf(epoch, cell) + TRAIL_SHARE * trail) / (1 + TRAIL_SHARE);
}

export type StepScore = {
  cell: string;
  seed: number;
  richness: number;
  trail: number;
  value: number;
  signals: Signals;
  behavior: Behavior;
  confidence: number;
  delta: number;
  gain: number;
  bonus: number;
  travel: number;
  energyAfter: number;
};

export type RouteScore = {
  /** The ranking key, at full precision. NOT rounded: two routes that differ by a
   *  millionth are different scores, and that is deliberate — see below. */
  exact: number;
  /** The rounded integer, for display and for the on-chain record. */
  score: number;
  energy: number;
  cells: string[];
  steps: StepScore[];
};

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** For display only. Never rank on this: the whole point of `exact` is that it keeps
 *  the digits a 2 dp view throws away. Rounding the ranking key collapses distinct
 *  routes into the same bucket, which is the tie this game exists to avoid. */
export const display = (exact: number) => Math.round(exact * 100) / 100;

/** null when the route and signals are well formed, otherwise the reason. */
export function validateRoute(route: unknown, signals: unknown): string | null {
  if (!Array.isArray(route) || route.length < 1) return "Route needs at least one station";
  if (route.length > ARENA_STEPS) return `Route may visit at most ${ARENA_STEPS} stations`;
  if (!Array.isArray(signals) || signals.length !== route.length) {
    return "Route and signals must be the same length";
  }
  for (const cell of route) {
    if (typeof cell !== "string" || !CELLS.includes(cell)) return `Unknown map cell: ${String(cell)}`;
  }
  for (let i = 1; i < route.length; i++) {
    if (!isAdjacent(route[i - 1] as string, route[i] as string)) {
      return `${route[i - 1]} and ${route[i]} are not neighbours on the map`;
    }
  }
  for (const step of signals as Signals[]) {
    if (!step || typeof step !== "object") return "Each station needs four signals";
    for (const key of ["food", "threat", "light", "novelty"] as const) {
      const value = (step as Signals)[key];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
        return `${key} must be a number from 0 to 100 at every station`;
      }
    }
  }
  return null;
}

/** The exact string an agent's wallet signs to enter a window. It carries no domain
 *  and no expiry on purpose: the epoch IS the expiry, and the seed table is public, so
 *  neither adds a guarantee — while both would make the message harder to reproduce
 *  from a machine that is not holding a browser session. `nonce` is what stops a
 *  replay, together with UNIQUE(epoch, agent_address, nonce) on the entry table. */
export function arenaMessage(input: {
  epoch: number;
  campaign: string;
  chainId: number;
  agentAddress: string;
  route: string[];
  signals: Signals[];
  nonce: string;
}): string {
  const lines = [
    "Fruit Fly World Arena",
    `Chain ID: ${input.chainId}`,
    `Campaign: ${input.campaign}`,
    `Epoch: ${Math.floor(input.epoch)}`,
    `Agent wallet: ${input.agentAddress.toLowerCase()}`,
    `Route: ${input.route.join(",")}`
  ];
  for (const station of input.signals) {
    lines.push(`Signals: food=${station.food},threat=${station.threat},light=${station.light},novelty=${station.novelty}`);
  }
  lines.push(`Nonce: ${input.nonce}`);
  return lines.join("\n");
}

/** arenaMessage() with the variable parts written as placeholders, for humans reading
 *  the brief. arenaMessage() is the authority; this must describe it, not replace it. */
export const ARENA_MESSAGE_FORMAT = [
  "Fruit Fly World Arena",
  "Chain ID: <chainId>",
  "Campaign: <campaign>",
  "Epoch: <epoch>",
  "Agent wallet: <agent address, lowercase>",
  "Route: <cells joined by ,>",
  "Signals: <one line per station, in route order: food=..,threat=..,light=..,novelty=..>",
  "Nonce: <nonce>"
];

/** Score a route. Pure and deterministic: same (epoch, route, signals) always gives
 *  the same numbers, here and in the agent SDK. */
export function scoreRoute(
  epoch: number,
  route: string[],
  signals: Signals[],
  options: { e0?: number } = {}
): RouteScore {
  const problem = validateRoute(route, signals);
  if (problem) throw new Error(problem);

  let energy = options.e0 ?? ARENA_E0;
  let exact = 0;
  let trail = 0;
  const seen = new Set<string>();
  const steps: StepScore[] = [];

  for (let i = 0; i < route.length; i++) {
    const cell = route[i];
    const seed = seedOf(epoch, cell);
    const result = runExperiment(signals[i], seed);

    const travel = i === 0 ? 0 : TRAVEL_COST;
    energy = clamp(energy - travel, ENERGY_MIN, ENERGY_MAX);

    // Never let a step drive energy outside the world's bounds.
    const delta = clamp(ENERGY_DELTA[result.behavior], ENERGY_MIN - energy, ENERGY_MAX - energy);
    energy = clamp(energy + delta, ENERGY_MIN, ENERGY_MAX);

    // Three things weight the step: confidence (a decisive read of the cell is worth
    // more than a marginal one), the cell's own richness, and the scent trail behind it.
    const richness = richnessOf(epoch, cell);
    trail = trailAt(epoch, i === 0 ? null : route[i - 1], trail);
    const value = stationValue(epoch, cell, trail);
    const gain = delta * (0.5 + result.confidence) * value;
    const bonus = seen.has(cell) ? 0 : NEW_CELL_BONUS;
    seen.add(cell);
    exact += gain + bonus;

    steps.push({
      cell, seed, richness, trail, value,
      signals: result.signals, behavior: result.behavior,
      confidence: result.confidence, delta, gain, bonus, travel, energyAfter: energy
    });
  }

  return {
    exact,
    score: Math.round(exact),
    energy,
    cells: route.slice(),
    steps
  };
}

/** True when `candidate` should displace `current` — STRICTLY greater, at full
 *  precision. An identical route produces a bit-identical score and therefore cannot
 *  take the slot from the agent who got there first, which makes publishing a winning
 *  route pointless rather than an attack. Conversely, a route that is better by a
 *  millionth does take it: the scores are never rounded before they are compared. */
export function displaces(candidate: number, current: number | null): boolean {
  return current === null || candidate > current;
}

/* ── a small, honest search ─────────────────────────────────────────────────
   This is part of the published rule, not a server convenience: the scoreboard
   shows the plan the rule says is best, the agent SDK ships the same function,
   and tests/arena-parity.test.ts asserts the two agree. The search space is
   small enough (4000 walks of at most six stations) that it is exhaustive —
   about 40 ms — so there is no heuristic to disagree about.
   ------------------------------------------------------------------------- */

/** Signal vectors worth trying at a station: the model has four basins
 *  (approach, avoid, explore, freeze), and each is reached by pushing one signal
 *  hard. A palette of the basins and the mixtures between them, not a sweep of the
 *  0…100 cube — see bestRoute() for why that is enough in practice. */
export const SIGNAL_CANDIDATES: Signals[] = [
  { food: 100, threat: 0, light: 100, novelty: 0 },
  { food: 100, threat: 0, light: 0, novelty: 0 },
  { food: 100, threat: 0, light: 100, novelty: 100 },
  { food: 100, threat: 0, light: 50, novelty: 100 },
  { food: 0, threat: 100, light: 0, novelty: 0 },
  { food: 0, threat: 100, light: 100, novelty: 0 },
  { food: 0, threat: 0, light: 0, novelty: 100 },
  { food: 0, threat: 0, light: 100, novelty: 100 },
  { food: 100, threat: 100, light: 0, novelty: 0 },
  { food: 50, threat: 50, light: 50, novelty: 50 },
  { food: 0, threat: 0, light: 0, novelty: 0 },
  { food: 0, threat: 50, light: 0, novelty: 0 },
  { food: 100, threat: 0, light: 25, novelty: 75 },
  { food: 75, threat: 25, light: 100, novelty: 0 },
  { food: 25, threat: 75, light: 0, novelty: 100 },
  { food: 0, threat: 100, light: 50, novelty: 100 }
];

/** Every legal walk of at most `steps` stations, depth first. The grid is small
 *  (24 cells, 6 steps), so this is cheap and exhaustive — no heuristics needed. */
export function* walks(start: string | null = null, steps: number = ARENA_STEPS): Generator<string[]> {
  const starts = start ? [start] : CELLS;
  for (const first of starts) yield* extend([first], steps);
}

function* extend(route: string[], remaining: number): Generator<string[]> {
  yield route;
  if (route.length >= remaining) return;
  for (const next of neighbours(route[route.length - 1])) {
    // Revisiting is legal but never pays: it spends a step and forfeits the bonus.
    if (route.length > 1 && route[route.length - 2] === next) continue;
    yield* extend([...route, next], remaining);
  }
}

export type Plan = { route: string[]; signals: Signals[]; score: RouteScore };

/** The best plan for a window: every legal walk of at most `steps` stations scored
 *  with each station's best signals, then a local improvement pass on the winner.
 *
 *  WHY EXHAUSTIVE AND NOT GREEDY: the grid is 24 cells and the cap is 6 stations, so
 *  there are only 4000 walks and scoring them all costs tens of milliseconds. A greedy
 *  walk quietly gave up around 1% of the score in one window in five — enough to lose
 *  those windows to anyone who searched properly.
 *
 *  WHY THE PER-CELL PICK IS VALID: the best signal at a cell does not depend on where
 *  on the route the cell sits. The trail behind a station scales that station's gain by
 *  a constant, and the energy clamp never binds on a walk of six from e0 = 100 (energy
 *  spans roughly 75..160), so `delta` is the raw table value. That makes gain separable
 *  per station and the pick a function of (epoch, cell) alone — computed once per cell
 *  instead of once per visit. The improvement pass below re-scores the finished plan,
 *  so a window where the clamp does bite still gets a correct answer.
 *
 *  Deterministic: the same epoch always yields the same plan. */
export function bestRoute(
  epoch: number,
  options: { steps?: number; signals?: Signals[]; start?: string } = {}
): Plan {
  const steps = options.steps ?? ARENA_STEPS;
  const signals = options.signals ?? SIGNAL_CANDIDATES;
  const start = options.start ?? null;

  const perCell = new Map<string, Signals>();
  const pickFor = (cell: string) => {
    if (!perCell.has(cell)) perCell.set(cell, pickSignal(epoch, cell, signals));
    return perCell.get(cell)!;
  };

  let best: Plan | null = null;
  for (const route of walks(start, steps)) {
    const plan = route.map(pickFor);
    const scored = scoreRoute(epoch, route, plan);
    if (!best || scored.exact > best.score.exact) best = { route, signals: plan, score: scored };
  }
  if (!best) throw new Error("No legal walk exists on this map");

  // Improvement pass: at each station, try every signal vector, keep any change that
  // raises the total. Repeat until nothing improves.
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.signals.length; i++) {
      const original = best.signals[i];
      for (const candidate of signals) {
        best.signals[i] = candidate;
        const scored = scoreRoute(epoch, best.route, best.signals);
        if (scored.exact > best.score.exact) {
          best.score = scored;
          improved = true;
        } else {
          best.signals[i] = original;
        }
      }
    }
  }
  return best;
}

/** The vector from `signals` that pays most at this cell, judged on its own. */
function pickSignal(epoch: number, cell: string, signals: Signals[]): Signals {
  let best = signals[0];
  let bestGain = -Infinity;
  for (const signal of signals) {
    const gain = scoreRoute(epoch, [cell], [signal]).exact;
    if (gain > bestGain) { bestGain = gain; best = signal; }
  }
  return best;
}
