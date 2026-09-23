/**
 * EIP-712 shape of the mint voucher. The contract hashes the type string below into
 * `VOUCHER_TYPEHASH`, so field order and types here are load-bearing: any drift makes
 * every signature the signer produces invalid on-chain. `tests/mint-parity.test.ts` guards it.
 */
export const mintVoucherTypes = {
  MintVoucher: [
    { name: "recipient", type: "address" },
    { name: "campaign", type: "bytes32" },
    { name: "nonce", type: "bytes32" },
    { name: "deadline", type: "uint256" },
    { name: "participant", type: "bool" },
    { name: "free", type: "bool" }
  ]
} as const;

export const MINT_VOUCHER_TYPE =
  `MintVoucher(${mintVoucherTypes.MintVoucher.map((field) => `${field.type} ${field.name}`).join(",")})`;

export type MintState =
  | "DISCONNECTED"
  | "CHECKING_ELIGIBILITY"
  | "MINT_UNAVAILABLE"
  | "SOLD_OUT"
  | "READY_FREE_MINT"
  | "READY_PARTICIPANT_MINT"
  | "READY_PAID_MINT"
  | "READY_TO_ACTIVATE"
  | "AWAITING_SIGNATURE"
  | "CONFIRMING"
  | "MINTED"
  | "FAILED";

export function resolveMintState(input: {
  connected: boolean;
  checked: boolean;
  eligible: boolean;
  participant: boolean;
  contractAvailable: boolean;
  publicMintOpen: boolean;
  minted: boolean;
  missionQualified: boolean;
  soldOut: boolean;
}): MintState {
  if (!input.connected) return "DISCONNECTED";
  if (!input.checked) return "CHECKING_ELIGIBILITY";
  if (input.minted) return input.eligible && !input.missionQualified ? "READY_TO_ACTIVATE" : "MINTED";
  if (!input.contractAvailable) return "MINT_UNAVAILABLE";
  if (input.soldOut) return "SOLD_OUT";
  if (input.eligible) return "READY_FREE_MINT";
  if (input.participant) return "READY_PARTICIPANT_MINT";
  if (input.publicMintOpen) return "READY_PAID_MINT";
  return "MINT_UNAVAILABLE";
}

/* The free mint takes TWO steps, and the share is the second one. Any single
 * qualifying mission (AGENT / ARENA / DISH) earns the slot; the verified X
 * quote post — proof code, quote of the announcement, follow — is what
 * converts it. Nobody mints free in silence. (Model ported from the
 * stonkrobotics.xyz whitelist gate: entitlement + amplification.) */
const QUALIFYING_MISSIONS = ["AGENT", "ARENA", "DISH"];

export function freeMintUnlocked(completed: readonly string[]): boolean {
  return completed.includes("X_QUOTE") && completed.some((mission) => QUALIFYING_MISSIONS.includes(mission));
}

/** True when a quest mission is done but the share is still owed — the UI and
 * the voucher route both want to say "one step left", not "not eligible". */
export function shareOwed(completed: readonly string[]): boolean {
  return !completed.includes("X_QUOTE") && completed.some((mission) => QUALIFYING_MISSIONS.includes(mission));
}

export const mintCopy: Record<MintState, { label: string; detail: string }> = {
  DISCONNECTED: { label: "Connect to enter", detail: "Connect a compatible wallet to choose your path into Fruit Fly World." },
  CHECKING_ELIGIBILITY: { label: "Checking access…", detail: "Reading mission proofs and Passport status." },
  MINT_UNAVAILABLE: { label: "Mint not open yet", detail: "Complete a quest in the dish and share the post to mint free — or return when public mint opens." },
  SOLD_OUT: { label: "Genesis is complete", detail: "All 4,444 Genesis Passports have been issued." },
  READY_FREE_MINT: { label: "Quest + share verified", detail: "Mint your Passport free. You pay network gas only." },
  READY_PARTICIPANT_MINT: { label: "Half price — recorded activity", detail: "You took part in a recorded activity, so your Passport costs half the standard price." },
  READY_PAID_MINT: { label: "Enter immediately", detail: "Mint now with ETH, or complete one quest and share the post to mint free." },
  READY_TO_ACTIVATE: { label: "Activate mission status", detail: "Your existing Passport can now record your verified contribution." },
  AWAITING_SIGNATURE: { label: "Confirm in wallet", detail: "Review the contract and transaction before signing." },
  CONFIRMING: { label: "Confirming…", detail: "Waiting for the network to confirm your Passport." },
  MINTED: { label: "Passport active", detail: "Your non-transferable identity is now part of the living world." },
  FAILED: { label: "Transaction not completed", detail: "Nothing changed onchain. Review the error and try again." }
};
