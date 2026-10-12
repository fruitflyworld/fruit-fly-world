# AGENTS.md — rules for AI agents editing this repo

## What never belongs in this public repository

Marketing drafts, KOL outreach packs, announcement threads, giveaway or airdrop lists, and dated
external-review snapshots. They live in the organisation's private `ops` repository.

- **English only** in tracked files. The site's own language is a product decision; the repository's
  working language is English.
- Never add a secret, a key, an `.env` file, a server address or a hosting-city reference.
- If a doc here links to something private, delete the link — do not "just link it once".

The reason is not tidiness: a public marketing script tells a reviewer exactly which claims are
choreography, and a leaked wallet list is somebody's safety.

## Layout

- `app/` — the Next.js site (pages, API routes, mint/mission server logic)
- `public/play/` — the game. **Vendored from
  [fruitflyworld/game](https://github.com/fruitflyworld/game)** (rendering + feel) which
  itself vendors [fruitflyworld/sim](https://github.com/fruitflyworld/sim) (world rules +
  numbers) and [fruitflyworld/bench](https://github.com/fruitflyworld/bench) (exam
  harness). See `vendor.lock.json`.
- `contracts/` — the Passport (soul-bound ERC-721 + ERC-5192)
- `public/skill/ffw-dish/` — the agent skill (SKILL.md + headless runner)

## Two kinds of game change

1. **FEEL** (free): visuals, sound, UI, HUD, onboarding text, camera, particles,
   screen shake, tutorials. Must not change what happens in a run.
2. **WORLD** (versioned): anything that can change a run's outcome —
   food values, spawn logic, predator speed or behavior, metabolism,
   timing, drafts, slow-motion that changes dt, any extra `rng()` call.
   If you make a WORLD change you MUST:
   - bump `WORLD_VERSION` in `public/play/js/sim.js`
   - regenerate golden runs and explain why in `CHANGELOG.md`
   - land it upstream (game/sim repos) first, then sync here

## The trading fly (market/1)

- `app/lib/market/engine.ts` and `tape.ts` are WORLD code: no `Math.sin/cos/exp/log/pow/atan/random`
  (a test fails the build), and any change that alters a run bumps `MARKET_WORLD_VERSION`,
  regenerates the goldens in `tests/market.test.ts`, and gets a CHANGELOG line.
- The circuit is imported from `public/play/js/` read-only. Never edit it to tune the market;
  tune the translation in `engine.ts` instead.
- Diary lines may only use numbers from sealed events (`diary.ts`). The fly can brag; it cannot invent.
- Nothing on the site takes money until launch. Do not wire x402 or publish a contract address
  without explicit instruction.

## Never do

- Change pinned numbers in `public/play/js/sim.js`, `gf-neuron.js`, `cx-circuit.js`
  (escape assay 100/68, CX trace 9fb9e0d0, drafts 0f4d39c3).
- Edit vendored files under `public/play/` directly — change them upstream
  (fruitflyworld/game or /sim) and re-sync; CI compares `vendor.lock.json` fingerprints.
- Call the world `rng()` for visual effects.
- Touch `.env*`, deployment scripts, or the contract without explicit instruction.

## Before you finish

- `npm run check` and `npm test` (100 tests) must pass.
- `npx hardhat test` for contract changes.
- For game changes: `?bench=1&seed=42&brain=circuit&gens=2` must print **IDENTICAL**
  unless this was a declared WORLD change with regenerated goldens.

## Pull requests

- One theme per PR. Small diffs. Explain why, not only what.
- Label: `feel` or `world-change` for game changes.
