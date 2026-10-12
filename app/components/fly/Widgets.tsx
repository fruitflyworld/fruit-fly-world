"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bi } from "../Bi";
import { COINS } from "../../lib/market/tape";
import { FLIES, startSeason, tickClock, TICKS_PER_SEASON, seasonClock } from "../../lib/market/fly";
import { diaryFrom, fmtPct, fmtPx, fmtUsd, type DiaryLine } from "../../lib/market/diary";
import { useLiveFly } from "./LiveFly";

export const replayHref = (slug: string, season: number, tick: number) => `/fly/${slug}/replay?season=${season}&tick=${tick}`;

const BEH_EN: Record<string, string> = { approach: "Approach · buy", avoid: "Avoid · sell", explore: "Explore", freeze: "Freeze · hold", dead: "Dead" };

export function BehaviorChip() {
  const { snap } = useLiveFly();
  const b = snap?.behavior ?? "freeze";
  return <span className={`tfBeh tfBeh-${b}${snap?.gf ? " tfBeh-gf" : ""}`}><i /><Bi en={snap?.gf ? "Giant Fiber · escape" : BEH_EN[b]}  /></span>;
}

/** The numbers over the arena. */
export function LiveStats({ compact = false }: { compact?: boolean }) {
  const { snap, replayed, progress } = useLiveFly();
  const eq = snap?.eq ?? 1000;
  const ch = snap ? eq / snap.startEq - 1 : 0;
  const fed = snap ? Math.round(snap.energy * 100) : 0;
  return <div className={`tfStats${compact ? " tfStatsCompact" : ""}`}>
    <div><span><Bi en="Equity (paper)"  /></span><b className="tfNum">{snap ? fmtUsd(eq) : "—"}</b></div>
    <div><span><Bi en="Today"  /></span><b className={`tfNum ${ch >= 0 ? "tfUp" : "tfDown"}`}>{snap ? fmtPct(ch) : "—"}</b></div>
    <div><span><Bi en="Fed"  /></span><b className="tfNum">{snap ? fed + "%" : "—"}</b><em className="tfFed"><i style={{ width: fed + "%" }} className={fed > 45 ? "ok" : fed > 20 ? "warn" : "bad"} /></em></div>
    <div><span><Bi en="Generation"  /></span><b className="tfNum">{snap ? snap.gen : "—"}</b></div>
    {!compact && <div className="tfStatsWide"><span><Bi en="Chain at this tick"  /></span><b className="tfMono">{snap ? snap.chain : progress < 1 ? "…" : "—"}</b><small><Bi en={`${replayed.toLocaleString("en-US")} ticks replayed in this browser`}  /></small></div>}
  </div>;
}

const ROSTER: { group: string; names: string[] }[] = [
  { group: "SENSE", names: ["ORN_food", "LPLC2", "LC4", "LIGHT", "NOV"] },
  { group: "SMELL", names: ["PN1", "PN2", "PN3", "KC1", "KC2", "KC3", "KC4", "KC5", "KC6", "KC7", "KC8", "APL", "LH"] },
  { group: "STATE", names: ["NPF", "GF"] },
  { group: "ACT", names: ["DN_approach", "DN_avoid", "DN_explore", "DN_freeze"] },
];

/** The 24 neurons, lit when they spike this tick. */
export function NeuronStrip() {
  const { snap } = useLiveFly();
  const counts = useRef<Record<string, number>>({});
  const lastTick = useRef(-1);
  if (snap && snap.tick !== lastTick.current) {
    lastTick.current = snap.tick;
    for (const n of snap.spikes) counts.current[n] = (counts.current[n] ?? 0) + 1;
  }
  return <div className="tfNeurons" aria-label="FFW-CX/0.1 neurons">
    {ROSTER.map((g) => <div key={g.group} className="tfNeuronGroup">
      <label>{g.group}</label>
      <div>{g.names.map((n) => {
        const c = counts.current[n] ?? 0;
        return <span key={n + "-" + c} className={`tfNeuron${c ? " fired" : ""}${n === "GF" ? " gf" : ""}`} title={n}><i /><small>{n.replace("DN_", "").replace("_food", "")}</small></span>;
      })}</div>
    </div>)}
  </div>;
}

/** The four inputs and the circuit's answer. */
export function SignalBars() {
  const { snap } = useLiveFly();
  const s = snap?.signals ?? [0, 0, 0, 0];
  const p = snap?.probs ?? [0, 0, 0, 0];
  const rows: [string, string, number, string][] = [
    ["food", "Food · scent", s[0], "acid"],
    ["threat", "Threat · falling", s[1], "danger"],
    ["light", "Light · breadth", s[2], "amber"],
    ["novelty", "Novelty · new target", s[3], "ink"],
  ];
  const outs: [string, number][] = [["Approach", p[0]], ["Avoid", p[1]], ["Explore", p[2]], ["Freeze", p[3]]];
  return <div className="tfSignals">
    <div>
      <label><Bi en="IN · market → senses"  /></label>
      {rows.map(([k, en, v, c]) => <div className="tfBar" key={k}><span><Bi en={en}  /></span><em><i className={`c-${c}`} style={{ width: `${Math.round(v * 100)}%` }} /></em><b className="tfNum">{v.toFixed(2)}</b></div>)}
      <div className="tfBar"><span><Bi en="Hunger"  /></span><em><i className="c-amber" style={{ width: `${Math.round((snap?.hunger ?? 0) * 100)}%` }} /></em><b className="tfNum">{(snap?.hunger ?? 0).toFixed(2)}</b></div>
    </div>
    <div>
      <label><Bi en="OUT · circuit → behavior"  /></label>
      {outs.map(([en, v]) => <div className="tfBar" key={en}><span><Bi en={en}  /></span><em><i className="c-acid" style={{ width: `${Math.round(v * 100)}%` }} /></em><b className="tfNum">{v.toFixed(2)}</b></div>)}
      <div className="tfBehRow"><BehaviorChip /></div>
    </div>
  </div>;
}

function LineText({ line }: { line: DiaryLine }) {
  return <Bi en={line.en}  />;
}

/** One diary line with its replay links. */
export function DiaryItem({ line, slug, season }: { line: DiaryLine; slug: string; season: number }) {
  return <li className={`tfDiaryItem tone-${line.tone}`}>
    <span className="tfDiaryT tfMono">{tickClock(line.t)} · G{line.g}</span>
    <p><LineText line={line} /></p>
    <span className="tfReplays">{line.ticks.map((t, i) => <Link key={t + "-" + i} className="tfReplay" href={replayHref(slug, season, t)} prefetch={false}>{i === 0 ? "replay" : "entry"} ↗<small>#{t}</small></Link>)}</span>
  </li>;
}

export function Diary({ limit = 12, includeBuys = false }: { limit?: number; includeBuys?: boolean }) {
  const { snap } = useLiveFly();
  if (!snap) return <ul className="tfDiary"><li className="tfDiaryEmpty"><Bi en="Replaying the day…"  /></li></ul>;
  const lines = diaryFrom(snap.events, limit, includeBuys);
  return <ul className="tfDiary">{lines.map((l, i) => <DiaryItem key={l.t + "-" + i + l.tone} line={l} slug={snap.slug} season={snap.season} />)}</ul>;
}

/** A scrolling strip of the fly's latest lines. */
export function EventTicker() {
  const { snap } = useLiveFly();
  const lines = snap ? diaryFrom(snap.events, 10, true) : [];
  if (!snap || !lines.length) return <div className="tfTicker tfTickerEmpty"><span><Bi en="Sealing decisions…"  /></span></div>;
  const row = lines.map((l, i) => <Link key={i} className={`tfTick tone-${l.tone}`} href={replayHref(snap.slug, snap.season, l.t)} prefetch={false}><b className="tfMono">{tickClock(l.t)}</b><span><LineText line={l} /></span><i>↗</i></Link>);
  return <div className="tfTicker" aria-label="Latest sealed events"><div className="tfTickerTrack">{row}{row}</div></div>;
}

export function Holdings() {
  const { snap } = useLiveFly();
  if (!snap) return null;
  const rows = COINS.map((c, i) => ({ c, i })).filter(({ i }) => snap.qty[i] > 0);
  return <div className="tfTableWrap">
    <table className="tfTable">
      <thead><tr><th><Bi en="Coin"  /></th><th><Bi en="Qty"  /></th><th><Bi en="Cost"  /></th><th><Bi en="Price"  /></th><th><Bi en="P/L"  /></th><th><Bi en="Opened"  /></th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className="tfMuted"><Bi en={`All cash: ${fmtUsd(snap.cash)}. Nothing smells good enough.`}  /></td></tr>}
        {rows.map(({ c, i }) => {
          const val = snap.qty[i] * snap.price[i];
          const pl = snap.cost[i] > 0 ? val / snap.cost[i] - 1 : 0;
          return <tr key={c.ticker}>
            <td><b>{c.ticker}</b></td>
            <td className="tfNum">{snap.qty[i].toFixed(2)}</td>
            <td className="tfNum">{fmtUsd(snap.cost[i])}</td>
            <td className="tfNum">{fmtPx(snap.price[i])}</td>
            <td className={`tfNum ${pl >= 0 ? "tfUp" : "tfDown"}`}>{fmtPct(pl)}</td>
            <td>{snap.openedAt[i] >= 0 ? <Link className="tfReplay" href={replayHref(snap.slug, snap.season, snap.openedAt[i])} prefetch={false}>{tickClock(snap.openedAt[i])} ↗</Link> : "—"}</td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}

export function SealedLog() {
  const { snap } = useLiveFly();
  if (!snap) return null;
  const recs = snap.records.slice().reverse().slice(0, 10);
  return <div className="tfTableWrap">
    <table className="tfTable tfLog">
      <thead><tr><th><Bi en="Tick"  /></th><th>UTC</th><th><Bi en="Behavior"  /></th><th><Bi en="Trade"  /></th><th><Bi en="Record hash"  /></th><th /></tr></thead>
      <tbody>{recs.map((r) => <tr key={r.t}>
        <td className="tfNum">{r.t}</td>
        <td className="tfMono">{tickClock(r.t)}</td>
        <td><span className={`tfDot b-${r.gf ? "gf" : r.b}`} />{r.gf ? "GF escape" : r.b}</td>
        <td className="tfMono">{r.tr.length ? r.tr.map((x) => `${x.side} ${COINS[x.coin].ticker}`).join(", ") : "—"}</td>
        <td className="tfMono">{r.hash}</td>
        <td><Link className="tfReplay" href={replayHref(snap.slug, snap.season, r.t)} prefetch={false}>↗</Link></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export function Lineage() {
  const { snap } = useLiveFly();
  if (!snap) return null;
  const births = snap.lineage;
  return <ol className="tfLineage">{births.map((e, i) => <li key={i} className={`k-${e.kind}`}>
    <span className="tfMono">{tickClock(e.t)}</span>
    <b>{e.kind === "birth" ? <Bi en={`Generation ${e.g} hatched`}  /> : e.kind === "death" ? <Bi en={`Generation ${e.g} ${e.cause === "broke" ? "went broke" : "starved"}`}  /> : <Bi en="Lineage ended"  />}</b>
    <span className="tfNum">{fmtUsd(e.equity)}</span>
    <Link className="tfReplay" href={replayHref(snap.slug, snap.season, e.t)} prefetch={false}>↗</Link>
  </li>)}</ol>;
}

/** Ask the server for a chain hash, compute the same tick here, compare. */
export function VerifyWidget({ slug }: { slug: string }) {
  const { snap } = useLiveFly();
  const [state, setState] = useState<{ phase: "idle" | "server" | "browser" | "done" | "error"; tick?: number; season?: number; server?: string; browser?: string; progress?: number; ms?: number; err?: string }>({ phase: "idle" });
  const busy = state.phase === "server" || state.phase === "browser";
  const cancel = useRef(false);
  useEffect(() => () => { cancel.current = true; }, []);

  const run = async (pick: "now" | "random") => {
    const clock = seasonClock(Date.now());
    const season = snap?.season ?? clock.season;
    const max = Math.max(0, (snap?.tick ?? clock.tick));
    const tick = pick === "now" ? max : Math.floor(Math.random() * (max + 1));
    setState({ phase: "server", tick, season });
    let server = "";
    try {
      const res = await fetch(`/api/fly/${slug}?season=${season}&tick=${tick}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "server error");
      server = j.chain;
    } catch (e) {
      setState({ phase: "error", tick, season, err: e instanceof Error ? e.message : "request failed" });
      return;
    }
    setState({ phase: "browser", tick, season, server, progress: 0 });
    const runSeason = startSeason(FLIES[slug], season, { keepEvents: 1 });
    const t0 = performance.now();
    const stepChunk = () => {
      if (cancel.current) return;
      const s0 = performance.now();
      while (runSeason.tick <= tick && performance.now() - s0 < 14) runSeason.next();
      if (runSeason.tick <= tick) {
        setState((v) => ({ ...v, progress: runSeason.tick / (tick + 1) }));
        setTimeout(stepChunk, 0);
      } else {
        setState({ phase: "done", tick, season, server, browser: runSeason.runner.state.chain, progress: 1, ms: Math.round(performance.now() - t0) });
      }
    };
    setTimeout(stepChunk, 0);
  };

  const same = state.phase === "done" && state.server === state.browser;
  return <div className={`tfVerify${state.phase === "done" ? (same ? " ok" : " bad") : ""}`}>
    <div className="tfVerifyBtns">
      <button type="button" className="tfBtn" onClick={() => run("random")} disabled={busy}><Bi en="Verify a random past tick"  /></button>
      <button type="button" className="tfBtn ghost" onClick={() => run("now")} disabled={busy}><Bi en="Verify right now"  /></button>
    </div>
    <div className="tfVerifyGrid">
      <div><label><Bi en="Tick"  /></label><b className="tfMono">{state.tick !== undefined ? `#${state.tick} · ${tickClock(state.tick)}` : "—"}</b></div>
      <div><label><Bi en="Server says"  /></label><b className="tfMono">{state.server ?? (state.phase === "server" ? "…" : "—")}</b></div>
      <div><label><Bi en="Your browser says"  /></label><b className="tfMono">{state.browser ?? (state.phase === "browser" ? `${Math.round((state.progress ?? 0) * 100)}%` : "—")}</b></div>
      <div className="tfVerdict">
        {state.phase === "done" && (same ? <span className="ok">IDENTICAL</span> : <span className="bad">DIVERGED</span>)}
        {state.phase === "error" && <span className="bad">{state.err}</span>}
        {state.phase === "idle" && <span className="idle"><Bi en="Two machines, one rulebook"  /></span>}
        {busy && <span className="idle"><Bi en="Computing…"  /></span>}
      </div>
    </div>
    {state.phase === "done" && <p className="tfVerifyNote">
      <Bi en={`Your browser replayed ${(state.tick! + 1).toLocaleString("en-US")} ticks in ${state.ms} ms and reached the same chain hash as the server. ${same ? "Nothing was sent to you but the rules." : "That is a bug report — please file it."}`}  />
      {" "}<Link className="tfReplay" href={replayHref(slug, state.season!, state.tick!)} prefetch={false}><Bi en="Open this tick"  /> ↗</Link>
    </p>}
  </div>;
}

export function SeasonLine() {
  const { snap } = useLiveFly();
  if (!snap) return <span className="tfMono">SEASON — · PAPER</span>;
  const left = TICKS_PER_SEASON - 1 - snap.tick;
  const h = Math.floor((left * 3) / 3600), m = Math.floor(((left * 3) % 3600) / 60);
  return <span className="tfMono"><Bi en={`SEASON ${snap.season} · PAPER · ${h}h ${m}m LEFT TODAY`}  /></span>;
}
