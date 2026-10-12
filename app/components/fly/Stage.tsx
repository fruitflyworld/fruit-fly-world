"use client";

// Stage — the live instrument: dish + corner readouts + circuit + sealed chain.
// Reads one story left to right, top to bottom: it smells → it decides → it acts → it is sealed.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bi } from "../Bi";
import { COINS } from "../../lib/market/tape";
import { tickClock } from "../../lib/market/fly";
import { fmtPct, fmtUsd } from "../../lib/market/diary";
import Arena from "./Arena";
import BrainPanel from "./BrainPanel";
import { useLiveFly } from "./LiveFly";
import { replayHref } from "./Widgets";

const BEH: Record<string, string> = {
  approach: "APPROACH → BUY", avoid: "AVOID → SELL",
  explore: "EXPLORE", freeze: "FREEZE → HOLD", dead: "DEAD",
};

function Meter({ v, tone = "acid" }: { v: number; tone?: "acid" | "danger" | "amber" }) {
  return <em className={`tfMeter t-${tone}`}><i style={{ width: `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%` }} /></em>;
}

function Thinks() {
  const { snap } = useLiveFly();
  if (!snap) return null;
  const alive = snap.status === "alive";
  const coin = COINS[snap.target].ticker;
  const b = snap.gf ? "gf" : snap.behavior;
  return <div className={`tfThinks b-${b}`} key={snap.tick}>
    <span className="tfHudK"><Bi en={`WHAT IT SENSES · #${snap.tick}`}  /></span>
    {alive ? <>
      <div className="tfThinkRow"><span><Bi en="Smells"  /> <b>{coin}</b></span><Meter v={snap.signals[0]} /><b className="tfNum">{snap.signals[0].toFixed(2)}</b></div>
      <div className="tfThinkRow"><span><Bi en="Threat"  /></span><Meter v={snap.signals[1]} tone="danger" /><b className="tfNum">{snap.signals[1].toFixed(2)}</b></div>
      <div className="tfThinkRow"><span><Bi en="Hunger"  /></span><Meter v={snap.hunger} tone="amber" /><b className="tfNum">{snap.hunger.toFixed(2)}</b></div>
      <div className="tfThinkOut"><span>→</span><b>{snap.gf ? <Bi en="GIANT FIBER → ESCAPE"  /> : <Bi en={BEH[snap.behavior]}  />}</b><em className="tfNum">{Math.round(snap.confidence * 100)}%</em></div>
    </> : <p className="tfThinkDead"><Bi en={snap.status === "extinct" ? "Lineage ended. A new egg hatches at 00:00 UTC." : "Dead. The next generation is about to hatch."}  /></p>}
  </div>;
}

function Clock() {
  const { snap } = useLiveFly();
  return <div className="tfHudClock">
    <span className="tfLiveDot"><i /> LIVE</span>
    <b className="tfNum">{snap ? tickClock(snap.tick) : "--:--:--"}</b>
    <span className="tfHudK">UTC · <Bi en={`SEASON ${snap?.season ?? "–"} · PAPER`}  /></span>
  </div>;
}

function Wallet() {
  const { snap } = useLiveFly();
  if (!snap) return null;
  const ch = snap.eq / snap.startEq - 1;
  return <div className="tfHudWallet">
    <span className="tfHudK"><Bi en={`WALLET · GEN ${snap.gen}`}  /></span>
    <b className="tfNum">{fmtUsd(snap.eq)}</b>
    <span className={`tfNum ${ch >= 0 ? "tfUp" : "tfDown"}`}>{fmtPct(ch)} <Bi en="today"  /></span>
    <span className="tfHudFed"><Bi en="FED"  /> <Meter v={snap.energy} tone={snap.energy > 0.45 ? "acid" : snap.energy > 0.25 ? "amber" : "danger"} /> <b className="tfNum">{Math.round(snap.energy * 100)}%</b></span>
  </div>;
}

function Sealed() {
  const { snap } = useLiveFly();
  if (!snap) return null;
  return <Link className="tfHudSealed" href={replayHref(snap.slug, snap.season, snap.tick)} prefetch={false} key={snap.tick}>
    <span className="tfHudK"><Bi en={`SEALED #${snap.tick}`}  /></span>
    <b className="tfMono">{snap.chain}</b>
    <span className="tfHudK"><Bi en="replay this tick ↗"  /></span>
  </Link>;
}

/** The opening moment: your browser replays today from midnight. It always runs at least
 *  ~1.6 s as a time-lapse (counter and clock run up to now), then fades away. */
function ReplayOverlay() {
  const { snap, progress, preview } = useLiveFly();
  const [shown, setShown] = useState({ tick: 0, gone: false, fading: false });
  const start = useRef<number | null>(null);
  const goalRef = useRef(0);
  goalRef.current = snap ? snap.tick : preview?.goal ?? 0;
  const ready = !!snap && progress >= 1;
  const readyRef = useRef(ready);
  readyRef.current = ready;
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown({ tick: 0, gone: true, fading: true }); return; }
    let raf = 0;
    const loop = (t: number) => {
      if (start.current === null) start.current = t;
      const k = Math.min(1, (t - start.current) / 1600);
      const e = 1 - Math.pow(1 - k, 3);
      setShown((v) => ({ ...v, tick: Math.round(goalRef.current * e) }));
      if (k >= 1 && readyRef.current) {
        setShown((v) => ({ ...v, fading: true }));
        setTimeout(() => setShown((v) => ({ ...v, gone: true })), 700);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (shown.gone) return null;
  const pct = goalRef.current ? Math.round((shown.tick / goalRef.current) * 100) : Math.round(progress * 100);
  return <div className={`tfReplayOverlay${shown.fading ? " out" : ""}`} aria-live="polite">
    <span className="tfHudK"><Bi en="YOUR BROWSER IS REPLAYING TODAY"  /></span>
    <b className="tfNum">{tickClock(shown.tick)}</b>
    <span className="tfMono">#{shown.tick.toLocaleString("en-US")} · {shown.fading && snap ? <Bi en={`chain ${snap.chain}`}  /> : <Bi en="hashing every tick…"  />}</span>
    <i><em style={{ width: `${pct}%` }} /></i>
    <small><Bi en="Same rules + same seed = the same day. Nothing is streamed to you but the rules."  /></small>
  </div>;
}

export function ChainRibbon({ max = 6 }: { max?: number }) {
  const { snap } = useLiveFly();
  if (!snap) return <div className="tfChain tfChainEmpty"><span className="tfHudK">SEALED CHAIN</span></div>;
  const recs = snap.records.slice(-max);
  return <div className="tfChain" aria-label="The latest sealed ticks">
    <span className="tfHudK tfChainK"><Bi en="SEALED CHAIN"  /></span>
    <div className="tfChainTrack">
      {recs.map((r, i) => <Link key={r.t} href={replayHref(snap.slug, snap.season, r.t)} prefetch={false} className={`tfBlock b-${r.gf ? "gf" : r.b}${i === recs.length - 1 ? " newest" : ""}${r.tr.length ? " traded" : ""}`}>
        <span className="tfNum">#{r.t}</span>
        <b className="tfMono">{r.hash}</b>
        <small>{r.gf ? "GF · ESCAPE" : r.tr.length ? r.tr.map((x) => `${x.side} ${COINS[x.coin].ticker}`).join(" · ") : r.b}</small>
      </Link>)}
    </div>
  </div>;
}

export default function Stage({ label }: { label?: string }) {
  return <div className="tfStage">
    <div className="tfStageDish">
      <Arena label={label} />
      <div className="tfHud tl"><Thinks /></div>
      <div className="tfHud tr"><Clock /></div>
      <div className="tfHud bl"><Wallet /></div>
      <div className="tfHud br"><Sealed /></div>
      <ReplayOverlay />
    </div>
    <BrainPanel />
    <ChainRibbon />
  </div>;
}
