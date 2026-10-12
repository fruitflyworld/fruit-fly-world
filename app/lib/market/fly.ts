// fly.ts — the flagship fly, its season clock, and replay helpers.
//
// A season is one UTC day. Everyone who opens the page at the same moment sees
// the same fly in the same place, because the state at tick N is a pure
// function of (fly seed, season, N): there is no server state to trust.

import { createRunner, type FlySpec, type Runner, type TickRecord } from "./engine";
import { createPaperTape, mixSeed } from "./tape";

export const TICK_MS = 3000;
export const TICKS_PER_SEASON = 28_800; // 24 h at one tick every 3 s
/** Season 0 starts at 2026-10-10 00:00 UTC. */
export const EPOCH_MS = Date.UTC(2026, 9, 10);

export interface FlyProfile {
  slug: string;
  name: string;
  seed: number;
  mode: "paper";
}

/** The flagship. Paper mode until the token launches; see docs/flies-that-trade.md. */
export const FLIES: Record<string, FlyProfile> = {
  dusty: { slug: "dusty", name: "Dusty", seed: 0x0d057ee1, mode: "paper" },
};

export const FLAGSHIP = FLIES.dusty;

export function seasonClock(nowMs: number) {
  const elapsed = Math.max(0, nowMs - EPOCH_MS);
  const season = Math.floor(elapsed / (TICKS_PER_SEASON * TICK_MS));
  const intoSeason = elapsed - season * TICKS_PER_SEASON * TICK_MS;
  const tick = Math.min(TICKS_PER_SEASON - 1, Math.floor(intoSeason / TICK_MS));
  const frac = (intoSeason - tick * TICK_MS) / TICK_MS;
  return { season, tick, frac };
}

export function seasonSpec(fly: FlyProfile, season: number): FlySpec {
  return { name: fly.name, seed: mixSeed(fly.seed, season) };
}

export function tapeSeedFor(fly: FlyProfile, season: number) {
  return mixSeed(fly.seed ^ 0x7a9e5eed, season);
}

export interface SeasonRun {
  runner: Runner;
  next(): TickRecord;
  /** The tick the next call to next() will produce. */
  readonly tick: number;
}

/** Start a season from tick 0. Call next() to advance one tick. */
export function startSeason(fly: FlyProfile, season: number, opts: { keepEvents?: number } = {}): SeasonRun {
  const runner = createRunner(seasonSpec(fly, season), opts);
  const tape = createPaperTape(tapeSeedFor(fly, season), TICKS_PER_SEASON);
  return {
    runner,
    get tick() { return runner.state.tick; },
    next() { return runner.step(tape.next()); },
  };
}

/** Run a season up to and including tick `upTo`; returns the run and the record at `upTo`. */
export function runTo(fly: FlyProfile, season: number, upTo: number, opts: { keepEvents?: number } = {}) {
  const run = startSeason(fly, season, opts);
  let rec: TickRecord | null = null;
  const last = Math.min(Math.max(0, upTo), TICKS_PER_SEASON - 1);
  while (run.tick <= last) rec = run.next();
  return { run, record: rec as TickRecord, chain: run.runner.state.chain };
}

/** Seconds since midnight UTC for a tick, as "HH:MM:SS". */
export function tickClock(tick: number) {
  const s = Math.floor((tick * TICK_MS) / 1000);
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  const p = (n: number) => (n < 10 ? "0" + n : String(n));
  return `${p(hh)}:${p(mm)}:${p(ss)}`;
}

export function seasonDate(season: number) {
  const d = new Date(EPOCH_MS + season * TICKS_PER_SEASON * TICK_MS);
  return d.toISOString().slice(0, 10);
}
