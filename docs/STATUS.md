# Status

The single page that answers "what is live, what is not, and what is it on". Every other document,
page and README line must agree with this one. The machine-readable source is
[`config/launch.json`](../config/launch.json); the site renders it through
[`app/lib/token.ts`](../app/lib/token.ts). Nothing here is restated anywhere else, and nothing here
is a promise.

Last reviewed: 2026-10-12.

---

## Token

| Field | Value |
| --- | --- |
| Symbol | `$FLY` |
| Status | **Not live.** No token exists. |
| Chain | `{{TOKEN_CHAIN}}` — not final |
| Venue | `{{TOKEN_VENUE}}` — not final |
| Contract | `{{TOKEN_CA}}` — does not exist yet |
| Supply | `{{TOKEN_SUPPLY}}` — fixed by the launch |
| Team allocation | **0%** |
| Presale / venture allocation / dev buy | **None. None. None.** |
| Airdrop | **None promised.** Nothing is owed to any holder, passport or wallet. |
| Dev wallet | `{{DEV_WALLET}}` — does not buy at launch |
| Payout wallet (receives the project's fee share) | `{{PAYOUT_WALLET}}` |
| Anchor wallet (daily hash anchoring) | `{{ANCHOR_WALLET}}` |

The team holds 0% at launch. If this ever changes, it will be disclosed on this page first.

**Where the fee income goes** (a policy, not a contract, and not paid to holders): 50% feeds Dusty,
the flagship fly · 30% ecosystem and developer fund, paid against milestones · 20% servers and
operations.

## Trading

| Field | Value |
| --- | --- |
| Mode | **Paper season.** |
| Coins | Invented. Six of them, generated from a seed. |
| Money | **None moves.** The wallet is simulated and the fees are simulated with it. |
| Record format | `market/1` (FNV-1a, 8-hex heads) for seasons 0–2; **`market/2` (SHA-256, 64-hex heads) from season 3**. Season 0's published heads are unchanged. |
| Verifiability | Every tick is content-hashed and chained; the site replays the day in your browser and compares, and `GET /api/fly/dusty?season=0&tick=2000` returns the pinned `"chain":"003ad503"`. |

Paper mode means the future is computable: given the seed, a later tick can be derived without
waiting for it. The API refuses to serve future ticks, but the arithmetic is not a secret — see
[LIMITATIONS.md](../LIMITATIONS.md).

## Passport

| Field | Value |
| --- | --- |
| Status | **Not live.** Coming soon. |
| Mint | Switched off. No page mounts the mint UI; `/api/mint/status` returns `{"session":null,"minted":false}`. |
| Chain | `{{TOKEN_CHAIN}}` — not final |
| Test deployment(s) | `{{PASSPORT_TEST_ADDRESS}}` (early test deployment, **not in use, mints nothing, may not be the final contract**) · `{{PASSPORT_SEPOLIA_ADDRESS}}` (testnet, if present) |
| Supply cap | 4,444 · non-transferable (ERC-5192) |

An early deployment of the Passport contract exists on chain. It is listed here and in
[`contracts/README.md`](../contracts/README.md) deliberately: nobody should have to find it from a
wallet and wonder why the site did not mention it.

## x402

| Field | Value |
| --- | --- |
| Status | **Not open.** |
| Endpoints returning HTTP 402 | **None.** `rg '402' app/api` returns nothing; there is no payment path on this site today. |
| What the menu says | "Not open yet. Opens after launch; prices will be published here first." |

When one item opens, it opens here first with its price, its asset and its receiving address, and
only then does the menu stop saying "not open yet".

## Anchoring

| Field | Value |
| --- | --- |
| What it is | Each closed UTC day, the day's last chain head is written on chain as an SPL memo: `ffw:1\|season\|date\|lastTick\|chainHash`. |
| Code | **Built.** `scripts/anchor.ts` (write), `scripts/verify-anchor.ts` (check), `app/anchors/page.tsx` (publish), `tests/anchors.test.ts` (enforce in CI). |
| Anchors written | **2** — season 0 (`55bdf958`) and season 1 (`34c9b98b`), both confirmed on Solana mainnet and both verified by reading the memo back from a public RPC. Season 2 (today) closes at 00:00 UTC and is anchored by the daily job. |
| Daily job | Systemd timer on the site's server: 00:05 UTC, writes yesterday's head, logs to `/var/log/ffw-anchor.log`. Idempotent — it refuses a day it already anchored. |
| Wallet | `EospJLqJohc5SV9JaSuejTxWb57XyVK3H4ECPw2H7vYF` — funded with 0.02 SOL, holds nothing else |
| Verified how | `npm run verify:anchors` (local replay) and `npm run verify:anchors -- --all --chain` (also reads the memo back from a public RPC). CI recomputes every anchor on every push. |

The send path is asserted in this repository without a chain: `tests/anchor-send.test.ts` builds the
transaction, checks the memo survives the wire format, and verifies the signature. The one thing not
yet proven is an RPC accepting it, because it needs a funded wallet.

## What is not built

Stated so that no reader has to guess, and so that no future commit can quietly imply otherwise:

- **Daily on-chain anchoring** — planned, not built. There is no `/anchors` page and no
  `verify --day` command yet, so today the hash chain is verifiable from the site and the API but
  not yet anchored to a public chain by this repository.
- **Connectome weight rebuild script** — planned, not built. The 24-neuron circuit's weights are
  documented in [`neural-model.md`](neural-model.md) as connectome-inspired, with the source
  dataset named; a script that rebuilds them from that dataset and asserts equality with the engine
  does not exist yet.
- **Real trading** — not built by design. See [LIMITATIONS.md](../LIMITATIONS.md).
- **WeeklyRace on-chain settlement** — written and tested, not deployed.
- **FFW-NAND/1 on TapeOut** — built and tested, not taped out, and no season runs on it. The
  50-gate brain, its `market/3` world and a read-only on-chain checker are in the repository
  ([`nand-brain.md`](nand-brain.md)); the BNB Chain addresses and prices it needs are still open
  ([`tapeout-notes.md`](tapeout-notes.md)).
- **FlyNFT / FlyToken** — design artifacts, not deployed.

## Keeping this page true

1. Change a fact in `config/launch.json`, not in prose.
2. If a claim in this file cannot be reproduced from the code or from a public RPC, delete it.
3. Every change to this file gets a line in [AUDIT-LOG.md](../AUDIT-LOG.md) with its commit hash.
