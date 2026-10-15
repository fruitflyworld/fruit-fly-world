/* ── scripts/nand/tapeout.ts ─────────────────────────────────────────────────
   FFW-NAND/1 ↔ TapeOut.

     npx tsx scripts/nand/tapeout.ts bytes
       → the exact bytes to pass to the processor's tapeout(bytes nl, uint32 nIn,
         uint32 nOut), with nIn, nOut, gate count and a SHA-256 of the bytes.

     npx tsx scripts/nand/tapeout.ts verify --rpc <url> --processor <0x…> --id <n> [--msb-first]
       → read-only. Reads netlist(id) and compares it byte for byte with ours, then
         calls eval(id, word) for all 4096 input words and compares every output
         with the local evaluator. Prints IDENTICAL or the first differences.

   Nothing here sends a transaction. Taping out is done once, by a person, from the
   TapeOut client or a reviewed script (docs/nand-brain.md, "Taping out").

   Input packing for eval(): TapeOut packs input pin i into bit i. With 12 pins the
   word spans two bytes; we send bits 0-7 in the first byte and 8-11 in the second.
   That byte order is not yet confirmed for circuits wider than 8 pins (the public
   notes only show ≤8); --msb-first tries the other order. The first verify run
   settles it, and the answer belongs in docs/tapeout-notes.md.
   ------------------------------------------------------------------------- */
import { createHash } from "node:crypto";
import { createPublicClient, http, parseAbi, type Hex } from "viem";
import { OFFICIAL, evalWord, toTapeoutBytes } from "../../app/lib/nand/netlist";

const ABI = parseAbi([
  "function eval(uint256 id, bytes inputs) view returns (bytes)",
  "function netlist(uint256 id) view returns (bytes)",
]);
const hex = (b: Uint8Array) => ("0x" + Buffer.from(b).toString("hex")) as Hex;
const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };

export function packWord(word: number, nIn: number, msbFirst = false): Uint8Array {
  const n = Math.ceil(nIn / 8), out = new Uint8Array(n);
  for (let i = 0; i < nIn; i++) if ((word >>> i) & 1) out[msbFirst ? n - 1 - (i >> 3) : i >> 3] |= 1 << (i & 7);
  return out;
}

async function main() {
  const cmd = process.argv[2];
  const bytes = toTapeoutBytes(OFFICIAL);
  if (cmd === "bytes") {
    console.log(JSON.stringify({
      brain: OFFICIAL.version, nIn: OFFICIAL.nIn, nOut: OFFICIAL.nOut, nand: OFFICIAL.gates.length, latch: 0,
      bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), netlist: hex(bytes),
    }, null, 2));
    return;
  }
  if (cmd === "verify") {
    const rpc = arg("--rpc"), processor = arg("--processor") as Hex | undefined, id = BigInt(arg("--id") ?? "NaN");
    if (!rpc || !processor) throw new Error("usage: verify --rpc <url> --processor <0x…> --id <n>");
    const msb = process.argv.includes("--msb-first");
    const client = createPublicClient({ transport: http(rpc) });
    const onchain = await client.readContract({ address: processor, abi: ABI, functionName: "netlist", args: [id] });
    const same = onchain.toLowerCase() === hex(bytes).toLowerCase();
    console.log(`netlist(${id}): ${same ? "IDENTICAL to ours" : "DIFFERENT"} (${(onchain.length - 2) / 2} bytes)`);
    const bad: string[] = [];
    for (let w = 0; w < 1 << OFFICIAL.nIn; w += 64) {
      const batch = await Promise.all(Array.from({ length: 64 }, (_, k) => w + k).map(async (word) => {
        const r = await client.readContract({ address: processor, abi: ABI, functionName: "eval", args: [id, hex(packWord(word, OFFICIAL.nIn, msb))] });
        return [word, parseInt(r.slice(2, 4) || "0", 16) & 7] as const;
      }));
      for (const [word, got] of batch) { const want = evalWord(OFFICIAL, word); if (got !== want) bad.push(`word ${word}: chain ${got}, local ${want}`); }
    }
    console.log(bad.length === 0 && same ? "IDENTICAL: all 4096 words" : `DIFFERENT: ${bad.length} words\n${bad.slice(0, 10).join("\n")}`);
    process.exit(bad.length === 0 && same ? 0 : 1);
  }
  console.error("usage: tapeout.ts bytes | verify --rpc <url> --processor <0x…> --id <n> [--msb-first]");
  process.exit(2);
}
if (process.argv[1]?.endsWith("tapeout.ts")) main().catch((e) => { console.error(e.message); process.exit(1); });
