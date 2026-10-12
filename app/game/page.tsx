import type { Metadata } from "next";
import Link from "next/link";
import { Bi } from "../components/Bi";

export const metadata: Metadata = {
  title: "Fruit Fly World — The Game",
  description: "A single-player lineage roguelite: forage under pressure, read a predator's committed lunge, escape with the Giant Fiber response, and carry the lineage forward."
};

const loop: { n: string; title: string; body: string }[] = [
  { n: "01", title: "FORAGE", body: "Move toward sugar, yeast, and rot. Food becomes energy, and your position changes the risk of the next moment." },
  { n: "02", title: "MANAGE ENERGY", body: "Energy is converted into eggs automatically. High-value food can leave you exposed, so the safest route is not always the richest one." },
  { n: "03", title: "READ THE LUNGE", body: "The predator approaches, then commits to a trajectory. Watch the approach and wait for the Giant Fiber response to become READY." },
  { n: "04", title: "ESCAPE", body: "Press Space or tap GF ESCAPE at the right moment. A short decision window determines whether this generation survives." },
  { n: "05", title: "CARRY IT FORWARD", body: "At generation end, compare eggs with the wild type and choose one mutation from a three-card draft. The next fly inherits the consequence." }
];

const facts: { tag: string; value: string; label: string }[] = [
  { tag: "FORMAT", value: "SINGLE-PLAYER", label: "A full-screen browser game with desktop and mobile input." },
  { tag: "MODEL", value: "GF ESCAPE", label: "A simplified, connectome-inspired escape circuit." },
  { tag: "PROGRESSION", value: "LINEAGE", label: "Generations, eggs, mutations, and wild-type comparison." },
  { tag: "STATUS", value: "PLAYABLE", label: "Runs on this site, at /play. No install, no account." }
];

export default function GamePage() {
  return <main className="pitchPage docPage">
    <nav className="pitchNav docNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="docNavLinks"><Link href="/pitch">PITCH</Link><Link href="/game">THE GAME</Link></div>
      <div className="docNavEnd"><Link href="/play">PLAY ↗</Link></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i/><Bi en="THE GAME / PLAYABLE IN THE BROWSER" /></div>
      <h1><Bi en={<>See the danger.<br/><em>Choose. Survive.</em></>} /></h1>
      <p><Bi en={<>Fruit Fly World is a single-player lineage roguelite. You forage under pressure, read the predator&apos;s committed lunge, and trigger the Giant Fiber escape when the response is ready. It runs full-screen on this site — the research pages around it explain what it is modelling.</>} /></p>
      <div className="pitchHeroActions"><Link className="primary" href="/play"><Bi en="PLAY" /> <span>↗</span></Link><a className="secondary" href="#loop"><Bi en="SEE THE LOOP" /> <span>↓</span></a></div>
      <div className="pitchPromise"><span>SINGLE-PLAYER</span><span>LINEAGE PROGRESSION</span><span>CONNECTOME-INSPIRED</span></div>
    </header>

    <section className="docTiles" aria-label="The game at a glance">{facts.map((fact) => <article key={fact.value}><span><Bi en={fact.tag} /></span><b>{fact.value}</b><small><Bi en={fact.label} /></small></article>)}</section>

    <section className="docSection" id="loop">
      <div className="docHead"><span><Bi en="01 · THE PLAY LOOP" /></span><div><h2><Bi en={<>Short decisions.<br/><em>Longer lineage.</em></>} /></h2><p><Bi en="Every generation turns a few seconds of reading and action into a consequence carried forward. The model is inspired by biology, but the rules are explicit and playable." /></p></div></div>
      <div className="docCards">{loop.map((card) => <article key={card.n}><span>{card.n}</span><h3><Bi en={card.title} /></h3><p><Bi en={card.body} /></p></article>)}</div>
    </section>

    <section className="docSection"><div className="docHead"><span><Bi en="02 · HONEST SCOPE" /></span><div><h2><Bi en={<>Inspired by a circuit.<br/><em>Not a complete brain.</em></>} /></h2><p><Bi en="The game uses a simplified escape model and research-informed names as design references. It is not a complete fruit-fly brain, a complete connectome runtime, or a claim about animal behavior." /></p></div></div></section>

    <section className="pitchFinal"><span><Bi en="THE GAME IS READY TO PLAY" /></span><h2><Bi en={<>Give it a signal.<br/><em>See what survives.</em></>} /></h2><Link className="primary" href="/play"><Bi en="PLAY" /> <span>↗</span></Link></section>
    <footer className="pitchFooter"><Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link><p><Bi en="A connectome-inspired playable model. Not a claim that a complete biological brain has been rebuilt." /></p><div className="docNavLinks"><Link href="/">WORLD ↗</Link><Link href="/pitch">PITCH ↗</Link></div></footer>
  </main>;
}
