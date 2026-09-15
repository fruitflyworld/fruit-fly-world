import test from "node:test";
import assert from "node:assert/strict";
import { runExperiment } from "../app/lib/experiment";
import { resolveMintState } from "../app/lib/mint";
import { experimentHash } from "../app/lib/canonical";
import { parseSignals } from "../app/lib/server/input";

test("experiment is deterministic for identical input and seed", () => {
  const signals = { food: 82, threat: 36, light: 58, novelty: 71 };
  assert.deepEqual(runExperiment(signals, 190826), runExperiment(signals, 190826));
});

test("strong threat causes avoidance", () => {
  assert.equal(runExperiment({ food: 10, threat: 100, light: 20, novelty: 10 }, 4).behavior, "AVOID");
});

test("signals are clamped at the system boundary", () => {
  const result = runExperiment({ food: 200, threat: -20, light: 50, novelty: 50 }, 2);
  assert.equal(result.signals.food, 100);
  assert.equal(result.signals.threat, 0);
});

test("mint state supports mission-free, window-half-price, public-paid, and activation paths", () => {
  const defaults = {
    connected: true, checked: true, eligible: false, participant: false, contractAvailable: true,
    publicMintOpen: false, minted: false, missionQualified: false, soldOut: false
  };
  assert.equal(resolveMintState({ ...defaults, eligible: true }), "READY_FREE_MINT");
  assert.equal(resolveMintState({ ...defaults, participant: true }), "READY_PARTICIPANT_MINT");
  assert.equal(resolveMintState({ ...defaults, publicMintOpen: true }), "READY_PAID_MINT");
  // A verified mission outranks the discount: the free tier is never downgraded.
  assert.equal(resolveMintState({ ...defaults, eligible: true, participant: true }), "READY_FREE_MINT");
  assert.equal(resolveMintState({ ...defaults, eligible: true, minted: true }), "READY_TO_ACTIVATE");
  assert.equal(resolveMintState({ ...defaults, minted: true }), "MINTED");
  assert.equal(resolveMintState({ ...defaults, publicMintOpen: true, soldOut: true }), "SOLD_OUT");
  assert.equal(resolveMintState({ ...defaults, eligible: true, contractAvailable: false }), "MINT_UNAVAILABLE");
  assert.equal(resolveMintState({ ...defaults, participant: true, contractAvailable: false }), "MINT_UNAVAILABLE");
});

test("canonical hashes are stable and bind the seed", () => {
  const signals = { food: 82, threat: 36, light: 58, novelty: 71 };
  const one = runExperiment(signals, 190826);
  assert.equal(experimentHash(signals, 190826, one), experimentHash(signals, 190826, one));
  const two = runExperiment(signals, 190827);
  assert.notEqual(experimentHash(signals, 190826, one), experimentHash(signals, 190827, two));
});

test("API signal validation rejects out-of-range and incomplete inputs", () => {
  assert.deepEqual(parseSignals({ food: 1, threat: 2, light: 3, novelty: 4 }), { food: 1, threat: 2, light: 3, novelty: 4 });
  assert.throws(() => parseSignals({ food: 101, threat: 2, light: 3, novelty: 4 }), /food/);
  assert.throws(() => parseSignals({ food: 1, threat: 2 }), /light/);
});
