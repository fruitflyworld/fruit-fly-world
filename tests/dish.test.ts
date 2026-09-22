import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DISH_QUESTS, dishEvidenceHash, verifyDishEvidence, type DishEvidence } from "../app/lib/dish";

/* The dish quests are the game-gated freemint (v1, client-attested): the game
   records an evidence object at generation end (or the bench on an IDENTICAL
   double run) and this test keeps the gate honest — every quest has a real
   threshold, every forgery pattern throws. */

function evidence(quest: string, overrides: Partial<DishEvidence> = {}): DishEvidence {
  return {
    quest, gen: 1, eggs: 2, rivalEggs: 1, survived: false, deathReason: "energy",
    escapes: 0, brain: { id: "circuit", model: "FFW-CX/0.1" }, decisions: 42,
    ts: 1_758_000_000_000, ...overrides
  };
}

test("the four quests are exactly the shipped set", () => {
  assert.deepEqual([...DISH_QUESTS], ["SURVIVOR", "FORAGER", "REFLEX", "EXAMINED"]);
});

test("SURVIVOR: a survived generation passes, a death does not", () => {
  const passed = evidence("SURVIVOR", { survived: true, deathReason: "time", eggs: 5 });
  assert.equal(verifyDishEvidence(passed), "SURVIVOR");
  assert.throws(() => verifyDishEvidence(evidence("SURVIVOR")), /surviving/);
  // survival must end on time — a survivor with a death reason is contradictory
  assert.throws(() => verifyDishEvidence(evidence("SURVIVOR", { survived: true, deathReason: "predator" })), /time/);
});

test("FORAGER: 3 or more eggs in one generation", () => {
  assert.equal(verifyDishEvidence(evidence("FORAGER", { eggs: 3 })), "FORAGER");
  assert.equal(verifyDishEvidence(evidence("FORAGER", { eggs: 9 })), "FORAGER");
  assert.throws(() => verifyDishEvidence(evidence("FORAGER", { eggs: 2 })), /3 or more eggs/);
});

test("REFLEX: 3 or more Giant Fiber escapes in one generation", () => {
  assert.equal(verifyDishEvidence(evidence("REFLEX", { escapes: 3, deathReason: "predator" })), "REFLEX");
  assert.throws(() => verifyDishEvidence(evidence("REFLEX", { escapes: 2 })), /3 Giant Fiber/);
});

test("EXAMINED: only an IDENTICAL bench double run passes", () => {
  const ok = evidence("EXAMINED", { identical: true, seed: 42, gens: 2, decisions: 52 });
  assert.equal(verifyDishEvidence(ok), "EXAMINED");
  assert.throws(() => verifyDishEvidence(evidence("EXAMINED", { identical: false, seed: 42, gens: 2 })), /IDENTICAL/);
  assert.throws(() => verifyDishEvidence(evidence("EXAMINED", { identical: true })), /Invalid|seed/);
});

test("forgery patterns are rejected", () => {
  assert.throws(() => verifyDishEvidence(null), /required/);
  assert.throws(() => verifyDishEvidence({}), /quest/i);
  assert.throws(() => verifyDishEvidence(evidence("NOCLIP")), /Unknown quest/);
  // unknown brain
  assert.throws(() => verifyDishEvidence(evidence("FORAGER", { eggs: 3, brain: { id: "gpt-9" } })), /Unknown brain/);
  // non-finite numbers
  assert.throws(() => verifyDishEvidence(evidence("FORAGER", { eggs: 3, gen: Number.NaN })), /Invalid/);
  // out-of-range values are clamped, never crash
  const clamped = evidence("FORAGER", { eggs: 3, gen: 9999, decisions: 99999 }) as unknown as Record<string, unknown>;
  assert.equal(verifyDishEvidence(clamped), "FORAGER");
});

test("the evidence hash is canonical: key order cannot change it", () => {
  const e = evidence("EXAMINED", { identical: true, seed: 42, gens: 2 });
  const sha = (data: string) => createHash("sha256").update(data).digest("hex");
  const a = dishEvidenceHash(e, sha);
  const shuffled: DishEvidence = { ts: e.ts, brain: e.brain, escapes: e.escapes, decisions: e.decisions,
    deathReason: e.deathReason, survived: e.survived, rivalEggs: e.rivalEggs, eggs: e.eggs, gen: e.gen,
    quest: e.quest, seed: e.seed, gens: e.gens, identical: e.identical };
  assert.equal(dishEvidenceHash(shuffled, sha), a);
  // any field change changes the hash
  assert.notEqual(dishEvidenceHash({ ...e, eggs: 3 }, sha), a);
});
