// race-core.ts — the pure rules of the weekly race. No DB, no server-only
// imports, so tests can pin them.
//
// The fairness protocol mirrors the WeeklyRace contract:
//   1. COMMIT — before the cutoff, an entrant locks brain + a sha256
//      commitment of their draft-preference policy.
//   2. DRAW — after the cutoff, the exam seed is derived from an Ethereum
//      block mined after the cutoff (public, verifiable, unknowable before).
//   3. REVEAL — entrants publish the policy; sha256 must match the commitment.
//   4. GRADE — the server replays every revealed entry with the same seed via
//      the vendored world.js and ranks by eggs.
import { createHash } from "node:crypto";

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

export function commitmentOf(week: number, policy: RacePolicy): string {
  return "0x" + createHash("sha256").update(canonicalPolicyJson(week, policy)).digest("hex");
}

/** The deterministic draft policy the server replays: pick the offered card
 *  with the earliest preference index, else the first card. */
export function policyFn(policy: RacePolicy) {
  return (cards: string[]): string => {
    let best = cards[0];
    let bestIdx = Number.MAX_SAFE_INTEGER;
    for (const c of cards) {
      const i = policy.preference.indexOf(c);
      if (i >= 0 && i < bestIdx) {
        bestIdx = i;
        best = c;
      }
    }
    return best;
  };
}

// ---- EIP-191 sign payloads ----

export function commitMessage(week: number, brain: string, commitment: string): string {
  return `Fruit Fly World — weekly race commit\nweek: ${week}\nbrain: ${brain}\ncommitment: ${commitment}\nthis locks my exam entry; the policy reveal comes after the draw`;
}

export function revealMessage(week: number, commitment: string): string {
  return `Fruit Fly World — weekly race reveal\nweek: ${week}\ncommitment: ${commitment}\nthis publishes my committed policy for grading`;
}

// ---- ranking ----

export type GradeInput = {
  entrant: string;
  eggs: number; // total eggs across generations — primary
  survivedGens: number; // how many generations the fly outlived — tiebreak 1
  createdAt: number; // commit timestamp — earliest wins ties, like the arena
};

export function rankEntries<T extends GradeInput>(entries: T[]): (T & { rank: number })[] {
  const sorted = [...entries].sort(
    (a, b) => b.eggs - a.eggs || b.survivedGens - a.survivedGens || a.createdAt - b.createdAt,
  );
  return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
}

// ---- draw seed ----

/** Same FNV-1a-over-hash family as /api/beacon, so the race seed and the
 *  exam-room beacon seed derive identically from a block hash. */
export function seedFromBlockHash(hash: string): number {
  let h = 0x811c9dc5;
  for (let i = 2; i < hash.length; i++) {
    h ^= hash.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function normalizeAddress(a: string): string {
  return a.trim().toLowerCase();
}

export function isAddressLike(a: unknown): a is string {
  return typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a.trim());
}
