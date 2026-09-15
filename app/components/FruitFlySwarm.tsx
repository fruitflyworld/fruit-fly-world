"use client";

/* ── app/components/FruitFlySwarm.tsx ───────────────────────────────────────
   The swarm. Twenty-four flies, one seeded per cell of the real arena map
   (app/lib/arena.ts), walking orthogonally from cell to cell and drawing the
   world's shape with their trails.

   THIS COMPONENT IS DECORATION. It takes no data, fetches nothing, renders no
   text, and is aria-hidden. Every number on this page is still real — the hero
   raceBanner reads /api/arena, the #world metrics read /api/world. The swarm
   only illustrates them. The one honest link is the `lead` prop: the hero
   already rotates a real experiment and shows its behaviour in .heroDecision,
   so the lead fly simply does what that card says.

   It is deliberately NOT NeuralFly — that component is shared with the launch
   film (npm run film drives it with a deterministic frame prop) and must stay
   bit-identical.
   ------------------------------------------------------------------------- */

import { useEffect, useRef } from "react";
import { CELLS, MAP_COLUMNS, MAP_ROWS, hash32, neighbours } from "../lib/arena";
import type { Behavior } from "../lib/experiment";

const TAU = Math.PI * 2;
const MAX_FLIES = 24;
const TRAIL_MAX = 26;
/** Map units between trail samples. One cell is 1.0, so a full trail spans ~1.4 cells. */
const TRAIL_GAP = 0.055;
const HOVER_R = 0.17;
/** A fly flees when the drifting threat centroid is nearer than this, in map units. */
const THREAT_R = 1.7;
/** Occupancy heat decay per second. */
const DECAY = 0.3;
/** Raster size of the fly atlas. Drawn at 3x the logical box so the eye facets,
 *  bristles and wing veins survive the downscale to the ~46px a regular fly
 *  gets in the hero (the lead one gets ~80px). */
const SPRITE = 192;
/** The logical design box, in the units every path below is authored in. */
const FLY_UNITS = 64;
const SS = SPRITE / FLY_UNITS;

const COLOR: Record<Behavior, string> = {
  APPROACH: "#baff35", AVOID: "#ff593f", EXPLORE: "#7f8c7c", FREEZE: "#ffbd3e"
};
/** Edges walked per second. */
const SPEED: Record<Behavior, number> = { APPROACH: 0.85, AVOID: 1.3, EXPLORE: 0.5, FREEZE: 0 };
/** Perpendicular wobble amplitude, in map units. APPROACH holds a straight line. */
const WANDER: Record<Behavior, number> = { APPROACH: 0.03, AVOID: 0.13, EXPLORE: 0.26, FREEZE: 0 };
const LEAN: Record<Behavior, number> = { APPROACH: 0, AVOID: 0.3, EXPLORE: 0.12, FREEZE: 0 };
const TRAIL_ALPHA: Record<Behavior, number> = { APPROACH: 0.44, AVOID: 0.4, EXPLORE: 0.24, FREEZE: 0.14 };

/** Orthogonal neighbours as cell indices — the walk is edge-legal by construction. */
const NEIGHBOURS: number[][] = CELLS.map((cell) => neighbours(cell).map((n) => CELLS.indexOf(n)));
/** Pseudo-richness per cell. Not real arena data: this layer is ambience. */
const FOOD: number[] = CELLS.map((_, i) => (hash32(`ffw:swarm:food:${i}`) % 1000) / 1000);
const CENTER = CELLS.map((_, i) => ({
  x: (i % MAP_COLUMNS) + 0.5,
  y: Math.floor(i / MAP_COLUMNS) + 0.5
}));

const INSET = {
  hero: { l: 0.05, r: 0.05, t: 0.16, b: 0.16 },
  world: { l: 0.06, r: 0.06, t: 0.16, b: 0.16 }
} as const;

export type SwarmVariant = "hero" | "world";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Walking gait: near-constant speed with a small surge mid-traverse. A
 *  smoothstep on every cell edge put all twenty-four flies into lockstep, and
 *  that metronome — not the frame rate — is what read as mechanical. */
const gait = (t: number) => t - 0.06 * Math.sin(t * TAU);

/* ── the fly, dorsal, macro ──────────────────────────────────────────────────
   Authored from the dorsal anatomy of Drosophila, because the previous shape —
   a tapered oval carrying two flat red discs and six straight constant-width
   lines — read as a mosquito. At forty pixels what carries the species is the
   silhouette: a small head almost filled by two red compound eyes that meet on
   the midline, a bristled scutum, a segmented abdomen, and wings held as a
   blurred fan rather than as two visible ovals.

   The body is drawn once per behaviour colour into an offscreen canvas and then
   blitted; only the wings get their own layer, because only they need to move.
   ------------------------------------------------------------------------- */

/* A macro frame of Drosophila is not a black silhouette. The scutum is an
   olive-grey, the abdomen a warmer bronze, and the key light sitting on the
   upper left is what carries the volume. The behaviour colour stays as a rim,
   but it is no longer the only thing making the insect visible — that, and the
   additive halo it used to sit in, is what turned the swarm into green blobs. */
const CHITIN_RIM = "rgba(206,208,180,.3)";
const EYE_EDGE = "rgba(255,186,150,.28)";

/** Bristles, left side only — the right side is the mirror (x → −x, a → π−a).
 *  Rows follow the real dorsal pattern: acrostichal, dorsocentral, humeral, and
 *  the one large scutellar pair sitting over the abdomen. */
const BRISTLES: [number, number, number, number][] = [
  [1.7, -7.8, 1.98, 2.4], [2.0, -4.8, 1.90, 2.5], [2.2, -2.0, 1.82, 2.3],
  [3.9, -6.4, 2.16, 3.4], [4.3, -3.2, 2.06, 3.7],
  [5.0, -8.8, 2.34, 2.7],
  [3.0, 2.4, 1.42, 4.0]
];

/** attachment → knee → foot, left side. The knee is what stops a leg reading as
 *  a spider's: the femur is heavy and bowed, the tibia half the width. The whole
 *  fan is pulled in tight — at the 46px a regular fly gets on the hero, a leg
 *  that reaches further than the body is wide reads as a scratch, not a limb. */
const LEGS: [number, number, number, number, number, number][] = [
  [3.0, -8.8, 6.2, -12.0, 7.8, -14.8],
  [3.6, -4.4, 7.8, -5.4, 10.2, -7.6],
  [3.4, 0.2, 7.4, 4.4, 9.6, 8.8]
];

function drawLegs(g: CanvasRenderingContext2D) {
  for (const side of [-1, 1]) {
    for (const [ax, ay, kx, ky, fx, fy] of LEGS) {
      const A = [side * ax, ay], K = [side * kx, ky], F = [side * fx, fy];
      // Heavy dark under-stroke, thin lit core: the leg stays legible against a
      // near-black substrate without turning into a bright cartoon line.
      g.strokeStyle = "rgba(6,9,6,.8)";
      g.lineWidth = 1.9;
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(K[0], K[1]); g.stroke();
      g.beginPath(); g.moveTo(K[0], K[1]); g.lineTo(F[0], F[1]); g.stroke();
      g.strokeStyle = "rgba(206,208,178,.42)";
      g.lineWidth = 0.85;
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(K[0], K[1]); g.stroke();
      g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(K[0], K[1]); g.lineTo(F[0], F[1]); g.stroke();
      // tarsus: two short toes, so the foot lands instead of just stopping
      g.lineWidth = 0.42;
      g.beginPath();
      g.moveTo(F[0], F[1]); g.lineTo(F[0] + side * 1.3, F[1] + 1.0);
      g.moveTo(F[0], F[1]); g.lineTo(F[0] - side * 0.2, F[1] + 1.4);
      g.stroke();
      g.fillStyle = "rgba(6,9,6,.8)";
      g.beginPath(); g.arc(K[0], K[1], 0.68, 0, TAU); g.fill();
    }
  }
}

function drawAbdomen(g: CanvasRenderingContext2D, color: string, detail: boolean) {
  const abd = new Path2D();
  abd.moveTo(0, 1.0);
  abd.bezierCurveTo(4.8, 1.4, 5.3, 7.6, 3.9, 14.6);
  abd.bezierCurveTo(2.9, 19.0, 1.5, 21.2, 0, 21.2);
  abd.bezierCurveTo(-1.5, 21.2, -2.9, 19.0, -3.9, 14.6);
  abd.bezierCurveTo(-5.3, 7.6, -4.8, 1.4, 0, 1.0);
  // Curvature: a fly's abdomen is round, so the flanks fall away from a lit
  // ridge running just left of the midline. A flat fill is what makes it look
  // like a decal.
  const fill = g.createLinearGradient(-5.4, -1, 4.2, 22);
  fill.addColorStop(0, "#6a5d40");
  fill.addColorStop(0.36, "#4b412d");
  fill.addColorStop(1, "#1c1810");
  g.fillStyle = fill;
  g.fill(abd);

  g.save();
  g.clip(abd);

  // Tergites. The plate is light and the band is dark — the exact reverse of the
  // previous build, whose bright creases on near-black chitin are why the fly
  // read as a banded beetle rather than as a fly. Four bands, each a soft dark
  // crescent over the posterior edge of its segment, with the raised lip that
  // casts it catching a thin line of light just in front.
  for (const t of [5.4, 9.2, 13.0, 16.6]) {
    const w = 6.4 - t * 0.14;
    const band = g.createLinearGradient(0, t - 2.6, 0, t + 1.4);
    band.addColorStop(0, "rgba(30,25,16,0)");
    band.addColorStop(0.5, "rgba(30,25,16,.56)");
    band.addColorStop(1, "rgba(30,25,16,.05)");
    g.fillStyle = band;
    g.fillRect(-w, t - 3.0, w * 2, 4.8);
    g.strokeStyle = "rgba(232,228,196,.22)";
    g.lineWidth = 0.55;
    g.beginPath();
    g.moveTo(-w * 0.9, t - 2.9);
    g.quadraticCurveTo(0, t - 1.2, w * 0.9, t - 2.9);
    g.stroke();
  }

  // Dorsal sheen down the lit flank — the one long highlight that says the
  // surface is curved rather than printed.
  const sheen = g.createLinearGradient(0, 2, 0, 20);
  sheen.addColorStop(0, "rgba(226,226,196,.14)");
  sheen.addColorStop(0.45, "rgba(226,226,196,.05)");
  sheen.addColorStop(1, "rgba(226,226,196,0)");
  g.fillStyle = sheen;
  g.fillRect(-1.6, 1, 4.4, 20);
  g.restore();

  // Marginal setae along the flanks.
  g.strokeStyle = "rgba(18,16,10,.7)";
  g.lineWidth = 0.45;
  for (const side of [-1, 1]) {
    for (const [mx, my] of [[4.6, 6.4], [4.2, 10.0], [3.4, 13.6], [2.4, 16.8], [1.3, 19.2]]) {
      g.beginPath();
      g.moveTo(side * mx, my);
      g.lineTo(side * (mx + 1.4), my + 1.0);
      g.stroke();
    }
  }

  // Rim: a neutral chitin edge first, then the behaviour colour as a wider,
  // softer gel behind it. The colour is the swarm's only colour coding, so it
  // stays — it just no longer has to carry the whole silhouette.
  g.strokeStyle = CHITIN_RIM;
  g.lineWidth = 0.9;
  g.stroke(abd);
  g.strokeStyle = color;
  g.globalAlpha = 0.34;
  g.lineWidth = 1.9;
  g.stroke(abd);
  g.globalAlpha = 1;

  if (detail) {
    // Fine dorsal pile. Invisible on a 46px fly; it is there for the lead one.
    g.strokeStyle = "rgba(226,226,190,.1)";
    g.lineWidth = 0.22;
    for (let i = 0; i < 90; i++) {
      const a = (i * 2.399963) % TAU;
      const r = Math.sqrt((i % 45) / 45);
      const x = Math.cos(a) * r * 4.2;
      const y = 11 + Math.sin(a) * r * 8.4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 1.1, y + 1.1); g.stroke();
    }
  }
}

function drawThorax(g: CanvasRenderingContext2D, color: string, detail: boolean) {
  const scutum = new Path2D();
  scutum.moveTo(0, -10.6);
  scutum.bezierCurveTo(5.6, -10.6, 6.6, -3.6, 5.1, 2.6);
  scutum.bezierCurveTo(3.4, 4.7, -3.4, 4.7, -5.1, 2.6);
  scutum.bezierCurveTo(-6.6, -3.6, -5.6, -10.6, 0, -10.6);
  // The scutum is the brightest surface on a top-lit fly. The key light sits
  // upper-left on purpose: one consistent light source is most of what makes a
  // drawn insect look photographed.
  const fill = g.createLinearGradient(-5.8, -11, 4.2, 5);
  fill.addColorStop(0, "#646047");
  fill.addColorStop(0.40, "#43412f");
  fill.addColorStop(1, "#191811");
  g.fillStyle = fill;
  g.fill(scutum);

  g.save();
  g.clip(scutum);

  // The three longitudinal stripes — two dorsocentral, one acrostichal — are the
  // species' dorsal signature. They are what a specimen plate uses to say
  // "Drosophila" long before a single bristle resolves.
  for (const s of [-1, 0, 1]) {
    const x = s * 2.5;
    const stripe = g.createLinearGradient(x - 1.3, 0, x + 1.3, 0);
    stripe.addColorStop(0, "rgba(18,16,11,.03)");
    stripe.addColorStop(0.5, "rgba(18,16,11,.6)");
    stripe.addColorStop(1, "rgba(18,16,11,.06)");
    g.fillStyle = stripe;
    g.fillRect(x - 1.3, -12, 2.6, 18);
  }

  // The scutum is the most convex surface on a top-lit fly, so it takes the
  // strongest specular. Without it the thorax is a flat chip.
  const spec = g.createRadialGradient(-1.8, -6.6, 0.3, -1.8, -6.6, 6.6);
  spec.addColorStop(0, "rgba(232,230,196,.26)");
  spec.addColorStop(0.55, "rgba(232,230,196,.07)");
  spec.addColorStop(1, "rgba(232,230,196,0)");
  g.fillStyle = spec;
  g.fillRect(-8, -12, 16, 18);

  if (detail) {
    // Microtrichia: the matte nap that keeps chitin from looking like plastic.
    g.strokeStyle = "rgba(226,226,190,.08)";
    g.lineWidth = 0.2;
    for (let i = 0; i < 120; i++) {
      const a = (i * 2.399963) % TAU;
      const r = Math.sqrt((i % 60) / 60);
      const x = Math.cos(a) * r * 5.0;
      const y = -4.2 + Math.sin(a) * r * 6.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 1.0, y - 0.9); g.stroke();
    }
  }
  g.restore();

  // Bristles: a dark shaft with a lit edge, which is exactly how a seta reads
  // in a macro frame.
  for (const side of [-1, 1]) {
    for (const [bx, by, ba, len] of BRISTLES) {
      const x = side * bx, a = side > 0 ? Math.PI - ba : ba;
      const dx = Math.cos(a) * len, dy = Math.sin(a) * len;
      g.strokeStyle = "rgba(6,9,6,.9)";
      g.lineWidth = 0.95;
      g.beginPath(); g.moveTo(x, by); g.lineTo(x + dx, by + dy); g.stroke();
      g.strokeStyle = "rgba(224,224,192,.62)";
      g.lineWidth = 0.4;
      g.beginPath(); g.moveTo(x, by); g.lineTo(x + dx, by + dy); g.stroke();
    }
  }

  g.strokeStyle = "rgba(208,210,182,.34)";
  g.lineWidth = 0.9;
  g.stroke(scutum);
  g.strokeStyle = color;
  g.globalAlpha = 0.36;
  g.lineWidth = 2.0;
  g.stroke(scutum);
  g.globalAlpha = 1;
}

function drawHead(g: CanvasRenderingContext2D, detail: boolean) {
  // Antennae — short, with a feathered arista. This is the cheapest way to say
  // "fly": a mosquito's are long, and the old sweep read as one.
  for (const side of [-1, 1]) {
    g.save();
    g.translate(side * 1.6, -17.2);
    g.rotate(side * 0.42);
    g.strokeStyle = "rgba(214,216,186,.5)";
    g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -3.0); g.stroke();
    g.strokeStyle = "rgba(214,216,186,.32)";
    g.lineWidth = 0.36;
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.moveTo(0, -2.9 - i * 0.5); g.lineTo(1.35, -3.7 - i * 0.5); g.stroke();
    }
    g.restore();
  }

  // The occiput, so the two eye lobes are seated on a head instead of floating.
  g.fillStyle = "#3b392b";
  g.beginPath(); g.ellipse(0, -13.4, 4.0, 4.6, 0, 0, TAU); g.fill();

  // Compound eyes: the largest single feature on a dorsal fly, and the reason
  // the head reads as a fly's rather than as a beetle's. Two lobes meeting across
  // the midline. Kept dark and narrow — bright red spheres bulging wider than
  // the thorax is a ladybird, and that is exactly what the first pass drew.
  for (const side of [-1, 1]) {
    g.save();
    g.translate(side * 2.5, -13.4);
    g.rotate(side * 0.2);

    const dome = g.createRadialGradient(-1.2, -1.9, 0.4, 0, 0, 5.4);
    dome.addColorStop(0, "#a8542f");
    dome.addColorStop(0.34, "#7d2c17");
    dome.addColorStop(0.72, "#4e160c");
    dome.addColorStop(1, "#220805");
    g.beginPath(); g.ellipse(0, 0, 2.9, 4.5, 0, 0, TAU);
    g.fillStyle = dome; g.fill();

    if (detail) {
      // Ommatidial grain. Below ~60px this resolves to a soft sheen, which is
      // the right failure mode.
      g.fillStyle = "rgba(40,9,5,.4)";
      for (let i = 0; i < 46; i++) {
        const a = i * 2.399963;
        const r = Math.sqrt((i % 23) / 23);
        g.beginPath();
        g.ellipse(Math.cos(a) * r * 2.2, Math.sin(a) * r * 3.7, 0.28, 0.34, 0, 0, TAU);
        g.fill();
      }
    }

    // Specular — the dome is wet, and that highlight is what makes it read as a
    // curved surface rather than a printed circle.
    const spec = g.createRadialGradient(-1.1, -2.1, 0, -1.1, -2.1, 2.1);
    spec.addColorStop(0, "rgba(255,226,200,.5)");
    spec.addColorStop(1, "rgba(255,226,200,0)");
    g.beginPath(); g.ellipse(-1.1, -2.0, 1.25, 1.8, -0.2, 0, TAU);
    g.fillStyle = spec; g.fill();

    // Pseudopupil: the dark spot that tracks the viewer. Nothing else says
    // "compound eye" this cheaply.
    g.beginPath(); g.ellipse(0.45, 0.6, 0.85, 1.5, side * 0.22, 0, TAU);
    g.fillStyle = "rgba(14,4,2,.72)"; g.fill();

    g.strokeStyle = EYE_EDGE;
    g.lineWidth = 0.4;
    g.beginPath(); g.ellipse(0, 0, 2.9, 4.5, 0, 0, TAU); g.stroke();
    g.restore();
  }

  // Frons: the narrow face between the eyes, drawn last so the lobes read as
  // meeting on the midline rather than as one lobe swallowing the other.
  g.strokeStyle = "rgba(214,216,186,.3)";
  g.lineWidth = 0.45;
  g.beginPath(); g.moveTo(0, -17.6); g.lineTo(0, -10.8); g.stroke();
}

function buildSprite(color: string, detail: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE;
  canvas.height = SPRITE;
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  g.translate(SPRITE / 2, SPRITE / 2);
  g.scale(SS, SS);
  g.lineJoin = "round";
  g.lineCap = "round";

  drawLegs(g);
  drawAbdomen(g, color, detail);
  drawThorax(g, color, detail);
  drawHead(g, detail);
  return canvas;
}

function buildWingSprite(tint: string, detail: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE;
  canvas.height = SPRITE;
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  g.translate(SPRITE / 2, SPRITE / 2);
  g.scale(SS, SS);
  g.lineJoin = "round";
  g.lineCap = "round";

  // A wing is not an ellipse. It is narrow where it meets the thorax, widest a
  // third of the way out, and rounded at the tip — and the old ellipse read as a
  // paper aeroplane, while nine pale blades stacked into a grey haze that looked
  // like smoke rather than motion.
  const LEN = 22, HW = 3.6;
  const blade = new Path2D();
  blade.moveTo(0, -HW * 0.46);
  blade.bezierCurveTo(LEN * 0.30, -HW * 1.02, LEN * 0.78, -HW * 0.94, LEN, -HW * 0.12);
  blade.bezierCurveTo(LEN * 1.03, HW * 0.06, LEN * 0.86, HW * 0.74, LEN * 0.50, HW * 0.88);
  blade.bezierCurveTo(LEN * 0.18, HW * 0.99, LEN * 0.05, HW * 0.56, 0, HW * 0.46);
  blade.closePath();

  // The costal margin — the leading edge — is the brightest line on a fly wing.
  const costal = new Path2D();
  costal.moveTo(0, -HW * 0.46);
  costal.bezierCurveTo(LEN * 0.30, -HW * 1.02, LEN * 0.78, -HW * 0.94, LEN, -HW * 0.12);

  const veins = new Path2D();
  veins.moveTo(1.4, -0.1);
  veins.quadraticCurveTo(LEN * 0.55, -HW * 0.34, LEN - 1.5, HW * 0.04);
  veins.moveTo(1.4, 0.3);
  veins.quadraticCurveTo(LEN * 0.50, HW * 0.52, LEN * 0.74, HW * 0.62);
  veins.moveTo(1.4, -0.5);
  veins.quadraticCurveTo(LEN * 0.50, -HW * 0.56, LEN * 0.70, -HW * 0.46);

  // Rest angle and beat arc, in radians off the body's lateral axis. A walking
  // fly holds its wings partly raised and swept back, not out like a glider's;
  // the near-perpendicular fan of the first pass is a large part of why the
  // silhouette read as a moth.
  const A0 = 0.16, A1 = 0.52, BLADES = 6;

  for (const side of [-1, 1]) {
    g.save();
    g.translate(side * 2.9, -4.6);
    g.scale(side, 1);

    // The wingbeat itself. A fly beats ~200 times a second, so a wing is never a
    // shape on screen — it is a wedge of overlapping images. Worse, the sweep is
    // sinusoidal, so the wing dwells at the ends of the arc: a real long exposure
    // shows two dense bands with a thin fill between them, not an even smear.
    // That weighting, not the shape, is what makes this read as a beating wing.
    for (let i = 0; i < BLADES; i++) {
      const u = i / (BLADES - 1);
      const dwell = Math.abs(Math.cos(u * Math.PI)) ** 0.55;
      g.save();
      g.rotate(A0 + (A1 - A0) * u);
      g.fillStyle = `rgba(220,234,255,${0.015 + dwell * 0.032})`;
      g.fill(blade);
      g.restore();
    }

    // The dwell ends are the sharp ones and the middle of the arc is the faint
    // one, which is the right way round: a wing spends most of its time at the
    // turning points, so those are what a long exposure resolves. Outlines on
    // all seven images — and a membrane too thin to join them — is what made the
    // first pass look like a wireframe damselfly.
    for (const u of [0, 1]) {
      g.save();
      g.rotate(A0 + (A1 - A0) * u);
      g.strokeStyle = "rgba(222,236,255,.18)";
      g.lineWidth = 0.4;
      g.stroke(blade);
      g.strokeStyle = "rgba(240,246,255,.28)";
      g.lineWidth = 0.38;
      g.stroke(costal);
      g.restore();
    }

    // One veined image in the middle of the arc carries the venation.
    g.save();
    g.rotate((A0 + A1) / 2);
    if (detail) {
      g.strokeStyle = "rgba(206,224,250,.14)";
      g.lineWidth = 0.3;
      g.stroke(veins);
    }
    // The middle of the arc picks up the behaviour colour, so the blur carries
    // the palette instead of sitting there as neutral white.
    g.strokeStyle = tint;
    g.globalAlpha = 0.09;
    g.lineWidth = 0.5;
    g.stroke(blade);
    g.restore();

    // Haltere: the dumbbell organ a fly uses as a gyroscope, tucked in at the
    // wing base. One pale dot is enough to know it is there.
    g.fillStyle = "rgba(226,226,196,.34)";
    g.beginPath(); g.ellipse(-0.9, 0.5, 0.75, 0.5, 0, 0, TAU); g.fill();
    g.restore();
  }
  return canvas;
}

/** A bloom, not a firework. The old gradient started at 33% alpha and covered
 *  nearly twice the fly's own size, which is why the swarm read as a field of
 *  green sparks rather than as insects on a substrate. Down at 12% and inside
 *  the body it just lifts the chitin off the dark field, which is all it is for. */
function buildGlow(color: string): HTMLCanvasElement {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `${color}1f`);
  grad.addColorStop(0.35, `${color}0d`);
  grad.addColorStop(1, `${color}00`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return canvas;
}

type Fly = {
  index: number;
  rnd: () => number;
  behavior: Behavior;
  cell: number;
  target: number;
  hold: number;
  t: number;
  fx: number; fy: number;
  tx: number; ty: number;
  /** Unit perpendicular to the current edge — the wobble axis. */
  nx: number; ny: number;
  x: number; y: number;
  heading: number;
  phase: number;
  trail: Float32Array;
  head: number;
  len: number;
};

function makeFly(index: number): Fly {
  const rnd = mulberry32(hash32(`ffw:swarm:fly:${index}`));
  const center = CENTER[index];
  return {
    index, rnd, behavior: "EXPLORE", cell: index, target: index, hold: 0, t: 0,
    fx: center.x, fy: center.y, tx: center.x, ty: center.y, nx: 0, ny: 0, x: center.x, y: center.y,
    heading: rnd() * TAU, phase: rnd() * TAU,
    trail: new Float32Array(TRAIL_MAX * 2), head: 0, len: 0
  };
}

export default function FruitFlySwarm({ variant = "hero", lead }: { variant?: SwarmVariant; lead?: Behavior }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const leadRef = useRef<Behavior | undefined>(lead);
  leadRef.current = lead;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Narrowed aliases: the closures below outlive the guard above.
    const el: HTMLCanvasElement = canvas;
    const g2d: CanvasRenderingContext2D = ctx;

    const flies: Fly[] = Array.from({ length: MAX_FLIES }, (_, i) => makeFly(i));
    const occupancy = new Float32Array(MAX_FLIES);
    const sprites: Record<Behavior, HTMLCanvasElement> = {
      APPROACH: buildSprite(COLOR.APPROACH, false),
      AVOID: buildSprite(COLOR.AVOID, false),
      EXPLORE: buildSprite(COLOR.EXPLORE, false),
      FREEZE: buildSprite(COLOR.FREEZE, false)
    };
    const leadSprite = buildSprite("#eaffd0", true);
    // Wings live on their own layer because they are the only part of the fly
    // that moves frame to frame; the body is static once it is rasterised.
    const wingSprites: Record<Behavior, HTMLCanvasElement> = {
      APPROACH: buildWingSprite(COLOR.APPROACH, false),
      AVOID: buildWingSprite(COLOR.AVOID, false),
      EXPLORE: buildWingSprite(COLOR.EXPLORE, false),
      FREEZE: buildWingSprite(COLOR.FREEZE, false)
    };
    const leadWings = buildWingSprite("#eaffd0", true);
    const glows: Record<Behavior, HTMLCanvasElement> = {
      APPROACH: buildGlow(COLOR.APPROACH),
      AVOID: buildGlow(COLOR.AVOID),
      EXPLORE: buildGlow(COLOR.EXPLORE),
      FREEZE: buildGlow(COLOR.FREEZE)
    };

    let count = MAX_FLIES;
    let scale = 40;
    let ox = 0;
    let oy = 0;
    let cssWidth = 0;
    let cssHeight = 0;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    let running = false;
    let raf = 0;
    let last = 0;
    let time = 0;

    const threat = { x: 3, y: 2 };

    /* ── simulation ─────────────────────────────────────────────────────── */

    function pushTrail(fly: Fly, x: number, y: number) {
      fly.trail[fly.head * 2] = x;
      fly.trail[fly.head * 2 + 1] = y;
      fly.head = (fly.head + 1) % TRAIL_MAX;
      if (fly.len < TRAIL_MAX) fly.len += 1;
    }

    function applyBehavior(fly: Fly, behavior: Behavior) {
      const from = CENTER[fly.cell];
      fly.behavior = behavior;
      fly.t = 0;
      // Start the next edge wherever the fly actually is, so a hover never snaps
      // back to the cell centre.
      fly.fx = fly.x;
      fly.fy = fly.y;

      if (behavior === "FREEZE") {
        fly.hold = 1.4 + fly.rnd() * 1.6;
        fly.target = fly.cell;
        fly.tx = from.x;
        fly.ty = from.y;
        return;
      }

      const options = NEIGHBOURS[fly.cell];
      let next = options[0];
      if (behavior === "APPROACH") {
        for (const candidate of options) if (FOOD[candidate] > FOOD[next]) next = candidate;
      } else if (behavior === "AVOID") {
        const far = (i: number) => Math.hypot(CENTER[i].x - threat.x, CENTER[i].y - threat.y);
        for (const candidate of options) if (far(candidate) > far(next)) next = candidate;
      } else {
        next = options[Math.floor(fly.rnd() * options.length)];
      }
      fly.target = next;
      fly.tx = CENTER[next].x;
      fly.ty = CENTER[next].y;
      // Perpendicular to the cell-to-cell axis, exactly unit length.
      fly.nx = -(CENTER[next].y - from.y);
      fly.ny = CENTER[next].x - from.x;
    }

    function decide(fly: Fly, forced?: Behavior) {
      const forcedNow = fly.index === 0 ? forced : undefined;
      let behavior: Behavior;
      if (forcedNow) {
        behavior = forcedNow;
      } else {
        const at = CENTER[fly.cell];
        const danger = Math.hypot(at.x - threat.x, at.y - threat.y) < THREAT_R;
        const roll = fly.rnd();
        if (danger) behavior = "AVOID";
        else if (FOOD[fly.cell] > 0.62) behavior = "APPROACH";
        else if (roll < 0.55) behavior = "EXPLORE";
        else behavior = "FREEZE";
      }
      applyBehavior(fly, behavior);
    }

    function step(dt: number, now: number, forced?: Behavior) {
      threat.x = 3 + 2.2 * Math.sin(now * 0.157);
      threat.y = 2 + 1.4 * Math.sin(now * 0.211 + 1.3);
      for (let i = 0; i < MAX_FLIES; i++) occupancy[i] *= Math.exp(-dt * DECAY);

      for (let f = 0; f < count; f++) {
        const fly = flies[f];
        if (fly.behavior === "FREEZE") {
          fly.hold -= dt;
          if (fly.hold <= 0) decide(fly, forced);
          const at = CENTER[fly.cell];
          fly.x = at.x + HOVER_R * Math.cos(now * 1.6 + fly.phase);
          fly.y = at.y + HOVER_R * Math.sin(now * 1.9 + fly.phase * 1.7);
          // Station-keeping, not a pirouette. The old constant spin had the fly
          // rotating on the spot for as long as it held position.
          fly.heading += Math.sin(now * 1.1 + fly.phase) * dt * 0.5;
          continue;
        }

        fly.t += dt * SPEED[fly.behavior];
        if (fly.t >= 1) {
          fly.cell = fly.target;
          pushTrail(fly, fly.tx, fly.ty);
          occupancy[fly.cell] = Math.min(1, occupancy[fly.cell] + 0.55);
          decide(fly, forced);
          continue;
        }

        const e = gait(fly.t);
        // A slow sine gives the path its turn; the fast term is the small
        // correction an insect is always making. Without it the walk is a
        // curve, and no animal walks a curve.
        const w = Math.sin(fly.phase + fly.t * TAU) * WANDER[fly.behavior]
          + Math.sin(now * 11 + fly.phase * 3.1) * 0.02;
        const px = fly.x;
        const py = fly.y;
        fly.x = fly.fx + (fly.tx - fly.fx) * e + fly.nx * w;
        fly.y = fly.fy + (fly.ty - fly.fy) * e + fly.ny * w;
        // Turn toward the new heading instead of snapping to it: a fly pivots,
        // it does not teleport. Snapping also jittered the sprite rotation.
        const want = Math.atan2(fly.y - py, fly.x - px) + LEAN[fly.behavior];
        let turn = want - fly.heading;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        fly.heading += turn * Math.min(1, dt * 12);

        if (fly.len === 0) {
          pushTrail(fly, fly.x, fly.y);
        } else {
          const at = ((fly.head - 1 + TRAIL_MAX) % TRAIL_MAX) * 2;
          if (Math.hypot(fly.x - fly.trail[at], fly.y - fly.trail[at + 1]) > TRAIL_GAP) {
            pushTrail(fly, fly.x, fly.y);
          }
        }
      }
    }

    /* ── projection ─────────────────────────────────────────────────────── */

    function project(x: number, y: number) {
      return { px: ox + x * scale, py: oy + y * scale };
    }

    function resize() {
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * ratio));
      const h = Math.max(1, Math.round(rect.height * ratio));
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
      }
      cssWidth = rect.width;
      cssHeight = rect.height;
      g2d.setTransform(ratio, 0, 0, ratio, 0, 0);

      count = cssWidth <= 650 ? 12 : cssWidth <= 980 ? (variant === "world" ? 16 : 18) : MAX_FLIES;

      const inset = INSET[variant];
      const boxW = cssWidth * (1 - inset.l - inset.r);
      const boxH = cssHeight * (1 - inset.t - inset.b);
      scale = Math.min(boxW / MAP_COLUMNS, boxH / MAP_ROWS);
      ox = cssWidth * inset.l + (boxW - scale * MAP_COLUMNS) / 2;
      oy = cssHeight * inset.t + (boxH - scale * MAP_ROWS) / 2;
    }

    /* ── render ─────────────────────────────────────────────────────────── */

    function render(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const backdrop = ctx.createRadialGradient(
        ox + scale * MAP_COLUMNS / 2, oy + scale * MAP_ROWS / 2, 0,
        ox + scale * MAP_COLUMNS / 2, oy + scale * MAP_ROWS / 2, Math.max(cssWidth, cssHeight) * 0.55
      );
      backdrop.addColorStop(0, "rgba(186,255,53,.055)");
      backdrop.addColorStop(1, "rgba(186,255,53,0)");
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      // Radar rings, for continuity with the old specimen chrome.
      ctx.strokeStyle = "rgba(186,255,53,.07)";
      ctx.lineWidth = 1;
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.arc(ox + scale * MAP_COLUMNS / 2, oy + scale * MAP_ROWS / 2, scale * 1.4 * r, 0, TAU);
        ctx.stroke();
      }

      // The world: the real 24-cell arena map, drawn, with occupancy heat.
      const gap = Math.min(4, scale * 0.06);
      ctx.lineWidth = 1;
      for (let i = 0; i < MAX_FLIES; i++) {
        const col = i % MAP_COLUMNS;
        const row = Math.floor(i / MAP_COLUMNS);
        const x = ox + col * scale;
        const y = oy + row * scale;
        const heat = Math.min(0.16, occupancy[i] * 0.16);
        if (heat > 0.002) {
          ctx.fillStyle = `rgba(186,255,53,${heat})`;
          ctx.fillRect(x + gap, y + gap, scale - gap * 2, scale - gap * 2);
        }
        ctx.strokeStyle = "rgba(186,255,53,.11)";
        ctx.strokeRect(x + gap + 0.5, y + gap + 0.5, scale - gap * 2 - 1, scale - gap * 2 - 1);
      }

      if (scale > 46) {
        ctx.fillStyle = "rgba(186,255,53,.34)";
        ctx.font = `${Math.round(Math.min(11, scale * 0.13))}px "DM Mono",monospace`;
        ctx.textBaseline = "top";
        for (let i = 0; i < MAX_FLIES; i++) {
          const { px, py } = project((i % MAP_COLUMNS) + 0.5, Math.floor(i / MAP_COLUMNS) + 0.5);
          ctx.fillText(CELLS[i], px - scale * 0.42, py - scale * 0.42);
        }
      }

      // Where the flies are fleeing from.
      const tp = project(threat.x, threat.y);
      ctx.strokeStyle = "rgba(255,89,63,.2)";
      ctx.beginPath();
      ctx.arc(tp.px, tp.py, THREAT_R * scale, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,89,63,.35)";
      ctx.beginPath();
      ctx.arc(tp.px, tp.py, 2, 0, TAU);
      ctx.fill();

      // Glow pass, additive.
      ctx.globalCompositeOperation = "lighter";
      for (let f = 0; f < count; f++) {
        const fly = flies[f];
        const { px, py } = project(fly.x, fly.y);
        const g = glows[fly.behavior];
        const size = scale * (f === 0 && variant === "hero" ? 0.75 : 0.38);
        ctx.drawImage(g, px - size / 2, py - size / 2, size, size);
      }
      ctx.globalCompositeOperation = "source-over";

      // Trails.
      ctx.lineCap = "round";
      for (let f = 0; f < count; f++) {
        const fly = flies[f];
        if (fly.len < 3) continue;
        const alpha = TRAIL_ALPHA[fly.behavior];
        const color = COLOR[fly.behavior];
        for (const pass of [0, 1]) {
          const tail = pass === 0 ? fly.len : Math.min(7, fly.len);
          ctx.beginPath();
          for (let n = 0; n < tail; n++) {
            const idx = (fly.head - fly.len + (fly.len - tail) + n + TRAIL_MAX * 2) % TRAIL_MAX;
            const { px, py } = project(fly.trail[idx * 2], fly.trail[idx * 2 + 1]);
            if (n === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = color;
          // A plotted line, not a slime trail: the two-pass draw used to lay
          // down 1.8px at 85% alpha, and at the hero's cell size that beat the
          // fly itself for attention.
          ctx.globalAlpha = pass === 0 ? alpha * 0.45 : Math.min(0.72, alpha * 1.25);
          ctx.lineWidth = pass === 0 ? 0.7 : 1.25;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Flies and their wingbeat.
      for (let f = 0; f < count; f++) {
        const fly = flies[f];
        const isLead = f === 0 && variant === "hero";
        const { px, py } = project(fly.x, fly.y);
        const k = Math.max(0.14, (scale * 0.44) / FLY_UNITS) * (isLead ? 1.75 : 1);
        const color = COLOR[fly.behavior];

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(fly.heading + Math.PI / 2);
        ctx.scale(k, k);

        // The wings are a baked blur, so the only motion they need per frame is
        // a fast, shallow flicker. A wing that beats two hundred times a second
        // has no shape on screen; a smudge whose opacity breathes is what reads
        // as alive, and it costs one drawImage. Kept shallow — the old 0.6→1.0
        // swing was slow enough to read as a wing that blinks.
        ctx.globalAlpha = 0.82 + 0.18 * Math.abs(Math.sin(now * 43 + fly.phase));
        ctx.drawImage(isLead ? leadWings : wingSprites[fly.behavior], -FLY_UNITS / 2, -FLY_UNITS / 2, FLY_UNITS, FLY_UNITS);
        ctx.globalAlpha = 1;

        if (isLead) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8 / k;
          ctx.drawImage(leadSprite, -FLY_UNITS / 2, -FLY_UNITS / 2, FLY_UNITS, FLY_UNITS);
          ctx.shadowBlur = 0;
        } else {
          ctx.drawImage(sprites[fly.behavior], -FLY_UNITS / 2, -FLY_UNITS / 2, FLY_UNITS, FLY_UNITS);
        }
        ctx.restore();
      }

      // Shallow depth of field. A frame this close has almost no depth of field,
      // and letting the substrate fall away at the edges is most of what makes
      // the field read as photographed rather than drawn.
      const mcx = ox + scale * MAP_COLUMNS / 2;
      const mcy = oy + scale * MAP_ROWS / 2;
      const dof = ctx.createRadialGradient(
        mcx, mcy, Math.min(cssWidth, cssHeight) * 0.2,
        mcx, mcy, Math.max(cssWidth, cssHeight) * 0.75
      );
      dof.addColorStop(0, "rgba(4,7,4,0)");
      dof.addColorStop(0.6, "rgba(4,7,4,.3)");
      dof.addColorStop(1, "rgba(4,7,4,.8)");
      ctx.fillStyle = dof;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
    }

    /* ── lifecycle ──────────────────────────────────────────────────────── */

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      time += dt;
      step(dt, time, leadRef.current);
      render(time);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    }

    let reducedDrawn = false;
    function sync() {
      resize();
      if (!reduced) {
        if (visible && !document.hidden) start();
        else stop();
        return;
      }
      if (reducedDrawn) {
        render(time);
        return;
      }
      // One deterministic frame, well past the startup transient, and no rAF:
      // the CSS kill-switch at globals.css cannot reach canvas motion.
      reducedDrawn = true;
      for (let i = 0; i < 360; i++) {
        time += 1 / 60;
        step(1 / 60, time, leadRef.current);
      }
      render(time);
    }

    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        sync();
      },
      { rootMargin: "120px", threshold: 0 }
    );
    intersectionObserver.observe(canvas);
    const onVisibility = () => sync();
    document.addEventListener("visibilitychange", onVisibility);

    sync();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={variant === "world" ? "swarmCanvas swarmCanvas--world" : "swarmCanvas"}
      aria-hidden="true"
    />
  );
}
