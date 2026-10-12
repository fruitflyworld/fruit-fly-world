import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { createPublicClient, formatEther, http } from "viem";
import { configuredChain } from "../lib/chain";
import { publicMintConfiguration } from "../lib/server/mint-voucher";
import { Bi } from "../components/Bi";

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
  { n: "01", tier: "FREE", body: "Complete a verified mission — an agent run, a quoted post, or a win in the arena. Gas is the only cost." },
  { n: "02", tier: "HALF", body: "Take part in a recorded activity: play the game, or enter an arena window. Taking part is the whole claim — the discount stays on record." },
  { n: "03", tier: "FULL", body: "Public mint. No task, no mission history, no wait — the standard price the contract is set to right now." }
];

/** The allocation the token era routes fees into. SR's three pools, mapped onto FFW. */
const pools: { tag: string; title: string; body: string }[] = [
  { tag: "POOL 01", title: "Buyback pool", body: "A share of mint fees funds a programmatic bid for the tradeable layer. Capital-backed — the capital is fee revenue, not a promise." },
  { tag: "POOL 02", title: "Burn & dividend pool", body: "Fee revenue accrues to a pool and is paid out to holders weighted by the record each wallet actually earned — the score, not the balance." },
  { tag: "POOL 03", title: "Secondary royalty", body: "A share of every resale routes back into the pools above, so the flywheel turns on trading volume rather than only on new mints." }
];

const guards: { title: string; body: string }[] = [
  { title: "ONE WALLET, ONE PASSPORT", body: "hasMinted is permanent and tokens cannot be moved, so a wallet is a person-shaped unit. Splitting across wallets costs a full price each time." },
  { title: "TIERS TRAVEL INSIDE THE SIGNATURE", body: "The voucher struct carries participant and free. Edit either flag on the way to the contract and the signature stops matching — there is no path upward from a cheap rung." },
  { title: "SINGLE-USE VOUCHERS", body: "Every voucher carries a one-time nonce and a deadline. A replay reverts AlreadyUsed; a stale one reverts Expired; a voucher for another campaign reverts InvalidCampaign." },
  { title: "THE CLIENT NEVER SCORES", body: "Activity records are recomputed server-side by a pure function before any voucher is signed. The number in the browser is a display, not an input — and it will still be a display when a record becomes a distribution weight." }
];

const axes: { tag: string; title: string; body: string }[] = [
  { tag: "FIXED AT MINT", title: "AXIS 1 · SERIAL", body: "tokenId 1 … 4444, written in mint order. Nothing on chain reads it and earlier is not better. It is provenance, not rarity." },
  { tag: "EARNED LATER", title: "AXIS 2 · THE RECORD", body: "missionQualified is a separate boolean. A wallet that paid full price can complete a mission afterwards and mint again with a free voucher — no second Passport, no payment, and the flag flips on the existing token." },
  { tag: "THE RECORD IS THE KEY", title: "BOTH ARE PROOF", body: "A serial proves when you arrived. Mission status and the activity record prove what you did here. In the token era, that record is the distribution key — which is why the client is never allowed to write it." }
];

/** The two loops, side by side. The generic one cycles a token; this one cycles a record. */
const loops = `GENERIC MINE-TO-EARN
  buy the machine → it produces while you sleep → claim → price up → more buyers ↺

FRUIT FLY WORLD
  hold the Passport → play the lineage → the generation is recorded
  → the record grows → (ROADMAP) the record is weighted and paid ↺`;

/** Four gears of the flywheel playbook, each with a landing point that is live today. */
const gearTable: { gear: string; generic: string; ffw: string }[] = [
  { gear: "SINK · CONSUME", generic: "buy hardware, burn it in the mine", ffw: "a verified mission unlocks the free rung; taking part once unlocks the half rung, permanently" },
  { gear: "RETENTION · COME BACK", generic: "the machine pays out daily, so you return to claim", ffw: "a generation lasts fifty seconds and a lineage spans many of them; the cheapest rung is the one that requires showing up" },
  { gear: "SCARCITY · COMPETE", generic: "output floats with total hashrate — zero-sum", ffw: "4,444 seats, one per wallet, non-transferable; and the egg count is compared against the wild type, not against another player" },
  { gear: "COMPOSABLE · ECOSYSTEM", generic: "third-party rigs, pools, dashboards", ffw: "the escape model, its wiring check and the game rules are public code with a documented agent interface; third parties build against the same simulation" }
];

/** ROADMAP: the key a pool would be split by. Every input already exists; the pool does not. */
const weight: { n: string; title: string; body: string }[] = [
  { n: "01", title: "A BLOCK IS A GENERATION", body: "A generation is the smallest unit of recorded play. A season is a fixed run of them, so a season has a bounded number of blocks — and the record of who earned which one is written as play happens." },
  { n: "02", title: "EARNING ONE IS PLAYING WELL", body: "Eggs laid, generations survived, mutations carried forward, and — in the arena layer — the highest exact score at the close. Every input is public and reproducible, which is exactly why the key is the record and not a single number." },
  { n: "03", title: "THE WEIGHT IS A RATIO OF RECORDS", body: "A wallet's season weight would be the blocks it earned over the blocks issued — yourBlocks ÷ totalBlocks. A count over rows a server already writes, not a new accounting system." },
  { n: "04", title: "THE DIFFICULTY IS THE QUEUE", body: "The pool and the block count are both fixed, so a block is worth the pool divided by how many wallets want the same ones. More participants does not dilute a share by decree; it raises the price of playing well." },
  { n: "05", title: "NO WALLET CAN CORNER A SEASON", body: "One wallet holds one Passport and a Passport cannot be moved, so a season's blocks cannot be bought up in bulk. Whatever the cap turns out to be, it is structural rather than enforced after the fact." }
];

const shares: { outcome: string; blocks: string; share: string }[] = [
  { outcome: "a strong lineage, every season", blocks: "30", share: "4.17%" },
  { outcome: "ten recorded blocks", blocks: "10", share: "1.39%" },
  { outcome: "one recorded block", blocks: "1", share: "0.14%" }
];

const interfaceCards: { tag: string; title: string; body: string }[] = [
  { tag: "ON CHAIN", title: "Public events", body: "PassportMinted(recipient, tokenId, missionQualified, amountPaid) and MissionActivated(recipient, tokenId) are emitted by the deployed contract. Ownership, supply and mission status are public reads on a contract that is never upgraded." },
  { tag: "SERVER LEDGER", title: "The play record", body: "Verified missions, generations played and arena results are recorded per wallet and recomputed by a pure function before any voucher is signed. The record is queryable, and the same function that wrote it can reproduce it." },
  { tag: "HONOR FIRST", title: "No token, no yield", body: "There is no token today, so there is no passive yield. The Passport and the play record are a season asset; when an incentive layer arrives it has a written record to weight against." }
];

/** Section 08 · how an incentive layer would be *earned*. Every rule below is a design
 *  we would have to build — none of it is a number that exists today, and none of it is
 *  a promise. It is on this page because a record that is public and reproducible cannot
 *  be paid directly without turning the game into a race to paste the same answer. */
const mining: { tag: string; title: string; body: string }[] = [
  { tag: "THE RIG", title: "A Passport is the licence", body: "4,444 in total, one per wallet, non-transferable. A rig can be neither bought in bulk nor rented back, so mining power is not something capital accumulates — it is something a wallet earns by playing well." },
  { tag: "THE UNIT", title: "Best run only", body: "A wallet may play many generations; only its strongest run in a period is scored for emission, or repetition itself becomes a multiplier. Exactly how a period splits its budget is an open design slot, not a number we have set." },
  { tag: "ANTI-HERD", title: "Why a copy guard is needed", body: "The moment an optimal route is published, copying it is free — and anything paid on score alone becomes a race to paste the same answer. What should be paid is the search and the play, not the paste." },
  { tag: "PERSISTENCE", title: "Eat, or starve", body: "What a wallet earns behaves like body weight: it decays when the wallet stops playing, and a multiplier rises with consecutive seasons and falls when one is skipped. Holding on its own earns nothing." },
  { tag: "EMISSION", title: "Supply follows attendance", body: "A period's budget is proportional to the number of distinct Passports that took part, capped per era and halved era on era. A period nobody plays emits nothing — there is no idle float waiting for a user base that has not arrived." },
  { tag: "SINKS", title: "An emission with no sink is a farm", body: "The sinks have to fit what already exists: spend to open something the record alone cannot open, and later cosmetic frames — while rarity stays fixed by serial and the 4,444 cap does not move." }
];

const flywheel: string[] = [
  "TIERED MINT FEE",
  "BUYBACK POOL",
  "BURN & DIVIDEND POOL",
  "SECONDARY ROYALTY"
];

const tokenEra: { tag: string; title: string; body: string }[] = [
  { tag: "01", title: "The flywheel", body: "Mint fees seed a buyback pool; the buyback defends the tradeable layer; a share of fees and of every resale lands in a burn-and-dividend pool; the royalty on secondary trades feeds it again. Each turn is funded by the one before it." },
  { tag: "02", title: "Treasury Vision · equities", body: "The treasury buys a tokenized AI-and-robotics equity basket — NVDA · TSLA and peers — and distributes it to holders weighted by each wallet's record. Ability becomes a score; the score becomes an allocation." },
  { tag: "03", title: "Why the record, not the balance", body: "Distribution weighted by what a wallet earned is a structure a plain \"one NFT, one jar\" model cannot express. The game already writes that record generation by generation — the key is already being cut." }
];

export default async function EconomicsPage() {
  const live = await liveEconomics();
  const tile = (label: string, value: string, note: string) => (
    <article><span><Bi en={label} /></span><b>{value}</b><small><Bi en={note} /></small></article>
  );
  const price = (n: string) => n === "02" ? (live ? live.half : "publicMintPrice / 2") : n === "03" ? (live ? live.full : "publicMintPrice") : "0 ETH + GAS";
  return <main className="pitchPage docPage">
    <nav className="pitchNav docNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="docNavLinks"><Link href="/pitch">PITCH</Link><Link href="/economics">ECONOMICS</Link><Link href="/participate">PARTICIPATION</Link></div>
      <div className="docNavEnd"><Link href="/dish#mint">PASSPORT · COMING SOON ↗</Link></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i/><Bi en="ECONOMIC MODEL / GENESIS PASSPORT" /></div>
      <h1><Bi en={<>One Passport.<br/>Three prices.</>} /><br/><em><Bi en="Earned, not guessed." /></em></h1>
      <p><Bi
        en={<>The Genesis Passport is a fixed 4,444 supply that cannot be transferred, and the contract that mints it is <b>immutable — never upgraded</b>. One live price on chain, two honest ways to pay less than it, and one wallet per Passport. No token: the mission and play record is the interface a later incentive layer reads.</>}
       /></p>
      <div className="pitchHeroActions">
        <Link className="secondary" href="/participate"><Bi en="HOW PARTICIPATION WORKS" /> <span>↓</span></Link>
      </div>
      <div className="pitchPromise">
        <span><Bi en="SUPPLY 4,444" /></span>
        <span><Bi en="NON-TRANSFERABLE" /></span>
        <span><Bi en="ONE PER WALLET" /></span>
        <span><Bi en="TOKEN ERA · ROADMAP" /></span>
      </div>
    </header>

    {/* Live reads, straight off the contract. */}
    <section className="docTiles" aria-label="Live on-chain figures">
      {tile("SUPPLY MINTED", live ? `${live.supply} / ${live.cap}` : "—", live ? "READ FROM THE CONTRACT JUST NOW" : "CONTRACT UNREACHABLE ON THIS REQUEST")}
      {tile("FULL PRICE", live ? live.full : "—", "PUBLIC MINT · NO TASK REQUIRED")}
      {tile("HALF PRICE", live ? live.half : "—", "ANY WALLET WITH A RECORDED PARTICIPATION")}
      {tile("STANDARD-PRICE CEILING", live ? live.ceiling : "—", "4,444 × THE PRICE ABOVE · ARITHMETIC, NOT A FORECAST")}
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="01 · MINT PRICING" /></span>
        <div>
          <h2><Bi en={<>One price on chain.<br/><em>Three rungs off it.</em></>} /></h2>
          <p><Bi
            en={<>The standard price is a single owner-set value on chain. The half price is not a second number — the contract computes <code>mintPrice(true)</code> itself. The tier is decided by the server and travels inside the EIP-712 signature, so it cannot be edited on the way to the contract.</>}
           /></p>
        </div>
      </div>

      <div className="docNote"><b>COMING SOON — </b>the Passport is not live, no NFT is being issued and nothing is on sale. The prices below are a paper model for the token era; they are only read from a contract once it opens.</div>
      <div className="docLadder">{pricing.map((row) => <article key={row.n}><span>{row.n}</span><h3><Bi en={row.tier} /></h3><b>{price(row.n)}</b><p><Bi en={row.body} /></p></article>)}</div>

      <div className="docCallout" style={{ marginTop: 26 }}>
        <b><Bi en={<>THE TIER IS<br/>INSIDE THE SIGNATURE</>} /></b>
        <span><Bi
          en={<>The voucher struct carries <code>participant</code> and <code>free</code>. Edit <code>participant</code> from false to true in a full-price voucher and the signature stops matching: the promotion reverts InvalidSignature. Set both flags and it reverts InvalidVoucher. There is no path upward from a cheap rung.</>}
         /></span>
      </div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="02 · FUND FLOW" /></span>
        <div>
          <h2><Bi en={<>Three pools and a floor.<br/><em>Drawn before they open.</em></>} /></h2>
          <p><Bi
            en={<>Every paid mint lands in one contract balance, and the pools below are where the token era routes it. All three are labelled roadmap: they are the destination, and the deployed Passport stays read-only underneath them.</>}
           /></p>
        </div>
      </div>
      <div className="docCards">{pools.map((card) => <article key={card.title}><span><Bi en={card.tag} /></span><h3><Bi en={card.title} /></h3><p><Bi en={card.body} /></p></article>)}</div>
      <div className="docNote"><b><Bi en="SOFT FLOOR, NOT A GUARANTEE — " /></b><Bi
        en="a buyback defends a price; it does not promise one. The floor is capital-backed, and the capital is fee revenue. If the pool is thin the bid is thin — that is the mechanism working as designed, not a shortfall to paper over."
       /></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="03 · ANTI-ABUSE" /></span>
        <div>
          <h2><Bi en={<>The cost of a sybil<br/><em>is the price of the asset.</em></>} /></h2>
          <p><Bi
            en="Every guard below is enforced either by the deployed contract or by the server that signs the voucher — not by a policy page. The same guards are what keep the record honest enough to one day carry a distribution weight."
           /></p>
        </div>
      </div>
      <div className="docCards four">{guards.map((guard) => <article key={guard.title}><span>◆</span><h3><Bi en={guard.title} /></h3><p><Bi en={guard.body} /></p></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="04 · TWO VALUE AXES" /></span>
        <div>
          <h2><Bi en={<>One axis is fixed at mint.<br/><em>The other can still be earned.</em></>} /></h2>
          <p><Bi
            en="No price is derived from these axes today. They answer one question, and point at the field the later layer reads: what does a Passport actually record?"
           /></p>
        </div>
      </div>
      <div className="docCards">{axes.map((axis) => <article key={axis.title}><span><Bi en={axis.tag} /></span><h3><Bi en={axis.title} /></h3><p><Bi en={axis.body} /></p></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="05 · THE LOOP · WHAT HOLDING ACTUALLY MINES" /></span>
        <div>
          <h2><Bi en={<>Holding alone<br/><em>mines nothing.</em></>} /></h2>
          <p><Bi
            en={<>A Passport is a seat, not a yield: soul-bound, one per wallet, and idle until its wallet shows up. What the game produces is not a token — it is a <b>record</b>, and the record is the thing a pool would later be split by. So the two loops share an outer shape and burn a different fuel.</>}
           /></p>
        </div>
      </div>

      <pre className="docCode">{loops}</pre>

      <div className="docTableWrap" style={{ marginTop: 26 }}>
        <table className="docTable">
          <thead><tr>
            <th><Bi en="GEAR" /></th>
            <th><Bi en="THE GENERIC MINER" /></th>
            <th><Bi en="FRUIT FLY WORLD" /></th>
            <th><Bi en="STATUS" /></th>
          </tr></thead>
          <tbody>{gearTable.map((row) => <tr key={row.gear}>
            <th><Bi en={row.gear} /></th>
            <td><Bi en={row.generic} /></td>
            <td><Bi en={row.ffw} /></td>
            <td><code>LIVE</code></td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="docNote"><b><Bi en="WHERE THEY DIFFER, AND WHY THAT IS THE POINT — " /></b><Bi
        en={<>a miner keeps producing while its owner sleeps. A Passport does not: the holder has to play, and the playing is the mining. That is a deliberate trade — what accumulates is a record of <b>work</b>, not of ownership, and a record of work can be weighted by what a wallet did, which a balance structurally cannot express.</>}
       /></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="06 · THE WEIGHT · HOW A POOL WOULD SPLIT · ROADMAP" /></span>
        <div>
          <h2><Bi en={<>The key is the play record.<br/><em>Every input already exists.</em></>} /></h2>
          <p><Bi
            en="If a pool exists, this is the key it would be split by. Nothing below is deployed and no percentage is set anywhere — but every number it reads is already written, generation by generation, by code that is running today."
           /></p>
        </div>
      </div>

      <div className="docSteps">{weight.map((row) => <article key={row.n}><span>{row.n}</span><div><h3><Bi en={row.title} /></h3><p><Bi en={row.body} /></p></div></article>)}</div>

      <div className="docTableWrap" style={{ marginTop: 26 }}>
        <table className="docTable">
          <thead><tr>
            <th><Bi en="SEASON OUTCOME" /></th>
            <th><Bi en="BLOCKS EARNED" /></th>
            <th><Bi en="SHARE OF A 720-BLOCK SEASON" /></th>
          </tr></thead>
          <tbody>{shares.map((row) => <tr key={row.blocks}>
            <th><Bi en={row.outcome} /></th>
            <td><code>{row.blocks}</code></td>
            <td><code>{row.share}</code></td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="docNote"><b><Bi en="ILLUSTRATIVE ONLY · THE TOKEN'S TWO ROLES — " /></b><Bi
        en={<>no pool exists and the deployed contract has no field for one. A token would be the unit such a pool pays in, and the fuel sink — spent to unlock what the season record alone cannot open. The sink is an open design slot: nothing is specified, and nothing is on sale.</>}
       /></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="07 · FUTURE TOKEN · INTERFACE ALREADY WIRED" /></span>
        <div>
          <h2><Bi en={<>No token today.<br/><em>The record it will read is already written.</em></>} /></h2>
          <p><Bi
            en="The contract emits its mint and mission events in public; the server keeps the play record and recomputes it with a pure function. Both sides of the interface exist before the incentive layer that would consume them."
           /></p>
        </div>
      </div>
      <div className="docCards">{interfaceCards.map((card) => <article key={card.title}><span><Bi en={card.tag} /></span><h3><Bi en={card.title} /></h3><p><Bi en={card.body} /></p></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="08 · FUTURE TOKEN · HOW IT WOULD BE EARNED" /></span>
        <div>
          <h2><Bi en={<>No token today.<br/><em>But the wage is already drawable.</em></>} /></h2>
          <p><Bi
            en={<>Section 07 says where a token era would route fees. This one says how it would be earned, which is the harder question: a play record is public and reproducible, so a token paid on it directly is a race to paste the same answer. Every rule below exists to turn that back into a search — and all of it is design, with no date and nothing behind it.</>}
           /></p>
        </div>
      </div>
      <div className="docCards six">{mining.map((card) => <article key={card.title}><span><Bi en={card.tag} /></span><h3><Bi en={card.title} /></h3><p><Bi en={card.body} /></p></article>)}</div>
      <div className="docNote"><b><Bi en="WHAT HAS TO CHANGE FIRST — " /></b><Bi
        en={<>today&apos;s game is a fifty-second generation with one predator and one escape decision, and its rules are entirely public. Mining needs a problem that costs something to solve — the opposite of a published optimum. Until that changes, the record is a record, not a wage.</>}
       /></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="09 · TREASURY VISION" /></span>
        <div>
          <h2><Bi en={<>The flywheel, drawn in full.<br/><em>Labelled as what it is: not deployed.</em></>} /></h2>
          <p><Bi
            en={<>This section is design: <b>the flywheel and the balance-sheet layer, built for a tradeable token</b>. It has no date, it is not a commitment, and nothing above depends on it shipping.</>}
           /></p>
        </div>
      </div>

      <div className="docFlow" aria-label="The flywheel">
        {flywheel.map((chip, index) => <Fragment key={chip}>{index > 0 ? <i>→</i> : null}<span><Bi en={chip} /></span></Fragment>)}
        <i>↺</i>
      </div>

      <div className="docCards" style={{ marginTop: 26 }}>{tokenEra.map((card) => <article key={card.title}><span>{card.tag}</span><h3><Bi en={card.title} /></h3><p><Bi en={card.body} /></p></article>)}</div>

      <div className="docCallout" style={{ marginTop: 26 }}>
        <b><Bi en={<>TREASURY VISION<br/>ABILITY → SCORE → EQUITY</>} /></b>
        <span><Bi
          en={<>The treasury layer buys a tokenized AI-and-robotics equity basket — <b>NVDA · TSLA</b> and peers — and pays it out to holders weighted by the record each wallet earned. A structure that distributes by what a wallet earned is one a plain \"one NFT, one jar\" model cannot express.</>}
         /></span>
      </div>

      <div className="docNote"><b><Bi en="READ-ONLY ON TODAY'S CONTRACT — " /></b><Bi
        en="the deployed Passport is never upgraded and never written by any of the above. Zero launch risk: if the token era never ships, the Genesis Passport is unaffected; if it does, it arrives as a separate contract with its own audit trail."
       /></div>
    </section>

    <section className="docBoundary">
      <h2><Bi en="The boundary, stated plainly." /></h2>
      <div>
        <article><b><Bi en="SHIPPED VS ROADMAP" /></b><p><Bi en="The three rungs, the 4,444 cap, the tier arithmetic and the non-transferability are live and checkable on chain. The flywheel and the equity basket are roadmap: designed, labelled, and carrying no date. Nothing here is an offer of a security or a return." /></p></article>
        <article><b><Bi en="REAL AND CHECKABLE" /></b><p><Bi en="The supply cap, the live price and the tier arithmetic are functions of the deployed contract. The figures at the top of this page are read from it per request, not typed in — and the contract is immutable, so a dashed line here means the chain is quiet, not that the numbers moved." /></p></article>
        <article><b><Bi en="WHAT YOU CAN DO NOW" /></b><p><Bi en="Play a generation or enter an arena window with a wallet, and the half-price rung is on record. Complete a verified mission and the Passport costs nothing but gas — and the record you earn is the one the later layer will read." /></p></article>
      </div>
    </section>

    <section className="pitchFinal">
      <span><Bi en="THE LADDER IS ALREADY OPEN" /></span>
      <h2><Bi en={<>Play a generation.<br/><em>Pay half. Or nothing.</em></>} /></h2>
      <div className="docActions">
        <Link className="secondary" href="/participate"><Bi en="SEE THE PARTICIPATION MECHANISM" /> <span>→</span></Link>
      </div>
    </section>
    <footer className="pitchFooter">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <p><Bi en="Figures follow the deployed contract. Nothing here is financial advice." /></p>
      <div className="docNavLinks"><Link href="/participate">PARTICIPATION ↗</Link><Link href="/">LIVE WORLD ↗</Link></div>
    </footer>
  </main>;
}
