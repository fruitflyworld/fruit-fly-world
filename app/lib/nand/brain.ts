/* ── app/lib/nand/brain.ts ───────────────────────────────────────────────────
   FFW-NAND/1 as a decision layer. Same output shape as the FFW-CX/0.1 circuit's
   step(), so a world can swap one for the other. The decision is whatever the
   gate-level netlist returns for the encoded word — nothing else: no hidden
   state, no randomness. Previous behavior is an input, so a short memory lives
   in the world, where it is sealed, instead of inside the brain.
   ------------------------------------------------------------------------- */
import { BEHAVIORS, decodeOutputs, encodeInputs, type NandSignals } from "./encode";
import { evalWord, OFFICIAL } from "./netlist";

export interface NandStep {
  behavior: (typeof BEHAVIORS)[number];
  confidence: number;
  gfFired: boolean;
  probabilities: Record<(typeof BEHAVIORS)[number], number>;
  spikes: Record<string, true>;
}

export interface NandBrain {
  step(s: NandSignals, hunger: number, prev: string): NandStep;
  /** The last input and output words, for the sealed record. */
  lastIn: number;
  lastOut: number;
}

export function createNandBrain(evaluate: (word: number) => number = (w) => evalWord(OFFICIAL, w)): NandBrain {
  const brain: NandBrain = {
    lastIn: 0,
    lastOut: 0,
    step(s, hunger, prev) {
      const w = encodeInputs(s, hunger, prev);
      const o = evaluate(w);
      brain.lastIn = w;
      brain.lastOut = o;
      const { behavior, gf } = decodeOutputs(o);
      const probabilities = { approach: 0, avoid: 0, explore: 0, freeze: 0 };
      probabilities[behavior] = 1;
      const spikes: Record<string, true> = {};
      if (gf) spikes.GF = true;
      return { behavior, confidence: 1, gfFired: gf, probabilities, spikes };
    },
  };
  return brain;
}
