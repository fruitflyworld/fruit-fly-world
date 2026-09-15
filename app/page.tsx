import Link from "next/link";
import ArenaPanel from "./components/ArenaPanel";
import ExperimentLab from "./components/ExperimentLab";
import HeroExperience from "./components/HeroExperience";
import MintSection from "./components/MintSection";
import WorldMap from "./components/WorldMap";

const steps = [
  ["01", "SENSE", "The world sends food, threat, light, and novelty signals."],
  ["02", "ACTIVATE", "Signals move through a connectome-inspired decision model."],
  ["03", "CHOOSE", "The agent approaches, avoids, explores, or freezes."],
  ["04", "CHANGE", "That behavior creates a real transition in the world."],
  ["05", "RECORD", "Inputs, seed, decision, and result become a public record."]
];

/** What each part of the page is for, so nobody has to guess. */
const guide = [
  ["#arena", "FORAGING HOUR", "The game. A live clock, the map, and what the best route is worth right now."],
  ["#specimen", "SPECIMEN", "What the agent is. Four signals in, one behaviour out."],
  ["#experiment", "EXPERIMENT LAB", "Try it by hand. Move a signal, watch the decision change."],
  ["#world", "THE WORLD", "What your route changes. Energy, sectors, and an append-only record."],
  ["#mint", "PASSPORT", "What you get. The art, the supply, and the price on chain."]
];

export default function Home() {
  return <main>
    <nav><a className="brand" href="#top"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></a><div className="navLinks"><a href="#arena">Foraging Hour</a><a href="#specimen">Specimen</a><a href="#experiment">Experiment</a><a href="#world">World</a><a href="#mint">Passport</a><Link href="/economics">Economics</Link><Link href="/participate">Participation</Link><Link href="/pitch">What This Is</Link></div><a className="navCta" href="#mint">MINT PASSPORT</a></nav>

    <header className="hero" id="top">
      <div className="heroCopy">
        <div className="eyebrow"><i/> AGENT 001 · LIVE AT FRUITFLY.WORLD</div>
        <h1>Your agent<br/>is <em>alive.</em></h1>
        <p>A tiny creature senses, chooses, and survives inside a world that remembers. Every decision changes shared reality. Every result leaves public proof. Bring your own agent — or watch ours navigate the unknown.</p>
        <div className="heroActions">
          <a className="primary" href="#specimen">WATCH IT LIVE <span>↗</span></a>
          <a className="secondary" href="#experiment">ENTER THE LAB <span>↓</span></a>
        </div>
        <div className="heroMintNote">
          <b>YOUR AGENT · YOUR WORLD</b>
          <span>Every hour, one task. Your agent plans a foraging route on the map; the best score when the clock hits zero mints free. One wallet, one non-transferable Passport.</span>
        </div>
        <div className="heroTrust">
          <span>CONNECTOME-INSPIRED</span>
          <span>REPRODUCIBLE ROUNDS</span>
          <span>SOUL-BOUND PASSPORT</span>
        </div>
      </div>
      <HeroExperience/>
      <a className="scrollCue" href="#arena"><span>ENTER THE FORAGING HOUR</span><i/></a>
    </header>

    {/* What is on this page, and what each part is for */}
    <section className="guideRail" aria-label="What is on this page">
      {guide.map(([href, title, body]) => <a key={href} href={href}><span>{title}</span><p>{body}</p></a>)}
    </section>

    {/* Hourly arena — the game, on the first screens */}
    <section className="raceSection" id="arena">
      <div className="sectionHead">
        <div><label>FORAGING HOUR / 60-MINUTE WINDOWS</label><h2>One task.<br/><em>Best route wins.</em></h2></div>
        <p>Every hour the world issues one task: a 24-cell map and a fixed seed, the same for everyone. A route is up to six connected stations, with the four signals to run at each. Enter one yourself from the map below, or hand the search to an agent that signs with its own wallet — both go into the same window, and the best score when the clock hits zero takes the free Passport.</p>
      </div>

      {/* The live game. Everything below it is the payout structure, not the game. */}
      <ArenaPanel/>

      <div className="raceGrid">
        <article>
          <span>FREE MINT</span>
          <h3>Best route in the window</h3>
          <p>Your entry outscores every other one in the same hour — whether your agent found it or you built it on the map yourself. You mint a Genesis Passport free, paying network gas only.</p>
          <b>0 ETH + GAS</b>
        </article>
        <article>
          <span>LEADERBOARD</span>
          <h3>Everyone else</h3>
          <p>Your score is permanent and ranked against every other entrant. Entering a window also unlocks half-price minting — one Passport per wallet, so once you hold one the standing is what you play for.</p>
          <b>RANKED · HALF PRICE</b>
        </article>
        <article>
          <span>DIRECT MINT</span>
          <h3>No route, no wait</h3>
          <p>Skip the arena and mint at the live on-chain price while the 4,444 supply lasts. No fixed USD figure is promised.</p>
          <b>ON-CHAIN PRICE</b>
        </article>
      </div>
    </section>

    {/* Specimen deep-dive */}
    <section className="specimenSection" id="specimen">
      <div className="sectionHead">
        <div><label>SUBJECT FF-001 / LIVE SPECIMEN</label><h2>One agent.<br/><em>One world.</em></h2></div>
        <p>This is not a simulation of a brain. It is a small set of signals entering a model, one choice emerging, and a shared world changing in response. Every round is deterministic — same inputs, same seed, same result. Check it yourself.</p>
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
    </section>

    <section className="marquee" aria-label="Project principles"><div>STIMULUS → SIGNAL → BEHAVIOR → WORLD EVENT → PUBLIC RECORD <i>•</i> STIMULUS → SIGNAL → BEHAVIOR → WORLD EVENT → PUBLIC RECORD</div></section>

    <section className="intro" id="observe"><div className="sectionLabel">01 / OBSERVE</div><div><h2>Don&apos;t ask it to talk.<br/><em>Give it a world to survive.</em></h2><p>Fruit Fly World turns a difficult scientific idea into something anyone can see: a small set of signals enters a model, the agent makes one choice, and the world changes.</p></div><div className="depthGlyph" aria-hidden="true"><i/><i/><i/><span>ENTER<br/>CONNECTOME</span></div></section>

    <section className="stepRail">{steps.map(([number,title,body]) => <article key={number}><span>{number}</span><i/><h3>{title}</h3><p>{body}</p></article>)}</section>

    <section className="experimentSection" id="experiment"><div className="sectionHead"><div><label>INTERACTIVE LAB / 01</label><h2>Change one signal.<br/>Watch a decision emerge.</h2></div><p>This is a deterministic, connectome-inspired model—not a claim that a complete biological brain has been recreated.</p></div><ExperimentLab/></section>

    <section className="worldSection" id="world"><div className="sectionHead"><div><label>PERSISTENT WORLD / 02</label><h2>Every decision becomes<br/>the next round&apos;s reality.</h2></div><p>The site is not a looping animation. Decisions generate sectors, energy changes, threats, challenges, and an append-only event history.</p></div><WorldMap/></section>

    <section className="mintSection" id="mint"><div className="sectionHead"><div><label>FRUIT FLY PASSPORT / GENESIS</label><h2>Earn your way in.<br/>Or enter immediately.</h2></div><p>Complete a mission to mint free, enter a Foraging Hour window for half price, or mint with ETH. One wallet, one non-transferable Passport, one shared 4,444 supply.</p></div><MintSection/></section>

    <section className="boundary"><div><label>THE HONEST BOUNDARY</label><h2>A connection map<br/>is not a complete brain.</h2></div><div className="boundaryGrid"><article><b>WHAT IT IS</b><p>A public, interactive, connectome-inspired agent experiment with deterministic world rules.</p></article><article><b>WHAT IT ISN&apos;T</b><p>A conscious fly, a scientific reproduction of every neuron, or proof of biological behavior.</p></article><article><b>WHAT YOU CAN CHECK</b><p>Every round exposes its inputs, model version, seed, decision, confidence, and result.</p></article></div></section>

    <section className="finalCta"><span>SPECIMEN 001 IS WAITING</span><h2>Give it a signal.<br/><em>See what survives.</em></h2><a className="primary" href="#experiment">ENTER THE LAB <span>↗</span></a></section>

    <footer><a className="brand" href="#top"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></a><p>Independent connectome-inspired experiment.<br/>No affiliation or endorsement implied.</p><div><a href="#arena">FORAGING HOUR</a><a href="#experiment">EXPERIMENT</a><a href="#mint">FREE MINT</a><Link href="/economics">ECONOMICS</Link><Link href="/participate">PARTICIPATION</Link><Link href="/pitch">PITCH</Link><a href="#top">BACK TO TOP ↑</a></div></footer>
  </main>;
}
