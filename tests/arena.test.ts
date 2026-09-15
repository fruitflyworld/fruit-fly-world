import test from "node:test";
import assert from "node:assert/strict";
import {
  ARENA_E0, ARENA_STEPS, CELLS, ENERGY_DELTA, MAP_COLUMNS, MAP_ROWS, NEW_CELL_BONUS, TRAVEL_COST,
  TRAIL_SHARE, cellIndex, display, displaces, isAdjacent, neighbours, richnessOf, scoreRoute,
  seedOf, seedTable, stationValue, trailAt, validateRoute, windowInfo, type StepScore
} from "../app/lib/arena";
import type { Signals } from "../app/lib/experiment";

/** A six-station route that is legal on the 6x4 grid (F-01 → F-02 → F-08 → F-14 → F-13 → F-19). */
const ROUTE = ["F-01", "F-02", "F-08", "F-14", "F-13", "F-19"];
const SIGNALS: Signals[] = [
  { food: 82, threat: 36, light: 58, novelty: 71 },
  { food: 10, threat: 100, light: 20, novelty: 10 },
  { food: 90, threat: 5, light: 60, novelty: 12 },
  { food: 40, threat: 40, light: 40, novelty: 90 },
  { food: 55, threat: 60, light: 30, novelty: 25 },
  { food: 5, threat: 5, light: 5, novelty: 5 }
];
const EPOCH = 490_000;

test("the published map is a 6x4 grid of 24 cells", () => {
  assert.equal(MAP_COLUMNS * MAP_ROWS, 24);
  assert.equal(CELLS.length, 24);
  assert.equal(CELLS[0], "F-01");
  assert.equal(CELLS[23], "F-24");
  assert.equal(cellIndex("F-08"), 7);
  assert.throws(() => cellIndex("F-99"), /Unknown map cell/);
});

test("edges are orthogonal only", () => {
  assert.deepEqual(neighbours("F-01"), ["F-02", "F-07"]);
  assert.equal(isAdjacent("F-01", "F-02"), true);
  assert.equal(isAdjacent("F-01", "F-07"), true);
  assert.equal(isAdjacent("F-01", "F-08"), false); // diagonal
  assert.equal(isAdjacent("F-06", "F-07"), false); // wraps a row
  assert.equal(isAdjacent("F-06", "F-12"), true);
});

test("the seed table is deterministic, in range, and per-cell", () => {
  const table = seedTable(EPOCH);
  assert.deepEqual(table, seedTable(EPOCH));
  assert.equal(Object.keys(table).length, 24);
  for (const cell of CELLS) {
    const seed = seedOf(EPOCH, cell);
    assert.equal(seed, table[cell]);
    assert.ok(Number.isInteger(seed) && seed >= 0 && seed < 2_000_000_000, `${cell} seed out of range: ${seed}`);
  }
  assert.equal(seedOf(EPOCH, "F-01") === seedOf(EPOCH, "F-02"), false);
  assert.equal(seedOf(EPOCH, "F-01") === seedOf(EPOCH + 1, "F-01"), false);
});

test("windows are derived from the wall clock alone", () => {
  const info = windowInfo(3600 * 1000 + 500);
  assert.equal(info.epoch, 1);
  assert.equal(info.startsAt, 3600);
  assert.equal(info.endsAt, 7200);
  assert.equal(info.secondsLeft, 3600);
  assert.equal(windowInfo(3600 * 1000 + 1000).secondsLeft, 3599);
  assert.equal(windowInfo(0).epoch, 0);
  assert.equal(windowInfo(3600 * 1000).epoch, 1);

  const short = windowInfo(90 * 1000 + 30_000, 90);
  assert.equal(short.epoch, 1);
  assert.equal(short.secondsLeft, 60);
});

test("a well-formed route and signals pass validation", () => {
  assert.equal(validateRoute(ROUTE, SIGNALS), null);
});

test("routes are rejected when they are malformed", () => {
  assert.match(validateRoute([], SIGNALS)!, /at least one station/);
  assert.match(validateRoute([...ROUTE, "F-20"], [...SIGNALS, SIGNALS[0]])!, /at most 6 stations/);
  assert.match(validateRoute(ROUTE, SIGNALS.slice(0, 3))!, /same length/);
  assert.match(validateRoute([...ROUTE.slice(0, 5), "F-24"], SIGNALS)!, /Unknown map cell|not neighbours/);
  assert.match(validateRoute(["F-01", "F-08"], SIGNALS.slice(0, 2))!, /not neighbours/);
  assert.match(validateRoute(["X-01"], [SIGNALS[0]])!, /Unknown map cell/);

  const badFood = [{ ...SIGNALS[0], food: 101 }, ...SIGNALS.slice(1)];
  assert.match(validateRoute(ROUTE, badFood)!, /food/);
  const badThreat = [{ ...SIGNALS[0], threat: -1 }, ...SIGNALS.slice(1)];
  assert.match(validateRoute(ROUTE, badThreat)!, /threat/);
  assert.match(validateRoute(ROUTE, [null, ...SIGNALS.slice(1)])!, /four signals/);
});

test("scoring is deterministic for a fixed (epoch, route, signals)", () => {
  const one = scoreRoute(EPOCH, ROUTE, SIGNALS);
  const two = scoreRoute(EPOCH, ROUTE, SIGNALS);
  assert.deepEqual(one, two);
  assert.equal(one.steps.length, ARENA_STEPS);
  assert.deepEqual(one.cells, ROUTE);
  assert.deepEqual(one.steps.map((step) => step.cell), ROUTE);
});

test("scoring a different window or route gives a different score", () => {
  // Revisiting a neighbour spends the same travel but forfeits that station's bonus.
  const backtrack = ["F-01", "F-02", "F-08", "F-14", "F-13", "F-14"];
  const bonusSum = (route: string[]) =>
    scoreRoute(EPOCH, route, SIGNALS).steps.reduce((total, step) => total + step.bonus, 0);
  assert.equal(bonusSum(ROUTE), ARENA_STEPS * NEW_CELL_BONUS);
  assert.equal(bonusSum(ROUTE) - bonusSum(backtrack), NEW_CELL_BONUS);
  assert.notEqual(scoreRoute(EPOCH, backtrack, SIGNALS).exact, scoreRoute(EPOCH, ROUTE, SIGNALS).exact);

  // A different window is a different world.
  const shifted = seedTable(EPOCH + 1);
  assert.ok(CELLS.some((cell) => shifted[cell] !== seedOf(EPOCH, cell)));
  assert.notEqual(seedOf(EPOCH, "F-01"), seedOf(EPOCH + 1, "F-01"));
});

test("each step re-derives its seed from the epoch and the visited cell", () => {
  const scored = scoreRoute(EPOCH, ROUTE, SIGNALS);
  for (const step of scored.steps) assert.equal(step.seed, seedOf(EPOCH, step.cell));
  // The same signals at two different cells are two different worlds: the seed shifts the
  // decision noise, so the confidence the step is weighted by is cell-specific.
  const a = scoreRoute(EPOCH, ["F-01", "F-02"], [SIGNALS[0], SIGNALS[0]]).steps;
  assert.equal(a[0].seed === a[1].seed, false);
  assert.equal(a[0].confidence === a[1].confidence, false);
});

test("travel costs one energy per edge and nothing at the start", () => {
  const scored = scoreRoute(EPOCH, ROUTE, SIGNALS);
  assert.equal(scored.steps[0].travel, 0);
  for (const step of scored.steps.slice(1)) assert.equal(step.travel, TRAVEL_COST);
});

test("the new-cell bonus lands once per distinct cell", () => {
  const scored = scoreRoute(EPOCH, ["F-01", "F-02", "F-01"], [SIGNALS[0], SIGNALS[1], SIGNALS[0]]);
  assert.deepEqual(scored.steps.map((step: StepScore) => step.bonus), [NEW_CELL_BONUS, NEW_CELL_BONUS, 0]);

  const distinct = scoreRoute(EPOCH, ROUTE, SIGNALS);
  assert.deepEqual(distinct.steps.map((step: StepScore) => step.bonus), new Array(ARENA_STEPS).fill(NEW_CELL_BONUS));
});

test("gain weights the delta by confidence", () => {
  for (const step of scoreRoute(EPOCH, ROUTE, SIGNALS).steps) {
    assert.equal(step.delta, ENERGY_DELTA[step.behavior]);
    assert.ok(step.confidence >= 0.5 && step.confidence <= 0.96);
    assert.equal(Math.round(step.gain * 1e6), Math.round(step.delta * (0.5 + step.confidence) * step.value * 1e6));
  }
});

test("richness gives every cell a payoff of its own, in [1, 2)", () => {
  const seen = new Set<number>();
  for (const cell of CELLS) {
    const richness = richnessOf(EPOCH, cell);
    assert.ok(richness >= 1 && richness < 2, `${cell} richness out of range: ${richness}`);
    assert.equal(richness, richnessOf(EPOCH, cell));
    seen.add(richness);
  }
  // 24 cells, 24 distinct payoffs: without this the whole map pays the same and every
  // six-station walk ties. See richnessOf() for why that is fatal to the game.
  assert.equal(seen.size, CELLS.length);
  const shifted = CELLS.filter((cell) => richnessOf(EPOCH + 1, cell) !== richnessOf(EPOCH, cell));
  assert.ok(shifted.length > 20, `a new window should re-roll the map, only ${shifted.length}/24 changed`);
});

test("the trail remembers the whole route behind the fly, fading each step", () => {
  assert.equal(trailAt(EPOCH, null, 0), 0);
  assert.equal(trailAt(EPOCH, "F-01", 0), richnessOf(EPOCH, "F-01"));
  // The ground two stations back still counts, at half weight.
  const one = trailAt(EPOCH, "F-01", 0);
  const two = trailAt(EPOCH, "F-02", one);
  assert.equal(two, richnessOf(EPOCH, "F-02") + 0.5 * richnessOf(EPOCH, "F-01"));

  const trail = scoreRoute(EPOCH, ROUTE, SIGNALS).steps.map((step) => step.trail);
  assert.equal(trail[0], 0);
  let carried = 0;
  for (let i = 0; i < ROUTE.length; i++) {
    assert.equal(trail[i], carried);
    carried = trailAt(EPOCH, ROUTE[i], carried);
  }
});

test("station value is the ground plus a share of the trail, as a weighted mean", () => {
  for (const step of scoreRoute(EPOCH, ROUTE, SIGNALS).steps) {
    const ground = richnessOf(EPOCH, step.cell);
    assert.equal(step.value, (ground + TRAIL_SHARE * step.trail) / (1 + TRAIL_SHARE));
    // A weighted mean of the ground under the fly (weight 1) and the trail behind it
    // (weight TRAIL_SHARE), so it can never leave the range the two of them span.
    const low = Math.min(ground, step.trail);
    const high = Math.max(ground, step.trail);
    assert.ok(step.value >= low - 1e-12 && step.value <= high + 1e-12, `${step.cell} value ${step.value} outside [${low}, ${high}]`);
  }
  // Order matters: a route and its reverse are different scores, which is what stops
  // every reordering of a cell set from tying.
  const reversed = [...ROUTE].reverse();
  assert.notEqual(scoreRoute(EPOCH, ROUTE, SIGNALS).exact, scoreRoute(EPOCH, reversed, [...SIGNALS].reverse()).exact);
});

test("energy stays inside the world's bounds even when it would overshoot", () => {
  // Every station runs the same all-threat signals, which reliably picks AVOID (-4 each).
  const drain = ROUTE.map(() => ({ food: 0, threat: 100, light: 0, novelty: 0 }));
  const floor = scoreRoute(EPOCH, ROUTE, drain, { e0: 3 });
  assert.ok(floor.steps.every((step) => step.behavior === "AVOID"));
  assert.equal(floor.energy, 0);
  assert.ok(floor.steps.every((step) => step.energyAfter >= 0));

  const ceiling = scoreRoute(EPOCH, ROUTE, SIGNALS, { e0: 5000 });
  assert.equal(ceiling.steps[0].energyAfter, 999);
  assert.equal(ceiling.steps[0].delta, 0); // the gain is clamped away at the ceiling
  assert.ok(ceiling.steps.every((step) => step.energyAfter <= 999));
  assert.ok(ceiling.energy <= 999);

  // A clamp means the delta actually applied is smaller than the table's.
  const atFloor = scoreRoute(EPOCH, ["F-01"], [drain[0]], { e0: 0 });
  assert.equal(atFloor.steps[0].delta, 0);
  assert.equal(atFloor.energy, 0);
});

test("the default start is ARENA_E0 and the energy chain is exact", () => {
  const scored = scoreRoute(EPOCH, ROUTE, SIGNALS);
  let energy = ARENA_E0;
  for (const step of scored.steps) {
    energy = Math.max(0, Math.min(999, energy - step.travel));
    energy = Math.max(0, Math.min(999, energy + step.delta));
    assert.equal(step.energyAfter, energy);
  }
  assert.equal(scored.energy, energy);
});

test("exact is the unrounded sum, and score is only its display round", () => {
  const scored = scoreRoute(EPOCH, ROUTE, SIGNALS);
  const sum = scored.steps.reduce((total, step) => total + step.gain + step.bonus, 0);
  assert.equal(scored.exact, sum);
  assert.equal(scored.score, Math.round(scored.exact));
  assert.equal(display(scored.exact), Math.round(scored.exact * 100) / 100);
  // `exact` must keep the digits a 2dp view throws away: rounding it is what collapses
  // two distinct routes into one bucket. See displaces().
  assert.notEqual(display(scored.exact), scored.exact);
  assert.equal(displaces(scored.exact, display(scored.exact)), true);
});

test("the best route in a window is a single route, not a tie", () => {
  // A tie at the top of a window is not a cosmetic problem: "strictly greater" then
  // hands the slot to whoever submitted first, which turns the game into a latency
  // race. Richness and the trail exist to stop exactly that, so hold the line here.
  const candidates: Signals[] = [
    { food: 100, threat: 0, light: 100, novelty: 0 },
    { food: 0, threat: 100, light: 0, novelty: 0 },
    { food: 0, threat: 0, light: 0, novelty: 100 },
    { food: 100, threat: 0, light: 0, novelty: 0 }
  ];

  const walks: string[][] = [];
  const walk = (route: string[]) => {
    if (route.length === ARENA_STEPS) { walks.push(route); return; }
    for (const next of neighbours(route[route.length - 1])) {
      if (!route.includes(next)) walk([...route, next]);
    }
  };
  for (const cell of CELLS) walk([cell]);
  assert.ok(walks.length > 1000, `expected a broad sample of walks, got ${walks.length}`);

  for (const epoch of [EPOCH, EPOCH + 1, EPOCH + 7, EPOCH + 42, EPOCH + 1234]) {
    const best = walks.map((route) =>
      Math.max(...candidates.map((signal) => scoreRoute(epoch, route, route.map(() => signal)).exact))
    );
    best.sort((a, b) => b - a);
    assert.ok(best[0] > best[1], `epoch ${epoch}: the top two routes tie at ${best[0]}`);
  }
});

test("only a strictly greater score displaces the leader", () => {
  const best = scoreRoute(EPOCH, ROUTE, SIGNALS).exact;
  assert.equal(displaces(best, null), true);
  assert.equal(displaces(best, best), false);
  assert.equal(displaces(best, best - 0.01), true);
  assert.equal(displaces(best - 0.01, best), false);
  // An identical route is an identical score, so copying the leader can never take the slot.
  assert.equal(displaces(scoreRoute(EPOCH, ROUTE, SIGNALS).exact, best), false);
});

test("scoring an invalid route throws rather than returning a number", () => {
  assert.throws(() => scoreRoute(EPOCH, ["F-01", "F-09"], SIGNALS.slice(0, 2)), /not neighbours/);
  assert.throws(() => scoreRoute(EPOCH, ROUTE, SIGNALS.slice(0, 2)), /same length/);
});
