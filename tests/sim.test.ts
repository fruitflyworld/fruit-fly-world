import test from "node:test";
import assert from "node:assert/strict";
import { createVial, replay, runVial, stepVial } from "../app/lib/sim";

test("a vial replay is deterministic for the same seed", () => {
  const config = { seed: 190826, initialPopulation: 10 };
  assert.deepEqual(replay(config, 20), replay(config, 20));
});

test("ten days advances one generation and creates a serializable state", () => {
  const state = runVial(createVial({ seed: 4, initialPopulation: 12 }), 10);
  assert.equal(state.day, 10);
  assert.equal(state.generation, 1);
  assert.doesNotThrow(() => JSON.stringify(state));
  assert.ok(state.events.some((event) => event.type === "generation"));
});

test("food and temperature affect daily energy", () => {
  const base = createVial({ seed: 9, initialPopulation: 4, environment: { food: 70, temperature: 25 } });
  const poor = createVial({ seed: 9, initialPopulation: 4, environment: { food: 10, temperature: 35 } });
  const baseAfter = stepVial(base);
  const poorAfter = stepVial(poor);
  const baseEnergy = baseAfter.flies.reduce((sum, fly) => sum + fly.energy, 0);
  const poorEnergy = poorAfter.flies.reduce((sum, fly) => sum + fly.energy, 0);
  assert.ok(baseEnergy > poorEnergy);
});

test("offspring carry parentage and inherited genomes", () => {
  const state = runVial(createVial({ seed: 22, initialPopulation: 30, environment: { food: 100 } }), 8);
  const child = state.flies.find((fly) => fly.parentIds !== null);
  assert.ok(child);
  assert.equal(child.parentIds?.length, 2);
  assert.ok(Number.isInteger(child.age) && child.age >= 0);
});
