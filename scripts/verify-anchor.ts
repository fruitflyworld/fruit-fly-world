#!/usr/bin/env npx tsx
/* ── scripts/verify-anchor.ts ────────────────────────────────────────────────
   Check the anchors. Two levels, and the second one is the point:

     npx tsx scripts/verify-anchor.ts                    # manifest vs this code
     npx tsx scripts/verify-anchor.ts --day 2026-10-10   # one day
     npx tsx scripts/verify-anchor.ts --all --chain      # also read the memo back from the chain

   Exit code 0 means every checked day produced IDENTICAL. Anything else exits
   non-zero: a divergence is a bug report, never a number to quietly fix.
   --------------------------------------------------------------------------- */

import { Connection } from "@solana/web3.js";
import { readMemo } from "./solana-memo";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ANCHORS, checkManifest, parseMemo, recomputeDay, type Anchor } from "../app/lib/anchors";

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (name: string) => process.argv.includes(`--${name}`);
const RPC: Record<string, string> = {
  solana: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  "solana-devnet": process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com"
};

async function main() {
  const day = arg("day");
  const manifestPath = arg("manifest");
  const statusPath = arg("status") || path.join(process.cwd(), "anchors", "status.json");
  /** The runtime manifest when the server passes one, else the committed snapshot. */
  const pool: Anchor[] = manifestPath
    ? (() => { try { return (JSON.parse(readFileSync(manifestPath, "utf8")).anchors ?? []) as Anchor[]; } catch { return []; } })()
    : ANCHORS;

  const selected = day
    ? pool.filter((a) => a.date === day || String(a.season) === day)
    : pool;

  if (!selected.length) {
    console.log(day ? `no anchor recorded for ${day}.` : "no anchors recorded yet — nothing to verify.");
    console.log("(seasons 0 and 1 have closed; see anchors/README.md to write the first one.)");
    process.exit(0);
  }

  let failures = 0;
  for (const check of checkManifest(selected)) {
    const label = `season ${check.season} · ${check.date}`;
    if (!check.ok) {
      failures++;
      console.log(`DIVERGED  ${label}`);
      console.log(`  manifest   ${check.chainHash}`);
      console.log(`  recomputed ${check.recomputed}`);
      console.log(`  problem    ${check.problem}`);
      continue;
    }
    console.log(`IDENTICAL ${label}  ${check.chainHash}`);

    if (flag("chain")) {
      const rpc = RPC[check.chain] || RPC.solana;
      const connection = new Connection(rpc, "confirmed");
      try {
        const tx = await connection.getParsedTransaction(check.tx, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
        const parsed = parseMemo(readMemo(tx));
        if (!parsed) {
          failures++;
          console.log(`  on-chain   DIVERGED — no usable memo in ${check.tx} (${rpc})`);
        } else if (parsed.chainHash !== check.chainHash || parsed.season !== check.season) {
          failures++;
          console.log(`  on-chain   DIVERGED — memo says ${parsed.chainHash}, manifest says ${check.chainHash}`);
        } else {
          console.log(`  on-chain   IDENTICAL — memo matches (${check.tx.slice(0, 16)}…)`);
        }
      } catch (err) {
        failures++;
        console.log(`  on-chain   UNREADABLE — ${(err as Error).message}`);
      }
    }
  }

  console.log(`\n${failures === 0 ? "all checked days replay identically" : `${failures} check(s) failed`}`);

  // The page at /anchors must not recompute a year of seasons at build time, so it
  // reads this file instead — and tests/anchors.test.ts recomputes everything in CI,
  // which is what keeps this file from being able to lie.
  if (flag("write")) {
    const status = {
      _comment: "Written by `npm run verify:anchors -- --write`. The page at /anchors renders this; CI (tests/anchors.test.ts) recomputes every anchor and fails if this file is stale or wrong.",
      verifiedAt: new Date().toISOString(),
      entries: checkManifest(pool).map((c) => ({ season: c.season, date: c.date, ok: c.ok, recomputed: c.recomputed, problem: c.problem ?? null }))
    };
    writeFileSync(statusPath, JSON.stringify(status, null, 2) + "\n");
    console.log(`recorded ${statusPath}`);
  }

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
