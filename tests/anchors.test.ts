import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ANCHORS, LAST_TICK_OF_SEASON, checkManifest, explorerUrl, memoFor, parseMemo, recomputeDay, type Anchor
} from "../app/lib/anchors";
import { seasonDate } from "../app/lib/market/fly";

const status = JSON.parse(readFileSync(join(process.cwd(), "anchors", "status.json"), "utf8"));

test("the memo format round-trips", () => {
  const memo = memoFor(0, "55bdf958");
  assert.equal(memo, "ffw:1|0|2026-10-10|28799|55bdf958");
  assert.deepEqual(parseMemo(memo), { version: 1, season: 0, date: "2026-10-10", lastTick: 28799, chainHash: "55bdf958" });
});

test("parseMemo rejects anything that is not one of ours", () => {
  for (const junk of [
    "", "hello", "ffw:1|0|2026-10-10|28799",                    // missing hash
    "ffw:1|0|2026-10-10|28799|NOTHEX!!",                        // not hex
    "ffw:1|0|10-10-2026|28799|55bdf958",                        // not ISO date
    " memo ffw:1|0|2026-10-10|28799|55bdf958",                  // leading text
    "ffw:1|0|2026-10-10|28799|55bdf958|extra"                   // trailing field
  ]) assert.equal(parseMemo(junk), null, `should reject ${JSON.stringify(junk)}`);
});

test("a memo's date is the season's own date", () => {
  for (const season of [0, 1, 2, 3]) {
    assert.equal(parseMemo(memoFor(season, "0".repeat(64)))!.date, seasonDate(season));
  }
});

test("recomputing a day reproduces the pinned market/1 head", () => {
  const day = recomputeDay(0);
  assert.equal(day.lastTick, LAST_TICK_OF_SEASON);
  assert.equal(day.worldVersion, "market/1");
  assert.equal(day.chainHash, "55bdf958");
});

test("recomputing a market/2 day produces a 64-hex head", () => {
  const day = recomputeDay(3);
  assert.equal(day.worldVersion, "market/2");
  assert.equal(day.chainHash.length, 64);
});

test("checkManifest passes a correct anchor and catches a tampered one", () => {
  const good: Anchor = {
    season: 0, date: seasonDate(0), lastTick: LAST_TICK_OF_SEASON, chainHash: "55bdf958",
    worldVersion: "market/1", tx: "sig", chain: "solana", anchoredAt: "2026-10-11T00:05:00.000Z"
  };
  assert.equal(checkManifest([good])[0].ok, true);

  for (const tamper of [
    { ...good, chainHash: "deadbeef" },
    { ...good, date: "2026-10-09" },
    { ...good, lastTick: 1 },
    { ...good, worldVersion: "market/2" }
  ]) {
    const [check] = checkManifest([tamper]);
    assert.equal(check.ok, false, `tamper should fail: ${JSON.stringify(tamper)}`);
    assert.ok(check.problem);
  }
});

test("every anchor in the manifest replays to the same head as this code", () => {
  // This is the enforcement the page relies on: the manifest and the status file are
  // only trustworthy because CI recomputes them here on every push.
  for (const check of checkManifest(ANCHORS)) {
    assert.equal(check.ok, true, `season ${check.season} (${check.date}): ${check.problem}`);
  }
});

test("the status file matches the manifest and is not stale", () => {
  assert.equal(status.entries.length, ANCHORS.length, "anchors/status.json is out of date — run `npm run verify:anchors -- --write`");
  const bySeason = new Map(status.entries.map((e: { season: number; ok: boolean }) => [e.season, e]));
  for (const anchor of ANCHORS) {
    const entry = bySeason.get(anchor.season) as { ok: boolean; recomputed: string } | undefined;
    assert.ok(entry, `season ${anchor.season} is missing from anchors/status.json`);
    assert.equal(entry!.ok, true, `season ${anchor.season} is marked diverged in anchors/status.json`);
    assert.equal(entry!.recomputed, recomputeDay(anchor.season).chainHash);
  }
});

test("anchor counts agree: manifest, status and the chain list are the same length", () => {
  assert.equal(ANCHORS.length, status.entries.length);
  const seasons = new Set(ANCHORS.map((a) => a.season));
  assert.equal(seasons.size, ANCHORS.length, "the same season must not be anchored twice");
});

test("explorer links point at the right cluster", () => {
  assert.match(explorerUrl("solana", "abc"), /explorer\.solana\.com\/tx\/abc$/);
  assert.match(explorerUrl("solana-devnet", "abc"), /cluster=devnet$/);
});
