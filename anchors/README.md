# Anchors

The point of this directory: make "every number replays" a claim a stranger can check against
something this project cannot edit afterwards — a public chain.

## What an anchor is

Once a UTC day (a season) is over, its last sealed chain head is written on chain as a memo:

```
ffw:1|<season>|<YYYY-MM-DD>|<lastTick>|<chainHash>
```

- One memo transaction per day, signed by the project's anchor wallet.
- The head is computed from this repository's code (`market/1` for seasons 0–2, `market/2` from
  season 3), so anyone can recompute it and compare.
- Today's head is not anchored while the day is still running: anchoring a partial day would commit
  to a head that is about to change.

## The files

| File | What it is |
| --- | --- |
| `anchors.json` | The manifest: every confirmed anchor, with its transaction signature. A fact log, not a plan |

## How entries get here

```bash
# after 00:00 UTC, once the previous day has closed
npm run anchor -- --day 2026-10-10            # prints the memo and the head, sends nothing
npm run anchor -- --day 2026-10-10 --send     # sends it, prints the signature
npm run anchor -- --day 2026-10-10 --send --write   # sends it and appends it to anchors.json
```

`--send` needs `SOLANA_ANCHOR_SECRET_KEY` in the environment (base64, server-side only — never in
this repository). Without it the command refuses to send and says so.

## How anyone checks it

```bash
npm run verify:anchors                              # recompute every day in the manifest, locally
npm run verify:anchors -- --day 2026-10-10 --chain   # also fetch the memo from a public RPC
```

The local pass recomputes each day from tick 0 with this repository's code and compares the head. It
catches a manifest that disagrees with the code. The `--chain` pass additionally reads the memo back
from the chain, which is what catches a manifest that disagrees with what was actually written.

If a day diverges, the command exits non-zero and the page at `/anchors` shows it in red. Nothing is
ever silently re-anchored: a divergence is a bug report about the code, not a number to fix.
