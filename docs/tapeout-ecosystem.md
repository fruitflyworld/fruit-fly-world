# The TapeOut ecosystem — a working map

A reference for anyone (us, later) who needs to find a fact about TapeOut again without
re-deriving it. Written 2026-10-16 from public sources, and it says where every number came from.

**Reading the tables:** *Contract* means the number was read from a public contract or registry
(pulled through the public API at `tapeout.work`, which mirrors `tapeout.net`). *Community* means it
came from a public post and has not been checked against a contract by us. If it matters, re-check it
before acting on it.

---

## 1. What TapeOut is, in one paragraph

TapeOut is a BNB Chain protocol for putting *logic* on chain. You buy **transistors** — two kinds,
`NAND` and `LATCH` — lay them out as a circuit on a browser canvas, and *tape out*: the transistors
are burned, and the circuit becomes an immutable object with an id. A circuit is a pure
combinational (or clocked) function: a free, read-only `eval(id, inputs)` returns its outputs. Held
circuits can be pointed at one of the protocol's official **tasks** to mine `$BEM` (Proof of Design:
how well your circuit solves the task, how cheap it is, and whether anyone has done better). The
whole thing is deliberately small-scale: an on-chain circuit is thousands of gates, not millions.

The founder is **@Blonskr** (referred to publicly as a 16-year-old developer). CZ asked on
2026-09-15 for someone to build "immortal fruit flies" on BNB Chain, and Blonskr amplified it to the
TapeOut community the same day.

## 2. The protocol's shape

| Fact | Value | Source |
| --- | --- | --- |
| Chain | BNB Smart Chain, chain id 56 | Contract (`market-overview`) |
| Transistor kinds | `NAND`, `LATCH` | Contract |
| A processor | a contract made by a factory; a circuit is taped into one and gets an id | `tapemkt` README, X Layer-verified |
| `eval(uint256 id, bytes inputs) view returns (bytes)` | read-only, free, no wallet | `tapemkt`; TechFlow |
| `netlist(uint256 id) view returns (bytes)` | the bytes as taped out, byte for byte | `tapemkt` `NETLIST-FORMAT.md` |
| Netlist record | `NAND = 0x00 · u24 a · u24 b`; `LATCH = 0x01 · u24 d`; `REF = 0x02 …` — big-endian | same |
| Signal order | `0`=const 0, `1`=const 1, then inputs, then one signal per gate; a gate reads only lower signals; the last `nOut` signals are the outputs | same |
| Input packing | input pin *i* is bit *i* of `inputs`; outputs come back the same way (documented only for ≤ 8 pins) | same |
| A `REF` anywhere in the netlist | mining weight becomes **0** — the circuit cannot mine at all | Community |
| Max gates per circuit | about **25,000** (community figure; the exact contract cap is unconfirmed) | Community (BARD) |
| Per-run gas ceiling for a task | **12,000,000** | Contract (`bem/tasks`) |

## 3. Addresses and prices (BNB Chain)

Read 2026-10-16 through `https://tapeout.work/api/v1/processors`. The registry lists **1,266**
processors; these two are the ones that matter — only the official **TapeOut** and **Behemoth**
processors can mine `$BEM`.

| | Official TapeOut | Behemoth (巨兽) |
| --- | --- | --- |
| Processor | `0xb1024b89886b9a34aa4ff5f31c411d708b20a14c` | `0x725497a8982caf681615559dd1e52f613ac49d98` |
| Transistor token | `0xcc42ba5de07f01b472a5b14cf45abcca79eb8087` | `0xf5dd46881fb67de35c64b97d833324fa03d24f5f` |
| Supply cap | 1,000,000 | 100,000 (community) |
| Minted | **1,000,000 — sold out** | — |
| List price per transistor | **0.0005 BNB** | — |
| Circuits taped in | 17,574 | 192 |
| Mining coefficient *P* | 1 | 6 (community) |
| Creator / factory | `0x571d447f4f24688ec35ccf07f1d6993655f6af15` | — |

`sold out` matters: at 0.0005 BNB with the cap reached, there is no primary mint left. A purchase
today is a secondary-market buy, and the observed price will differ from the list price.

Other useful addresses:

| What | Address | Source |
| --- | --- | --- |
| Circuit market (second-hand circuit sale events) | `0x6feebbebc07bcb90bd1ac8b0cf9baa4f0ff2b46f` | Contract (`market-overview`) |
| Factory (created TapeOut, Genesis CPU, Blonskr_No1, RefBench) | `0x571d447f4f24688ec35ccf07f1d6993655f6af15` | Contract |

Market activity, cumulative since 2026-08-14: **5,648** circuit-market trades, **2,715.74 BNB**
volume (protocol's own count). A narrower independent scan saw 2,967 sales, ~2,192.98 BNB gross,
**36 unique buyers** against 2,492 sellers in its window — i.e. a lot of supply, very few buyers.

## 4. The task bank (what mining actually scores)

| Fact | Value | Source |
| --- | --- | --- |
| Tasks | **306** total | Contract (`bem/tasks`, from `pod-taskbank.json`) |
| On chain | 267 (~87%) | Contract |
| Combinational | 222 · Sequential 84 | Contract |
| Total reference gates | 15,381 NAND + 340 LATCH | Contract |
| Trivial tasks | 32 | Contract |
| Max run gas | 12,000,000 | Contract |

The 267 on-chain figure lines up with the community tutorial's "267 official tasks", which is a good
sign both sources describe the same thing.

The mining formula, as published by the community (not read from a contract by us):

```
b*  = NAND count + LATCH count            (both weigh 1)
A   = g + 6s                              (g = all cells, s = latches — a latch costs 6× in area)
d   = longest combinational path (depth)
C   = A × max(d, 1)^3                     (depth is cubed, so a deep design is expensive)
q   = clamp(C_ref / C, 0.25, 4)           (your cost against the task's frozen reference)
H   = (b* + K_task × q) × P               (full design premium only if you hold the best-known design)
```

Consequences worth remembering: **depth is punished cubically**, a **LATCH costs six NAND in area
and can deepen the path**, and the design premium (`K_task × q`) is only paid to the current
best-known implementation for a task — verified-but-not-best gets `b* × P` only. ~99% of emissions
go to the verified pool, ~1% to the unverified pool, so a circuit that fails verification is nearly
worthless.

Practical reading of that for a small brain: 50 NAND, 0 LATCH, depth 9 is a *cheap* design by these
rules — no latch area penalty, and a shallow path.

## 5. Cost datapoints

| Datapoint | Value | Source |
| --- | --- | --- |
| Official transistor list price (BNB) | 0.0005 BNB each, sold out | Contract |
| A 3,800-gate tape-out, net | ≈ 0.0023 OKB | Community (BARD team) |
| X Layer reference prices | 0.0013 OKB tape-out + 0.0001 OKB/NAND + 0.00066 OKB protocol fee per mint batch | `tapemkt` (X Layer) |
| Max gates per circuit | ≈ 25,000 | Community |

For FFW-NAND/1 (50 NAND, 0 LATCH) the transistor line is small: 50 × 0.0005 ≈ 0.025 BNB at list.
The BNB tape-out fee and protocol fee are **not confirmed** — see `docs/tapeout-notes.md`.

## 6. The fly projects already in the ecosystem

There are two, and both are worth knowing before we publish anything. What they actually *do* — and
the two gate-level netlists we decoded out of FlyOut's shipped JavaScript — is in
[`tapeout-field-notes.md`](tapeout-field-notes.md).

### LoomEscape — an escape reflex as a circuit

- **What:** a fruit-fly escape reflex compiled to gates and run gate by gate in the browser, as a
  voxel bench you can loom a block at. 16-bit inputs (size bin + speed bin per eye, LSB first).
- **Size:** **173 NAND · 6 LATCH.** Outputs: Giant Fiber `DNp01`, parallel descending neurons
  `DNp02/04/06/11`, and a motor core; the latches hold a wing-raise counter (0/4) and a refractory
  timer.
- **Why it matters to us:** it is the strongest existing artefact in the space — anatomically named,
  hash-checked on load, and about 3.5× our gate count. It **is** a reflex and it uses latches; it is
  not a whole fly that lives in a world. It is the number to beat on "small and readable", not on
  realism.
- **Author:** BruceBlue (`@BruceBlue`) · `https://brucelanlan.github.io/c3s-reflex-circuits/demo/`

### FlyOut — a fly brain-lab playground

- **What:** a dish with tunable brains where you switch circuits and watch behaviour. Three named
  brains (explorer / forager / survivor), plus what it labels a *real counted* netlist —
  **TAPEOUT #77 · 19N + 4L** — and a candidate 21-NAND six-way reflex brain.
- **Method:** 20 fixed-seed, 90-second environments; score = task performance − hardware cost
  penalty + stability bonus, with gate cost weighted **NAND + 2 × LATCH**.
- **Why it matters to us:** it is the closest thing to our Brain Lab idea, already running, and its
  scoring is close in spirit to TapeOut's own cost function. It does not have a deterministic,
  replayable world with per-tick sealing, and it does not run the fly in a market.
- **URL:** `https://flyout-brain-lab.martin1980888999.chatgpt.site`

### Us, in the same frame

| | LoomEscape | FlyOut | FFW-NAND/1 |
| --- | --- | --- | --- |
| Gates | 173 NAND + 6 LATCH | 19N + 4L (one of several) | **50 NAND, 0 LATCH** |
| Kind | one reflex | behaviour playground | full 4-signal decision layer |
| World | none (bench) | 20 seeded scenes | deterministic, sealed, replayable day |
| Verifiable | netlist hash on load | experiment transcript | per-tick records, re-checkable; on-chain `eval()` once taped out |

The honest differentiator is not "we have a fly". It is: **a whole fly that lives in a deterministic
world where every single decision was already computed by a gate-level circuit, and every tick can
be re-checked** — and the circuit is small enough for a person to read.

## 7. The rest of the ecosystem, by job

From the 43-entry community index (@sciencedegens, 2026-09-13) and the two official data sites.

- **Do things / see data:** `tapeout.net` (official: canvas, market, PoD), `tapeoutexplorer.com`
  (TapeOutScan: circuits, miners, rankings, and a **Games** page — a listing target for us),
  `tapeout.work` (public research API, the source of the contract numbers above),
  `dune.com/ekonomeest/tapeout-mining-intelligence`.
- **Markets / terminals:** `tapeout.firsto.ai` (Firsto — now also inside Binance Wallet's DApp
  section), `tapeout.market`, `siliconx.top`, `tapeout.club`, `bemotc.com`,
  `tapeout.vibedegens.com` (GatePilot).
- **Authoring tools:** `tapeout.build` (drag-and-drop, BLIF export, score estimate), TapeOut's own
  canvas, `tapeout.pro/verifier` (diff a circuit against a reference).
- **Games and demos:** Gomoku/弈芯, Black Myth: TapeOut, Perpetua (Game of Life), BEM Clock,
  21 NAND Driver, Microduck, and the two fly projects above.
- **The launch layer:** **TapeFour** (TapeOut × Four.meme, live 2026-10-15) — a mining-based token
  launch: the project sells transistors, graduates, and 5% of supply plus the raise goes to a
  permanently locked PancakeSwap LP while the other 95% is mined; the team keeps nothing.
- **Navigation:** `tapeout.link`, `tapeoutdaily.ai`, `bem.community`.

## 8. What this means for us

1. **The gap is the world, not the circuit.** Both existing fly projects are circuit demos. Neither
   has a fly that lives, dies, is replayed tick by tick, and can be re-checked from its own record.
   That is the thing already built here.
2. **50 gates is a feature, not a shortfall.** Depth is cubed in the cost function and LATCH is
   punished, so a 50-NAND, 0-LATCH, depth-9 brain is cheap by the ecosystem's own scoring — and it
   is small enough that a person can read it on a canvas.
3. **Verification is the currency.** The community rewards anything that can be checked. Our
   per-tick sealed records plus an on-chain `eval()` check is the natural story for this audience,
   and it is exactly what Phase 1 ("tape out and verify") delivers.
4. **Be exact about size.** Our size comparison must stay honest: FFW-NAND/1 is *not* a copy of the
   24-neuron brain; it is a different, much smaller brain inspired by it and tuned against it. See
   `docs/nand-brain.md`.
5. **Openings:** register on TapeOutScan's Games page; invite the LoomEscape and FlyOut authors into
   the Brain Lab competition as the first players rather than treating them as rivals.

## 9. Still open (check these before committing money or copy)

- The BNB tape-out fee and protocol fee, and the factory's exact `mint`/`tapeout` argument shape.
- The input byte order for circuits wider than 8 pins (our `verify` settles it with `--msb-first`).
- The exact per-circuit gate cap (≈25,000 is a community figure).
- Whether LATCH state persists per block or per call in a `view` — irrelevant to us, since we use no
  LATCH, but it is unresolved in the public notes.
- Which processor to tape into: the official one (sold out, mining coefficient 1) or Behemoth
  (coefficient 6). That choice changes the economics, not the circuit.

## 10. Sources

Contract/registry data pulled 2026-10-16: `tapeout.work/api/v1/processors`,
`/api/v1/bem/tasks`, `/api/v1/market-overview`, `/api/v1/catalog`; `tapeout.net/processors.json`,
`tapeout.net/pod/pod-taskbank.json`. Interface details: `github.com/xm1319/tapemkt`
(README, `NETLIST-FORMAT.md`, `xl-tapeout-rest.js`), TechFlow's TapeOut explainer, Odaily's
ecosystem overview. Community posts: `@Blonskr`, `@fourdotmemezh`, `@something_labs` (2026-08-26
tutorial), `@sciencedegens` (2026-09-13 index), `@FirstoAI` (2026-10-15). Competitor artefacts:
LoomEscape (`brucelanlan.github.io/c3s-reflex-circuits/demo/`), FlyOut
(`flyout-brain-lab.martin1980888999.chatgpt.site`), BARD / 21 NAND
(`jogjohgoeg.github.io/nand-driver/`). CZ's request: X, 2026-09-15.
