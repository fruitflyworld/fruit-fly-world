# TapeOut notes

What we know about TapeOut's on-chain interface, where each fact comes from, and what is still
open. Written 2026-10-15; BNB Chain addresses and prices added 2026-10-16. Nothing here has been
checked against BNB Chain by this repository directly — the addresses and prices in the last table
were read from TapeOut's public registry, not from a node. The wider picture — the protocol's
shapes, its task bank, its cost formula and the two fly projects already in it — is in
[`tapeout-ecosystem.md`](tapeout-ecosystem.md).

## Known

| Fact | Source |
| --- | --- |
| A processor is a contract made by a factory (`createCPU`); circuits are taped out into a processor and get an id | [xm1319/tapemkt](https://github.com/xm1319/tapemkt) README (X Layer, verified on mainnet there) |
| `tapeout(bytes nl, uint32 nIn, uint32 nOut) payable returns (uint256)` | tapemkt `xl-tapeout-rest.js` |
| `eval(uint256 id, bytes inputs) view returns (bytes)` — read-only, free | tapemkt; TechFlow, 2026-08-17 |
| `netlist(uint256 id) view returns (bytes)` returns the bytes as taped out | tapemkt `NETLIST-FORMAT.md` |
| `TAPEOUT_FEE()`, `transistors()`; the transistor contract has `mint(uint256, uint256) payable`, `mintPrice()`, `protocolFee()` | tapemkt `xl-tapeout-rest.js` |
| Netlist: NAND `0x00 \| u24 a \| u24 b`, LATCH `0x01 \| u24 d`, REF `0x02 \| addr20 \| u64 id \| u8 nIn \| u8 nOut \| inputs`; big-endian | tapemkt `NETLIST-FORMAT.md` |
| Signals: 0 = constant 0, 1 = constant 1, then inputs, then one signal per gate; a gate may only read lower signals (`NAND: future signal`); the last `nOut` signals are the outputs | same |
| The contract adds two buffer NANDs per output internally; `netlist(id)` returns your bytes unchanged | same |
| `eval` packs input pin *i* into bit *i*; outputs come back the same way | same (examples with ≤ 8 inputs only) |
| X Layer prices: tape-out 0.0013 OKB, 0.0001 OKB per NAND, 0.00066 OKB protocol fee per mint batch | same |
| Taping out burns the transistors used; the circuit is minted as an NFT | TechFlow; Odaily, 2026-09-20 |
| The core factory renounced its permissions on BNB Chain; circuits cannot call other contracts or write state | TechFlow |

`app/lib/nand/netlist.ts` implements exactly these rules, and `tests/nand-brain.test.ts` checks it
against the MAJ3 example that was evaluated on chain.

## BNB Chain addresses and prices (from the public registry, 2026-10-16)

Read through `tapeout.work/api/v1/processors` (which mirrors `tapeout.net/processors.json`). Not yet
confirmed against a node by us.

| Fact | Value |
| --- | --- |
| Official processor | `0xb1024b89886b9a34aa4ff5f31c411d708b20a14c` |
| Its transistor token | `0xcc42ba5de07f01b472a5b14cf45abcca79eb8087` |
| Transistor list price | 0.0005 BNB each; supply 1,000,000, **all minted** (a buy today is secondary market) |
| Factory / creator | `0x571d447f4f24688ec35ccf07f1d6993655f6af15` |
| Behemoth processor (mining coefficient 6) | `0x725497a8982caf681615559dd1e52f613ac49d98` |
| Circuit market | `0x6feebbebc07bcb90bd1ac8b0cf9baa4f0ff2b46f` |

For FFW-NAND/1 that puts the transistor line at 50 × 0.0005 ≈ 0.025 BNB at list price. It says
nothing about the tape-out fee or the protocol fee, which are still open.

## Open (settle before taping out)

- **Tape-out fee and protocol fee on BNB Chain.** Not in the registry. Record the real number from
  the transaction that tapes out the official brain.
- **Which processor to tape into**: the official one (coefficient 1, transistors sold out) or
  Behemoth (coefficient 6, higher price). This is an economics choice, not a change to the circuit.
- **`mint(uint256, uint256)` arguments**: the X Layer script passes `(0, count)`; confirm what the
  first argument selects (likely the transistor kind, NAND = 0).
- **The per-circuit gate cap** (community says ≈ 25,000) and whether a circuit this small can be
  pointed at a task, given that a `REF` record zeroes a circuit's mining weight.
- **Input byte order for more than 8 pins**: we send bits 0–7 in the first byte. The first
  `npm run nand:verify` run settles it (`--msb-first` for the other order).
- **How LATCH behaves in a `view` call** (state per block versus per call). FFW-NAND/1 avoids the
  question by using no LATCH.
