# Documentation index

Everything written down about Fruit Fly World, and — first — which parts describe something that
actually runs. The status table in the [README](../README.md#what-is-live-what-is-parked-what-is-only-designed)
is the source of truth; this page only routes you to the right file.

## The live system

| Doc | Read it for |
| --- | --- |
| [`flies-that-trade.md`](flies-that-trade.md) | `market/1` — the deterministic paper tape, the four signals, the four behaviors, hunger and starvation, the sealed record, replay, the x402 menu, the $FLY plan |
| [`determinism.md`](determinism.md) | Every determinism leak we found and fixed, with measurements — how the chain hash is pinned |
| [`architecture.md`](architecture.md) | The system map: four models, what depends on what, the parity guarantee, the server side |

## The parked game

The survival game is where the determinism was proven and is parked while the trading fly is the
front door (`/play` redirects to the homepage). Its code and docs are intact.

| Doc | Read it for |
| --- | --- |
| [`game-guide.md`](game-guide.md) | The lineage loop: food risk levels, the committed predator lunge, mutations, reproducibility |
| [`neural-model.md`](neural-model.md) | The GF escape circuit — LC4 + LPLC2, LIF dynamics, and the real-vs-swapped wiring check |

## Written and tested, not live

Nothing in this section can be bought, minted, claimed or joined today. The code exists and is
tested; the terms are not settled.

| Doc | Read it for |
| --- | --- |
| [`weekly-race.md`](weekly-race.md) | The race protocol — signed commit, beacon draw, replay grading |
| [`economics.md`](economics.md) | The incentive layer as a labelled design exercise — no date, nothing on sale |

## Records

| Doc | Read it for |
| --- | --- |
| [`legacy/`](legacy/) | Superseded material, kept so links and history survive: the old Fly Lab prototype and the Chinese-language Jev-week brief |

Marketing drafts, outreach packs, announcement threads and the dated external-review snapshot are
**not** in this public repository. They live in the organisation's private `ops` repository, because
a public marketing script is a liability: it tells a reader exactly which claims are choreography.
If a document here ever links to one of them, the link is a bug.

## Conventions

- **Docs describe what exists.** A capability with no route, no test and no page belongs under
  "written and tested, not live" — never in the present tense next to something live.
- **Numbers carry their source.** If a doc quotes a measurement (escape rates, test counts, hash
  chains), the test or endpoint that produced it is named in the same sentence.
- **Marketing material is private.** Announcement drafts, KOL packs, giveaway lists and dated review
  snapshots go to `ops`, never here. `AGENTS.md` records the rule so coding agents follow it too.
