import { NextResponse } from "next/server";
import { createPublicClient, getAddress, http } from "viem";
import { configuredChain } from "../../../lib/chain";
import { publicMintConfiguration } from "../../../lib/server/mint-voucher";
import { query } from "../../../lib/server/db";
import { currentSession } from "../../../lib/server/session";

const passportAbi = [
  { type: "function", name: "hasMinted", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "missionQualified", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "publicMintOpen", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "publicMintPrice", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "participantPrice", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "MAX_SUPPLY", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "tokenOf", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] }
] as const;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await currentSession();
    if (!session) return NextResponse.json({ session: null, minted: false });
    const config = publicMintConfiguration();
    const chain = configuredChain(config.chainId);
    const client = createPublicClient({ chain, transport: http(process.env.CHAIN_RPC_URL) });
    const wallet = getAddress(session.address);
    const contracts = [
      { address: config.contract, abi: passportAbi, functionName: "hasMinted", args: [wallet] },
      { address: config.contract, abi: passportAbi, functionName: "missionQualified", args: [wallet] },
      { address: config.contract, abi: passportAbi, functionName: "publicMintOpen" },
      { address: config.contract, abi: passportAbi, functionName: "publicMintPrice" },
      { address: config.contract, abi: passportAbi, functionName: "participantPrice" },
      { address: config.contract, abi: passportAbi, functionName: "totalSupply" },
      { address: config.contract, abi: passportAbi, functionName: "MAX_SUPPLY" },
      { address: config.contract, abi: passportAbi, functionName: "tokenOf", args: [wallet] }
    ] as const;
    const [minted, missionQualified, publicMintOpen, publicMintPrice, participantPrice, totalSupply, maxSupply, tokenId] =
      await client.multicall({ contracts, allowFailure: false });
    // Having entered a Foraging Hour window is the half-price tier's whole claim.
    // The table stores addresses lowercase (participants.address is CHECKed that way), so
    // this must not go through getAddress() — a checksummed address matches nothing.
    const entered = await query("SELECT 1 FROM arena_entries WHERE participant_address=$1 LIMIT 1", [session.address]);
    return NextResponse.json({
      session,
      minted,
      missionQualified,
      publicMintOpen,
      publicMintPrice: publicMintPrice.toString(),
      participantPrice: participantPrice.toString(),
      participant: (entered.rowCount ?? 0) > 0,
      totalSupply: totalSupply.toString(),
      maxSupply: maxSupply.toString(),
      // 0n for a wallet that holds no Passport (tokenOf is a public mapping, it never reverts).
      tokenId: tokenId > 0n ? tokenId.toString() : null,
      contract: config.contract,
      chainId: config.chainId
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not check mint status" }, { status: 503 });
  }
}
