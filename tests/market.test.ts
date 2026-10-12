import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FLAGSHIP, runTo, seasonClock, startSeason, EPOCH_MS, TICK_MS, TICKS_PER_SEASON } from "../app/lib/market/fly";
import { MARKET_WORLD_VERSION, equityOf } from "../app/lib/market/engine";
import { createPaperTape } from "../app/lib/market/tape";
import { diaryFrom, diaryLine } from "../app/lib/market/diary";
import { contentHash } from "../public/play/js/brain.js";

// Pinned chain hashes for market/1. If one of these changes, the world changed:
// bump MARKET_WORLD_VERSION, regenerate, and explain why in CHANGELOG.md.
const GOLDEN: [number, number, string][] = [
  [0, 0, "3e8de650"],
  [0, 2000, "003ad503"],
  [0, 28799, "55bdf958"],
  [3, 15000, "ab9a2b5f"],
];

test("market/1 is the declared world version", () => {
  assert.equal(MARKET_WORLD_VERSION, "market/1");
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
