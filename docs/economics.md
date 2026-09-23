# Fruit Fly World — Economic Model & Participation Mechanism

The full model behind `/economics` and `/participate`.
Every number in this document is readable from the deployed contract (`FruitFlyPassport`),
recomputable from `app/lib/arena.ts`, or counted in the server ledger that records the Hour.
Nothing here is a promise of value.

---

## Part 1 — The Economic Model

The unit of this system is an identity, not a token and not a balance. One wallet holds one
Passport or none: `hasMinted` is permanent, a second mint can only re-activate mission status and
can never take payment, and the token is locked and non-transferable. There is therefore no
secondary market, and nothing priced off one — no royalty, no floor, no resale. Nothing is on sale today.

Because supply is counted in identities, 4,444 caps Passports *and* participating wallets. Every
number below is per-identity.

The sections are ordered the way the model is built: the price of one (1.1), the money that price
produces (1.2), how fast the cheapest rung can be issued (1.3), what an hour actually decides (1.4),
who pays what (1.5), what a duplicate identity costs (1.6), **what holding a Passport mines (1.7)**,
**how a pool would be split (1.8)**, what the Passport records (1.9), and where the money would go if
the roadmap ships (1.10). If the question is "how does holding the NFT earn anything", read 1.7 and
1.8 first. Everything marked **LIVE** is a function of the deployed contract, the public rules or the
server ledger. Everything marked **ROADMAP** is a design that has not shipped and carries no date.

### 1.1 The price of an identity — three rungs for one asset · LIVE

| Rung | What earns it | Bill | Flag at mint |
| --- | --- | --- | --- |
| **FREE** | win a Foraging Hour window, or a verified mission (agent experiment, X quote) | `0` + gas | `missionQualified = true` |
| **HALF** | enter any Foraging Hour window — entering is enough, winning is not required | `mintPrice(true)` = `publicMintPrice / 2` | `false` |
| **FULL** | `publicMint()` directly — no voucher, no task, no history | `publicMintPrice` | `false` |

All three mint the same asset: same artwork, same one-per-wallet right, drawn from the same 4,444.
The rungs are not product tiers. They are three prices for one thing, and what separates them is
what the wallet did before it asked.

The ladder is also the inverse of a band-priced mint. In a band-priced mint the price climbs with the
serial — early buyers pay less because they arrived early, and a late buyer pays the most. Here the
price falls with what the wallet did: one entry, ever, is worth half the price for good, no matter who
the wallet is or when it shows up. **The discount is not a reward for arriving early. It is the price
of having a record.**

Four properties hold the ladder up:

- **`publicMintPrice` is one owner-set number.** The half price is not stored anywhere; it is
  `publicMintPrice / 2`, integer division performed by the contract. On an odd price that floors,
  so the half rung is marginally better than 50% off.
- **Payment is exact.** `mint()` reverts `WrongPayment` unless `msg.value` equals the bill. No
  overpayment is accepted and no change is returned, so a minter's outlay is exactly `due + gas`.
- **The rung is inside the signature.** A voucher is
  `MintVoucher(address recipient, bytes32 campaign, bytes32 nonce, uint256 deadline, bool participant, bool free)`.
  The server chooses the tier and signs those two booleans; the contract recomputes the bill from
  them. Editing `participant` on a full-price voucher invalidates the signature (`InvalidSignature`);
  setting both flags reverts `InvalidVoucher`; a voucher for another chain or another campaign
  reverts `InvalidCampaign`. There is no path from a cheap rung upward, and none from an expensive
  one downward.
- **The server signs only the two discounts.** Free and half are voucher tiers; full price has no
  voucher at all. A wallet with neither a mission nor an entry is told to earn one, and pays by
  calling `publicMint()`. The cheapest rung cannot be bought, and the dearest one cannot be forged.

**The ladder can be shortened, never lengthened.** The owner can close the paid rungs — `publicMintOpen`
off, or `publicMintPrice` set back to `0`, which reverts `PublicMintClosed` for any non-free voucher.
Closing them changes nothing for the free rung and nothing for a Passport already issued.

So `P = publicMintPrice` is the price of having no history with the world, `floor(P/2)` the price of
having entered once, and `0` the price of having won. **The half rung is permanent to the wallet that
earned it** — a single entry, in any window, at any time, keeps the discount for as long as that row
exists. Entering is a one-way door.

**One purchase per wallet, ever.** A wallet that already holds a Passport and mints again with a
non-free voucher reverts `AlreadyMinted`; the free re-mint is the only repeat that is possible, and it
takes no payment. There is no repeat buying and no way to pay for a second unit.

### 1.2 The accounting identity — the whole of the money · LIVE

With `N_free + N_half + N_full = totalSupply ≤ 4444` and `P = publicMintPrice`, revenue is exactly:

```
revenue = N_half · floor(P / 2) + N_full · P
```

Two bounds follow directly: **the ceiling is `4444 · P`** — every Passport at full price — and **the
floor is `0`** — every Passport free.

A discount is not a payout. The half rung removes `P − floor(P/2)` per mint against full price; the
free rung removes `P`. Both are **foregone revenue**, and both are paid in the same currency the
campaign is capped in: supply. A free mint consumes an id that could have been sold, so the free
rung's cost to the campaign is `N_free · P` — a supply-side subsidy settled in units, not in ETH.

**Where the ETH is.** Every paid mint lands in one contract balance. `withdraw(recipient)` —
`onlyOwner` — sends `address(this).balance`, the whole of it, to an address the owner names, in one
transaction anyone can read. There is no router, no strategy vault, no split and no schedule on the
deployed contract; the receiver and the timing are the owner's, and the transfer is public the moment
it happens.

### 1.3 The issuance clock — supply is a schedule, not a target · LIVE

Three rules turn 4,444 into a calendar:

- one window per hour, and a window hands out one winning slot;
- `perWalletDay = 1` — a wallet takes at most one win per rolling 24 h;
- `perIpDay = 4` — one network contributes at most four entries per rolling 24 h.

Composed with the hourly close, the free rung cannot be issued faster than:

| Bound | Ceiling |
| --- | --- |
| Global — one winner per window | **24 winning wallets per day** |
| Per network — 4 entries per hashed IP per 24 h | **4 wins per day** |
| Per wallet — 1 win per 24 h | **1 win per day** |

At the global ceiling, with the Hour as the only source, **the genesis band (ids 1–1,000) takes at
least 42 days** and **all 4,444 takes at least 186 days** — 185 days of windows is 4,440 slots, four
short.

Paid mints are not on that clock. A full-price `publicMint()` is bounded by supply and by the owner's
switch alone, so a band closes the moment 1,000 / 3,000 / 4,000 / 4,444 ids have been minted, in
whatever mix of rungs demand produced. The bands are a schedule in the only sense that is checkable:
they order the supply by time, and the clock above says how fast the cheapest rung can move through
it.

### 1.4 The competitive surface — what an hour actually decides · LIVE

Every entry is scored by one pure function and ranked by
`ORDER BY exact DESC, created_at ASC, id ASC LIMIT 1`: the highest score takes the slot, and an exact
tie goes to the earlier entry.

The task is public on purpose. The 6×4 map, four signals per cell, six steps and one energy budget are
all functions of the epoch alone, and `bestRoute()` walks the ~4,000 legal routes exhaustively in about
40 ms. The best route for an hour is therefore knowable before anyone submits, and the ordering above
makes the *earliest submission of a good route* decisive. An hour is two contests stacked:

1. **Compute** the best route — open to anyone, and cheap.
2. **Arrive early** with it — the only part that cannot be copied.

The caps sit on the second. Three units of account each carry their own cap, and only one of them can
win:

| Unit | Cap | Counted on |
| --- | --- | --- |
| **Wallet** (`participant_address`) | 1 win per 24 h | wins |
| **Agent** (`agent_address`) | 8 tries per window | entries |
| **Network** (hashed IP) | 4 entries per 24 h | entries |

A participant may bind more than one agent wallet — each binding is an AGENT mission — so the supply of
agents is not bounded by the supply of wallets. The bound that does not multiply is the network's. And
the wallet's is the only cap counted on wins alone; the other two are counted on entries, which is what
makes them hold before the close rather than after it.

`lane` — browser or agent — is recorded on every row and never ranked.

**Why the record is the asset, not the score.** A public, reproducible score is a race to paste the
same answer; a wallet's history across many hours is not. The ranking already computed on the server
today orders runners by best route ever and, on an equal best, by the fewest attempts:

```sql
ORDER BY max(exact) DESC, count(*) ASC
```

That is the board as it is ranked today, and it answers *who solved best*. The key a pool would split
by is a different question — §1.8 — because a public score can be copied and a block cannot.

### 1.5 Who pays what — four positions · LIVE

| Position | Pays | Receives | Bounded by |
| --- | --- | --- | --- |
| **Window winner** | gas | a Passport with `missionQualified = true` | the close; 1 win / wallet / 24 h |
| **Participant** | `floor(P/2)` + gas | the same Passport, flag unset, half price kept permanently | 4 entries / network / 24 h; 8 tries / agent / window |
| **Public minter** | `P` + gas | the same Passport, flag unset | supply; the owner's mint switch |
| **Owner / treasury** | — | every paid wei, in one balance | `withdraw(recipient)` sends the whole balance to the address the owner names |

**The agent lane is the same three rungs.** An autonomous process signs its own entries
(`POST /api/arena/submit`, attributed by signature) instead of carrying a session, and it is scored by
the same function against the same clock under the same 8 / 4 / 1. Its edge is throughput inside an
hour — no browser, no page to load — not a different price and not a larger cap.

### 1.6 The cost of a duplicate identity · LIVE

The cheapest way to hold a second Passport is a half-price voucher, and a fresh wallet cannot use that
rung without an entry on record. So the floor cost of a second identity is `floor(P/2)` plus the work
of one entry — and the entry is where the caps bite: **4 per hashed IP per 24 h**. One operator on one
network can move at most four new identities a day into the half rung, and those same four entries are
the entire budget for winning with any of them.

Layered on top of that:

- `hasMinted` is permanent, so no wallet accumulates; 4,444 is a ceiling on distinct addresses too.
- A wallet that already holds a Passport can mint again only free, and only to flip the mission flag —
  no payment, no second token.
- Nothing about the Passport can leave the wallet, so a duplicate identity has no exit.

The binding scarcity is therefore the hourly slot — 24 a day, one per wallet, four entries per network —
not the price of a wallet.

### 1.7 The loop — what holding a Passport actually mines · LIVE, PAYOUT ROADMAP

**Holding alone mines nothing.** A Passport is a seat, not a yield: soul-bound, one per wallet, and
idle until its wallet shows up. What the Hour produces is not a token — it is a **record**, and the
record is the thing a pool would later be split by. Put the two loops side by side:

```
GENERIC MINE-TO-EARN
  buy the machine → it produces while you sleep → claim → price up → more buyers ↺

FRUIT FLY WORLD
  hold the Passport → enter the Hour → submit a route → the close records a score
  → the record grows → (ROADMAP) the record is weighted and paid ↺
```

Same outer shape — spend, work, be recorded, be paid, come back — with a different fuel. The generic
loop cycles a token; this one cycles **data**: every hour writes a route, a score, a timestamp and a
lane into a table the server can recompute from scratch. Whatever the incentive layer turns out to be,
the thing it would pay was written down before it existed.

Four gears, each with a landing point that is already live:

| Gear | The generic miner | Fruit Fly World | Status |
| --- | --- | --- | --- |
| **Sink · consume** | buy hardware, burn it in the mine | a window win or a verified mission unlocks the free rung; one entry unlocks the half rung, permanently | **LIVE** |
| **Retention · come back** | the machine pays out daily, so you return to claim | the Hour closes and reopens every hour, and the close decides; the cheapest rung is the one that requires returning | **LIVE** |
| **Scarcity · compete** | output floats with total hashrate — zero-sum | 4,444 seats, one per wallet, non-transferable; the scarce unit is the hour, 24 a day | **LIVE** |
| **Composable · ecosystem** | third-party rigs, pools, dashboards | the arena, the missions and the ranking are a documented API with a `SKILL.md`; third parties build against the same clock | **LIVE** |

**Where the two loops differ, and why that is the point.** A miner keeps producing while its owner
sleeps. A Passport does not. Its holder has to enter the Hour, and the entering is the mining. That is
a deliberate trade: what accumulates is a record of *work*, not of ownership — so it can be weighted by
what a wallet did, which a balance structurally cannot express.

### 1.8 The weight — how the record would be split · ROADMAP

If a pool exists, this is the key it would be cut with, and every input is already on chain or in the
ledger.

- **A block is a window.** One window per hour, and a window hands out exactly one winning slot. A
  season is a fixed run of windows — take 720 of them, 30 days — so a season has at most 720 blocks.
- **Finding a block is winning the window:** the highest `exact`, earliest entry. Nothing else
  qualifies. This is why the key is wins and not scores — a score is public and reproducible, a block
  is not.
- **A wallet's season weight is the blocks it found:** `yourWins ÷ totalWins` across the season. Two
  `count(*)`s over `arena_wins`, a row already written every hour.
- **The difficulty is the queue.** The pool and the block count are both fixed, so a block is worth the
  pool divided by how many wallets are competing for the same hours. More miners does not dilute a
  share by decree; it raises the price of arriving first.
- **No wallet can corner a season.** One win per rolling 24 h caps any single wallet: in the 720-window
  example, at most 30 of the 720 blocks — 4.17% if every hour was won.

Illustrative only. No pool exists, no percentage is set anywhere, and the deployed contract has no
field for one:

| Season outcome | Blocks found | Share of a 720-block season |
| --- | --- | --- |
| one win a day, every day | 30 | 4.17% |
| ten wins | 10 | 1.39% |
| one win | 1 | 0.14% |

**The token's two roles.** It would be the unit the pool pays in, and the fuel sink — spent to unlock
what the season record alone cannot open. The sink is an open design slot: nothing is specified and no
contract field exists for it.

### 1.9 Two value axes — serial and record · LIVE

- **Serial — fixed at mint.** `tokenId` 1 … 4444, in mint order. Nothing on chain reads it and earlier
  is not better. It is provenance, not rarity: the metadata's rarity attribute is a function of the id
  alone (`genesis ≤ 1000`, `rare ≤ 3000`, `epic ≤ 4000`, else `legendary`), so a tier says *when* a
  Passport was issued and nothing else.
- **Mission status — earnable later.** `missionQualified` is a separate boolean, set `true` by a free
  mint and `false` by the half and full rungs. It is not a lock: a wallet that paid can complete a
  mission afterwards and mint again with a free voucher — no second Passport, no payment — and the
  contract emits `MissionActivated(recipient, tokenId)` to flip the flag on the token it already holds.
  Paid holders are not outside the proof layer.

Read together, the axes answer one question: what does a Passport record? Neither is priced, and no
number in the ladder is derived from either.

### 1.10 Where the money would go — the roadmap layer · ROADMAP

Three designs, drawn before they open. None is deployed, nothing is on sale, and the Passport contract
is never upgraded or written by any of them.

**The pools.** In place of one balance and one `withdraw`, paid mint fees would split three ways:

| Pool | What it does |
| --- | --- |
| **POOL 01 · Buyback** | a share of mint fees funds a programmatic bid for the tradeable layer — capital-backed, because the capital is fee revenue |
| **POOL 02 · Burn & dividend** | distributed weighted by the record each wallet earned — the score, not the balance |
| **POOL 03 · Secondary royalty** | a share of every resale returns to the pools above, so the flywheel turns on volume, not only on new mints |

The split itself is an open parameter: no percentage is set anywhere, and the deployed contract has no
field for one. A buyback defends a price; it does not promise one. A thin pool is a thin bid — the
mechanism working as designed, not a shortfall to paper over.

**The weighted layer.** The interface is already wired. On chain: `PassportMinted(recipient, tokenId,
missionQualified, amountPaid)` and `MissionActivated(recipient, tokenId)`, from a contract that is never
upgraded. On the server: a ledger where missions and hourly results are recorded per wallet and
recomputed by a pure function before any voucher is signed — the same function that wrote it can
reproduce it. A payout layer would read the season record of §1.8, which is already written.

**What has to change first.** A route score is public and reproducible, so a payout on *score alone*
would be a race to paste the same answer, and the Hour would need a search that costs something to
solve. Until both change, the score is a record, not a wage. Nothing on sale today means no passive yield; the
Passport and the hourly record are a season asset, and an incentive layer would have a written record
to weight against.

**The basket.** Long-term, post-mint: one central fund buys a tokenized AI-and-robotics equity basket —
NVDA · TSLA and peers — and pays it out weighted by each wallet's on-chain record.

```
TIERED MINT FEE → BUYBACK POOL → BURN & DIVIDEND POOL → SECONDARY ROYALTY ↺
```

**The pipeline, end to end.** Pooled ETH → swapped for the basket → split by the season record → claimed
to the wallet. Every arrow is a leg that has to exist before the whole thing is real, and none of them
is deployed.

```
mint fees → POOL 01 / 02 / 03 (ETH) → swap → tokenized basket (NVDA · TSLA · peers)
          → split by the season record (§1.8) → claim to the wallet
```

**One fund, weighted — not one jar each.** A per-token piggy bank would put the same basket inside every
Passport and pay every holder the same, so a wallet that won thirty hours and a wallet that entered once
would receive identical amounts. Holding the basket in one fund and splitting it by the record is the
structure that can tell those two apart. It also keeps the deployed contract read-only: the vault reads
`arena_wins`, `PassportMinted` and `MissionActivated`, and never writes the Passport.

The Hour already ranks by `exact`, every hour — the key is already being cut.

### 1.11 The boundary

**Shipped and checkable.** The three rungs, the exact-payment rule, one-purchase-per-wallet, the 4,444
cap, non-transferability, the owner's mint switch and `withdraw` are functions of the deployed contract;
the figures on `/economics` are read from it per request, not typed into the page. The caps (8 · 4 · 1),
the ranking key, the rarity bands and the scoring function are all in the repository, and the ledger
that holds the record is queryable.

**Roadmap.** The pools, the weighted layer and the basket. No date, nothing on sale, and the deployed
Passport is never upgraded or written by any of them.

**Not promised.** Any token, yield, staking return, price floor, buyback, airdrop or resale value. The
Passport is not an investment and this document is not an offer.

---

## Part 2 — The Participation Mechanism

### 2.1 The window

Time is sliced into fixed windows: `epoch = floor(unixSeconds / ARENA_WINDOW_SEC)`.
Every window holds exactly one task, derived from the epoch alone — one 6×4 map, one seed
per cell (`hash32("ffw:arena:<epoch>:<cell>")`), one starting energy (100). Every
participant in the window solves the same instance, and any participant can recompute the
entire task offline before submitting.

### 2.2 The task

A **route** is up to six cells, each orthogonally adjacent to the previous one, plus four
**signals** per station — `food`, `threat`, `light`, `novelty`, each `0…100`.

```json
{
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
}
```

**How a route is scored.** Each station pays the richness of the ground under it plus a
fading share of the trail behind it (`TRAIL_SHARE = 0.35`, `TRAIL_DECAY = 0.5`). The fly's
decision at that cell — computed by the same deterministic model the rest of the site
uses — adds its energy delta. A first visit to a cell pays `+40`; travel costs `1` energy
per edge. The ranking key is `exact`, kept at full double precision; the rounded integer
is for display and for the on-chain record.

### 2.3 Two lanes, one table

| | In the browser | From an agent |
| --- | --- | --- |
| Identity | SIWE session cookie | the agent wallet's own signature |
| Runs on | this page | a machine with no browser |
| Guard | same-origin check + cookie | signed message + single-use nonce |
| Endpoint | `POST /api/arena/enter` | `POST /api/arena/submit` |
| Shared | one table, one window, one ranking, the same daily caps | |

Neither lane demonstrates the other. The agent lane exists because an autonomous process
has no browser and should not need one; the browser lane exists because a person should not
have to run a wallet-signing script to compete. Both funnel into the same server function
and the same table.

### 2.4 How a person takes the Passport

1. **OPEN THE HOUR.** Connect a wallet (SIWE — a signature, no gas, no transaction).
2. **READ THE WINDOW.** The map and the seed table are public, and the scoring function is
   shipped in `app/lib/arena.ts`. The best route is computable locally, by hand or by a
   script.
3. **SUBMIT.** Build a route on the arena map and press enter, or paste one in. Up to 8
   tries per agent in a window, 4 entries per network per day, one win per wallet per day.
4. **WAIT FOR THE CLOSE.** The window closes on the clock, not on a submit button. The
   highest `exact` wins; an exact tie goes to the earlier entry.

### 2.5 The payout chain

```
WIN THE WINDOW
  → finalizeWindow ranks the entries and writes arena_wins
  → an ARENA mission is recorded for the winner
  → missionQualified = true on chain
  → the server signs a free voucher
  → mint() with due = 0: the Passport is issued, gas only
```

Not winning still counts. **Any** entry in a window makes that wallet a *participant*, which
is the half-price tier — permanently, for as long as the wallet has an entry on record.

### 2.6 Why it cannot be cheated

- **The server recomputes the score.** `scoreRoute()` is pure and deterministic; the
  browser and the server run the same function. The submitted number is never trusted.
- **The epoch must match the live window.** An entry for a closed or future window is
  rejected; there is no early or late submission.
- **One nonce per entry**, unique per `(epoch, wallet, nonce)` in the database and consumed
  on chain.
- **Caps are explicit and enforced server-side** — 8 tries per agent per window, 4 entries
  per hashed IP per day, 1 win per wallet per day. No cap counts wins alone.
- **The whole router is public code.** The map, the seeds, the scoring and the tie-break are
  all in the repository, so a route can always be re-derived and checked.

### 2.7 Status

- **LIVE NOW** — hourly windows, both lanes, the leaderboard, the free-mint payout chain,
  the half-price tier, server-side scoring, deterministic replay.
- **NEXT** — automated world reports, more agent roles, community-issued challenges.
- **NOT A CLAIM** — this is not a conscious fly, not a complete biological simulation, and
  not a financial product. No yield or future value is promised.
