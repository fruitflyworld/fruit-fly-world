# Security

## Reporting a vulnerability

Open a [private security advisory](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository. Please do not open a public issue for anything exploitable.

Include what you did, what happened, and what you expected. A proof of concept helps more than a
description, and a transaction hash or request log helps most of all.

## In scope

- The deployed site and its API routes, especially anything that lets an entry be accepted
  without a valid route, a valid signature, or within its caps.
- `contracts/src/FruitFlyPassport.sol` — particularly any path that transfers a Passport,
  mints past the supply, mints twice to one address, or mints without a valid voucher.
- The mint voucher scheme: forging a voucher, replaying a nonce, extending a deadline, or
  escalating a tier.

## Known and by design

### Dependency advisories, stated plainly

The GitHub security tab is not empty, and this is the honest accounting of it (checked
2026-10-12):

- **`postcss` and `source-map-js` are patched.** Both were reachable only through the build
  toolchain; `package.json` pins the patched versions with `overrides` and the lockfile carries
  them (`postcss@8.5.29`, `source-map-js@1.2.2`).
- **The `next@14.2.35` advisories remain open, knowingly.** Every one of them is fixed only in
  `next@15.5.24`+, which also means React 18 → 19 and the async request APIs — a framework
  migration, not a patch. The maintainers are deliberately not bundling that migration into a
  product week: it will land as its own change, with the full suite plus a browser smoke test on a
  real page, rather than as a dependency bump that quietly changes the request lifecycle.

Dependabot keeps its pull request open so the decision stays visible instead of disappearing into
a dashboard. What the exposure looks like *in this deployment*, which is why it is accepted rather
than urgent:

- The affected surface is Next's server-side request handling — caching, redirects and
  request-amplification classes. This app serves static and server-rendered pages through one
  Next process behind nginx; there is no proxy mode, no image optimizer exposed to untrusted
  hosts, and no server-side fetching of user-supplied URLs.
- Every mutating route carries a same-origin check, a per-IP rate limit and an 8 KB body cap.
- There is no user login to bypass. The only signed surface is the mint rail, and it is switched
  off while the Passport is unlaunched — `/api/mint/status` answers
  `{"session":null,"minted":false}` and no page mounts the mint UI.

None of that is a claim that the framework is fine; it is a statement of blast radius while the
upgrade lands. If you find a way to exploit any of it against the live site, that is exactly what
the private advisory at the top of this file is for.

### Behaviour that is not a finding

These are documented behaviour, not findings:

- **The map, the seeds and the scoring function are public.** The problem is meant to be
  solvable offline. Knowing the answer is not an exploit — entering it within the caps is the
  game. Brute-forcing it is expected and the search is small on purpose.
- **The arena has no anti-cheat on route quality.** Caps, not cleverness, are what stop abuse:
  8 entries per wallet per window, 1 win per wallet per day, 4 entries per network per day.
- **The Passport cannot be transferred.** `transferFrom`, `safeTransferFrom`, `approve` and
  `setApprovalForAll` all revert `NonTransferable` under ERC-5192. A Passport is stuck to the
  address that minted it, permanently.
- **`/economics` is a design document.** Nothing described there is deployed, and the deployed
  contract cannot be upgraded into it.

## Out of scope

- Denial of service by volume. The rate limits are tuned for fair use, not for absorbing an
  attack; report sustained abuse to the operators rather than here.
- Anything requiring the private key of a wallet you do not control.
- Social engineering of the operators.
