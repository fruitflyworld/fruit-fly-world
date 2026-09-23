import { defineChain } from "viem";

export const ethereumSepolia = defineChain({
  id: 11155111,
  name: "Ethereum Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://ethereum-sepolia-rpc.publicnode.com"] } },
  blockExplorers: { default: { name: "Etherscan", url: "https://sepolia.etherscan.io" } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11", blockCreated: 6507670 } },
  testnet: true
});

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
  // canonical Multicall3 deployment, verified live on chain 4663 — without this
  // entry viem's client.multicall() throws "does not support contract multicall3"
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } }
});

export const robinhoodChainTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://explorer.testnet.chain.robinhood.com" } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
  testnet: true
});

export function configuredChain(chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || ethereumSepolia.id)) {
  if (chainId === ethereumSepolia.id) return ethereumSepolia;
  if (chainId === robinhoodChain.id) return robinhoodChain;
  if (chainId === robinhoodChainTestnet.id) return robinhoodChainTestnet;
  throw new Error("Unsupported Fruit Fly World chain");
}
