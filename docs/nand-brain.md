# FFW-NAND/1 — a fly brain you can tape out

**Status: built and tested, not live.** No season runs on it yet, and nothing has been taped out.

FFW-NAND/1 is a fruit-fly decision layer made of **50 two-input NAND gates**. It is small enough to
read on one screen and to build on the [TapeOut](https://tapeout.world/) canvas, where a circuit
lives on BNB Chain and anyone can evaluate it for free with a read-only call. Once it is taped out,
the fly's every decision is computed by the same circuit everyone can query, and every tick of its
day can be checked against the chain.

| | |
| --- | --- |
| Inputs | 12 bits: five signal levels (2 bits each) and the previous behavior (2 bits) |
| Outputs | 3 bits: behavior (2 bits) and the Giant Fiber escape (1 bit) |
| Gates | 50 NAND, 0 LATCH, 0 sub-circuits; depth 9 |
| Tape-out bytes | 350 (7 per NAND), SHA-256 `a7631170…f443d4dd` (pinned in `tests/nand-brain.test.ts`) |
| Source of truth | `app/lib/nand/rules.ts` (seven rules) |
| Compiled form | `app/lib/nand/ffw-nand-1.netlist.json` |
| World that uses it | `market/3` (= `market/2` rules and seal, this brain, one extra record field) |

## The interface

A brain in Fruit Fly World maps four signals, hunger and the previous behavior to one of four
behaviors. FFW-NAND/1 sees each number as a **level** from 0 to 3:

| Level | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Value | below 0.10 | 0.10 to 0.35 | 0.35 to 0.65 | 0.65 and above |

The levels are packed into a 12-bit word, pin 0 first (TapeOut packs input pin *i* into bit *i*):

| Bits | 0–1 | 2–3 | 4–5 | 6–7 | 8–9 | 10–11 |
| --- | --- | --- | --- | --- | --- | --- |
| Input | food | threat | light | novelty | hunger | previous behavior |

Behaviors are numbered 0 approach, 1 avoid, 2 explore, 3 freeze. The output word is
`behavior | escape << 2`. Code: `app/lib/nand/encode.ts`.

The brain keeps no state of its own. Its short memory is the previous behavior, which the world
passes in and seals in the record. That is what makes an on-chain spot check possible: the input
word of any tick can be rebuilt from the sealed record alone.

## The seven rules

Read top to bottom; the first rule that matches decides.

1. **Escape** — threat ≥ 2 → avoid, and the Giant Fiber fires.
2. **Danger** — threat ≥ 1 and (the previous behavior was avoid, or hunger < 2) → avoid.
3. **Feed** — hunger ≥ 3 and food ≥ 1 → approach.
4. **Lure** — food ≥ 3 → approach.
5. **Pursue** — the previous behavior was approach and food ≥ 2 → approach.
6. **Curious** — novelty ≥ 2 → explore.
7. **Rest** — the previous behavior was freeze and hunger < 3 → freeze.
8. Otherwise: explore in the light (light ≥ 1), freeze in the dark.

Rule 1 is the brainstem the game already models: looming detected by LC4 and LPLC2 drives the
Giant Fiber, and the fly jumps. In the trading dish a Giant Fiber spike sells everything, so the
escape is a real trade. The other thresholds were tuned in closed loop against FFW-CX/0.1 (below).

## How it compares with FFW-CX/0.1

Same dish, same tapes: 6 fly seeds × 4 seasons (24 trading days), `npm run nand:compare`.

| Per day, averaged | FFW-CX/0.1 (`market/2`) | FFW-NAND/1 (`market/3`) |
| --- | --- | --- |
| Share of ticks alive | 0.997 | 0.997 |
| Deaths | 1.96 | 1.96 |
| Generations | 2.92 | 2.92 |
| Giant Fiber escapes (ticks) | 67.9 | 85.6 |
| Trades | 269 | 1,495 |
| Equity at day end (paper USD) | 1,218 | 1,490 |
| Behavior mix (approach / avoid / explore / freeze) | 0.18 / 0.03 / 0.47 / 0.32 | 0.27 / 0.05 / 0.49 / 0.20 |

What this says, and does not say:

- **It lives as well.** Deaths and generations match, and they match exactly because in this dish
  they are driven by the fee rhythm (hunger), not by the brain.
- **It is a busier trader.** It approaches more and rests less, so it trades about five times as
  often. Equity ends a little higher on these 24 days. That is one table, not a claim about markets.
- **It is not a copy of FFW-CX/0.1.** It is a different, much smaller brain with a similar
  temperament. The site must say "inspired by" and "tuned against", never "the same brain".

## How it was made (and what did not work)

1. **Distilling a table from FFW-CX/0.1 directly.** We sampled 380,000 decisions from both dishes
   and took the most common behavior for each input word. The table compiled to 2,472–3,398 gates
   and, in closed loop, the fly locked into one behavior: FFW-CX/0.1 repeats its previous behavior
   96% of the time because of its membrane dynamics, so "copy the previous behavior" is what a
   stateless table learns.
2. **Small decision trees.** Down to 11–54 gates, with the same lock-in when the tree may read the
   previous behavior, and no resting or avoiding when it may not.
3. **Closed-loop distillation (DAgger)** with a shadow FFW-CX/0.1 labelling the states the gate fly
   actually visited. Agreement with the shadow stalled near 50%, and small parameter changes swung
   the behavior mix widely.
4. **Seven explicit rules, tuned in closed loop.** Stable, 35–53 gates across the settings tried,
   readable, and close on the measures above. This is FFW-NAND/1.

The lesson is worth keeping for Brain Lab: a stateless circuit needs the world to hand it a little
memory (here, the previous behavior), and readable rules beat imitation at this size.

## Rebuilding it

```bash
npm run nand:table          # rules.ts → app/lib/nand/ffw-nand-1.table.json (4096 rows)
ESPRESSO=/path/to/espresso npm run nand:synth -- --rounds 8   # table → netlist, verified on all 4096 words
npm test                    # netlist == rules on every word; pinned bytes; market/3 golden
npm run nand:bytes          # the bytes for tapeout(), with nIn, nOut and a SHA-256
```

`synth.py` needs [espresso](https://github.com/classabbyamp/espresso-logic) (build with `make`) and
`pip install yowasp-yosys` (Yosys 0.70 with ABC, run as WebAssembly). The committed netlist is the
artifact; rebuilding with another Yosys version may give a different but equivalent netlist, and
the pinned hash in the tests will say so.

## Taping out (phase 1, not done)

1. Confirm the BNB Chain processor address, the transistor price and the eval input byte order
   (`docs/tapeout-notes.md`).
2. Tape out once, by a person, from the TapeOut client or a reviewed script: buy 50 NAND
   transistors, call `tapeout(bytes, 12, 3)` with the bytes from `npm run nand:bytes`.
3. `npm run nand:verify -- --rpc <BNB RPC> --processor <address> --id <circuit id>` must print
   `IDENTICAL: all 4096 words`. If the byte order is the other way round, add `--msb-first` and
   record the answer.
4. Publish the processor address and circuit id in `config/launch.json` and on the site, then
   choose the first `market/3` season (a season boundary, never mid-season).
