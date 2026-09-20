import type { Metadata } from "next";
import Link from "next/link";
import { Bi, type Bilingual } from "../components/Bi";
import LangToggle from "../components/LangToggle";

export const metadata: Metadata = {
  title: "Fruit Fly World — The Game",
  description: "A living strategy game where humans and AI agents control fruit flies in the same world, using real biology-inspired behaviors to explore, forage, and survive."
};

const loop: { n: string; title: Bilingual; body: Bilingual }[] = [
  { n: "01", title: ["FORAGE", "觅食"], body: ["Move toward sugar, yeast and rot. Food becomes energy, and your position on the dish changes the risk of the next second.", "向糖、酵母和腐烂物移动。食物变成能量，而你在培养皿上的位置会改变下一秒的风险。"] },
  { n: "02", title: ["MANAGE ENERGY", "管理能量"], body: ["Energy above the laying threshold turns into eggs automatically. The richest food sits where the predator hunts, so the safest route is rarely the fattest one.", "能量超过产卵阈值就会自动变成卵。最丰盛的食物长在捕食者巡猎的地方，所以最安全的路线很少是最肥的路线。"] },
  { n: "03", title: ["READ THE LUNGE", "读懂扑击"], body: ["The predator approaches, then commits to a ballistic trajectory it will not correct. Watch the approach and wait for the Giant Fiber response to read READY.", "捕食者先接近，然后锁定一条不会中途修正的弹道。观察它的接近，等 Giant Fiber 响应变成 READY。"] },
  { n: "04", title: ["ESCAPE", "逃脱"], body: ["Press Space, or tap GF ESCAPE, inside a short window. That one decision is what the whole escape circuit exists to make.", "在一个很短的窗口里按空格，或点 GF ESCAPE。整条逃脱回路存在的意义就是做这一个决定。"] },
  { n: "05", title: ["CARRY IT FORWARD", "延续血统"], body: ["At generation end, compare your eggs against the wild type and draft one mutation from three cards. The next fly inherits the consequence.", "一代结束时，把你的卵和野生型比较，从三张卡里抽一张突变。下一只蝇会继承这个后果。"] }
];

const circuit: { tag: Bilingual; value: string; label: Bilingual }[] = [
  { tag: ["LC4", "LC4"], value: "2,442 Σ", label: ["Angular-velocity neurons. They report how fast a shape is turning across your field of view.", "角速度神经元。它们报告一个形状掠过视野时转得有多快。"] },
  { tag: ["LPLC2", "LPLC2"], value: "1,366 Σ", label: ["Looming neurons. They report a shape growing in size — something getting closer, fast.", "looming 神经元。它们报告一个形状正在变大——有东西在快速靠近。"] },
  { tag: ["GIANT FIBER", "GIANT FIBER"], value: "DNp01", label: ["Both streams land on one descending neuron that fires the jump. In the game, that is the READY state.", "两条输入汇到同一个下行神经元，由它触发跳跃。在游戏里，这就是 READY 状态。"] }
];

const trial: { tag: Bilingual; value: string; label: Bilingual }[] = [
  { tag: ["FIXED SEED", "固定种子"], value: "1337", label: ["Every trial starts from the same seed, so the run is the same run for everyone who repeats it.", "每次试验都从同一个种子开始，所以谁重复跑，跑的都是同一轮。"] },
  { tag: ["PAIRED TRIALS", "配对试验"], value: "200", label: ["Real connectivity against shuffled connectivity, same seeds, same loomings, same predator.", "真实连接 对 打乱连接：同样的种子、同样的 looming、同样的捕食者。"] },
  { tag: ["THE RESULT", "结果"], value: "100% vs 68%", label: ["Real connectivity escapes 100% of the time with 0.202 s of lead; shuffled escapes 68% with 0.183 s. The gap is the connectivity.", "真实连接 100% 逃脱，领先 0.202 秒；打乱连接 68%，领先 0.183 秒。差距就是连接本身。"] }
];

const lineage: { tag: Bilingual; value: string; label: Bilingual }[] = [
  { tag: ["EGGS", "卵"], value: "VS WILD TYPE", label: ["Energy converts to eggs on its own. The generation is scored by how far ahead of the wild type it finished.", "能量会自行转化为卵。这一代的成绩，看它比野生型领先多少。"] },
  { tag: ["MUTATION DRAFT", "突变抽卡"], value: "3 → 1", label: ["Three cards, one choice. Twenty-four mutations exist across the pool, and the one you take changes how the next generation plays.", "三张卡，一个选择。池子里有 24 种突变，你拿的那一张会改变下一代怎么玩。"] },
  { tag: ["THE SAVE", "存档"], value: "LOCAL", label: ["The lineage is written to your browser only. Death ends a generation — it does not end the run.", "血脉只写在你的浏览器里。死亡结束的是一代，不是整轮。"] }
];

const boundary: { tag: Bilingual; value: string; label: Bilingual }[] = [
  { tag: ["WHAT IT IS", "它是什么"], value: "A MODEL", label: ["A simplified, connectome-inspired escape circuit, plus a game built on top of it.", "一条简化的、受连接组启发的逃脱回路，以及建在它上面的游戏。"] },
  { tag: ["WHAT IT ISN'T", "它不是什么"], value: "NOT A BRAIN", label: ["Not a complete fruit-fly brain, not a full FlyWire or MaleCNS runtime, and not a neuron-by-neuron simulation.", "不是完整的果蝇大脑，不是完整的 FlyWire 或 MaleCNS 运行环境，也不是逐神经元的仿真。"] },
  { tag: ["WHAT YOU CAN CHECK", "你能核对什么"], value: "RUN IT", label: ["The control experiment ships with the game: same seed, real connectivity versus shuffled, and the numbers are reproducible.", "对照实验随游戏一起提供：同一个种子，真实连接 对 打乱连接，数字可以复现。"] }
];

export default function PitchPage() {
  const tile = (label: Bilingual, value: string, note: Bilingual, unit?: Bilingual) => (
    <article>
      <span><Bi en={label[0]} zh={label[1]}/></span>
      <b>{value}{unit ? <i> <Bi en={unit[0]} zh={unit[1]}/></i> : null}</b>
      <small><Bi en={note[0]} zh={note[1]}/></small>
    </article>
  );
  const figure = (tag: Bilingual, value: string, label: Bilingual) => (
    <article><span><Bi en={tag[0]} zh={tag[1]}/></span><h3>{value}</h3><p><Bi en={label[0]} zh={label[1]}/></p></article>
  );
  return <main className="pitchPage docPage">
    <nav className="pitchNav docNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="docNavLinks"><Link href="/pitch">PITCH</Link><Link href="/game">GAME</Link></div>
      <div className="docNavEnd"><Link href="/play">PLAY ↗</Link><LangToggle/></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i/><Bi en="WHAT THIS IS / IN ONE PAGE" zh="这是什么 / 一页说清"/></div>
      <h1><Bi en={<>A small world.<br/>Real circuits.<br/><em>One lineage.</em></>} zh={<>一个小世界。<br/>真实的回路。<br/><em>一条血脉。</em></>}/></h1>
      <p><Bi
        en={<>Fruit Fly World is a single-player survival game about being a lineage of fruit flies on a dish that is trying to kill you. You forage under pressure, read a predator&apos;s committed lunge, and trigger the Giant Fiber escape when the reflex is ready. Underneath the game sits one piece of real neurobiology, written out so you can check it.</>}
        zh={<>Fruit Fly World 是一款单人生存游戏：你是一条果蝇血脉，而培养皿想弄死你。你在压力下觅食，读懂捕食者锁定的扑击，在反射就绪时触发 Giant Fiber 逃脱。游戏底下垫着一小块真实的神经生物学，而且写出来给你核对。</>}/></p>
      <div className="pitchHeroActions">
        <Link className="primary" href="/play"><Bi en="PLAY" zh="开始游戏"/> <span>↗</span></Link>
        <a className="secondary" href="#concept"><Bi en="READ WHAT IT IS" zh="读「这是什么」"/> <span>↓</span></a>
      </div>
      <div className="pitchPromise">
        <span><Bi en="SINGLE-PLAYER" zh="单人游玩"/></span>
        <span><Bi en="CONNECTOME-INSPIRED" zh="受连接组启发"/></span>
        <span><Bi en="DETERMINISTIC MODEL" zh="确定性模型"/></span>
        <span><Bi en="LINEAGE PROGRESSION" zh="血脉继承"/></span>
      </div>
      <figure className="pitchHeroImage"><img src="/launch-film-poster.jpg" alt="Fruit Fly World game world"/><figcaption><Bi en="A fruit fly learns the dish. You can too." zh="果蝇学习这个培养皿，你也可以。"/></figcaption></figure>
    </header>

    <section className="gameShowcase" aria-label="Game concept and visual references">
      <div className="docHead">
        <span><Bi en="THE GAME WE ARE MAKING" zh="我们真正要做的游戏"/></span>
        <div>
          <h2><Bi en={<>A real game first.<br/><em>The model comes second.</em></>} zh={<>先做一款真正的游戏。<br/><em>模型是第二层。</em></>}/></h2>
          <p><Bi en="We borrow the readable loop of Vampire Survivors-style roguelites — move, survive, collect, choose an upgrade — then build our own biology-inspired world. Fifty seconds a generation, one predator, three kinds of food, and a mutation draft at the end." zh="我们借鉴 Vampire Survivors 这类 roguelite 清晰易懂的循环——移动、生存、收集、选择升级——但做出自己的生物学世界。一代 50 秒、一个捕食者、三种食物，结束时抽一次突变。"/></p>
        </div>
      </div>
      <div className="gameScreens">
        <figure><img src="/launch-film/frames/frame-0294.jpg" alt="Fruit Fly World arena concept"/><figcaption><Bi en="OUR WORLD / FORAGE, FLEE, RETURN" zh="我们的世界 / 觅食、逃跑、回家"/></figcaption></figure>
        <figure><img src="/launch-film/frames/frame-0519.jpg" alt="Fruit Fly World agent gameplay concept"/><figcaption><Bi en="OUR REFLEX / READ THE LUNGE" zh="我们的反射 / 读懂扑击"/></figcaption></figure>
        <figure><img src="/launch-film/frames/frame-0733.jpg" alt="Fruit Fly World survival game concept"/><figcaption><Bi en="OUR LOOP / RISK OR EXTRACT" zh="我们的循环 / 冒险还是撤离"/></figcaption></figure>
      </div>
    </section>

    <section className="docTiles" aria-label="The game at a glance">
      {tile(["A GENERATION", "一代"], "50", ["LONG AT MOST — THEN THE DRAFT, THEN THE NEXT FLY", "最多这么久——然后抽卡，然后下一只蝇"], ["sec", "秒"])}
      {tile(["THE FOOD", "那些食物"], "3", ["RISK TIERS: SUGAR +12 · YEAST +26 · ROT +38", "三档风险：糖 +12 · 酵母 +26 · 腐烂 +38"], ["tiers", "档"])}
      {tile(["THE ESCAPE", "那次逃脱"], "2 → 1", ["TWO VISUAL STREAMS INTO ONE GIANT FIBER DECISION", "两路视觉输入，汇成一个 Giant Fiber 决定"])}
      {tile(["THE MUTATIONS", "那些突变"], "24", ["CARDS IN THE POOL · THREE OFFERED, ONE TAKEN", "池中卡数 · 每次给三张，拿走一张"], ["cards", "张"])}
    </section>

    <section className="docSection" id="concept">
      <div className="docHead">
        <span><Bi en="00 · THE CORE CONCEPT" zh="00 · 核心概念"/></span>
        <div>
          <h2><Bi en={<>Not a big brain.<br/><em>A few very good circuits.</em></>} zh={<>不是一颗大脑袋，<br/><em>是几条极好的回路。</em></>}/></h2>
          <p><Bi
            en="Fruit flies are small, but their brains are remarkably good at turning smell, light, hunger, and danger into action. We took one of those circuits — the one that decides to jump — and made it the load-bearing piece of a game you can actually play."
            zh="果蝇很小，但它们的大脑很擅长把气味、光线、饥饿和危险变成行动。我们挑出其中一条回路——决定「跳」的那条——把它做成一款真正能玩的游戏的承重结构。"/></p>
        </div>
      </div>
      <div className="docCards four">
        {figure(["THE CIRCUIT", "那条回路"], "Two streams, one decision", ["Angular velocity and looming size are computed separately, then converge on the Giant Fiber. Neither stream alone is the escape.", "角速度和 looming 角尺寸分别计算，然后汇到 Giant Fiber。任何单独一路都不是逃脱。"])}
        {figure(["THE GAME", "这个游戏"], "Read it, then act", ["The reflex bar fills as the predator commits. You do not dodge continuously — you make one timed decision, the way the circuit does.", "捕食者锁定弹道时，反射条在充能。你不是在持续闪避——你只做一个带时机的决定，和回路本身一样。"])}
      </div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="01 · THE PLAY LOOP" zh="01 · 游戏循环"/></span>
        <div>
          <h2><Bi en={<>Short decisions.<br/><em>A longer lineage.</em></>} zh={<>短暂的决定，<br/><em>更长的血脉。</em></>}/></h2>
          <p><Bi
            en="Every generation turns a few seconds of reading and acting into a consequence that is carried forward. The rules are explicit, and the whole loop fits in fifty seconds."
            zh="每一代都把几秒钟的观察与行动，变成一个会被带下去的后果。规则是明确的，整个循环装在 50 秒里。"/></p>
        </div>
      </div>
      <div className="docCards">{loop.map((card) => <article key={card.n}><span>{card.n}</span><h3><Bi en={card.title[0]} zh={card.title[1]}/></h3><p><Bi en={card.body[0]} zh={card.body[1]}/></p></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="02 · THE ESCAPE CIRCUIT" zh="02 · 逃脱回路"/></span>
        <div>
          <h2><Bi en={<>Two inputs.<br/><em>One jump.</em></>} zh={<>两路输入，<br/><em>一次跳跃。</em></>}/></h2>
          <p><Bi
            en="The escape reflex in the game is the one part that is not invented. It follows the visual pathway into the Giant Fiber, with the synapse counts taken from published male brain connectome data."
            zh="游戏里的逃脱反射，是唯一没有凭空发明的部分。它沿着通往 Giant Fiber 的视觉通路走，突触数取自公开的雄性大脑连接组数据。"/></p>
        </div>
      </div>
      <div className="docCards">{circuit.map((card) => <article key={card.tag[0]}><span><Bi en={card.tag[0]} zh={card.tag[1]}/></span><h3>{card.value}</h3><p><Bi en={card.label[0]} zh={card.label[1]}/></p></article>)}</div>
      <div className="docNote"><b><Bi en="THE NUMBERS — " zh="那些数字——"/></b><Bi
        en="LC4 carries 2,442 synapses and LPLC2 carries 1,366; together they account for roughly 99.6% of the Giant Fiber's visual input. Source: Ache et al. 2019 / MaleCNS v1.0."
        zh="LC4 有 2,442 个突触，LPLC2 有 1,366 个；两者合计约占 Giant Fiber 视觉输入的 99.6%。来源：Ache et al. 2019 / MaleCNS v1.0。"/></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="03 · THE CONTROL EXPERIMENT" zh="03 · 对照实验"/></span>
        <div>
          <h2><Bi en={<>Same seed.<br/><em>Real wiring vs shuffled.</em></>} zh={<>同一个种子，<br/><em>真实连接 对 打乱连接。</em></>}/></h2>
          <p><Bi
            en="This is the part you can check without trusting us. The game ships a control experiment: run the same loomings against the real connectivity and against a shuffled version of it, and see whether the wiring is doing any work."
            zh="这是你不用信我们就能核对的部分。游戏自带一个对照实验：让同样的 looming 分别跑真实连接和它的打乱版本，看这套接线到底有没有在起作用。"/></p>
        </div>
      </div>
      <div className="docCards">{trial.map((card) => <article key={card.tag[0]}><span><Bi en={card.tag[0]} zh={card.tag[1]}/></span><h3>{card.value}</h3><p><Bi en={card.label[0]} zh={card.label[1]}/></p></article>)}</div>
      <div className="docNote"><b><Bi en="RUN IT YOURSELF — " zh="自己跑一遍——"/></b><Bi
        en="The experiment is reachable from the game menu, and the simulation module is plain JavaScript with no build step. Change the seed and the numbers move; keep it and they reproduce exactly."
        zh="实验可以从游戏菜单直接跑，仿真模块是不需要构建步骤的纯 JavaScript。换种子，数字会变；不换，数字精确复现。"/></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="04 · THE LINEAGE" zh="04 · 血脉"/></span>
        <div>
          <h2><Bi en={<>Death ends a generation.<br/><em>Not the run.</em></>} zh={<>死亡结束一代，<br/><em>不是整轮。</em></>}/></h2>
          <p><Bi
            en="You are not a fly, you are a lineage. Eggs are the score, mutations are the upgrade, and the wild type is the thing you are trying to outproduce."
            zh="你不是一只蝇，你是一条血脉。卵是分数，突变是升级，而野生型就是你要超过的那个对手。"/></p>
        </div>
      </div>
      <div className="docCards">{lineage.map((card) => <article key={card.tag[0]}><span><Bi en={card.tag[0]} zh={card.tag[1]}/></span><h3>{card.value}</h3><p><Bi en={card.label[0]} zh={card.label[1]}/></p></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="05 · HONEST SCOPE" zh="05 · 诚实边界"/></span>
        <div>
          <h2><Bi en={<>Inspired by a circuit.<br/><em>Not a complete brain.</em></>} zh={<>受回路启发，<br/><em>不是完整的大脑。</em></>}/></h2>
          <p><Bi
            en="The game uses research-informed names as design references. Saying exactly what it is not is part of the design, not a disclaimer bolted on afterwards."
            zh="游戏把研究中的名称当作设计参考。把「它不是什么」说清楚，是设计的一部分，不是事后钉上去的免责声明。"/></p>
        </div>
      </div>
      <div className="docCards">{boundary.map((card) => <article key={card.tag[0]}><span><Bi en={card.tag[0]} zh={card.tag[1]}/></span><h3>{card.value}</h3><p><Bi en={card.label[0]} zh={card.label[1]}/></p></article>)}</div>
    </section>

    <section className="pitchFinal">
      <span><Bi en="THE GAME IS READY TO PLAY" zh="游戏已经可以游玩"/></span>
      <h2><Bi en={<>Give it a signal.<br/><em>See what survives.</em></>} zh={<>给它一个信号，<br/><em>看什么能活下来。</em></>}/></h2>
      <div className="docActions">
        <Link className="primary" href="/play"><Bi en="PLAY" zh="开始游戏"/> <span>↗</span></Link>
        <Link className="secondary" href="/game"><Bi en="HOW IT PLAYS" zh="玩法说明"/> <span>→</span></Link>
      </div>
    </section>
    <footer className="pitchFooter">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <p><Bi en="A connectome-inspired playable model — not a claim that a complete biological brain has been rebuilt. The Passport records participation; it is not an investment, and nothing here is an offer of a security or a return." zh="一个受连接组启发的可玩模型——不是「完整复刻了生物大脑」的宣称。护照记录的是参与，不是投资标的，本页也不构成任何证券或收益的要约。"/></p>
      <div className="docNavLinks"><Link href="/game">THE GAME ↗</Link><Link href="/">LIVE WORLD ↗</Link></div>
    </footer>
  </main>;
}
