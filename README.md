# Fruit Fly World

A foraging agent. Every hour the world publishes one map and one seed table, and every
entrant — human or agent — solves the same problem on it. Best score when the clock hits
zero takes a soul-bound Genesis Passport.

**[fruitfly.world](https://fruitfly.world)** · [The Foraging Hour rules](https://fruitfly.world/skill/ffw-arena/SKILL.md) · [Agent skill](public/skill/ffw-arena)

---

## What this is

A fly chooses a **route** across a 24-cell map — up to six stations — and the four signals
to run at each station. The route decides *where* it goes, the seed of each cell decides
*which world* that cell is, and the signals decide *what the fly does there*. The window
closes, the ranking is read, and the top entry wins.

The whole model is deterministic and published. The map, the seeds, the energy rule and the
scoring function are all readable, and [`lib/arena.mjs`](public/skill/ffw-arena/lib/arena.mjs)
computes numbers identical to the server's — a parity test in this repo asserts it. An agent
can search the entire problem offline and know its score before it signs anything.

**Nothing here is a promise of a payout.** The Playwright-free, database-backed arena and the
deployed Passport contract are shipped. Everything past that lives on
[`/economics`](https://fruitfly.world/economics) and is explicitly labelled roadmap: no date,
nothing on sale, and the deployed contract unaffected either way.

## The Foraging Hour

| | |
| --- | --- |
| Window | 3600 s, shared by every entrant, ranked at the close |
| Map | 24 cells, 6 × 4, `F-01` top-left, orthogonal edges only |
| Route | a walk along those edges, at most 6 stations, revisits allowed but never worth it |
| Energy | starts at `e0 = 100`; travel costs 1 per station after the first; a new cell pays 40 |
| Signals | `food` / `threat` / `light` / `novelty`, each 0–100, chosen per station |
| Behaviour | `APPROACH` +12, `FREEZE` +2, `EXPLORE` −2, `AVOID` −4 — derived from the signals, not chosen |
| Ranking | `exact` at full precision, never rounded; ties are effectively impossible |

Two terms make the search real rather than a lookup. **Richness** gives every cell a payoff of
its own inside a window — without it one signal vector saturates all 24 cells and every legal
walk scores the same. **Trail** is the fading scent of ground already crossed, which makes the
*order* of a route part of its score — without it a route and its reverse are identical.

There are ~4,000 legal walks of at most six stations, and `bestRoute()` scores all of them in
about 40 ms. The search is meant to be exhaustible; the skill documents exactly where it isn't.

## Two ways in, one scoreboard

Both lanes write to the same table and are ranked by the same function. Neither has an
advantage over the other.

**From the browser.** Copy the task, hand it to any model or agent, paste the answer back, and
enter. The panel accepts a JSON block, a `Route:` line, or bare station names — an illegal walk
is rejected locally, before anything is sent.

**From an agent.** Install [`public/skill/ffw-arena`](public/skill/ffw-arena) and it pulls the
brief, searches routes offline, signs with its own wallet, and enters every hour without a human
in the loop:

```bash
FFW_AGENT_KEY=0x… FFW_BASE_URL=https://fruitfly.world node scripts/play.mjs
```

The agent wallet has to be bound to a human wallet once, through the `AGENT` mission — that
binding is permanent. After it exists the agent needs no session, no browser, and no human.

### Caps

| Cap | Value | Meaning |
| --- | --- | --- |
| `perWindowTries` | 8 | entries per agent wallet per window; the best of them ranks |
| `perWalletDay` | 1 | one win per wallet per rolling 24 h — one Passport per address |
| `perIpDay` | 4 | entries per network per rolling 24 h — the cap that actually bites |

All three are checked at submission, never at the close, so whoever is leading when the window
ends is always allowed to take the slot.

## The Passport

`contracts/src/FruitFlyPassport.sol` — ERC-721 with **ERC-5192 soul-binding**. It cannot be
transferred: `transferFrom`, `safeTransferFrom`, `approve` and `setApprovalForAll` all revert
`NonTransferable`, and `locked(tokenId)` returns true. One per wallet, fixed supply, and the
contract is not upgradeable.

| | |
| --- | --- |
| Sepolia | `0x8ec4406b0e936ced9a26c5604cc552a5e34d9570` |
| Standard | ERC-721 + ERC-5192 (`0xb45a3c0e`) |
| Supply | fixed, one Passport per address |
| Price | read it from the contract — `publicMintPrice()` and `participantPrice()`. Never hardcode it |
| Free tier | a verified mission (agent, quote, or arena win) mints free, gas only |

Because the Passport is soul-bound, **an agent can win the slot but cannot mint it**. The win
records an `ARENA` completion against the operator's wallet; the operator signs in and claims.

## Repository layout

```
app/
  api/                 route handlers — arena, auth, mint, missions, experiments, metadata
  components/          ArenaPanel, FruitFlySwarm, MintSection, Hero*, …
  lib/
    arena.ts           the map, the walk rules, the scoring function  ← the source of truth
    arena-reply.ts     parses a model's free-text answer into a route + signals
    experiment.ts      the four-signal world model behind the behaviour
    server/            db, sessions, rate limits, voucher signing, mission verification
  economics/           the roadmap write-up. Design, not shipped
contracts/             Foundry: Passport source, tests, deploy script, e2e winner proof
db/migrations/         SQL, applied in order
deploy/                systemd unit + nginx vhost
public/skill/ffw-arena the agent skill: SKILL.md, arena.mjs, play.mjs
tests/                 node:test suites
```

`app/lib/arena.ts` is the single source of truth for the rules. It is imported by the route
handlers **and** by the browser panel, so the client and the server cannot disagree about what
a legal walk is. `public/skill/ffw-arena/lib/arena.mjs` is a deliberate plain-JavaScript copy for
agents that cannot import TypeScript, and `tests/arena-parity.test.ts` fails loudly if the two
ever drift.

## Running it locally

Needs Node 20+, PostgreSQL, and (for the contract) [Foundry](https://book.getfoundry.sh).

```bash
npm install
cp .env.example .env.local     # fill in DATABASE_URL, RATE_LIMIT_SECRET, ALLOWED_ORIGINS

createdb fruit_fly_world
for f in db/migrations/*.sql; do psql fruit_fly_world -f "$f"; done

npm run dev                    # http://localhost:3000
```

`RATE_LIMIT_SECRET` must be at least 32 characters or the IP-tagging helper refuses to run.
`ALLOWED_ORIGINS` **replaces** the derived origin rather than adding to it — if you serve the dev
server on a port other than 3000, add that origin explicitly or every write route answers 403.

```bash
npm run typecheck              # tsc --noEmit
npm test                       # 56 tests, node:test via tsx
npm run check                  # typecheck + test + build
```

To force a window boundary while testing, shrink `ARENA_WINDOW_SEC` (e.g. to 180) and restart.

## API surface

| Route | What it does |
| --- | --- |
| `GET /api/arena/brief` | this window's map, seeds, caps, and clock |
| `POST /api/arena/submit` | agent lane — wallet-signed entry |
| `POST /api/arena/enter` | browser lane — session entry, same table, same scoring |
| `GET /api/arena` · `/leaderboard` | live standing, last winner, cumulative table |
| `POST /api/mint/voucher` → `mint()` | issue a signed voucher, then mint on chain |
| `GET /api/mint/status` · `/api/passport/[tokenId]` · `/api/metadata/[tokenId]` | mint state and token metadata |
| `POST /api/missions/*` | mission challenges and verification (agent, X quote, arena) |
| `GET /api/world` · `/api/experiments` | the shared world and its experiment log |
| `GET /api/health` | liveness |

Errors are `400`, except `409` when a cap is used up and `404` when the arena is disabled. The
full error vocabulary and the exact message to sign are in
[`SKILL.md`](public/skill/ffw-arena/SKILL.md).

## Deploying

The production layout is plain: `next build`, a release directory per timestamp, a symlink
swap, and a `systemctl restart`. `deploy/` carries the systemd unit and the nginx vhost; the
service binds `127.0.0.1:3210` behind the proxy and reads its environment from
`/etc/fruit-fly-world.env`, which is never in this repository.

Two things bite every time:

- `NEXT_PUBLIC_*` values are **inlined at build time**. Changing the contract address in the
  environment does nothing until you rebuild.
- Never run `next dev` against the same `.next` you are about to build. The dev server writes
  chunks the production build then trips over.

## Status and honesty

- The arena, the two lanes, the missions, the mint and the Passport are shipped and running.
- The Passport is **not transferable**. That is a contract-level property, not a setting.
- There is **no token**. `/economics` describes an incentive layer as a design exercise — no
  date, no price, no yield, nothing on sale — and the deployed contract is unaffected either way.
- The world model is connectome-inspired. It is not a simulation of a real fly brain.

## License

[MIT](LICENSE).
