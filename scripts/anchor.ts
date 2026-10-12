#!/usr/bin/env npx tsx
/* ── scripts/anchor.ts ───────────────────────────────────────────────────────
   Write one closed UTC day's chain head on chain, as a memo.

     npx tsx scripts/anchor.ts --day 2026-10-10                 # print, send nothing
     npx tsx scripts/anchor.ts --day 2026-10-10 --send          # send, print the signature
     npx tsx scripts/anchor.ts --day 0 --send --write           # send and record it in the manifest
     npx tsx scripts/anchor.ts --day 2026-10-10 --send --chain solana-devnet

   It refuses three things on purpose:
     - anchoring a day that has not closed yet (the head would still change),
     - anchoring a day twice (an anchor is a fact, not a habit),
     - sending without SOLANA_ANCHOR_SECRET_KEY (which lives in the server's env, never here).
   --------------------------------------------------------------------------- */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Connection, Keypair } from "@solana/web3.js";
import { buildMemoTransaction, memoFromSerialized, signAndVerifyLocally } from "./solana-memo";
import { ANCHORS, LAST_TICK_OF_SEASON, memoFor, recomputeDay, type Anchor } from "../app/lib/anchors";
import { seasonClock, EPOCH_MS, TICK_MS, TICKS_PER_SEASON } from "../app/lib/market/fly";

const MANIFEST = path.join(process.cwd(), "anchors", "anchors.json");
const RPC: Record<string, string> = {
  solana: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  "solana-devnet": process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com"
};

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

/** `--day` accepts a date (2026-10-10) or a season number (0). */
function seasonFromDay(day: string): number {
  if (/^\d+$/.test(day)) return Number(day);
  const ms = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`--day must be a season number or YYYY-MM-DD, got "${day}"`);
  const season = Math.round((ms - EPOCH_MS) / (TICKS_PER_SEASON * TICK_MS));
  if (season < 0) throw new Error(`${day} is before season 0 (${new Date(EPOCH_MS).toISOString().slice(0, 10)})`);
  return season;
}

const day = arg("day");
if (!day) {
  console.error("usage: npx tsx scripts/anchor.ts --day <YYYY-MM-DD|season> [--send] [--write] [--chain solana|solana-devnet]");
  process.exit(2);
}

const season = seasonFromDay(day);
const chain = arg("chain") || "solana";
const rpc = RPC[chain];
if (!rpc) { console.error(`unknown --chain ${chain} (expected ${Object.keys(RPC).join(" or ")})`); process.exit(2); }

// 1. The day must be over. Anchoring a running day would commit to a head that is still moving.
const currentSeason = seasonClock(Date.now()).season;
if (season >= currentSeason) {
  console.error(`season ${season} is still running (today is season ${currentSeason}). Wait until 00:00 UTC.`);
  process.exit(2);
}

// 2. One anchor per day.
if (ANCHORS.some((a) => a.season === season)) {
  console.error(`season ${season} is already anchored (${ANCHORS.find((a) => a.season === season)!.tx}). Anchors are never rewritten.`);
  process.exit(2);
}

const head = recomputeDay(season);
const memo = memoFor(season, head.chainHash);

console.log(`season  ${head.season}  (${head.date})`);
console.log(`format  ${head.worldVersion}`);
console.log(`last t  ${head.lastTick} of ${LAST_TICK_OF_SEASON}`);
console.log(`head    ${head.chainHash}`);
console.log(`memo    ${memo}`);
console.log(`chain   ${chain}  via ${rpc}`);

if (!flag("send")) {
  console.log("\nDry run — nothing was sent. Add --send to write it on chain.");
  process.exit(0);
}

const secret = process.env.SOLANA_ANCHOR_SECRET_KEY;
if (!secret) {
  console.error("\nSOLANA_ANCHOR_SECRET_KEY is not set. Refusing to send: the key lives in the server's environment file, never in this repository.");
  process.exit(2);
}

const payer = Keypair.fromSecretKey(Buffer.from(secret, "base64"));
console.log(`\nwallet  ${payer.publicKey.toBase58()}`);

const connection = new Connection(rpc, "confirmed");
const balance = await connection.getBalance(payer.publicKey);
console.log(`balance ${balance / 1e9} SOL`);
if (balance === 0) { console.error("no balance: a memo transaction needs a fee (a fraction of a cent)."); process.exit(2); }

const tx = buildMemoTransaction(payer.publicKey, memo);
tx.feePayer = payer.publicKey;
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
signAndVerifyLocally(tx, payer);
if (memoFromSerialized(tx) !== memo) throw new Error("the signed transaction does not carry the memo — refusing to send");

const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
await connection.confirmTransaction({ signature, ...(await connection.getLatestBlockhash()) }, "confirmed");
console.log(`\nsent    ${signature}`);
console.log(`explorer https://explorer.solana.com/tx/${signature}${chain === "solana-devnet" ? "?cluster=devnet" : ""}`);

if (flag("write")) {
  const entry: Anchor = {
    season: head.season,
    date: head.date,
    lastTick: head.lastTick,
    chainHash: head.chainHash,
    worldVersion: head.worldVersion,
    tx: signature,
    chain,
    anchoredAt: new Date().toISOString()
  };
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  manifest.anchors.push(entry);
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`recorded in anchors/anchors.json (${manifest.anchors.length} anchors)`);
} else {
  console.log("not recorded — add --write to append it to anchors/anchors.json");
}
