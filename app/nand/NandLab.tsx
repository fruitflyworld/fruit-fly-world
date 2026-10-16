"use client";

/* ── app/nand/NandLab.tsx ───────────────────────────────────────────────────
   The interactive half of /nand: the 50-gate netlist drawn as a gate-level
   circuit, and a small panel that feeds it one of the 4096 possible input words
   and shows what every wire does.

   Everything here runs in the browser from the committed netlist
   (app/lib/nand/ffw-nand-1.netlist.json). No chain, no server, no wallet. When
   the circuit is taped out, the same words can be re-checked against the on-chain
   eval() with `npm run nand:verify`.
   ------------------------------------------------------------------------- */

import { useMemo, useState } from "react";
import { BEHAVIORS, decodeOutputs } from "../lib/nand/encode";
import { OFFICIAL } from "../lib/nand/netlist";
import { RULES, decideWord } from "../lib/nand/rules";

const N = OFFICIAL.gates.length;
const BASE = 2 + OFFICIAL.nIn;

/** Every signal's bit for one input word: sources, then one entry per gate. */
function signalTrace(word: number): Uint8Array {
  const sig = new Uint8Array(BASE + N);
  sig[1] = 1;
  for (let i = 0; i < OFFICIAL.nIn; i++) sig[2 + i] = (word >>> i) & 1;
  for (let i = 0; i < N; i++) {
    const [a, b] = OFFICIAL.gates[i];
    sig[BASE + i] = sig[a] & sig[b] ? 0 : 1;
  }
  return sig;
}

const SRC_LABEL = ["0", "1", "f0", "f1", "t0", "t1", "l0", "l1", "n0", "n1", "h0", "h1", "p0", "p1"];
const OUT_LABEL = ["move b0", "move b1", "escape"];

const NODE_W = 26;
const NODE_H = 16;
const COL_GAP = 96;
const PAD_L = 52;
const PAD_R = 118;
const H = 560;

interface Placed {
  sig: number;
  col: number;
  x: number;
  y: number;
  kind: "src" | "gate";
  a?: number;
  b?: number;
  isOut: boolean;
}

/** Lay the netlist out in columns by logic depth, ordering each column by the
 *  mean height of its parents so the wires read left to right without a knot. */
function layout(): { nodes: Placed[]; wires: { from: number; to: number; slot: 0 | 1 }[]; width: number; depth: number } {
  const depth = new Int16Array(BASE + N);
  for (let i = 0; i < N; i++) {
    const [a, b] = OFFICIAL.gates[i];
    depth[BASE + i] = 1 + Math.max(depth[a], depth[b]);
  }
  let maxD = 0;
  for (let i = 0; i < N; i++) maxD = Math.max(maxD, depth[BASE + i]);

  const cols: number[][] = Array.from({ length: maxD + 1 }, () => []);
  for (let s = 0; s < BASE; s++) cols[0].push(s);
  for (let i = 0; i < N; i++) cols[depth[BASE + i]].push(BASE + i);

  const outSet = new Set([BASE + N - 3, BASE + N - 2, BASE + N - 1]);
  const nodes: Placed[] = [];
  const place = new Map<number, Placed>();
  const yOf = (col: number, j: number, k: number) => ((j + 0.5) * H) / k;

  for (let c = 0; c <= maxD; c++) {
    const sigs = cols[c];
    if (c > 0) {
      // barycentre of already-placed parents, so a gate sits near what feeds it
      const ks = (s: number) => {
        const g = OFFICIAL.gates[s - BASE];
        return (place.get(g[0])?.y ?? H / 2) + (place.get(g[1])?.y ?? H / 2);
      };
      sigs.sort((p, q) => ks(p) - ks(q));
    }
    sigs.forEach((s, j) => {
      const gate = c > 0 ? OFFICIAL.gates[s - BASE] : undefined;
      const node: Placed = {
        sig: s, col: c, x: PAD_L + c * COL_GAP, y: yOf(c, j, sigs.length),
        kind: c === 0 ? "src" : "gate", a: gate?.[0], b: gate?.[1], isOut: outSet.has(s)
      };
      nodes.push(node);
      place.set(s, node);
    });
  }

  const wires: { from: number; to: number; slot: 0 | 1 }[] = [];
  for (let i = 0; i < N; i++) {
    wires.push({ from: OFFICIAL.gates[i][0], to: BASE + i, slot: 0 });
    wires.push({ from: OFFICIAL.gates[i][1], to: BASE + i, slot: 1 });
  }
  return { nodes, wires, width: PAD_L + maxD * COL_GAP + NODE_W + PAD_R, depth: maxD };
}

const LEVEL_LABELS = ["rest", "warm", "hot", "peak"];

export default function NandLab() {
  const { nodes, wires, width, depth } = useMemo(layout, []);
  const bySig = useMemo(() => new Map(nodes.map((n) => [n.sig, n])), [nodes]);
  const [word, setWord] = useState(() => 0 | (0 << 2) | (1 << 4) | (2 << 6) | (3 << 8) | (3 << 10));

  const sig = useMemo(() => signalTrace(word), [word]);
  const verdict = useMemo(() => decideWord(word), [word]);
  const out = useMemo(() => decodeOutputs(evalOut(sig)), [sig]);
  const highGates = useMemo(() => {
    let c = 0;
    for (let i = 0; i < N; i++) if (sig[BASE + i]) c++;
    return c;
  }, [sig]);

  const setLevel = (shift: number, v: number) => setWord((w) => (w & ~(3 << shift)) | (v << shift));
  const lv = (shift: number) => (word >>> shift) & 3;

  const ruleText = RULES.find((r) => r.id === verdict.rule)?.text ?? "";

  const wirePath = (from: Placed, to: Placed, slot: 0 | 1) => {
    const x1 = from.x + NODE_W;
    const y1 = from.y;
    const x2 = to.x;
    const y2 = to.y + (slot === 0 ? -4 : 4);
    const dx = Math.max(14, (x2 - x1) * 0.45);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  return <div className="ndLab">
    <figure className="ndCanvas">
      <figcaption className="ndCanvasTop">
        <span className="ndMono">FFW-NAND/1 · {N} NAND · 0 LATCH · DEPTH {depth}</span>
        <span className="ndMono ndLive"><i /> {highGates} OF {N} GATES HIGH ON THIS WORD</span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`The ${N}-gate NAND circuit, wires coloured by the current input word`}>
        <g className="ndWires">
          {wires.map((w, i) => {
            const to = bySig.get(w.to)!;
            const from = bySig.get(w.from)!;
            const high = sig[w.from] === 1;
            return <path key={i} d={wirePath(from, to, w.slot)} className={high ? "on" : "off"} />;
          })}
        </g>

        {nodes.map((n) => {
          if (n.kind === "src") {
            const on = sig[n.sig] === 1;
            return <g key={n.sig} className={`ndSrc${on ? " on" : ""}`}>
              <text x={PAD_L - NODE_W / 2 - 9} y={n.y + 3} textAnchor="end">{SRC_LABEL[n.sig]}</text>
              <rect x={PAD_L - NODE_W / 2} y={n.y - NODE_H / 2} width={NODE_W} height={NODE_H} rx="2" />
            </g>;
          }
          const on = sig[n.sig] === 1;
          return <g key={n.sig} className={`ndGate${on ? " on" : ""}${n.isOut ? " out" : ""}`}>
            <rect x={n.x} y={n.y - NODE_H / 2} width={NODE_W} height={NODE_H} rx="2" />
            <circle cx={n.x + NODE_W + 2} cy={n.y} r="2.4" />
            <text x={n.x + NODE_W / 2} y={n.y + 3.2} textAnchor="middle">{on ? 1 : 0}</text>
          </g>;
        })}

        {[BASE + N - 3, BASE + N - 2, BASE + N - 1].map((s, k) => {
          const n = bySig.get(s)!;
          const on = sig[s] === 1;
          const x = width - PAD_R + 16;
          return <g key={s} className={`ndOutPin${on ? " on" : ""}`}>
            <path d={`M ${n.x + NODE_W + 3} ${n.y} C ${n.x + 40} ${n.y}, ${x - 40} ${n.y - 20 + k * 18}, ${x} ${n.y - 20 + k * 18}`} />
            <text x={x + 6} y={n.y - 17 + k * 18} >{OUT_LABEL[k]}</text>
          </g>;
        })}
      </svg>
    </figure>

    <div className="ndPanel">
      <div className="ndPanelHead"><span className="ndMono">FEED IT A WORD · 12 BITS IN</span></div>

      <ul className="ndBits">
        {Array.from({ length: 12 }, (_, i) => <li key={i}>
          <span>{SRC_LABEL[2 + i]}</span>
          <b>{(word >>> i) & 1}</b>
        </li>)}
      </ul>

      {(["food", "threat", "light", "novelty", "hunger"] as const).map((name, i) => {
        const shift = i * 2;
        return <div className="ndRow" key={name}>
          <span className="ndName">{name}</span>
          <div className="ndLevels">
            {[0, 1, 2, 3].map((v) => <button
              key={v}
              className={lv(shift) === v ? "on" : ""}
              onClick={() => setLevel(shift, v)}
              aria-label={`${name} level ${v} (${LEVEL_LABELS[v]})`}
            >{v}</button>)}
          </div>
        </div>;
      })}

      <div className="ndRow">
        <span className="ndName">prev</span>
        <div className="ndLevels ndLevelsWide">
          {BEHAVIORS.map((b, v) => <button
            key={b}
            className={lv(10) === v ? "on" : ""}
            onClick={() => setLevel(10, v)}
            aria-label={`previous behavior ${b}`}
          >{b.slice(0, 5)}</button>)}
        </div>
      </div>

      <div className="ndReadout">
        <div><span className="ndMono">INPUT WORD</span><b className="ndNum">0x{word.toString(16).padStart(3, "0")}</b></div>
        <div><span className="ndMono">RULE</span><b>{verdict.rule}</b></div>
        <div><span className="ndMono">MOVE</span><b className={out.gf ? "ndGf" : ""}>{out.behavior}</b></div>
        <div><span className="ndMono">GIANT FIBER</span><b className={out.gf ? "ndGf" : ""}>{out.gf ? "FIRES" : "quiet"}</b></div>
      </div>
      <p className="ndRule">Rule {verdict.rule}: {ruleText}</p>
      <div className="ndPanelFoot">
        <button className="ndShuffle" onClick={() => setWord((w) => (w * 1103515245 + 12345) & 0xfff)}>next word</button>
        <span className="ndMono">4096 words, all checked against the rules</span>
      </div>
    </div>
  </div>;
}

/** The 3-bit output word, read off the last three signals. */
function evalOut(sig: Uint8Array): number {
  const first = sig.length - OFFICIAL.nOut;
  let out = 0;
  for (let k = 0; k < OFFICIAL.nOut; k++) out |= sig[first + k] << k;
  return out;
}
