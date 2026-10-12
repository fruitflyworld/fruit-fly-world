# Limitations

What this project is not, what it cannot do yet, and what the operator can change. Written because
a reader should not have to infer the boundary from the code, and because a project that cannot
state its own limits cannot be trusted about anything else.

## The model

- **The circuit is connectome-inspired, not a brain simulation.** It is 24 neurons. It is not
  FlyWire, not a MaleCNS runtime, and not a claim about animal behaviour. The dataset its structure
  is taken from is named in [`docs/neural-model.md`](docs/neural-model.md).
- **The wiring check is a two-channel assay**, not a measurement of intelligence. It shows that
  channel order matters in this circuit. Nothing more.
- **A seed is a row in a table, not a theorem.** Results from one seed do not generalise, and the
  exam room's own failures are bug reports rather than scores.

## The market

- **The coins are invented.** Six of them, generated from a seeded tape. Their prices are not and
  have never been a market.
- **No money moves.** The wallet is simulated, the fees are simulated, and starving the fly costs
  nothing but the fly.
- **Paper mode is predictable in principle.** Because the tape is seeded, the future is computable
  from the seed. The API refuses to serve ticks that have not happened yet, but a reader with the
  code can derive them. That is a property of determinism, not an oversight — but it means the
  market is not a source of unpredictability.
- **The oracle mode is not replayable.** A remote model driving the fly in the loop makes
  decisions that cannot be recomputed from the seed; the sealed-log guarantee does not cover it.
  That mode is labelled experimental everywhere it is offered.

## The seal

- `market/1` seasons (0–2) are sealed with 32-bit FNV-1a. That is a checksum, not a commitment: a
  different record with the same 8-hex head can be ground out on a laptop. Those seasons are kept as
  published — rewriting a head that has already been replayed by strangers would be the one change a
  replayable system cannot make.
- `market/2` seasons (3 onward) are sealed with SHA-256, both the per-tick record hash and the chain
  head. The implementation is plain JS in `app/lib/market/hash.ts`, shared by browser and server, and
  asserted against `node:crypto` in the tests.
- **Neither format is anchored to a public chain yet.** Until it is, the guarantee is "the code and
  the site agree", not "the chain agrees".

## Not built yet

- **Daily on-chain anchoring** of the hash chain (planned; no `/anchors` page, no verification CLI).
- **A connectome weight rebuild script** that regenerates the circuit's weights from the named
  dataset and asserts equality with the engine.
- **Real trading**, deliberately: it would need a tape recorder, commit-before-reveal, and a wallet
  policy that the AI cannot rewrite.
- **WeeklyRace settlement, FlyNFT, FlyToken** — written and tested, not deployed.
- **x402 payments** — no endpoint returns HTTP 402 today; the menu says so.

## Failed experiments and known weaknesses

- The **swapped-wiring assay** was originally read as a measure of "brain quality". It is not: it
  measures channel order in one circuit. The wording was corrected rather than the result.
- Early vendor drift: the vendored game files and `vendor.lock.json` fell out of sync once (caught
  by CI), which is why the lock now records the upstream revision and per-file fingerprints.
- The site's HTML was once served with Next's default `s-maxage=31536000`, which lets any shared
  cache hold a page for a year. Pages now revalidate (`max-age=0, must-revalidate`).
- The player-facing survival game is parked, not finished: `/play` redirects to the homepage. The
  code and its rules are intact and it can be brought back with two lines in `next.config.js`.

## What the operator can still do

Stated plainly, because a reader deserves to know what is trusted rather than verified:

- Change the code, including the world rules — any change that moves a golden value must be visible
  in the CHANGELOG and in the test diff.
- Change parameters and reset state on the server.
- Publish, withhold or delay anything on the site.
- The operator **cannot** retroactively change a tick that has already been replayed against a
  published hash without the change being visible in the repository history.

What the operator cannot do yet is prove all of that to a stranger: there is no third-party
anchoring, so today's guarantee is "the code and the site agree", not "the chain agrees".
