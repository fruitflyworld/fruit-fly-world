# Flies That Trade (market/1)

> **It can brag. Every number replays.**

A fruit fly sniffs the market and trades from its own wallet. Trading fees are
its food; when they dry up it starves and the next generation carries on. Every
tick is sealed and chained, so any number the fly brags about can be recomputed
— by the server, by your browser, or by you with the code in this repo.

Live pages:

| Page | What it is |
| --- | --- |
| `/` | The homepage: Dusty live in its dish, how it works, the replay check, the x402 menu, the $FLY plan |
| `/fly/dusty` | Dusty's own page: arena, wallet, holdings, diary, sealed log, lineage, x402 menu |
| `/fly/dusty/replay?season=S&tick=T` | One tick, recomputed by the server and by your browser, compared |
| `GET /api/fly/dusty?season=S&tick=T` | The server's replay of one tick as JSON |
| `/dish` | The original survival game homepage (agent skill, Passport mint) |

Status: **paper season**. Simulated coins, paper money. No token is live.

---

## 1. Where the decisions come from

The fly's decision layer is the **unchanged FFW-CX/0.1 circuit** the game ships
(`public/play/js/cx-circuit.js`): 24 neurons, a connectome-inspired structure,
and a Giant Fiber escape neuron driven by LC4 and LPLC2 with weights taken from
real synapse counts. It is **not** a whole-brain simulation. The complete
FlyWire connectome has 139,255 neurons; we do not run it and do not claim to.

The engine (`app/lib/market/engine.ts`) only translates. The circuit already
takes four inputs and returns four behaviors — the same contract the survival
game uses:

| Circuit input | Market meaning |
| --- | --- |
| `food` | Scent of the coin the fly is heading for: volume and distinct buyers versus their averages, plus momentum, falling off with distance |
| `threat` | How hard the coins it holds are falling (drop below the slow average, plus bitterness); the target coin counts at 60% |
| `light` | Market breadth: the share of coins rising (scaled ×0.3) |
| `novelty` | It just switched target (1, decaying ×0.7 per tick) |
| `hunger` | 1 − energy |

| Circuit behavior | What the body and wallet do |
| --- | --- |
| `approach` | Fly toward the target. Landing on it (distance ≤ 0.075) buys 25% of cash, at most once per 30 ticks per coin |
| `avoid` | Back away from the worst-falling holding and sell half of it |
| `avoid` + Giant Fiber spike | Escape: fly fast and **sell every position** |
| `explore` | Drift toward the second-best scent |
| `freeze` | Hold still, hold positions |

The fly's target switches only when a new scent beats the current one by 35%
(hysteresis), so it commits instead of twitching between coins.

## 2. Food, death, rebirth

- Energy falls by `0.0011` per tick (metabolism) and rises with fee income
  (`0.0015` per paper USD). Direct feeds (x402) add to the same stream.
- The paper fee stream has a daily rhythm — busy at noon UTC, quiet at
  midnight — so a fly can starve in the quiet hours. That is the point.
- Energy 0 → **starved**. Equity under 5% of the start → **broke**. Positions
  close at the last price; after 40 ticks the next generation hatches with 80%
  of the estate and a fresh circuit (seeded from the fly and generation).
- Estate under $10 → the lineage is **extinct** until the next season.

## 3. Seasons and the clock

- One tick every 3 seconds; one season = one UTC day = 28,800 ticks.
- Season 0 starts at 2026-10-10 00:00 UTC.
- Everyone sees the same fly in the same place at the same moment, because the
  state at tick N is a pure function of (fly seed, season, N). There is no
  server state. The browser replays the day from midnight on page load (a
  full day is about 0.5 s in Node) and then steps once per tick.

## 4. Sealing and replay

Each tick produces a record:

```json
{"v":"market/1","t":1500,"g":1,"st":"alive","s":[0.77,0,0.15,0.49],"h":0.55,
 "b":"approach","c":0.44,"p":[0.44,0.16,0.25,0.15],"gf":false,"tg":2,
 "x":0.624,"y":0.36,"e":0.45,"eq":1075.47,"tr":[]}
```

- `recordHash = FNV-1a(stableStringify(record))` — the same hash as `flyline-log/1`.
- `chain = FNV-1a({p: previousChain, r: recordHash})`, starting from `00000000`.

One chain hash at tick N therefore commits to every tick before it. The
`VerifyWidget` and the replay page ask the server for a chain hash, recompute
the same tick in the browser from tick 0, and print **IDENTICAL** or
**DIVERGED**. DIVERGED is a bug report.

### Determinism rules (enforced by `tests/market.test.ts`)

- `engine.ts` and `tape.ts` use only `+ − × ÷`, `Math.sqrt`, `Math.round`,
  `Math.min/max`, `Math.imul`. No `Math.sin/cos/exp/log/pow/atan/random` — their
  last ulp differs between machines (see `determinism.md`). The circuit uses
  `dexp` from `dmath.js`.
- Coin positions are literals, not computed with trigonometry.
- Rendering (`Arena.tsx`) may use anything; it never feeds back into the engine.
- Pinned goldens: season 0 tick 0 `3e8de650`, tick 2000 `003ad503`, tick
  28799 `55bdf958`; season 3 tick 15000 `ab9a2b5f`.

**Changing anything that changes a run** (tuning in `P`, the tape, signal
formulas, record fields) is a WORLD change: bump `MARKET_WORLD_VERSION` to
`market/2`, regenerate the goldens, and say why in `CHANGELOG.md`.

## 5. Paper mode vs live mode

| | Paper (now) | Live (after launch) |
| --- | --- | --- |
| Coins | BANANA, MANGO, PLUM, FIG, KIWI, PEAR — invented | A menu chosen by holders, with a liquidity floor |
| Prices, volume, buyers | Generated from a seed (`createPaperTape`) | Recorded snapshots, same `TapeTick` shape |
| Food | Simulated fee stream | The token's real creator fees + x402 feeds |
| Money | Paper | The fly's on-chain wallet |
| The future | Computable (it's a seeded tape) — the API refuses future ticks, but the code can run ahead | Unknowable: the tape is recorded as it happens and its hash is published per season |

Live mode needs, before any real money moves:

1. A tape recorder that snapshots the menu every tick and publishes the tape hash.
2. **Commit before reveal** for trades: the decision hash is published first and
   the replay after the fill, so nobody can front-run the fly (the weekly race
   already uses this pattern).
3. A wallet policy the AI cannot rewrite: only menu coins, a size cap per
   trade, no transfers to arbitrary addresses, an independent signer that
   re-checks every transaction.

## 6. The fly homepage and x402

Every fly gets a page (`/fly/<slug>`) where it brags — and every number links
to its replay. Visitors and AI agents will be able to pay the fly with x402:

| Action | Example price | What it does |
| --- | --- | --- |
| Feed | $0.10 | Adds energy (enters the tape as `feeds`) |
| Shout-out | $1 | Its next diary entry names you; numbers stay its own |
| Famous-moment certificate | at launch | A sealed replay of one classic trade |
| Sponsor a food spot | at launch | Your coin on the menu, labelled "sponsored" — a spot, never a buy |
| Bet on the weekly race | after GameFi opens | Uses the written-and-tested `WeeklyRace` contract |

x402 settles in USDC. **The chain you pay on is independent of the chain the
token lives on.** Nothing on the site takes money today, and the x402 cards
say so.

## 7. Token plan

- $FLY launches through **ClawPump on Robinhood Chain** (fair launch; the
  creator fee share funds the flagship fly's food and the project).
- Genesis Passport holders (already on Robinhood Chain, chainId 4663) get
  airdrops and priority hatching first.
- A launchpad launch is a fair launch, so the old "10% ecosystem reserve" in
  `FlyToken.sol` does not apply; ecosystem rewards come from fees instead.
- **On launch day:** replace the "any token is fake" lines (README, homepage
  `#launch`, footer) with the real contract address, published here first.

## 8. Files

```
app/lib/market/tape.ts       paper tape (deterministic market) + coin menu
app/lib/market/engine.ts     market/1: senses → FFW-CX/0.1 → body/wallet → sealed record
app/lib/market/fly.ts        flagship profile, season clock, runTo/startSeason
app/lib/market/diary.ts      brag lines from sealed events (EN/中文), each with its tick
app/components/fly/          LiveFly (browser replay), Arena (canvas), widgets, nav/footer
app/page.tsx                 new homepage
app/fly/[slug]/page.tsx      fly homepage
app/fly/[slug]/replay/       one tick, server vs browser
app/api/fly/[slug]/route.ts  server replay API
app/dish/page.tsx            the previous homepage, moved
app/flies.css                styles for the pages above (tf* classes)
tests/market.test.ts         determinism, goldens, wallet sanity, diary, no-platform-math guard
```
