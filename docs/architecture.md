# Architecture

One repository, four models, one site. This document maps what lives where, what depends
on what, and which surfaces are frozen for compatibility. The launch state of every surface
lives in the [README](../README.md#what-is-live-what-is-parked-what-is-only-designed) — this
file describes the machinery.

---

## 1. Layout

```text
app/                        Next.js 14 site (App Router)
  page.tsx                  home: the trading fly, the replay check, the $FLY section
  fly/[slug]/               the fly's page: wallet, holdings, diary, sealed log, circuit panel
  fly/[slug]/replay/        replay any tick; the browser recomputes the chain and compares
  dish/, lab/               agent-facing surfaces (skill, missions, the x402 menu)
  game/, pitch/             landing pages for the game and the pitch
  participate/, economics/  Passport tiers and the economic model (both not live)
  essay/, calibration/      long-form positioning and the death-calibration study
  race/, promo/, launch-film/, experiments/[id]/
  api/                      route handlers (fly, missions, mint, passport metadata, world, …)
  lib/market/               market/1 — the live model: tape, engine, fly, diary (§2)
  lib/                      shared models: experiment.ts, mint.ts, sim/, arena.ts (dormant, see §2)
  lib/server/               db, session, rate limits, vouchers, x-proof
  lib/token.ts              the $FLY launch facts, in one place (not live)
public/play/                standalone Phaser 3 game — plain ESM, no build step (parked)
  js/sim.js                 pure game logic (world, traits, RNG, escape assay)
  js/gf-neuron.js           pure neural layer (see neural-model.md)
  js/scene-*.js             Phaser scenes; scene-game.js is the loop
public/skill/ffw-dish/      the survival-game agent skill: SKILL.md, scripts/play.mjs
contracts/                  FlyNFT / FlyToken / WeeklyRace / FruitFlyPassport (none deployed)
deploy/deploy.sh            build → test → switch → health check (golden chain) → roll back
docs/                       this documentation set
tests/                      node:test suite, run with tsx (127 tests)
```

## 2. Four models, stated plainly

| Model | Location | Grain | Consumers |
| --- | --- | --- | --- |
| **Trading fly (`market/1`)** | `app/lib/market/` | deterministic paper tape → four signals → four behaviors → a body and a wallet, sealed per tick | `/fly/*`, `/api/fly/*`, the homepage |
| **Playable GF escape circuit** | `public/play/js/gf-neuron.js`, `sim.js` | 2 sensory channels → 1 leaky integrate-and-fire unit | `/play` game loop, `FlyLabAPI` |
| **Selectable brains** | `public/play/js/cx-circuit.js`, `brain-*.js` | 24-neuron spiking circuit / judgment layer | `/play`, the ffw-dish skill |
| **Vial population prototype** | `app/lib/sim/` | generational genetics: food, temperature, mating, inheritance | `/experiments`, `/api/world` |

They share a theme, not code — with one deliberate exception: the trading fly imports the
**same FFW-CX/0.1 circuit** the game ships, so that circuit has one implementation and one
set of tests. Pages and docs must not describe any two of the others as "the same model":
`/play` is the playable GF escape model; the vial is a population prototype with no
predator and no GF.

`app/lib/arena.ts`, `app/lib/server/arena.ts` and `app/lib/arena-reply.ts` are the retired
Foraging Hour route-scoring engine. The puzzle concept is no longer a public surface (no
pages, no API routes, no skill); the libraries and their tests are kept only because the
homepage swarm uses the arena grid as ambience. Do not wire them back into a route.

## 3. The parity guarantee

- `tests/experiment.test.ts` and `tests/gf-neuron.test.ts` pin the published model outputs
  (`runExperiment`, the escape assay) so prose and numbers cannot silently diverge.
- `tests/market.test.ts` pins the trading fly: the same seed has to produce the same tape, the
  same decisions and the same hash chain. The golden vector is `season 0 · tick 2000 →
  "chain":"003ad503"` — the value CI asserts and the deploy health check reads back from the
  live box.
- The ffw-dish skill drives the real game through `FlyLabAPI.autopilot` at a fixed 60 Hz —
  there is no second implementation to drift from, only the one game.

## 4. Server side

- **Persistence** — PostgreSQL via `app/lib/server/db.ts` (transactions for anything
  multi-step). Tables include `mission_completions`, `x_mission_proofs`, `mint_vouchers`.
- **Identity** — SIWE sessions for humans (`app/lib/server/session.ts`); agents
  authenticate by wallet signature over a fixed message format, bound once to an operator
  session through the `AGENT` mission.
- **Mint rail (dormant)** — `POST /api/mint/voucher` returns an EIP-712 signed voucher; the
  signing key never leaves the server and the contract is the only price authority
  (`publicMintPrice()`, `participantPrice()`). While the Passport is unlaunched no page mounts
  the mint UI, `/api/mint/status` answers `{"session":null,"minted":false}`, and nothing on the
  site can start a mint.
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
