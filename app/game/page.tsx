import type { Metadata } from "next";
import Link from "next/link";
import { Bi, type Bilingual } from "../components/Bi";
import LangToggle from "../components/LangToggle";

export const metadata: Metadata = {
  title: "Fruit Fly World — The Game",
  description: "A single-player lineage roguelite: forage under pressure, read a predator's committed lunge, escape with the Giant Fiber response, and carry the lineage forward."
};

const loop: { n: string; title: Bilingual; body: Bilingual }[] = [
  { n: "01", title: ["FORAGE", "觅食"], body: ["Move toward sugar, yeast, and rot. Food becomes energy, and your position changes the risk of the next moment.", "向糖、酵母和腐烂物移动。食物会转化为能量，而你的位置会改变下一刻的风险。"] },
  { n: "02", title: ["MANAGE ENERGY", "管理能量"], body: ["Energy is converted into eggs automatically. High-value food can leave you exposed, so the safest route is not always the richest one.", "能量会自动转化为卵。高价值食物可能让你暴露，所以最安全的路线不总是最丰盛的路线。"] },
  { n: "03", title: ["READ THE LUNGE", "读懂扑击"], body: ["The predator approaches, then commits to a trajectory. Watch the approach and wait for the Giant Fiber response to become READY.", "捕食者先靠近，再锁定轨迹。观察它的接近，在 Giant Fiber 响应变为 READY 时做出判断。"] },
  { n: "04", title: ["ESCAPE", "逃脱"], body: ["Press Space or tap GF ESCAPE at the right moment. A short decision window determines whether this generation survives.", "在正确时机按空格或点击 GF ESCAPE。短暂的决策窗口决定这一代能否活下来。"] },
  { n: "05", title: ["CARRY IT FORWARD", "延续血统"], body: ["At generation end, compare eggs with the wild type and choose one mutation from a three-card draft. The next fly inherits the consequence.", "一代结束时，将卵与野生型比较，并从三张突变卡中选择一张。下一只蝇会继承这个后果。"] }
];

const facts: { tag: Bilingual; value: string; label: Bilingual }[] = [
  { tag: ["FORMAT", "形式"], value: "SINGLE-PLAYER", label: ["A full-screen browser game with desktop and mobile input.", "支持桌面和移动端输入的全屏浏览器游戏。"] },
  { tag: ["MODEL", "模型"], value: "GF ESCAPE", label: ["A simplified, connectome-inspired escape circuit.", "简化的、受连接组启发的逃脱回路。"] },
  { tag: ["PROGRESSION", "推进"], value: "LINEAGE", label: ["Generations, eggs, mutations, and wild-type comparison.", "世代、卵、突变，以及与野生型的比较。"] },
  { tag: ["STATUS", "状态"], value: "PLAYABLE", label: ["Runs on this site, at /play. No install, no account.", "在本站 /play 直接运行，无需安装或注册。"] }
];

export default function GamePage() {
  return <main className="pitchPage docPage">
    <nav className="pitchNav docNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="docNavLinks"><Link href="/pitch">PITCH</Link><Link href="/game">THE GAME</Link></div>
      <div className="docNavEnd"><Link href="/play">PLAY ↗</Link><LangToggle/></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i/><Bi en="THE GAME / PLAYABLE IN THE BROWSER" zh="游戏 / 浏览器内直接游玩"/></div>
      <h1><Bi en={<>See the danger.<br/><em>Choose. Survive.</em></>} zh={<>看见危险。<br/><em>选择，活下去。</em></>}/></h1>
      <p><Bi en={<>Fruit Fly World is a single-player lineage roguelite. You forage under pressure, read the predator&apos;s committed lunge, and trigger the Giant Fiber escape when the response is ready. It runs full-screen on this site — the research pages around it explain what it is modelling.</>} zh={<>Fruit Fly World 是一款单人血统 roguelite。你在压力下觅食，读懂捕食者锁定的扑击，并在 Giant Fiber 响应就绪时触发逃脱。它在本站全屏运行；周围的研究页面解释它在模拟什么。</>}/></p>
      <div className="pitchHeroActions"><Link className="primary" href="/play"><Bi en="PLAY" zh="开始游戏"/> <span>↗</span></Link><a className="secondary" href="#loop"><Bi en="SEE THE LOOP" zh="查看循环"/> <span>↓</span></a></div>
      <div className="pitchPromise"><span>SINGLE-PLAYER</span><span>LINEAGE PROGRESSION</span><span>CONNECTOME-INSPIRED</span></div>
    </header>

    <section className="docTiles" aria-label="The game at a glance">{facts.map((fact) => <article key={fact.value}><span><Bi en={fact.tag[0]} zh={fact.tag[1]}/></span><b>{fact.value}</b><small><Bi en={fact.label[0]} zh={fact.label[1]}/></small></article>)}</section>

    <section className="docSection" id="loop">
      <div className="docHead"><span><Bi en="01 · THE PLAY LOOP" zh="01 · 游戏循环"/></span><div><h2><Bi en={<>Short decisions.<br/><em>Longer lineage.</em></>} zh={<>短暂的决定，<br/><em>更长的血统。</em></>}/></h2><p><Bi en="Every generation turns a few seconds of reading and action into a consequence carried forward. The model is inspired by biology, but the rules are explicit and playable." zh="每一代都把几秒钟的观察与行动变成可延续的后果。模型受生物学启发，但规则明确且可以游玩。"/></p></div></div>
      <div className="docCards">{loop.map((card) => <article key={card.n}><span>{card.n}</span><h3><Bi en={card.title[0]} zh={card.title[1]}/></h3><p><Bi en={card.body[0]} zh={card.body[1]}/></p></article>)}</div>
    </section>

    <section className="docSection"><div className="docHead"><span><Bi en="02 · HONEST SCOPE" zh="02 · 诚实边界"/></span><div><h2><Bi en={<>Inspired by a circuit.<br/><em>Not a complete brain.</em></>} zh={<>受回路启发，<br/><em>不是完整的大脑。</em></>}/></h2><p><Bi en="The game uses a simplified escape model and research-informed names as design references. It is not a complete fruit-fly brain, a complete connectome runtime, or a claim about animal behavior." zh="游戏使用简化的逃脱模型，并将研究中的名称作为设计参考。它不是完整的果蝇大脑、完整的连接组运行时，也不是对动物行为的宣称。"/></p></div></div></section>

    <section className="pitchFinal"><span><Bi en="THE GAME IS READY TO PLAY" zh="游戏已经可以游玩"/></span><h2><Bi en={<>Give it a signal.<br/><em>See what survives.</em></>} zh={<>给它一个信号，<br/><em>看什么能活下来。</em></>}/></h2><Link className="primary" href="/play"><Bi en="PLAY" zh="开始游戏"/> <span>↗</span></Link></section>
    <footer className="pitchFooter"><Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link><p><Bi en="A connectome-inspired playable model. Not a claim that a complete biological brain has been rebuilt." zh="一个受连接组启发的可玩模型，不是「完整复刻了生物大脑」的宣称。"/></p><div className="docNavLinks"><Link href="/">WORLD ↗</Link><Link href="/pitch">PITCH ↗</Link></div></footer>
  </main>;
}
