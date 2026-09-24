import { test } from "node:test";
import assert from "node:assert/strict";
// race-ui-parity — the browser-signed commitment must equal the server's.
// If this ever fails, /race signs hashes /api/race/commit would reject.
import {
  RACE_TRAITS, canonicalPolicyJson, commitmentOfWeb, commitMessage, revealMessage,
} from "../app/lib/race-shared";
import { commitmentOf } from "../app/lib/server/race-core";

test("web commitment matches the server commitment", async () => {
  const policies = [
    { brain: "judgment" as const, preference: [] },
    { brain: "genes" as const, preference: ["hardy"] },
    { brain: "circuit" as const, preference: ["mimic", "hopper", "fecund", "white"] },
    { brain: "judgment" as const, preference: RACE_TRAITS.map((t) => t.id) },
  ];
  for (const week of [2960, 2961, 4096]) {
    for (const p of policies) {
      assert.equal(await commitmentOfWeb(week, p), commitmentOf(week, p), `week ${week} ${p.brain} [${p.preference.join(",")}]`);
    }
  }
});

test("canonical policy is order-insensitive in preference and stable", () => {
  const a = canonicalPolicyJson(7, { brain: "circuit", preference: ["b", "a", "c"] });
  const b = canonicalPolicyJson(7, { brain: "circuit", preference: ["c", "b", "a"] });
  assert.equal(a, b);
  assert.equal(a, '{"brain":"circuit","preference":["a","b","c"],"week":7}');
});

test("sign messages pin the exact strings the server verifies", () => {
  assert.equal(
    commitMessage(2960, "judgment", "0xabc"),
    "Fruit Fly World — weekly race commit\nweek: 2960\nbrain: judgment\ncommitment: 0xabc\nthis locks my exam entry; the policy reveal comes after the draw",
  );
  assert.equal(
    revealMessage(2960, "0xabc"),
    "Fruit Fly World — weekly race reveal\nweek: 2960\ncommitment: 0xabc\nthis publishes my committed policy for grading",
  );
});

test("the race trait menu mirrors TRAIT_INFO ids exactly", async () => {
  const sim = await import("../public/play/js/sim.js");
  const ids = new Set(Object.keys(sim.TRAIT_INFO));
  assert.equal(RACE_TRAITS.length, Object.keys(sim.TRAIT_INFO).length, "same trait count");
  for (const t of RACE_TRAITS) {
    assert.equal(ids.has(t.id), true, `trait ${t.id} must exist in sim.js TRAIT_INFO`);
  }
  // and every id is legal for the /api/race/commit preference regex
  for (const t of RACE_TRAITS) {
    assert.equal(/^[a-z0-9_+-]{1,24}$/.test(t.id), true, `trait id ${t.id} passes the commit validation`);
  }
});
