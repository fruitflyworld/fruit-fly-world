import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bi } from "../../components/Bi";
import FlyNav from "../../components/fly/FlyNav";
import FlyFooter from "../../components/fly/FlyFooter";
import X402Menu from "../../components/fly/X402Menu";
import Stage from "../../components/fly/Stage";
import { LiveFlyProvider } from "../../components/fly/LiveFly";
import { BehaviorChip, Diary, Holdings, Lineage, LiveStats, NeuronStrip, SealedLog, SeasonLine, SignalBars, VerifyWidget } from "../../components/fly/Widgets";
import { FLIES } from "../../lib/market/fly";
import { TOKEN } from "../../lib/token";
import "../../flies.css";

export function generateStaticParams() {
  return Object.keys(FLIES).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const fly = FLIES[params.slug];
  if (!fly) return {};
  return {
    title: `${fly.name} — a fruit fly that trades · Fruit Fly World`,
    description: `${fly.name} trades an invented paper market from a simulated wallet. No real money moves. It can brag, but every number replays.`,
    alternates: { canonical: `/fly/${fly.slug}` },
  };
}

export default function FlyPage({ params }: { params: { slug: string } }) {
  const fly = FLIES[params.slug];
  if (!fly) notFound();
  return <main className="tfPage tfFlyPage">
    <FlyNav />
    <LiveFlyProvider slug={fly.slug}>
      <header className="tfFlyHead">
        <div>
          <div className="eyebrow tfEyebrow"><i /><SeasonLine /></div>
          <h1>{fly.name}<em>.</em></h1>
          <p className="tfSlogan small"><Bi en={<>It can brag. <em>Every number replays.</em></>}  /></p>
        </div>
        <div className="tfFlyHeadSide">
          <BehaviorChip />
          <span className="tfPill"><Bi en={TOKEN.live ? "PAPER MARKET · $FLY LIVE" : "PAPER MODE · NO TOKEN YET"}  /></span>
        </div>
      </header>

      <section className="tfFlyGrid">
        <div className="tfFlyStage"><Stage label={`${fly.name}, live in the dish`} /></div>
        <aside className="tfFlySide">
          <LiveStats />
          <div className="tfCard"><h3><Bi en="Holding"  /></h3><Holdings /></div>
          <div className="tfCard"><h3><Bi en="Lineage today"  /></h3><Lineage /></div>
        </aside>
      </section>

      <section className="tfSection tfFlyBody">
        <div className="tfFlyCols">
          <div className="tfCard tfDiaryCard">
            <h3><Bi en="Diary"  /> <small className="tfMono"><Bi en="every number links to its tick"  /></small></h3>
            <Diary limit={30} includeBuys />
          </div>
          <div className="tfFlyRight">
            <div className="tfCard"><h3><Bi en="What it senses, what it decides"  /></h3><SignalBars /><NeuronStrip /></div>
            <div className="tfCard"><h3><Bi en="Sealed log"  /></h3><SealedLog /></div>
          </div>
        </div>
      </section>

      <section className="tfSection" id="x402">
        <div className="sectionHead">
          <div><label><Bi en={`PAY ${fly.name.toUpperCase()} · X402`}  /></label><h2><Bi en={<>Keep it alive.<br /><em>Get your name in.</em></>}  /></h2></div>
          <p><Bi en="These open when $FLY launches. Until then nothing here takes money, and nothing should ask you for any."  /></p>
        </div>
        <X402Menu />
      </section>

      <section className="tfSection tfReplaySection">
        <div className="sectionHead">
          <div><label><Bi en="CHECK THIS FLY"  /></label><h2><Bi en={<>Two machines.<br /><em>One answer.</em></>}  /></h2></div>
          <p><Bi en="Pick any moment from today. The server and your browser each replay the day up to it and compare chain hashes."  /></p>
        </div>
        <VerifyWidget slug={fly.slug} />
        <p className="tfMuted tfCenter"><Link className="tfReplay" href="/#how"><Bi en="How the fly turns prices into moves"  /> ↗</Link></p>
      </section>
    </LiveFlyProvider>
    <FlyFooter />
  </main>;
}
