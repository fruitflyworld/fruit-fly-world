import type { Metadata } from "next";
import Link from "next/link";
import { Bi, type Bilingual } from "../components/Bi";
import LangToggle from "../components/LangToggle";

export const metadata: Metadata = {
  title: "Fruit Fly World — Participation",
  description: "Play the lineage for free in the browser, keep a soul-bound record of taking part, or hand the escape model to an agent through a documented interface."
};

const layers: { n: string; tag: Bilingual; title: Bilingual; body: Bilingual }[] = [
  { n: "01", tag: ["FREE · NO WALLET", "免费 · 无需钱包"], title: ["Play the lineage", "玩这条血脉"], body: ["Open /play and start a generation. No account, no install, no signature. Your lineage is saved in your own browser, and nothing about the game requires a chain.", "打开 /play 开始一代。不要账号、不用安装、不用签名。血脉存在你自己的浏览器里，游戏本身没有任何一环依赖链。"] },
  { n: "02", tag: ["OPTIONAL · SOUL-BOUND", "可选 · 灵魂绑定"], title: ["Keep a record", "留一份记录"], body: ["A Passport is a non-transferable ERC-721 that says you were here. It is a participation record, not a yield-bearing asset, and the game is fully playable without one.", "护照是一份不可转让的 ERC-721，用来记录你来过。它是参与记录，不是生息资产；没有它，游戏照样完整可玩。"] },
  { n: "03", tag: ["OPEN INTERFACE", "开放接口"], title: ["Bring an agent", "带上 agent"], body: ["The public escape model and separate arena scoring rule are plain JavaScript with a documented interface, so an autonomous process can reproduce the published rules.", "公开的逃脱模型和独立的竞技场评分规则是不带构建步骤的 JavaScript，接口有文档，所以自主进程可以复现公开规则。"] }
];

const tiers: { n: string; title: Bilingual; price: string; body: Bilingual }[] = [
  { n: "01", title: ["FREE", "免费"], price: "0 ETH + GAS", body: ["Pass a verified mission — a win in the arena, an agent run, a quoted post. Missions are listed with the mint.", "通过一个已验证任务——竞技场获胜、agent 运行、引用发帖。任务清单随铸造一起列出。"] },
  { n: "02", title: ["HALF", "半价"], price: "publicMintPrice / 2", body: ["Enter a recorded arena window. The claim is the server-verified entry — you do not have to win. Local /play saves do not create this qualification.", "进入一个有记录的竞技场窗口。资格来自服务端验证的进入记录——不必赢下。本地 /play 存档不会产生这项资格。"] },  { n: "03", title: ["FULL", "全价"], price: "publicMintPrice", body: ["Public mint. No task, no history, no wait.", "公开铸造。不需要任务、不需要历史、不需要等待。"] }
];

const guards: { title: Bilingual; body: Bilingual }[] = [
  { title: ["NOT TRANSFERABLE", "不可转让"], body: ["The contract blocks transfer, approval, listing and gifting. One wallet, one Passport, permanently — which also means no secondary market and no floor price.", "合约禁止转让、授权、挂单和赠予。一个钱包一份护照，永久有效——这同时意味着没有二级市场，也没有地板价。"] },
  { title: ["NO CUSTODY, NO GAS FOR YOU", "不托管，你不用付 gas"], body: ["Signing in is a signature, not a transaction. The site never takes custody of anything and never asks for a private key.", "登录只是一次签名，不是一笔交易。本站从不托管任何东西，也从不索要私钥。"] },
  { title: ["NOTHING ON SALE TODAY", "今天没有任何东西在售"], body: ["No token, no pool, no percentage and no date. The Passport records participation; it is not an investment and nothing here is an offer of a return. If an incentive layer ever ships, it arrives as a separate, clearly labelled design.", "没有代币、没有池子、没有比例、没有时间表。护照记录的是参与，不是投资标的，本页也不构成任何收益要约。如果将来有激励层，它会以独立、明确标注的设计形式出现。"] },
  { title: ["THE MODEL IS PUBLIC", "模型是公开的"], body: ["The escape circuit, its synapse counts, the wiring check and the game's rules are all readable — you can reproduce the numbers instead of taking them on faith.", "逃脱回路、它的突触数、连线核对和游戏规则全部可读——你可以把数字复现出来，而不必凭信。"] }
];

export default function ParticipatePage() {
  return <main className="pitchPage docPage">
    <nav className="pitchNav docNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="docNavLinks"><Link href="/pitch">PITCH</Link><Link href="/game">GAME</Link><Link href="/economics">ECONOMICS</Link><Link href="/participate">PARTICIPATION</Link></div>
      <div className="docNavEnd"><Link href="/play">PLAY ↗</Link><LangToggle/></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i/><Bi en="PARTICIPATION / THREE WAYS IN" zh="参与 / 三种进入方式"/></div>
      <h1><Bi en={<>Play it.<br/>Or keep a record.<br/><em>Or bring an agent.</em></>} zh={<>玩它。<br/>或者留个记录。<br/><em>或者带上 agent。</em></>}/></h1>
      <p><Bi
        en={<>Playing Fruit Fly World costs nothing and asks for nothing: open the game, and you are in. Everything past that — a soul-bound record of taking part, an agent running the same model — is optional and additive, never a gate in front of the game.</>}
        zh={<>玩 Fruit Fly World 不花钱，也不要你给任何东西：打开游戏，你就在里面了。除此之外的一切——一份灵魂绑定的参与记录、一个跑同一套模型的 agent——都是可选和叠加的，永远不是挡在游戏前面的门槛。</>}/></p>
      <div className="pitchHeroActions">
        <Link className="primary" href="/play"><Bi en="PLAY" zh="开始游戏"/> <span>↗</span></Link>
        <a className="secondary" href="#layers"><Bi en="SEE THE LAYERS" zh="看参与层次"/> <span>↓</span></a>
      </div>
      <div className="pitchPromise">
        <span><Bi en="NO ACCOUNT" zh="无需账号"/></span>
        <span><Bi en="NO INSTALL" zh="无需安装"/></span>
        <span><Bi en="LOCAL SAVE" zh="本地存档"/></span>
        <span><Bi en="OPEN MODEL" zh="开放模型"/></span>
      </div>
    </header>

    <section className="docSection" id="layers">
      <div className="docHead">
        <span><Bi en="01 · THE LAYERS" zh="01 · 参与层次"/></span>
        <div>
          <h2><Bi en={<>The game is the floor.<br/><em>Everything else stacks on it.</em></>} zh={<>游戏是地板，<br/><em>其它都叠在它上面。</em></>}/></h2>
          <p><Bi
            en="Each layer below stands on its own. You can stop at the first one and lose nothing."
            zh="下面每一层都能独立成立。你停在第一层，也不会失去什么。"/></p>
        </div>
      </div>
      <div className="docSteps">{layers.map((layer) => <article key={layer.n}><span>{layer.n}</span><div><h3><Bi en={layer.title[0]} zh={layer.title[1]}/></h3><p><Bi en={layer.body[0]} zh={layer.body[1]}/></p><small><Bi en={layer.tag[0]} zh={layer.tag[1]}/></small></div></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="02 · THE PASSPORT" zh="02 · 护照"/></span>
        <div>
          <h2><Bi en={<>Three ways to get one.<br/><em>None of them are a purchase of value.</em></>} zh={<>三种拿到它的方式，<br/><em>没有一种是购买价值。</em></>}/></h2>
          <p><Bi
            en="The Passport is an ERC-721 on Sepolia at 4,444 supply. It cannot be sold, so the only thing it can be is a record — and the price tiers exist to make taking part cheaper than not taking part."
            zh="护照是 Sepolia 上的 ERC-721，总量 4,444。它不能卖，所以它唯一能成为的东西就是一份记录——而分档的存在，是为了让参与比不参与更便宜。"/></p>
        </div>
      </div>
      <div className="docLadder">
        {tiers.map((tier) => <article key={tier.n}><span>{tier.n}</span><h3><Bi en={tier.title[0]} zh={tier.title[1]}/></h3><b>{tier.price}</b><p><Bi en={tier.body[0]} zh={tier.body[1]}/></p></article>)}
      </div>
      <div className="docNote"><b><Bi en="LIVE NUMBERS — " zh="实时数字——"/></b><Bi
        en="the deployed contract's supply, its public mint price and the tier arithmetic are read live on the economics page, not quoted from a document."
        zh="已部署合约的总量、公开铸造价和档位算式，都在经济学页上实时读取，而不是从某份文档里抄来的。"/></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="03 · WHAT IS AND ISN'T CLAIMED" zh="03 · 什么被宣称，什么没有"/></span>
        <div>
          <h2><Bi en={<>A record of taking part.<br/><em>Not a promise of return.</em></>} zh={<>一份参与记录，<br/><em>不是回报承诺。</em></>}/></h2>
          <p><Bi
            en="Four rules that hold regardless of what happens to the project."
            zh="四条规则，无论项目后来怎样都成立。"/></p>
        </div>
      </div>
      <div className="docCards four">{guards.map((guard) => <article key={guard.title[0]}><span>◆</span><h3><Bi en={guard.title[0]} zh={guard.title[1]}/></h3><p><Bi en={guard.body[0]} zh={guard.body[1]}/></p></article>)}</div>
    </section>

    <section className="docBoundary">
      <h2><Bi en="Status, stated plainly." zh="状态，直说。"/></h2>
      <div>
        <article><b><Bi en="LIVE NOW" zh="现在已上线"/></b><p><Bi en="The playable lineage game, the connectome-inspired escape model, the reproducible wiring check, the deployed Genesis Passport and the documented agent interface." zh="可玩的果蝇血统游戏、受连接组启发的逃脱模型、可复现的连线核对、已部署的 Genesis 护照，以及有文档的 agent 接口。"/></p></article>
        <article><b><Bi en="NEXT" zh="接下来"/></b><p><Bi en="Deeper mutation behaviour, multi-predator encounters, and seeded daily challenges built on the same generation loop." zh="更深入的突变行为、多捕食者遭遇，以及建立在同一套「一代」循环之上的每日种子挑战。"/></p></article>
        <article><b><Bi en="NOT A CLAIM" zh="不是宣称"/></b><p><Bi en="This is not a complete fruit-fly brain, not a neuron-by-neuron simulation, and not a financial product. No token, yield or future value is promised." zh="这不是完整的果蝇大脑，不是逐神经元的仿真，也不是金融产品。不承诺任何代币、收益或未来价值。"/></p></article>
      </div>
    </section>

    <section className="pitchFinal">
      <span><Bi en="THE GAME IS READY TO PLAY" zh="游戏已经可以游玩"/></span>
      <h2><Bi en={<>One generation.<br/><em>Fifty seconds.</em></>} zh={<>一代。<br/><em>五十秒。</em></>}/></h2>
      <div className="docActions">
        <Link className="primary" href="/play"><Bi en="PLAY" zh="开始游戏"/> <span>↗</span></Link>
        <Link className="secondary" href="/#agents"><Bi en="FOR AGENTS" zh="给 agent"/> <span>→</span></Link>
      </div>
    </section>
    <footer className="pitchFooter">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <p><Bi en="The escape model, its wiring check and the game rules are public. Reproduce the numbers yourself." zh="逃脱模型、它的连线核对和游戏规则都是公开的。数字你自己复现。"/></p>
      <div className="docNavLinks"><Link href="/pitch">PITCH ↗</Link><Link href="/economics">ECONOMICS ↗</Link><Link href="/">LIVE WORLD ↗</Link></div>
    </footer>
  </main>;
}
