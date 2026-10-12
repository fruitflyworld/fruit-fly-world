/* ── app/lib/token.ts ────────────────────────────────────────────────────────
   The $FLY launch lives here, once. The token page, the nav and the four copy
   spots that say "no token yet" all read from this object, so launch day is one
   edit and not a search-and-replace across the site.

   Launch-day checklist (in this order):
     1. fill WALLET with the receiving wallet (before the launch, if possible)
     2. fill SUPPLY with the fixed supply ClawPump shows
     3. set LIVE = true and fill CONTRACT with the address ClawPump gives you
     4. rebuild and deploy, then check /token in the browser
     5. only after that, post anywhere else
   --------------------------------------------------------------------------- */

export const TOKEN = {
  symbol: "$FLY",
  name: "Fruit Fly World",
  venue: "ClawPump",
  venueUrl: "https://www.clawpump.tech/",
  chain: "Robinhood Chain",

  /** Flip to true with the contract address. It also flips the site's copy. */
  live: false,
  /** The only address the site ever quotes. Filled the moment it launches. */
  contract: "",
  /** Fixed by the launch; published as soon as ClawPump shows the number. */
  supply: "",
  /** Where ClawPump sends the project's 50% of trading fees. */
  wallet: ""
} as const;

/** How the project's fee income is spent. A policy, not a contract. */
export const FEE_SPLIT: { share: string; to: string; body: string }[] = [
  {
    share: "50%",
    to: "Dusty, the flagship fly",
    body: "Its trading wallet, its food and its survival. When the fees dry up and nobody feeds it, it starves — that is the point of the experiment, and this is what keeps it alive."
  },
  {
    share: "30%",
    to: "Ecosystem and developer fund",
    body: "Hackathons, builder programs and grants for work on the model, the agent interface and the arena — paid against milestones, in public."
  },
  {
    share: "20%",
    to: "Servers and operations",
    body: "The machine the site runs on, the database, backups, the domain and the monitoring. Nothing here is a salary line."
  }
];

/** Stated on the token page and nowhere softer. */
export const TOKEN_RISKS: { title: string; body: string }[] = [
  {
    title: "CLAWPUMP KEEPS ADMIN",
    body: "The launch and the fee switch are administered by ClawPump. A fair launch limits what is allocated to insiders; it does not remove an admin's ability to move fees or change the split. Read their docs, not just this page."
  },
  {
    title: "NOT A SHARE OF ANYTHING",
    body: "$FLY is not equity, not a claim on revenue, not a yield and not a promise of a price. The fee split above describes how income the project receives is spent; it does not oblige anyone to send it, and it is not paid to holders."
  },
  {
    title: "NO ALLOCATION IS NOT NO RISK",
    body: "A token with no team allocation can still go to zero, and a project with no presale can still be abandoned. Nothing here is audited as a financial product."
  },
  {
    title: "ONE ADDRESS, FROM THIS PAGE",
    body: "The contract address on this page is the only one we publish. Anything else — a DM, a reply, a \"first buyer\" post — is impersonation. We will never ask you for a private key or a seed phrase."
  }
];
