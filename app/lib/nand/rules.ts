/* ── app/lib/nand/rules.ts ───────────────────────────────────────────────────
   FFW-NAND/1, the official fly brain, as seven reflex rules. This file is the
   source of truth: scripts/nand/table.ts turns it into a 4096-row truth table,
   scripts/nand/synth.py compiles that table into NAND gates, and the test suite
   checks the compiled netlist against these rules on every possible input.

   Read top to bottom; the first rule that matches decides. Levels are 0..3
   (encode.ts): f food, t threat, l light, n novelty, h hunger; p = previous behavior.

     1. ESCAPE   t >= 2                          → avoid, Giant Fiber fires
     2. DANGER   t >= 1 and (p = avoid or h < 2) → avoid
     3. FEED     h >= 3 and f >= 1               → approach
     4. LURE     f >= 3                          → approach
     5. PURSUE   p = approach and f >= 2         → approach   (keep going to the food)
     6. CURIOUS  n >= 2                          → explore
     7. REST     p = freeze and h < 3            → freeze     (a fed fly stays put)
        otherwise explore in the light (l >= 1), freeze in the dark

   Where the rules come from: rule 1 is the brainstem the game already models
   (looming → LC4/LPLC2 → Giant Fiber → jump); the thresholds were tuned in closed
   loop so the fly's day in the trading dish matches FFW-CX/0.1's on survival,
   equity, escapes and behavior mix (scripts/nand/compare.ts, docs/nand-brain.md).
   ------------------------------------------------------------------------- */

export const RULE_PARAMS = { T_GF: 2, H_BRAVE: 2, H_FEED: 3, F_LURE: 3, PURSUE_F: 2, N_EXPLORE: 2, H_REST: 3 } as const;
const AP = 0, AV = 1, EX = 2, FR = 3;

export const RULES = [
  { id: "escape", text: "threat >= 2 → avoid, and the Giant Fiber fires" },
  { id: "danger", text: "threat >= 1 and (previous was avoid or hunger < 2) → avoid" },
  { id: "feed", text: "hunger >= 3 and food >= 1 → approach" },
  { id: "lure", text: "food >= 3 → approach" },
  { id: "pursue", text: "previous was approach and food >= 2 → approach" },
  { id: "curious", text: "novelty >= 2 → explore" },
  { id: "rest", text: "previous was freeze and hunger < 3 → freeze" },
  { id: "default", text: "otherwise explore in the light, freeze in the dark" },
] as const;

/** Which rule decides, and the 3-bit output word (behavior | gf << 2), for one input word. */
export function decideWord(word: number): { rule: (typeof RULES)[number]["id"]; out: number } {
  const P = RULE_PARAMS;
  const f = word & 3, t = (word >> 2) & 3, l = (word >> 4) & 3, n = (word >> 6) & 3, h = (word >> 8) & 3, p = (word >> 10) & 3;
  if (t >= P.T_GF) return { rule: "escape", out: AV | 4 };
  if (t >= 1 && (p === AV || h < P.H_BRAVE)) return { rule: "danger", out: AV };
  if (h >= P.H_FEED && f >= 1) return { rule: "feed", out: AP };
  if (f >= P.F_LURE) return { rule: "lure", out: AP };
  if (p === AP && f >= P.PURSUE_F) return { rule: "pursue", out: AP };
  if (n >= P.N_EXPLORE) return { rule: "curious", out: EX };
  if (p === FR && h < P.H_REST) return { rule: "rest", out: FR };
  return { rule: "default", out: l >= 1 ? EX : FR };
}

export function rulesTable(): number[] {
  return Array.from({ length: 4096 }, (_, w) => decideWord(w).out);
}
