# Determinism — the exam room's foundation

*"Don't exam the model. Starve it."* Only works if the exam is fair: same paper,
same grader, no favors — on every machine, every re-run, forever. This document
is the engineering record of how Fruit Fly World earned that claim, leak by
leak, with receipts. World semantics version: **dish/3**.

---

## Why this is hard

A survival game looks deterministic: one seed drives food placement, the
predator, the mutation drafts. But "deterministic" leaks in boring, brutal
ways. Each leak below was found in our own exam room (`/play?bench=1` runs the
world twice at a fixed 60 Hz and compares every decision hash) or while
freezing a cross-platform golden baseline — and every one of them silently
changed grades.

## The six leaks, and their fixes

| # | Leak | Symptom | Root cause | Fix |
|---|------|---------|-----------|-----|
| 1 | Novelty memory survived between runs | run B explored "visited" cells | a `Set` outside the per-run reset | cleared per run |
| 2 | Rival's traits lived on the wrong object | rival stats stale after drafts | traits written to a copy, read from the original | single source object |
| 3 | Predator residue | run B's predator lunged on frame 1 | lunge/target state not reset | reset in world reset |
| 4 | **GF membrane potential carried over between runs** | run B's escape reflex fired on a different frame | LIF state (`pot`/`prevTheta`/`lastFire`) never zeroed between bench runs | zeroed at run start |
| 5 | **Rival genes depended on your save file** | same exam, different grades per visitor | the wild type's 5 gene weights were rolled once at page load from the *saved* world seed and never re-rolled when autopilot/bench changed the seed | `rollRivalGenes(seed)` — a pure function of the run seed, re-derived every generation (dish/2) |
| 6 | **The math library itself drifts** | arm64 browser and x64 server replayed different worlds from the same seed | `Math.sin/cos/exp/atan` are implemented in C++ per architecture and differ in the last ulp; one ulp on a rival's position at gen 2 frame 242 amplified into a 3-egg outcome difference | hand-rolled IEEE-exact kernels (`dmath.js`), sim lane only (dish/3) |

Leak 6 deserves its own numbers, because "the language's math functions are
not bit-stable across CPUs" is not folklore — we measured it:

| Function | arm64 Chrome vs x64 Node, 20 000 inputs | verdict |
|---|---|---|
| `exp`, `cos`, `sin` | ~3% of inputs differ in the last ulp | **unfit for a deterministic sim** |
| `atan` | 5.65% differ | **unfit** |
| `atan2`, `hypot`, `sqrt` | 0 differ | safe (IEEE-rounded ops) |
| `pow`, `log`, `tan` | differ | avoided in the sim lane |

## The fix: `dmath.js`

Pure-JS kernels for the simulation lane — `dsin`, `dcos`, `dexp`, `datan` —
built exclusively from operations the ECMAScript spec pins to IEEE-754 double
semantics (`+ - * /`, integer ops, correctly-rounded `sqrt`/`atan2`). Bit-identical
on every engine and architecture by construction, not by hope. Accuracy vs
libm: sin/cos ≤ 2.2e-14 absolute, exp ≤ 9.7e-15 relative, atan ≤ 4.4e-16
absolute — far below anything a fly can notice. Render code (leg animation,
wing flap) keeps `Math.*`; it never feeds back into simulation state.

## `world.js`: the world, extracted from the game

The same rules now run headless in pure Node (`ffw-sim` repo): food layout,
predator AI, drafts, brains, generation pressure — one importable module with
zero DOM, zero Phaser, zero `Math.random`. The port is *faithful to a fault*:

- The brain driver's **pending decision crossing a generation boundary** (a
  microtask-timing artifact of the browser loop) is reproduced exactly — it
  lands in the next generation's log, because that is what the browser does.
- State the browser carries across generations (GF membrane, slow-mo window,
  `cannibalSlowT`) is carried here too.
- One browser bug (the `guard` trait comparing world coordinates against egg
  *pixel* coordinates, so it never triggers) is pinned `false` with a comment,
  so a future "fix" cannot silently fork the baseline.

This is what makes **server-side grading** possible: the server replays the
run with the same seed and brain and checks every hash itself.

## Receipts

- **Pinned unit goldens** (regression-pinned in tests, survived the kernel
  switch bit-identically): escape assay 100%/68% (real vs shuffled
  connectivity), FFW-CX behavior-trace hash `9fb9e0d0`, draft-cards hash
  `0f4d39c3`, rival-genes hash `e9b1d202`.
- **60-case golden baseline** (`baseline-dish/3`): 3 brains × 20 seeds ×
  3 generations, generated in arm64 headless Chrome, replayed by `world.js`
  on x64 Node — **1260/1260 field checks identical**, including every
  decision-log content hash.
- **Production-verified on fruitfly.world** (release 20260924121215): seed-42
  exam double-runs print IDENTICAL — judgment brain 19 eggs, circuit brain
  4 eggs over 2 generations; over 3 generations the judgment layer finishes
  with 34 eggs, the 24-neuron circuit with 5.
- **Cross-architecture parity**: same seed + same brain in an arm64 browser
  and an x64 Node process produce byte-identical decision logs (verified on
  seeds 7 / 42 / 1337 / 2024 × circuit / judgment).

## Run it yourself

```
# in your browser — the double-run exam room:
https://fruitfly.world/play?bench=1&seed=42&brain=judgment&gens=2

# in Node — replay the same lineage headless:
git clone https://github.com/fruitflyworld/sim && cd sim
node cli.mjs --seed 42 --brain judgment --gens=3

# the 60-case golden parity suite:
npm test          # includes tests/world-parity.test.ts

# the server-side grader — the server replays the run and grades a claim:
curl -X POST https://fruitfly.world/api/exam/replay \
  -H 'Content-Type: application/json' \
  -d '{"seed":42,"brain":"judgment","gens":2,
       "claim":{"gens":[{"gen":1,"eggs":7,"logHash":"38834a61"},...]}}'
# → { "worldVersion": "dish/3", "gens": [...], "claim": { "verdict": "match" } }
```

The grader imports `public/play/js/world.js` from disk at runtime — the exact
bytes the browser runs — so browser, Node CLI and server all read one file.
Grades deterministic brains only (`genes` / `circuit` / `judgment` = the free
local heuristic); oracle runs with a remote model are sealed, not replayed,
and are never claimed identical.

One seed is one row, not a theorem. The point is not that judgment beats the
circuit on seed 42 — it is that anyone, on any machine, can re-run the exam
and get the same answer to the bit.

## Versioning

`WORLD_VERSION` tracks world semantics: dish/1 (pure world extraction) →
dish/2 (rival genes as a pure function of the seed) → dish/3 (deterministic
math kernels). Baselines are frozen per version (`tests/golden/baseline-dish3.json`);
changing semantics regenerates the baseline and bumps the version. The one-way
vendor flow `sim → game → fruit-fly-world` (`vendor.lock.json`, sha256
fingerprints per file, CI-checked) keeps the three repos serving identical
bytes.
