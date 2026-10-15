# Changelog

All notable changes to Fruit Fly World are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Repository history is the source of truth for what shipped and when — this file
summarises it in prose.

## Unreleased

### Added

- **FFW-NAND/1 — a fly brain made of 50 NAND gates, ready to tape out on TapeOut.** Seven reflex
  rules (`app/lib/nand/rules.ts`) compiled to a NAND-only netlist in TapeOut's encoding
  (`app/lib/nand/ffw-nand-1.netlist.json`, 12 inputs, 3 outputs, depth 9, no LATCH). A new world
  version, `market/3`, runs the trading fly on that netlist and seals `w: [inputWord, outputWord]`
  in every record, so any tick can be checked against the on-chain circuit with one read-only
  `eval()`. No season uses `market/3` yet. Tests check the netlist against the rules on all 4096
  inputs, pin its bytes and a `market/3` chain head, and rebuild every record's input word from the
  record alone. `scripts/nand/tapeout.ts verify` compares a taped-out circuit with ours, read-only.
  Design, method and the closed-loop comparison with FFW-CX/0.1: `docs/nand-brain.md`.

### Changed

- `package-lock.json` resolves packages from the public npm registry (same versions, same
  integrity hashes).

- **Daily anchors, built end to end — and honest about the one missing piece.** `scripts/anchor.ts`
  computes a closed UTC day's head and writes it on chain as an SPL memo
  (`ffw:1|season|date|lastTick|chainHash`); `scripts/verify-anchor.ts` recomputes each day and can
  read the memo back from a public RPC; `/anchors` publishes the list; `tests/anchors.test.ts` and
  `tests/anchor-send.test.ts` enforce the manifest and the transaction on every push. No anchor has
  been written yet because the funded anchor wallet does not exist, and `docs/STATUS.md` says so
  instead of showing an empty table as if it were a result.

### Added

- **`market/2` — the seal is now SHA-256.** New seasons hash each record with SHA-256 and chain
  them with SHA-256 (`app/lib/market/hash.ts`, plain JS so the browser replay and the server run
  identical code; asserted against `node:crypto` in the tests). Season 0's published heads and the
  live seasons 1–2 are untouched: `market/1`'s FNV-1a heads stay exactly as served, and the switch
  happens at the season 3 boundary (2026-10-13 00:00 UTC). A 32-bit head is a checksum, not a
  commitment — see `LIMITATIONS.md`.
- **Anchor status, stated where it belongs.** `LIMITATIONS.md` now has a "The seal" section that
  says plainly that neither format is anchored to a public chain yet.

### Changed

- **The site is English-only.** The bilingual `Bi` component now renders its English branch and
  nothing else; the `zh`/`dzh` attributes, the language switch and the game's `zh` locale are
  gone. Superseded Chinese-language pages moved to `docs/legacy/` (not served).
- **The survival game is parked** while the trading fly is the front door: `/play` and `/game`
  return a 307 to the homepage, and every navigation entry that pointed at them is removed. The
  game's files and docs are untouched — see `docs/game-guide.md`.
- **The Passport is stated as not live.** The mint UI is unmounted, `/dish` and `/economics` say
  "coming soon" instead of quoting a chain, a supply and a price, and the agent prompt no longer
  promises a claim.
- **No airdrop is promised anywhere**, and the x402 menu now reads "opens after launch" instead of
  quoting example prices.
- **Docs and links tell the same story as the site**: the README leads with the status table, the
  architecture map lists `market/1` as the live model, and GitHub links point at
  `fruitflyworld/*` (the organisation's current name).

### Added

- **Flies That Trade (market/1)** — a fruit fly that trades, on the game's own
  engine. `app/lib/market/`: a deterministic paper tape (six invented coins,
  regimes, a daily fee rhythm), the market/1 engine that turns prices into the
  circuit's four inputs (food / threat / light / novelty) and its four
  behaviors back into a body and a wallet (approach → buy on landing, avoid →
  sell, Giant Fiber → sell everything), hunger, starvation, rebirth with an
  estate, and a per-tick sealed record chained by FNV-1a. The decision layer
  is the unchanged FFW-CX/0.1 circuit; no vendored file was edited. Goldens
  pinned in `tests/market.test.ts`. Spec: `docs/flies-that-trade.md`
- **New homepage `/`** — Dusty live in its dish (canvas: scent rings, trades,
  Giant Fiber escapes, energy ring), the browser replays the day from midnight
  UTC on load; live instruments (inputs, circuit output, the 24 neurons
  firing); "Every number replays" check (server chain vs browser chain →
  IDENTICAL); diary; the x402 menu (opens at launch); lifecycle and today's
  lineage; the honest boundary; the $FLY plan (ClawPump on Robinhood Chain)
- **`/fly/[slug]`** — the fly's homepage: wallet, holdings, diary with replay
  links on every number, sealed log, lineage, x402 menu
- **`/fly/[slug]/replay?season=&tick=`** — one tick: sealed record, inputs →
  outputs, and an in-browser recomputation compared with the server
- **`GET /api/fly/[slug]?season=&tick=`** — the server's replay of one tick
  (future ticks refused)
- **`app/opengraph-image.tsx`** — share card: "A fruit fly that trades. It can
  brag. Every number replays."

### Changed

- **Live stage v2 (feel only, no world change)** — the hero and `/fly/[slug]` now
  show the whole loop as one instrument: scent plumes rising from each coin
  (density = scent, colour = sweet → bitter), a price ring wrapped round every
  coin, an anatomically drawn fly that flies curved paths, lands, feeds, grooms,
  jumps on a Giant Fiber spike and goes hungry; corner readouts (what it senses
  → what it decides, clock, wallet, the sealed hash of this tick); the live
  24-neuron circuit with this generation's real PN→KC wiring and spikes
  travelling along synapses; a sealed-chain ribbon; and an opening time-lapse
  while the browser replays the day. Engine adds display-only `scent`/`sweet`;
  record hashes and goldens unchanged
- The previous homepage moved to **`/dish`** (agent skill, Passport mint and
  all anchors intact); `/economics` and `/participate` links updated
- Site title and description now lead with the trading fly

### Added (earlier, unreleased)

- **P5: Fly NFT + weekly race + token (contracts)** — `contracts/src/`:
  `FlyNFT` (one lineage per token — seed, brain, five gene weights, immutable
  at mint; recorder-writable race record; transfers lock while entered),
  `FlyToken` (fixed 444,444,444 supply minted once, burn-only sinks), and
  `WeeklyRace` (commit the policy hash before the draw, draw the seed from a
  post-cutoff block, reveal against the commitment, grade within a per-week
  pool cap, burn the entry fee). 21 new forge tests. Design-only until
  deployed and announced
- **P5: the weekly race server** — `POST /api/race/commit` (EIP-191 signed
  entry; the server stores the sha256 commitment, never the plaintext policy),
  the beacon draw (latest Sepolia block after the cutoff), `POST
  /api/race/reveal` (must hash-match the commitment), and grading that replays
  every revealed entry through the same vendored `world.js` — same seed for
  all, ranks by eggs / survived generations / earliest commit. `GET /api/race`
  returns week status and the leaderboard; grading also runs lazily on read
- **`docs/weekly-race.md`** — the race/1 protocol record: commit → draw →
  reveal → grade, the declarative-policy rationale, the three contracts, and
  how to verify a graded week yourself. Design-only until the first race runs
- **Server-side grader** — `POST /api/exam/replay {seed, brain, gens, claim?}`:
  the server replays the deterministic lineage through the same `world.js`
  bytes the browser runs (imported from `public/` at runtime, never bundled)
  and grades a submitted claim field by field (`match` / `mismatch`). The
  browser proves determinism for yourself; the server proves it for everyone
- **Cross-platform bit-exact determinism (dish/3)** — `dmath.js`: hand-rolled
  IEEE-pinned kernels (`dsin`/`dcos`/`dexp`/`datan`) for the simulation lane,
  because `Math.sin/cos/exp/atan` differ in the last ulp between architectures
  (measured: ~3%–5.6% of inputs, arm64 Chrome vs x64 Node) and one ulp
  amplified into a 3-egg outcome divergence. Same seed now produces
  byte-identical decision logs in an arm64 browser and an x64 server
- **60-case golden baseline + parity suite** — `fruitflyworld/sim`
  `tests/golden/baseline-dish3.json`: 3 brains × 20 seeds × 3 generations
  generated in headless Chrome, replayed by the pure-Node `world.js` —
  1260/1260 field checks identical, including every decision-log content hash
- **Engineering record** — `docs/determinism.md`: the six determinism leaks
  found and fixed (novelty memory, rival traits, predator residue, GF
  membrane carryover, seed-dependent rival genes, libm drift), with the
  measurements and receipts
- **Agent autopilot** — `FlyLabAPI.autopilot({seed, brain, gens, policy})` flies the
  whole lineage headless at a fixed 60 Hz and asks the policy one draft question per
  generation. Double-run decision hashes match (same discipline as the exam room)
- **`ffw-dish` agent skill** — `public/skill/ffw-dish/`: SKILL.md (the game contract —
  brains, the full mutation table, quest rules) and a zero-dependency headless-Chrome
  runner (`scripts/play.mjs`) that prints the sealed result and a quest-evidence
  **import URL** (`/play?import=…`) the operator opens once in their own browser to
  unlock the freemint. The homepage gained a "For Agents" guide around it

### Fixed

- **Rival genes depended on the visitor's save file (dish/2)** — the wild
  type's gene weights were rolled once at page load from the saved world seed
  and never re-rolled when autopilot/bench changed the seed; now a pure
  function of the run seed, re-derived every generation (`rollRivalGenes`)


## [0.2.0] - 2026-09-23

### Added

- **Selectable brains** — the fly's brain is a slot: `manual`, `genes`, the FFW-CX/0.1
  24-neuron spiking circuit, and a `judgment` layer (free local heuristic by default;
  a pinned `jev-1.13.0` through the same-origin `/api/jev` proxy with your own key).
  Every decision is sealed into a downloadable hash-chained log (`flyline-log/1`)
- **Determinism exam** — `?bench=1` pauses the render loop and runs the same
  `(seed, brain, generations)` twice at a fixed 60 Hz; matching decision hashes print
  `IDENTICAL`. Mutation Draft is seeded; every report copies as a shareable challenge
- **Beacon seeds** — `?seed=beacon` derives the exam seed from the latest Sepolia
  block hash via `/api/beacon` (dual-RPC fallback, 12 s cache); the report links the
  block on an explorer
- **Death calibration** — the exam report scores each brain's own danger reads against
  reality (danger buckets vs deaths within 5 s, Brier score), with the method and its
  limits published at `/calibration`
- **DISH quests** — in-game quests (SURVIVOR / FORAGER / REFLEX / EXAMINED) gate a
  freemint; server-side evidence verification with a canonical-JSON SHA-256
- **Game feel** — 3-step onboarding coach, visible wild-type rival, per-generation
  predator escalation, half-speed death replay, shareable death cards
- `/essay` (the long form), `/promo` (the 28 s film), a live gameplay clip on the
  homepage, and the For Agents section
- Repository hygiene: `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, Dependabot config for npm and
  GitHub Actions, issue templates and a pull request template
- CI on every push: build, typecheck and the app test suite for the Next.js
  app; `forge test` for the Passport contract, in a separate job
- `assets/` — the fly mark and the launch film poster, used by the README

### Changed

- **The Passport is on Robinhood Chain mainnet** (chainId 4663). Freemint is
  quest-gated (AGENT / ARENA / DISH) plus a required X quote post; the deployed
  contract is immutable and was previously on Sepolia
- README rewritten around the four things a reader needs — the brief, the
  score, the two entry lanes, and the boundaries — with every figure quoted
  from the code rather than from prose
- Rate limiting reads `X-Real-IP` (set by nginx) ahead of `X-Forwarded-For`;
  security headers (frame DENY, nosniff, referrer, permissions, HSTS) on all
  responses

## [0.1.0] - 2026-09-15

The initial public release.

### Added

- **Foraging Hour arena** — hourly windows over a 24-cell map (`6 x 4`,
  `F-01` … `F-24`, orthogonal edges only). A route is a walk of at most six
  stations; revisits are legal and never pay. Energy starts at 100, travel
  costs 1 per station after the first, and a cell not yet visited on the route
  pays a bonus of 40
- **Deterministic scoring** — `ground` (richness) from the published seed
  table, `trail` over the route's order, `value`, `gain` from the derived
  behaviour, and the new-cell bonus. The ranking key is the exact score at
  full precision, so an identical route can never displace whoever entered it
  first. `bestRoute()` scores every legal walk exhaustively in about 40 ms
- **Two entry lanes, one table** — browser session entries
  (`POST /api/arena/enter`) and wallet-signed agent entries
  (`POST /api/arena/submit`) both write to `arena_entries` and are ranked by
  the same function. Neither lane has an advantage
- **Paste-back path** — the on-page task text can be handed to any model, and
  the reply pasted back as a JSON block, a `Route:` line, or bare station
  names. An illegal walk is rejected in the browser, before any request is made
- **Agent skill** (`public/skill/ffw-arena`) — `SKILL.md` as the specification,
  `lib/arena.mjs` as a plain-JavaScript copy of the rules for runtimes that
  cannot import TypeScript, `scripts/play.mjs` for a full search-and-enter
  cycle, including an offline dry run
- **Parity test** — `tests/arena-parity.test.ts` fails the build if
  `app/lib/arena.ts` and `public/skill/ffw-arena/lib/arena.mjs` ever drift
- **`FruitFlyPassport`** — ERC-721 with ERC-5192 soulbound semantics, deployed
  on Ethereum Sepolia (chainId 11155111). `transferFrom`, `approve` and
  `setApprovalForAll` revert; one Passport per address, permanently. No upgrade
  path. The contract test suite is self-contained (no OpenZeppelin, no
  forge-std) and runs in CI
- **Missions and the mint rail** — verified missions mint free; entering a
  window is worth half price. The ladder lives in the contract and the price is
  read from the chain, never restated in prose
- **The site** — the Foraging Hour panel, `/pitch`, `/economics`,
  `/launch-film`, and the rules served at `/skill/ffw-arena/SKILL.md`
- **Bilingual docs** — every doc page carries English and Chinese
- **Caps** — `perWindowTries = 8`, `perWalletDay = 1`, `perIpDay = 4`, all
  checked at submission rather than at the close

### Notes

- Testnet only. There is no mainnet deployment of the Passport
- The map and the seed table are published by design. The game is knowing the
  answer, not hiding it; the caps are what bound abuse
- There is no token. `/economics` describes an incentive layer as a design
  exercise, labelled roadmap, with no date and nothing on sale
