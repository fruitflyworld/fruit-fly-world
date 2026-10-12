// tape.ts — the market a trading fly lives in, as a deterministic tape.
//
// Paper mode (today): the tape is generated from a seed. Every price, volume,
// buyer count and fee tick is a pure function of (seed, tick), built only from
// + − × ÷ and Math.imul / Math.round, so a browser on arm64 and a server on x64
// produce the same bytes. No Math.sin/exp/log here (their last ulp differs
// across platforms — see docs/determinism.md).
//
// Live mode (after launch): the same TapeTick shape is filled from recorded
// market snapshots, and the tape's content hash is published with the season,
// so replays read the recorded tape instead of the generator.

/** The coins on the paper-season menu. Invented tickers: nothing here is a real asset. */
export const COINS = [
  { ticker: "BANANA", x: 0.0, y: -0.72 },
  { ticker: "MANGO", x: 0.62354, y: -0.36 },
  { ticker: "PLUM", x: 0.62354, y: 0.36 },
  { ticker: "FIG", x: 0.0, y: 0.72 },
  { ticker: "KIWI", x: -0.62354, y: 0.36 },
  { ticker: "PEAR", x: -0.62354, y: -0.36 },
] as const;
// Positions are literals on purpose (a ring of radius 0.72 at 60° steps):
// computing them with Math.cos would let one ulp differ between machines.

export const COIN_COUNT = COINS.length;

export interface TapeTick {
  /** Price per coin, rounded to 1e-6. */
  price: number[];
  /** Traded volume this tick per coin (paper USD). */
  volume: number[];
  /** Distinct buyers this tick per coin. */
  buyers: number[];
  /** Fee income routed to the fly this tick (its food), paper USD. */
  fee: number;
  /** Direct x402 feeds this tick (always 0 in paper mode). */
  feeds: number;
}

/** mulberry32 — the same generator the circuit uses for construction. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mix two integers into one 32-bit seed (FNV-style, pure integer math). */
export function mixSeed(a: number, b: number) {
  let h = 0x811c9dc5;
  h = Math.imul(h ^ (a >>> 0), 0x01000193);
  h = Math.imul(h ^ (b >>> 0), 0x01000193);
  h ^= h >>> 15;
  return h >>> 0;
}

export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Triangle wave in [0,1] with the given period, pure arithmetic. */
function tri(t: number, period: number) {
  const ph = (t % period) / period; // 0..1
  return ph < 0.5 ? ph * 2 : 2 - ph * 2;
}

interface CoinState { p: number; regime: number; left: number }

export interface Tape {
  readonly seed: number;
  /** The tick the next call to next() returns. */
  readonly tick: number;
  next(): TapeTick;
}

/**
 * A paper-market tape. Each coin walks multiplicatively with a regime
 * (calm / trending up / trending down / pump / dump) that switches at random
 * times; volume and buyers follow the size of the move. Fee income has a slow
 * daily rhythm (busy and quiet hours), which is what makes a fly go hungry.
 */
export function createPaperTape(seed: number, ticksPerDay: number): Tape {
  const rng = mulberry32(seed);
  const coins: CoinState[] = COINS.map(() => ({ p: round6(0.6 + rng() * 0.8), regime: 0, left: 0 }));
  let tick = 0;

  // regime: 0 calm, 1 drift up, 2 drift down, 3 pump, 4 dump
  const DRIFT = [0, 0.0006, -0.0007, 0.006, -0.008];
  const VOL = [0.004, 0.006, 0.006, 0.014, 0.02];

  const gauss = () => rng() + rng() + rng() - 1.5; // ≈ N(0, 0.5²), arithmetic only

  return {
    seed,
    get tick() { return tick; },
    next(): TapeTick {
      const price: number[] = [];
      const volume: number[] = [];
      const buyers: number[] = [];
      for (let i = 0; i < coins.length; i++) {
        const c = coins[i];
        if (c.left <= 0) {
          const u = rng();
          c.regime = u < 0.46 ? 0 : u < 0.68 ? 1 : u < 0.88 ? 2 : u < 0.95 ? 3 : 4;
          c.left = c.regime >= 3 ? 8 + Math.floor(rng() * 22) : 60 + Math.floor(rng() * 340);
        }
        c.left -= 1;
        const r = DRIFT[c.regime] + VOL[c.regime] * gauss() * 2;
        const before = c.p;
        let next = before * (1 + r);
        // Soft floor and ceiling keep a paper coin from dying or exploding in one season.
        if (next < 0.05) next = 0.05 + (0.05 - next) * 0.5;
        if (next > 25) next = 25 - (next - 25) * 0.5;
        c.p = round6(next);
        const move = r < 0 ? -r : r;
        const hype = c.regime === 3 ? 3.2 : c.regime === 4 ? 2.6 : c.regime === 1 ? 1.4 : 1;
        const vol = (900 + 60000 * move) * hype * (0.7 + rng() * 0.6);
        volume.push(Math.round(vol * 100) / 100);
        buyers.push(Math.max(1, Math.round((vol / 140) * (c.regime === 4 ? 0.35 : 0.55 + rng() * 0.5))));
        price.push(c.p);
      }
      // Fee food: a busy/quiet daily rhythm plus noise. Lulls are where flies starve.
      const day = tri(tick, ticksPerDay); // 0 at midnight UTC, 1 at noon
      const busy = 0.55 + 1.2 * day * day;
      const fee = Math.round(busy * (0.6 + rng() * 0.8) * 1000) / 1000;
      tick += 1;
      return { price, volume, buyers, fee, feeds: 0 };
    },
  };
}
