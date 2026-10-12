"use client";

// Arena — the dish, drawn from this browser's own replay.
//
// What you see maps to the engine, one to one:
//   scent plumes   ← each coin's scent (volume + real buyers + momentum); colour = sweet (rising) → bitter (falling)
//   ring on a coin ← that coin's last 120 prices, wrapped around it
//   the fly        ← the sealed position; flight, landing, feeding and the Giant Fiber jump follow its behavior
//   ring on the fly← energy (fees are food)
// Everything else — plume drift, wing beats, particles — is presentation only and never
// feeds back into the engine.

import { useEffect, useRef } from "react";
import { COINS } from "../../lib/market/tape";
import { TICK_MS } from "../../lib/market/fly";
import { useLiveFly, type Snapshot } from "./LiveFly";

const C = { acid: "#baff35", amber: "#ffbd3e", danger: "#ff593f", ink: "#f1f7eb", muted: "#929d90", line: "#29342a", sky: "#8fd3ff", bg: "#050805" };

type RGB = [number, number, number];
const hex = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const RED = hex(C.danger), AMB = hex(C.amber), ACID = hex(C.acid);
/** sweetness 0..1 → bitter red, amber, sweet acid */
const sweetRGB = (s: number): RGB => (s < 0.5 ? lerpRGB(RED, AMB, s * 2) : lerpRGB(AMB, ACID, (s - 0.5) * 2));
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const angLerp = (a: number, b: number, t: number) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; coin: number; s: number; tint: number };
type Fx = { kind: "burst" | "ring" | "label" | "flash" | "stream" | "hatch"; x: number; y: number; tx?: number; ty?: number; born: number; life: number; color: string; text?: string; sub?: string; seed?: number };

const SPRITES = 12;

function makeSprites(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < SPRITES; i++) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const col = sweetRGB(i / (SPRITES - 1));
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, rgba(col, 0.9));
    grd.addColorStop(0.35, rgba(col, 0.35));
    grd.addColorStop(1, rgba(col, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    out.push(c);
  }
  return out;
}

/** The static dish: agar, meniscus, glass rim, graduations. Redrawn only on resize. */
function paintDish(W: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = Math.round(W * dpr);
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  const cx = W / 2, cy = W / 2, R = W * 0.465;
  // outer glow
  const halo = g.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.08);
  halo.addColorStop(0, "rgba(186,255,53,0)"); halo.addColorStop(0.5, "rgba(186,255,53,0.06)"); halo.addColorStop(1, "rgba(186,255,53,0)");
  g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, R * 1.08, 0, Math.PI * 2); g.fill();
  // agar body
  const agar = g.createRadialGradient(cx - R * 0.2, cy - R * 0.25, R * 0.05, cx, cy, R);
  agar.addColorStop(0, "#1a2a18"); agar.addColorStop(0.55, "#0e180e"); agar.addColorStop(0.92, "#081008"); agar.addColorStop(1, "#050a05");
  g.fillStyle = agar; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  // grain
  g.save(); g.beginPath(); g.arc(cx, cy, R * 0.97, 0, Math.PI * 2); g.clip();
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 1400; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R;
    g.fillStyle = rnd() < 0.5 ? `rgba(186,255,53,${0.02 + rnd() * 0.05})` : `rgba(241,247,235,${0.015 + rnd() * 0.03})`;
    g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.3 + rnd() * 1.1, 0, Math.PI * 2); g.fill();
  }
  // faint polar grid
  g.strokeStyle = "rgba(146,157,144,0.07)"; g.lineWidth = 1;
  for (const k of [0.25, 0.5, 0.75]) { g.beginPath(); g.arc(cx, cy, R * k, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
  g.restore();
  // meniscus (inner shadow at the wall)
  const men = g.createRadialGradient(cx, cy, R * 0.86, cx, cy, R);
  men.addColorStop(0, "rgba(0,0,0,0)"); men.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = men; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  // glass wall
  g.lineWidth = R * 0.028;
  const wall = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  wall.addColorStop(0, "rgba(220,255,200,0.45)"); wall.addColorStop(0.35, "rgba(186,255,53,0.18)"); wall.addColorStop(0.7, "rgba(186,255,53,0.08)"); wall.addColorStop(1, "rgba(220,255,200,0.25)");
  g.strokeStyle = wall; g.beginPath(); g.arc(cx, cy, R + g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1; g.strokeStyle = "rgba(186,255,53,0.35)"; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  // graduations
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2 - Math.PI / 2, major = i % 10 === 0;
    const r0 = R * (major ? 1.045 : 1.05), r1 = R * (major ? 1.085 : 1.07);
    g.strokeStyle = major ? "rgba(186,255,53,0.55)" : "rgba(146,157,144,0.28)";
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
  }
  return c;
}

/** Glass glare drawn over everything (cheap realism). */
function paintGlare(W: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = Math.round(W * dpr);
  const g = c.getContext("2d")!;
  g.scale(dpr, dpr);
  const cx = W / 2, cy = W / 2, R = W * 0.465;
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
  const gl = g.createLinearGradient(cx - R, cy - R, cx, cy);
  gl.addColorStop(0, "rgba(255,255,255,0.07)"); gl.addColorStop(0.5, "rgba(255,255,255,0.015)"); gl.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gl; g.beginPath(); g.ellipse(cx - R * 0.25, cy - R * 0.35, R * 0.75, R * 0.45, -0.6, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2; g.lineCap = "round";
  g.beginPath(); g.arc(cx, cy, R * 0.93, Math.PI * 1.08, Math.PI * 1.36); g.stroke();
  g.restore();
  return c;
}

function chip(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, alpha: number, size: number, sub?: string) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 ${size}px "DM Mono", ui-monospace, monospace`;
  const w = ctx.measureText(text).width;
  ctx.font = `500 ${size * 0.82}px "DM Mono", ui-monospace, monospace`;
  const w2 = sub ? ctx.measureText(sub).width + size * 0.8 : 0;
  const pad = size * 0.7, h = size * 2;
  const bw = w + w2 + pad * 2;
  ctx.fillStyle = "rgba(5,8,5,0.82)";
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x - bw / 2, y - h / 2, bw, h, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.font = `700 ${size}px "DM Mono", ui-monospace, monospace`;
  ctx.fillText(text, x - bw / 2 + pad, y + 0.5);
  if (sub) { ctx.fillStyle = "rgba(241,247,235,0.75)"; ctx.font = `500 ${size * 0.82}px "DM Mono", ui-monospace, monospace`; ctx.fillText(sub, x - bw / 2 + pad + w + size * 0.8, y + 0.5); }
  ctx.restore();
}

interface FlyLook { flying: number; feeding: boolean; grooming: boolean; dead: boolean; energy: number; sniff: number; escape: number }

/** A top-down Drosophila, drawn at (0,0) facing −y, body length L. */
function drawFly(ctx: CanvasRenderingContext2D, L: number, t: number, look: FlyLook, reduce: boolean) {
  const { flying, feeding, grooming, dead } = look;
  const tan = dead ? "#5d6158" : "#c58b3f", tanDark = dead ? "#3d403a" : "#8a5a22", band = dead ? "#2a2c28" : "#3b220c";
  // legs
  ctx.strokeStyle = dead ? "rgba(90,94,86,0.9)" : "rgba(58,36,14,0.95)";
  ctx.lineWidth = Math.max(1, L * 0.022); ctx.lineCap = "round"; ctx.lineJoin = "round";
  const tuck = flying; // legs fold in flight
  const legs: [number, number, number][] = [[-0.08, -0.55, 0.35], [0.02, 0.1, 0.55], [0.1, 0.65, 0.5]];
  for (let k = 0; k < 3; k++) for (const side of [-1, 1]) {
    const [oy, dirY, len] = legs[k];
    const ph = reduce || dead ? 0 : (look.flying > 0.1 ? 0 : Math.sin(t / 70 + k * 2.1 + (side > 0 ? Math.PI : 0)));
    const groom = grooming && k === 0 && !reduce ? Math.sin(t / 90) * 0.18 : 0;
    const spread = (1 - tuck * 0.65) * (dead ? 0.35 : 1);
    const kx = side * L * 0.22 * spread, ky = L * (oy + dirY * 0.18 + ph * 0.025);
    const fx = side * L * (0.22 + len * 0.42) * spread, fy = L * (oy + dirY * len * 0.6 + ph * 0.05 + groom * (k === 0 ? -1 : 0));
    ctx.beginPath(); ctx.moveTo(side * L * 0.08, L * oy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy - (k === 0 && grooming ? L * 0.12 : 0)); ctx.stroke();
  }
  // wings
  const wingL = L * 0.78, wingW = L * 0.24;
  const drawWing = (side: number, ang: number, alpha: number) => {
    ctx.save();
    ctx.translate(side * L * 0.07, -L * 0.04);
    ctx.rotate(side * ang);
    ctx.globalAlpha = alpha;
    const wg = ctx.createLinearGradient(0, 0, side * wingW, wingL);
    wg.addColorStop(0, "rgba(230,240,235,0.42)"); wg.addColorStop(0.6, "rgba(200,225,240,0.22)"); wg.addColorStop(1, "rgba(220,200,255,0.30)");
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(side * wingW * 1.15, wingL * 0.2, side * wingW * 1.0, wingL * 0.95, side * wingW * 0.25, wingL);
    ctx.bezierCurveTo(side * -wingW * 0.2, wingL * 0.85, side * -wingW * 0.15, wingL * 0.3, 0, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(235,245,240,0.35)"; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = "rgba(60,50,30,0.35)"; ctx.lineWidth = 0.7;
    for (const v of [0.25, 0.5, 0.75]) { ctx.beginPath(); ctx.moveTo(0, wingL * 0.05); ctx.quadraticCurveTo(side * wingW * v * 0.9, wingL * 0.5, side * wingW * (0.1 + v * 0.65), wingL * 0.96); ctx.stroke(); }
    ctx.restore();
  };
  if (flying > 0.05 && !dead) {
    const base = 0.25 + flying * 0.95;
    const sweep = reduce ? 0 : 0.55 * flying;
    const ph = reduce ? 0 : t / 9;
    for (let g = 0; g < 4; g++) {
      const a = base + Math.sin(ph + g * 0.8) * sweep;
      for (const side of [-1, 1]) drawWing(side, a, 0.16 + (g === 0 ? 0.2 : 0));
    }
  } else {
    const rest = dead ? 0.6 : 0.16 + (grooming && !reduce ? Math.max(0, Math.sin(t / 400)) * 0.05 : 0);
    drawWing(-1, rest, 1); drawWing(1, rest, 1);
  }
  // abdomen
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, L * 0.3, L * 0.17, L * 0.3, 0, 0, Math.PI * 2);
  const ab = ctx.createRadialGradient(-L * 0.05, L * 0.2, L * 0.02, 0, L * 0.3, L * 0.32);
  ab.addColorStop(0, tan); ab.addColorStop(1, tanDark);
  ctx.fillStyle = ab; ctx.fill(); ctx.clip();
  ctx.fillStyle = band;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, L * (0.2 + i * 0.1), L * 0.2, L * 0.022 + i * L * 0.004, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = band; ctx.beginPath(); ctx.ellipse(0, L * 0.58, L * 0.12, L * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // thorax
  const th = ctx.createRadialGradient(-L * 0.04, -L * 0.1, L * 0.01, 0, -L * 0.06, L * 0.17);
  th.addColorStop(0, dead ? "#6d7168" : "#d39a4c"); th.addColorStop(1, tanDark);
  ctx.fillStyle = th; ctx.beginPath(); ctx.ellipse(0, -L * 0.06, L * 0.15, L * 0.17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(40,22,6,0.5)"; ctx.lineWidth = 0.8;
  for (const sx of [-0.05, 0.05]) { ctx.beginPath(); ctx.moveTo(L * sx, -L * 0.2); ctx.lineTo(L * sx * 0.6, L * 0.06); ctx.stroke(); }
  // head
  ctx.fillStyle = dead ? "#5d6158" : "#b98236";
  ctx.beginPath(); ctx.ellipse(0, -L * 0.3, L * 0.13, L * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  // compound eyes
  for (const side of [-1, 1]) {
    const eg = ctx.createRadialGradient(side * L * 0.1 - L * 0.02, -L * 0.33, L * 0.005, side * L * 0.1, -L * 0.31, L * 0.08);
    eg.addColorStop(0, dead ? "#777" : "#ff6a5a"); eg.addColorStop(0.6, dead ? "#4a4a4a" : "#c4161e"); eg.addColorStop(1, dead ? "#333" : "#6e0a0e");
    ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(side * L * 0.1, -L * 0.31, L * 0.075, L * 0.085, side * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.arc(side * L * 0.085, -L * 0.345, L * 0.016, 0, Math.PI * 2); ctx.fill();
  }
  // antennae (twitch harder when the scent is strong)
  if (!dead) {
    const tw = reduce ? 0 : Math.sin(t / (60 - look.sniff * 30)) * (0.08 + look.sniff * 0.25);
    ctx.strokeStyle = "rgba(240,220,170,0.75)"; ctx.lineWidth = 0.8;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * L * 0.03, -L * 0.38);
      ctx.quadraticCurveTo(side * L * 0.06, -L * 0.46, side * L * (0.09 + tw * 0.2), -L * (0.5 + tw * 0.05)); ctx.stroke();
    }
  }
  // proboscis while feeding
  if (feeding && !reduce) {
    const ext = (Math.sin(t / 110) + 1) / 2;
    ctx.strokeStyle = "rgba(200,150,90,0.95)"; ctx.lineWidth = Math.max(1, L * 0.03);
    ctx.beginPath(); ctx.moveTo(0, -L * 0.38); ctx.lineTo(0, -L * (0.42 + ext * 0.1)); ctx.stroke();
  }
}

export default function Arena({ still = false, label = "Live arena" }: { still?: boolean; label?: string }) {
  const { snap } = useLiveFly();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const snapRef = useRef<Snapshot | null>(null);
  const fxRef = useRef<Fx[]>([]);
  const lastTickRef = useRef(-1);
  const shakeRef = useRef(0);

  // New tick → spawn the effects that tick earned.
  useEffect(() => {
    snapRef.current = snap;
    if (!snap || snap.tick === lastTickRef.current) return;
    const first = lastTickRef.current === -1;
    lastTickRef.current = snap.tick;
    if (first) return;
    const now = performance.now();
    const rec = snap.records[snap.records.length - 1];
    if (!rec || rec.t !== snap.tick) return;
    const fx = fxRef.current;
    for (const tr of rec.tr) {
      const c = COINS[tr.coin];
      if (tr.side === "buy") {
        fx.push({ kind: "burst", x: c.x, y: c.y, born: now, life: 1200, color: C.acid, seed: Math.random() });
        fx.push({ kind: "stream", x: c.x, y: c.y, tx: snap.x, ty: snap.y, born: now, life: 1100, color: C.acid });
        fx.push({ kind: "label", x: c.x, y: c.y - 0.2, born: now, life: 2600, color: C.acid, text: `BUY ${c.ticker}`, sub: tr.px.toFixed(4) });
      } else {
        const neg = tr.pnl !== undefined && tr.pnl < 0;
        fx.push({ kind: "burst", x: c.x, y: c.y, born: now, life: 1200, color: neg ? C.danger : C.amber, seed: Math.random() });
        fx.push({ kind: "label", x: c.x, y: c.y - 0.2, born: now + (tr.escape ? 250 : 0), life: 2600, color: neg ? C.danger : C.amber, text: `SELL ${c.ticker}`, sub: tr.pnl !== undefined ? (tr.pnl >= 0 ? "+" : "−") + Math.abs(tr.pnl * 100).toFixed(1) + "%" : "" });
      }
    }
    if (rec.gf) {
      shakeRef.current = now;
      fx.push({ kind: "flash", x: 0, y: 0, born: now, life: 900, color: C.danger });
      fx.push({ kind: "ring", x: snap.x, y: snap.y, born: now, life: 1300, color: C.danger });
      fx.push({ kind: "label", x: snap.x, y: snap.y + 0.2, born: now, life: 3000, color: C.danger, text: "GIANT FIBER", sub: rec.tr.length ? "SOLD ALL" : "ESCAPE" });
    }
    const ev = snap.events[snap.events.length - 1];
    if (ev && ev.t === snap.tick) {
      if (ev.kind === "death") fx.push({ kind: "label", x: snap.x, y: snap.y + 0.2, born: now, life: 4000, color: C.danger, text: ev.cause === "broke" ? "BROKE" : "STARVED", sub: `GEN ${ev.g}` });
      if (ev.kind === "birth") { fx.push({ kind: "hatch", x: 0, y: 0, born: now, life: 1800, color: C.acid }); fx.push({ kind: "label", x: 0, y: 0.2, born: now, life: 3200, color: C.acid, text: `GENERATION ${ev.g}`, sub: "HATCHED" }); }
      if (ev.kind === "high") fx.push({ kind: "label", x: snap.x, y: snap.y - 0.22, born: now + 500, life: 2600, color: C.acid, text: "NEW HIGH", sub: "$" + ev.equity.toFixed(2) });
    }
  }, [snap]);

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const sprites = makeSprites();
    let W = 0, dpr = 1, raf = 0, drawn = -2, dish: HTMLCanvasElement | null = null, glare: HTMLCanvasElement | null = null;
    const parts: Particle[] = [];
    const trail: { x: number; y: number; at: number }[] = [];
    let heading = -Math.PI / 2, lastFrame = performance.now(), lastTrail = 0, visible = true;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(220, Math.floor(r.width));
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(W * dpr);
      canvas.style.width = W + "px"; canvas.style.height = W + "px";
      dish = paintDish(W, dpr); glare = paintGlare(W, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);
    const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; }, { threshold: 0 }); io.observe(wrap);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const curTick = snapRef.current ? snapRef.current.tick : -1;
      if (!visible && drawn === curTick) return;
      drawn = curTick;
      const t = performance.now();
      const dt = Math.min(50, t - lastFrame); lastFrame = t;
      const s = snapRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, W);
      const cx = W / 2, cy = W / 2, R = W * 0.465;
      // screen shake after a Giant Fiber spike
      const sk = t - shakeRef.current;
      if (sk < 380 && !reduce) { const k = (1 - sk / 380) * W * 0.006; ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k); }
      const X = (x: number) => cx + x * R, Y = (y: number) => cy + y * R;
      if (dish) ctx.drawImage(dish, 0, 0, W, W);
      if (!s) { if (glare) ctx.drawImage(glare, 0, 0, W, W); return; }

      const a = still ? 1 : ease((t - s.at) / (TICK_MS * 0.85));
      const alive = s.status === "alive";

      // ---- fly position along a curved flight path ----
      const dx = s.x - s.px, dy = s.y - s.py, dist = Math.sqrt(dx * dx + dy * dy);
      const bend = ((s.tick * 2654435761) >>> 0) % 2 ? 1 : -1;
      const ctrlX = (s.px + s.x) / 2 - dy * 0.45 * bend, ctrlY = (s.py + s.y) / 2 + dx * 0.45 * bend;
      const bez = (p0: number, p1: number, p2: number, u: number) => (1 - u) * (1 - u) * p0 + 2 * (1 - u) * u * p1 + u * u * p2;
      let fx = dist > 0.002 ? bez(s.px, ctrlX, s.x, a) : s.x;
      let fy = dist > 0.002 ? bez(s.py, ctrlY, s.y, a) : s.y;
      const moving = dist > 0.004 && a < 1 && alive && !still;
      const flying = moving ? Math.sin(Math.PI * clamp(a, 0, 1)) * (s.gf ? 1.4 : 1) : 0;
      if (alive && !moving && !reduce && !still) { fx += Math.sin(t / 900) * 0.003; fy += Math.cos(t / 1100) * 0.003; }
      const tgt = COINS[s.target];
      if (moving) {
        const u = clamp(a + 0.02, 0, 1);
        const hx = bez(s.px, ctrlX, s.x, u) - fx, hy = bez(s.py, ctrlY, s.y, u) - fy;
        if (hx * hx + hy * hy > 1e-10) heading = angLerp(heading, Math.atan2(hy, hx), 0.25);
      } else if (alive) {
        heading = angLerp(heading, Math.atan2(tgt.y - fy, tgt.x - fx), 0.02);
      }
      const nearTarget = Math.hypot(tgt.x - s.x, tgt.y - s.y) < 0.12;
      const feeding = alive && s.behavior === "approach" && nearTarget && !moving;
      const headX = fx + Math.cos(heading) * 0.06, headY = fy + Math.sin(heading) * 0.06;

      // ---- scent plumes ----
      if (!still && !reduce) {
        for (let i = 0; i < COINS.length; i++) {
          const sc = s.scent[i] ?? 0;
          const rate = (0.08 + 1.5 * sc * sc * sc) * (dt / 16.7);
          let n = Math.floor(rate) + (Math.random() < rate % 1 ? 1 : 0);
          while (n-- > 0 && parts.length < 650) {
            const ang = Math.random() * Math.PI * 2, sp = 0.0006 + Math.random() * 0.0012;
            parts.push({ x: COINS[i].x + Math.cos(ang) * 0.05, y: COINS[i].y + Math.sin(ang) * 0.05, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 1800 + Math.random() * 2600, coin: i, s: 0.6 + Math.random() * 0.9, tint: Math.round(clamp(s.sweet[i] ?? 0.5, 0, 1) * (SPRITES - 1)) });
          }
        }
      }
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.985, 0, Math.PI * 2); ctx.clip();
      ctx.globalCompositeOperation = "lighter";
      const inhale = alive && (s.behavior === "approach" || feeding);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life > p.max) { parts.splice(i, 1); continue; }
        const k = 0.000035 * dt;
        p.vx += (Math.sin(p.y * 4.1 + t * 0.00035) + Math.sin((p.x + p.y) * 2.3 - t * 0.0002)) * k;
        p.vy += (Math.cos(p.x * 3.7 - t * 0.0003) + Math.cos((p.x - p.y) * 1.9 + t * 0.00045)) * k;
        if (inhale && p.coin === s.target) {
          const ddx = headX - p.x, ddy = headY - p.y, d2 = ddx * ddx + ddy * ddy;
          if (d2 < 0.12) { const f = 0.00006 * dt / Math.max(0.02, Math.sqrt(d2)); p.vx += ddx * f; p.vy += ddy * f; }
          if (d2 < 0.0012) { parts.splice(i, 1); continue; }
        }
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06;
        const rr = p.x * p.x + p.y * p.y;
        const age = p.life / p.max;
        const fade = Math.min(1, p.life / 400) * (1 - age) * (rr > 0.85 ? Math.max(0, (0.97 - rr) / 0.12) : 1);
        if (fade <= 0) continue;
        const size = R * (0.022 + age * 0.065) * p.s;
        ctx.globalAlpha = fade * 0.3;
        ctx.drawImage(sprites[p.tint], X(p.x) - size, Y(p.y) - size, size * 2, size * 2);
      }
      ctx.restore();
      ctx.globalAlpha = 1;

      // ---- flight trail ----
      if (!still && t - lastTrail > 70 && alive) { trail.push({ x: fx, y: fy, at: t }); lastTrail = t; if (trail.length > 90) trail.shift(); }
      ctx.lineCap = "round";
      for (let i = 1; i < trail.length; i++) {
        const age = (t - trail[i].at) / 6000;
        if (age > 1) continue;
        ctx.strokeStyle = `rgba(186,255,53,${(1 - age) * 0.22})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(X(trail[i - 1].x), Y(trail[i - 1].y)); ctx.lineTo(X(trail[i].x), Y(trail[i].y)); ctx.stroke();
      }

      // ---- coins: price ring, droplet, label ----
      const cr = R * 0.075;
      for (let i = 0; i < COINS.length; i++) {
        const c = COINS[i], px = X(c.x), py = Y(c.y);
        const sw = clamp(s.sweet[i] ?? 0.5, 0, 1), col = sweetRGB(sw);
        const isT = alive && s.target === i;
        // price history wrapped around the coin (smoothed so the ring reads as a trend, not noise)
        const raw = s.hist[i] ?? [];
        if (raw.length > 8) {
          const h: number[] = [];
          for (let j = 0; j < raw.length; j++) { let sum = 0, n = 0; for (let q = Math.max(0, j - 4); q <= Math.min(raw.length - 1, j + 4); q++) { sum += raw[q]; n++; } h.push(sum / n); }
          let lo = Infinity, hi = -Infinity;
          for (const v of h) { if (v < lo) lo = v; if (v > hi) hi = v; }
          const span = hi - lo || 1;
          const ringR = (j: number) => cr * 1.55 + ((h[j] - lo) / span - 0.5) * cr * 0.45;
          const ringA = (j: number) => -Math.PI / 2 + (j / (h.length - 1)) * Math.PI * 1.85;
          ctx.strokeStyle = "rgba(146,157,144,0.14)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(px, py, cr * 1.55, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath();
          for (let j = 0; j < h.length; j++) { const qx = px + Math.cos(ringA(j)) * ringR(j), qy = py + Math.sin(ringA(j)) * ringR(j); if (j === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy); }
          const grad = ctx.createConicGradient ? ctx.createConicGradient(-Math.PI / 2, px, py) : null;
          if (grad) { grad.addColorStop(0, rgba(col, 0.05)); grad.addColorStop(0.92, rgba(col, 0.95)); grad.addColorStop(1, rgba(col, 0.95)); ctx.strokeStyle = grad; } else ctx.strokeStyle = rgba(col, 0.8);
          ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.stroke();
          const last = h.length - 1;
          ctx.fillStyle = rgba(col, 1); ctx.beginPath(); ctx.arc(px + Math.cos(ringA(last)) * ringR(last), py + Math.sin(ringA(last)) * ringR(last), 2.4, 0, Math.PI * 2); ctx.fill();
        }
        // target reticle
        if (isT) {
          ctx.save(); ctx.translate(px, py); ctx.rotate(reduce ? 0 : t / 2400);
          ctx.strokeStyle = "rgba(186,255,53,0.8)"; ctx.lineWidth = 1.4;
          for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(0, 0, cr * 2.15, q * Math.PI / 2 + 0.2, q * Math.PI / 2 + 1.1); ctx.stroke(); }
          ctx.restore();
        }
        // droplet
        const pulse = reduce ? 0 : Math.sin(t / 500 + i) * 0.04 * (s.scent[i] ?? 0);
        const r = cr * (1 + pulse);
        const body = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.1, px, py, r);
        body.addColorStop(0, rgba(lerpRGB(col, [255, 255, 255], 0.35), 0.95)); body.addColorStop(0.6, rgba(col, 0.75)); body.addColorStop(1, rgba(lerpRGB(col, [0, 0, 0], 0.55), 0.95));
        ctx.fillStyle = body; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(px - r * 0.3, py - r * 0.38, r * 0.32, r * 0.18, -0.6, 0, Math.PI * 2); ctx.fill();
        // label above upper coins, below lower ones, so it never sits on the ring
        const up = c.y < 0;
        const lx = px, ly = py + (up ? -1 : 1) * cr * 2.75;
        const m = s.emaS[i] ? (s.price[i] - s.emaS[i]) / s.emaS[i] : 0;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const fs = Math.max(9, W * 0.02), fm = Math.max(8, W * 0.0155);
        ctx.fillStyle = isT ? C.ink : "rgba(241,247,235,0.82)"; ctx.font = `800 ${fs}px Manrope, system-ui, sans-serif`;
        ctx.fillText(c.ticker, lx, ly + (up ? -fm * 0.75 : -fm * 0.55));
        ctx.fillStyle = rgba(col, 1); ctx.font = `500 ${fm}px "DM Mono", ui-monospace, monospace`;
        ctx.fillText(`${s.price[i].toFixed(4)} ${m >= 0 ? "+" : "−"}${Math.abs(m * 100).toFixed(1)}%`, lx, ly + (up ? fm * 0.75 : fm * 0.95));
        if (s.qty[i] > 0) {
          const pl = s.cost[i] > 0 ? (s.qty[i] * s.price[i]) / s.cost[i] - 1 : 0;
          chip(ctx, px, py + (up ? 1 : -1) * cr * 2.35, "HELD", pl >= 0 ? C.acid : C.danger, 0.95, Math.max(7, W * 0.0135), (pl >= 0 ? "+" : "−") + Math.abs(pl * 100).toFixed(1) + "%");
        }
      }

      // ---- the fly ----
      const L = R * 0.17 * (1 + flying * 0.12);
      const FX = X(fx), FY = Y(fy);
      if (s.status !== "extinct") {
        // shadow (separates with altitude)
        const off = L * (0.12 + flying * 0.45);
        ctx.save(); ctx.translate(FX + off * 0.6, FY + off); ctx.rotate(heading + Math.PI / 2);
        ctx.fillStyle = `rgba(0,0,0,${0.45 - flying * 0.2})`; ctx.filter = `blur(${2 + flying * 4}px)`;
        ctx.beginPath(); ctx.ellipse(0, L * 0.1, L * 0.22, L * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore(); ctx.filter = "none";
        // energy ring
        if (alive) {
          const e = clamp(s.energy, 0, 1), segs = 24, rad = L * 0.78;
          const low = e < 0.25, blink = low && !reduce ? 0.5 + 0.5 * Math.sin(t / 160) : 1;
          for (let k = 0; k < segs; k++) {
            const a0 = -Math.PI / 2 + (k / segs) * Math.PI * 2 + 0.03, a1 = a0 + (Math.PI * 2) / segs - 0.06;
            const on = k / segs < e;
            ctx.strokeStyle = on ? (e > 0.45 ? `rgba(186,255,53,${0.85 * blink})` : e > 0.25 ? `rgba(255,189,62,${0.9 * blink})` : `rgba(255,89,63,${blink})`) : "rgba(146,157,144,0.18)";
            ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(FX, FY, rad, a0, a1); ctx.stroke();
          }
          if (low) chip(ctx, FX, FY - L * 1.08, "HUNGRY", C.danger, blink, Math.max(7, W * 0.0135));
        }
        ctx.save(); ctx.translate(FX, FY); ctx.rotate(heading + Math.PI / 2);
        drawFly(ctx, L, t, { flying, feeding, grooming: alive && s.behavior === "freeze" && !moving, dead: s.status === "dead", energy: s.energy, sniff: s.signals[0], escape: s.gf ? 1 : 0 }, reduce);
        ctx.restore();
      } else {
        // the lineage ended: an egg waits for midnight
        const pulse = reduce ? 1 : 0.85 + 0.15 * Math.sin(t / 600);
        ctx.fillStyle = "rgba(241,247,235,0.8)"; ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.025 * pulse, R * 0.04 * pulse, 0.4, 0, Math.PI * 2); ctx.fill();
        chip(ctx, cx, cy + R * 0.12, "NEXT EGG 00:00 UTC", C.amber, 0.9, Math.max(7, W * 0.0145));
      }

      // ---- effects ----
      const fxs = fxRef.current;
      for (let i = fxs.length - 1; i >= 0; i--) {
        const e = fxs[i];
        const k = (t - e.born) / e.life;
        if (k >= 1) { fxs.splice(i, 1); continue; }
        if (k < 0) continue;
        const col = hex(e.color);
        if (e.kind === "flash") {
          const vg = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
          vg.addColorStop(0, rgba(col, 0)); vg.addColorStop(1, rgba(col, (1 - k) * 0.35));
          ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
        } else if (e.kind === "ring" && !reduce) {
          for (const off of [0, 0.15, 0.3]) { const kk = k - off; if (kk <= 0) continue; ctx.strokeStyle = rgba(col, (1 - kk) * 0.9); ctx.lineWidth = 2.5 * (1 - kk) + 0.5; ctx.beginPath(); ctx.arc(X(e.x), Y(e.y), R * (0.04 + ease(kk) * 0.5), 0, Math.PI * 2); ctx.stroke(); }
        } else if (e.kind === "hatch" && !reduce) {
          ctx.strokeStyle = rgba(col, (1 - k) * 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R * ease(k) * 0.9, 0, Math.PI * 2); ctx.stroke();
        } else if (e.kind === "burst" && !reduce) {
          ctx.strokeStyle = rgba(col, (1 - k) * 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(e.x), Y(e.y), cr * (1 + ease(k) * 2.4), 0, Math.PI * 2); ctx.stroke();
          ctx.globalCompositeOperation = "lighter";
          for (let q = 0; q < 22; q++) {
            const ang = (q / 22) * Math.PI * 2 + (e.seed ?? 0) * 6, d = cr * (1 + ease(k) * (2 + ((q * 7) % 5) * 0.5));
            ctx.fillStyle = rgba(col, (1 - k) * 0.9); ctx.beginPath(); ctx.arc(X(e.x) + Math.cos(ang) * d, Y(e.y) + Math.sin(ang) * d, 1.8 * (1 - k) + 0.4, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalCompositeOperation = "source-over";
        } else if (e.kind === "stream" && !reduce && e.tx !== undefined && e.ty !== undefined) {
          ctx.globalCompositeOperation = "lighter";
          for (let q = 0; q < 14; q++) {
            const u = clamp(k * 1.6 - q * 0.04, 0, 1);
            if (u <= 0 || u >= 1) continue;
            const qx = e.x + (e.tx - e.x) * ease(u) + Math.sin(q * 1.7 + u * 6) * 0.02, qy = e.y + (e.ty - e.y) * ease(u) + Math.cos(q * 1.3 + u * 6) * 0.02;
            ctx.fillStyle = rgba(col, (1 - u) * 0.9); ctx.beginPath(); ctx.arc(X(qx), Y(qy), 2.2, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalCompositeOperation = "source-over";
        } else if (e.kind === "label" && e.text) {
          const inA = Math.min(1, k * 6), outA = k > 0.75 ? (1 - k) / 0.25 : 1;
          chip(ctx, X(e.x), Y(e.y) - ease(Math.min(1, k * 3)) * R * 0.05, e.text, e.color, inA * outA, Math.max(8, W * 0.017), e.sub);
        }
      }
      if (glare) ctx.drawImage(glare, 0, 0, W, W);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [still]);

  return <div className="tfArena" ref={wrapRef}>
    <canvas ref={canvasRef} role="img" aria-label={label} />
  </div>;
}
