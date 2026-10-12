// diary.ts — the fly's bragging, written from sealed events only.
//
// Every line is built from a FlyEvent the engine recorded, and every number in
// it carries the tick it came from, so the page can put a replay link next to
// it. The fly may brag; it may not invent. (A language-model writer can replace
// these templates later, under the same rule: numbers come from events, never
// from the writer.)

import type { FlyEvent } from "./engine";
import { COINS } from "./tape";
import { tickClock } from "./fly";

export type Tone = "brag" | "loss" | "life" | "trade";

export interface DiaryLine {
  t: number;
  g: number;
  tone: Tone;
  en: string;
  /** Ticks this line's numbers come from (first is the main one). */
  ticks: number[];
}

export const fmtPx = (n: number) => (n >= 10 ? n.toFixed(2) : n >= 1 ? n.toFixed(3) : n.toFixed(4));
export const fmtUsd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtPct = (f: number) => (f >= 0 ? "+" : "−") + Math.abs(f * 100).toFixed(1) + "%";

/** Pick a phrasing from the tick, so the same event always reads the same way. */
const pick = <T,>(t: number, xs: T[]) => xs[t % xs.length];

export function diaryLine(ev: FlyEvent): DiaryLine | null {
  const coin = ev.coin !== undefined ? COINS[ev.coin].ticker : "";
  const clock = tickClock(ev.t);
  switch (ev.kind) {
    case "buy": {
      const px = fmtPx(ev.px ?? 0);
      const en = pick(ev.t, [
        `Landed on ${coin} at ${px}. It smelled like volume.`,
        `${coin} smelled sweet. Took a bite at ${px}.`,
        `Followed the scent to ${coin}. In at ${px}.`,
        `Crowd forming on ${coin}. Bought at ${px}.`,
        `Couldn't resist ${coin} at ${px}.`,
      ]);
      return { t: ev.t, g: ev.g, tone: "trade", ticks: [ev.t], en };
    }
    case "sell": {
      const pnl = ev.pnl ?? 0;
      const ticks = ev.openedAt !== undefined && ev.openedAt >= 0 ? [ev.t, ev.openedAt] : [ev.t];
      if (pnl >= 0.02) return {
        t: ev.t, g: ev.g, tone: "brag", ticks,
        en: `Smelled ${coin} before anyone. Out at ${fmtPx(ev.px ?? 0)}, ${fmtPct(pnl)}. Don't believe me? Replay it.`,
      };
      if (pnl >= 0) return {
        t: ev.t, g: ev.g, tone: "trade", ticks,
        en: `Took ${fmtPct(pnl)} off ${coin} and left before it turned.`,
      };
      return {
        t: ev.t, g: ev.g, tone: "loss", ticks,
        en: `${coin} went bitter. Out at ${fmtPx(ev.px ?? 0)}, ${fmtPct(pnl)}. That one is on the record too.`,
      };
    }
    case "escape": {
      const en = pick(ev.t, [
        `Something big was falling. My Giant Fiber fired at ${clock} and I sold everything.`,
        `${clock}: a shadow overhead. Giant Fiber fired, sold it all, flew.`,
        `Felt the drop before it landed. Escape reflex at ${clock}, all out.`,
      ]);
      return { t: ev.t, g: ev.g, tone: "brag", ticks: [ev.t], en };
    }
    case "high":
      return {
        t: ev.t, g: ev.g, tone: "brag", ticks: [ev.t],
        en: `New high: ${fmtUsd(ev.equity)}. Every cent of it replays.`,
      };
    case "death":
      return ev.cause === "broke" ? {
        t: ev.t, g: ev.g, tone: "life", ticks: [ev.t],
        en: `Generation ${ev.g} went broke at ${clock} with ${fmtUsd(ev.equity)} left.`,
      } : {
        t: ev.t, g: ev.g, tone: "life", ticks: [ev.t],
        en: `Generation ${ev.g} starved at ${clock}. The fees dried up and nobody fed me.`,
      };
    case "birth":
      if (ev.g === 1) return {
        t: ev.t, g: ev.g, tone: "life", ticks: [ev.t],
        en: `Hatched at ${clock} with ${fmtUsd(ev.equity)} of paper money. Let's eat.`,
      };
      return {
        t: ev.t, g: ev.g, tone: "life", ticks: [ev.t],
        en: `Generation ${ev.g} hatched at ${clock} and inherited ${fmtUsd(ev.equity)}.`,
      };
    case "extinct":
      return {
        t: ev.t, g: ev.g, tone: "life", ticks: [ev.t],
        en: `The lineage ran out of estate at ${clock}. A new egg hatches at midnight UTC.`,
      };
  }
  return null;
}

/** Newest first; buys are folded away when there are louder lines to show. */
export function diaryFrom(events: FlyEvent[], limit = 24, includeBuys = false): DiaryLine[] {
  const out: DiaryLine[] = [];
  for (let i = events.length - 1; i >= 0 && out.length < limit; i--) {
    const ev = events[i];
    if (ev.kind === "buy" && !includeBuys) continue;
    const line = diaryLine(ev);
    if (line) out.push(line);
  }
  return out;
}
