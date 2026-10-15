/* ── app/lib/nand/netlist.ts ─────────────────────────────────────────────────
   A gate-level netlist in TapeOut's encoding, and an evaluator that follows the
   same rules the TapeOut processor contract does:

     signal 0 = constant 0 · signal 1 = constant 1 · signals 2..2+nIn-1 = inputs
     gate i writes signal 2+nIn+i · a gate may only read lower signals
     NAND = 0x00 | u24 a | u24 b   (big-endian)
     the last nOut signals are the outputs; output k = bit k of the result word

   (Format: reverse-engineered and verified on chain by the OrderGuard team,
   github.com/xm1319/tapemkt NETLIST-FORMAT.md. FFW-NAND/1 uses NAND only: no
   LATCH, no REF, so on-chain evaluation is a pure function of the input word.)
   ------------------------------------------------------------------------- */
import official from "./ffw-nand-1.netlist.json";

export interface Netlist {
  version: string;
  nIn: number;
  nOut: number;
  /** gates[i] = [a, b]: the two signals NAND-ed into signal 2 + nIn + i. */
  gates: [number, number][];
}

export const OFFICIAL = official as unknown as Netlist;

export function checkNetlist(n: Netlist): void {
  const base = 2 + n.nIn;
  n.gates.forEach(([a, b], i) => {
    const self = base + i;
    if (!(a >= 0 && a < self && b >= 0 && b < self)) throw new Error(`gate ${i}: future signal`);
  });
  if (n.gates.length < n.nOut) throw new Error("fewer gates than outputs");
}

/** Evaluate every gate once, in order. Returns the output word. */
export function evalWord(n: Netlist, word: number): number {
  const sig = new Uint8Array(2 + n.nIn + n.gates.length);
  sig[1] = 1;
  for (let i = 0; i < n.nIn; i++) sig[2 + i] = (word >>> i) & 1;
  const base = 2 + n.nIn;
  for (let i = 0; i < n.gates.length; i++) {
    const g = n.gates[i];
    sig[base + i] = sig[g[0]] & sig[g[1]] ? 0 : 1;
  }
  let out = 0;
  const first = sig.length - n.nOut;
  for (let k = 0; k < n.nOut; k++) out |= sig[first + k] << k;
  return out;
}

/** TapeOut tapeout() bytes: one 7-byte NAND record per gate. */
export function toTapeoutBytes(n: Netlist): Uint8Array {
  const out = new Uint8Array(n.gates.length * 7);
  n.gates.forEach(([a, b], i) => {
    const o = i * 7;
    out[o] = 0x00;
    out[o + 1] = (a >>> 16) & 255; out[o + 2] = (a >>> 8) & 255; out[o + 3] = a & 255;
    out[o + 4] = (b >>> 16) & 255; out[o + 5] = (b >>> 8) & 255; out[o + 6] = b & 255;
  });
  return out;
}

/** Parse tapeout bytes back (NAND records only). */
export function fromTapeoutBytes(bytes: Uint8Array, nIn: number, nOut: number, version = "parsed"): Netlist {
  if (bytes.length % 7 !== 0) throw new Error("not a NAND-only netlist");
  const gates: [number, number][] = [];
  for (let o = 0; o < bytes.length; o += 7) {
    if (bytes[o] !== 0x00) throw new Error(`opcode ${bytes[o]} at byte ${o}: only NAND is supported`);
    gates.push([(bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3], (bytes[o + 4] << 16) | (bytes[o + 5] << 8) | bytes[o + 6]]);
  }
  return { version, nIn, nOut, gates };
}
