import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { createPublicClient, formatEther, http } from "viem";
import { configuredChain } from "../lib/chain";
import { publicMintConfiguration } from "../lib/server/mint-voucher";
import { Bi, type Bilingual } from "../components/Bi";
import LangToggle from "../components/LangToggle";

export const metadata: Metadata = {
  title: "Fruit Fly World — Economic Model",
  description: "4,444 soul-bound Passports. One live price on chain, three rungs: free, half, full. The flywheel and the token era follow — labelled as roadmap, not shipped."
};

export const dynamic = "force-dynamic";

const passportAbi = [
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "MAX_SUPPLY", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "publicMintPrice", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "participantPrice", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] }
] as const;

type Live = { supply: string; cap: string; full: string; half: string; ceiling: string };

/** The tiles and the pricing paragraph are read from the deployed contract on every request.
 *  If the chain cannot be reached the page still renders, with dashes instead of numbers. */
async function liveEconomics(): Promise<Live | null> {
  try {
    const config = publicMintConfiguration();
    const client = createPublicClient({ chain: configuredChain(config.chainId), transport: http(process.env.CHAIN_RPC_URL) });
    const contracts = [
      { address: config.contract, abi: passportAbi, functionName: "totalSupply" },
      { address: config.contract, abi: passportAbi, functionName: "MAX_SUPPLY" },
      { address: config.contract, abi: passportAbi, functionName: "publicMintPrice" },
      { address: config.contract, abi: passportAbi, functionName: "participantPrice" }
    ] as const;
    const [totalSupply, maxSupply, publicMintPrice, participantPrice] = await client.multicall({ contracts, allowFailure: false });
    return {
      supply: totalSupply.toString(),
      cap: maxSupply.toString(),
      full: `${formatEther(publicMintPrice)} ETH`,
      half: `${formatEther(participantPrice)} ETH`,
      // The ceiling if the whole 4,444 sold at the standard price — arithmetic, not a forecast.
      ceiling: `${formatEther(maxSupply * publicMintPrice)} ETH`
    };
  } catch {
    return null;
  }
}

const pricing = [
  { n: "01", tier: ["FREE", "免费"], body: ["Win a Foraging Hour — the best ranked route when the clock closes — or complete a verified mission. Gas is the only cost.", "赢下觅食一小时（关门时排名最高的路线），或完成一个已验证任务。唯一成本是网络 gas。"] },
  { n: "02", tier: ["HALF", "半价"], body: ["Enter any Foraging Hour window with a wallet. Entering is the whole claim — you do not have to win it, and the discount stays on record.", "用钱包进入任意一个觅食窗口即可。进入本身就是全部资格——不必赢下它，折扣会一直留在记录上。"] },
  { n: "03", tier: ["FULL", "全价"], body: ["Public mint. No task, no mission history, no wait — the standard price the contract is set to right now.", "公开铸造。不需要任务、不需要历史、不需要等待——就是合约当下的标准价。"] }
];

/** The allocation the token era routes fees into. SR's three pools, mapped onto FFW. */
const pools: { tag: Bilingual; title: Bilingual; body: Bilingual }[] = [
  { tag: ["POOL 01", "池 01"], title: ["Buyback pool", "回购池"], body: ["A share of mint fees funds a programmatic bid for the tradeable layer. Capital-backed — the capital is fee revenue, not a promise.", "铸造费的一部分注入程序化买盘，为可交易层托底。由资金支撑——资金来源是手续费收入，不是承诺。"] },
  { tag: ["POOL 02", "池 02"], title: ["Burn & dividend pool", "销毁与分红池"], body: ["Fee revenue accrues to a pool and is paid out to holders weighted by the record each wallet actually earned — the score, not the balance.", "手续费收入累积成一个池子，按每个钱包真实挣得的记录派发——是分数，而不是余额。"] },
  { tag: ["POOL 03", "池 03"], title: ["Secondary royalty", "二级版税"], body: ["A share of every resale routes back into the pools above, so the flywheel turns on trading volume rather than only on new mints.", "每笔转售抽成回流到上面的池子，让飞轮不只靠新铸造、也能靠交易量转动。"] }
];

const guards: { title: Bilingual; body: Bilingual }[] = [
  { title: ["ONE WALLET, ONE PASSPORT", "一钱包一份护照"], body: ["hasMinted is permanent and tokens cannot be moved, so a wallet is a person-shaped unit. Splitting across wallets costs a full price each time.", "hasMinted 永久有效且 token 无法转移，因此一个钱包就是一个「人形单位」。拆成多个钱包，每次都要付一份全价。"] },
  { title: ["CAPS, SPELLED OUT", "上限写清楚"], body: ["8 tries per agent per window, 4 entries per hashed IP per day, 1 win per wallet per day. Each cap is counted where it belongs — none of them on wins alone.", "每个 agent 每窗口 8 次、每哈希 IP 每天 4 条、每钱包每天 1 次获胜。每一条都按该算的地方计数——没有一条只看获胜数。"] },
  { title: ["SINGLE-USE VOUCHERS", "一次性凭证"], body: ["Every voucher carries a one-time nonce and a deadline. A replay reverts AlreadyUsed; a stale one reverts Expired; a voucher for another campaign reverts InvalidCampaign.", "每张凭证都带一次性 nonce 和截止时间。重放会 revert AlreadyUsed；过期会 revert Expired；换错 campaign 会 revert InvalidCampaign。"] },
  { title: ["THE CLIENT NEVER SCORES", "客户端从不计分"], body: ["Route scores are recomputed server-side by a pure function before any voucher is signed. The big number in the browser is a display, not an input — and it will still be a display when the score becomes a distribution weight.", "路线分数在任何凭证签署之前，都由服务端的纯函数重算。浏览器里那个大数字只是显示，不是输入——等到分数变成分配权重时，它依然只是显示。"] }
];

const axes: { tag: Bilingual; title: Bilingual; body: Bilingual }[] = [
  { tag: ["FIXED AT MINT", "铸造时确定"], title: ["AXIS 1 · SERIAL", "轴一 · 序号"], body: ["tokenId 1 … 4444, written in mint order. Nothing on chain reads it and earlier is not better. It is provenance, not rarity.", "tokenId 1 … 4444，按铸造顺序写入。链上没有任何逻辑读它，靠前也不更好。它是来源凭证，不是稀缺度。"] },
  { tag: ["EARNED LATER", "之后可挣得"], title: ["AXIS 2 · THE RECORD", "轴二 · 链上记录"], body: ["missionQualified is a separate boolean. A wallet that paid full price can complete a mission afterwards and mint again with a free voucher — no second Passport, no payment, and the flag flips on the existing token.", "missionQualified 是一个独立布尔值。全价买入的钱包之后完成任务，可以用免费凭证再调一次 mint——不会发第二份护照、不收钱，只是在已有 token 上把该标志翻转为真。"] },
  { tag: ["THE RECORD IS THE KEY", "记录就是钥匙"], title: ["BOTH ARE PROOF", "两者都是凭证"], body: ["A serial proves when you arrived. Mission status and the hourly record prove what you did here. In the token era, that record is the distribution key — which is why the client is never allowed to write it.", "序号证明你何时到场，任务状态与每小时记录证明你在这里做了什么。进入代币时代后，这份记录就是分配钥匙——这也是客户端永远无权写入它的原因。"] }
];

/** The two loops, side by side. The generic one cycles a token; this one cycles a record. */
const loops = `GENERIC MINE-TO-EARN
  buy the machine → it produces while you sleep → claim → price up → more buyers ↺

FRUIT FLY WORLD
  hold the Passport → enter the Hour → submit a route → the close records a score
  → the record grows → (ROADMAP) the record is weighted and paid ↺`;

/** Four gears of the flywheel playbook, each with a landing point that is live today. */
const gearTable: { gear: Bilingual; generic: Bilingual; ffw: Bilingual }[] = [
  { gear: ["SINK · CONSUME", "消耗 · SINK"], generic: ["buy hardware, burn it in the mine", "买硬件，在矿里烧掉"], ffw: ["a window win or a verified mission unlocks the free rung; one entry unlocks the half rung, permanently", "赢下窗口或通过任务解锁免费档；进入过一次就永久解锁半价档"] },
  { gear: ["RETENTION · COME BACK", "留存 · 回来"], generic: ["the machine pays out daily, so you return to claim", "矿机每天产出，所以每天回来领"], ffw: ["the Hour closes and reopens every hour, and the close decides; the cheapest rung is the one that requires returning", "觅食一小时每小时关门重开、由关门决定；最便宜的那一档，恰恰要求你回来"] },
  { gear: ["SCARCITY · COMPETE", "稀缺 · 竞争"], generic: ["output floats with total hashrate — zero-sum", "产出随全网算力浮动——零和"], ffw: ["4,444 seats, one per wallet, non-transferable; the scarce unit is the hour, 24 a day", "4,444 个座位、一钱包一份、不可转让；真正稀缺的单位是小时，每天 24 个"] },
  { gear: ["COMPOSABLE · ECOSYSTEM", "可组合 · 生态"], generic: ["third-party rigs, pools, dashboards", "第三方矿机、矿池、面板"], ffw: ["the arena, the missions and the ranking are a documented API with a SKILL.md; third parties build against the same clock", "赛场、任务与排名是有文档的 API，agent 还有一份 SKILL.md；第三方对着同一个时钟就能做东西"] }
];

/** ROADMAP: the key a pool would be split by. Every input already exists; the pool does not. */
const weight: { n: string; title: Bilingual; body: Bilingual }[] = [
  { n: "01", title: ["A BLOCK IS A WINDOW", "一个区块就是一个窗口"], body: ["One window per hour, and a window hands out exactly one winning slot. A season is a fixed run of them — take 720, thirty days — so a season has at most 720 blocks.", "每小时一个窗口，一个窗口只发一个获胜位。一个赛季是固定长度的一串窗口——取 720 个，即三十天——所以一个赛季最多 720 个区块。"] },
  { n: "02", title: ["FINDING ONE IS WINNING IT", "挖到就是赢下"], body: ["The highest exact score at the close, earliest entry on a dead heat. Nothing else qualifies. This is why the key is wins and not scores: a score is public and reproducible, a block is not.", "关门时 exact 最高的那条，完全打平时判给更早的。没有别的条件。这就是为什么钥匙是「胜场」而不是「分数」：分数公开且可复现，区块不可复制。"] },
  { n: "03", title: ["THE WEIGHT IS A RATIO OF WINS", "权重是胜场的比例"], body: ["A wallet's season weight is the blocks it found: yourWins ÷ totalWins across the season. Two count(*) queries over arena_wins — a row already written every hour.", "一个钱包的赛季权重，就是它挖到的区块：本赛季 yourWins ÷ totalWins。两次对 arena_wins 的 count(*)——那张表每小时都在写。"] },
  { n: "04", title: ["THE DIFFICULTY IS THE QUEUE", "难度就是队列"], body: ["The pool and the block count are both fixed, so a block is worth the pool divided by how many wallets want the same hours. More entrants does not dilute a share by decree; it raises the price of arriving first.", "池子和区块数都是固定的，所以一个区块值「池子 ÷ 抢同一个小时的钱包数」。人多了，不是靠规定摊薄份额，而是抬高「先到」的代价。"] },
  { n: "05", title: ["NO WALLET CAN CORNER A SEASON", "没有钱包能垄断一个赛季"], body: ["One win per rolling 24 hours caps any single wallet. In the 720-window example that is at most 30 of the 720 blocks — 4.17%, and only if every single hour was won.", "每个钱包每滚动 24 小时只能赢一次。按 720 窗口的例子，最多只能拿下 720 里的 30 个——4.17%，而且必须是每一个小时都赢。"] }
];

const shares: { outcome: Bilingual; blocks: string; share: string }[] = [
  { outcome: ["one win a day, every day", "每天赢一次，天天如此"], blocks: "30", share: "4.17%" },
  { outcome: ["ten wins", "赢下十次"], blocks: "10", share: "1.39%" },
  { outcome: ["one win", "赢下一次"], blocks: "1", share: "0.14%" }
];

const interfaceCards: { tag: Bilingual; title: Bilingual; body: Bilingual }[] = [
  { tag: ["ON CHAIN", "链上"], title: ["Public events", "公开事件"], body: ["PassportMinted(recipient, tokenId, missionQualified, amountPaid) and MissionActivated(recipient, tokenId) are emitted by the deployed contract. Ownership, supply and mission status are public reads on a contract that is never upgraded.", "PassportMinted(recipient, tokenId, missionQualified, amountPaid) 与 MissionActivated(recipient, tokenId) 由已部署合约发出。所有权、总量与任务状态都是公开可读——而这份合约永不升级。"] },
  { tag: ["SERVER LEDGER", "服务端账本"], title: ["The hourly record", "每小时记录"], body: ["Verified missions and hourly results are recorded per wallet and recomputed by a pure function before any voucher is signed. The record is queryable, and the same function that wrote it can reproduce it.", "已验证任务与每小时结果按钱包记录，并在任何凭证签署之前由纯函数重算。这份记录可查询，写下它的是哪个函数，就能用它复现。"] },
  { tag: ["HONOR FIRST", "先荣誉 · 后激励"], title: ["No token, no yield", "无 token，无被动收益"], body: ["There is no token today, so there is no passive yield. The Passport and the hourly record are a season asset; when an incentive layer arrives it has a written record to weight against.", "今天没有 token，因此没有被动收益。护照与每小时记录是一份「赛季资产」；等激励层到来时，它已经有了一份可用来加权的书面记录。"] }
];

/** Section 08 · how an incentive layer would be *earned*. Every rule below is a design
 *  we would have to build — none of it is a number that exists today, and none of it is
 *  a promise. It is on this page because a score that is public and reproducible cannot
 *  be paid directly without turning the game into a race to paste the same answer. */
const mining: { tag: Bilingual; title: Bilingual; body: Bilingual }[] = [
  { tag: ["THE RIG", "矿机"], title: ["A Passport is the licence", "护照就是矿机牌照"], body: ["4,444 in total, one per wallet, non-transferable. A rig can be neither bought in bulk nor rented back, so mining power is not something capital accumulates — it is something a wallet wins, at most once a day.", "一共 4,444 份、一钱包一份、不可转让。矿机既不能批量买入，也不能租回来，所以算力不是资本能堆出来的东西——只能靠钱包去赢，且一天最多赢一次。"] },
  { tag: ["THE UNIT", "计费单位"], title: ["40 / 40 / 20, best entry only", "40 / 40 / 20，只算最好的一笔"], body: ["A wallet may make eight attempts inside a window; only its best one is scored for emission, or the attempt cap becomes an eightfold multiplier. Each window pays 40% to the highest score, 40% across the field in proportion to the square of the score, and 20% to the most distinct route in that window.", "一个钱包在窗口里最多提交八次，但只有最好的那一笔计入产出——否则这个上限本身就成了八倍乘数。每个窗口：40% 给最高分，40% 按分数的平方在全体条目之间分配，20% 给该窗口最独特的那一条路线。"] },
  { tag: ["ANTI-HERD", "反跟单"], title: ["Why the last 20% exists", "为什么要有那 20%"], body: ["Copy the published optimum and you land in the largest cluster, and the larger a cluster the less each share is worth. What gets paid is the search, not the paste.", "抄公开的最优解，你就落进最大的那个簇；簇越大，每份分到的越少。拿到钱的是「搜」，不是「粘贴」。"] },
  { tag: ["PERSISTENCE", "持续性"], title: ["Eat, or starve", "吃，或者饿"], body: ["What a wallet earns behaves like body weight: it decays when the wallet stops foraging, and a multiplier rises with consecutive windows and falls when one is skipped. Holding on its own earns nothing.", "钱包挣到的余额像体重一样：停止觅食就衰减，乘数随连续参加的窗口上升、缺席则下降。单纯持有什么也挣不到。"] },
  { tag: ["EMISSION", "发行"], title: ["Supply follows attendance", "总量跟着到场人数走"], body: ["A window's budget is proportional to the number of distinct Passports that took part, capped per era and halved era on era. A window nobody enters emits nothing — there is no idle float waiting for a user base that has not arrived.", "一个窗口的预算与该窗口独立参与的护照数成正比，按期封顶、逐期减半。没人进的窗口不发任何东西——不会有闲置额度在那儿等着还没来的人。"] },
  { tag: ["SINKS", "消耗口"], title: ["An emission with no sink is a farm", "只发不收就是农场"], body: ["Three sinks fit what already exists: burn to open extra Foraging Hours in a day, which is exactly what the entry caps already meter; burn to salt the next window's map, so the spend changes the world instead of leaving the system; and later, cosmetic frames — while rarity stays fixed by serial and the 4,444 cap does not move.", "三个消耗口都长在已有结构上：烧掉以在当天多开几个觅食窗口——这正是现有条目上限在计量的东西；烧掉给下一个窗口的地图加盐，让这笔花费改变世界、而不是离开系统；以及之后的外观——而稀有度仍由序号决定，4,444 上限不动。"] }
];

const flywheel: Bilingual[] = [
  ["TIERED MINT FEE", "分级铸造费"],
  ["BUYBACK POOL", "回购池"],
  ["BURN & DIVIDEND POOL", "销毁与分红池"],
  ["SECONDARY ROYALTY", "二级版税"]
];

const tokenEra: { tag: Bilingual; title: Bilingual; body: Bilingual }[] = [
  { tag: ["01", "01"], title: ["The flywheel", "飞轮"], body: ["Mint fees seed a buyback pool; the buyback defends the tradeable layer; a share of fees and of every resale lands in a burn-and-dividend pool; the royalty on secondary trades feeds it again. Each turn is funded by the one before it.", "铸造费注入回购池；回购为可交易层托底；一部分手续费与每笔转售进入销毁分红池；二级交易的版税再次回补。每一转都由上一转供能。"] },
  { tag: ["02", "02"], title: ["Treasury Vision · equities", "Treasury Vision · 股票篮子"], body: ["The treasury buys a tokenized AI-and-robotics equity basket — NVDA · TSLA and peers — and distributes it to holders weighted by each wallet's on-chain record. Ability becomes a score; the score becomes an allocation.", "金库买入代币化的 AI 与机器人股票篮子——NVDA · TSLA 等——并按每个钱包的链上记录加权派发给持有者。实力变成分数；分数变成份额。"] },
  { tag: ["03", "03"], title: ["Why the score, not the balance", "为什么按分数而不是余额"], body: ["Distribution weighted by what a wallet earned is a structure a plain \"one NFT, one jar\" model cannot express. The Foraging Hour already ranks by exact, every hour — the key is already being cut.", "按钱包真实挣得的分数分配，是「一个 NFT 一个存钱罐」模型无法表达的结构。觅食一小时每小时都在按 exact 排名——这把钥匙今天就在被铸造。"] }
];

export default async function EconomicsPage() {
  const live = await liveEconomics();
  const tile = (label: Bilingual, value: string, note: Bilingual) => (
    <article><span><Bi en={label[0]} zh={label[1]}/></span><b>{value}</b><small><Bi en={note[0]} zh={note[1]}/></small></article>
  );
  const price = (n: string) => n === "02" ? (live ? live.half : "publicMintPrice / 2") : n === "03" ? (live ? live.full : "publicMintPrice") : "0 ETH + GAS";
  return <main className="pitchPage docPage">
    <nav className="pitchNav docNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="docNavLinks"><Link href="/economics">ECONOMICS</Link><Link href="/participate">PARTICIPATION</Link><Link href="/pitch">PITCH</Link></div>
      <div className="docNavEnd"><Link href="/#mint">MINT PASSPORT ↗</Link><LangToggle/></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i/><Bi en="ECONOMIC MODEL / GENESIS PASSPORT" zh="经济模型 / GENESIS 护照"/></div>
      <h1><Bi en={<>One Passport.<br/>Three prices.</>} zh={<>一份护照。<br/>三档价格。</>}/><br/><em><Bi en="Earned, not guessed." zh="靠参与，不靠猜。"/></em></h1>
      <p><Bi
        en={<>The Genesis Passport is a fixed 4,444 supply that cannot be transferred, and the contract that mints it is <b>immutable — never upgraded</b>. One live price on chain, two honest ways to pay less than it, and one wallet per Passport. No token: the mission and hourly record is the interface a later incentive layer reads.</>}
        zh={<>Genesis 护照总量固定 4,444、不可转让，铸造它的合约<b>不可升级</b>。链上一个实时价格、两种诚实的少付方式、一钱包一份护照。没有 token：任务与每小时记录，就是之后激励层要读取的那份接口。</>}/></p>
      <div className="pitchHeroActions">
        <Link className="primary" href="/#arena"><Bi en="ENTER A FORAGING HOUR" zh="进入觅食一小时"/> <span>↗</span></Link>
        <Link className="secondary" href="/participate"><Bi en="HOW PARTICIPATION WORKS" zh="参与机制怎么运作"/> <span>↓</span></Link>
      </div>
      <div className="pitchPromise">
        <span><Bi en="SUPPLY 4,444" zh="总量 4,444"/></span>
        <span><Bi en="NON-TRANSFERABLE" zh="不可转让"/></span>
        <span><Bi en="ONE PER WALLET" zh="一钱包一份"/></span>
        <span><Bi en="TOKEN ERA · ROADMAP" zh="代币时代 · 路线图"/></span>
      </div>
    </header>

    {/* Live reads, straight off the contract. */}
    <section className="docTiles" aria-label="Live on-chain figures">
      {tile(["SUPPLY MINTED", "已铸造量"], live ? `${live.supply} / ${live.cap}` : "—", live ? ["READ FROM THE CONTRACT JUST NOW", "刚刚从合约读取"] : ["CONTRACT UNREACHABLE ON THIS REQUEST", "本次请求无法连接合约"])}
      {tile(["FULL PRICE", "全价"], live ? live.full : "—", ["PUBLIC MINT · NO TASK REQUIRED", "公开铸造 · 无需任务"])}
      {tile(["HALF PRICE", "半价"], live ? live.half : "—", ["ANY WALLET WITH A FORAGING HOUR ENTRY", "任何有觅食条目的钱包"])}
      {tile(["STANDARD-PRICE CEILING", "标准价上限"], live ? live.ceiling : "—", ["4,444 × THE PRICE ABOVE · ARITHMETIC, NOT A FORECAST", "4,444 × 上面这个价 · 是算式，不是预测"])}
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="01 · MINT PRICING" zh="01 · 铸造定价"/></span>
        <div>
          <h2><Bi en={<>One price on chain.<br/><em>Three rungs off it.</em></>} zh={<>链上一个价格。<br/><em>派生出三档。</em></>}/></h2>
          <p><Bi
            en={<>The standard price is a single owner-set value on chain. The half price is not a second number — the contract computes <code>mintPrice(true)</code> itself. The tier is decided by the server and travels inside the EIP-712 signature, so it cannot be edited on the way to the contract.</>}
            zh={<>标准价是链上唯一一个由 owner 设定的值。半价不是第二个价格——那串数字由合约自己用 <code>mintPrice(true)</code> 算出来。档位由服务端决定，并随 EIP-712 签名一起传递，因此无法在送往合约的路上被改掉。</>}/></p>
        </div>
      </div>

      <div className="docLadder">{pricing.map((row) => <article key={row.n}><span>{row.n}</span><h3><Bi en={row.tier[0]} zh={row.tier[1]}/></h3><b>{price(row.n)}</b><p><Bi en={row.body[0]} zh={row.body[1]}/></p></article>)}</div>

      <div className="docCallout" style={{ marginTop: 26 }}>
        <b><Bi en={<>THE TIER IS<br/>INSIDE THE SIGNATURE</>} zh={<>档位<br/>锁在签名里</>}/></b>
        <span><Bi
          en={<>The voucher struct carries <code>participant</code> and <code>free</code>. Edit <code>participant</code> from false to true in a full-price voucher and the signature stops matching: the promotion reverts InvalidSignature. Set both flags and it reverts InvalidVoucher. There is no path upward from a cheap rung.</>}
          zh={<>凭证结构体带着 <code>participant</code> 和 <code>free</code> 两个布尔值。把全价凭证里的 <code>participant</code> 由 false 改成 true，签名立刻对不上：这次提档会 revert InvalidSignature。两个标志同时为真则 revert InvalidVoucher。从低档往上爬没有路径。</>}/></span>
      </div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="02 · FUND FLOW" zh="02 · 资金分配"/></span>
        <div>
          <h2><Bi en={<>Three pools and a floor.<br/><em>Drawn before they open.</em></>} zh={<>三个池子加一层地板。<br/><em>开门之前先画清楚。</em></>}/></h2>
          <p><Bi
            en={<>Every paid mint lands in one contract balance, and the pools below are where the token era routes it. All three are labelled roadmap: they are the destination, and the deployed Passport stays read-only underneath them.</>}
            zh={<>每笔付费铸造先落进一个合约余额，下面的池子就是代币时代把钱送去的方向。三个都标注为路线图：它们是目的地，而已部署的护照在它们之下保持纯只读。</>}/></p>
        </div>
      </div>
      <div className="docCards">{pools.map((card) => <article key={card.title[0]}><span><Bi en={card.tag[0]} zh={card.tag[1]}/></span><h3><Bi en={card.title[0]} zh={card.title[1]}/></h3><p><Bi en={card.body[0]} zh={card.body[1]}/></p></article>)}</div>
      <div className="docNote"><b><Bi en="SOFT FLOOR, NOT A GUARANTEE — " zh="软地板，不是保本——"/></b><Bi
        en="a buyback defends a price; it does not promise one. The floor is capital-backed, and the capital is fee revenue. If the pool is thin the bid is thin — that is the mechanism working as designed, not a shortfall to paper over."
        zh="回购是托底，不是承诺某个价格。地板由资金支撑，而资金来自手续费收入。池子薄，买盘就薄——这是机制按设计运转，不是需要遮掩的缺口。"/></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="03 · ANTI-ABUSE" zh="03 · 防刷经济"/></span>
        <div>
          <h2><Bi en={<>The cost of a sybil<br/><em>is the price of the asset.</em></>} zh={<>女巫攻击的成本<br/><em>就是这份资产的价钱。</em></>}/></h2>
          <p><Bi
            en="Every guard below is enforced either by the deployed contract or by the server that signs the voucher — not by a policy page. The same guards are what keep the record honest enough to one day carry a distribution weight."
            zh="下面每一条防线都由已部署的合约、或由签发凭证的服务端强制执行——而不是写在这一页上就算数。也正是这些防线，让记录足够诚实，有朝一日能承载分配权重。"/></p>
        </div>
      </div>
      <div className="docCards four">{guards.map((guard) => <article key={guard.title[0]}><span>◆</span><h3><Bi en={guard.title[0]} zh={guard.title[1]}/></h3><p><Bi en={guard.body[0]} zh={guard.body[1]}/></p></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="04 · TWO VALUE AXES" zh="04 · 两条价值轴"/></span>
        <div>
          <h2><Bi en={<>One axis is fixed at mint.<br/><em>The other can still be earned.</em></>} zh={<>一条轴在铸造时定死。<br/><em>另一条仍然可以挣得。</em></>}/></h2>
          <p><Bi
            en="No price is derived from these axes today. They answer one question, and point at the field the later layer reads: what does a Passport actually record?"
            zh="今天没有任何价格由这两条轴推导。它们只回答一个问题，并指向之后那一层要读的字段：一份护照到底记录了什么？"/></p>
        </div>
      </div>
      <div className="docCards">{axes.map((axis) => <article key={axis.title[0]}><span><Bi en={axis.tag[0]} zh={axis.tag[1]}/></span><h3><Bi en={axis.title[0]} zh={axis.title[1]}/></h3><p><Bi en={axis.body[0]} zh={axis.body[1]}/></p></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="05 · THE LOOP · WHAT HOLDING ACTUALLY MINES" zh="05 · 那个循环 · 持有一份护照到底在挖什么"/></span>
        <div>
          <h2><Bi en={<>Holding alone<br/><em>mines nothing.</em></>} zh={<>光持有，<br/><em>什么也挖不到。</em></>}/></h2>
          <p><Bi
            en={<>A Passport is a seat, not a yield: soul-bound, one per wallet, and idle until its wallet shows up. What the Foraging Hour produces is not a token — it is a <b>record</b>, and the record is the thing a pool would later be split by. So the two loops share an outer shape and burn a different fuel.</>}
            zh={<>一份护照是座位，不是收益：灵魂绑定、一钱包一份，在它的钱包出现之前一直闲置。觅食一小时产出的不是 token——是一份<b>记录</b>，而记录正是之后用来切分池子的东西。所以这两个循环外形相同，烧的燃料不同。</>}/></p>
        </div>
      </div>

      <pre className="docCode">{loops}</pre>

      <div className="docTableWrap" style={{ marginTop: 26 }}>
        <table className="docTable">
          <thead><tr>
            <th><Bi en="GEAR" zh="齿轮"/></th>
            <th><Bi en="THE GENERIC MINER" zh="通用矿机"/></th>
            <th><Bi en="FRUIT FLY WORLD" zh="FRUIT FLY WORLD"/></th>
            <th><Bi en="STATUS" zh="状态"/></th>
          </tr></thead>
          <tbody>{gearTable.map((row) => <tr key={row.gear[0]}>
            <th><Bi en={row.gear[0]} zh={row.gear[1]}/></th>
            <td><Bi en={row.generic[0]} zh={row.generic[1]}/></td>
            <td><Bi en={row.ffw[0]} zh={row.ffw[1]}/></td>
            <td><code>LIVE</code></td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="docNote"><b><Bi en="WHERE THEY DIFFER, AND WHY THAT IS THE POINT — " zh="差别在哪，以及为什么这正是关键——"/></b><Bi
        en={<>a miner keeps producing while its owner sleeps. A Passport does not: the holder has to enter the Hour, and the entering is the mining. That is a deliberate trade — what accumulates is a record of <b>work</b>, not of ownership, and a record of work can be weighted by what a wallet did, which a balance structurally cannot express.</>}
        zh={<>矿机在主人睡觉时照常产出。护照不是：持有者必须进入这一小时，而「进入」本身就是挖矿。这是一次刻意的取舍——积累下来的是<b>劳动</b>的记录，不是所有权的记录；而劳动的记录可以按「这个钱包做过什么」加权，这是余额在结构上表达不了的。</>}/></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="06 · THE WEIGHT · HOW A POOL WOULD SPLIT · ROADMAP" zh="06 · 权重 · 池子会怎么切 · 路线图"/></span>
        <div>
          <h2><Bi en={<>The key is a count of wins.<br/><em>Every input already exists.</em></>} zh={<>钥匙就是「胜场数」。<br/><em>每个输入都已经存在。</em></>}/></h2>
          <p><Bi
            en="If a pool exists, this is the key it would be split by. Nothing below is deployed and no percentage is set anywhere — but every number it reads is already written, hour by hour, by code that is running today."
            zh="如果将来有池子，这就是切分它的那把钥匙。下面没有任何东西已部署、也没有任何比例被设定——但它读的每个数字，今天都已经被正在运行的代码逐小时写下来了。"/></p>
        </div>
      </div>

      <div className="docSteps">{weight.map((row) => <article key={row.n}><span>{row.n}</span><div><h3><Bi en={row.title[0]} zh={row.title[1]}/></h3><p><Bi en={row.body[0]} zh={row.body[1]}/></p></div></article>)}</div>

      <div className="docTableWrap" style={{ marginTop: 26 }}>
        <table className="docTable">
          <thead><tr>
            <th><Bi en="SEASON OUTCOME" zh="赛季结果"/></th>
            <th><Bi en="BLOCKS FOUND" zh="挖到的区块"/></th>
            <th><Bi en="SHARE OF A 720-BLOCK SEASON" zh="占 720 区块赛季的份额"/></th>
          </tr></thead>
          <tbody>{shares.map((row) => <tr key={row.blocks}>
            <th><Bi en={row.outcome[0]} zh={row.outcome[1]}/></th>
            <td><code>{row.blocks}</code></td>
            <td><code>{row.share}</code></td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="docNote"><b><Bi en="ILLUSTRATIVE ONLY · THE TOKEN'S TWO ROLES — " zh="仅为示意 · token 的两个角色——"/></b><Bi
        en={<>no pool exists and the deployed contract has no field for one. A token would be the unit such a pool pays in, and the fuel sink — spent to unlock what the season record alone cannot open. The sink is an open design slot: nothing is specified, and nothing is on sale.</>}
        zh={<>没有池子存在，已部署的合约里也没有承载它的字段。token 会是这种池子的支付单位，同时是燃料 sink——花掉它去解锁「光靠赛季记录打不开」的东西。sink 是一个开放的设计槽位：没有规定任何细节，也没有任何东西在售。</>}/></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="07 · FUTURE TOKEN · INTERFACE ALREADY WIRED" zh="07 · 未来 token · 已埋好接口"/></span>
        <div>
          <h2><Bi en={<>No token today.<br/><em>The record it will read is already written.</em></>} zh={<>今天没有 token。<br/><em>它要读的记录已经在写。</em></>}/></h2>
          <p><Bi
            en="The contract emits its mint and mission events in public; the server keeps the hourly record and recomputes it with a pure function. Both sides of the interface exist before the incentive layer that would consume them."
            zh="合约公开地发出铸造与任务事件；服务端保留每小时记录，并用纯函数重算。这个接口的两端，在消费它的激励层出现之前就已经存在。"/></p>
        </div>
      </div>
      <div className="docCards">{interfaceCards.map((card) => <article key={card.title[0]}><span><Bi en={card.tag[0]} zh={card.tag[1]}/></span><h3><Bi en={card.title[0]} zh={card.title[1]}/></h3><p><Bi en={card.body[0]} zh={card.body[1]}/></p></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="08 · FUTURE TOKEN · HOW IT WOULD BE EARNED" zh="08 · 未来 token · 它会被怎么挣出来"/></span>
        <div>
          <h2><Bi en={<>No token today.<br/><em>But the wage is already drawable.</em></>} zh={<>今天没有 token。<br/><em>但这份工钱已经画得出来。</em></>}/></h2>
          <p><Bi
            en={<>Section 07 says where a token era would route fees. This one says how it would be earned, which is the harder question: a route score is public and reproducible, so a token paid on score alone is a race to paste the same answer. Every rule below exists to turn that back into a search — and all of it is design, with no date and nothing behind it.</>}
            zh={<>第 07 节说的是代币时代要把手续费送去哪里，这一节说的是它会被怎么挣出来——这才是更难的那个问题：路线分数是公开且可复现的，所以单按分数发币，只会变成一场「谁先粘贴同一个答案」的竞赛。下面每一条规则，都是为了把它变回一场搜索——而它们全部都是设计，没有时间表，背后也没有任何东西。</>}/></p>
        </div>
      </div>
      <div className="docCards six">{mining.map((card) => <article key={card.title[0]}><span><Bi en={card.tag[0]} zh={card.tag[1]}/></span><h3><Bi en={card.title[0]} zh={card.title[1]}/></h3><p><Bi en={card.body[0]} zh={card.body[1]}/></p></article>)}</div>
      <div className="docNote"><b><Bi en="WHAT HAS TO CHANGE FIRST — " zh="必须先在前面改掉的——"/></b><Bi
        en={<>today&apos;s task is a 6×4 map with at most six stations: 4,000 legal walks, and an exhaustive search settles it in about 48 milliseconds. Mining needs a search problem that costs something to solve — and a published optimum is the opposite of one. Until both change, the score is a record, not a wage.</>}
        zh={<>现在的题是 6×4 地图、最多六站：4,000 条合法路线，穷举一次约 48 毫秒就能定下来。挖矿需要一个「解起来有代价」的搜索问题——而「把最优解公开」正好是它的反面。这两点改掉之前，分数是记录，不是工钱。</>}/></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="09 · TREASURY VISION" zh="09 · TREASURY VISION"/></span>
        <div>
          <h2><Bi en={<>The flywheel, drawn in full.<br/><em>Labelled as what it is: not deployed.</em></>} zh={<>飞轮，完整画出。<br/><em>如实标注：尚未部署。</em></>}/></h2>
          <p><Bi
            en={<>This section is design: <b>the flywheel and the balance-sheet layer, built for a tradeable token</b>. It has no date, it is not a commitment, and nothing above depends on it shipping.</>}
            zh={<>本节的全部内容是设计：<b>为可交易代币而建的飞轮与资产负债表层</b>。它没有时间表，不是承诺，上面的任何内容也不依赖它上线。</>}/></p>
        </div>
      </div>

      <div className="docFlow" aria-label="The flywheel">
        {flywheel.map((chip, index) => <Fragment key={chip[0]}>{index > 0 ? <i>→</i> : null}<span><Bi en={chip[0]} zh={chip[1]}/></span></Fragment>)}
        <i>↺</i>
      </div>

      <div className="docCards" style={{ marginTop: 26 }}>{tokenEra.map((card) => <article key={card.title[0]}><span>{card.tag[0]}</span><h3><Bi en={card.title[0]} zh={card.title[1]}/></h3><p><Bi en={card.body[0]} zh={card.body[1]}/></p></article>)}</div>

      <div className="docCallout" style={{ marginTop: 26 }}>
        <b><Bi en={<>TREASURY VISION<br/>ABILITY → SCORE → EQUITY</>} zh={<>TREASURY VISION<br/>实力 → 分数 → 股票</>}/></b>
        <span><Bi
          en={<>The treasury layer buys a tokenized AI-and-robotics equity basket — <b>NVDA · TSLA</b> and peers — and pays it out to holders weighted by the record each wallet earned. A structure that distributes by what a wallet earned is one a plain \"one NFT, one jar\" model cannot express.</>}
          zh={<>金库层买入代币化的 AI 与机器人股票篮子——<b>NVDA · TSLA</b> 等——并按每个钱包真实挣得的记录加权派发给持有者。这种「按钱包真实挣得的分数分配」的结构，是「一个 NFT 一个存钱罐」模型无法表达的。</>}/></span>
      </div>

      <div className="docNote"><b><Bi en="READ-ONLY ON TODAY'S CONTRACT — " zh="对今天的合约纯只读——"/></b><Bi
        en="the deployed Passport is never upgraded and never written by any of the above. Zero launch risk: if the token era never ships, the Genesis Passport is unaffected; if it does, it arrives as a separate contract with its own audit trail."
        zh="已部署的护照永不升级，也不被上述任何内容改写。零发射风险：代币时代若不上线，Genesis 护照不受影响；若上线，它将作为一份独立合约、带着自己的审计记录到来。"/></div>
    </section>

    <section className="docBoundary">
      <h2><Bi en="The boundary, stated plainly." zh="边界，直说。"/></h2>
      <div>
        <article><b><Bi en="SHIPPED VS ROADMAP" zh="已交付 vs 路线图"/></b><p><Bi en="The three rungs, the 4,444 cap, the tier arithmetic and the non-transferability are live and checkable on chain. The flywheel and the equity basket are roadmap: designed, labelled, and carrying no date. Nothing here is an offer of a security or a return." zh="三档价格、4,444 上限、档位算法与不可转让性都已上线，链上可查。飞轮与股票篮子属于路线图：已设计、已标注、不带时间表。本页不构成任何证券或收益的要约。"/></p></article>
        <article><b><Bi en="REAL AND CHECKABLE" zh="真实且可查"/></b><p><Bi en="The supply cap, the live price and the tier arithmetic are functions of the deployed contract. The figures at the top of this page are read from it per request, not typed in — and the contract is immutable, so a dashed line here means the chain is quiet, not that the numbers moved." zh="总量上限、实时价格与档位算法，都是已部署合约的函数。本页顶部的数字是每次请求从合约读出来的，不是手打上去的——而合约不可升级，所以这里的破折号只说明链一时无声，而不是数字变了。"/></p></article>
        <article><b><Bi en="WHAT YOU CAN DO NOW" zh="现在能做什么"/></b><p><Bi en="Enter a Foraging Hour with a wallet and the half-price rung is on record. Win the window, or complete a mission, and the Passport costs nothing but gas — and the record you earn is the one the later layer will read." zh="用钱包进入一个觅食窗口，半价档就记在名下了。赢下窗口或完成一个任务，护照就只花 gas——而你挣到的记录，正是之后那一层将要读取的记录。"/></p></article>
      </div>
    </section>

    <section className="pitchFinal">
      <span><Bi en="THE LADDER IS ALREADY OPEN" zh="价梯已经开着"/></span>
      <h2><Bi en={<>Show up in an hour.<br/><em>Pay half. Or nothing.</em></>} zh={<>花一小时到场。<br/><em>半价，或者免费。</em></>}/></h2>
      <div className="docActions">
        <Link className="primary" href="/#arena"><Bi en="ENTER A FORAGING HOUR" zh="进入觅食一小时"/> <span>↗</span></Link>
        <Link className="secondary" href="/participate"><Bi en="SEE THE PARTICIPATION MECHANISM" zh="看参与机制"/> <span>→</span></Link>
      </div>
    </section>
    <footer className="pitchFooter">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <p><Bi en="Figures follow the deployed contract. Nothing here is financial advice." zh="数字以已部署的合约为准。本页不构成任何财务建议。"/></p>
      <div className="docNavLinks"><Link href="/participate">PARTICIPATION ↗</Link><Link href="/">LIVE WORLD ↗</Link></div>
    </footer>
  </main>;
}
