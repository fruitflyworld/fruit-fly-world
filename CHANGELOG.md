# Changelog

All notable changes to Fruit Fly World are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Repository history is the source of truth for what shipped and when — this file
summarises it in prose.

## Unreleased

### Added

- Repository hygiene: `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, Dependabot config for npm and
  GitHub Actions, issue templates and a pull request template
- CI on every push: build, typecheck and the app test suite for the Next.js
  app; `forge test` for the Passport contract, in a separate job
- `assets/` — the fly mark and the launch film poster, used by the README

### Changed

- README rewritten around the four things a reader needs — the brief, the
  score, the two entry lanes, and the boundaries — with every figure quoted
  from the code rather than from prose

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
