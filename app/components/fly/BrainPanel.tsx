"use client";

// BrainPanel — the FFW-CX/0.1 circuit that is deciding right now.
//
// The wiring is the real wiring: the fixed synapses from cx-circuit.js, plus the
// PN→KC connections re-derived from this generation's construction seed with the
// same mulberry32 stream the circuit uses. Lit neurons are the ones that spiked
// this tick (from the engine); pulses travel along their outgoing synapses. The
// arcs on the four output neurons are the circuit's probabilities.

import { useEffect, useMemo, useRef } from "react";
import { Bi } from "../Bi";
import { circuitSeed } from "../../lib/market/engine";
import { FLIES, seasonSpec } from "../../lib/market/fly";
import { mulberry32 } from "../../lib/market/tape";
import { useLiveFly } from "./LiveFly";

type Edge = { from: string; to: string; w: number };

// Column (0..4), and row position (0..1) of each neuron.
const NODES: Record<string, [number, number]> = {
  ORN_food: [0, 0.1], LPLC2: [0, 0.62], LC4: [0, 0.8], LIGHT: [0, 0.34], NOV: [0, 0.48],
  PN1: [1, 0.06], PN2: [1, 0.18], PN3: [1, 0.3], NPF: [1, 0.48], LH: [1, 0.36],
  KC1: [2, 0.02], KC2: [2, 0.09], KC3: [2, 0.16], KC4: [2, 0.23], KC5: [2, 0.3], KC6: [2, 0.37], KC7: [2, 0.44], KC8: [2, 0.51], APL: [2.45, 0.26],
  GF: [2, 0.76],
  DN_approach: [4, 0.1], DN_avoid: [4, 0.38], DN_explore: [4, 0.62], DN_freeze: [4, 0.86],
};
const LAYER: Record<string, number> = Object.fromEntries(Object.entries(NODES).map(([k, [c]]) => [k, Math.floor(c)]));

function wiring(seed: number): Edge[] {
  const E: Edge[] = [];
  const S = (from: string, to: string, w: number) => E.push({ from, to, w });
  S("ORN_food", "PN1", 0.5); S("ORN_food", "PN2", 0.4); S("ORN_food", "PN3", 0.3);
  const rng = mulberry32(seed);
  for (let k = 0; k < 8; k++) {
    const pns = [0, 1, 2].filter(() => rng() < 0.75);
    const chosen = pns.length ? pns : [Math.floor(rng() * 3)];
    for (const p of chosen) S("PN" + (p + 1), "KC" + (k + 1), 0.35 + rng() * 0.2);
  }
  for (let k = 1; k <= 8; k++) { S("KC" + k, "APL", 0.22); S("APL", "KC" + k, -0.5); S("KC" + k, "DN_approach", 0.1); }
  S("PN1", "LH", 0.45); S("PN2", "LH", 0.3); S("LH", "DN_approach", 0.5);
  S("LPLC2", "GF", 0.65); S("LC4", "GF", 0.55); S("GF", "DN_avoid", 1.2); S("GF", "DN_approach", -0.6);
  S("LPLC2", "DN_freeze", 0.25); S("LC4", "DN_avoid", 0.2);
  S("LIGHT", "DN_explore", 0.25); S("NOV", "DN_explore", 0.55); S("NOV", "DN_approach", 0.12);
  S("NPF", "PN1", 0.3); S("NPF", "PN2", 0.24); S("NPF", "PN3", 0.18);
  return E;
}

const DN = ["DN_approach", "DN_avoid", "DN_explore", "DN_freeze"];
const DN_LABEL = ["APPROACH · BUY", "AVOID · SELL", "EXPLORE", "FREEZE · HOLD"];
const INPUTS: [string, string, number][] = [["ORN_food", "FOOD", 0], ["LIGHT", "LIGHT", 2], ["NOV", "NOVELTY", 3], ["LPLC2", "THREAT·LPLC2", 1], ["LC4", "THREAT·LC4", 1]];

export default function BrainPanel() {
  const { snap } = useLiveFly();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const seed = snap ? circuitSeed(seasonSpec(FLIES[snap.slug], snap.season), snap.gen) : 0;
  const edges = useMemo(() => wiring(seed), [seed]);
  const live = useRef({ snap, edges, firedAt: 0, tick: -1 });
  live.current.edges = edges;
  if (snap && snap.tick !== live.current.tick) { live.current.tick = snap.tick; live.current.firedAt = typeof performance !== "undefined" ? performance.now() : 0; }
  live.current.snap = snap;

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let W = 0, H = 0, dpr = 1, raf = 0, visible = true, drawn = -2;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(260, r.width); H = Math.max(170, Math.min(240, W * 0.36));
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);
    const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; }); io.observe(wrap);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible && drawn === live.current.tick) return;
      drawn = live.current.tick;
      const t = performance.now();
      const { snap: s, edges: E, firedAt } = live.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const narrow = W < 520;
      const left = W * (narrow ? 0.2 : 0.13), right = W * (narrow ? 0.6 : 0.78), top = H * 0.1, bottom = H * 0.92;
      const pos = (n: string) => { const [c, r] = NODES[n]; return [left + (c / 4) * (right - left), top + r * (bottom - top)] as const; };
      const spiked = new Set(s?.spikes ?? []);
      const since = t - firedAt;
      const delay = (n: string) => LAYER[n] * 260;
      const alive = s?.status === "alive";

      // synapses
      for (const e of E) {
        const [x0, y0] = pos(e.from), [x1, y1] = pos(e.to);
        ctx.strokeStyle = e.w < 0 ? "rgba(255,89,63,0.16)" : `rgba(146,157,144,${0.1 + Math.min(0.25, e.w * 0.18)})`;
        ctx.lineWidth = e.w < 0 ? 0.8 : 0.6 + Math.min(1.4, e.w);
        ctx.setLineDash(e.w < 0 ? [2, 3] : []);
        ctx.beginPath(); ctx.moveTo(x0, y0);
        const mx = (x0 + x1) / 2;
        ctx.bezierCurveTo(mx, y0, mx, y1, x1, y1); ctx.stroke();
      }
      ctx.setLineDash([]);
      // spikes travelling along outgoing synapses
      if (alive && !reduce) {
        for (const e of E) {
          if (!spiked.has(e.from)) continue;
          const u = (since - delay(e.from)) / 520;
          if (u < 0 || u > 1) continue;
          const [x0, y0] = pos(e.from), [x1, y1] = pos(e.to);
          const mx = (x0 + x1) / 2;
          const b = (p0: number, p1: number, p2: number, p3: number, k: number) => (1 - k) ** 3 * p0 + 3 * (1 - k) ** 2 * k * p1 + 3 * (1 - k) * k * k * p2 + k ** 3 * p3;
          const px = b(x0, mx, mx, x1, u), py = b(y0, y0, y1, y1, u);
          const red = e.from === "GF" || e.w < 0;
          const g = ctx.createRadialGradient(px, py, 0, px, py, 7);
          g.addColorStop(0, red ? "rgba(255,89,63,0.95)" : "rgba(186,255,53,0.95)"); g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
        }
      }
      // input drive bars on the left
      const sig = s?.signals ?? [0, 0, 0, 0];
      ctx.font = `500 ${Math.max(8, W * 0.016)}px "DM Mono", ui-monospace, monospace`; ctx.textBaseline = "middle"; ctx.textAlign = "right";
      for (const [n, label, si] of INPUTS) {
        const [x, y] = pos(n);
        const v = alive ? sig[si] : 0;
        ctx.fillStyle = "rgba(146,157,144,0.9)";
        ctx.fillText(narrow ? label.replace("THREAT·", "") : label, x - 12, y);
        const bw = W * 0.06;
        ctx.fillStyle = "rgba(41,52,42,0.9)"; ctx.fillRect(x - 12 - bw, y + 7, bw, 2);
        ctx.fillStyle = si === 1 ? "#ff593f" : "#baff35"; ctx.fillRect(x - 12 - bw, y + 7, bw * v, 2);
      }
      // hunger into NPF
      { const [x, y] = pos("NPF"); ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,189,62,0.85)"; ctx.fillText(`HUNGER ${(s?.hunger ?? 0).toFixed(2)}`, x, y + 14); }
      // neurons
      for (const n of Object.keys(NODES)) {
        const [x, y] = pos(n);
        const fired = alive && spiked.has(n);
        const k = fired ? Math.max(0, 1 - (since - delay(n)) / 1600) : 0;
        const on = fired && since >= delay(n);
        const gf = n === "GF";
        const isDN = n.startsWith("DN_");
        const r = isDN ? 7 : gf ? 7 : n.startsWith("KC") ? 3.6 : 5;
        if (on && k > 0) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
          g.addColorStop(0, gf ? `rgba(255,89,63,${0.8 * k})` : `rgba(186,255,53,${0.7 * k})`); g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = on && k > 0 ? (gf ? "#ff593f" : "#baff35") : "#0c130c";
        ctx.strokeStyle = gf ? "rgba(255,89,63,0.8)" : "rgba(146,157,144,0.6)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (gf) { ctx.fillStyle = "rgba(255,89,63,0.9)"; ctx.textAlign = "center"; ctx.fillText("GIANT FIBER", x, y + 15); }
        if (n === "APL") { ctx.fillStyle = "rgba(146,157,144,0.7)"; ctx.textAlign = "left"; ctx.fillText("APL", x + 8, y); }
        if (n === "LH") { ctx.fillStyle = "rgba(146,157,144,0.7)"; ctx.textAlign = "right"; ctx.fillText("LH", x - 9, y); }
      }
      // outputs: probability arcs and labels
      const probs = s?.probs ?? [0, 0, 0, 0];
      let win = -1;
      if (alive) { win = s!.gf ? 1 : probs.indexOf(Math.max(...probs)); }
      for (let i = 0; i < 4; i++) {
        const [x, y] = pos(DN[i]);
        const p = alive ? probs[i] : 0;
        ctx.strokeStyle = "rgba(41,52,42,1)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = i === win ? (s?.gf ? "#ff593f" : "#baff35") : "rgba(186,255,53,0.45)";
        ctx.beginPath(); ctx.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
        ctx.textAlign = "left";
        ctx.fillStyle = i === win ? "#f1f7eb" : "rgba(146,157,144,0.85)";
        ctx.font = `${i === win ? 700 : 500} ${Math.max(8, W * 0.017)}px "DM Mono", ui-monospace, monospace`;
        ctx.fillText(narrow ? DN_LABEL[i].split(" · ")[0] : DN_LABEL[i], x + 20, y - 1);
        ctx.fillStyle = i === win ? (s?.gf ? "#ff593f" : "#baff35") : "rgba(146,157,144,0.7)";
        ctx.font = `500 ${Math.max(8, W * 0.015)}px "DM Mono", ui-monospace, monospace`;
        ctx.fillText(`${Math.round(p * 100)}%`, x + 20, y + 12);
      }
      // column captions
      ctx.fillStyle = "rgba(146,157,144,0.55)"; ctx.textAlign = "center"; ctx.font = `500 ${Math.max(7, W * 0.013)}px "DM Mono", ui-monospace, monospace`;
      const cap = (c: number, txt: string) => ctx.fillText(txt, left + (c / 4) * (right - left), H * 0.035);
      if (!narrow) { cap(0, "SENSE"); cap(1, "SMELL · HUNGER"); cap(2, "MEMORY · ESCAPE"); cap(4, "DECIDE"); }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  return <div className="tfBrain">
    <div className="tfBrainHead">
      <span className="tfMono"><Bi en="THE CIRCUIT DECIDING · FFW-CX/0.1 · 24 NEURONS"  /></span>
      <span className="tfMono tfBrainSeed">{snap ? `GEN ${snap.gen} · SEED ${seed.toString(16).padStart(8, "0")}` : ""}</span>
    </div>
    <div ref={wrapRef} className="tfBrainCanvas"><canvas ref={canvasRef} role="img" aria-label="The fly's 24-neuron decision circuit, with this tick's spikes" /></div>
  </div>;
}
