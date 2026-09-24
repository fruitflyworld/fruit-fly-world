// race-core.ts — the pure rules of the weekly race. No DB, no server-only
// imports, so tests can pin them.
//
// The browser-shared half (weeks, canonical policy, sign messages) lives in
// app/lib/race-shared.ts so the race page never imports server code; this
// file re-exports it and adds the node-crypto commitment.
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
import {
  canonicalPolicyJson,
  commitMessage,
  phaseOf,
  revealMessage,
  weekBounds,
  weekOf,
  type Phase,
  type RaceBrain,
  type RacePolicy,
  DRAW_WINDOW_SECONDS,
  RACE_BRAINS,
  RACE_GENS,
  WEEK_SECONDS,
} from "../race-shared";

export {
  canonicalPolicyJson, commitMessage, revealMessage,
  weekOf, weekBounds, phaseOf,
  DRAW_WINDOW_SECONDS, RACE_BRAINS, RACE_GENS, WEEK_SECONDS,
};
export type { Phase, RaceBrain, RacePolicy };

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
