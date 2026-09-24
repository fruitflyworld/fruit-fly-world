// race-core.test.ts — the pure rules of the weekly race: week/phase math,
// the canonical commitment, the deterministic draft policy, and ranking.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WEEK_SECONDS, commitmentOf, commitMessage, canonicalPolicyJson, isAddressLike,
  phaseOf, policyFn, rankEntries, seedFromBlockHash, weekBounds, weekOf,
} from "../app/lib/server/race-core";

test("week math is epoch-aligned 7-day windows", () => {
  const week = 2976;
  const { startMs } = weekBounds(week);
  assert.equal(weekOf(startMs), week);
  assert.equal(weekOf(startMs + WEEK_SECONDS * 1000 - 1), week);
  assert.equal(weekOf(startMs + WEEK_SECONDS * 1000), week + 1);
  const b = weekBounds(week);
  // the commit window ends 24h before the week ends
  assert.equal(b.endMs - b.cutoffMs, 86_400 * 1000);
});

test("phases: commit → reveal → closed", () => {
  const b = weekBounds(42);
  assert.equal(phaseOf(b.startMs + 1000, 42), "commit");
  assert.equal(phaseOf(b.cutoffMs - 1, 42), "commit");
  assert.equal(phaseOf(b.cutoffMs + 1, 42), "reveal");
  assert.equal(phaseOf(b.endMs - 1, 42), "reveal");
  assert.equal(phaseOf(b.endMs + 1, 42), "closed");
});

test("commitment is canonical: order and duplicates do not matter, content does", () => {
  const a = commitmentOf(5, { brain: "judgment", preference: ["smell+", "speed+"] });
  const b = commitmentOf(5, { brain: "judgment", preference: ["speed+", "smell+"] });
  assert.equal(a, b);
  assert.equal(canonicalPolicyJson(5, { brain: "judgment", preference: ["smell+", "speed+"] }),
    canonicalPolicyJson(5, { brain: "judgment", preference: ["speed+", "smell+"] }));
  // different brain or week → different commitment
  assert.notEqual(a, commitmentOf(5, { brain: "circuit", preference: ["smell+", "speed+"] }));
  assert.notEqual(a, commitmentOf(6, { brain: "judgment", preference: ["smell+", "speed+"] }));
  assert.match(a, /^0x[0-9a-f]{64}$/);
});

test("policyFn picks the offered card with the earliest preference index", () => {
  const p = policyFn({ brain: "genes", preference: ["guard", "smell+"] });
  assert.equal(p(["speed+", "smell+", "camo"]), "smell+");
  assert.equal(p(["speed+", "guard", "camo"]), "guard");
  // none listed → first offered card (deterministic default)
  assert.equal(p(["speed+", "camo", "night"]), "speed+");
});

test("ranking: eggs desc, then survived gens, then earliest commit", () => {
  const ranked = rankEntries([
    { entrant: "a", brain: "genes", eggs: 10, survivedGens: 1, createdAt: 3 },
    { entrant: "b", brain: "genes", eggs: 12, survivedGens: 0, createdAt: 2 },
    { entrant: "c", brain: "genes", eggs: 12, survivedGens: 2, createdAt: 5 },
    { entrant: "d", brain: "genes", eggs: 12, survivedGens: 2, createdAt: 4 },
  ]);
  assert.deepEqual(ranked.map((r) => r.entrant), ["d", "c", "b", "a"]);
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 3, 4]);
});

test("seed derivation matches the beacon family", () => {
  const seed = seedFromBlockHash("0x" + "ab".repeat(32));
  assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff);
  assert.equal(seed, seedFromBlockHash("0x" + "ab".repeat(32)));
  assert.notEqual(seed, seedFromBlockHash("0x" + "ba".repeat(32)));
});

test("commit message binds week, brain, commitment", () => {
  const m = commitMessage(7, "circuit", "0xdeadbeef");
  assert.ok(m.includes("week: 7") && m.includes("brain: circuit") && m.includes("commitment: 0xdeadbeef"));
});

test("address guard", () => {
  assert.ok(isAddressLike("0x" + "1f".repeat(20)));
  assert.ok(!isAddressLike("0x123"));
  assert.ok(!isAddressLike("banana"));
});
