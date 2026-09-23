import test from "node:test";
import assert from "node:assert/strict";
import { calibrateDeaths } from "../public/play/js/bench.js";

const rec = (dangerScore: number, timeLeft: number | undefined): Record<string, unknown> => ({
  dangerScore,
  state: { timeLeft },
});

test("calibrateDeaths: deaths within K seconds land in the matching danger buckets", () => {
  // fly died at t=0 (finalTimeLeft=50 → died at the 50 s mark in time-left terms);
  // decisions with timeLeft within 5 s of the end are positive
  const log = [
    rec(2.5, 50),   // positive, bucket 2
    rec(2.9, 47),   // positive (within 5 s), bucket 2
    rec(2.1, 30),   // negative (12 s before death → not "soon"), bucket 2
    rec(0.2, 50),   // positive, bucket 0
    rec(1.4, 45),   // positive (5 s before end), bucket 1
    rec(1.4, 44),   // negative (6 s before end), bucket 1
  ];
  const c = calibrateDeaths(log, true, 45, 5);
  assert.deepEqual(c.buckets, [
    { n: 1, deaths: 1 },
    { n: 2, deaths: 1 },
    { n: 3, deaths: 2 },
  ]);
  assert.equal(c.n, 6);
  assert.ok(c.brier !== null && c.brier > 0);
});

test("calibrateDeaths: no death → every bucket shows zero deaths", () => {
  const log = [rec(3, 49), rec(0, 10)];
  const c = calibrateDeaths(log, false, 50, 5);
  assert.deepEqual(c.buckets.map(b => b.deaths), [0, 0, 0]);
  // Brier against all-zero outcomes is the mean of (danger/3)^2
  assert.ok(c.brier !== null && Math.abs(c.brier - 0.5) < 1e-9);
});

test("calibrateDeaths: records without a usable dangerScore or timeLeft are skipped", () => {
  const log = [{}, rec(2, undefined), rec(1.5, 20)];
  const c = calibrateDeaths(log, true, 20, 5);
  assert.equal(c.n, 1);
});

test("calibrateDeaths: a perfect 3.0 right before death has Brier contribution 0", () => {
  const c = calibrateDeaths([rec(3, 50)], true, 50, 5);
  assert.equal(c.brier, 0);
  assert.deepEqual(c.buckets[2], { n: 1, deaths: 1 });
});
