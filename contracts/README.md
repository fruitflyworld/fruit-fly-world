# Contracts

Four Solidity contracts live here. **None of them is in use today.** This file is the deployment
inventory: if a contract is deployed anywhere, it is listed here with the address, the chain and
whether it can currently do anything.

Addresses are placeholders until they are final — `{{...}}` means "not decided / not deployed", and
the canonical values live in [`config/launch.json`](../config/launch.json).

## Inventory

| Contract | Purpose | Status | Chain | Address |
| --- | --- | --- | --- | --- |
| `FruitFlyPassport.sol` | Soul-bound ERC-721 + ERC-5192 participation record, cap 4,444 | **Test deployment only — not in use, mints nothing** | `{{TOKEN_CHAIN}}` | `{{PASSPORT_TEST_ADDRESS}}` |
| `FruitFlyPassport.sol` | Same contract on a testnet, used for development | Testnet deployment | Sepolia (if present) | `{{PASSPORT_SEPOLIA_ADDRESS}}` |
| `WeeklyRace.sol` | Commit/reveal weekly race with a beacon-drawn seed | Written and forge-tested, **not deployed** | — | — |
| `FlyNFT.sol` | One lineage per token (genes + record) | Written and forge-tested, **not deployed** | — | — |
| `FlyToken.sol` | Fixed-supply token with burn-only sinks | **Design artifact.** Not deployed and does not describe any launched token | — | — |

If you find a deployment from a project wallet that is not in this table, that is a bug in this
file — report it through [SECURITY.md](../SECURITY.md) or open an issue.

## What the Passport contract does and does not do

- It mints only against a server-signed EIP-712 voucher; the signing key is server-side only.
- `transferFrom`, `safeTransferFrom`, `approve` and `setApprovalForAll` revert `NonTransferable`.
- It is immutable: there is no upgrade path and no owner-mint path.
- It cannot mint anything today, because no voucher is being signed: the mint interface is
  unmounted and `/api/mint/status` returns `{"session":null,"minted":false}`.

## Building and testing

```bash
cd contracts
forge test -vv
```

The suite is self-contained — no OpenZeppelin, no forge-std, no submodules. CI runs it on every
push.
