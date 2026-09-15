"use client";

import { useEffect, useState } from "react";

type Standing = { address: string | null; lane: string | null; exact: number | null; entries: number };
type Winner = { address?: string; exact?: number } | null;
type Feed = { window: { epoch: number; secondsLeft: number }; standing: Standing; lastWinner: Winner };

const short = (value: string | null | undefined) => (value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—");
const clock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(Math.max(0, sec % 60)).padStart(2, "0")}`;

/** The window this page is describing, read live. The document pages state the rules as
 *  constants; this strip is the proof they are running right now. */
export default function ArenaClock() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [left, setLeft] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/arena", { cache: "no-store" });
        const body = await response.json();
        if (!alive) return;
        if (!body.enabled) { setFailed(true); return; }
        setFeed({ window: body.window, standing: body.standing, lastWinner: body.lastWinner });
        setLeft(body.window.secondsLeft);
      } catch { if (alive) setFailed(true); }
    };
    load();
    const poll = setInterval(load, 30_000);
    const tick = setInterval(() => setLeft((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(tick); };
  }, []);

  const cells = [
    ["WINDOW EPOCH", "窗口轮次", feed ? String(feed.window.epoch) : "—"],
    ["CLOSES IN", "距关门", feed ? clock(left) : "—"],
    ["ENTRIES THIS WINDOW", "本窗条目", feed ? String(feed.standing.entries) : "—"],
    ["CURRENT LEADER", "当前领先", feed?.standing.address ? `${short(feed.standing.address)} · ${feed.standing.exact ?? "—"}` : "—"],
    ["LAST WINNER", "上窗赢家", feed?.lastWinner ? `${short(feed.lastWinner.address)} · ${feed.lastWinner.exact ?? "—"}` : "—"]
  ] as const;

  return <section className="docClock" aria-label="Live window">
    <div className="docClockPulse"><i/>{failed ? "ARENA OFFLINE" : "LIVE FROM /api/arena"}</div>
    <div className="docClockGrid">{cells.map(([en, zh, value]) => <div key={en}><span><b className="biEn">{en}</b><b className="biZh">{zh}</b></span><strong>{value}</strong></div>)}</div>
  </section>;
}
