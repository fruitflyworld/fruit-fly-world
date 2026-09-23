// /api/beacon — a public randomness beacon for exam seeds.
// `?seed=beacon` in the exam room derives the world seed from the latest
// Sepolia block hash: a number nobody (including us) could have cherry-picked
// before the run. The block is returned so anyone can verify it on an explorer.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RPCS = [
  process.env.SEPOLIA_RPC_URL,
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://1rpc.io/sepolia",
].filter(Boolean) as string[];

const CACHE_MS = 12_000; // ~one slot; keeps RPC traffic near zero
const RPC_TIMEOUT_MS = 4_000;

let cache: { chainId: number; blockNumber: number; blockHash: string; seed: number; ts: number } | null = null;

function seedFromHash(hash: string): number {
  // FNV-1a over the full hash → uint32 (same family as the decision-log hashes)
  let h = 0x811c9dc5;
  for (let i = 2; i < hash.length; i++) {
    h ^= hash.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

async function rpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  const j = await res.json();
  if (j.error) throw new Error(String(j.error.message || j.error));
  return j.result;
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json({ ...cache, cached: true });
  }
  for (const url of RPCS) {
    try {
      const hexNum = await rpc(url, "eth_blockNumber", []);
      if (typeof hexNum !== "string" || !/^0x[0-9a-f]+$/i.test(hexNum)) continue;
      const block = await rpc(url, "eth_getBlockByNumber", [hexNum, false]);
      const hash = (block as { hash?: string })?.hash;
      if (typeof hash !== "string" || !/^0x[0-9a-f]{64}$/i.test(hash)) continue;
      const chainIdHex = await rpc(url, "eth_chainId", []);
      cache = {
        chainId: parseInt(String(chainIdHex), 16),
        blockNumber: parseInt(hexNum, 16),
        blockHash: hash,
        seed: seedFromHash(hash),
        ts: Date.now(),
      };
      return NextResponse.json(cache);
    } catch {
      // try the next RPC
    }
  }
  return NextResponse.json({ error: "beacon unavailable; try a numeric seed" }, { status: 502 });
}
