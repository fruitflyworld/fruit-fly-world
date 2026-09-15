#!/usr/bin/env node
/* ── play.mjs — the Foraging Hour loop ──────────────────────────────────────
   Pull the brief, search for the best route, sign it with the agent wallet, and
   enter. Then wait for the window to close and do it again.

     FFW_AGENT_KEY=0x… node scripts/play.mjs
     FFW_AGENT_KEY=0x… FFW_DRY_RUN=1 node scripts/play.mjs   # search only, enter nothing
     FFW_BASE_URL=http://127.0.0.1:3311 FFW_STEPS=4 …        # against a local server

   Signing needs viem:  npm i viem
   ------------------------------------------------------------------------- */
import { randomBytes } from "node:crypto";
import { bestRoute, arenaMessage, ARENA_STEPS } from "../lib/arena.mjs";

const BASE = (process.env.FFW_BASE_URL || "https://fruitfly.world").replace(/\/$/, "");
const KEY = process.env.FFW_AGENT_KEY || "";
const STEPS = Math.max(1, Math.min(ARENA_STEPS, Number(process.env.FFW_STEPS || ARENA_STEPS)));
const DRY = process.env.FFW_DRY_RUN === "1";
const RETRY_MS = Number(process.env.FFW_RETRY_MS || 15_000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stamp = () => new Date().toISOString().slice(11, 19);
const log = (...parts) => console.log(`[${stamp()}]`, ...parts);

async function viem() {
  for (const specifier of ["viem", "viem/accounts"]) {
    try { return await import(specifier); } catch { /* try the next one */ }
  }
  throw new Error("This script needs viem to sign. Run `npm i viem` next to it, or set FFW_DRY_RUN=1.");
}

async function json(path, init) {
  const response = await fetch(`${BASE}${path}`, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} ${response.status}: ${body.error || "request failed"}`);
  return body;
}

async function enter(account, brief) {
  const plan = bestRoute(brief.epoch, { steps: STEPS });
  const rows = plan.score.steps
    .map((step, index) => `  ${index + 1}. ${step.cell} seed=${step.seed} ${step.behavior.padEnd(8)} conf=${step.confidence} gain=${step.gain.toFixed(2)} +${step.bonus}`)
    .join("\n");
  log(`epoch ${brief.epoch} · ${brief.window.secondsLeft}s left · planned exact ${plan.score.exact} (score ${plan.score.score}, energy ${plan.score.energy})`);
  console.log(`  route: ${plan.route.join(" > ")}\n${rows}`);

  if (DRY) return null;

  const nonce = `0x${randomBytes(16).toString("hex")}`;
  const message = arenaMessage({
    epoch: brief.epoch,
    campaign: brief.campaign,
    chainId: brief.chainId,
    agentAddress: account.address,
    route: plan.route,
    signals: plan.signals,
    nonce
  });
  const signature = await account.signMessage({ message });
  const result = await json(brief.submitUrl || "/api/arena/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      agentAddress: account.address, epoch: brief.epoch, nonce,
      route: plan.route, signals: plan.signals, signature
    })
  });
  log(`entered as ${account.address}: exact ${result.exact}` + (result.leading ? " (currently leading)" : "") +
    ` · standing ${result.standing.entries} entr${result.standing.entries === 1 ? "y" : "ies"} · decided at ${new Date(result.decidedAt * 1000).toISOString()}`);
  return result;
}

async function main() {
  if (!KEY && !DRY) throw new Error("Set FFW_AGENT_KEY to the agent wallet's private key.");
  const account = KEY ? (await viem()).privateKeyToAccount(KEY) : null;
  if (account) log(`agent wallet ${account.address} · ${BASE} · up to ${STEPS} stations${DRY ? " · dry run" : ""}`);

  for (;;) {
    try {
      const brief = await json("/api/arena/brief");
      if (!brief.enabled) throw new Error("The arena is closed (ARENA_ENABLED is not 1).");
      const result = await enter(account, brief);
      if (DRY) {
        log("dry run: nothing was submitted. Unset FFW_DRY_RUN to enter.");
        return;
      }
      // The slot is decided at the close, so there is nothing to do until then.
      const waitMs = Math.max(5_000, (result.decidedAt - Math.floor(Date.now() / 1000) + 2) * 1000);
      log(`waiting ${Math.round(waitMs / 1000)}s for the window to close…`);
      await sleep(waitMs);
      const after = await json("/api/arena");
      const winner = after.lastWinner;
      log(winner && winner.epoch === brief.epoch
        ? `epoch ${winner.epoch} closed: ${winner.agentAddress} won with ${winner.exact}`
        : `epoch ${brief.epoch} closed with no winner`);
      if (winner && account && winner.agentAddress.toLowerCase() === account.address.toLowerCase()) {
        log("YOU WON. The free Passport is unlocked on the operator's wallet — sign in and mint: POST /api/mint/voucher");
      }
    } catch (error) {
      log(`error: ${error instanceof Error ? error.message : error}`);
      log(`retrying in ${Math.round(RETRY_MS / 1000)}s`);
      await sleep(RETRY_MS);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
