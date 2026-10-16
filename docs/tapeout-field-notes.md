# TapeOut — field notes from playing the other projects

The companion to [`tapeout-ecosystem.md`](tapeout-ecosystem.md). That document maps the protocol;
this one is what we learned by **actually running other people's projects** — the numbers, the
rivals dissected, the games, and the pain points that fall out of them. Written 2026-10-16.

Everything here came from one of three places, named per item:

- **API** — pulled from the public research API at `tapeout.work` on 2026-10-16 05:15 UTC.
- **Decoded** — read out of a rival's own shipped JavaScript and simulated locally.
- **Played** — rendered in headless Chrome and read off the screen.

---

## 1. The numbers, and what they say

From `tapeout.work/api/v1/bem/overview`, `/market-overview`, `/bem/leaderboard`, `/daily-activity`,
`/protocol-pulse` (API, 2026-10-16):

| Fact | Number | Reading |
| --- | --- | --- |
| Processors | 1,267 | — |
| Processors that can mine `$BEM` | **2** | 99.8% of what gets built cannot earn anything |
| Circuits | 59,403 | supply is not scarce |
| Circuit-market sales, all time | 2,969 | — |
| **Unique buyers** | **36** | against 2,492 unique sellers — you can build, you cannot sell |
| Miners | 20,013 | but… |
| Active creators per day | **11** | …only ~11 actually create anything on a given day |
| Active processors per day | **12** | — |
| Top-10 wallets' share of circuits | 17.6% | — |
| Largest single wallet | **1,026 circuits, on 4 tasks** | farming, not designing |
| Busiest task | 4,985 circuits / 569 wallets (task 220) | one task is a crowded arena |
| Verification pass rate | 96.7% of miners | verification is a formality, not a filter |
| Emission split | 99% verified pool / 1% unverified | failing verification makes a circuit nearly worthless |

### The five pain points

1. **Supply ≫ demand.** 2,492 builders, 36 buyers, ever. A circuit is easy to make and there is no
   one to sell it to. Any project whose value is "we made a circuit" is competing for a market that
   does not exist.
2. **Winner-take-most per task.** The design premium (`K_task × q`) is paid only to the current
   best-known implementation of a task. Everyone else earns the base rate. One farm on task 220
   already holds ~5,000 circuits; a newcomer's elegant design earns almost nothing.
3. **It is a bot war, not a design contest.** The top wallet is 1,026 circuits across 4 tasks —
   volume, not cleverness. Human-scale designs are drowned by gas and count.
4. **Almost everything built is unmonetisable.** 1,265 of 1,267 processors cannot mine at all. The
   ecosystem's own activity is mostly sunk effort.
5. **Nothing is a *world*.** Every circuit is a pure function (or a tiny clocked machine). There is
   no persistent state, no story, no reason to return. That is the gap — and it is the one we fill.

---

## 2. The rivals, dissected

Three projects worth knowing. The first two are our direct neighbours; the third sets the ceiling.

### LoomEscape — a fly escape reflex, played (2026-10-16)

`brucelanlan.github.io/c3s-reflex-circuits/demo/` · author `@BruceBlue`

- **173 NAND + 6 LATCH, depth 25.** 16-bit input (a size bin and a speed bin per eye, LSB first).
  Outputs are anatomically named: giant fiber `DNp01`, parallel descending neurons `DNp02/04/06/11`.
  A motor core holds a wing-raise counter (0/4) and a refractory timer.
- **Feel:** the most *polished* of the lot — bilingual EN/中文, a 3D voxel bench you loom a block
  at, slow-motion ×15, a live tick and gate-state panel.
- **The tell:** it ships its netlist **in the page** (`core-hand-abc.json`) with a manifest, and
  hash-checks it on load. Same verification instinct we have. It is a *reflex*, not a fly that lives
  in a world; depth 25 is deep (and depth is cubed in the cost function, so it is expensive by the
  protocol's own scoring).

### FlyOut — a dish of tunable brains, played + decoded (2026-10-16)

`flyout-brain-lab.martin1980888999.chatgpt.site`

- **What it is:** a petri dish, 6 flies, 100 food, a 90-second clock, and a row of selectable
  "brains." Chinese-first UI. A seeded xorshift world (`BASE_SEED = 0x0f10f17`), so a run is
  deterministic — the closest neighbour to our own idea.
- **Five brains.** Three are behavioural (探索者 / 觅食者 / 生存者); two are gate-level:
  **真实计数脑 = TAPEOUT #77 · 19 NAND**, and **六路反射脑 = 21 NAND**. There is also a boss fight
  (牛来, 220 HP) inside the same page.
- **We decoded both gate-level netlists out of its shipped JavaScript** (Decoded):

  **#77 — 19 NAND + 4 LATCH, one input `X0`.** Simulated: `X0 = 1` increments a 4-bit counter,
  `X0 = 0` holds it. Its "action" is `Q0 | Q1<<1 | Q2<<2` — i.e. the low three bits of a pulse
  count, cycled every 18 units. It is, honestly, **a counter, not a decision**. (Named
  计数脑 = "counting brain.") No sensor is graded: one bit in, one clock out.

  **六路反射 — 21 NAND, 0 LATCH, depth 7, 6 inputs / 4 outputs.** Inputs `DL DR DF` (danger
  left/right/front) and `FL FR FF` (food left/right/front); outputs `LEFT RIGHT FORWARD RETREAT`.
  Simulated truth table is a clean Braitenberg vehicle: danger left → turn right, danger right →
  turn left, danger front → retreat, clear ahead → forward. Depth 7. Purely combinational.

- **The tell:** FlyOut's gate-level brains are **tiny because their inputs are single bits**. A
  sensor is "danger on / danger off." Neither #77 nor the 21-gate reflex has a graded signal or
  memory of its last action.

### BARD / 21 NAND — an LLM in gates, played (2026-10-16)

`jogjohgoeg.github.io/nand-driver/`

- **What it is:** an open-source language model rebuilt entirely out of logic gates and run on your
  own GPU, answering **bit-for-bit identically** to the original model, ~0.5–1.5 s per word. Nav:
  The Bard / Try it / Build / FAQ / Progress / Verify / 中文.
- **Honest to a fault:** the page itself says "Tokens carry no rights," "The chip is designed, not
  yet made," and "nothing goes on chain." This is the project that sets the ambition ceiling — and
  it is the one most disciplined about not over-claiming.
- **Why it matters to us:** it proves "run real gates in the browser, verifiably" is a legitimate,
  celebrated thing in this community at far greater scale than ours. It is not a competitor for the
  fly; it is evidence the *verification story* is the currency.

### Where we sit (honest)

| | LoomEscape | FlyOut #77 | FlyOut reflex | **FFW-NAND/1** |
| --- | --- | --- | --- | --- |
| Gates | 173 N + 6 L | 19 N + 4 L | 21 N | **50 N, 0 L** |
| Depth | 25 | small | 7 | **9** |
| Inputs | 16 bits (2 bins × 2 eyes) | **1 bit** | 6 bits (all on/off) | **12 bits — 5 graded signals + last behaviour** |
| Outputs | 6 (named neurons) | 3 (a count) | 4 (directions) | **3 (behaviour + escape)** |
| Kind | one reflex | a counter | a Braitenberg reflex | **a decision layer: 7 rules over graded senses with memory** |
| World | 3-D bench | seeded dish | seeded dish | **deterministic, sealed, replayable day** |

Our differentiator is **not** gate count (we are neither the smallest nor the largest). It is that
FFW-NAND/1 is the only one of these that **reads graded senses and remembers its last behaviour**,
and that it runs inside **a whole fly that lives and dies in a world whose every tick is sealed and
re-checkable**. FlyOut is the nearest thing — and its gate-level brains are single-bit reflexes.

---

## 3. The games (Played, 2026-10-16)

`tapeoutexplorer.com/games` — TapeOutScan's directory. Three, all Chinese-first, all "the browser
runs the netlist":

| Game | What it is | How it uses gates |
| --- | --- | --- |
| **黑神话巨兽** (Black Myth: TapeOut) | A boss fighter. Level 1 single boss 牛来; level 2 牛妈 with 双层生命 and 母子协同. | **Seven published TapeOut netlists** run cycle-by-cycle to drive the boss's movement, dodging and move selection; the browser only renders. |
| **弈芯** | NAND Gomoku on a 15×15 board. | The opponent's judgement is a **real NAND netlist**. |
| **余烬** (Ember) | A 12-level platformer with combo training and online versus. 原版中文, free. | Level "电路板" (circuit-board) challenges. |

TapeOutScan is mid-migration to a DeWeb gateway (`deweb.tapeoutscan.io`) and says it will become
"fully free to use, remove user access limits, and upgrade its services to meet the data service
standards of leading blockchain explorers."

**The takeaway:** "seven published netlists drive the boss" is the community's own version of what
we do. Running gates in a browser is *table stakes* here; the differentiator is the **world and the
sealed record**, not the act of running gates.

---

## 4. What this changes for us

1. **Lead with the world, not the circuit.** Everyone has a circuit. Nobody has a fly that lives,
   dies, is replayed tick by tick and can be re-checked from its own record. That is already built.
2. **Our circuit's honest edge is graded input + memory, in 50 gates.** Say that plainly; do not
   claim to be the smallest (FlyOut's are smaller) or the biggest (LoomEscape and BARD are).
3. **Verification is the shared currency, and we are already fluent.** LoomEscape hash-checks its
   netlist on load; BARD brands itself on "every step can be checked"; we seal every tick. Keep it.
4. **The market is not a place to sell.** 36 buyers ever. Do not build a story that depends on
   selling circuits. Build a story that depends on **being verifiable and being a world**.
5. **Neighbours, not rivals.** LoomEscape and FlyOut are the first two players to invite into any
   Brain Lab / competition, exactly as `tapeout-ecosystem.md` §8 already says. Play their games,
   do not shadow them.

## 5. Still open

- Which processor FFW-NAND/1 would tape into, and the BNB tape-out + protocol fee (see
  `tapeout-notes.md`).
- Whether FlyOut's three behavioural brains encode anything gate-level that we could compare
  against; only its two counted netlists were decodable from the shipped JS.
- Whether TapeOutScan's Games page lists a contract for new games to be added.
