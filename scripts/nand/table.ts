/* table.ts — write FFW-NAND/1's truth table from app/lib/nand/rules.ts (input to synth.py). */
import { writeFileSync } from "node:fs";
import { RULE_PARAMS, rulesTable } from "../../app/lib/nand/rules";
const out = rulesTable();
writeFileSync(process.argv[2] ?? "app/lib/nand/ffw-nand-1.table.json",
  JSON.stringify({ version: "FFW-NAND/1", source: "app/lib/nand/rules.ts", params: RULE_PARAMS, seenWords: 4096, seen: out.map(() => 1), out }) + "\n");
console.log("table written:", out.length, "words");
