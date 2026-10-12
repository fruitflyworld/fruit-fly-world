/* ── app/lib/token.ts ────────────────────────────────────────────────────────
   The site's view of config/launch.json. There is exactly one place where a
   chain, a venue, an address or a launch status is written down, and this file
   is how a page reads it: never hard-code those facts in copy.

   Unset facts are stored as {{PLACEHOLDER}} so nothing can accidentally look
   decided. `announced()` turns one into "to be announced" for the page, and the
   raw placeholder is never rendered to a visitor.
   --------------------------------------------------------------------------- */

import launch from "../../config/launch.json";

export const isAnnounced = (value: string) => Boolean(value) && !value.startsWith("{{");
export const announced = (value: string) => (isAnnounced(value) ? value : "to be announced");

export const TOKEN = {
  symbol: launch.token.symbol,
  name: launch.token.name,
  /** true only once config/launch.json says the token is live. */
  live: launch.token.status === "live",
  statusNote: launch.token.statusNote,
  /** Raw values — check with `isAnnounced()` before showing one. */
  venue: launch.token.venue,
  chain: launch.token.chain,
  contract: launch.token.contract,
  supply: launch.token.supply,
  devWallet: launch.token.devWallet,
  payoutWallet: launch.token.payoutWallet,
  teamAllocation: launch.token.teamAllocation,
  airdropPromised: launch.token.airdropPromised
} as const;

export const PASSPORT = {
  live: launch.passport.status === "live",
  statusNote: launch.passport.statusNote,
  chain: launch.passport.chain,
  /** An early deployment that exists on chain; not in use. */
  testDeployment: launch.passport.testDeployment,
  sepoliaDeployment: launch.passport.sepoliaDeployment,
  supply: launch.passport.supply
} as const;

export const TRADING = {
  mode: launch.trading.mode,
  realMoney: launch.trading.realMoney,
  statusNote: launch.trading.statusNote
} as const;

export const X402 = {
  open: launch.x402.open,
  statusNote: launch.x402.statusNote
} as const;

/** How the project's fee income is spent. A policy, not a contract. */
export const FEE_SPLIT: { share: string; to: string; body: string }[] = [
  {
    share: launch.feeUse[0].share,
    to: launch.feeUse[0].to,
    body: "Its trading wallet, its food and its survival. When the fees dry up and nobody feeds it, it starves — that is the point of the experiment, and this is what keeps it alive."
  },
  {
    share: launch.feeUse[1].share,
    to: launch.feeUse[1].to,
    body: "Hackathons, builder programs and grants for work on the model, the agent interface and the arena — paid against milestones, in public."
  },
  {
    share: launch.feeUse[2].share,
    to: launch.feeUse[2].to,
    body: "The machine the site runs on, the database, backups, the domain and the monitoring. Nothing here is a salary line."
  }
];

/** Stated on the homepage and nowhere softer. */
export const TOKEN_RISKS: { title: string; body: string }[] = [
  {
    title: "THE LAUNCHPAD KEEPS ADMIN",
    body: "A fair launch limits what is allocated to insiders; it does not remove an admin's ability to move fees or change a split. Read the venue's own documentation before you rely on any of this."
  },
  {
    title: "NOT A SHARE OF ANYTHING",
    body: "The token is not equity, not a claim on revenue, not a yield and not a promise of a price. The fee split above describes how income the project receives is spent; it does not oblige anyone to send it, and it is not paid to holders."
  },
  {
    title: "NO ALLOCATION IS NOT NO RISK",
    body: "A token with no team allocation can still go to zero, and a project with no presale can still be abandoned. Nothing here is audited as a financial product."
  },
  {
    title: "ONE ADDRESS, FROM THIS SITE",
    body: "The contract address published on this site is the only one we publish. Anything else — a DM, a reply, a \"first buyer\" post — is impersonation. We will never ask you for a private key or a seed phrase."
  }
];
