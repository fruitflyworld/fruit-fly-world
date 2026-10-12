/* ── app/lib/anchors.ts ──────────────────────────────────────────────────────
   The daily anchor: one chain head per closed UTC day, written on chain as a memo.

   This module is the shared half — the memo format, the manifest loader and the
   recomputation — used by the page at /anchors, by scripts/anchor.ts (which
   writes an entry) and by scripts/verify-anchor.ts (which checks one).

   The rule it enforces: an entry exists only after the transaction confirmed, and
   the head it claims must equal the head this repository's code produces for that
   day. A manifest that disagrees with the code is a bug, not an edit.
   --------------------------------------------------------------------------- */

import manifest from "../../anchors/anchors.json";
import { FLAGSHIP, runTo, seasonDate, TICKS_PER_SEASON } from "./market/fly";

export interface Anchor {
  /** Season number (one season = one UTC day). */
  season: number;
  /** YYYY-MM-DD, the day the season covers. */
  date: string;
  /** The last tick of that day — always the final tick of the season. */
  lastTick: number;
  /** The chain head at that tick, as sealed by the season's record format. */
  chainHash: string;
  /** Record format that produced it: market/1 or market/2. */
  worldVersion: string;
  /** The memo transaction, as confirmed on chain. */
  tx: string;
  /** Which chain the memo lives on ("solana" or "solana-devnet"). */
  chain: string;
  /** When the transaction was confirmed (ISO 8601, UTC). */
  anchoredAt: string;
}

export const ANCHORS: Anchor[] = manifest.anchors as Anchor[];
export const MEMO_VERSION = manifest.memoVersion;

export const LAST_TICK_OF_SEASON = TICKS_PER_SEASON - 1;

/** The memo text for a season's head. This exact string is what goes on chain. */
export function memoFor(season: number, chainHash: string): string {
  return `ffw:${MEMO_VERSION}|${season}|${seasonDate(season)}|${LAST_TICK_OF_SEASON}|${chainHash}`;
}

export interface ParsedMemo {
  version: number;
  season: number;
  date: string;
  lastTick: number;
  chainHash: string;
}

/** Parse a memo back. Returns null for anything that is not one of ours. */
export function parseMemo(text: string): ParsedMemo | null {
  const m = /^ffw:(\d+)\|(\d+)\|(\d{4}-\d{2}-\d{2})\|(\d+)\|([0-9a-f]{8,64})$/.exec(text.trim());
  if (!m) return null;
  const [, version, season, date, lastTick, chainHash] = m;
  return { version: Number(version), season: Number(season), date, lastTick: Number(lastTick), chainHash };
}

export interface Recompute {
  season: number;
  date: string;
  lastTick: number;
  chainHash: string;
  worldVersion: string;
}

/**
 * Recompute a day's head from this repository's code — the only honest way to
 * check an anchor. Note `runTo` refuses to run past the season's last tick.
 */
export function recomputeDay(season: number): Recompute {
  const run = runTo(FLAGSHIP, season, LAST_TICK_OF_SEASON);
  return {
    season,
    date: seasonDate(season),
    lastTick: LAST_TICK_OF_SEASON,
    chainHash: run.chain,
    worldVersion: run.run.runner.version
  };
}

export interface AnchorCheck extends Anchor {
  ok: boolean;
  recomputed: string;
  /** What the chain said, when the caller asked for a chain check. */
  onChain?: string;
  problem?: string;
}

/** Check every anchor in the manifest against the code. No network. */
export function checkManifest(anchors: Anchor[] = ANCHORS): AnchorCheck[] {
  return anchors.map((anchor) => {
    const recomputed = recomputeDay(anchor.season);
    const problems: string[] = [];
    if (recomputed.chainHash !== anchor.chainHash) problems.push("hash differs from a local replay");
    if (recomputed.date !== anchor.date) problems.push(`date is ${recomputed.date}`);
    if (recomputed.lastTick !== anchor.lastTick) problems.push(`last tick is ${recomputed.lastTick}`);
    if (recomputed.worldVersion !== anchor.worldVersion) problems.push(`format is ${recomputed.worldVersion}`);
    return { ...anchor, ok: problems.length === 0, recomputed: recomputed.chainHash, problem: problems.join("; ") || undefined };
  });
}

/** A public explorer link for a memo transaction, per chain. */
export function explorerUrl(chain: string, tx: string): string {
  return chain === "solana-devnet"
    ? `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    : `https://explorer.solana.com/tx/${tx}`;
}
