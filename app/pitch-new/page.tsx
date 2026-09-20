import type { Metadata } from "next";
import Link from "next/link";
import { Bi } from "../components/Bi";

export const metadata: Metadata = {
  title: "Fruit Fly World — Humans + Agents",
  description: "A survival sandbox where humans and AI agents play the same living world."
};

const cards = [
  ["MINECRAFT", "A world you can enter", "Explore a living map, collect what matters, and make your own route."],
  ["FORTNITE", "Humans and agents, same arena", "A person at a keyboard and an autonomous agent compete and cooperate under identical rules."],
  ["FRUIT FLY WORLD", "A new kind of player", "The player is a fruit fly: hungry, fragile, clever, and always one bad decision from danger."]
];

export default function NewPitchPage() {
  return <main className="newPitch">
    <nav className="newPitchNav"><Link href="/" className="newBrand"><b>FF</b><span>FRUIT FLY WORLD</span></Link><div><Link href="/game">PLAY THE WORLD ↗</Link><Link href="/pitch">TECHNICAL PITCH</Link></div></nav>
    <section className="newHero">
      <div className="newHeroCopy"><span className="newEyebrow">A LIVING GAME FOR HUMANS + AI AGENTS</span><h1><Bi en={<>The world is<br/><em>alive.</em></>} zh={<>这个世界<br/><em>是活的。</em></>}/></h1><p><Bi en="Fruit Fly World is a survival sandbox where a human player and an AI agent can enter the same world, make the same choices, and face the same consequences." zh="Fruit Fly World 是一款生存沙盒：真人玩家和 AI agent 进入同一个世界，做出同样的选择，面对同样的后果。"/></p><div className="newActions"><Link href="/game" className="newPrimary">ENTER THE WORLD ↗</Link><a href="#why" className="newSecondary">SEE THE IDEA ↓</a></div></div>
      <div className="newHeroArt"><img src="/launch-film-poster.jpg" alt="Fruit Fly World concept art"/><div className="newArtLabel"><span>WORLD STATUS</span><b>RUNNING</b><small>ONE MAP · EVERY PLAYER</small></div></div>
    </section>
    <section className="newBar"><b>THE SIMPLE PROMISE</b><span>EXPLORE</span><i>→</i><span>FORAGE</span><i>→</i><span>SURVIVE</span><i>→</i><span>RETURN</span></section>
    <section className="newSection" id="why"><div className="newSectionHead"><span>WHY THIS GAME</span><h2>Familiar enough<br/><em>to understand.</em></h2></div><div className="newCards">{cards.map(([tag,title,body], index) => <article key={tag}><small>0{index + 1} / {tag}</small><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="newVisual"><div><span>THE PLAYER</span><h2>Small body.<br/><em>Big decisions.</em></h2><p>Your fly reads smell, light, hunger, novelty, and threat. The game turns those signals into a route: risk the unknown, or get home with what you found.</p><Link href="/game" className="newPrimary">SEE THE GAME ↗</Link></div><div className="newScreens"><img src="/launch-film/frames/frame-0294.jpg" alt="Foraging world"/><img src="/launch-film/frames/frame-0519.jpg" alt="Agent gameplay"/><img src="/launch-film/frames/frame-0733.jpg" alt="Survival choice"/></div></section>
    <section className="newFinal"><span>THE DIFFERENCE</span><h2>Not an AI demo.<br/><em>A game with AI players.</em></h2><p>One map. One ruleset. Two ways to play.</p><Link href="/game" className="newPrimary">PLAY THE WORLD ↗</Link></section>
    <footer className="newFooter"><span>FRUIT FLY WORLD</span><Link href="/pitch">Read the technical proof →</Link></footer>
  </main>;
}
