# The Escape Circuit (Neural Layer)

The behavioral core of [`/play`](https://fruitfly.world/play) is a Giant Fiber (GF) escape
reflex implemented as a small, pure, deterministic neural module. This document is its
specification: what the state is, how it transitions, what the numbers mean, and — equally
important — what they do **not** mean.

Source of truth: [`public/play/js/gf-neuron.js`](../public/play/js/gf-neuron.js) (plain ESM,
no build step, runnable in Node and the browser).

---

## 1. The circuit

```text
looming predator
   ├── angular velocity ──> LC4  (2,442 synapses)
   ├── angular size     ──> LPLC2 (1,366 synapses)
   │                          │
   │                    weighted sum (real or swapped)
   │                          ↓
   └───────────────> GF membrane potential (leaky integrate-and-fire)
                              │
                        potential ≥ threshold → READY
                              │
                        escape jump (behavior layer)
```

In the MaleCNS v1.0 connectome the Giant Fiber is neuron DNp01, and LC4 + LPLC2 supply
~99.6% of its visual input (Ache et al. 2019, FAFB). The synapse counts **2,442 and 1,366
are research references**: they are used here only as *relative weights between the two
channels*. They are not biophysical membrane parameters, conductance values, or firing
rates, and this model does not simulate ion channels.

## 2. State

`makeGFState()` returns one plain object — the whole neural state:

| Field | Meaning |
| --- | --- |
| `lc4` | LC4 activation in `[0, 1]` — driven by angular velocity |
| `lplc2` | LPLC2 activation in `[0, 1]` — driven by angular size |
| `pot` | GF membrane potential, leaky-integrated toward its input |
| `armed` | `true` when `pot` is at or above threshold **and** outside the refractory window |
| `lastFire` | simulation time of the last escape fire |
| `iframe` | post-escape invulnerability window (game-layer field, consumed by the behavior layer) |
| `prevTheta` | previous angular size of the stimulus, held for finite-difference velocity |

Field names are a compatibility surface: the HUD, `window.FlyLabAPI` and the saved-game
format all read them, so they are stable.

## 3. Transitions

All transitions are pure functions of `(state, input)` — no DOM, no Phaser, no globals,
no RNG. Same inputs, same state, every time.

**Sensory layer** — stimulus features to channel activations:

```text
lc4   = clamp01(vel × 0.45)                                  // LC4, leads
lplc2 = 𝟙[size > 0.08] × exp(−(size − 1.4)² / (2 × 0.7²))   // LPLC2, lags
```

LPLC2 is tuned as a size-selective band around `1.4` rad — a looming object is most
threatening at a particular apparent size, not the largest one.

**Integration** — the two channels combine under one of two connectivity conditions:

```text
real:    (2442 × lc4  + 1366 × lplc2) / 3808
swapped: (2442 × lplc2 + 1366 × lc4)  / 3808
```

`real` puts the large weight on the **leading** channel (velocity); `swapped` moves it onto
the **lagging** channel (size). (The code identifier for the swapped condition is the string
`"shuffled"` — a compatibility surface kept for saved runs and tests; in prose we call it
what it is: two weights swapped.) This is the comparison condition of the wiring check below.

**Membrane** — one leaky integrate-and-fire step:

```text
pot ← pot + (target − pot) × min(1, dt × leakRate)
armed ← pot ≥ threshold  AND  (now − lastFire) > refractory
```

Leak rate is `10 s⁻¹` in the playable loop, `15 s⁻¹` in the fixed-seed assay. Threshold is
`0.6` (the `giant` trait lowers it by `0.08`).

**Firing** — `fireGF(state, now)` is called by the *behavior layer* when the escape actually
happens: it resets the membrane to `0` and opens the refractory window. One stimulus crossing
threshold arms the unit once; re-arming requires both a new integration and the refractory
window to have passed.

## 4. Layer boundaries

The module deliberately owns **only** the neural state:

- `scene-game.js` (`updateGF`) computes the *environment input* — predator distance to
  angular size/velocity — advances time, and calls `stepGF`.
- `gf-neuron.js` performs every state transition.
- `tryDash` (behavior) decides *when to jump* and calls `fireGF`. The player is the escape
  decision: the circuit says READY, you press Space.

## 5. The reproducible wiring check

`simEscapeTrial(mode, seed)` ([`sim.js`](../public/play/js/sim.js)) is a single-loom assay:
one looming strike with seed-randomized initial distance, velocity and acceleration; escape
succeeds only if the GF fires with ≥ `0.18 s` of lead before contact. The **only** difference
between arms is the connectivity condition.

`runExperiment(worldSeed)` runs 200 trials per arm. Pinned, reproducible result:

| | real | swapped |
| --- | --- | --- |
| escape rate | **100 %** | **68 %** |
| mean lead time | **0.2023 s** | **0.1828 s** |

These exact values are asserted in [`tests/gf-neuron.test.ts`](../tests/gf-neuron.test.ts),
so any change to the circuit that moves the published numbers fails the build. The assay
itself is deterministic per seed; `simEscapeTrial("real", 12345)` always returns
`lead = 0.18333…`.

**What this check is, stated plainly — it is a demonstration, not an experiment on the
connectome.** The model is two scalar sensory channels summed into one leaky unit. The real
condition is *defined* as the one that puts the large weight on the leading channel, so
real-beats-swapped holds by construction **within this model**; the specific escape rates
(100% / 68%) are a function of the hand-set parameters (`VEL_GAIN`, `SIZE_PEAK`,
`THRESHOLD`, leak rate). The assay also runs at a membrane leak of `15 s⁻¹`, while the
playable game loop runs `10 s⁻¹` — the number describes the assay, not the in-game reflex.
What the pinned numbers prove is reproducibility and sensitivity to channel order. A
parameter-sweep showing over how wide a range real beats swapped is not yet done; until it
is, this check should not be quoted as a headline result.

## 6. Three models, one honest boundary

Fruit Fly World contains three models at different grains. They are related by theme, not
shared code:

| Model | Where | What it is |
| --- | --- | --- |
| Playable GF escape circuit | `public/play/js/gf-neuron.js` + `sim.js` | The 2-channel → 1-unit reflex described here, running live in the game loop |
| Selectable brains | `public/play/js/cx-circuit.js`, `brain-*.js` | The 24-neuron circuit and the judgment layer that can sit in the brain slot |
| Vial population prototype | `app/lib/sim/` | Generational genetics simulation (food, temperature, mating, inheritance) — no predator, no GF |

## 7. Tests

[`tests/gf-neuron.test.ts`](../tests/gf-neuron.test.ts) pins the unit contract:

- identical inputs produce identical neural state (deterministic replay)
- zero stimulus leaks the membrane monotonically to `< 0.01`
- threshold crossing arms once; firing resets the membrane and enforces the refractory
  window; the unit re-arms only after it
- real and swapped connectivity are distinguishable and reproducible
- the assay and experiment numbers above stay pinned
- `makeFly` carries the canonical state shape
