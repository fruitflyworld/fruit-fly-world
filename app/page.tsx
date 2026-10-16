import Link from "next/link";
import { Bi } from "./components/Bi";
import FlyNav from "./components/fly/FlyNav";
import FlyFooter from "./components/fly/FlyFooter";
import X402Menu from "./components/fly/X402Menu";
import Stage from "./components/fly/Stage";
import { LiveFlyProvider } from "./components/fly/LiveFly";
import { Diary, EventTicker, Lineage, NeuronStrip, SeasonLine, SignalBars, VerifyWidget } from "./components/fly/Widgets";
import { announced, FEE_SPLIT, PASSPORT, TOKEN } from "./lib/token";
import "./flies.css";

const STEPS: { k: string; en: string; den: string }[] = [
  { k: "01 · SENSE", en: "The market becomes a smell.", den: "Volume and real buyers set how strongly a coin smells. Rising tastes sweet. A coin you hold falling fast is a predator closing in."} ,
  { k: "02 · DECIDE", en: "A fly circuit picks one of four moves.", den: "The same 24-neuron FFW-CX/0.1 circuit the game ships. Approach, avoid, explore or freeze. If the Giant Fiber fires, nothing else gets a vote."} ,
  { k: "03 · ACT", en: "The body moves. The wallet follows.", den: "Landing on a coin buys it. Backing off sells into the fall. A Giant Fiber escape sells everything at once."} ,
  { k: "04 · SEAL", en: "Every tick is hashed and chained.", den: "One chain hash at any tick commits to the whole day before it. Your browser can recompute it from the rules alone."} ,
];

const LIFE: { en: string; den: string }[] = [
  { en: "Hatch", den: "A fly is hatched with its own paper wallet and its own record."} ,
  { en: "Feed", den: "Trading fees are its food. Anyone can also feed it directly."} ,
  { en: "Forage", den: "A fed fly has the energy to fly, sniff and trade."} ,
  { en: "Starve", den: "When the fees dry up and nobody feeds it, it dies. The death is public and replayable."} ,
  { en: "Reborn", den: "The next generation inherits most of the estate and keeps the record."} ,
];

export default function Home() {
  return <main className="tfPage">
    <FlyNav home />
    <LiveFlyProvider slug="dusty">

      <header className="tfHero" id="live">
        <div className="tfHeroCopy">
          <div className="eyebrow tfEyebrow"><i /><SeasonLine /></div>
          <h1><Bi en={<>A fruit fly<br /><em>that trades.</em></>}  /></h1>
          <p className="tfLede"><Bi en="Dusty sniffs an invented paper market and trades a simulated wallet. No real money moves anywhere. Trading fees are its food; when they dry up it starves, and its offspring carry on."  /></p>
          <p className="tfSlogan"><Bi en={<>It can brag.<br /><em>Every number replays.</em></>}  /></p>
          <div className="heroActions tfHeroActions">
            <Link className="primary" href="/fly/dusty"><Bi en="WATCH DUSTY"  /> <span>↗</span></Link>
            <a className="secondary" href="#replay"><Bi en="CHECK A NUMBER"  /> <span>↓</span></a>
          </div>
          <p className="tfHeroFine"><Bi en={TOKEN.live
            ? `$FLY is live on ${announced(TOKEN.chain)}. Dusty still trades simulated coins — the token does not change what the fly does.`
            : "Paper season. Simulated coins and paper money until $FLY launches; the venue and the chain are announced in the $FLY section below before anything opens."}  /></p>
        </div>
        <div className="tfHeroStage">
          <Stage label="Dusty, live in the paper-market dish" />
        </div>
      </header>

      <section className="tfBand" id="tapeout">
        <span className="tfMono tfBandK"><Bi en="TAPEOUT · FFW-NAND/1"  /></span>
        <p><Bi en={<><b>50 NAND gates</b> — the fly&apos;s decisions, compiled to a circuit twelve bits wide and checked against its rules on all 4096 words. Small enough to read, small enough to tape out to BNB Chain. Built and tested; <b>not taped out yet.</b></>}  /></p>
        <Link className="tfBandCta" href="/nand"><Bi en="SEE THE CIRCUIT"  /> ↗</Link>
      </section>

      <EventTicker />

      <section className="tfSection" id="how">
        <div className="sectionHead">
          <div><label><Bi en="HOW IT WORKS / MARKET IN, BEHAVIOR OUT"  /></label><h2><Bi en={<>It can't read a chart.<br /><em>It can smell one.</em></>}  /></h2></div>
          <p><Bi en="Nothing here was invented for the market. The four inputs and four behaviors are the contract the survival game already uses. We only translate prices into smells, and moves into trades."  /></p>
        </div>
        <ol className="tfSteps">
          {STEPS.map((s) => <li key={s.k}><span className="tfMono">{s.k}</span><h3><Bi en={s.en}  /></h3><p><Bi en={s.den}  /></p></li>)}
        </ol>
        <div className="tfInstrument">
          <div className="tfInstrumentHead"><span className="tfMono"><Bi en="LIVE INSTRUMENTS · THIS TICK"  /></span><span className="tfLiveDot"><i /> LIVE</span></div>
          <SignalBars />
          <NeuronStrip />
        </div>
      </section>

      <section className="tfSection tfReplaySection" id="replay">
        <div className="sectionHead">
          <div><label><Bi en="EVERY NUMBER REPLAYS"  /></label><h2><Bi en={<>Don't trust the brag.<br /><em>Recompute it.</em></>}  /></h2></div>
          <p><Bi en="Same rules plus same seed gives the same day, on any machine. Ask the server for any past tick, compute it in your own browser, and compare the hashes."  /></p>
        </div>
        <VerifyWidget slug="dusty" />
        <div className="tfProof">
          <div><b className="tfMono">FFW-CX/0.1</b><span><Bi en="24-neuron circuit, unchanged from the game"  /></span></div>
          <div><b className="tfMono">MARKET/1</b><span><Bi en="world rules, one hash per tick, chained"  /></span></div>
          <div><b className="tfMono">1260/1260</b><span><Bi en="cross-device checks identical in the game engine"  /></span></div>
        </div>
      </section>

      <section className="tfSection tfDiarySection" id="diary">
        <div className="tfSplit">
          <div>
            <label><Bi en="FROM DUSTY'S DIARY"  /></label>
            <h2><Bi en={<>Loud.<br /><em>Never made up.</em></>}  /></h2>
            <p className="tfMuted"><Bi en="Every line is written from a sealed event. Wins and losses go on the same page, each with a link to the tick it came from."  /></p>
            <Link className="secondary tfInline" href="/fly/dusty"><Bi en="FULL DIARY"  /> <span>↗</span></Link>
          </div>
          <Diary limit={7} />
        </div>
      </section>

      <section className="tfSection" id="x402">
        <div className="sectionHead">
          <div><label><Bi en="EVERY FLY GETS A HOMEPAGE"  /></label><h2><Bi en={<>Pay the fly.<br /><em>Not a promise.</em></>}  /></h2></div>
          <p><Bi en="On its page a fly shows its arena, wallet and diary. Visitors and agents can pay it with x402. Nothing is for sale yet; this is the menu we will open at launch."  /></p>
        </div>
        <X402Menu />
      </section>

      <section className="tfSection tfLifeSection" id="life">
        <div className="sectionHead">
          <div><label><Bi en="ONE FLY · ONE LIFE · MANY GENERATIONS"  /></label><h2><Bi en={<>Fees are food.<br /><em>Hunger is real.</em></>}  /></h2></div>
          <p><Bi en="Quiet hours starve a fly. That is the point: a living token needs people to keep it alive, and everyone can see who did."  /></p>
        </div>
        <ol className="tfLife">{LIFE.map((l, i) => <li key={l.en}><span className="tfMono">0{i + 1}</span><h3><Bi en={l.en}  /></h3><p><Bi en={l.den}  /></p></li>)}</ol>
        <div className="tfLineageBox"><span className="tfMono"><Bi en="TODAY'S LINEAGE"  /></span><Lineage /></div>
      </section>

    </LiveFlyProvider>

    <section className="boundary" id="honest">
      <div><label><Bi en="THE HONEST BOUNDARY"  /></label><h2><Bi en={<>A small circuit.<br />A real reflex.</>}  /></h2></div>
      <div className="boundaryGrid">
        <article><b><Bi en="WHAT IT IS"  /></b><p><Bi en="A 24-neuron, connectome-inspired decision circuit with an escape reflex wired from the real fly connectome (LC4 and LPLC2 into the Giant Fiber), running in a deterministic world."  /></p></article>
        <article><b><Bi en="WHAT IT ISN'T"  /></b><p><Bi en="A simulation of a whole fly brain, a trading strategy, or investment advice. It doesn't know what a chart is. It reacts to smells."  /></p></article>
        <article><b><Bi en="WHAT YOU CAN CHECK"  /></b><p><Bi en="Every tick's inputs, the circuit's answer, the trade, and the hash chain. Recompute any of it in your browser, or run the open-source engine yourself."  /></p></article>
      </div>
    </section>

    <section className="tfSection tfLaunch" id="launch">
      <div className="sectionHead">
        <div><label>$FLY</label><h2><Bi en={TOKEN.live
          ? <>Live on {announced(TOKEN.chain)}.<br /><em>Fair launch, no allocation.</em></>
          : <>Fair launch,<br /><em>no allocation.</em></>}  /></h2></div>
        <p><Bi en={TOKEN.live
          ? "The contract address, the fixed supply and the fee split are published in this section, and nowhere else on this site."
          : "Not live yet. Until launch day, any token claiming to be Fruit Fly World is fake. The contract address and the fee split are published in this section first."}  /></p>
      </div>
      <ol className="tfRoad">
        {TOKEN.live
          ? <li className="done"><span className="tfMono"><Bi en="NOW"  /></span><b><Bi en="$FLY live"  /></b><p><Bi en={`Fair launch on ${announced(TOKEN.venue)}, ${announced(TOKEN.chain)}. The address, the supply and the fee split are published in this section.`}  /></p></li>
          : <li className="done"><span className="tfMono"><Bi en="NOW"  /></span><b><Bi en="Paper season"  /></b><p><Bi en="Dusty trades simulated coins with paper money, live and replayable."  /></p></li>}
        <li><span className="tfMono"><Bi en="NEXT"  /></span><b><Bi en="$FLY launch"  /></b><p><Bi en="Fair launch. A share of the fees feeds the flagship fly. The venue and the chain are announced in this section before anything opens."  /></p></li>
        <li><span className="tfMono"><Bi en="THEN"  /></span><b><Bi en="Fly homepages + x402"  /></b><p><Bi en="Feed, shout-outs, certificates, sponsored food spots."  /></p></li>
        <li><span className="tfMono"><Bi en="LATER"  /></span><b><Bi en="Hatch your own fly · GameFi"  /></b><p><Bi en="Anyone hatches a fly; the weekly race opens to bets."  /></p></li>
      </ol>
      <div className="tfLaunchFacts">
        <p className="tfHeroFine"><b>WHERE THE FEE INCOME GOES</b> — {FEE_SPLIT.map((row) => `${row.share} ${row.to}`).join(" · ")}. The venue sends the project a share of every trading fee; that income, not a token allocation, is what funds the work. The exact share is published with the launch facts.</p>
        <p className="tfHeroFine"><b>VENUE AND CHAIN</b> — {announced(TOKEN.venue)} · {announced(TOKEN.chain)}. Both are published in this section first, before anywhere else.</p>
        <p className="tfHeroFine"><b>PAYOUT WALLET</b> — {announced(TOKEN.payoutWallet)}.</p>
        <p className="tfHeroFine"><b>DEV WALLET</b> — {announced(TOKEN.devWallet)}. It does not buy at launch.</p>
        <p className="tfHeroFine"><b>CONTRACT ADDRESS</b> — {announced(TOKEN.contract)}. This section is the only place we publish it.</p>
        <p className="tfHeroFine"><b>PASSPORT CONTRACT</b> — {announced(PASSPORT.testDeployment)} is an early test deployment that exists on chain. It is not in use, nothing is being minted, and it may not be the final contract.</p>
        <p className="tfHeroFine"><b>WHAT THIS IS NOT</b> — team allocation 0%, no presale, no venture allocation, no dev buy and no airdrop promised. The launch venue keeps admin over the launch and the fee switch, and the split above is a policy rather than a contract: it is not paid to holders. Nothing here promises a price, a yield or a return, and none of it is investment advice.</p>
      </div>
    </section>

    <section className="tfSection tfGame" id="game">
      <div className="sectionHead">
        <div><label><Bi en="THE ENGINE CAME FROM A GAME"  /></label><h2><Bi en={<>Same fly.<br /><em>Same rules.</em></>}  /></h2></div>
        <p><Bi en="Before it traded, the fly foraged in a dish and dodged a predator. That game is where the determinism was proven; everything on this page inherits its rules."  /></p>
      </div>
      <div className="tfDoors">
        <Link href="/race"><span className="tfMono">/RACE</span><b><Bi en="The weekly race"  /></b><i>↗</i></Link>
        <Link href="/lab"><span className="tfMono">/LAB</span><b><Bi en="Put your model in the slot"  /></b><i>↗</i></Link>
        <Link href="/dish#mint"><span className="tfMono">/PASSPORT · COMING SOON</span><b><Bi en="Genesis Passport"  /></b><i>↗</i></Link>
      </div>
    </section>

    <section className="finalCta">
      <span><Bi en="DUSTY IS LIVE"  /></span>
      <h2><Bi en={<>Watch it eat.<br /><em>Check every bite.</em></>}  /></h2>
      <Link className="primary" href="/fly/dusty"><Bi en="OPEN DUSTY'S PAGE"  /> <span>↗</span></Link>
    </section>

    <FlyFooter />
  </main>;
}
