# Audit log

Every remediation made for the pre-launch code audit, one line each: what changed, the commit that
carries it, and how a reader can verify it. Newest first.

The rules this log follows:

1. Nothing is described as live unless the code implements it.
2. Nothing is described as planned unless it is written down as planned in
   [docs/STATUS.md](docs/STATUS.md).
3. Every entry is verifiable by the command in its own row.

---

## 2026-10-12 — pre-launch remediation

| # | Change | Where | Verify |
| --- | --- | --- | --- |
| P1 | `market/2`: SHA-256 record and chain hashes for new seasons; `market/1` (seasons 0–2) kept byte-for-byte as published, the switch landing on the season 3 boundary | `app/lib/market/hash.ts` (new), `app/lib/market/engine.ts`, `app/lib/market/fly.ts`, `app/api/fly/[slug]/route.ts`, `tests/market.test.ts` | `npm test` — 134 tests, including the SHA-256 vs `node:crypto` cross-check and the market/2 goldens; `runTo(FLAGSHIP, 0, 2000).chain === "003ad503"` unchanged |
| P0-1 | Removed every "trades from its own wallet" claim; the site and docs now say the market is invented and the wallet is simulated | `app/layout.tsx`, `app/page.tsx`, `app/fly/[slug]/page.tsx`, `README.md`, `docs/flies-that-trade.md` | `rg -i "own wallet" app docs README.md` → only the *paper wallet* wording and one unrelated e2e fixture |
| P0-2 | Single source of truth for launch facts: `config/launch.json` + `docs/STATUS.md`; the site reads it through `app/lib/token.ts` | `config/launch.json`, `docs/STATUS.md`, `app/lib/token.ts` | `rg -n "ClawPump\|Robinhood\|4663" docs README.md app` → no settled-chain claims outside history files |
| P0-2 | README gained a **Current status** section pointing at STATUS.md | `README.md` | open the README's status section |
| P0-3 | The existing on-chain Passport test deployment is disclosed, with placeholders, on the site, in STATUS.md and in a new contracts inventory | `app/dish/page.tsx`, `docs/STATUS.md`, `contracts/README.md` | `rg -n "test deployment" app/dish/page.tsx docs/STATUS.md contracts/README.md` |
| P0-4A | x402 menu carries no prices; status is "Not open yet. Opens after launch; prices will be published here first." | `app/components/fly/X402Menu.tsx` | `rg -n "e\\.g\\. \\$\\|Price at launch" app` → empty; `/fly/dusty` shows the new line |
| P0-7 | Oracle mode is labelled experimental and explicitly **not replayable** where it is offered; the agent prompt forbids pasting private keys | `app/lab/page.tsx`, `app/lib/agentskill.ts` | `rg -n "not replayable\|private key" app/lab/page.tsx app/lib/agentskill.ts` |
| P1-3 | `LIMITATIONS.md` and `GOVERNANCE.md` added — model limits, paper-market properties, unbuilt items, failed experiments, who holds what, what a kill switch would be | `LIMITATIONS.md`, `GOVERNANCE.md` | read both; every claim under "Not built yet" also appears in `docs/STATUS.md` |
| P2 | `sim` and `bench` shipped the Chinese food/trait labels while the game had already been translated; both now match the English copy | `fruitflyworld/sim@dcdc04f7`, `fruitflyworld/bench@8c1b1e6b` (both `js/sim.js`) | both repositories' CI green after the change; the diff is quoted strings only — no numbers, no ordering, no hash input |
| P2 | Commit-timezone convention documented (not enforced) | `CONTRIBUTING.md` | the House rules section |
| P1-2 | Daily anchoring on Solana: writer, verifier, `/anchors` page, manifest + status file, CI enforcement, transaction asserted without a chain | `anchors/`, `scripts/anchor.ts`, `scripts/verify-anchor.ts`, `scripts/solana-memo.ts`, `app/anchors/page.tsx`, `app/lib/anchors.ts`, `tests/anchors.test.ts`, `tests/anchor-send.test.ts` | `npm test` → 147 tests; `npm run verify:anchors`; `npm run anchor -- --day 0` (dry run, sends nothing) |
| — | This log | `AUDIT-LOG.md` | you are reading it |

### Not done, and why

| Item | Status | Why |
| --- | --- | --- |
| P1-2 daily on-chain anchoring + `/anchors` + `verify --day` | **Not built** | Needs a funded anchor wallet, a signing path and a CI job against a public RPC. Tracked in `docs/STATUS.md`; the site does not claim it exists. The record format it would anchor is now SHA-256 (`market/2`), so anchoring is the only piece left. |
| P1-1 connectome weight rebuild script + test | **Not built** | The weights and their provenance are documented in `docs/neural-model.md`; the rebuild script that proves them from the dataset does not exist yet. |
| P1-4 signed commits | **Not enabled** | Requires a signing key on the maintainer's machine; GitHub shows the commit signatures, so the absence is visible rather than hidden. |
| Next.js advisory upgrade | **Deliberately deferred** | Every open advisory clears only in `next@15.5.24`+, which also moves React 18 → 19 and makes the request APIs async. The decision and the blast radius are in `SECURITY.md`; the dependabot PR stays open. |
