"use client";

// LiveFly — runs the flagship fly in this browser.
//
// On mount it replays today's season from tick 0 up to the clock (in chunks, so
// the page stays responsive), then advances one tick every 3 s. Nothing comes
// from a server: what you see is what your own machine computed from the
// published rules. With `fixed`, it replays up to one tick and stops — the
// replay page uses that to check the server's answer.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Behavior } from "../../../public/play/js/brain.js";
import type { FlyEvent, Status, Trade } from "../../lib/market/engine";
import { FLIES, seasonClock, startSeason, TICK_MS, TICKS_PER_SEASON, type SeasonRun } from "../../lib/market/fly";
import { P } from "../../lib/market/engine";

export interface MiniRecord { t: number; b: Behavior | "dead"; hash: string; tr: Trade[]; gf: boolean }

export interface Snapshot {
  slug: string;
  season: number;
  tick: number;
  gen: number;
  status: Status;
  energy: number;
  cash: number;
  eq: number;
  startEq: number;
  price: number[];
  prevPrice: number[];
  emaS: number[];
  qty: number[];
  cost: number[];
  openedAt: number[];
  x: number;
  y: number;
  px: number;
  py: number;
  target: number;
  behavior: Behavior | "dead";
  confidence: number;
  gf: boolean;
  signals: [number, number, number, number];
  hunger: number;
  probs: [number, number, number, number];
  spikes: string[];
  chain: string;
  lastHash: string;
  trades: number;
  events: FlyEvent[];
  lineage: FlyEvent[];
  records: MiniRecord[];
  /** Last HIST ticks of prices, per coin (oldest first). */
  hist: number[][];
  /** What the fly smelled on each coin this tick (display only). */
  scent: number[];
  sweet: number[];
  /** performance.now() when this tick became current (for interpolation). */
  at: number;
}

export const HIST = 120;

export interface LiveFlyValue {
  snap: Snapshot | null;
  /** 0..1 while the browser is catching up to the clock. */
  progress: number;
  /** How many ticks this browser has computed for the current view. */
  replayed: number;
  /** Set once a fixed replay has finished. */
  done: boolean;
  /** While catching up: the tick and chain hash reached so far. */
  preview?: { tick: number; chain: string; goal: number };
}

const Ctx = createContext<LiveFlyValue>({ snap: null, progress: 0, replayed: 0, done: false });
export const useLiveFly = () => useContext(Ctx);

function snapshot(slug: string, season: number, run: SeasonRun, prev: Snapshot | null, records: MiniRecord[], hist: number[][]): Snapshot {
  const s = run.runner.state;
  let eq = s.cash;
  for (let i = 0; i < s.qty.length; i++) eq += s.qty[i] * s.price[i];
  return {
    slug, season,
    tick: s.tick - 1,
    gen: s.gen, status: s.status, energy: s.energy, cash: s.cash,
    eq, startEq: P.startCash,
    price: s.price.slice(), prevPrice: prev ? prev.price : s.price.slice(), emaS: s.emaS.slice(),
    qty: s.qty.slice(), cost: s.cost.slice(), openedAt: s.openedAt.slice(),
    x: s.x, y: s.y, px: prev ? prev.x : s.x, py: prev ? prev.y : s.y,
    target: s.target, behavior: s.behavior, confidence: s.confidence, gf: s.gf,
    signals: s.signals, hunger: 1 - s.energy, probs: s.probs, spikes: s.spikes.slice(),
    chain: s.chain, lastHash: s.lastHash, trades: s.trades,
    events: s.events.slice(-80), lineage: s.lineage.slice(), records: records.slice(),
    hist: hist.map((h) => h.slice()), scent: s.scent.slice(), sweet: s.sweet.slice(),
    at: typeof performance !== "undefined" ? performance.now() : 0,
  };
}

export function LiveFlyProvider({ slug, fixed, children }: { slug: string; fixed?: { season: number; tick: number }; children: ReactNode }) {
  const [value, setValue] = useState<LiveFlyValue>({ snap: null, progress: 0, replayed: 0, done: false });
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const fly = FLIES[slug];
    if (!fly) return;
    let run: SeasonRun | null = null;
    let season = -1;
    let records: MiniRecord[] = [];
    let hist: number[][] = [];
    let last: Snapshot | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let replayed = 0;

    const pushRecord = (r: ReturnType<SeasonRun["next"]>, hash: string) => {
      records.push({ t: r.t, b: r.b, hash, tr: r.tr, gf: r.gf });
      if (records.length > 16) records = records.slice(-16);
    };

    const target = () => {
      if (fixed) return { season: fixed.season, tick: Math.min(fixed.tick, TICKS_PER_SEASON - 1) };
      const c = seasonClock(Date.now());
      return { season: c.season, tick: c.tick };
    };

    const catchUp = () => {
      if (!alive.current) return;
      const goal = target();
      if (!run || goal.season !== season) {
        season = goal.season;
        run = startSeason(fly, season, { keepEvents: 400 });
        records = [];
        hist = [];
        last = null;
        replayed = 0;
      }
      const t0 = performance.now();
      // Work in ~12 ms slices so scrolling and animation stay smooth.
      while (run.tick <= goal.tick && performance.now() - t0 < 12) {
        const r = run.next();
        replayed += 1;
        if (goal.tick - r.t < 16) pushRecord(r, run.runner.state.lastHash);
        if (goal.tick - r.t < HIST) {
          const pr = run.runner.state.price;
          for (let i = 0; i < pr.length; i++) { (hist[i] ??= []).push(pr[i]); if (hist[i].length > HIST) hist[i].shift(); }
        }
      }
      const behind = run.tick <= goal.tick;
      if (behind) {
        setValue((v) => ({ ...v, progress: run!.tick / Math.max(1, goal.tick + 1), replayed, preview: { tick: run!.tick - 1, chain: run!.runner.state.chain, goal: goal.tick } }));
        timer = setTimeout(catchUp, 0);
        return;
      }
      last = snapshot(slug, season, run, last, records, hist);
      setValue({ snap: last, progress: 1, replayed, done: !!fixed });
      if (fixed) return;
      // Wake at the next tick boundary (plus a little slack).
      const c = seasonClock(Date.now());
      const wait = Math.max(60, Math.round((1 - c.frac) * TICK_MS) + 40);
      timer = setTimeout(catchUp, wait);
    };

    timer = setTimeout(catchUp, 30);
    return () => { alive.current = false; if (timer) clearTimeout(timer); };
  }, [slug, fixed?.season, fixed?.tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
