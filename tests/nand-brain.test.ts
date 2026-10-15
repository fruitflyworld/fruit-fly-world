/* FFW-NAND/1: the gate-level brain that can be taped out on TapeOut.
   The rules (app/lib/nand/rules.ts) are the source; the netlist is what goes on
   chain; these tests are what makes the two the same thing. */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { BEHAVIORS, LEVELS, decodeOutputs, encodeInputs, level } from "../app/lib/nand/encode";
import { OFFICIAL, checkNetlist, evalWord, fromTapeoutBytes, toTapeoutBytes } from "../app/lib/nand/netlist";
import { decideWord, rulesTable } from "../app/lib/nand/rules";
import { createNandBrain } from "../app/lib/nand/brain";
import { createRunner, MARKET_WORLD_VERSION_3 } from "../app/lib/market/engine";
import { createPaperTape } from "../app/lib/market/tape";
import { FLAGSHIP, TICKS_PER_SEASON, seasonSpec, tapeSeedFor } from "../app/lib/market/fly";
import { packWord } from "../scripts/nand/tapeout";

// Pinned. If one of these moves, the brain changed: say so in CHANGELOG.md and
// bump NAND_BRAIN_VERSION — a taped-out circuit can never change under its id.
const NETLIST_SHA256 = "a763117011fe4c4be7106d9b0d2c78fe79b81c15ccc2a6531c9263b4f443d4dd";
const GATES = 50;
/** market/3 chain head after 3000 ticks of the flagship's season-3 tape. A new pin, not a change to an old one. */
const GOLDEN_V3_3000 = "ff51d1efa81f08cfab392f652d60baab18cf8856f60aa47af1ca1a430644b99c";

test("the netlist is NAND-only, 12 in / 3 out, and uses only earlier signals", () => {
  checkNetlist(OFFICIAL);
  assert.equal(OFFICIAL.version, "FFW-NAND/1");
  assert.equal(OFFICIAL.nIn, 12);
  assert.equal(OFFICIAL.nOut, 3);
  assert.equal(OFFICIAL.gates.length, GATES);
});

test("the netlist matches the seven rules on all 4096 input words", () => {
  const table = rulesTable();
  for (let w = 0; w < 4096; w++) assert.equal(evalWord(OFFICIAL, w), table[w], `word ${w}`);
});

test("the committed truth table is the rules' table", () => {
  const t = JSON.parse(readFileSync("app/lib/nand/ffw-nand-1.table.json", "utf8"));
  assert.deepEqual(t.out, rulesTable());
});

test("tape-out bytes: 7 per NAND, round-trip, pinned hash", () => {
  const bytes = toTapeoutBytes(OFFICIAL);
  assert.equal(bytes.length, 7 * GATES);
  assert.deepEqual(fromTapeoutBytes(bytes, 12, 3, OFFICIAL.version).gates, OFFICIAL.gates);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), NETLIST_SHA256);
});

test("the evaluator follows TapeOut's rules on its published examples", () => {
  // MAJ3 (12 NAND) from the OrderGuard notes: inputs 2,3,4; outputs last.
  const maj = { version: "maj3", nIn: 3, nOut: 1, gates: [[2, 3], [2, 4], [3, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [11, 12], [13, 13], [10, 10], [14, 15]] as [number, number][] };
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map((w) => evalWord(maj, w)), [0, 0, 0, 1, 0, 1, 1, 1]);
  assert.throws(() => checkNetlist({ version: "x", nIn: 1, nOut: 1, gates: [[3, 0]] }), /future signal/);
});

test("levels and words: thresholds, bit layout, decode", () => {
  assert.deepEqual([0, 0.09, 0.1, 0.34, 0.35, 0.64, 0.65, 1].map(level), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.deepEqual([...LEVELS], [0.1, 0.35, 0.65]);
  const w = encodeInputs({ food: 0.7, threat: 0.2, light: 0.4, novelty: 0 }, 0.95, "explore");
  assert.equal(w, 3 | (1 << 2) | (2 << 4) | (0 << 6) | (3 << 8) | (2 << 10));
  assert.deepEqual(decodeOutputs(1 | 4), { behavior: "avoid", gf: true });
  assert.equal(BEHAVIORS.length, 4);
});

test("the rules read the way the docs say", () => {
  const word = (f: number, t: number, l: number, n: number, h: number, p: number) => f | (t << 2) | (l << 4) | (n << 6) | (h << 8) | (p << 10);
  assert.equal(decideWord(word(3, 2, 0, 0, 0, 2)).rule, "escape");
  assert.equal(decideWord(word(3, 1, 0, 0, 0, 2)).rule, "danger");
  assert.equal(decideWord(word(1, 0, 0, 0, 3, 3)).rule, "feed");
  assert.equal(decideWord(word(3, 0, 0, 0, 0, 3)).rule, "lure");
  assert.equal(decideWord(word(2, 0, 0, 0, 0, 0)).rule, "pursue");
  assert.equal(decideWord(word(0, 0, 0, 2, 0, 0)).rule, "curious");
  assert.equal(decideWord(word(0, 0, 0, 0, 0, 3)).rule, "rest");
  assert.deepEqual(decideWord(word(0, 0, 1, 0, 0, 0)), { rule: "default", out: 2 });
  assert.deepEqual(decideWord(word(0, 0, 0, 0, 0, 0)), { rule: "default", out: 3 });
});

test("eval() input packing: pin i is bit i, low byte first", () => {
  assert.deepEqual([...packWord(0b1010_0000_0001, 12)], [0b0000_0001, 0b1010]);
  assert.deepEqual([...packWord(0b1010_0000_0001, 12, true)], [0b1010, 0b0000_0001]);
});

test("market/3: the fly runs on the netlist, deterministically, and every record can be re-checked", () => {
  const spec = { ...seasonSpec(FLAGSHIP, 3), version: MARKET_WORLD_VERSION_3 } as const;
  const run = () => {
    const r = createRunner(spec, { keepEvents: 5 });
    const tape = createPaperTape(tapeSeedFor(FLAGSHIP, 3), TICKS_PER_SEASON);
    const recs = [];
    for (let t = 0; t < 3000; t++) recs.push(r.step(tape.next()));
    return { recs, chain: r.state.chain };
  };
  const a = run(), b = run();
  assert.equal(a.chain, b.chain);
  assert.equal(a.chain, GOLDEN_V3_3000);
  assert.match(a.chain, /^[0-9a-f]{64}$/);
  let prev = "freeze", checked = 0, escapes = 0;
  for (const rec of a.recs) {
    assert.equal(rec.v, "market/3");
    if (rec.b === "dead") { assert.equal(rec.w, undefined); prev = "freeze"; continue; }
    assert.ok(rec.w);
    const [win, wout] = rec.w!;
    // the input word is rebuilt from the record alone…
    assert.equal(encodeInputs({ food: rec.s[0], threat: rec.s[1], light: rec.s[2], novelty: rec.s[3] }, rec.h, prev), win);
    // …and the output is exactly what the circuit returns for it
    assert.equal(evalWord(OFFICIAL, win), wout);
    const d = decodeOutputs(wout);
    assert.equal(rec.b, d.behavior);
    assert.equal(rec.gf, d.gf);
    if (d.gf) escapes++;
    prev = rec.b; checked++;
  }
  assert.ok(checked > 2500);
  assert.equal(escapes, 18); // the Giant Fiber fires, and sells, on its own rule
});

test("createNandBrain takes any evaluator (an on-chain one plugs in the same way)", () => {
  const calls: number[] = [];
  const brain = createNandBrain((w) => { calls.push(w); return 2; });
  const out = brain.step({ food: 0, threat: 0, light: 0, novelty: 0 }, 0, "freeze");
  assert.equal(out.behavior, "explore");
  assert.equal(brain.lastOut, 2);
  assert.equal(calls[0], 3 << 10);
});
