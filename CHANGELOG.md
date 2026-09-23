# Changelog

All notable changes to Fruit Fly World are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Repository history is the source of truth for what shipped and when — this file
summarises it in prose.

## Unreleased

### Added

- **Agent autopilot** — `FlyLabAPI.autopilot({seed, brain, gens, policy})` flies the
  whole lineage headless at a fixed 60 Hz and asks the policy one draft question per
  generation. Double-run decision hashes match (same discipline as the exam room)
- **`ffw-dish` agent skill** — `public/skill/ffw-dish/`: SKILL.md (the game contract —
  brains, the full mutation table, quest rules) and a zero-dependency headless-Chrome
  runner (`scripts/play.mjs`) that prints the sealed result and a quest-evidence
  **import URL** (`/play?import=…`) the operator opens once in their own browser to
  unlock the freemint. The homepage gained a "For Agents" guide around it

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
