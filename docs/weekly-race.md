# The weekly race — commit, draw, reveal, grade

*"Win clean."* The weekly race is the closed loop the determinism work
(docs/determinism.md) was built for: one paper, drawn after everyone has
handed in, that anyone can re-run and check. This document is the protocol
record — what shipped, what is design-only, and how to verify a week
yourself. Protocol version: **race/1** (not yet open for entries).

Status: the API and the contracts are written and tested. **No race has run,
no contract is deployed, no NFT or token exists.** Nothing is on sale.

## The protocol (four steps, all public)

| Step | Who | What | Where |
|---|---|---|---|
| 1. COMMIT | entrant | lock the exam entry: brain + a sha256 commitment of the draft policy. One wallet per week. Server stores only the hash | `POST /api/race/commit` (EIP-191 signed) · `WeeklyRace.commit()` |
| 2. DRAW | the chain | after the commit cutoff, the exam seed is derived from the latest Ethereum (Sepolia) block mined **after** the cutoff — unknowable at commit time | `race_weeks.draw_hash` · `WeeklyRace.setDrawSeed()` |
| 3. REVEAL | entrant | publish the policy; the server re-derives the commitment — a mismatch voids the entry | `POST /api/race/reveal` · `WeeklyRace.reveal()` |
| 4. GRADE | the server | replay every revealed entry through the same vendored `world.js`, same seed, 3 generations; rank by eggs, then survived generations, then earliest commit | `POST /api/race/grade` (operator) or lazily on `GET /api/race` |

Weeks are epoch-aligned 7-day windows. The last 24 hours of a week are the
draw-and-reveal window; commits close at the cutoff.

## Why the policy is declarative

Entrants do not submit code. A policy is an ordered list of trait
preferences; at each mutation draft the replay picks the offered card ranked
earliest in that list (first card if none is listed). This keeps grading
side-effect-free — no untrusted code execution on the server — while still
making the draft decision the entrant's own, and the commitment binds it
before the paper exists.

## The three contracts (design-only, audit-ready)

- **FlyNFT** (`contracts/src/FlyNFT.sol`) — tradable ERC-721; each token
  carries an immutable lineage (origin seed, brain slot, five gene weights
  scaled 1e6) set at mint from a signed voucher, plus a recorder-writable
  race record (races / wins / eggs / best generations). A fly entered in a
  week cannot transfer until that week is graded.
- **WeeklyRace** (`contracts/src/WeeklyRace.sol`) — the on-chain mirror of
  the four steps: commit burns an entry fee and locks the fly; the draw seed
  is recorded once; reveal must hash-match; grading pays from a per-week
  pool cap the operator sets up front, and every field is an event.
- **FlyToken** (`contracts/src/FlyToken.sol`) — the one project token:
  444,444,444 FLY minted exactly once at deployment, no mint function after,
  and spend = burn, so supply only ever falls.

All three are self-contained Solidity (no OpenZeppelin, no forge-std) with
21 tests: `cd contracts && forge test`.

## Verify a week yourself

```bash
# the week's state: phase, draw (block hash + seed), entries, leaderboard
curl -s https://fruitfly.world/api/race

# re-run the graded exam for any entrant: fetch the seed from the response,
# then replay with the same brain and policy
node cli.mjs --seed <draw.seed> --brain <entry.brain> --gens=3
# eggs must match the leaderboard row, to the egg
```

The server replays with the same `public/play/js/world.js` bytes the browser
runs — the one-way vendor flow (`vendor.lock.json`, sha256-checked in CI)
keeps browser, CLI and grader on one file.

## Honest boundaries

- No week has been graded yet. Until one has, the leaderboard is empty and
  the protocol is a promise with receipts, not a track record.
- The commit-before-draw property is real but the operator is still trusted
  to grade honestly; that trust is auditable (anyone can re-run the replay)
  but not yet removed — on-chain grading is the follow-up.
- The token's monetary policy is one fixed supply and burns. No yield, no
  floor, no promise of value. Any token claiming to be Fruit Fly World today
  is fake.
