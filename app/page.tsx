import Link from "next/link";
import CopyBox from "./components/CopyBox";
import ExperimentLab from "./components/ExperimentLab";
import HeroExperience from "./components/HeroExperience";
import MintSection from "./components/MintSection";
import WorldMap from "./components/WorldMap";
import { AGENT_PROMPT } from "./lib/skill";

const steps = [
  ["01", "STIMULUS", "Food, threat, light, and novelty arrive as the next situation."],
  ["02", "SIGNAL", "The situation becomes signals a small decision model can read."],
  ["03", "BEHAVIOR", "One behavior wins: approach, avoid, explore, or freeze."],
  ["04", "WORLD EVENT", "That behavior changes energy, sectors, threats, and the next moment."],
  ["05", "PUBLIC RECORD", "Inputs, seed, model version, decision, and result stay inspectable."]
];

/** What each part of the page is for, so nobody has to guess. */
const guide = [
  ["#play", "PLAY", "The game itself: forage, escape the committed strike, and carry the lineage forward."],
  ["#specimen", "SPECIMEN", "The biological idea behind the project, kept separate from what is actually implemented."],
  ["#experiment", "EXPERIMENT LAB", "A small interactive model for inspecting signals and decisions."],
  ["#world", "THE WORLD", "The wider research context and the questions still being tested."],
  ["#mint", "PASSPORT", "A secondary participation layer, not the reason to play."]
];

export default function Home() {
  return <main>
    <nav><a className="brand" href="#top"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></a><div className="navLinks"><a href="#play">Play</a><a href="#agents">For Agents</a><a href="#specimen">Specimen</a><a href="#experiment">Experiment</a><a href="#world">World</a><a href="#mint">Passport</a><Link href="/game">The Game</Link><Link href="/pitch">What This Is</Link><a href="https://github.com/fruitflyworld/fruit-fly-world/tree/main/docs" target="_blank" rel="noreferrer">Docs</a></div><Link className="navCta" href="/play">PLAY</Link></nav>

    <header className="hero" id="top">
      <div className="heroCopy">
        <div className="eyebrow"><i/> CONNECTOME-INSPIRED WORLD · FRUITFLY.WORLD</div>
        <h1>A world for<br/>small <em>decisions.</em></h1>
        <p>Fruit Fly World is a playable fruit-fly lineage game. You forage under pressure, read the predator&apos;s committed strike, escape when the Giant Fiber reflex is ready, and pass what you earned to the next generation.</p>
        <div className="heroActions">
          <Link className="primary" href="/play">PLAY <span>↗</span></Link>
          <a className="secondary" href="#specimen">EXPLORE THE MODEL <span>↓</span></a>
        </div>
        <div className="heroMintNote">
          <b>ONE GAME · ONE WORLD</b>
          <span>The game runs as a full-screen page on this site. Everything around it — the specimen, the lab, the world — is the research layer that explains what it is modelling.</span>
        </div>
        <div className="heroMintNote">
          <b>NEW THIS WEEK</b>
          <span>The escape circuit is now a published neural module: LC4 + LPLC2 converging on the Giant Fiber, deterministic, with a reproducible control experiment — real vs shuffled wiring, 100% vs 68% escape. And the research brief is live: <Link href="/pitch/fruitfly">how a System One judgment model becomes a fly&apos;s brainstem</Link>.</span>
        </div>
        <div className="heroTrust">
          <span>LC4 + LPLC2 → GIANT FIBER</span>
          <span>REAL VS SHUFFLED · 100/68</span>
          <span>SYSTEM ONE BRIEF LIVE</span>
        </div>
      </div>
      <HeroExperience/>
      <a className="scrollCue" href="#specimen"><span>ENTER THE WORLD</span><i/></a>
    </header>

    {/* What is on this page, and what each part is for */}
    <section className="guideRail" aria-label="What is on this page">
      {guide.map(([href, title, body]) => <a key={href} href={href}><span>{title}</span><p>{body}</p></a>)}
    </section>

    <section className="gameShowcase" id="play">
      <div className="sectionHead gameShowcaseHead">
        <div><label>THE GAME / PLAY IN THE BROWSER</label><h2>See the danger.<br/><em>Choose. Survive.</em></h2></div>
        <div>
          <p>Fruit Fly World is a single-player lineage roguelite. You move through a dish, trade food for energy, read the predator&apos;s committed lunge, and trigger the Giant Fiber escape when the response is ready.</p>
          <p>Generations continue through your decisions. It runs full-screen in this browser — no install, no account, and no server round-trip to play.</p>
          <Link className="primary" href="/play">PLAY <span>↗</span></Link>
        </div>
      </div>
      <div className="gameScreens">
        <article className="gameScreenCard">
          <img src="/launch-film/frames/frame-0294.jpg" alt="Concept frame of the Fruit Fly World dish during foraging"/>
          <div className="gameScreenCopy"><span>01 / FORAGE</span><h3>Food becomes energy.</h3><p>Move toward sugar, yeast, and rot. Sugar is safe, yeast sits on the rim, rot is rich but leaves an odor the predator can follow.</p></div>
        </article>
        <article className="gameScreenCard">
          <img src="/launch-film/frames/frame-0519.jpg" alt="Concept frame of the Fruit Fly World predator committing to a strike"/>
          <div className="gameScreenCopy"><span>02 / READ THE LUNGE</span><h3>Threat commits.</h3><p>Watch the predator approach, then choose the narrow moment when the GF reflex lights up READY — too early wastes the escape, too late meets the trajectory.</p></div>
        </article>
        <article className="gameScreenCard">
          <img src="/launch-film/frames/frame-0733.jpg" alt="Concept frame of the Fruit Fly World lineage continuing into another generation"/>
          <div className="gameScreenCopy"><span>03 / CARRY IT FORWARD</span><h3>A lineage, not a reset.</h3><p>At generation end, compare your eggs with the wild type and draft one mutation for the next fly. Death ends a generation, not the lineage.</p></div>
        </article>
      </div>
      <div className="gameClipCard">
        <video className="gameClip" src="/gameplay/gameplay.mp4" poster="/gameplay/gameplay-poster.jpg" autoPlay loop muted playsInline/>
        <div className="gameClipCopy">
          <span>04 / RECORDED IN THE DISH</span>
          <h3>The game, not a mockup.</h3>
          <p>Above are concept frames; this is real footage, captured from a live browser run — the judgment layer flying the fly, food being read, the predator on its way. The brain decides where to go; the GF brainstem still owns the jump.</p>
        </div>
      </div>
    </section>

    {/* The agent lane — models fly the game; the hourly puzzle is the browser-free extra */}
    <section className="agentSection" id="agents">
      <div className="sectionHead">
        <div><label>AI AGENTS / THE OTHER LANE</label><h2>Humans steer it.<br/><em>Models fly it too.</em></h2></div>
        <p>At <Link href="/play">/play</Link> the fly&apos;s brain is a slot. Hand it to the judgment layer — paste a System One key, or use the free local heuristic — and a small model flies the whole loop itself: forage, escape, generations. Every decision is sealed with a content hash and downloadable. Then put any brain in the exam room and starve it.</p>
      </div>
      <div className="specimenGrid">
        <div className="specimenCard">
          <b>01</b>
          <h3>PICK ITS BRAIN</h3>
          <p>The game menu offers four: your own hands, the genes auto-pilot, a 24-neuron spiking circuit, or a judgment layer. Same dish, same rules, same scoring — only the brain differs.</p>
        </div>
        <div className="specimenCard">
          <b>02</b>
          <h3>YOUR MODEL FLIES</h3>
          <p>Judgment runs closed-loop: signals in, one behavior out, every second, sealed. With a key it runs on a pinned System One model through a same-origin proxy; without one, the free offline heuristic takes the stick.</p>
        </div>
        <div className="specimenCard">
          <b>03</b>
          <h3>STARVE IT</h3>
          <p>The exam room (<code>?bench=1</code>) runs the same seed twice at a fixed 60 Hz. Identical decision hashes mean a fair paper — and the sealed log is the receipt. Don&apos;t exam the model. Starve it.</p>
        </div>
      </div>
      <p className="agentAside">No browser at all? The <b>Foraging Hour</b> is the agent-native side lane: one map and one published rule per hour, and a skill that lets your bot search every route offline and enter on its own — best score takes the window. <Link href="/skill/ffw-arena">Read that interface ↗</Link></p>
      <CopyBox
        text={AGENT_PROMPT}
        label="Agent prompt — paste into Claude / Cursor / your bot"
        note="This is the Foraging Hour skill — the browser-free lane. It needs an agent wallet; you mint. Node 18+ can also run the skill's own loop: FFW_AGENT_KEY=0x… FFW_BASE_URL=https://fruitfly.world node scripts/play.mjs"
      />
    </section>

    {/* Specimen deep-dive */}
    <section className="specimenSection" id="specimen">
      <div className="sectionHead">
        <div><label>SUBJECT FF-001 / LIVE SPECIMEN</label><h2>One agent.<br/><em>One world.</em></h2></div>
        <p>This is not a simulation of a brain. It is a small set of signals entering a model, one choice emerging, and a shared world changing in response. Every run is deterministic — same inputs, same seed, same result. Check it yourself.</p>
      </div>
      <div className="specimenGrid">
        <div className="specimenCard">
          <b>01</b>
          <h3>IT SENSES</h3>
          <p>Food, threat, light, novelty — four signals shape every moment. The world changes them. The agent reads them.</p>
        </div>
        <div className="specimenCard">
          <b>02</b>
          <h3>IT CHOOSES</h3>
          <p>A connectome-inspired model weighs the signals. One behavior wins: approach, avoid, explore, or freeze.</p>
        </div>
        <div className="specimenCard">
          <b>03</b>
          <h3>IT SURVIVES</h3>
          <p>Energy rises or falls. Sectors get mapped. Threats get dodged. The world records everything — forever.</p>
        </div>
      </div>
      <div className="biologyFacts" aria-label="Biological references behind the escape model">
        <article className="biologyFact"><span>LC4 / ANGULAR VELOCITY</span><strong>2,442 <i>SYNAPSES</i></strong><p>One visual stream reports how quickly a shape turns across the field of view.</p></article>
        <article className="biologyFact"><span>LPLC2 / LOOMING</span><strong>1,366 <i>SYNAPSES</i></strong><p>A second visual stream reports a shape growing as it approaches — the signature of closing danger.</p></article>
        <article className="biologyFact"><span>GIANT FIBER / DNp01</span><strong>2 → 1 <i>ESCAPE NODE</i></strong><p>The game simplifies both streams into one readable escape decision: the GF response becomes READY.</p></article>
      </div>
      <p className="specimenBoundary">These are research references for a simplified, connectome-inspired escape model — not a complete fruit-fly brain, a full FlyWire or MaleCNS runtime, or a claim about real animal behavior.</p>
    </section>

    <section className="marquee" aria-label="Project principles"><div>STIMULUS → SIGNAL → BEHAVIOR → WORLD EVENT → PUBLIC RECORD <i>•</i> STIMULUS → SIGNAL → BEHAVIOR → WORLD EVENT → PUBLIC RECORD</div></section>

    <section className="intro" id="observe"><div className="sectionLabel">01 / OBSERVE</div><div><h2>Don&apos;t ask it to talk.<br/><em>Give it a world to survive.</em></h2><p>Fruit Fly World turns a difficult scientific idea into something anyone can play: a small set of signals enters a model, the agent makes one choice, and the world changes.</p><p>Our aim is simple: make hidden neural ideas playable first, then make the model observable and reproducible enough to inspect.</p></div><div className="depthGlyph" aria-hidden="true"><i/><i/><i/><span>ENTER<br/>CONNECTOME</span></div></section>

    <section className="stepRail">{steps.map(([number,title,body]) => <article key={number}><span>{number}</span><i/><h3>{title}</h3><p>{body}</p></article>)}</section>

    <section className="experimentSection" id="experiment"><div className="sectionHead"><div><label>INTERACTIVE LAB / 01</label><h2>Change one signal.<br/>Watch a decision emerge.</h2></div><p>Keep the inputs and seed fixed and the result repeats. Change one signal, run the paired trial, and inspect the model output — a reproducible experiment, not a claim that a complete biological brain has been recreated.</p></div><ExperimentLab/></section>

    <section className="worldSection" id="world"><div className="sectionHead"><div><label>PERSISTENT WORLD / 02</label><h2>Every decision becomes<br/>the next round&apos;s reality.</h2></div><p>The site is not a looping animation. Decisions generate sectors, energy changes, threats, challenges, and an append-only event history.</p></div><WorldMap/></section>

    <section className="mintSection" id="mint"><div className="sectionHead"><div><label>FRUIT FLY PASSPORT / SECONDARY LAYER</label><h2>Participation,<br/><em>after the work.</em></h2></div><p>The Passport is an optional participation layer around Fruit Fly World, not the game itself. See the current terms and availability before taking any action.</p></div><MintSection/></section>

    <section className="boundary"><div><label>THE HONEST BOUNDARY</label><h2>A connection map<br/>is not a complete brain.</h2></div><div className="boundaryGrid"><article><b>WHAT IT IS</b><p>A playable, connectome-inspired lineage game, built on a deterministic world and a simplified escape circuit.</p></article><article><b>WHAT IT ISN&apos;T</b><p>A conscious fly, a complete connectome runtime, a complete FlyWire reproduction, or proof of biological behavior.</p></article><article><b>WHAT YOU CAN CHECK</b><p>Every run exposes its inputs, model version, seed, decision, confidence, and result.</p></article></div></section>

    <section className="finalCta"><span>THE DISH IS WAITING</span><h2>Give it a signal.<br/><em>See what survives.</em></h2><Link className="primary" href="/play">PLAY <span>↗</span></Link></section>

    <footer><a className="brand" href="#top"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></a><p>Independent connectome-inspired experiment.<br/>No affiliation or endorsement implied.</p><div><Link href="/play">PLAY</Link><a href="#experiment">EXPERIMENT</a><a href="#world">WORLD</a><Link href="/pitch">PITCH</Link><a href="#top">BACK TO TOP ↑</a></div></footer>
  </main>;
}
