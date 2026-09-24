// exam-replay.test.ts — the server-side grader.
// Guards: (1) the vendored world.js in public/play/js is importable and at
// the pinned WORLD_VERSION; (2) a replay of seed 42 matches the production-
// verified numbers; (3) the route grades a correct claim "match" and a
// tampered claim "mismatch".
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

type World = typeof import("../public/play/js/world.js");
let worldP: Promise<World> | null = null;
const world = () => {
  // interop: under tsx the ESM namespace may arrive wrapped in `default`
  worldP ??= import(pathToFileURL(join(process.cwd(), "public", "play", "js", "world.js")).href)
    .then((m) => {
      const w = (m as unknown as World & { runLineage?: unknown }).runLineage
        ? (m as unknown as World)
        : ((m as { default?: unknown }).default as unknown as World);
      if (typeof w.runLineage !== "function") throw new Error("world.js did not export runLineage");
      return w;
    });
  return worldP;
};

test("vendored world.js is at dish/3", async () => {
  const w = await world();
  assert.equal(w.WORLD_VERSION, "dish/3");
});

test("replay of seed 42 (judgment, 3 gens) matches production-verified totals", async () => {
  const w = await world();
  const gens = await w.runLineage({ seed: 42, brain: "judgment", gens: 3 });
  assert.equal(gens.reduce((a: number, g: { eggs: number }) => a + g.eggs, 0), 34);
  const circuit = await w.runLineage({ seed: 42, brain: "circuit", gens: 3 });
  assert.equal(circuit.reduce((a: number, g: { eggs: number }) => a + g.eggs, 0), 5);
});

test("replays are deterministic within this process", async () => {
  const w = await world();
  const a = await w.runLineage({ seed: 7, brain: "judgment", gens: 2 });
  const b = await w.runLineage({ seed: 7, brain: "judgment", gens: 2 });
  assert.deepEqual(a.map((g: { logHash: string }) => g.logHash), b.map((g: { logHash: string }) => g.logHash));
});

test("route: correct claim grades match, tampered claim grades mismatch", async () => {
  const w = await world();
  const routeMod = await import("../app/api/exam/replay/route.js");
  const POST = ((routeMod as { POST?: unknown }).POST ?? (routeMod as { default?: { POST?: unknown } }).default?.POST) as unknown as (req: Request) => Promise<Response>;
  const full = await w.runLineage({ seed: 42, brain: "judgment", gens: 2 });
  // a claim carries only the sealed fields, not the full decision log
  const gens = full.map((g: { gen: unknown; eggs: unknown; rivalEggs: unknown; survived: unknown; deathReason: unknown; decisions: unknown; logHash: unknown }) => ({
    gen: g.gen, eggs: g.eggs, rivalEggs: g.rivalEggs, survived: g.survived,
    deathReason: g.deathReason, decisions: g.decisions, logHash: g.logHash,
  }));
  const req = (body: unknown) =>
    new Request("http://x/api/exam/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const okRes = await POST(req({ seed: 42, brain: "judgment", gens: 2, claim: { gens } }));
  const ok = await okRes.json();
  assert.equal(ok.claim.verdict, "match");

  const lie = gens.map((g) => ({ ...g, eggs: Number(g.eggs) + 5 }));
  const badRes = await POST(req({ seed: 42, brain: "judgment", gens: 2, claim: { gens: lie } }));
  const bad = await badRes.json();
  assert.equal(bad.claim.verdict, "mismatch");
  assert.ok(bad.claim.diffs.some((d: string) => d.includes("eggs")));
});

test("route: rejects bad input without running the world", async () => {
  const routeMod = await import("../app/api/exam/replay/route.js");
  const POST = ((routeMod as { POST?: unknown }).POST ?? (routeMod as { default?: { POST?: unknown } }).default?.POST) as unknown as (req: Request) => Promise<Response>;
  const req = (body: unknown) =>
    new Request("http://x/api/exam/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const badSeed = await POST(req({ seed: -1, brain: "judgment", gens: 2 }));
  assert.equal(badSeed.status, 400);
  const badBrain = await POST(req({ seed: 1, brain: "oracle", gens: 2 }));
  assert.equal(badBrain.status, 400);
  const badGens = await POST(req({ seed: 1, brain: "circuit", gens: 99 }));
  assert.equal(badGens.status, 400);
});
