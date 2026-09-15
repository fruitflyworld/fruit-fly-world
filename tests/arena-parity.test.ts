import test from "node:test";
import assert from "node:assert/strict";
import * as server from "../app/lib/arena";
import { runExperiment } from "../app/lib/experiment";
import type { Signals } from "../app/lib/experiment";

/* The agent SDK is a static file, so it cannot import the TypeScript module: it is a
   copy. This test is what keeps the copy honest — every number an agent computes
   offline must equal the number the server computes for the same input. */

type Sdk = typeof import("../app/lib/arena") & {
  runExperiment: typeof runExperiment;
  bestRoute: (epoch: number, options?: { steps?: number }) => { route: string[]; signals: Signals[]; score: server.RouteScore };
};

const sdkPath = ["..", "public", "skill", "ffw-arena", "lib", "arena.mjs"].join("/");
let loaded: Sdk | undefined;

async function sdk() {
  if (!loaded) loaded = (await import(sdkPath)) as Sdk;
  return loaded;
}

const EPOCH = 490_000;
const SIGNALS: Signals[] = [
  { food: 82, threat: 36, light: 58, novelty: 71 },
  { food: 0, threat: 100, light: 0, novelty: 0 },
  { food: 100, threat: 0, light: 100, novelty: 0 },
  { food: 0, threat: 0, light: 0, novelty: 100 },
  { food: 50, threat: 50, light: 50, novelty: 50 },
  { food: 25, threat: 75, light: 0, novelty: 100 }
];

test("the SDK exposes the same constants as the server", async () => {
  const s = await sdk();
  assert.equal(s.ARENA_STEPS, server.ARENA_STEPS);
  assert.equal(s.ARENA_E0, server.ARENA_E0);
  assert.equal(s.TRAVEL_COST, server.TRAVEL_COST);
  assert.equal(s.NEW_CELL_BONUS, server.NEW_CELL_BONUS);
  assert.equal(s.ENERGY_MIN, server.ENERGY_MIN);
  assert.equal(s.ENERGY_MAX, server.ENERGY_MAX);
  assert.equal(s.MAP_COLUMNS, server.MAP_COLUMNS);
  assert.equal(s.MAP_ROWS, server.MAP_ROWS);
  assert.deepEqual(s.CELLS, server.CELLS);
  assert.deepEqual(s.ENERGY_DELTA, server.ENERGY_DELTA);
});

test("the SDK's decision model matches the server's", async () => {
  const s = await sdk();
  for (const signals of SIGNALS) {
    for (const seed of [0, 1, 190826, 1_234_567_890]) {
      assert.deepEqual(s.runExperiment(signals, seed), runExperiment(signals, seed));
    }
  }
});

test("the SDK derives the same seed table", async () => {
  const s = await sdk();
  for (const epoch of [0, 1, EPOCH, EPOCH + 1, 4_000_000_000]) {
    assert.deepEqual(s.seedTable(epoch), server.seedTable(epoch));
    for (const cell of server.CELLS) {
      assert.equal(s.seedOf(epoch, cell), server.seedOf(epoch, cell));
      assert.equal(s.hash32(`ffw:arena:${epoch}:${cell}`), server.hash32(`ffw:arena:${epoch}:${cell}`));
    }
  }
});

test("the SDK's map matches the server's", async () => {
  const s = await sdk();
  for (const cell of server.CELLS) {
    assert.deepEqual(s.neighbours(cell), server.neighbours(cell));
    for (const other of server.CELLS) {
      assert.equal(s.isAdjacent(cell, other), server.isAdjacent(cell, other));
    }
  }
});

test("the SDK scores a fixed route identically", async () => {
  const s = await sdk();
  const route = ["F-01", "F-02", "F-08", "F-14", "F-13", "F-19"];
  assert.deepEqual(s.scoreRoute(EPOCH, route, SIGNALS), server.scoreRoute(EPOCH, route, SIGNALS));
});

test("the SDK scores every legal walk of the grid identically", async () => {
  const s = await sdk();
  // Exhaustive over all walks up to four stations: 24 starts, and every path from each.
  let compared = 0;
  const walk = (route: string[]) => {
    const signals = route.map((_, index) => SIGNALS[index % SIGNALS.length]);
    assert.deepEqual(s.scoreRoute(EPOCH, route, signals), server.scoreRoute(EPOCH, route, signals), route.join(" > "));
    compared++;
    if (route.length >= 4) return;
    for (const next of server.neighbours(route[route.length - 1])) walk([...route, next]);
  };
  for (const cell of server.CELLS) walk([cell]);
  assert.ok(compared > 1000, `expected a broad sample, compared ${compared}`);
});

test("the SDK agrees on which routes are invalid", async () => {
  const s = await sdk();
  const cases: [unknown, unknown][] = [
    [[], []],
    [["F-01"], []],
    [["F-01", "F-09"], SIGNALS.slice(0, 2)],
    [["Z-99"], [SIGNALS[0]]],
    [["F-01", "F-02", "F-03", "F-04", "F-05", "F-06", "F-07"], SIGNALS],
    [["F-01"], [{ ...SIGNALS[0], food: 101 }]]
  ];
  for (const [route, signals] of cases) {
    const fromServer = server.validateRoute(route, signals);
    assert.ok(fromServer, "server should reject");
    assert.equal(s.validateRoute(route, signals), fromServer);
  }
  assert.equal(s.validateRoute(["F-01"], [SIGNALS[0]]), null);
});

test("the SDK builds the same message an agent signs", async () => {
  const s = await sdk();
  const input = {
    epoch: EPOCH, campaign: "genesis", chainId: 11155111,
    agentAddress: "0x6a43249cd6B8B0c4bC4B4f2b0f4c2D1a3E5F6a7B",
    route: ["F-01", "F-02"], signals: SIGNALS.slice(0, 2), nonce: "0x" + "ab".repeat(16)
  };
  assert.equal(s.arenaMessage(input), server.arenaMessage(input));
});

test("the SDK's planner matches the server's planner exactly", async () => {
  // The planner is part of the published rule: the site's scoreboard and the agent
  // SDK must return the same plan for the same epoch, or "the plan to beat" is two
  // different plans depending on which side you are standing on.
  const s = await sdk();
  assert.deepEqual(s.SIGNAL_CANDIDATES, server.SIGNAL_CANDIDATES);
  assert.deepEqual([...s.walks(null, 3)], [...server.walks(null, 3)]);
  for (const epoch of [EPOCH, EPOCH + 1, EPOCH + 5000]) {
    const mine = server.bestRoute(epoch);
    const theirs = s.bestRoute(epoch);
    assert.deepEqual(theirs.route, mine.route, `epoch ${epoch} route`);
    assert.deepEqual(theirs.signals, mine.signals, `epoch ${epoch} signals`);
    assert.deepEqual(theirs.score, mine.score, `epoch ${epoch} score`);
  }
});

test("the SDK's planner returns a legal route that beats a plain walk", async () => {
  const s = await sdk();
  const plan = s.bestRoute(EPOCH);
  assert.equal(s.validateRoute(plan.route, plan.signals), null);
  assert.equal(plan.route.length, server.ARENA_STEPS);
  assert.equal(plan.score.exact, s.scoreRoute(EPOCH, plan.route, plan.signals).exact);

  // Any six distinct cells in a row pay the bonus but make no choice: the planner must win.
  const plain = ["F-01", "F-02", "F-03", "F-04", "F-05", "F-06"];
  const flat = s.scoreRoute(EPOCH, plain, plain.map(() => ({ food: 50, threat: 50, light: 50, novelty: 50 })));
  assert.ok(plan.score.exact > flat.exact, `${plan.score.exact} should beat ${flat.exact}`);
  assert.equal(s.displaces(plan.score.exact, flat.exact), true);
});
