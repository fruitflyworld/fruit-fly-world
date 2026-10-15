/* compare.ts — closed-loop comparison in the trading dish: the same fly, tapes and
   seasons, once with FFW-CX/0.1 (market/2) and once with FFW-NAND/1 (market/3).
   EVAL=table uses the distilled truth table directly; default uses the netlist. */
import { readFileSync } from "node:fs";
import { createRunner, MARKET_WORLD_VERSION_2, MARKET_WORLD_VERSION_3, type WorldVersion } from "../../app/lib/market/engine";
import { createPaperTape, mixSeed } from "../../app/lib/market/tape";
import { TICKS_PER_SEASON, FLAGSHIP } from "../../app/lib/market/fly";

const seeds = [FLAGSHIP.seed, 0x1234567, 0x0badf00d, 0x5eed5eed, 0x77777777, 0x31415926];
const seasons = Number(process.env.SEASONS ?? 4);
function run(version: WorldVersion) {
  const agg = { alive: 0, deaths: 0, extinct: 0, gens: 0, trades: 0, escapes: 0, endEq: 0, beh: [0, 0, 0, 0], runs: 0 };
  for (const base of seeds) for (let s = 10; s < 10 + seasons; s++) {
    const r = createRunner({ name: "x", seed: mixSeed(base, s), version }, { keepEvents: 10 });
    const tape = createPaperTape(mixSeed(base ^ 0x7a9e5eed, s), TICKS_PER_SEASON);
    let last: any = null;
    for (let t = 0; t < TICKS_PER_SEASON; t++) {
      last = r.step(tape.next());
      if (last.st === "alive") { agg.alive++; agg.beh[["approach", "avoid", "explore", "freeze"].indexOf(last.b)]++; }
      if (last.tr.some((x: any) => x.escape)) agg.escapes++;
    }
    agg.deaths += r.state.lineage.filter((e) => e.kind === "death").length;
    agg.extinct += r.state.status === "extinct" ? 1 : 0;
    agg.gens += r.state.gen; agg.trades += r.state.trades; agg.endEq += last.eq; agg.runs++;
  }
  const n = agg.runs, tot = agg.beh.reduce((a, b) => a + b, 0);
  return {
    "alive share": (agg.alive / (n * TICKS_PER_SEASON)).toFixed(3), "deaths/day": (agg.deaths / n).toFixed(2),
    "extinct days": agg.extinct, "generations/day": (agg.gens / n).toFixed(2), "trades/day": (agg.trades / n).toFixed(0),
    "escape ticks/day": (agg.escapes / n).toFixed(1), "end equity avg": (agg.endEq / n).toFixed(0),
    "behavior mix": agg.beh.map((b) => (b / tot).toFixed(2)).join(" / "),
  };
}
console.table({ "FFW-CX/0.1 (market/2)": run(MARKET_WORLD_VERSION_2), "FFW-NAND/1 (market/3)": run(MARKET_WORLD_VERSION_3) });
