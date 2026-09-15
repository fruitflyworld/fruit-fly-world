/* ── public/skill/ffw-arena/lib/arena.mjs ───────────────────────────────────
   The Foraging Hour, as plain JavaScript, so an agent can plan and score a route
   offline before it ever talks to the server.

   This is a faithful copy of app/lib/arena.ts and app/lib/experiment.ts. A static
   file cannot import TypeScript, so it is a copy — and tests/arena-parity.test.ts
   asserts the two produce identical numbers for the same input. If you change one,
   the test tells you to change the other.
   ------------------------------------------------------------------------- */

export const ARENA_STEPS = 6;
export const ARENA_E0 = 100;
export const ENERGY_MIN = 0;
export const ENERGY_MAX = 999;
export const TRAVEL_COST = 1;
export const NEW_CELL_BONUS = 40;
export const MAP_COLUMNS = 6;
export const MAP_ROWS = 4;

export const ENERGY_DELTA = { APPROACH: 12, AVOID: -4, FREEZE: 2, EXPLORE: -2 };

export const CELLS = Array.from({ length: MAP_COLUMNS * MAP_ROWS }, (_, i) => `F-${String(i + 1).padStart(2, "0")}`);

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** The ranking key `exact` is never rounded — two routes a millionth apart are
 *  different scores on purpose. This is only for showing a number to a human. */
export const display = (exact) => Math.round(exact * 100) / 100;

/* ── the decision model (app/lib/experiment.ts) ─────────────────────────── */

const signalClamp = (value) => Math.max(0, Math.min(100, Math.round(value)));
const seededNoise = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return (value - Math.floor(value)) * 8 - 4;
};

export function runExperiment(signals, seed) {
  const safe = {
    food: signalClamp(signals.food),
    threat: signalClamp(signals.threat),
    light: signalClamp(signals.light),
    novelty: signalClamp(signals.novelty)
  };
  const noise = seededNoise(seed);
  const scores = {
    APPROACH: safe.food * 1.15 + safe.light * 0.24 - safe.threat * 0.72 + noise,
    AVOID: safe.threat * 1.32 - safe.food * 0.22 - noise,
    EXPLORE: safe.novelty * 1.08 + safe.light * 0.18 - safe.threat * 0.35 + noise / 2,
    FREEZE: safe.threat * 0.72 + (100 - safe.novelty) * 0.46 - safe.food * 0.2
  };
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const behavior = ranked[0][0];
  const gap = Math.max(0, ranked[0][1] - ranked[1][1]);
  const confidence = Number(Math.min(0.96, 0.5 + gap / 120).toFixed(2));
  const sector = `F-${String((Math.abs(seed) % 24) + 1).padStart(2, "0")}`;
  const events = {
    APPROACH: "Energy source reached",
    AVOID: "Threat corridor escaped",
    EXPLORE: `${sector} mapped`,
    FREEZE: "Position held; energy conserved"
  };
  return { seed, signals: safe, behavior, confidence, event: events[behavior], sector };
}

/* ── the map ────────────────────────────────────────────────────────────── */

export function cellIndex(cell) {
  const index = CELLS.indexOf(cell);
  if (index < 0) throw new Error(`Unknown map cell: ${cell}`);
  return index;
}

export function neighbours(cell) {
  const index = cellIndex(cell);
  const column = index % MAP_COLUMNS;
  const row = Math.floor(index / MAP_COLUMNS);
  const out = [];
  if (column > 0) out.push(CELLS[index - 1]);
  if (column < MAP_COLUMNS - 1) out.push(CELLS[index + 1]);
  if (row > 0) out.push(CELLS[index - MAP_COLUMNS]);
  if (row < MAP_ROWS - 1) out.push(CELLS[index + MAP_COLUMNS]);
  return out;
}

export function isAdjacent(a, b) {
  return neighbours(a).includes(b);
}

/* ── the seeds ──────────────────────────────────────────────────────────── */

export function hash32(input) {
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

export function seedOf(epoch, cell) {
  return hash32(`ffw:arena:${Math.floor(epoch)}:${cell}`) % 2_000_000_000;
}

export function seedTable(epoch) {
  const table = {};
  for (const cell of CELLS) table[cell] = seedOf(epoch, cell);
  return table;
}

/** How rich this cell's ground is in this window: 1.000000 … 1.999999. Without it
 *  every cell pays the same and every six-station walk scores identically, which
 *  turns "best score wins" into a tie broken by whoever submitted first. It comes
 *  from the same published seed, so the score stays fully recomputable. */
export function richnessOf(epoch, cell) {
  return 1 + (seedOf(epoch, cell) % 1_000_000) / 1_000_000;
}

/** The scent trail behind the fly at this point: the ground it just crossed plus
 *  every station before that, fading each step. It is what makes the ORDER of a route
 *  part of its score — without it a route and its reverse always tie, so the top of
 *  every window ties and the slot goes to whoever submitted first. */
export const TRAIL_SHARE = 0.35;
export const TRAIL_DECAY = 0.5;

export function trailAt(epoch, previous, trail) {
  if (previous === null) return 0;
  return richnessOf(epoch, previous) + TRAIL_DECAY * trail;
}

export function stationValue(epoch, cell, trail) {
  return (richnessOf(epoch, cell) + TRAIL_SHARE * trail) / (1 + TRAIL_SHARE);
}

/* ── the scoring ────────────────────────────────────────────────────────── */

export function validateRoute(route, signals) {
  if (!Array.isArray(route) || route.length < 1) return "Route needs at least one station";
  if (route.length > ARENA_STEPS) return `Route may visit at most ${ARENA_STEPS} stations`;
  if (!Array.isArray(signals) || signals.length !== route.length) return "Route and signals must be the same length";
  for (const cell of route) {
    if (typeof cell !== "string" || !CELLS.includes(cell)) return `Unknown map cell: ${String(cell)}`;
  }
  for (let i = 1; i < route.length; i++) {
    if (!isAdjacent(route[i - 1], route[i])) return `${route[i - 1]} and ${route[i]} are not neighbours on the map`;
  }
  for (const step of signals) {
    if (!step || typeof step !== "object") return "Each station needs four signals";
    for (const key of ["food", "threat", "light", "novelty"]) {
      const value = step[key];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
        return `${key} must be a number from 0 to 100 at every station`;
      }
    }
  }
  return null;
}

export function scoreRoute(epoch, route, signals, options = {}) {
  const problem = validateRoute(route, signals);
  if (problem) throw new Error(problem);

  let energy = options.e0 ?? ARENA_E0;
  let exact = 0;
  let trail = 0;
  const seen = new Set();
  const steps = [];

  for (let i = 0; i < route.length; i++) {
    const cell = route[i];
    const seed = seedOf(epoch, cell);
    const result = runExperiment(signals[i], seed);

    const travel = i === 0 ? 0 : TRAVEL_COST;
    energy = clamp(energy - travel, ENERGY_MIN, ENERGY_MAX);
    const delta = clamp(ENERGY_DELTA[result.behavior], ENERGY_MIN - energy, ENERGY_MAX - energy);
    energy = clamp(energy + delta, ENERGY_MIN, ENERGY_MAX);

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

  return { exact, score: Math.round(exact), energy, cells: route.slice(), steps };
}

export function displaces(candidate, current) {
  return current === null || candidate > current;
}

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

export function arenaMessage({ epoch, campaign, chainId, agentAddress, route, signals, nonce }) {
  const lines = [
    "Fruit Fly World Arena",
    `Chain ID: ${chainId}`,
    `Campaign: ${campaign}`,
    `Epoch: ${Math.floor(epoch)}`,
    `Agent wallet: ${agentAddress.toLowerCase()}`,
    `Route: ${route.join(",")}`
  ];
  for (const station of signals) {
    lines.push(`Signals: food=${station.food},threat=${station.threat},light=${station.light},novelty=${station.novelty}`);
  }
  lines.push(`Nonce: ${nonce}`);
  return lines.join("\n");
}

/* ── a small, honest search ─────────────────────────────────────────────────
   Gain per station is delta * (0.5 + confidence) plus 40 for a cell you have not
   used yet. The bonus dominates, so the shape of a good route is a walk that
   never repeats a cell; the work is picking the six cells and the four signals
   that make each station's decision decisive.

   Signal vectors worth trying at a station: the model has four basins (approach,
   avoid, explore, freeze), and each is reached by pushing one signal hard.
   ------------------------------------------------------------------------- */

export const SIGNAL_CANDIDATES = [
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
export function* walks(start = null, steps = ARENA_STEPS) {
  const starts = start ? [start] : CELLS;
  for (const first of starts) yield* extend([first], steps);
}

function* extend(route, remaining) {
  yield route;
  if (route.length >= remaining) return;
  for (const next of neighbours(route[route.length - 1])) {
    // Revisiting is legal but never pays: it spends a step and forfeits the bonus.
    if (route.length > 1 && route[route.length - 2] === next) continue;
    yield* extend([...route, next], remaining);
  }
}

/** The best plan for a window: every legal walk of at most `steps` stations scored
 *  with each station's best signals, then a local improvement pass on the winner.
 *
 *  WHY EXHAUSTIVE AND NOT GREEDY: the grid is 24 cells and the cap is 6 stations, so
 *  there are only a few thousand walks and scoring them all costs tens of
 *  milliseconds. A greedy walk quietly gave up around 1% of the score in one window
 *  in five — enough to lose those windows to anyone who searched properly, which
 *  makes shipping a greedy planner worse than shipping no planner at all.
 *
 *  WHY THE PER-CELL PICK IS VALID: the best signal at a cell does not depend on
 *  where on the route the cell sits. The trail behind a station scales that
 *  station's gain by a constant, and the energy clamp never binds on a walk of six
 *  from e0 = 100 (energy spans roughly 75..160), so `delta` is the raw table value.
 *  That makes gain separable per station, and the pick a function of (epoch, cell)
 *  alone — computed once per cell instead of once per visit. The improvement pass
 *  below re-scores the finished plan, so a window where the clamp does bite still
 *  gets a correct answer.
 *
 *  Deterministic: the same epoch always yields the same plan. */
export function bestRoute(epoch, options = {}) {
  const steps = options.steps ?? ARENA_STEPS;
  const signals = options.signals ?? SIGNAL_CANDIDATES;
  const start = options.start ?? null;

  const perCell = new Map();
  const pickFor = (cell) => {
    if (!perCell.has(cell)) perCell.set(cell, pickSignal(epoch, cell, signals));
    return perCell.get(cell);
  };

  let best = null;
  for (const route of walks(start, steps)) {
    const plan = route.map(pickFor);
    const scored = scoreRoute(epoch, route, plan);
    if (!best || scored.exact > best.score.exact) best = { route, signals: plan, score: scored };
  }

  // Improvement pass: at each station, try every signal vector, keep any change
  // that raises the total. Repeat until nothing improves.
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

function pickSignal(epoch, cell, signals) {
  let best = signals[0];
  let bestGain = -Infinity;
  for (const signal of signals) {
    const gain = scoreStep(epoch, cell, signal);
    if (gain > bestGain) { bestGain = gain; best = signal; }
  }
  return best;
}

function scoreStep(epoch, cell, signal) {
  const scored = scoreRoute(epoch, [cell], [signal]);
  return scored.exact;
}
