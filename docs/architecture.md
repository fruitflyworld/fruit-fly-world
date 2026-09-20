# Architecture

One repository, three models, one site. This document maps what lives where, what depends
on what, and which surfaces are frozen for compatibility.

---

## 1. Layout

```text
app/                        Next.js 14 site (App Router)
  page.tsx                  home: this hour's window, live map, paste-back panel
  play  → public/play       the lineage game (see below)
  game/, pitch/             landing pages for the game and the pitch
  participate/, economics/  Passport tiers and the economic model
  skill/ffw-arena/          the public agent-interface page
  experiments/[id]/         per-run experiment log
  api/                      route handlers (arena, missions, mint, passport, world, …)
  lib/                      shared models: arena.ts, experiment.ts, mint.ts, sim/
  lib/server/               db, session, rate limits, vouchers, x-proof
public/play/                standalone Phaser 3 game — plain ESM, no build step
  js/sim.js                 pure game logic (world, traits, RNG, escape assay)
  js/gf-neuron.js           pure neural layer (see neural-model.md)
  js/scene-*.js             Phaser scenes; scene-game.js is the loop
public/skill/ffw-arena/     the agent skill: SKILL.md, lib/arena.mjs, scripts/play.mjs
contracts/                  FruitFlyPassport.sol (ERC-721 + ERC-5192) + 11-test suite
docs/                       this documentation set
tests/                      node:test suite, run with tsx (66 tests)
```

## 2. Three models, stated plainly

| Model | Location | Grain | Consumers |
| --- | --- | --- | --- |
| **Playable GF escape circuit** | `public/play/js/gf-neuron.js`, `sim.js` | 2 sensory channels → 1 leaky integrate-and-fire unit | `/play` game loop, `FlyLabAPI` |
| **Arena route scoring** | `app/lib/arena.ts` | 24-cell map, seeded richness/trail, energy bookkeeping | arena pages, `/api/arena/*`, the agent skill |
| **Vial population prototype** | `app/lib/sim/` | generational genetics: food, temperature, mating, inheritance | `/experiments`, `/api/world` |

They share a theme, not code. Pages and docs must not describe any two of them as "the
same model": `/play` is the playable GF escape model; the arena is a separate deterministic
route-scoring interface; the vial is a population prototype with no predator and no GF.

## 3. The parity guarantee

The load-bearing invariant of the arena: **client, server and skill compute identical
numbers.**

- `app/lib/arena.ts` is imported by the route handlers *and* the browser panel.
- `public/skill/ffw-arena/lib/arena.mjs` is a deliberate plain-JS copy for agents that
  cannot import TypeScript.
- `tests/arena-parity.test.ts` fails the build if the two ever drift.
- `tests/experiment.test.ts` and `tests/gf-neuron.test.ts` pin the published model outputs
  (`runExperiment`, the escape assay) so prose and numbers cannot silently diverge.

## 4. Server side

- **Persistence** — PostgreSQL via `app/lib/server/db.ts` (transactions for anything
  multi-step). Tables include `arena_entries`, `arena_wins`, `mission_completions`.
- **Identity** — SIWE sessions for humans (`app/lib/server/session.ts`); agents
  authenticate by wallet signature over a fixed message format, bound once to an operator
  session through the `AGENT` mission.
- **Mint rail** — `POST /api/mint/voucher` returns an EIP-712 signed voucher; the signing
  key never leaves the server. The contract is the only price authority
  (`publicMintPrice()`, `participantPrice()`).
- **Abuse control** — same-origin checks, rate limiting, and the caps table in the README
  (8 tries / window / wallet, 1 win / wallet / day, 4 entries / IP / day), all enforced at
  submission time.
- **Window settlement** — at close, `finalizeWindow` ranks `arena_entries` by exact score;
  the top entry records an `ARENA` mission on the operator's wallet. Identical routes
  cannot displace the first entrant.

## 5. The game's compatibility surfaces

`public/play/` is shipped and frozen at these boundaries:

- localStorage key **`flyline_v1`** (lineage save), **`ffw-lang`** (site language).
- DOM events **`flyline:genstart`**, **`flyline:genend`**, **`flyline:log`**.
- **`window.FlyLabAPI`** — `getState()`, `setControl()`, `dash()`, `setMode()`.
- The `gf` state field names (`pot`, `lc4`, `lplc2`, `armed`, …) read by the HUD and API.

Changes must keep these working; the tests and the HUD are the check.

## 6. What qualifies for what

The rule that keeps the game and the economy honest: **only server-verified events count.**

| Qualification | Source | Counted from `/play`? |
| --- | --- | --- |
| Free mint | verified mission (`ARENA` win, agent run, quoted post) | no |
| Half-price mint | recorded arena entry (`arena_entries`) | no |
| Local lineage saves | browser only | never a credential |

Local play can never mint anything, by design. See [economics.md](economics.md).

## 7. Testing and verification

```bash
npm run typecheck   # tsc --noEmit
npm test            # node:test via tsx — 66 tests
npm run build       # next build
```

Coverage areas: arena rules + parity, missions, mint state machine and voucher/contract
hash agreement, API input validation, vial determinism, GF neural unit contract (leak,
threshold, refractory, determinism, pinned experiment numbers).
