# TapeOut notes

What we know about TapeOut's on-chain interface, where each fact comes from, and what is still
open. Written 2026-10-15. Nothing here has been checked against BNB Chain by this repository yet.

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

## Open (settle before taping out)

- **BNB Chain addresses**: the factory, the processor to tape into (an existing public one, or our
  own via `createCPU`), and its transistor contract.
- **Prices on BNB Chain**: transistor mint price, tape-out fee, protocol fee. FFW-NAND/1 needs 50
  NAND, so the total should be small; record the real number.
- **`mint(uint256, uint256)` arguments**: the X Layer script passes `(0, count)`; confirm what the
  first argument selects (likely the transistor kind, NAND = 0).
- **Input byte order for more than 8 pins**: we send bits 0–7 in the first byte. The first
  `npm run nand:verify` run settles it (`--msb-first` for the other order).
- **How LATCH behaves in a `view` call** (state per block versus per call). FFW-NAND/1 avoids the
  question by using no LATCH.
