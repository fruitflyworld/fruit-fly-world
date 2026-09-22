/* ── app/lib/dish.ts ─────────────────────────────────────────────────────────
   DISH quests — the game-gated freemint (v1, client-attested).

   The four quests a fly can complete in the dish. Each is verified against a
   small evidence object the game records at generation end (or the bench
   records on an IDENTICAL double run). v1 trusts the client log — the
   Passport is soul-bound and free, so the prize for forging one is a badge
   you cannot sell. v2 will re-simulate the run server-side.
   ------------------------------------------------------------------------- */

export const DISH_QUESTS = ["SURVIVOR", "FORAGER", "REFLEX", "EXAMINED"] as const;
export type DishQuest = (typeof DISH_QUESTS)[number];

export type DishEvidence = {
  quest: string;
  gen: number;
  eggs: number;
  rivalEggs: number;
  survived: boolean;
  deathReason: string;
  escapes: number;
  brain: { id: string; model?: string | null };
  decisions: number;
  seed?: number;
  gens?: number;
  identical?: boolean;
  ts: number;
};

const BRAIN_IDS = ["manual", "genes", "circuit", "judgment"];
const DEATH_REASONS = ["time", "energy", "predator"];

function num(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid quest evidence");
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Validates one evidence object and returns which quest (if any) it proves. */
export function verifyDishEvidence(input: unknown): DishQuest {
  if (!input || typeof input !== "object") throw new Error("Quest evidence is required");
  const e = input as Record<string, unknown>;
  const quest = e.quest;
  if (typeof quest !== "string" || !(DISH_QUESTS as readonly string[]).includes(quest)) throw new Error("Unknown quest");

  const gen = num(e.gen, 1, 999);
  const eggs = num(e.eggs, 0, 999);
  num(e.rivalEggs, 0, 999); // sanity only
  const escapes = num(e.escapes, 0, 99);
  const decisions = num(e.decisions, 0, 2000);
  num(e.ts, 0, 4_102_444_800_000); // 2100 — recorded, not trusted as proof
  const survived = e.survived === true;
  const deathReason = typeof e.deathReason === "string" && DEATH_REASONS.includes(e.deathReason) ? e.deathReason : "";
  const brainId = typeof e.brain === "object" && e.brain !== null && BRAIN_IDS.includes((e.brain as { id?: unknown }).id as string)
    ? (e.brain as { id: string }).id : null;
  if (!brainId) throw new Error("Unknown brain");
  if (survived && deathReason !== "time") throw new Error("A survived generation ends on time, not on a death");

  if (quest === "SURVIVOR") {
    if (!survived) throw new Error("SURVIVOR requires surviving the full generation");
  } else if (quest === "FORAGER") {
    if (eggs < 3) throw new Error("FORAGER requires 3 or more eggs in one generation");
  } else if (quest === "REFLEX") {
    if (escapes < 3) throw new Error("REFLEX requires 3 Giant Fiber escapes in one generation");
  } else {
    // EXAMINED: the exam room ran the same seed twice and every hash matched
    const identical = e.identical === true;
    const seed = num(e.seed, 0, 4_294_967_295);
    const gens = num(e.gens, 2, 8);
    if (!identical) throw new Error("EXAMINED requires an IDENTICAL double run");
    if (e.gens === undefined && e.seed === undefined) throw new Error("EXAMINED requires the exam seed");
    void seed; void gens;
  }

  void gen; void decisions;
  return quest as DishQuest;
}

/** Canonical JSON for the evidence hash — key order is fixed by construction. */
export function dishEvidenceHash(evidence: DishEvidence, sha256: (data: string) => string): string {
  const canonical = JSON.stringify({
    quest: evidence.quest, gen: evidence.gen, eggs: evidence.eggs, rivalEggs: evidence.rivalEggs,
    survived: evidence.survived, deathReason: evidence.deathReason, escapes: evidence.escapes,
    brainId: evidence.brain?.id, brainModel: evidence.brain?.model || null,
    decisions: evidence.decisions, seed: evidence.seed ?? null, gens: evidence.gens ?? null,
    identical: evidence.identical === true, ts: evidence.ts
  });
  return sha256(canonical);
}
