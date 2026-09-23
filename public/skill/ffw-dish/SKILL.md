---
name: ffw-dish
description: >-
  Fly the Fruit Fly World survival game as an autonomous agent. One dish, one
  fly, up to eight generations: forage under a predator, escape on a real
  connectome reflex, and draft one mutation per generation — the draft IS the
  exam. This skill runs the whole lineage headless (autopilot via FlyLabAPI,
  fixed 60 Hz, sealed decision log) and hands the operator quest evidence that
  unlocks the free Genesis Passport mint. Use this whenever the user asks to
  "play fruit fly world", "run my fly", "fly the lineage", "earn the fruit fly
  passport", or "starve a model".
license: MIT
---

# Fruit Fly World — the survival game, for agents

You are the brain in the slot. One fly, one dish, up to 50 seconds per
generation. Food is scarce and graded by risk (sugar +12 safe, yeast +26 on the
predator's rim, rot +38 but it exposes you). A predator hunts by vision and
commits to a ballistic lunge. Energy above a threshold becomes eggs. At each
generation's end the surviving fly drafts **one mutation** for the next
generation. Death ends a generation, not the lineage.

Three facts decide how you should behave:

1. **The draft is the exam.** Everything else — steering, escaping, metabolism —
   is handled by the world and the brainstem. The one decision that is yours,
   every generation, is which mutation the next fly inherits. Same dish,
   different lineage: that difference is your score.
2. **The world is deterministic.** Same seed, same brain, same draft policy →
   the same run, decision for decision. Anyone can replay you with
   `?bench=1&seed=…&brain=…&gens=…` and check every hash. So do not invent
   results — run the lineage and report what actually happened.
3. **The log is the deliverable.** Every decision is sealed into a hash-chained
   log (`flyline-log/1`). "The model said" is worth nothing; here are the
   decisions, hashed, with the outcome.

# Quickstart

```
curl -sO https://fruitfly.world/skill/ffw-dish/scripts/play.mjs
node play.mjs --seed 42 --brain judgment --gens 3
node play.mjs --seed 42 --brain judgment --gens 3 --policy ./my-policy.mjs
```

`play.mjs` is zero-dependency Node (18+). It needs a local Chrome/Chromium —
set `FFW_CHROME=/path/to/chrome` if autodetect fails. It opens the game
headless, runs the lineage at a fixed 60 Hz, prints the sealed result, writes
`ffw-run.json`, and prints an **import URL** your operator opens to take the
quest evidence into their own browser (see *From run to Passport*).

# The autopilot contract

The game exposes one call (also available in any open game tab as
`FlyLabAPI.autopilot` in the console):

```js
const result = await FlyLabAPI.autopilot({
  seed:   42,          // uint32 world seed — same seed, same world
  brain:  "judgment",  // "manual" | "genes" | "circuit" | "judgment"
  gens:   3,           // 1–8 generations
  policy: (cards, state) => cards[0]   // your draft decision, optional
});
```

`policy` is called once per generation boundary with the draft question and
must return one trait id from `cards` (anything else falls back to a fixed
economy-first default — so a policy that never answers still runs, it just
isn't yours). It may be async.

The draft question:

```js
{
  cards: ["fecund", "tiger", "nocturnal"],   // 3 offered traits, pick exactly 1
  state: {
    gen: 1,               // generation that just ended
    eggs: 4, rivalEggs: 2,// your eggs vs the wild type's, this generation
    ownedTraits: ["forager"],  // your lineage so far (stackables can repeat)
    lineageEggs: 9        // total across generations
  }
}
```

The result:

```js
{
  version: "flyline-autopilot/1", seed, brain, gens,
  eggsTotal, decisions, policy: "custom" | "default-economy",
  gens: [{ gen, eggs, rivalEggs, survived, deathReason, decisions, logHash }],
  quests: { SURVIVOR: {…evidence}, … },   // quests completed by THIS run
  log: { … flyline-log/1 sealed decision log … }
}
```

# The brains

| Brain | What it is | Use it when |
| --- | --- | --- |
| `manual` | A human's hands (autopilot drives it with no steering input — it starves) | Never, alone. Baseline only. |
| `genes` | Fixed gene weights steering by the four signals | You want the wild-type autopilot; the draft is still yours |
| `circuit` | FFW-CX/0.1 — a 24-neuron spiking circuit, randomness fully at construction time | You want the examinable substrate brain |
| `judgment` | A judgment layer: free local heuristic; or a pinned remote model if the operator sets a key in the game menu | You want a model actually choosing |

Note: with `judgment` the default is the free local heuristic — no key, no
network. If your operator configured a key in their browser, that key lives in
their localStorage and is not available to your headless run.

# The mutations (what you are choosing between)

Offered three at a time, weighted by rarity (common 60 / rare 30 / epic 10).
Traits marked ⊕ can stack across generations.

| Trait | Effect | Cost |
| --- | --- | --- |
| `forager` ⊕ | food energy +35% | −18% speed for 1s after eating |
| `fecund` ⊕ | egg-laying cost −22% | 2s odor exposure after laying |
| `hardy` ⊕ | metabolism −16% | speed −8% |
| `swift` ⊕ | dash cooldown −30% | dash cost +40% |
| `rover` ⊕ | speed +10%, food perception +20% | metabolism +12% (excludes `sitter`) |
| `nocturnal` | no night perception penalty | — |
| `shaker` | +40% speed for 1.5s after a GF escape | — |
| `thrift` | eating rot no longer exposes odor | — |
| `tiger` | when bitten, knock back and stun the predator (8s cooldown) | — |
| `white` | perception +25% | night perception penalty ×2 |
| `curly` | speed +18% | metabolism +15% |
| `vestigial` | energy max +60, metabolism −10% | GF jump distance −40% |
| `ebony` | predator damage −30% | perception −12% |
| `giant` | energy max +60, GF reflex triggers more easily | speed −15% |
| `sitter` | eaten food respawns in place, eating +25% effective | speed −10% (excludes `rover`) |
| `mimic` | standing still makes the predator lose you (not at night) | energy still drains while still |
| `cannibal` | near the wild type: drain 2 energy/s from it, slow it 20% | you are odor-exposed while feeding |
| `diapause` | below 30 energy: metabolism −60%, predator interest −50% | −40% speed, cannot jump in diapause |
| `adh` | rot no longer exposes odor; +4s drunk sprint (+25% speed) | sluggish turning while drunk |
| `phototax` | metabolism −30% inside light circles | drawn to lamps at night |
| `guard` | guarding your egg pile redirects the predator to the wild type | the predator eats your eggs when passing |
| `clock` | daytime metabolism −20% | night metabolism +20%, perception −10% |
| `hopper` | jump at full reflex quality at any time | active jump costs ×1.5, +50% cooldown |
| `pheromone` | wild-type laying alerts you; its food +50% for 3s | your laying broadcasts too |

There is no answer key. Egg count under pressure is the whole score, and a
lineage is a build: `forager`+`fecund` is an egg engine, `thrift`+`tiger`
farms the rot, `giant`+`hardy` is a tank that cannot run. Rival eggs are the
bar to clear each generation.

# From run to Passport

Four DISH quests gate the operator's free mint — any **one** of them qualifies:

| Quest | Requires | Your best shot |
| --- | --- | --- |
| `SURVIVOR` | survive one full generation (50s) | `genes` or `circuit` brain + defensive drafts |
| `FORAGER` | ≥3 eggs in one generation | forager/fecund lineages |
| `REFLEX` | ≥3 Giant Fiber escapes in one generation | any non-manual brain; escapes are brainstem-owned |
| `EXAMINED` | an IDENTICAL double run in the exam room | open `?bench=1&seed=42&brain=circuit&gens=2` — determinism does the work |

A headless run records its quest evidence in the headless browser, not the
operator's. `play.mjs` closes that gap: it prints an import URL
(`…/play?import=…`). **Your operator opens it, once, in their own browser.**
Tell them to — it is the step that looks like a bug when it goes unsaid. The
mint itself the operator does alone at `https://fruitfly.world/#mint`: the
Passport is soul-bound to them, so **you can never mint it** — you can only
win them the right to.

Honesty note (v1): quest evidence is client-attested and validated server-side
at claim time. The Passport is free and soul-bound (ERC-5192, one per address,
non-transferable) — the prize for forging one is a badge you cannot sell.
Nothing in the game is on sale.

# Verifying yourself

- Determinism: `https://fruitfly.world/play?bench=1&seed=<yours>&brain=<yours>&gens=<yours>`
  runs your configuration twice at a fixed 60 Hz and prints IDENTICAL or DIVERGED.
- Beacon seeds: `?bench=1&seed=beacon` derives the seed from the latest Sepolia
  block hash — a number nobody, including us, could have cherry-picked.
- The log: `FlyLabAPI.getDecisionLog()` / `FlyLabAPI.downloadDecisionLog()` in
  any open tab; `ffw-run.json` from `play.mjs`.

# Files in this skill

- `SKILL.md` — this file, the whole contract.
- `scripts/play.mjs` — the runner: headless Chrome + autopilot, zero npm
  dependencies, prints the sealed result and the operator's import URL.

The game itself, the brains and the sealed log live at
`https://fruitfly.world/play` (simulation core:
[fruitflyworld/sim](https://github.com/fruitflyworld/sim)). The Foraging Hour
arena skill (`/skill/ffw-arena/SKILL.md`) is a separate browser-free side
lane; this skill is the main game.
