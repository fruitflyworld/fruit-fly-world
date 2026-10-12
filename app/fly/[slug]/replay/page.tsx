import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bi } from "../../../components/Bi";
import FlyNav from "../../../components/fly/FlyNav";
import FlyFooter from "../../../components/fly/FlyFooter";
import Arena from "../../../components/fly/Arena";
import ReplayCheck from "../../../components/fly/ReplayCheck";
import { LiveFlyProvider } from "../../../components/fly/LiveFly";
import { FLIES, runTo, seasonClock, seasonDate, tickClock, TICKS_PER_SEASON } from "../../../lib/market/fly";
import { equityOf, MARKET_WORLD_VERSION } from "../../../lib/market/engine";
import { COINS } from "../../../lib/market/tape";
import { fmtPct, fmtPx, fmtUsd } from "../../../lib/market/diary";
import { contentHash } from "../../../../public/play/js/brain.js";
import { CX_MODEL_VERSION } from "../../../../public/play/js/cx-circuit.js";
import "../../../flies.css";

export const dynamic = "force-dynamic";

export function generateMetadata({ params, searchParams }: { params: { slug: string }; searchParams: Record<string, string> }): Metadata {
  const fly = FLIES[params.slug];
  if (!fly) return {};
  return { title: `${fly.name} · tick ${searchParams.tick ?? ""} — replay · Fruit Fly World`, robots: { index: false } };
}

const BEH: Record<string, string> = { approach: "Approach → buy on landing", avoid: "Avoid → sell into the fall", explore: "Explore → drift to the next scent", freeze: "Freeze → hold", dead: "Dead" };

export default function ReplayPage({ params, searchParams }: { params: { slug: string }; searchParams: Record<string, string | undefined> }) {
  const fly = FLIES[params.slug];
  if (!fly) notFound();
  const clock = seasonClock(Date.now());
  let season = Number(searchParams.season ?? clock.season);
  let tick = Number(searchParams.tick ?? clock.tick);
  if (!Number.isInteger(season) || season < 0) season = clock.season;
  if (!Number.isInteger(tick) || tick < 0) tick = 0;
  tick = Math.min(tick, TICKS_PER_SEASON - 1);
  const future = season > clock.season || (season === clock.season && tick > clock.tick);
  if (future) { season = clock.season; tick = clock.tick; }

  const { run, record, chain } = runTo(fly, season, tick, { keepEvents: 1 });
  const s = run.runner.state;
  const recordHash = contentHash(record);
  const eq = equityOf(s);
  const signals: [string, number][] = [["Food", record.s[0]], ["Threat", record.s[1]], ["Light", record.s[2]], ["Novelty", record.s[3]], ["Hunger", record.h]];
  const probs: [string, number][] = [["Approach", record.p[0]], ["Avoid", record.p[1]], ["Explore", record.p[2]], ["Freeze", record.p[3]]];
  const nav = (d: number) => {
    const t = Math.max(0, Math.min(tick + d, season === clock.season ? clock.tick : TICKS_PER_SEASON - 1));
    return `/fly/${fly.slug}/replay?season=${season}&tick=${t}`;
  };

  return <main className="tfPage tfReplayPage">
    <FlyNav />
    <LiveFlyProvider slug={fly.slug} fixed={{ season, tick }}>
      <header className="tfFlyHead">
        <div>
          <div className="eyebrow tfEyebrow"><i /><span className="tfMono">REPLAY · {fly.name.toUpperCase()} · SEASON {season} · {seasonDate(season)}</span></div>
          <h1>#{tick}<em> · {tickClock(tick)}</em></h1>
          {future && <p className="tfWarn"><Bi en="That moment hasn't happened yet, so this shows the latest tick instead."  /></p>}
        </div>
        <div className="tfReplayNav">
          <Link href={nav(-10)} prefetch={false}>−10</Link>
          <Link href={nav(-1)} prefetch={false}>−1</Link>
          <Link href={nav(1)} prefetch={false}>+1</Link>
          <Link href={nav(10)} prefetch={false}>+10</Link>
          <Link href={`/fly/${fly.slug}`} className="live"><Bi en="LIVE"  /> ↗</Link>
        </div>
      </header>

      <section className="tfFlyGrid">
        <div className="tfFlyStage"><Arena still label={`${fly.name} at tick ${tick}`} /></div>
        <aside className="tfFlySide">
          <ReplayCheck serverChain={chain} serverRecordHash={recordHash} tick={tick} />
          <div className="tfCard">
            <h3><Bi en="What happened at this tick"  /></h3>
            <dl className="tfDl">
              <dt><Bi en="Generation"  /></dt><dd className="tfNum">{record.g} · {record.st}</dd>
              <dt><Bi en="Decision"  /></dt><dd>{record.gf ? <Bi en="Giant Fiber fired → escape, sell everything"  /> : <Bi en={BEH[record.b]}  />} <span className="tfMuted">· {record.c.toFixed(2)}</span></dd>
              <dt><Bi en="Target"  /></dt><dd>{COINS[record.tg].ticker} @ {fmtPx(s.price[record.tg])}</dd>
              <dt><Bi en="Trades"  /></dt><dd>{record.tr.length ? record.tr.map((t, i) => <span key={i} className={`tfTrade ${t.side}`}>{t.side.toUpperCase()} {t.qty.toFixed(2)} {COINS[t.coin].ticker} @ {fmtPx(t.px)}{t.pnl !== undefined ? ` · ${fmtPct(t.pnl)}` : ""}</span>) : "—"}</dd>
              <dt><Bi en="Equity"  /></dt><dd className="tfNum">{fmtUsd(eq)} <span className="tfMuted">(<Bi en="paper"  />)</span></dd>
              <dt><Bi en="Energy"  /></dt><dd className="tfNum">{Math.round(record.e * 100)}%</dd>
            </dl>
          </div>
        </aside>
      </section>

      <section className="tfSection tfFlyBody">
        <div className="tfFlyCols">
          <div className="tfCard">
            <h3><Bi en="Inputs → circuit → behavior"  /></h3>
            <div className="tfSignals">
              <div><label><Bi en="IN"  /></label>{signals.map(([en, v]) => <div className="tfBar" key={en}><span><Bi en={en}  /></span><em><i className="c-acid" style={{ width: `${Math.round(v * 100)}%` }} /></em><b className="tfNum">{v.toFixed(2)}</b></div>)}</div>
              <div><label><Bi en="OUT"  /></label>{probs.map(([en, v]) => <div className="tfBar" key={en}><span><Bi en={en}  /></span><em><i className="c-amber" style={{ width: `${Math.round(v * 100)}%` }} /></em><b className="tfNum">{v.toFixed(2)}</b></div>)}</div>
            </div>
          </div>
          <div className="tfCard">
            <h3><Bi en="The sealed record"  /> <small className="tfMono">{MARKET_WORLD_VERSION} · {CX_MODEL_VERSION}</small></h3>
            <pre className="tfPre tfWrap">{JSON.stringify(record)}</pre>
            <p className="tfMuted"><Bi en="Record hash = FNV-1a of this JSON (keys sorted). Chain = hash(previous chain, record hash). Rerun it yourself:"  /></p>
            <pre className="tfPre tfCmd">{`curl "https://fruitfly.world/api/fly/${fly.slug}?season=${season}&tick=${tick}"`}</pre>
          </div>
        </div>
      </section>
    </LiveFlyProvider>
    <FlyFooter />
  </main>;
}
