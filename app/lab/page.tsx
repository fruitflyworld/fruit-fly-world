import Link from "next/link";
import CopyBox from "../components/CopyBox";
import ExperimentLab from "../components/ExperimentLab";
import WorldMap from "../components/WorldMap";
import { GAME_AGENT_PROMPT } from "../lib/agentskill";

const steps = [
  ["01", "STIMULUS", "Food, threat, light, and novelty arrive as the next situation."],
  ["02", "SIGNAL", "The situation becomes signals a small decision model can read."],
  ["03", "BEHAVIOR", "One behavior wins: approach, avoid, explore, or freeze."],
  ["04", "WORLD EVENT", "That behavior changes energy, sectors, threats, and the next moment."],
  ["05", "PUBLIC RECORD", "Inputs, seed, model version, decision, and result stay inspectable."]
];

/** The research layer: everything that used to crowd the homepage, one level down. */
export default function Lab() {
  return <main>
    <nav><a className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></a><div className="navLinks"><Link href="/">Play</Link><a href="#agents">For Agents</a><a href="#specimen">Specimen</a><a href="#experiment">Experiment</a><a href="#world">World</a><Link href="https://github.com/fruitflyworld/fruit-fly-world/tree/main/docs" target="_blank" rel="noreferrer">Docs</Link></div><Link className="navCta" href="/play">PLAY</Link></nav>

    <header className="hero" id="top">
      <div className="heroCopy">
        <div className="eyebrow"><i/> THE LAB / MODELS, SIGNALS, RECEIPTS</div>
        <h1>The research<br/>layer of the <em>dish.</em></h1>
        <p>The game is the front door. This page is everything behind it: how a model sits in the brain slot, what the signals mean, and how every decision stays inspectable.</p>
        <div className="heroActions">
          <Link className="primary" href="/play?bench=1&seed=42&brain=judgment&gens=2">RUN THE EXAM <span>↗</span></Link>
          <Link className="secondary" href="/essay">READ THE ESSAY <span>↗</span></Link>
        </div>
      </div>
      <a className="scrollCue" href="#agents"><span>SCROLL</span><i/></a>
    </header>

    {/* The agent lane — models fly the game */}
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
      <CopyBox
        text={GAME_AGENT_PROMPT}
        label="Agent prompt — paste into Claude / Cursor / your bot"
        note="The skill plays the main survival game headless — no key, no account. Node 18+ can also drive the loop yourself: curl -sO https://fruitfly.world/skill/ffw-dish/scripts/play.mjs && node play.mjs"
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

    <section className="finalCta"><span>BACK TO THE DISH</span><h2>You have seen the lab.<br/><em>Now feed the fly.</em></h2><Link className="primary" href="/play">PLAY <span>↗</span></Link></section>

    <footer><a className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></a><p>Independent connectome-inspired experiment.<br/>No affiliation or endorsement implied.</p><div><Link href="/">HOME</Link><Link href="/play">PLAY</Link><Link href="/essay">ESSAY</Link><Link href="/calibration">CALIBRATION</Link><a href="#top">BACK TO TOP ↑</a></div></footer>
  </main>;
}
