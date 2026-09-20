# The Game (`/play`) — Rules and Numbers

Fruit Fly World's playable core is a **lineage roguelite**: you are not one fly, you are a
bloodline trying to out-reproduce a wild-type rival across generations, under a predator
that hunts by vision. No install, no account, no wallet — open
[`/play`](https://fruitfly.world/play) and you are in. The lineage is saved in your own
browser (`localStorage`, key `flyline_v1`); nothing about the game depends on a chain.

Source of truth: [`public/play/js/sim.js`](../public/play/js/sim.js) (pure logic) and
[`scene-game.js`](../public/play/js/scene-game.js) (game loop). The escape circuit itself is
specified in [neural-model.md](neural-model.md).

---

## 1. The loop

```text
forage → energy → eggs (automatic) → generation ends (≤ 50 s)
   → compare eggs with the wild type → draft 1 of 3 mutations
   → next generation inherits it → the wild type evolves too
```

| Constant | Value | Meaning |
| --- | --- | --- |
| Generation | 50 s | hard cap; ends early on death |
| Day/night cycle | 25 s | affects senses and predator speed |
| Starting energy | 100 | metabolism drains ~2.6/s |
| Egg laying | energy ≥ 68 | costs 44, cooldown 1.4 s |
| Predator catch radius | 0.075 | contact = 55 damage/s |

A generation ends three ways: energy hits zero, the predator kills you, or you survive the
full 50 seconds. **Death ends a generation, not the lineage.**

## 2. Food: three risk levels

| Food | Energy | Where | Risk |
| --- | --- | --- | --- |
| Sugar | +12 | anywhere in the dish | none |
| Yeast | +26 | near the rim | predator territory |
| Rot | +38 | anywhere | **odor-exposed for 6 s** — the predator prioritizes you |

The richest food is the most dangerous. Eating strategy is a positioning decision, not a
menu: what matters is *where* the food leaves you when the strike comes.

## 3. The predator

A state machine with three phases:

```text
approach (steers to nearest/smelliest fly)
   → lunge (ballistic, committed trajectory, ~0.45 s, triggers slow-motion)
   → recover (0.5 s) → approach
```

The lunge is **committed**: once it fires, the trajectory does not track you. This is what
makes the GF reflex readable — watch the approach, wait for READY, jump clear of a line you
can predict. The predator gets faster every generation and at night; smelly flies (rot
eaters, post-laying) get hunted first.

## 4. The escape moment

- The HUD shows LC4 and LPLC2 activations, the GF membrane potential, and a
  `READY` state (see [neural-model.md](neural-model.md) for the circuit).
- When READY lights up: **Space** (desktop) or the **GF ESCAPE** button (touch).
- A reflex escape costs 60 % of a manual dash, grants ~0.18 s of invulnerability, and
  fires *away* from the predator automatically — the circuit aims, you time it.
- Jumping before READY is possible (`hopper` trait) but costs more and recoils shorter.

The tensest seconds of the game are the ones where you *choose* not to jump yet.

## 5. Mutations — the draft

At the end of every generation you draft **one of three** mutation cards. Five traits stack
(the rest are once-per-lineage); rarity is weighted 60 / 30 / 10 (common / rare / epic).

| Trait | Gain | Cost |
| --- | --- | --- |
| `white` | senses +25 % | night sense penalty ×2 |
| `curly` | speed +18 % | metabolism +15 % |
| `vestigial` | +60 max energy, metabolism −10 % | GF jump distance −40 % |
| `ebony` | predator damage −30 % | senses −12 % |
| `fecund` * | egg cost −22 % | post-laying odor 2 s |
| `swift` * | dash cooldown −30 % | dash cost +40 % |
| `hardy` * | metabolism −16 % | speed −8 % |
| `nocturnal` | no night sense penalty | — |
| `shaker` | +40 % speed for 1.5 s after a GF escape | — |
| `forager` * | food energy +35 % | slowed 1 s after eating |
| `thrift` | rot no longer exposes odor | — |
| `tiger` | bitten → knockback + stun the predator (8 s cd) | — |
| `giant` | +60 max energy, GF threshold −0.08 | speed −15 % |
| `sitter` | eaten food refreshes in place, eating +25 % | speed −10 % |
| `rover` * | speed +10 %, food sense +20 % | metabolism +12 % |
| `diapause` | below 30 energy: metabolism −60 %, predator interest −50 % | −40 % speed, cannot jump |
| `adh` | rot odor-free + 4 s drunk sprint | sluggish turning while drunk |
| `phototax` | −30 % metabolism in light | drawn to lights at night |
| `clock` | day metabolism −20 % | night metabolism +20 %, senses −10 % |
| `guard` | near your eggs the predator targets the wild type | predator eats your eggs |
| `mimic` | motionless at low speed = predator loses you | energy still drains |
| `hopper` | active full-quality jump any time | cost ×1.5, cooldown +50 % |
| `cannibal` | drain 2 energy/s from the wild type in contact | you get odor-exposed too |
| `pheromone` | sense the rival's egg-laying, +50 % food there for 3 s | your laying is broadcast too |

\* stackable.

Several traits have designed synergies (`tiger` + `nocturnal` night scavenging, `swift` +
`shaker` chain-escape, `fecund` + `forager` egg engine). Builds are real; so are trade-offs.

## 6. The arms race

The wild type is not static. Every generation it drafts **one** mutation, deterministically
from the same seed — so a lineage that ignores it faces an increasingly specialized rival.
The end-of-generation screen compares your eggs against its eggs; the long game is
`lineage eggs` and `best`, both kept in your local save.

## 7. Reproducibility

- **Seed** — the whole world (food layout, rival draft, predator spawn) derives from one
  seed, editable in the menu (default `1337`). Same seed, same world.
- **Connectivity toggle** — switch the escape circuit between `real` and `shuffled`
  wiring and feel the difference in READY timing (the published experiment says it is
  ~0.02 s of lead time; the game lets you try to notice it).
- **Agent drive** — `window.FlyLabAPI` exposes `getState()`, `setControl({x,y})`,
  `dash()` and `setMode("manual"|"auto"|"agent")`, so an autonomous process can play the
  same loop with the same rules.

## 8. Controls

| Input | Action |
| --- | --- |
| `W A S D` / arrows | steer |
| mouse / touch-drag | steer toward pointer |
| `Space` / GF button | escape jump (when READY) |
| `P` / ⏸ | pause & menu |

## 9. What the game is not

- It is not a chain game: no wallet, no mint, no transaction ever appears in `/play`.
- It is not a claim about fly biology. The traits reference real mutations and behaviors
  (white, Adh, rover/sitter, diapause…), tuned for play, not for literature accuracy.
- Local saves are local. They are not credentials, not missions, and never count toward
  any server-side qualification — see [economics.md](economics.md) for what does.
