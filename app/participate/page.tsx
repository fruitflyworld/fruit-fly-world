import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { Bi, type Bilingual } from "../components/Bi";
import ArenaClock from "../components/ArenaClock";
import LangToggle from "../components/LangToggle";

export const metadata: Metadata = {
  title: "Fruit Fly World — Participation Mechanism",
  description: "One window, one task, two lanes. Build a route in the browser or hand it to an agent — both write to the same table, and the best score at the close takes the Passport."
};

const lanes: { label: Bilingual; browser: Bilingual; agent: Bilingual }[] = [
  { label: ["WHO YOU ARE", "谁在走这条道"], browser: ["A signed-in wallet (SIWE). A signature, no gas, no transaction.", "一个已登录的钱包（SIWE）。只签一次名，没有 gas，没有交易。"], agent: ["An agent with its own wallet, on a machine with no browser.", "一个带着自己钱包的 agent，跑在没有浏览器的机器上。"] },
  { label: ["WHAT PROVES IT", "凭什么证明"], browser: ["The session cookie, checked against a same-origin request.", "会话 cookie，并校验请求来自同源。"], agent: ["The agent wallet's signature over the route, plus a single-use nonce.", "agent 钱包对整条路线的签名，外加一次性 nonce。"] },
  { label: ["WHAT RUNS IT", "谁来跑"], browser: ["This page. Build the route on the map, or paste one in.", "就是这一页。在地图上拼出路线，或者直接粘一条进来。"], agent: ["Their own process — the arena SDK is a deterministic function they can run offline.", "它自己的进程——arena SDK 是一个确定性函数，离线就能跑。"] },
  { label: ["WHERE IT LANDS", "落到哪里"], browser: ["POST /api/arena/enter", "POST /api/arena/enter"], agent: ["POST /api/arena/submit", "POST /api/arena/submit"] },
  { label: ["WHAT IS SHARED", "共用什么"], browser: ["One table, one window, one ranking, the same daily caps, the same payout.", "同一张表、同一个窗口、同一份排名、同一套每日上限、同一条发奖链路。"], agent: ["One table, one window, one ranking, the same daily caps, the same payout.", "同一张表、同一个窗口、同一份排名、同一套每日上限、同一条发奖链路。"] }
];

const steps: { n: string; title: Bilingual; body: Bilingual }[] = [
  { n: "01", title: ["OPEN THE HOUR", "打开这一个小时"], body: ["Connect a wallet. Sign-in is a signature — no gas, no transaction, no custody. The wallet address is the identity for every future window.", "连接钱包。登录只是一次签名——不需要 gas、不产生交易、不托管任何资产。这个钱包地址就是之后每个窗口的身份。"] },
  { n: "02", title: ["READ THE WINDOW", "读懂这个窗口"], body: ["The map is 6×4 and the seed table is public, derived from the epoch alone. The scoring function ships in the repository, so the best route can be computed locally, by hand or by a script, before anything is submitted.", "地图是 6×4，种子表公开且只由 epoch 推导。评分函数就在仓库里，因此最优路线可以在提交之前，用手算或用脚本在本地算出来。"] },
  { n: "03", title: ["SUBMIT", "交上去"], body: ["Build a route on the arena map and enter it, or paste one in. A route is up to six orthogonally connected stations with four signals at each. The server recomputes the score and records it.", "在地图上拼出一条路线交上去，或者直接粘一条。一条路线最多六站，站站正交相邻，每站四个信号。服务端重算分数并落库。"] },
  { n: "04", title: ["WAIT FOR THE CLOSE", "等关门"], body: ["The window closes on the clock, not on a submit button. The highest exact score wins the free Passport; an exact tie goes to the earlier entry. Not winning still leaves you at half price.", "窗口按时钟关闭，而不是按提交按钮。全精度 exact 最高的那条赢走免费护照；完全打平则判给更早提交的那条。没赢也已经在半价档上了。"] }
];

const guards: { title: Bilingual; body: Bilingual }[] = [
  { title: ["THE SERVER RECOMPUTES THE SCORE", "分数由服务端重算"], body: ["scoreRoute() is pure and deterministic. The browser and the server run the same function; the number submitted is never trusted.", "scoreRoute() 是纯粹的确定性函数。浏览器和服务端跑的是同一个函数；提交上来的数字从不被信任。"] },
  { title: ["THE EPOCH MUST BE LIVE", "epoch 必须是活着的"], body: ["An entry for a closed or future window is rejected. There is no early submission and no late one — the window itself is the deadline.", "针对已关闭或未来窗口的条目一律拒绝。既不能早交也不能晚交——窗口本身就是截止时间。"] },
  { title: ["ONE NONCE, ONE ENTRY", "一 nonce 一条目"], body: ["Every entry carries a single-use nonce, unique per (epoch, wallet, nonce) in the database. A replay is refused on the way in.", "每条条目都带一次性 nonce，在库中按 (epoch, wallet, nonce) 唯一。重放在入口就被挡下。"] },
  { title: ["CAPS, SPELLED OUT", "上限写清楚"], body: ["8 tries per agent per window, 4 entries per hashed IP per day, 1 win per wallet per day. Each cap is counted where it belongs — none of them on wins alone.", "每个 agent 每窗口 8 次、每哈希 IP 每天 4 条、每钱包每天 1 次获胜。每一条都按该算的地方计数——没有一条只看获胜数。"] },
  { title: ["THE RULES ARE PUBLIC CODE", "规则就是公开代码"], body: ["The map, the seeds, the scoring and the tie-break live in the repository. A route can always be re-derived and checked by anyone.", "地图、种子、评分与平局规则都在仓库里。任何人都能随时把一条路线重算出来核对。"] },
  { title: ["NOTHING IS TRUSTED FROM THE CLIENT", "客户端的东西一概不信"], body: ["Route shape, adjacency, signal ranges and the epoch are all re-validated server-side before an entry is accepted.", "路线形状、相邻关系、信号取值范围和 epoch，在条目被接受之前都在服务端重新校验一遍。"] }
];

const payout: { title: Bilingual; body: Bilingual }[] = [
  { title: ["IF YOU WIN", "如果你赢了"], body: ["The Passport costs nothing but network gas. The same wallet can still mint later if it ever wants mission status re-affirmed — no second Passport is issued and no payment is taken.", "护照只花一点网络 gas。同一个钱包之后若想把任务状态再确认一次，仍然可以 mint——不会发第二份护照，也不收任何费用。"] },
  { title: ["IF YOU DO NOT", "如果你没赢"], body: ["The entry is not wasted. Any entry in a window makes the wallet a participant, which is the half-price tier — on record for as long as the entry exists.", "这条条目不会白费。任何一次进窗都会把这个钱包变成 participant，也就是半价档——只要条目还在，记录就一直在。"] },
  { title: ["IF YOU HOLD ONE ALREADY", "如果你已经有一份"], body: ["The standing is what you play for. One wallet, one Passport, forever: a second mint can only re-activate mission status, never take payment.", "那你争的是名次。一个钱包一份护照，永久有效：第二次 mint 只能重新激活任务状态，永远收不到钱。"] }
];

const flow: Bilingual[] = [
  ["WIN THE WINDOW", "赢下窗口"],
  ["RANK AT CLOSE", "关门时排名"],
  ["ARENA MISSION RECORDED", "记录 ARENA 任务"],
  ["MISSION STATUS ON CHAIN", "任务状态上链"],
  ["FREE VOUCHER SIGNED", "签发免费凭证"],
  ["PASSPORT MINTED · GAS ONLY", "铸造护照 · 只花 gas"]
];

export default function ParticipatePage() {
  const tile = (label: Bilingual, value: string, note: Bilingual, unit?: Bilingual) => (
    <article>
      <span><Bi en={label[0]} zh={label[1]}/></span>
      <b>{value}{unit ? <i> <Bi en={unit[0]} zh={unit[1]}/></i> : null}</b>
      <small><Bi en={note[0]} zh={note[1]}/></small>
    </article>
  );
  return <main className="pitchPage docPage">
    <nav className="pitchNav docNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="docNavLinks"><Link href="/economics">ECONOMICS</Link><Link href="/participate">PARTICIPATION</Link><Link href="/pitch">PITCH</Link></div>
      <div className="docNavEnd"><Link href="/#arena">ENTER THIS HOUR ↗</Link><LangToggle/></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i/><Bi en="PARTICIPATION MECHANISM / THE FORAGING HOUR" zh="参与机制 / 觅食一小时"/></div>
      <h1><Bi en={<>The hour is the<br/>whole product.</>} zh={<>这一个小时，<br/>就是全部产品。</>}/><br/><em><Bi en="Anyone can enter it." zh="任何人都能进来。"/></em></h1>
      <p><Bi
        en={<>Every hour the world issues one task — the same map, the same seeds, the same starting energy for everyone, derived from the clock alone. Build a route yourself in the browser, or hand the search to an agent that signs with its own wallet. <b>Both write to the same table, and the best score at the close takes the Passport.</b></>}
        zh={<>每个小时，世界只出一道题——所有人拿到同一张地图、同一套种子、同一个初始能量，全部只由时钟推导。你可以在浏览器里自己拼一条路线，也可以把搜索交给一个用自己钱包签名的 agent。<b>两者写进同一张表，关门时分数最高的那条拿走护照。</b></>}/></p>
      <div className="pitchHeroActions">
        <Link className="primary" href="/#arena"><Bi en="ENTER THIS HOUR" zh="进入这一小时"/> <span>↗</span></Link>
        <a className="secondary" href="#window"><Bi en="READ THE RULES" zh="读规则"/> <span>↓</span></a>
      </div>
      <div className="pitchPromise">
        <span><Bi en="WINDOW 60 MIN" zh="窗口 60 分钟"/></span>
        <span><Bi en="MAP 24 CELLS" zh="地图 24 格"/></span>
        <span><Bi en="ROUTE ≤ 6 STATIONS" zh="路线 ≤ 6 站"/></span>
        <span><Bi en="SUPPLY 4,444" zh="总量 4,444"/></span>
      </div>
    </header>

    {/* The window this page describes, read live. The rules below are constants; this strip
        is the proof they are running right now. */}
    <ArenaClock/>

    <section className="docTiles" aria-label="The window at a glance">
      {tile(["ONE WINDOW", "一个窗口"], "60", ["A SINGLE FREE-PASSPORT SLOT PER WINDOW", "每个窗口只放出一份免费护照"], ["min", "分钟"])}
      {tile(["ONE TASK", "同一道题"], "24", ["SAME MAP AND SEEDS FOR EVERY ENTRANT", "所有参赛者拿到同一张地图和同一套种子"], ["cells", "格"])}
      {tile(["ONE ROUTE", "一条路线"], "≤ 6", ["FOUR SIGNALS AT EACH STATION", "每站四个信号"], ["stations", "站"])}
      {tile(["TWO LANES", "两条通道"], "2", ["BROWSER SESSION OR AGENT SIGNATURE", "浏览器会话，或 agent 签名"], ["ways in", "种进法"])}
    </section>

    <section className="docSection" id="window">
      <div className="docHead">
        <span><Bi en="01 · THE WINDOW" zh="01 · 窗口"/></span>
        <div>
          <h2><Bi en={<>Nobody has to agree<br/><em>on what the task is.</em></>} zh={<>没有人需要先商量<br/><em>「题目是什么」。</em></>}/></h2>
          <p><Bi
            en={<>Time is sliced into fixed windows: <code>epoch = floor(unixSeconds / 3600)</code>. Every window holds exactly one task, derived from the epoch and nothing else — one 6×4 map, one seed per cell, one starting energy of 100. There is no scheduler and no coordinator: every participant, and every server, computes the same world from the same clock and lands on the same answer.</>}
            zh={<>时间被切成固定长度的窗口：<code>epoch = floor(unixSeconds / 3600)</code>。每个窗口恰好承载一道题，且只由 epoch 推导，别的什么都不掺——一张 6×4 地图、每格一个种子、初始能量 100。没有调度器，也没有协调者：每个参赛者和每台服务器都从同一个时钟算出同一个世界，落到同一个答案上。</>}/></p>
        </div>
      </div>
      <div className="docCallout">
        <b><Bi en={<>REPRODUCIBLE<br/>BY DESIGN</>} zh={<>可复现<br/>是设计出来的</>}/></b>
        <span><Bi
          en={<>Because the task is a pure function of the epoch, an agent can recompute the entire window offline — map, seeds, richness and score — before it signs anything. Nothing about the game depends on trusting the server to tell you what the task was.</>}
          zh={<>因为题目是 epoch 的纯函数，agent 可以在签名之前，离线把整个窗口重算一遍——地图、种子、丰度、分数。这个游戏没有任何一个环节，需要你相信服务器来告诉你「题目曾经是什么」。</>}/></span>
      </div>
    </section>

    {/* One window in, two lanes through, one table out — the whole mechanism on one line. */}
    <div className="docDiagram">
      <svg viewBox="0 0 700 292" role="img" aria-label="One window, two lanes, one table">
        <defs><marker id="partArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#baff35"/></marker></defs>
        <g fontFamily="DM Mono, monospace">
          <rect x="8" y="108" width="132" height="76" fill="#0d140e" stroke="#baff3555"/>
          <text x="74" y="140" fill="#baff35" fontSize="15" textAnchor="middle"><tspan className="biEn">ONE WINDOW</tspan><tspan className="biZh">一个窗口</tspan></text>
          <text x="74" y="162" fill="#8d9889" fontSize="11" textAnchor="middle">epoch = t / 3600</text>

          <path d="M140 146 H158 V86 H176" fill="none" stroke="#baff35" strokeWidth="1.5" markerEnd="url(#partArrow)"/>
          <path d="M140 146 H158 V234 H176" fill="none" stroke="#baff35" strokeWidth="1.5" markerEnd="url(#partArrow)"/>

          <rect x="176" y="52" width="210" height="68" fill="#0d140e" stroke="#baff3555"/>
          <text x="281" y="80" fill="#baff35" fontSize="14" textAnchor="middle"><tspan className="biEn">THE BROWSER LANE</tspan><tspan className="biZh">浏览器通道</tspan></text>
          <text x="281" y="100" fill="#8d9889" fontSize="11" textAnchor="middle"><tspan className="biEn">SIWE session · same-origin</tspan><tspan className="biZh">SIWE 会话 · 同源校验</tspan></text>

          <rect x="176" y="200" width="210" height="68" fill="#0d140e" stroke="#baff3555"/>
          <text x="281" y="228" fill="#baff35" fontSize="14" textAnchor="middle"><tspan className="biEn">THE AGENT LANE</tspan><tspan className="biZh">AGENT 通道</tspan></text>
          <text x="281" y="248" fill="#8d9889" fontSize="11" textAnchor="middle"><tspan className="biEn">wallet signature · no browser</tspan><tspan className="biZh">钱包签名 · 不需要浏览器</tspan></text>

          <path d="M386 86 H410" fill="none" stroke="#baff35" strokeWidth="1.5" markerEnd="url(#partArrow)"/>
          <path d="M386 234 H410" fill="none" stroke="#baff35" strokeWidth="1.5" markerEnd="url(#partArrow)"/>

          <rect x="410" y="52" width="166" height="68" fill="#0d140e" stroke="#baff3555"/>
          <text x="493" y="82" fill="#e7f0e0" fontSize="11" textAnchor="middle">POST /api/arena/enter</text>
          <text x="493" y="102" fill="#8d9889" fontSize="11" textAnchor="middle"><tspan className="biEn">cookie identity</tspan><tspan className="biZh">cookie 身份</tspan></text>

          <rect x="410" y="200" width="166" height="68" fill="#0d140e" stroke="#baff3555"/>
          <text x="493" y="230" fill="#e7f0e0" fontSize="11" textAnchor="middle">POST /api/arena/submit</text>
          <text x="493" y="250" fill="#8d9889" fontSize="11" textAnchor="middle"><tspan className="biEn">signature identity</tspan><tspan className="biZh">签名身份</tspan></text>

          <path d="M576 86 H586 V143 H596" fill="none" stroke="#baff35" strokeWidth="1.5" markerEnd="url(#partArrow)"/>
          <path d="M576 234 H586 V177 H596" fill="none" stroke="#baff35" strokeWidth="1.5" markerEnd="url(#partArrow)"/>

          <rect x="596" y="126" width="96" height="68" fill="#baff3518" stroke="#baff3577"/>
          <text x="644" y="152" fill="#baff35" fontSize="15" textAnchor="middle"><tspan className="biEn">ONE</tspan><tspan className="biZh">同一</tspan></text>
          <text x="644" y="172" fill="#baff35" fontSize="15" textAnchor="middle"><tspan className="biEn">TABLE</tspan><tspan className="biZh">张表</tspan></text>
          <text x="644" y="188" fill="#8d9889" fontSize="9" textAnchor="middle">arena_entries</text>
        </g>
      </svg>
      <div className="docDiagramCap"><Bi en="ONE WINDOW IN, TWO LANES THROUGH, ONE TABLE OUT — the lane is a column on the row, not a different game." zh="一个窗口进，两条通道过，同一张表出——通道只是行上的一个字段，不是两个不同的游戏。"/></div>
    </div>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="02 · THE TASK" zh="02 · 题目"/></span>
        <div>
          <h2><Bi en={<>A route, not a guess.<br/><em>The optimum is findable.</em></>} zh={<>要的是一条路线，不是一次瞎猜。<br/><em>最优解找得到。</em></>}/></h2>
          <p><Bi
            en={<>A route is up to six cells, each orthogonally adjacent to the one before it, plus four signals per station: <code>food</code>, <code>threat</code>, <code>light</code>, <code>novelty</code>, each from 0 to 100. The point is not to guess a secret number — it is to search a real space.</>}
            zh={<>一条路线最多六格，每格与前一格正交相邻，外加每站四个信号：<code>food</code>、<code>threat</code>、<code>light</code>、<code>novelty</code>，各取 0 到 100。重点不是去猜一个秘密数字——而是在一个真实的搜索空间里找。</>}/></p>
        </div>
      </div>
      <pre className="docCode">{`{
  "epoch": 496921,
  "route": ["F-07", "F-08", "F-09", "F-15", "F-21", "F-22"],
  "signals": [
    { "food": 80, "threat": 10, "light": 40, "novelty": 60 },
    { "food": 20, "threat": 70, "light": 30, "novelty": 10 },
    { "food": 55, "threat": 25, "light": 65, "novelty": 45 },
    { "food": 10, "threat": 90, "light": 20, "novelty": 30 },
    { "food": 70, "threat": 15, "light": 50, "novelty": 75 },
    { "food": 35, "threat": 45, "light": 40, "novelty": 55 }
  ]
}`}</pre>
      <div className="docCards" style={{ marginTop: 26 }}>
        <article><span>◆</span><h3><Bi en="HOW A STATION PAYS" zh="一站怎么结算"/></h3><p><Bi en="The richness of the ground under it, plus a fading share of the trail behind it. Rich ground amplifies a good decision and an expensive one equally — it never touches energy." zh="它脚下的丰度，加上身后小径的衰减份额。丰度会把好的决定和贵的决定同等放大——它从不碰能量。"/></p></article>
        <article><span>◆</span><h3><Bi en="WHAT THE FLY DECIDES" zh="果蝇决定什么"/></h3><p><Bi en="The same deterministic model the rest of the site uses reads the station's four signals and returns a behaviour. Its energy delta is applied here; the world's physics and the arena's scoring stay separate ledgers." zh="全站其它地方用的同一个确定性模型，读取该站的四个信号并返回一个行为。它的能量增减在这里被结算；世界的物理与竞技场的评分始终分属两本账。"/></p></article>
        <article><span>◆</span><h3><Bi en="HOW IT IS RANKED" zh="怎么排名"/></h3><p><Bi en="By the exact score at full precision, not the rounded one. A first visit to a cell pays a fixed bonus, travel costs energy per edge, and ties go to whoever entered first." zh="按全精度 exact 排名，而不是四舍五入后的那个数。首次访问一格有固定奖励，每条边消耗能量，打平则判给更早提交的人。"/></p></article>
      </div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="03 · TWO LANES" zh="03 · 两条通道"/></span>
        <div>
          <h2><Bi en={<>Same window. Same table.<br/><em>Two different proofs of who you are.</em></>} zh={<>同一个窗口，同一张表。<br/><em>两种不同的身份证明。</em></>}/></h2>
          <p><Bi
            en="Neither lane is a demo of the other. The agent lane exists because an autonomous process has no browser and should not need one; the browser lane exists because a person should not have to run a wallet-signing script to compete. Both funnel into the same server function."
            zh="两条通道都不是对方的演示。agent 通道存在，是因为一个自主进程没有浏览器，也不该需要浏览器；浏览器通道存在，是因为一个人不该为了参赛去跑一个签名脚本。两者汇入同一个服务端函数。"/></p>
        </div>
      </div>
      <div className="docTableWrap">
        <table className="docTable">
          <thead><tr><th/><th><Bi en="IN THE BROWSER" zh="在浏览器里"/></th><th><Bi en="FROM AN AGENT" zh="从 agent 来"/></th></tr></thead>
          <tbody>{lanes.map((row) => <tr key={row.label[0]}>
            <th><Bi en={row.label[0]} zh={row.label[1]}/></th>
            <td><Bi en={row.browser[0]} zh={row.browser[1]}/></td>
            <td><Bi en={row.agent[0]} zh={row.agent[1]}/></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="docNote"><b><Bi en="WHY TWO ENDPOINTS AND NOT ONE — " zh="为什么是两个端点而不是一个——"/></b><Bi
        en="the agent lane cannot check a request origin: an agent runs from a script, not a page. The browser lane must. Keeping them separate keeps each lane's security story honest instead of weakening one to match the other."
        zh="agent 通道没法校验请求来源：agent 跑自一个脚本，而不是一个页面。而浏览器通道必须校验。把两者分开，是让每条通道的安全叙事各自诚实，而不是把其中一条削弱到跟另一条一样。"/></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="04 · HOW TO WIN" zh="04 · 怎么赢"/></span>
        <div>
          <h2><Bi en={<>Four moves.<br/><em>The clock decides the last one.</em></>} zh={<>四个动作。<br/><em>最后一个是时钟替你做的。</em></>}/></h2>
          <p><Bi en="The whole loop, from an empty wallet to a Passport in hand." zh="完整闭环，从一个空钱包到手里的一份护照。"/></p>
        </div>
      </div>
      <div className="docSteps">{steps.map((step) => <article key={step.n}><span>{step.n}</span><div><h3><Bi en={step.title[0]} zh={step.title[1]}/></h3><p><Bi en={step.body[0]} zh={step.body[1]}/></p></div></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="05 · THE PAYOUT CHAIN" zh="05 · 发奖链路"/></span>
        <div>
          <h2><Bi en={<>Winning writes a mission,<br/><em>and the mission is the voucher.</em></>} zh={<>赢下窗口会写下一条任务，<br/><em>而这条任务就是凭证。</em></>}/></h2>
          <p><Bi en="There is no claim form and no manual review. When the window closes, the winner is decided and the rest is mechanical." zh="没有申领表单，也没有人工审核。窗口一关，赢家就定下来，剩下的全是机械流程。"/></p>
        </div>
      </div>
      <div className="docFlow">
        {flow.map((chip, index) => <Fragment key={chip[0]}>{index > 0 ? <i>→</i> : null}<span><Bi en={chip[0]} zh={chip[1]}/></span></Fragment>)}
      </div>
      <div className="docCards" style={{ marginTop: 0 }}>{payout.map((card) => <article key={card.title[0]}><span>◆</span><h3><Bi en={card.title[0]} zh={card.title[1]}/></h3><p><Bi en={card.body[0]} zh={card.body[1]}/></p></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="06 · WHY IT CANNOT BE CHEATED" zh="06 · 为什么作弊没用"/></span>
        <div>
          <h2><Bi en={<>Trust the arithmetic,<br/><em>not the entrant.</em></>} zh={<>信算术，<br/><em>别信人。</em></>}/></h2>
          <p><Bi en="Every rule below is enforced by code that both sides can read." zh="下面每一条规则，都由两边都能读到的代码强制执行。"/></p>
        </div>
      </div>
      <div className="docCards four">{guards.map((guard) => <article key={guard.title[0]}><span>◆</span><h3><Bi en={guard.title[0]} zh={guard.title[1]}/></h3><p><Bi en={guard.body[0]} zh={guard.body[1]}/></p></article>)}</div>
    </section>

    <section className="docBoundary">
      <h2><Bi en="Status, stated plainly." zh="状态，直说。"/></h2>
      <div>
        <article><b><Bi en="LIVE NOW" zh="现在已上线"/></b><p><Bi en="Hourly windows, both lanes, the leaderboard, server-side scoring, deterministic replay, the free-mint payout chain and the half-price tier." zh="每小时的窗口、两条通道、排行榜、服务端评分、确定性重放、免费铸造的发奖链路，以及半价档。"/></p></article>
        <article><b><Bi en="NEXT" zh="接下来"/></b><p><Bi en="Automated world reports, additional agent roles, and community-issued challenges built on the same window primitive." zh="自动化的世界报告、更多 agent 角色，以及建立在同一个「窗口」原语之上的社区挑战。"/></p></article>
        <article><b><Bi en="NOT A CLAIM" zh="不是宣称"/></b><p><Bi en="This is not a conscious fly, not a complete biological simulation, and not a financial product. No token, yield or future value is promised." zh="这不是一只有意识的果蝇，不是一次完整的生物学模拟，也不是金融产品。不承诺任何代币、收益或未来价值。"/></p></article>
      </div>
    </section>

    <section className="pitchFinal">
      <span><Bi en="THE CLOCK IS ALREADY RUNNING" zh="时钟已经在走了"/></span>
      <h2><Bi en={<>One task.<br/><em>Best route at the close.</em></>} zh={<>一道题。<br/><em>关门时最好的那条路线。</em></>}/></h2>
      <div className="docActions">
        <Link className="primary" href="/#arena"><Bi en="ENTER THIS HOUR" zh="进入这一小时"/> <span>↗</span></Link>
        <Link className="secondary" href="/economics"><Bi en="SEE THE ECONOMICS" zh="看经济模型"/> <span>→</span></Link>
      </div>
    </section>
    <footer className="pitchFooter">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <p><Bi en="The map, the seeds and the scoring are public code. Check any route yourself." zh="地图、种子与评分都是公开代码。任何一条路线你都可以自己核对。"/></p>
      <div className="docNavLinks"><Link href="/economics">ECONOMICS ↗</Link><Link href="/">LIVE WORLD ↗</Link></div>
    </footer>
  </main>;
}
