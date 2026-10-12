# Governance

Small project, stated plainly. This file exists so that nobody has to guess who decides what, and
so the honest answer is on the record before anyone asks.

## Who runs this

**One maintainer working with AI coding agents.** We do not inflate contributor counts. Commits
co-authored by an agent are marked as such, and the human maintainer is accountable for every one
of them.

There is no foundation, no DAO, no multisig committee, and no token-holder vote. Anything implying
otherwise is wrong.

## Who holds what

| Thing | Holder | Notes |
| --- | --- | --- |
| Repository and organisation | The maintainer | Public history is the record |
| Deployment access (the server) | The maintainer | Deploys are scripted and logged |
| Dev wallet | `{{DEV_WALLET}}` | New wallet, funded from one explainable source; does not buy at launch |
| Payout wallet (fee share) | `{{PAYOUT_WALLET}}` | Receives only; address published in [docs/STATUS.md](docs/STATUS.md) |
| Anchor wallet (daily hashes) | `{{ANCHOR_WALLET}}` | Keys server-side only; public address |
| Token allocation | Nobody — team share is 0% | If that ever changes it is disclosed in STATUS.md first |

No key material is in this repository, ever. Secrets are injected on the server through the service
environment file, and the code that reads them is the only place they appear.

## How changes happen

1. Every change lands as its own commit with a message that says what and why.
2. Any change that touches the world rules must update the golden values and say so in the
   CHANGELOG; CI fails if the client and the server disagree about a decision.
3. Any change to a launch fact happens in `config/launch.json` and gets a line in
   [AUDIT-LOG.md](AUDIT-LOG.md) with its commit hash.
4. Deploys go through `deploy/deploy.sh`: build, test, health-check (homepage + golden chain hash),
   and automatic rollback if the health check fails. The previous release stays on disk.

## Stopping things

- **The site**: `systemctl stop fruit-fly-world` on the server; the previous release can be restored
  with one symlink command (printed by the deploy script).
- **The mint**: already off. There is no voucher being signed, so there is nothing to stop.
- **Payments**: there is no payment path to disable — no endpoint returns HTTP 402 today.
- **The fly**: `$FLY` does not exist. There is nothing to pause, pause-trading or renounce.

There is no kill switch beyond stopping the process, because there is no on-chain action this
project currently takes. When the weekly race or a token goes on chain, this section must be
rewritten before those ship — an operational plan for a live contract is not optional.

## Decisions that are not made

Recorded here rather than in someone's head:

- The launch chain and venue (`{{TOKEN_CHAIN}}`, `{{TOKEN_VENUE}}`).
- Whether the Passport ships at all, and on which chain.
- Whether daily anchoring goes on Solana (SPL Memo) or on the token's chain.
