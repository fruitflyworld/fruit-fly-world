// engine.ts — market/1: a fruit fly that trades.
//
// The fly's decision layer is the unmodified FFW-CX/0.1 circuit the game
// ships (public/play/js/cx-circuit.js, 24 neurons, real-wiring Giant Fiber).
// This file only translates the market into the circuit's four inputs and the
// circuit's four behaviors back into a body and a wallet:
//
//   food    ← scent of the coin it is heading for (volume, buyers, momentum)
//   threat  ← how hard the coins it holds are falling
//   light   ← market breadth (how many coins are rising)
//   novelty ← it just picked a new target
//
//   approach → fly to the target; landing on it buys
//   avoid    → back off and sell into the fall; a Giant Fiber spike sells everything
//   explore  → drift toward the second-best scent
//   freeze   → hold still
//
// Every tick is sealed: the record is hashed (FNV-1a, the flyline-log/1 hash)
// and chained to the previous tick, so one chain hash at tick N commits to the
// whole history up to N. Same spec + same tape = same chain, on any machine.
//
// Determinism rules for this file: arithmetic, Math.sqrt (correctly rounded
// everywhere), Math.round/min/max/imul only. Rendering may use anything; this
// file may not.

import { createCircuit, type Circuit } from "../../../public/play/js/cx-circuit.js";
import { contentHash } from "../../../public/play/js/brain.js";
import type { Behavior } from "../../../public/play/js/brain.js";
import { COINS, COIN_COUNT, mixSeed, round6, type TapeTick } from "./tape";

export const MARKET_WORLD_VERSION = "market/1";

// ---- tuning (part of the world version: change any of these → bump market/N) ----
export const P = {
  startCash: 1000,
  speed: 0.034, // dish radii per tick
  eatRadius: 0.075,
  buyFraction: 0.25,
  minOrder: 5,
  buyCooldown: 30, // ticks between buys of the same coin
  feeRate: 0.003, // paper trading fee per side
  metabolism: 0.0011, // energy burned per tick
  foodGain: 0.0015, // energy per paper USD of fee income
  rebirthTicks: 40,
  estateShare: 0.8, // a new generation inherits this share of its parent's equity
  extinctBelow: 10, // estate below this ends the lineage for the season
  emaFast: 0.2,
  emaSlow: 0.03,
} as const;

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export type Status = "alive" | "dead" | "extinct";
export type DeathCause = "starved" | "broke";

export interface Trade {
  side: "buy" | "sell";
  coin: number;
  qty: number;
  px: number;
  /** For sells: realized profit as a fraction of cost basis. */
  pnl?: number;
  escape?: boolean;
}

export interface FlyEvent {
  t: number;
  g: number;
  kind: "birth" | "buy" | "sell" | "escape" | "death" | "high" | "extinct";
  coin?: number;
  px?: number;
  qty?: number;
  pnl?: number;
  equity: number;
  cause?: DeathCause;
  /** For sells: the tick the position was opened. */
  openedAt?: number;
}

export interface TickRecord {
  v: string;
  t: number;
  g: number;
  st: Status;
  s: [number, number, number, number]; // food, threat, light, novelty
  h: number; // hunger
  b: Behavior | "dead";
  c: number; // confidence
  p: [number, number, number, number]; // P(approach, avoid, explore, freeze)
  gf: boolean;
  tg: number; // target coin index
  x: number;
  y: number;
  e: number; // energy
  eq: number; // equity
  tr: Trade[];
}

export interface FlyState {
  tick: number;
  gen: number;
  status: Status;
  deadUntil: number;
  bornAt: number;
  energy: number;
  cash: number;
  qty: number[];
  cost: number[]; // cost basis (USD) per coin
  openedAt: number[];
  lastBuy: number[];
  x: number;
  y: number;
  target: number;
  novelty: number;
  emaF: number[];
  emaS: number[];
  volEma: number[];
  buyEma: number[];
  price: number[];
  peak: number;
  behavior: Behavior | "dead";
  confidence: number;
  gf: boolean;
  signals: [number, number, number, number];
  probs: [number, number, number, number];
  /** Neurons that spiked this tick (display only, not sealed). */
  spikes: string[];
  chain: string;
  /** Content hash of the latest tick record. */
  lastHash: string;
  trades: number;
  events: FlyEvent[];
  /** Births, deaths and extinction for the whole season (never trimmed). */
  lineage: FlyEvent[];
  /** Per-coin scent and sweetness as the fly last smelled them (display only, not sealed). */
  scent: number[];
  sweet: number[];
}

export interface FlySpec {
  name: string;
  seed: number;
}

export function circuitSeed(spec: FlySpec, gen: number) {
  return mixSeed(spec.seed, gen);
}

export function initialState(): FlyState {
  return {
    tick: 0, gen: 1, status: "alive", deadUntil: 0, bornAt: 0,
    energy: 0.85, cash: P.startCash,
    qty: new Array(COIN_COUNT).fill(0), cost: new Array(COIN_COUNT).fill(0),
    openedAt: new Array(COIN_COUNT).fill(-1), lastBuy: new Array(COIN_COUNT).fill(-1e9),
    x: 0, y: 0, target: 0, novelty: 0,
    emaF: [], emaS: [], volEma: [], buyEma: [], price: [],
    peak: P.startCash, behavior: "freeze", confidence: 0, gf: false,
    signals: [0, 0, 0, 0], probs: [0, 0, 0, 0], spikes: [], chain: "00000000", lastHash: "00000000", trades: 0,
    events: [{ t: 0, g: 1, kind: "birth", equity: P.startCash }],
    lineage: [{ t: 0, g: 1, kind: "birth", equity: P.startCash }],
    scent: new Array(COIN_COUNT).fill(0), sweet: new Array(COIN_COUNT).fill(0.5),
  };
}

export function equityOf(s: Pick<FlyState, "cash" | "qty" | "price">) {
  let eq = s.cash;
  for (let i = 0; i < s.qty.length; i++) if (s.qty[i] > 0) eq += s.qty[i] * (s.price[i] ?? 0);
  return eq;
}

function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

function moveToward(s: FlyState, tx: number, ty: number, speed: number) {
  const d = dist(s.x, s.y, tx, ty);
  if (d < 1e-9) return;
  const k = d <= speed ? 1 : speed / d;
  s.x += (tx - s.x) * k;
  s.y += (ty - s.y) * k;
}

function keepInDish(s: FlyState) {
  const d = Math.sqrt(s.x * s.x + s.y * s.y);
  if (d > 0.92) { s.x = (s.x / d) * 0.92; s.y = (s.y / d) * 0.92; }
}

/** A running fly: owns its circuit, steps one tick at a time. */
export interface Runner {
  state: FlyState;
  step(tape: TapeTick): TickRecord;
}

export function createRunner(spec: FlySpec, opts: { keepEvents?: number } = {}): Runner {
  const state = initialState();
  let circuit: Circuit = createCircuit({ seed: circuitSeed(spec, 1) });
  const keep = opts.keepEvents ?? 400;

  function pushEvent(ev: FlyEvent) {
    if (ev.kind === "birth" || ev.kind === "death" || ev.kind === "extinct") state.lineage.push(ev);
    state.events.push(ev);
    if (state.events.length > keep) state.events.splice(0, state.events.length - keep);
  }

  function sell(i: number, fraction: number, escape: boolean): Trade | null {
    const q = state.qty[i];
    if (q <= 0) return null;
    const sellQty = fraction >= 1 ? q : round6(q * fraction);
    if (sellQty <= 0) return null;
    const px = state.price[i];
    const proceeds = sellQty * px * (1 - P.feeRate);
    const basis = state.cost[i] * (sellQty / q);
    const pnl = basis > 0 ? r3((proceeds - basis) / basis) : 0;
    state.cash = r2(state.cash + proceeds);
    state.cost[i] = r2(state.cost[i] - basis);
    state.qty[i] = round6(q - sellQty);
    if (state.qty[i] <= 1e-6) { state.qty[i] = 0; state.cost[i] = 0; state.openedAt[i] = -1; }
    state.trades += 1;
    return escape ? { side: "sell", coin: i, qty: sellQty, px, pnl, escape: true } : { side: "sell", coin: i, qty: sellQty, px, pnl };
  }

  function step(tape: TapeTick): TickRecord {
    const t = state.tick;
    const trades: Trade[] = [];

    // ---- market bookkeeping (EMAs, prices) ----
    for (let i = 0; i < COIN_COUNT; i++) {
      const p = tape.price[i];
      if (state.price.length < COIN_COUNT) {
        state.emaF[i] = p; state.emaS[i] = p; state.volEma[i] = tape.volume[i]; state.buyEma[i] = tape.buyers[i];
      } else {
        state.emaF[i] += (p - state.emaF[i]) * P.emaFast;
        state.emaS[i] += (p - state.emaS[i]) * P.emaSlow;
        state.volEma[i] += (tape.volume[i] - state.volEma[i]) * P.emaSlow;
        state.buyEma[i] += (tape.buyers[i] - state.buyEma[i]) * P.emaSlow;
      }
    }
    state.price = tape.price.slice();

    // ---- the dead and the extinct only wait (the market keeps smelling for the page) ----
    if (state.status === "dead" && t >= state.deadUntil) rebirth(t);
    if (state.status !== "alive") {
      for (let i = 0; i < COIN_COUNT; i++) {
        const m = (state.emaF[i] - state.emaS[i]) / state.emaS[i];
        const sw = clamp01(0.5 + m * 18);
        state.sweet[i] = sw;
        state.scent[i] = clamp01(0.45 * clamp01(tape.volume[i] / (state.volEma[i] * 2.2)) + 0.25 * clamp01(tape.buyers[i] / (state.buyEma[i] * 2.2)) + 0.3 * sw);
      }
      return seal(t, trades);
    }

    // ---- food: fee income (and x402 feeds) ----
    state.energy = clamp01(state.energy - P.metabolism + (tape.fee + tape.feeds) * P.foodGain);

    // ---- senses ----
    let rising = 0;
    const sweet: number[] = [];
    const scent: number[] = [];
    let best = 0, bestA = -1, second = 0, secondA = -1;
    for (let i = 0; i < COIN_COUNT; i++) {
      const m = (state.emaF[i] - state.emaS[i]) / state.emaS[i];
      if (m > 0) rising += 1;
      sweet[i] = clamp01(0.5 + m * 18);
      const volR = clamp01(tape.volume[i] / (state.volEma[i] * 2.2));
      const buyR = clamp01(tape.buyers[i] / (state.buyEma[i] * 2.2));
      scent[i] = clamp01(0.45 * volR + 0.25 * buyR + 0.3 * sweet[i]);
      const d = dist(state.x, state.y, COINS[i].x, COINS[i].y);
      const a = (scent[i] * sweet[i]) / (1 + 2 * d);
      if (a > bestA) { second = best; secondA = bestA; best = i; bestA = a; }
      else if (a > secondA) { second = i; secondA = a; }
    }
    state.scent = scent;
    state.sweet = sweet;
    // Hysteresis: a new scent has to beat the current target clearly to pull the fly away.
    const dCur = dist(state.x, state.y, COINS[state.target].x, COINS[state.target].y);
    const curA = (scent[state.target] * sweet[state.target]) / (1 + 2 * dCur);
    if (best !== state.target && bestA > curA * 1.35 + 0.02) { state.target = best; state.novelty = 1; }
    else state.novelty = state.novelty * 0.7;

    let threat = 0, worst = -1;
    for (let i = 0; i < COIN_COUNT; i++) {
      const drop = (state.emaS[i] - state.price[i]) / state.emaS[i];
      const held = state.qty[i] > 0;
      const near = i === state.target ? 0.6 : 0;
      const w = held ? 1 : near;
      const bitter = held ? (1 - sweet[i]) * 0.35 : 0;
      const th = clamp01(drop * 9 + bitter) * w;
      if (th > threat) { threat = th; worst = i; }
    }
    const dT = dist(state.x, state.y, COINS[state.target].x, COINS[state.target].y);
    const food = clamp01(scent[state.target] * (1 / (1 + dT * 2.5)) * 1.35);
    const light = (rising / COIN_COUNT) * 0.3;
    const hunger = 1 - state.energy;
    state.signals = [r2(food), r2(threat), r2(light), r2(state.novelty)];

    // ---- the circuit decides ----
    const out = circuit.step({ food, threat, light, novelty: state.novelty }, hunger);
    const behavior = out.behavior as Behavior;
    state.behavior = behavior;
    state.confidence = out.confidence;
    state.gf = out.gfFired;
    const pr = out.probabilities as Record<Behavior, number>;
    state.probs = [r2(pr.approach), r2(pr.avoid), r2(pr.explore), r2(pr.freeze)];
    state.spikes = Object.keys(out.spikes);

    // ---- the body and the wallet ----
    if (behavior === "approach") {
      const c = COINS[state.target];
      moveToward(state, c.x, c.y, P.speed);
      const d = dist(state.x, state.y, c.x, c.y);
      const i = state.target;
      if (d <= P.eatRadius && t - state.lastBuy[i] >= P.buyCooldown) {
        const spend = r2(state.cash * P.buyFraction);
        if (spend >= P.minOrder) {
          const px = state.price[i];
          const q = round6((spend * (1 - P.feeRate)) / px);
          if (q > 0) {
            state.cash = r2(state.cash - spend);
            state.qty[i] = round6(state.qty[i] + q);
            state.cost[i] = r2(state.cost[i] + spend);
            if (state.openedAt[i] < 0) state.openedAt[i] = t;
            state.lastBuy[i] = t;
            state.trades += 1;
            trades.push({ side: "buy", coin: i, qty: q, px });
            pushEvent({ t, g: state.gen, kind: "buy", coin: i, px, qty: q, equity: r2(equityOf(state)) });
          }
        }
      }
    } else if (behavior === "avoid") {
      const from = worst >= 0 ? COINS[worst] : COINS[state.target];
      moveToward(state, state.x - (from.x - state.x), state.y - (from.y - state.y), P.speed * (out.gfFired ? 2.4 : 1));
      if (out.gfFired) {
        let any = false;
        for (let i = 0; i < COIN_COUNT; i++) {
          const opened = state.openedAt[i];
          const tr = sell(i, 1, true);
          if (tr) { trades.push(tr); any = true; pushEvent({ t, g: state.gen, kind: "sell", coin: i, px: tr.px, qty: tr.qty, pnl: tr.pnl, openedAt: opened, equity: r2(equityOf(state)) }); }
        }
        if (any) pushEvent({ t, g: state.gen, kind: "escape", equity: r2(equityOf(state)) });
      } else if (worst >= 0 && state.qty[worst] > 0) {
        const opened = state.openedAt[worst];
        const tr = sell(worst, 0.5, false);
        if (tr) { trades.push(tr); pushEvent({ t, g: state.gen, kind: "sell", coin: worst, px: tr.px, qty: tr.qty, pnl: tr.pnl, openedAt: opened, equity: r2(equityOf(state)) }); }
      }
    } else if (behavior === "explore") {
      const c = COINS[second];
      moveToward(state, c.x, c.y, P.speed * 0.6);
    }
    keepInDish(state);
    state.x = r3(state.x); state.y = r3(state.y);

    // ---- records, highs, death ----
    const eq = equityOf(state);
    if (eq > state.peak * 1.05) { state.peak = eq; pushEvent({ t, g: state.gen, kind: "high", equity: r2(eq) }); }
    if (state.energy <= 0) die(t, "starved");
    else if (eq < P.startCash * 0.05) die(t, "broke");

    return seal(t, trades);
  }

  function die(t: number, cause: DeathCause) {
    // The body is gone; its positions are closed at the last price, no fee.
    for (let i = 0; i < COIN_COUNT; i++) {
      if (state.qty[i] > 0) { state.cash = r2(state.cash + state.qty[i] * state.price[i]); state.qty[i] = 0; state.cost[i] = 0; state.openedAt[i] = -1; }
    }
    const eq = r2(state.cash);
    pushEvent({ t, g: state.gen, kind: "death", cause, equity: eq });
    state.status = "dead";
    state.behavior = "dead";
    state.deadUntil = t + P.rebirthTicks;
  }

  function rebirth(t: number) {
    const estate = r2(state.cash * P.estateShare);
    if (estate < P.extinctBelow) {
      state.status = "extinct";
      pushEvent({ t, g: state.gen, kind: "extinct", equity: estate });
      return;
    }
    state.gen += 1;
    state.status = "alive";
    state.bornAt = t;
    state.energy = 0.75;
    state.cash = estate;
    state.peak = estate;
    state.x = 0; state.y = 0; state.novelty = 1;
    state.lastBuy = new Array(COIN_COUNT).fill(-1e9);
    circuit = createCircuit({ seed: circuitSeed(spec, state.gen) });
    pushEvent({ t, g: state.gen, kind: "birth", equity: estate });
  }

  function seal(t: number, tr: Trade[]): TickRecord {
    const rec: TickRecord = {
      v: MARKET_WORLD_VERSION,
      t,
      g: state.gen,
      st: state.status,
      s: state.status === "alive" ? state.signals : [0, 0, 0, 0],
      h: r2(1 - state.energy),
      b: state.status === "alive" ? state.behavior : "dead",
      c: state.status === "alive" ? r2(state.confidence) : 0,
      p: state.status === "alive" ? state.probs : [0, 0, 0, 0],
      gf: state.status === "alive" ? state.gf : false,
      tg: state.target,
      x: state.x,
      y: state.y,
      e: r3(state.energy),
      eq: r2(equityOf(state)),
      tr: tr.map((x) => (x.pnl === undefined ? { side: x.side, coin: x.coin, qty: x.qty, px: x.px } : { side: x.side, coin: x.coin, qty: x.qty, px: x.px, pnl: x.pnl, ...(x.escape ? { escape: true } : {}) })),
    };
    state.lastHash = contentHash(rec);
    state.chain = contentHash({ p: state.chain, r: state.lastHash });
    if (state.status !== "alive") { state.spikes = []; }
    state.tick = t + 1;
    return rec;
  }

  return { state, step };
}
