/* ── app/lib/arena-reply.ts ─────────────────────────────────────────────────
   Reading the answer back.

   Step 01 hands the task to a model; step 02 used to offer nothing but the map,
   so the loop the site advertises — copy the task out, paste the answer back —
   had no return path. This is that path, kept pure so it can be tested without a
   browser and so the panel never becomes the place parsing policy lives.

   WHAT IT ACCEPTS
   A model is not an API. It answers with a JSON object, or with the label pair
   the brief's own signing format already reserves (`Route: …` / `Signals: …`),
   or with three paragraphs of reasoning that happen to name six stations. The
   first two are read as CLAIMS and held to the rule: a route that is not a walk
   is a wrong answer and is reported as one. Only free prose is read leniently,
   as the longest legal walk it happens to contain.

   WHAT IT DELIBERATELY DOES NOT DO
   It does not invent signals. If the answer did not carry a complete station
   table for the route it named, `signals` is null and the panel fills each
   station the way a tap does. Passing off made-up numbers as the model's would
   make the score a claim about text that never said it.

   The legality rule is not restated for the caller: the panel runs
   validateRoute() on the way out, the same function the server recomputes with.
   What is checked here is only whether a candidate is a walk at all, so a
   genuinely wrong answer can be told apart from an answer in an odd shape.
   ------------------------------------------------------------------------- */
import { ARENA_STEPS, CELLS, isAdjacent } from "./arena";
import type { Signals } from "./experiment";

export const REPLY_KEYS = ["food", "threat", "light", "novelty"] as const;

/** Where the route was found, so the panel can say what it just read. */
export type ReplySource = "json" | "labels" | "cells";
export type ReplyRead = { route: string[]; signals: Signals[] | null; source: ReplySource };

const STATIONS = "F-01 to F-24";

/** `F-4`, `f-04`, `F_04` → `F-04`. Anything not on the published map → null. */
function cellOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^f[-_ ]?(\d{1,2})$/i.exec(value.trim());
  if (!match) return null;
  const cell = `F-${match[1].padStart(2, "0")}`;
  return CELLS.includes(cell) ? cell : null;
}

/** Every station name mentioned in free text, in order. Prose around a route is
 *  noise, so non-names are dropped rather than treated as a malformed route. */
function cellsIn(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/F[-_ ]?\d{1,2}/gi)) {
    const cell = cellOf(match[0]);
    if (cell) out.push(cell);
  }
  return out;
}

/** A claimed route: the stations it named, and the tokens it named that are not
 *  stations on this map. The dropped ones matter — they are how a route meant for
 *  a different map announces itself instead of quietly sliding into a shorter one. */
type Claim = { cells: string[]; dropped: string[] };

function claimOf(value: unknown): Claim {
  if (typeof value === "string") return { cells: cellsIn(value), dropped: [] };
  if (!Array.isArray(value)) return { cells: [], dropped: [describe(value)] };
  const cells: string[] = [];
  const dropped: string[] = [];
  for (const item of value) {
    const cell = cellOf(item);
    if (cell) cells.push(cell);
    else dropped.push(describe(item));
  }
  return { cells, dropped };
}

function describe(value: unknown): string {
  if (typeof value === "string") return value.trim() || "an empty entry";
  if (value === undefined || value === null) return String(value);
  return JSON.stringify(value);
}

/** The claim as one walk, or nothing. */
function asWalk(claim: Claim): string[] | null {
  if (claim.dropped.length > 0) return null;
  const { cells } = claim;
  if (cells.length < 1 || cells.length > ARENA_STEPS) return null;
  for (let i = 1; i < cells.length; i++) {
    if (!isAdjacent(cells[i - 1], cells[i])) return null;
  }
  return cells;
}

/** Why a claim is not a walk, in the same words validateRoute() would use. */
function whyNot(claim: Claim): string {
  if (claim.dropped.length > 0) {
    const verb = claim.dropped.length === 1 ? "is not a station" : "are not stations";
    return `The answer names ${claim.dropped.join(", ")}, which ${verb} on this map (${STATIONS}).`;
  }
  const { cells } = claim;
  if (cells.length === 0) return `The answer names no stations from this map (${STATIONS}).`;
  if (cells.length > ARENA_STEPS) {
    return `The answer gives ${cells.length} stations; a route is at most ${ARENA_STEPS}.`;
  }
  for (let i = 1; i < cells.length; i++) {
    if (!isAdjacent(cells[i - 1], cells[i])) {
      return `${cells[i - 1]} and ${cells[i]} are not neighbours on the map.`;
    }
  }
  return `That is not a route of up to ${ARENA_STEPS} connected cells.`;
}

/** The longest connected run inside a longer list, capped at ARENA_STEPS. Used
 *  where the answer is prose: the best walk it contains is the answer. */
function longestWalk(cells: string[]): string[] {
  let best: string[] = [];
  for (let start = 0; start < cells.length; start++) {
    let end = start;
    while (end + 1 - start < ARENA_STEPS && end + 1 < cells.length && isAdjacent(cells[end], cells[end + 1])) end++;
    if (end + 1 - start > best.length) best = cells.slice(start, end + 1);
  }
  return best;
}

/** One station's four numbers, from `{food,threat,light,novelty}` or `[f,t,l,n]`.
 *  Numbers arrive as numbers from JSON and as strings from `food=70`. */
function quadOf(value: unknown): Signals | null {
  if (Array.isArray(value)) {
    if (value.length !== 4) return null;
    return quadOf({ food: value[0], threat: value[1], light: value[2], novelty: value[3] });
  }
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const out = {} as Signals;
  for (const key of REPLY_KEYS) {
    const raw = row[key];
    const number = typeof raw === "string" ? Number(raw.trim() || NaN) : raw;
    if (typeof number !== "number" || !Number.isFinite(number) || number < 0 || number > 100) return null;
    out[key] = number;
  }
  return out;
}

/** A complete station table for a route of `want` cells, or nothing. A partial
 *  table is refused on purpose: half the numbers is a different answer. */
function quadsOf(value: unknown, want: number): Signals[] | null {
  if (!Array.isArray(value) || value.length !== want) return null;
  const out: Signals[] = [];
  for (const row of value) {
    const quad = quadOf(row);
    if (!quad) return null;
    out.push(quad);
  }
  return out;
}

/** `food=70,threat=10,light=40,novelty=80`, once per station, in route order. */
function quadsInText(text: string, want: number): Signals[] | null {
  const pairs: { key: keyof Signals; value: number }[] = [];
  for (const match of text.matchAll(/(food|threat|light|novelty)\s*[=:]\s*(-?[\d.]+)/gi)) {
    pairs.push({ key: match[1].toLowerCase() as keyof Signals, value: Number(match[2]) });
  }
  if (pairs.length !== want * REPLY_KEYS.length) return null;
  const out: Signals[] = [];
  for (let station = 0; station < want; station++) {
    const chunk = pairs.slice(station * REPLY_KEYS.length, station * REPLY_KEYS.length + REPLY_KEYS.length);
    const quad = {} as Signals;
    const seen = new Set<keyof Signals>();
    for (const { key, value } of chunk) {
      if (seen.has(key)) return null;
      seen.add(key);
      quad[key] = value;
    }
    const checked = quadOf(quad);
    if (!checked) return null;
    out.push(checked);
  }
  return out;
}

function signalsBeside(text: string, value: unknown, want: number): Signals[] | null {
  return quadsOf(value, want) ?? quadsInText(text, want);
}

/** The route a JSON object claims, whatever key it used. Null when the answer is
 *  JSON but names no route at all — an echoed brief, say, which is not an answer. */
const ROUTE_KEYS = ["route", "cells", "path"] as const;
const SIGNAL_KEYS = ["signals", "plan"] as const;

function jsonClaim(text: string): { claim: Claim; signals: unknown } | null {
  const trimmed = text.trim();
  const bodies = /^[[{]/.test(trimmed) ? [trimmed] : [];
  const open = text.indexOf("{");
  const close = text.lastIndexOf("}");
  if (open >= 0 && close > open) bodies.push(text.slice(open, close + 1));

  for (const body of bodies) {
    let data: unknown;
    try { data = JSON.parse(body); } catch { continue; }
    // Models wrap the object in an array often enough to be worth unwrapping; a
    // bare array of station names is a route, so that reading stays on the list.
    const wrapped = Array.isArray(data)
      ? data.find((item) => item && typeof item === "object" && !Array.isArray(item)
        && ROUTE_KEYS.some((name) => name in item))
      : null;
    const records = [
      ...(wrapped ? [wrapped as Record<string, unknown>] : []),
      (data && typeof data === "object" && !Array.isArray(data)) ? data as Record<string, unknown> : { route: data }
    ];
    for (const record of records) {
      const key = ROUTE_KEYS.find((name) => name in record);
      if (key === undefined) continue;
      const signalKey = SIGNAL_KEYS.find((name) => name in record);
      return { claim: claimOf(record[key]), signals: signalKey === undefined ? undefined : record[signalKey] };
    }
  }
  return null;
}

export function parseRouteReply(text: string): ReplyRead | { error: string } {
  const raw = typeof text === "string" ? text : "";
  if (!raw.trim()) return { error: "Nothing has been pasted yet." };

  const json = jsonClaim(raw);
  if (json) {
    const route = asWalk(json.claim);
    if (!route) return { error: whyNot(json.claim) };
    return { route, signals: signalsBeside(raw, json.signals, route.length), source: "json" };
  }

  const labeled = /^[ \t]*route[ \t]*[:=][ \t]*(.+)$/im.exec(raw);
  if (labeled) {
    const claim = claimOf(labeled[1]);
    const route = asWalk(claim);
    if (route) return { route, signals: signalsBeside(raw, undefined, route.length), source: "labels" };
    // A label with no station names after it is the template echoed back, not a
    // wrong answer — keep reading the rest of the text.
    if (claim.cells.length > 0 || claim.dropped.length > 0) return { error: whyNot(claim) };
  }

  const mentioned = cellsIn(raw);
  if (mentioned.length === 0) {
    return { error: `No stations in that answer. Send a line like Route: F-04,F-05,F-11, or paste the reply as it came. Stations run ${STATIONS}.` };
  }
  const route = longestWalk(mentioned);
  return { route, signals: signalsBeside(raw, undefined, route.length), source: "cells" };
}
