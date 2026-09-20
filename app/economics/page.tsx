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
  { n: "01", tier: ["FREE", "免费"], body: ["Complete a verified mission — an agent run, a quoted post, or a win in the arena. Gas is the only cost.", "完成一个已验证任务——跑一次 agent、引用一次发帖，或在竞技场获胜。唯一成本是网络 gas。"] },
  { n: "02", tier: ["HALF", "半价"], body: ["Take part in a recorded activity: play the game, or enter an arena window. Taking part is the whole claim — the discount stays on record.", "参与一次被记录的活动：玩一次游戏，或进入一个竞技场窗口。参与本身就是全部资格——折扣会一直留在记录上。"] },
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
  { title: ["TIERS TRAVEL INSIDE THE SIGNATURE", "档位锁在签名里"], body: ["The voucher struct carries participant and free. Edit either flag on the way to the contract and the signature stops matching — there is no path upward from a cheap rung.", "凭证结构体带着 participant 与 free 两个标志。在送往合约的路上改动任何一个，签名立刻对不上——从低档往上爬没有路径。"] },
  { title: ["SINGLE-USE VOUCHERS", "一次性凭证"], body: ["Every voucher carries a one-time nonce and a deadline. A replay reverts AlreadyUsed; a stale one reverts Expired; a voucher for another campaign reverts InvalidCampaign.", "每张凭证都带一次性 nonce 和截止时间。重放会 revert AlreadyUsed；过期会 revert Expired；换错 campaign 会 revert InvalidCampaign。"] },
  { title: ["THE CLIENT NEVER SCORES", "客户端从不计分"], body: ["Activity records are recomputed server-side by a pure function before any voucher is signed. The number in the browser is a display, not an input — and it will still be a display when a record becomes a distribution weight.", "活动记录在任何凭证签署之前，都由服务端的纯函数重算。浏览器里那个数字只是显示，不是输入——等到记录变成分配权重时，它依然只是显示。"] }
];

const axes: { tag: Bilingual; title: Bilingual; body: Bilingual }[] = [
  { tag: ["FIXED AT MINT", "铸造时确定"], title: ["AXIS 1 · SERIAL", "轴一 · 序号"], body: ["tokenId 1 … 4444, written in mint order. Nothing on chain reads it and earlier is not better. It is provenance, not rarity.", "tokenId 1 … 4444，按铸造顺序写入。链上没有任何逻辑读它，靠前也不更好。它是来源凭证，不是稀缺度。"] },
  { tag: ["EARNED LATER", "之后可挣得"], title: ["AXIS 2 · THE RECORD", "轴二 · 链上记录"], body: ["missionQualified is a separate boolean. A wallet that paid full price can complete a mission afterwards and mint again with a free voucher — no second Passport, no payment, and the flag flips on the existing token.", "missionQualified 是一个独立布尔值。全价买入的钱包之后完成任务，可以用免费凭证再调一次 mint——不会发第二份护照、不收钱，只是在已有 token 上把该标志翻转为真。"] },
  { tag: ["THE RECORD IS THE KEY", "记录就是钥匙"], title: ["BOTH ARE PROOF", "两者都是凭证"], body: ["A serial proves when you arrived. Mission status and the activity record prove what you did here. In the token era, that record is the distribution key — which is why the client is never allowed to write it.", "序号证明你何时到场，任务状态与活动记录证明你在这里做了什么。进入代币时代后，这份记录就是分配钥匙——这也是客户端永远无权写入它的原因。"] }
];

/** The two loops, side by side. The generic one cycles a token; this one cycles a record. */
const loops = `GENERIC MINE-TO-EARN
  buy the machine → it produces while you sleep → claim → price up → more buyers ↺

FRUIT FLY WORLD
  hold the Passport → play the lineage → the generation is recorded
  → the record grows → (ROADMAP) the record is weighted and paid ↺`;

/** Four gears of the flywheel playbook, each with a landing point that is live today. */
const gearTable: { gear: Bilingual; generic: Bilingual; ffw: Bilingual }[] = [
  { gear: ["SINK · CONSUME", "消耗 · SINK"], generic: ["buy hardware, burn it in the mine", "买硬件，在矿里烧掉"], ffw: ["a verified mission unlocks the free rung; taking part once unlocks the half rung, permanently", "通过任务解锁免费档；参与过一次就永久解锁半价档"] },
  { gear: ["RETENTION · COME BACK", "留存 · 回来"], generic: ["the machine pays out daily, so you return to claim", "矿机每天产出，所以每天回来领"], ffw: ["a generation lasts fifty seconds and a lineage spans many of them; the cheapest rung is the one that requires showing up", "一代只有五十秒，而一条血脉横跨很多代；最便宜的那一档，恰恰要求你到场"] },
  { gear: ["SCARCITY · COMPETE", "稀缺 · 竞争"], generic: ["output floats with total hashrate — zero-sum", "产出随全网算力浮动——零和"], ffw: ["4,444 seats, one per wallet, non-transferable; and the egg count is compared against the wild type, not against another player", "4,444 个座位、一钱包一份、不可转让；而卵数是跟野生型比，不是跟另一个玩家比"] },
  { gear: ["COMPOSABLE · ECOSYSTEM", "可组合 · 生态"], generic: ["third-party rigs, pools, dashboards", "第三方矿机、矿池、面板"], ffw: ["the escape model, its control experiment and the game rules are public code with a documented agent interface; third parties build against the same simulation", "逃脱模型、它的对照实验和游戏规则是公开代码，agent 接口有文档；第三方对着同一套仿真就能做东西"] }
];

/** ROADMAP: the key a pool would be split by. Every input already exists; the pool does not. */
const weight: { n: string; title: Bilingual; body: Bilingual }[] = [
  { n: "01", title: ["A BLOCK IS A GENERATION", "一个区块就是一代"], body: ["A generation is the smallest unit of recorded play. A season is a fixed run of them, so a season has a bounded number of blocks — and the record of who earned which one is written as play happens.", "一代是被记录下来的最小游玩单位。一个赛季是固定长度的一串，因此一个赛季的区块数是有限的——而「谁挣到了哪一个」的记录，在游玩发生时就写下来了。"] },
  { n: "02", title: ["EARNING ONE IS PLAYING WELL", "挣到它靠玩得好"], body: ["Eggs laid, generations survived, mutations carried forward, and — in the arena layer — the highest exact score at the close. Every input is public and reproducible, which is exactly why the key is the record and not a single number.", "产下的卵、活过的代数、带下去的突变，以及在竞技场那一层里关门时 exact 最高的那条。每个输入都公开且可复现，这正是钥匙是「记录」而不是某个单一数字的原因。"] },
  { n: "03", title: ["THE WEIGHT IS A RATIO OF RECORDS", "权重是记录的比例"], body: ["A wallet's season weight would be the blocks it earned over the blocks issued — yourBlocks ÷ totalBlocks. A count over rows a server already writes, not a new accounting system.", "一个钱包的赛季权重，会是它挣到的区块除以发出的区块——yourBlocks ÷ totalBlocks。这是对服务端已经在写的行做一次计数，不是另起一套账。"] },
  { n: "04", title: ["THE DIFFICULTY IS THE QUEUE", "难度就是队列"], body: ["The pool and the block count are both fixed, so a block is worth the pool divided by how many wallets want the same ones. More participants does not dilute a share by decree; it raises the price of playing well.", "池子和区块数都是固定的，所以一个区块值「池子 ÷ 抢同一批区块的钱包数」。人多不是靠规定摊薄份额，而是抬高「玩得好」的代价。"] },
  { n: "05", title: ["NO WALLET CAN CORNER A SEASON", "没有钱包能垄断一个赛季"], body: ["One wallet holds one Passport and a Passport cannot be moved, so a season's blocks cannot be bought up in bulk. Whatever the cap turns out to be, it is structural rather than enforced after the fact.", "一个钱包持一份护照，而护照不可转移，所以一个赛季的区块无法被批量收购。上限具体定成多少另说，但它是结构性的，不是事后强加的。"] }
];

const shares: { outcome: Bilingual; blocks: string; share: string }[] = [
  { outcome: ["a strong lineage, every season", "每个赛季都有一条强血脉"], blocks: "30", share: "4.17%" },
  { outcome: ["ten recorded blocks", "记录下十个区块"], blocks: "10", share: "1.39%" },
  { outcome: ["one recorded block", "记录下一个区块"], blocks: "1", share: "0.14%" }
];

const interfaceCards: { tag: Bilingual; title: Bilingual; body: Bilingual }[] = [
  { tag: ["ON CHAIN", "链上"], title: ["Public events", "公开事件"], body: ["PassportMinted(recipient, tokenId, missionQualified, amountPaid) and MissionActivated(recipient, tokenId) are emitted by the deployed contract. Ownership, supply and mission status are public reads on a contract that is never upgraded.", "PassportMinted(recipient, tokenId, missionQualified, amountPaid) 与 MissionActivated(recipient, tokenId) 由已部署合约发出。所有权、总量与任务状态都是公开可读——而这份合约永不升级。"] },
  { tag: ["SERVER LEDGER", "服务端账本"], title: ["The play record", "游玩记录"], body: ["Verified missions, generations played and arena results are recorded per wallet and recomputed by a pure function before any voucher is signed. The record is queryable, and the same function that wrote it can reproduce it.", "已验证任务、玩过的代数与竞技场结果按钱包记录，并在任何凭证签署之前由纯函数重算。这份记录可查询，写下它的是哪个函数，就能用它复现。"] },
  { tag: ["HONOR FIRST", "先荣誉 · 后激励"], title: ["No token, no yield", "无 token，无被动收益"], body: ["There is no token today, so there is no passive yield. The Passport and the play record are a season asset; when an incentive layer arrives it has a written record to weight against.", "今天没有 token，因此没有被动收益。护照与游玩记录是一份「赛季资产」；等激励层到来时，它已经有了一份可用来加权的书面记录。"] }
];

/** Section 08 · how an incentive layer would be *earned*. Every rule below is a design
 *  we would have to build — none of it is a number that exists today, and none of it is
 *  a promise. It is on this page because a record that is public and reproducible cannot
 *  be paid directly without turning the game into a race to paste the same answer. */
const mining: { tag: Bilingual; title: Bilingual; body: Bilingual }[] = [
  { tag: ["THE RIG", "矿机"], title: ["A Passport is the licence", "护照就是矿机牌照"], body: ["4,444 in total, one per wallet, non-transferable. A rig can be neither bought in bulk nor rented back, so mining power is not something capital accumulates — it is something a wallet earns by playing well.", "一共 4,444 份、一钱包一份、不可转让。矿机既不能批量买入，也不能租回来，所以算力不是资本能堆出来的东西——只能靠钱包玩得好去挣。"] },
  { tag: ["THE UNIT", "计费单位"], title: ["Best run only", "只算最好的一轮"], body: ["A wallet may play many generations; only its strongest run in a period is scored for emission, or repetition itself becomes a multiplier. Exactly how a period splits its budget is an open design slot, not a number we have set.", "一个钱包可以玩很多代，但只有某一段时间里最强的那一轮计入产出——否则「重复」本身就成了乘数。一段时间里预算具体怎么切分，是开放的设计槽位，不是我们已经设定的数字。"] },
  { tag: ["ANTI-HERD", "反跟单"], title: ["Why a copy guard is needed", "为什么需要防抄"], body: ["The moment an optimal route is published, copying it is free — and anything paid on score alone becomes a race to paste the same answer. What should be paid is the search and the play, not the paste.", "一旦最优路线被公开，抄它就是零成本的——而任何只按分数发放的东西，都会变成一场「谁先粘贴同一个答案」的竞赛。该拿到回报的是搜索与游玩，不是粘贴。"] },
  { tag: ["PERSISTENCE", "持续性"], title: ["Eat, or starve", "吃，或者饿"], body: ["What a wallet earns behaves like body weight: it decays when the wallet stops playing, and a multiplier rises with consecutive seasons and falls when one is skipped. Holding on its own earns nothing.", "钱包挣到的余额像体重一样：停止游玩就衰减，乘数随连续参加的赛季上升、缺席则下降。单纯持有什么也挣不到。"] },
  { tag: ["EMISSION", "发行"], title: ["Supply follows attendance", "总量跟着到场人数走"], body: ["A period's budget is proportional to the number of distinct Passports that took part, capped per era and halved era on era. A period nobody plays emits nothing — there is no idle float waiting for a user base that has not arrived.", "一个周期的预算与该周期独立参与的护照数成正比，按期封顶、逐期减半。没人玩的周期不发任何东西——不会有闲置额度在那儿等着还没来的人。"] },
  { tag: ["SINKS", "消耗口"], title: ["An emission with no sink is a farm", "只发不收就是农场"], body: ["The sinks have to fit what already exists: spend to open something the record alone cannot open, and later cosmetic frames — while rarity stays fixed by serial and the 4,444 cap does not move.", "消耗口必须长在已有结构上：花掉它去打开「光靠记录打不开」的东西，以及之后的外观——而稀有度仍由序号决定，4,444 上限不动。"] }
];

const flywheel: Bilingual[] = [
  ["TIERED MINT FEE", "分级铸造费"],
  ["BUYBACK POOL", "回购池"],
  ["BURN & DIVIDEND POOL", "销毁与分红池"],
  ["SECONDARY ROYALTY", "二级版税"]
];

const tokenEra: { tag: Bilingual; title: Bilingual; body: Bilingual }[] = [
  { tag: ["01", "01"], title: ["The flywheel", "飞轮"], body: ["Mint fees seed a buyback pool; the buyback defends the tradeable layer; a share of fees and of every resale lands in a burn-and-dividend pool; the royalty on secondary trades feeds it again. Each turn is funded by the one before it.", "铸造费注入回购池；回购为可交易层托底；一部分手续费与每笔转售进入销毁分红池；二级交易的版税再次回补。每一转都由上一转供能。"] },
  { tag: ["02", "02"], title: ["Treasury Vision · equities", "Treasury Vision · 股票篮子"], body: ["The treasury buys a tokenized AI-and-robotics equity basket — NVDA · TSLA and peers — and distributes it to holders weighted by each wallet's record. Ability becomes a score; the score becomes an allocation.", "金库买入代币化的 AI 与机器人股票篮子——NVDA · TSLA 等——并按每个钱包的记录加权派发给持有者。实力变成分数；分数变成份额。"] },
  { tag: ["03", "03"], title: ["Why the record, not the balance", "为什么按记录而不是余额"], body: ["Distribution weighted by what a wallet earned is a structure a plain \"one NFT, one jar\" model cannot express. The game already writes that record generation by generation — the key is already being cut.", "按钱包真实挣得的记录分配，是「一个 NFT 一个存钱罐」模型无法表达的结构。游戏已经在一代一代地写下那份记录——这把钥匙今天就在被铸造。"] }
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
      <div className="docNavLinks"><Link href="/pitch">PITCH</Link><Link href="/game">GAME</Link><Link href="/economics">ECONOMICS</Link><Link href="/participate">PARTICIPATION</Link></div>
      <div className="docNavEnd"><Link href="/#mint">MINT PASSPORT ↗</Link><LangToggle/></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i/><Bi en="ECONOMIC MODEL / GENESIS PASSPORT" zh="经济模型 / GENESIS 护照"/></div>
      <h1><Bi en={<>One Passport.<br/>Three prices.</>} zh={<>一份护照。<br/>三档价格。</>}/><br/><em><Bi en="Earned, not guessed." zh="靠参与，不靠猜。"/></em></h1>
      <p><Bi
        en={<>The Genesis Passport is a fixed 4,444 supply that cannot be transferred, and the contract that mints it is <b>immutable — never upgraded</b>. One live price on chain, two honest ways to pay less than it, and one wallet per Passport. No token: the mission and play record is the interface a later incentive layer reads.</>}
        zh={<>Genesis 护照总量固定 4,444、不可转让，铸造它的合约<b>不可升级</b>。链上一个实时价格、两种诚实的少付方式、一钱包一份护照。没有 token：任务与游玩记录，就是之后激励层要读取的那份接口。</>}/></p>
      <div className="pitchHeroActions">
        <Link className="primary" href="/play"><Bi en="PLAY THE GAME" zh="开始游戏"/> <span>↗</span></Link>
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
      {tile(["HALF PRICE", "半价"], live ? live.half : "—", ["ANY WALLET WITH A RECORDED PARTICIPATION", "任何有参与记录的钱包"])}
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
            en={<>A Passport is a seat, not a yield: soul-bound, one per wallet, and idle until its wallet shows up. What the game produces is not a token — it is a <b>record</b>, and the record is the thing a pool would later be split by. So the two loops share an outer shape and burn a different fuel.</>}
            zh={<>一份护照是座位，不是收益：灵魂绑定、一钱包一份，在它的钱包出现之前一直闲置。游戏产出的不是 token——是一份<b>记录</b>，而记录正是之后用来切分池子的东西。所以这两个循环外形相同，烧的燃料不同。</>}/></p>
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
        en={<>a miner keeps producing while its owner sleeps. A Passport does not: the holder has to play, and the playing is the mining. That is a deliberate trade — what accumulates is a record of <b>work</b>, not of ownership, and a record of work can be weighted by what a wallet did, which a balance structurally cannot express.</>}
        zh={<>矿机在主人睡觉时照常产出。护照不是：持有者必须去玩，而「玩」本身就是挖矿。这是一次刻意的取舍——积累下来的是<b>劳动</b>的记录，不是所有权的记录；而劳动的记录可以按「这个钱包做过什么」加权，这是余额在结构上表达不了的。</>}/></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="06 · THE WEIGHT · HOW A POOL WOULD SPLIT · ROADMAP" zh="06 · 权重 · 池子会怎么切 · 路线图"/></span>
        <div>
          <h2><Bi en={<>The key is the play record.<br/><em>Every input already exists.</em></>} zh={<>钥匙就是游玩记录。<br/><em>每个输入都已经存在。</em></>}/></h2>
          <p><Bi
            en="If a pool exists, this is the key it would be split by. Nothing below is deployed and no percentage is set anywhere — but every number it reads is already written, generation by generation, by code that is running today."
            zh="如果将来有池子，这就是切分它的那把钥匙。下面没有任何东西已部署、也没有任何比例被设定——但它读的每个数字，今天都已经被正在运行的代码一代一代写下来了。"/></p>
        </div>
      </div>

      <div className="docSteps">{weight.map((row) => <article key={row.n}><span>{row.n}</span><div><h3><Bi en={row.title[0]} zh={row.title[1]}/></h3><p><Bi en={row.body[0]} zh={row.body[1]}/></p></div></article>)}</div>

      <div className="docTableWrap" style={{ marginTop: 26 }}>
        <table className="docTable">
          <thead><tr>
            <th><Bi en="SEASON OUTCOME" zh="赛季结果"/></th>
            <th><Bi en="BLOCKS EARNED" zh="挣到的区块"/></th>
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
            en="The contract emits its mint and mission events in public; the server keeps the play record and recomputes it with a pure function. Both sides of the interface exist before the incentive layer that would consume them."
            zh="合约公开地发出铸造与任务事件；服务端保留游玩记录，并用纯函数重算。这个接口的两端，在消费它的激励层出现之前就已经存在。"/></p>
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
            en={<>Section 07 says where a token era would route fees. This one says how it would be earned, which is the harder question: a play record is public and reproducible, so a token paid on it directly is a race to paste the same answer. Every rule below exists to turn that back into a search — and all of it is design, with no date and nothing behind it.</>}
            zh={<>第 07 节说的是代币时代要把手续费送去哪里，这一节说的是它会被怎么挣出来——这才是更难的那个问题：游玩记录公开且可复现，所以直接按它发币，只会变成一场「谁先粘贴同一个答案」的竞赛。下面每一条规则，都是为了把它变回一场搜索——而它们全部都是设计，没有时间表，背后也没有任何东西。</>}/></p>
        </div>
      </div>
      <div className="docCards six">{mining.map((card) => <article key={card.title[0]}><span><Bi en={card.tag[0]} zh={card.tag[1]}/></span><h3><Bi en={card.title[0]} zh={card.title[1]}/></h3><p><Bi en={card.body[0]} zh={card.body[1]}/></p></article>)}</div>
      <div className="docNote"><b><Bi en="WHAT HAS TO CHANGE FIRST — " zh="必须先在前面改掉的——"/></b><Bi
        en={<>today&apos;s game is a fifty-second generation with one predator and one escape decision, and its rules are entirely public. Mining needs a problem that costs something to solve — the opposite of a published optimum. Until that changes, the record is a record, not a wage.</>}
        zh={<>现在的游戏是一代五十秒、一个捕食者、一次逃脱决定，规则完全公开。挖矿需要一个「解起来有代价」的问题——而「把最优解公开」正好是它的反面。这一点改掉之前，记录是记录，不是工钱。</>}/></div>
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
        <article><b><Bi en="WHAT YOU CAN DO NOW" zh="现在能做什么"/></b><p><Bi en="Play a generation or enter an arena window with a wallet, and the half-price rung is on record. Complete a verified mission and the Passport costs nothing but gas — and the record you earn is the one the later layer will read." zh="用钱包玩一代、或进入一个竞技场窗口，半价档就记在名下了。完成一个已验证任务，护照就只花 gas——而你挣到的记录，正是之后那一层将要读取的记录。"/></p></article>
      </div>
    </section>

    <section className="pitchFinal">
      <span><Bi en="THE LADDER IS ALREADY OPEN" zh="价梯已经开着"/></span>
      <h2><Bi en={<>Play a generation.<br/><em>Pay half. Or nothing.</em></>} zh={<>玩一代。<br/><em>半价，或者免费。</em></>}/></h2>
      <div className="docActions">
        <Link className="primary" href="/play"><Bi en="PLAY THE GAME" zh="开始游戏"/> <span>↗</span></Link>
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
