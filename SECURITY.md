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
