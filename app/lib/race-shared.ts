// race-shared.ts — the weekly-race rules that BOTH the server and the browser
// need, with zero environment-specific imports (no node:crypto, no server-only)
// so the commitment the wallet signs is byte-for-byte the one the server
// re-derives. race-core.ts re-exports everything here; keep them in sync by
// importing only from one side per surface.

export const WEEK_SECONDS = 604_800; // 7 days, epoch-aligned
export const DRAW_WINDOW_SECONDS = 86_400; // the last 24h of a week: draw + reveal
export const RACE_GENS = 3;
export const RACE_BRAINS = ["genes", "circuit", "judgment"] as const;
export type RaceBrain = (typeof RACE_BRAINS)[number];

export function weekOf(tsMs: number): number {
  return Math.floor(tsMs / 1000 / WEEK_SECONDS);
}

export function weekBounds(week: number): { startMs: number; cutoffMs: number; endMs: number } {
  const startMs = week * WEEK_SECONDS * 1000;
  return { startMs, cutoffMs: startMs + (WEEK_SECONDS - DRAW_WINDOW_SECONDS) * 1000, endMs: startMs + WEEK_SECONDS * 1000 };
}

export type Phase = "commit" | "reveal" | "closed";

export function phaseOf(nowMs: number, week: number): Phase {
  const { cutoffMs, endMs } = weekBounds(week);
  if (nowMs < cutoffMs) return "commit";
  if (nowMs < endMs) return "reveal";
  return "closed";
}

// ---- commitment ----

/** Trait ids in priority order; at each draft, the offered card ranked
 *  earliest in this list is picked; if none is listed, the first card. */
export type RacePolicy = { brain: RaceBrain; preference: string[] };

/** Canonical JSON — key-sorted, no whitespace — so the sha256 is stable
 *  across runtimes and the commitment binds the exact policy. */
export function canonicalPolicyJson(week: number, policy: RacePolicy): string {
  const sorted = [...policy.preference].sort();
  return JSON.stringify({ brain: policy.brain, preference: sorted, week });
}

// ---- EIP-191 sign payloads (shown in the wallet prompt verbatim) ----

export function commitMessage(week: number, brain: string, commitment: string): string {
  return `Fruit Fly World — weekly race commit\nweek: ${week}\nbrain: ${brain}\ncommitment: ${commitment}\nthis locks my exam entry; the policy reveal comes after the draw`;
}

export function revealMessage(week: number, commitment: string): string {
  return `Fruit Fly World — weekly race reveal\nweek: ${week}\ncommitment: ${commitment}\nthis publishes my committed policy for grading`;
}

/** WebCrypto twin of the server's commitmentOf — same canonical bytes, same
 *  sha256. Pinned against the node version in tests/race-ui-parity.test.ts so
 *  a browser commitment can never silently drift from what /api/race/commit
 *  re-derives. */
export async function commitmentOfWeb(week: number, policy: RacePolicy): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalPolicyJson(week, policy));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return "0x" + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- the mutation menu entrants rank ----
// Mirrors TRAIT_INFO in public/play/js/sim.js (ids must match exactly — pinned
// by tests/race-ui-parity.test.ts). English-only on purpose: the race page is
// the English surface; the game itself carries the bilingual trait cards.

export type TraitCard = { id: string; name: string; good: string; cost: string; rarity: "common" | "rare" | "epic" };

export const RACE_TRAITS: TraitCard[] = [
  { id: "white", name: "white eyes", good: "sense +25%", cost: "night sense penalty ×2", rarity: "common" },
  { id: "curly", name: "curly wings", good: "speed +18%", cost: "metabolism +15%", rarity: "common" },
  { id: "ebony", name: "ebony body", good: "predator damage −30%", cost: "sense −12%", rarity: "common" },
  { id: "fecund", name: "fecund", good: "egg cost −22%", cost: "post-lay odor 2 s", rarity: "common" },
  { id: "swift", name: "swift", good: "dash cooldown −30%", cost: "dash cost +40%", rarity: "common" },
  { id: "hardy", name: "hardy", good: "metabolism −16%", cost: "speed −8%", rarity: "common" },
  { id: "nocturnal", name: "nocturnal", good: "no night sense penalty", cost: "—", rarity: "common" },
  { id: "shaker", name: "shaker", good: "+40% speed for 1.5 s after a GF escape", cost: "—", rarity: "common" },
  { id: "forager", name: "forager", good: "food energy +35%", cost: "−18% speed for 1 s after eating", rarity: "common" },
  { id: "thrift", name: "thrift", good: "rot no longer exposes you", cost: "—", rarity: "common" },
  { id: "tiger", name: "tiger stripes", good: "bite knocks back and stuns the predator (8 s)", cost: "—", rarity: "common" },
  { id: "giant", name: "giant", good: "energy cap +60, GF triggers easier", cost: "speed −15%", rarity: "common" },
  { id: "sitter", name: "sitter", good: "food respawns in place, eating +25%", cost: "speed −10%", rarity: "rare" },
  { id: "rover", name: "rover", good: "speed +10%, food sense +20%", cost: "metabolism +12%", rarity: "rare" },
  { id: "diapause", name: "diapause", good: "below 30 energy: metabolism −60%, predator interest −50%", cost: "speed −40%, no jump", rarity: "rare" },
  { id: "adh", name: "alcohol dehydrogenase", good: "rot no odor + 4 s drunk sprint (+25%)", cost: "sluggish turning while drunk", rarity: "rare" },
  { id: "phototax", name: "phototaxis", good: "metabolism −30% in light", cost: "drawn to lights at night", rarity: "rare" },
  { id: "pheromone", name: "pheromone", good: "sense the wild type laying; +50% its food for 3 s", cost: "your lays broadcast too", rarity: "rare" },
  { id: "clock", name: "clock", good: "day metabolism −20%", cost: "night metabolism +20%, sense −10%", rarity: "rare" },
  { id: "vestigial", name: "vestigial wings", good: "energy cap +60, metabolism −10%", cost: "GF jump −40%", rarity: "rare" },
  { id: "mimic", name: "mimic", good: "still & slow = the predator loses you (day)", cost: "energy still drains", rarity: "epic" },
  { id: "hopper", name: "hopper", good: "manual full-quality jump at any moment", cost: "cost ×1.5, cooldown +50%", rarity: "epic" },
  { id: "cannibal", name: "cannibal", good: "drain 2 energy/s near the wild type", cost: "you smell while feeding", rarity: "epic" },
  { id: "guard", name: "egg guard", good: "near your eggs the predator targets the wild type", cost: "passing predator can eat your eggs", rarity: "epic" },
];
