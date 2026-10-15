/* ── app/lib/nand/encode.ts ──────────────────────────────────────────────────
   FFW-NAND/1 input and output encoding. This is the whole interface between a
   fly's world and a gate-level brain, and it is what a TapeOut circuit sees:

     12 input bits  (bit 0 = first input pin, the order eval() packs them)
       bits 0-1   food      level 0..3
       bits 2-3   threat    level 0..3
       bits 4-5   light     level 0..3
       bits 6-7   novelty   level 0..3
       bits 8-9   hunger    level 0..3
       bits 10-11 previous behavior (0 approach · 1 avoid · 2 explore · 3 freeze)
     3 output bits
       bits 0-1   behavior  (same numbering)
       bit 2      giant-fiber escape

   A level is a fixed threshold count: x < 0.10 → 0, < 0.35 → 1, < 0.65 → 2, else 3.
   Plain comparisons on the world's already-rounded numbers: deterministic everywhere.
   ------------------------------------------------------------------------- */

export const NAND_BRAIN_VERSION = "FFW-NAND/1";
export const LEVELS = [0.1, 0.35, 0.65] as const;
export const N_IN = 12;
export const N_OUT = 3;
export const BEHAVIORS = ["approach", "avoid", "explore", "freeze"] as const;
export type NandBehavior = (typeof BEHAVIORS)[number];

export interface NandSignals { food: number; threat: number; light: number; novelty: number }

export function level(x: number): number {
  return x < LEVELS[0] ? 0 : x < LEVELS[1] ? 1 : x < LEVELS[2] ? 2 : 3;
}

export function behaviorIndex(b: string): number {
  const i = (BEHAVIORS as readonly string[]).indexOf(b);
  return i < 0 ? 3 : i; // anything unknown reads as freeze
}

/** Pack one decision's inputs into the 12-bit word a circuit evaluates. */
export function encodeInputs(s: NandSignals, hunger: number, prev: string | number): number {
  const p = typeof prev === "number" ? prev & 3 : behaviorIndex(prev);
  return level(s.food) | (level(s.threat) << 2) | (level(s.light) << 4) |
    (level(s.novelty) << 6) | (level(hunger) << 8) | (p << 10);
}

export function decodeOutputs(word: number): { behavior: NandBehavior; gf: boolean } {
  return { behavior: BEHAVIORS[word & 3], gf: ((word >> 2) & 1) === 1 };
}
