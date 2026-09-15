import "server-only";
import { getAddress, keccak256, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mintVoucherTypes } from "../mint";

export const MINT_CAMPAIGN = "genesis";
export const MINT_CAMPAIGN_HASH = keccak256(toBytes(MINT_CAMPAIGN));

export { mintVoucherTypes };

/** Billing tiers the signer can put on a voucher. The flags travel inside the signature. */
export type MintTier = "free" | "participant";

export const passportPricingAbi = [
  { type: "function", name: "publicMintPrice", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "participantPrice", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] }
] as const;

export function publicMintConfiguration() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);
  const contractValue = process.env.NEXT_PUBLIC_MINT_CONTRACT_ADDRESS;
  if (!Number.isSafeInteger(chainId) || chainId <= 0) throw new Error("Invalid mint chain configuration");
  if (!contractValue || !/^0x[0-9a-fA-F]{40}$/.test(contractValue)) throw new Error("Mint contract is not configured");
  return { chainId, contract: getAddress(contractValue) };
}

export function mintSigningConfiguration() {
  const config = publicMintConfiguration();
  const privateKey = process.env.MINT_VOUCHER_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error("Mint signer is not configured");
  return { ...config, account: privateKeyToAccount(privateKey as Hex) };
}
