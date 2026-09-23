# Architecture

One repository, three models, one site. This document maps what lives where, what depends
on what, and which surfaces are frozen for compatibility.

---

## 1. Layout

```text
app/                        Next.js 14 site (App Router)
  page.tsx                  home: the game, three doors, agent guide, mint
  play  → public/play       the lineage game (see below)
  game/, pitch/             landing pages for the game and the pitch
  participate/, economics/  Passport tiers and the economic model
  essay/, calibration/      long-form positioning and the death-calibration study
  experiments/[id]/         per-run experiment log
  api/                      route handlers (missions, mint, passport metadata, world, …)
  lib/                      shared models: experiment.ts, mint.ts, sim/, arena.ts (dormant, see §2)
  lib/server/               db, session, rate limits, vouchers, x-proof
public/play/                standalone Phaser 3 game — plain ESM, no build step
  js/sim.js                 pure game logic (world, traits, RNG, escape assay)
  js/gf-neuron.js           pure neural layer (see neural-model.md)
  js/scene-*.js             Phaser scenes; scene-game.js is the loop
public/skill/ffw-dish/      the survival-game agent skill: SKILL.md, scripts/play.mjs
contracts/                  FruitFlyPassport.sol (ERC-721 + ERC-5192) + 11-test suite
docs/                       this documentation set
tests/                      node:test suite, run with tsx (99 tests)
```

## 2. Three models, stated plainly

| Model | Location | Grain | Consumers |
| --- | --- | --- | --- |
| **Playable GF escape circuit** | `public/play/js/gf-neuron.js`, `sim.js` | 2 sensory channels → 1 leaky integrate-and-fire unit | `/play` game loop, `FlyLabAPI` |
| **Selectable brains** | `public/play/js/cx-circuit.js`, `brain-*.js` | 24-neuron spiking circuit / judgment layer | `/play`, the ffw-dish skill |
| **Vial population prototype** | `app/lib/sim/` | generational genetics: food, temperature, mating, inheritance | `/experiments`, `/api/world` |

They share a theme, not code. Pages and docs must not describe any two of them as "the
same model": `/play` is the playable GF escape model; the vial is a population prototype
with no predator and no GF.

`app/lib/arena.ts`, `app/lib/server/arena.ts` and `app/lib/arena-reply.ts` are the retired
Foraging Hour route-scoring engine. The puzzle concept is no longer a public surface (no
pages, no API routes, no skill); the libraries and their tests are kept only because the
homepage swarm uses the arena grid as ambience. Do not wire them back into a route.

## 3. The parity guarantee

- `tests/experiment.test.ts` and `tests/gf-neuron.test.ts` pin the published model outputs
  (`runExperiment`, the escape assay) so prose and numbers cannot silently diverge.
- The ffw-dish skill drives the real game through `FlyLabAPI.autopilot` at a fixed 60 Hz —
  there is no second implementation to drift from, only the one game.

## 4. Server side

- **Persistence** — PostgreSQL via `app/lib/server/db.ts` (transactions for anything
  multi-step). Tables include `mission_completions`, `x_mission_proofs`, `mint_vouchers`.
- **Identity** — SIWE sessions for humans (`app/lib/server/session.ts`); agents
  authenticate by wallet signature over a fixed message format, bound once to an operator
  session through the `AGENT` mission.
- **Mint rail** — `POST /api/mint/voucher` returns an EIP-712 signed voucher; the signing
  key never leaves the server. The contract is the only price authority
  (`publicMintPrice()`, `participantPrice()`).
- **Abuse control** — same-origin checks, per-IP rate limits on every mutating route,
  8KB body caps, and one X account per proof (`UNIQUE(campaign, x_author_id)`).

## 5. The game's compatibility surfaces

`public/play/` is shipped and frozen at these boundaries:

- localStorage key **`flyline_v1`** (lineage save), **`ffw-lang`** (site language),
  **`flyline_quests_v1`** (DISH quest evidence), **`flyline_bench_v1`** (local exam board).
- DOM events **`flyline:genstart`**, **`flyline:genend`**, **`flyline:log`**,
  **`flyline:lunge`**, **`flyline:quest`**.
- **`window.FlyLabAPI`** — `getState()`, `setControl()`, `dash()`, `setMode()`,
  `autopilot()`, `importQuests()`.
- The `gf` state field names (`pot`, `lc4`, `lplc2`, `armed`, …) read by the HUD and API.

Changes must keep these working; the tests and the HUD are the check.

## 6. What qualifies for what

The rule that keeps the game and the economy honest: **only server-verified events count.**

| Qualification | Source | Counted from `/play`? |
| --- | --- | --- |
| Free mint | verified mission (`AGENT`, `DISH`, plus the verified X quote post) | evidence recorded in `/play`, verified server-side |
| Half-price mint | recorded activity (`arena_entries`, historical) | no |
| Local lineage saves | browser only | never a credential |

Local play can never mint anything by itself, by design. See [economics.md](economics.md).

## 7. Testing and verification

```bash
npm run typecheck   # tsc --noEmit
npm test            # node:test via tsx — 99 tests
npm run build       # next build
```

Coverage areas: missions, mint state machine and voucher/contract hash agreement, API
input validation, vial determinism, GF neural unit contract (leak, threshold, refractory,
determinism, pinned experiment numbers), bench determinism, quest evidence validation.
