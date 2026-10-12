import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FLAGSHIP, runTo, seasonClock, startSeason, EPOCH_MS, TICK_MS, TICKS_PER_SEASON } from "../app/lib/market/fly";
import { createHash } from "node:crypto";
import { MARKET_V2_FROM_SEASON, MARKET_WORLD_VERSION, MARKET_WORLD_VERSION_2, equityOf, versionForSeason } from "../app/lib/market/engine";
import { marketChainHash, marketRecordHash, sha256Hex, stableStringify } from "../app/lib/market/hash";
import { createPaperTape } from "../app/lib/market/tape";
import { diaryFrom, diaryLine } from "../app/lib/market/diary";
import { contentHash } from "../public/play/js/brain.js";

// Pinned chain hashes for market/1. If one of these changes, the world changed:
// bump MARKET_WORLD_VERSION, regenerate, and explain why in CHANGELOG.md.
const GOLDEN: [number, number, string][] = [
  [0, 0, "3e8de650"],
  [0, 2000, "003ad503"],
  [0, 28799, "55bdf958"],
];

/**
 * market/2 goldens. Season 3 is the first season sealed with SHA-256, so this is a
 * *new* pin rather than a change to an old one: no season below it may ever move.
 */
const GOLDEN_V2: [number, number, string][] = [
  [3, 0, "826d3475cd69bc821d40317e8c8b0387dcc877393b95e1905b51cd38ca5cc452"],
  [3, 15000, "a448374fbccf7de0e2ab6999d002db13ba3be625b947a1eb1e637c4b9b2f1163"]
];

test("market/1 is the declared world version", () => {
  assert.equal(MARKET_WORLD_VERSION, "market/1");
});

// ---- market/2: the seal is a commitment, not a checksum --------------------

test("the SHA-256 implementation matches node:crypto", () => {
  const inputs = [
    "",
    "a",
    "abc",
    "The quick brown fox jumps over the lazy dog",
    JSON.stringify({ p: "0".repeat(64), r: "f".repeat(64) }),
    "果蝇 · ünïcödé · 🪰",
    "x".repeat(1000),
    stableStringify({ b: [1, 2, { d: null }], a: "z" })
  ];
  for (const input of inputs) {
    const expected = createHash("sha256").update(input, "utf8").digest("hex");
    assert.equal(sha256Hex(input), expected, `sha256("${input.slice(0, 24)}")`);
  }
});

test("canonical JSON makes key order irrelevant to the hash", () => {
  assert.equal(stableStringify({ b: 1, a: 2 }), stableStringify({ a: 2, b: 1 }));
  assert.equal(marketRecordHash({ b: 1, a: 2 }), marketRecordHash({ a: 2, b: 1 }));
  assert.notEqual(marketRecordHash({ a: 1 }), marketRecordHash({ a: 2 }));
});

test("the seal switches format at a season boundary, never inside a season", () => {
  assert.equal(versionForSeason(MARKET_V2_FROM_SEASON - 1), MARKET_WORLD_VERSION);
  assert.equal(versionForSeason(MARKET_V2_FROM_SEASON), MARKET_WORLD_VERSION_2);
  // Everything already served keeps the format it was served with.
  for (const season of [0, 1, 2]) assert.equal(versionForSeason(season), MARKET_WORLD_VERSION);
});

test("a market/2 season replays to the same 64-hex chain, twice", () => {
  const a = runTo(FLAGSHIP, MARKET_V2_FROM_SEASON, 400);
  const b = runTo(FLAGSHIP, MARKET_V2_FROM_SEASON, 400);
  assert.equal(a.chain, b.chain);
  assert.equal(a.chain.length, 64);
  assert.match(a.chain, /^[0-9a-f]{64}$/);
  assert.equal(a.run.runner.version, MARKET_WORLD_VERSION_2);
  assert.equal(a.record.v, MARKET_WORLD_VERSION_2);
});

test("market/1 seasons still seal with 8 hex digits and their own version", () => {
  const run = runTo(FLAGSHIP, 0, 400);
  assert.equal(run.chain.length, 8);
  assert.equal(run.record.v, MARKET_WORLD_VERSION);
  assert.equal(run.run.runner.version, MARKET_WORLD_VERSION);
});

test("pinned chain hashes (market/2 goldens)", () => {
  for (const [season, tick, chain] of GOLDEN_V2) {
    assert.equal(runTo(FLAGSHIP, season, tick).chain, chain, `season ${season} tick ${tick}`);
  }
});

test("the chain commits to the whole history, not just the last record", () => {
  const short = runTo(FLAGSHIP, MARKET_V2_FROM_SEASON, 100);
  const long = runTo(FLAGSHIP, MARKET_V2_FROM_SEASON, 101);
  const lastRecord = long.record;
  // The same record with a different preceding head must not reproduce the head.
  assert.notEqual(marketChainHash("0".repeat(64), marketRecordHash(lastRecord)), long.chain);
  assert.notEqual(short.chain, long.chain);
});

test("the same season replays to the same chain, twice", () => {
  const a = runTo(FLAGSHIP, 0, 3000).chain;
  const b = runTo(FLAGSHIP, 0, 3000).chain;
  assert.equal(a, b);
});

test("pinned chain hashes (market/1 goldens)", () => {
  for (const [season, tick, chain] of GOLDEN) {
    assert.equal(runTo(FLAGSHIP, season, tick).chain, chain, `season ${season} tick ${tick}`);
  }
});

test("streaming one tick at a time equals runTo, and each record hashes as published", () => {
  const run = startSeason(FLAGSHIP, 1);
  let last = "";
  let rec = null as ReturnType<typeof run.next> | null;
  while (run.tick <= 1200) { rec = run.next(); last = run.runner.state.chain; }
  const direct = runTo(FLAGSHIP, 1, 1200);
  assert.equal(last, direct.chain);
  assert.equal(contentHash(rec), contentHash(direct.record));
  assert.equal(run.runner.state.lastHash, contentHash(direct.record));
});

test("different seasons are different days", () => {
  assert.notEqual(runTo(FLAGSHIP, 0, 500).chain, runTo(FLAGSHIP, 1, 500).chain);
});

test("the paper tape is a pure function of its seed", () => {
  const a = createPaperTape(42, TICKS_PER_SEASON), b = createPaperTape(42, TICKS_PER_SEASON);
  for (let i = 0; i < 500; i++) assert.deepEqual(a.next(), b.next());
});

test("a full season trades, sells, and keeps the wallet consistent", () => {
  const { run } = runTo(FLAGSHIP, 0, TICKS_PER_SEASON - 1, { keepEvents: 100000 });
  const s = run.runner.state;
  const buys = s.events.filter((e) => e.kind === "buy").length;
  const sells = s.events.filter((e) => e.kind === "sell").length;
  assert.ok(buys > 50, `buys ${buys}`);
  assert.ok(sells > 20, `sells ${sells}`);
  assert.ok(s.cash >= 0);
  for (const q of s.qty) assert.ok(q >= 0);
  assert.ok(Number.isFinite(equityOf(s)));
  assert.equal(s.lineage[0].kind, "birth");
});

test("every diary line comes from an event and points at its tick", () => {
  const { run } = runTo(FLAGSHIP, 0, 9000, { keepEvents: 100000 });
  const lines = diaryFrom(run.runner.state.events, 200, true);
  assert.ok(lines.length > 10);
  for (const l of lines) {
    assert.ok(l.ticks[0] <= 9000 && l.ticks[0] >= 0);
    assert.ok(l.en.length > 0);
  }
  for (const e of run.runner.state.events) assert.ok(diaryLine(e));
});

test("the season clock starts at the epoch and rolls over daily", () => {
  assert.deepEqual(seasonClock(EPOCH_MS), { season: 0, tick: 0, frac: 0 });
  const c = seasonClock(EPOCH_MS + TICKS_PER_SEASON * TICK_MS + 4 * TICK_MS + 1500);
  assert.equal(c.season, 1);
  assert.equal(c.tick, 4);
});

test("the market engine uses no platform-dependent math", () => {
  for (const f of ["engine.ts", "tape.ts"]) {
    const src = readFileSync(join(process.cwd(), "app", "lib", "market", f), "utf8")
      .split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    assert.doesNotMatch(src, /Math\.(sin|cos|tan|exp|log|pow|atan|atan2|random|hypot|cbrt)\b/, f);
  }
});
