"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, formatEther, getAddress, type Hex } from "viem";
import { configuredChain } from "../lib/chain";
import { mintCopy, resolveMintState, type MintState } from "../lib/mint";
import { useAuth } from "./AuthProvider";

declare global { interface Window { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> } } }

type Signals = { food: number; threat: number; light: number; novelty: number };
type Voucher = { recipient: Hex; campaign: Hex; nonce: Hex; deadline: string; participant: boolean; free: boolean };

const passportAbi = [
  {
    // One voucher entry, three bills: free (mission), half price (window entrant), standard.
    type: "function", name: "mint", stateMutability: "payable",
    inputs: [
      { name: "voucher", type: "tuple", components: [
        { name: "recipient", type: "address" }, { name: "campaign", type: "bytes32" },
        { name: "nonce", type: "bytes32" }, { name: "deadline", type: "uint256" },
        { name: "participant", type: "bool" }, { name: "free", type: "bool" }
      ] },
      { name: "signature", type: "bytes" }
    ], outputs: [{ name: "tokenId", type: "uint256" }]
  },
  { type: "function", name: "publicMint", stateMutability: "payable", inputs: [], outputs: [{ name: "tokenId", type: "uint256" }] }
] as const;

const missions = [
  { id: "AGENT", number: "01", title: "Bring an AI Agent", description: "A separate Agent wallet signs a one-time challenge and runs one constrained experiment. Do this once and your agent can enter an arena window every hour on its own.", proof: "AGENT WALLET" },
  { id: "X_QUOTE", number: "02", title: "Spread the signal", description: "Quote the official campaign post with a wallet-bound, one-time proof code.", proof: "X QUOTE POST" },
  { id: "ARENA", number: "03", title: "Take an arena window", description: "Enter a route — from an agent, or by hand through the documented interface — and hold the best score when the clock hits zero. Nothing to claim when you win: the completion lands here on its own and the mint unlocks. Lose and the entry still earns you half-price minting.", proof: "BEST ROUTE IN A WINDOW" }
];

const passportPreviews = [
  { name: "GENESIS", image: "/nft/passport-genesis-001.png" },
  { name: "RARE", image: "/nft/passport-rare-001.png" },
  { name: "EPIC", image: "/nft/passport-epic-001.png" },
  { name: "LEGENDARY", image: "/nft/passport-legendary-001.png" }
];

async function jsonRequest(url: string, body: unknown = {}) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function MintSection() {
  const { address, status, error: authError, connect, disconnect } = useAuth();
  const [completed, setCompleted] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [minted, setMinted] = useState(false);
  const [missionQualified, setMissionQualified] = useState(false);
  const [publicMintOpen, setPublicMintOpen] = useState(false);
  const [publicMintPrice, setPublicMintPrice] = useState<bigint>(0n);
  const [participant, setParticipant] = useState(false);
  const [participantPrice, setParticipantPrice] = useState<bigint>(0n);
  const [totalSupply, setTotalSupply] = useState<bigint>(0n);
  const [maxSupply, setMaxSupply] = useState<bigint>(4444n);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [action, setAction] = useState<MintState>();
  const [message, setMessage] = useState<string>();
  const [agentAddress, setAgentAddress] = useState("");
  const [agentChallenge, setAgentChallenge] = useState<{ nonce: string; message: string }>();
  const [agentSignature, setAgentSignature] = useState("");
  const [xChallenge, setXChallenge] = useState<{ code: string; officialPostId: string; postText: string; intentUrl: string }>();
  const [xPostUrl, setXPostUrl] = useState("");
  const contractConfigured = /^0x[a-fA-F0-9]{40}$/.test(process.env.NEXT_PUBLIC_MINT_CONTRACT_ADDRESS || "");

  const refresh = useCallback(async () => {
    if (!address) {
      setCompleted([]); setChecked(false); setMinted(false); setMissionQualified(false);
      setPublicMintOpen(false); setPublicMintPrice(0n); setParticipant(false); setParticipantPrice(0n);
      setTotalSupply(0n); setMaxSupply(4444n);
      setTokenId(null);
      return;
    }
    try {
      const missionResponse = await fetch("/api/missions", { cache: "no-store" });
      const missionData = await missionResponse.json();
      setCompleted(missionData.completed || []);
      if (contractConfigured) {
        const mintResponse = await fetch("/api/mint/status", { cache: "no-store" });
        const mintData = await mintResponse.json();
        if (!mintResponse.ok) throw new Error(mintData.error || "Could not read Passport status.");
        setMinted(Boolean(mintData.minted));
        setMissionQualified(Boolean(mintData.missionQualified));
        setPublicMintOpen(Boolean(mintData.publicMintOpen));
        setPublicMintPrice(BigInt(mintData.publicMintPrice));
        setParticipant(Boolean(mintData.participant));
        setParticipantPrice(BigInt(mintData.participantPrice));
        setTotalSupply(BigInt(mintData.totalSupply));
        setMaxSupply(BigInt(mintData.maxSupply));
        setTokenId(mintData.tokenId ? String(mintData.tokenId) : null);
      }
    } catch { setMessage("Could not refresh mission or mint status."); }
    finally { setChecked(true); }
  }, [address, contractConfigured]);

  useEffect(() => { void refresh(); const update = () => void refresh(); window.addEventListener("ffw:auth", update); return () => window.removeEventListener("ffw:auth", update); }, [refresh]);
  // ARENA is one of the three ways in: winning a Foraging Hour window records the
  // mission server-side, so it has to count here too or the winner cannot mint.
  const eligible = completed.some((mission) => mission === "AGENT" || mission === "X_QUOTE" || mission === "ARENA");
  const contractAvailable = contractConfigured && checked;
  const soldOut = totalSupply >= maxSupply;
  // The half-price tier only exists while the standard price does — the contract halves it.
  const halfPriceOpen = participant && participantPrice > 0n;
  const baseState = resolveMintState({
    connected: Boolean(address), checked, eligible, participant: halfPriceOpen, contractAvailable,
    publicMintOpen, minted, missionQualified, soldOut
  });
  const displayState: MintState = action || (status === "signing" ? "CHECKING_ELIGIBILITY" : baseState);
  const copy = mintCopy[displayState];
  const paidPrice = publicMintPrice ? `${formatEther(publicMintPrice)} ETH` : "ETH";
  const halfPrice = participantPrice ? `${formatEther(participantPrice)} ETH` : "ETH";
  const supplyLabel = `${totalSupply.toLocaleString()} / ${maxSupply.toLocaleString()}`;
  const shortAddress = useMemo(() => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "", [address]);

  async function startAgentMission() {
    try {
      setMessage(undefined);
      const signals: Signals = { food: 64, threat: 37, light: 58, novelty: 81 };
      const data = await jsonRequest("/api/missions/agent/challenge", { agentAddress, signals });
      setAgentChallenge({ nonce: data.nonce, message: data.message });
      setMessage("Have the Agent wallet sign the exact challenge message, then paste its signature.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not create Agent mission."); }
  }

  async function verifyAgentMission() {
    try {
      if (!agentChallenge) throw new Error("Create an Agent challenge first.");
      await jsonRequest("/api/missions/agent/verify", { nonce: agentChallenge.nonce, signature: agentSignature });
      setMessage("Agent Mission verified. Mint unlocked.");
      setAgentChallenge(undefined); setAgentSignature(""); await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Agent verification failed."); }
  }

  async function startXMission() {
    try {
      const data = await jsonRequest("/api/missions/x/challenge");
      setXChallenge({ code: data.code, officialPostId: data.officialPostId, postText: data.postText, intentUrl: data.intentUrl });
      setMessage("Post the text below — the code and the trailing link both have to stay in it — then verify.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not create X mission."); }
  }

  async function verifyXMission() {
    try {
      if (!xChallenge) throw new Error("Create an X proof code first.");
      const input = xPostUrl.trim();
      // A status link is verified exactly; anything else is read as a handle and
      // scanned for the code, so a phone user never has to find their permalink.
      const proof = /status(?:es)?\/\d{5,25}/i.test(input) || /^\d{10,25}$/.test(input) ? { postUrl: input } : { handle: input };
      await jsonRequest("/api/missions/x/verify", { code: xChallenge.code, ...proof });
      setMessage("X Quote Mission verified. Mint unlocked.");
      setXChallenge(undefined); setXPostUrl(""); await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "X verification failed."); }
  }

  async function mintPassport() {
    try {
      if (!window.ethereum) throw new Error("Install a compatible wallet.");
      setAction("AWAITING_SIGNATURE"); setMessage(undefined);
      const data = await jsonRequest("/api/mint/voucher");
      const chain = configuredChain(data.chainId);
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${data.chainId.toString(16)}` }] });
      const wallet = createWalletClient({ chain, transport: custom(window.ethereum) });
      const [account] = await wallet.requestAddresses();
      if (getAddress(account) !== getAddress(address!)) throw new Error("Your active wallet does not match the signed-in wallet.");
      const voucher = data.voucher as Voucher;
      // The server signs the tier, so its quoted price is the exact amount the contract wants.
      const hash = await wallet.writeContract({
        account, chain, address: data.contract, abi: passportAbi, functionName: "mint",
        args: [{ ...voucher, deadline: BigInt(voucher.deadline) }, data.signature],
        value: BigInt(data.price ?? "0")
      });
      setAction("CONFIRMING"); setMessage(`Transaction submitted: ${hash.slice(0, 10)}…`);
      const publicClient = createPublicClient({ chain, transport: custom(window.ethereum) });
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh(); setAction(undefined);
    } catch (cause) { setAction("FAILED"); setMessage(cause instanceof Error ? cause.message : "Mint was not completed."); }
  }

  async function publicMintPassport() {
    try {
      if (!window.ethereum || !address) throw new Error("Install a compatible wallet.");
      const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);
      const chain = configuredChain(chainId);
      const contract = getAddress(process.env.NEXT_PUBLIC_MINT_CONTRACT_ADDRESS!);
      setAction("AWAITING_SIGNATURE"); setMessage(undefined);
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${chainId.toString(16)}` }] });
      const wallet = createWalletClient({ chain, transport: custom(window.ethereum) });
      const [account] = await wallet.requestAddresses();
      if (getAddress(account) !== getAddress(address)) throw new Error("Your active wallet does not match the signed-in wallet.");
      const hash = await wallet.writeContract({ account, chain, address: contract, abi: passportAbi, functionName: "publicMint", value: publicMintPrice });
      setAction("CONFIRMING"); setMessage(`Transaction submitted: ${hash.slice(0, 10)}…`);
      const publicClient = createPublicClient({ chain, transport: custom(window.ethereum) });
      await publicClient.waitForTransactionReceipt({ hash });
      setAction(undefined); await refresh();
    } catch (cause) { setAction("FAILED"); setMessage(cause instanceof Error ? cause.message : "Mint was not completed."); }
  }

  const supplyPercent = maxSupply > 0n ? Number((totalSupply * 10000n) / maxSupply) / 100 : 0;

  return <div className="mintStage">
    <div className="mintGrid">
      <div className="passportArt">
        <div className="passportNoise" aria-hidden="true"/>
        <div className="passportOrbit" aria-hidden="true"/>
        <span>FRUIT FLY PASSPORT</span>
        <strong>GENESIS</strong>
        <small>SOUL-BOUND · NON-TRANSFERABLE · {totalSupply.toLocaleString()} / {maxSupply.toLocaleString()} ISSUED</small>
        <div className="passportArtImage">
          <img src="/nft/passport-genesis-001.png" alt="Fruit Fly World Genesis Passport"/>
        </div>
        <div className="passportGallery">
          {passportPreviews.map((item) => <div className="passportPreviewItem" key={item.name}>
            <img src={item.image} alt={`${item.name} Passport`}/>
            <span>{item.name}</span>
          </div>)}
        </div>
        <div className="passportCode">
          {tokenId ? `TOKEN #${tokenId}` : "NOT YET MINTED"}<br/>
          ERC-721 · SEPOLIA · 4,444 SUPPLY
        </div>
      </div>

      <div className="mintPanel">
        <div className="mintStatus"><span className={`statusDot ${displayState.toLowerCase()}`}/><small>{displayState.replaceAll("_", " ")}</small>{address && <b>{shortAddress}</b>}</div>
        <h3>{copy.label}</h3>
        <p>{copy.detail}</p>
        <div className="missionProgress"><i style={{ width: `${eligible ? 100 : 0}%` }}/><span>{eligible ? "1 VERIFIED MISSION · QUALIFIED" : halfPriceOpen ? "WINDOW ENTERED · HALF PRICE" : "ANY 1 OF 3 WAYS = FREE MINT · OR MINT NOW"}</span></div>
        <div className="supplyBar" aria-label={`${supplyLabel} minted`}><i style={{ width: `${supplyPercent}%` }}/><span>{tokenId ? `YOUR TOKEN · #${tokenId}` : `${supplyLabel} MINTED`}</span></div>
        <div className="mintFacts">
          <span><small>PRICE</small><b>{eligible ? "FREE + GAS" : halfPriceOpen ? `${halfPrice} · HALF` : publicMintOpen ? paidPrice : "—"}</b></span>
          <span><small>SUPPLY</small><b>{supplyLabel}</b></span>
          <span><small>STATUS</small><b>{minted ? missionQualified ? "QUALIFIED" : "ACTIVE" : soldOut ? "SOLD OUT" : publicMintOpen ? "OPEN" : "GATED"}</b></span>
        </div>
        {!address && <button type="button" className="mintButton" disabled={status === "signing"} onClick={() => void connect()}>{status === "signing" ? "CHECK YOUR WALLET…" : "CONNECT + SIGN IN"}<span>↗</span></button>}
        {address && (displayState === "READY_FREE_MINT" || displayState === "READY_TO_ACTIVATE") && <button type="button" className="mintButton" disabled={action === "AWAITING_SIGNATURE" || action === "CONFIRMING"} onClick={() => void mintPassport()}>{displayState === "READY_TO_ACTIVATE" ? "ACTIVATE MISSION STATUS" : "MINT FREE — MISSION VERIFIED"} <span>↗</span></button>}
        {address && displayState === "READY_PARTICIPANT_MINT" && <button type="button" className="mintButton" disabled={action === "AWAITING_SIGNATURE" || action === "CONFIRMING"} onClick={() => void mintPassport()}>MINT AT HALF PRICE · {halfPrice} <span>↗</span></button>}
        {address && displayState === "READY_PAID_MINT" && <button type="button" className="mintButton" disabled={action === "AWAITING_SIGNATURE" || action === "CONFIRMING"} onClick={() => void publicMintPassport()}>MINT NOW · {paidPrice} <span>↗</span></button>}
        {address && displayState === "MINT_UNAVAILABLE" && <button type="button" className="mintButton" disabled>{eligible ? "ELIGIBILITY RECORDED" : "PUBLIC MINT CLOSED"}</button>}
        {displayState === "SOLD_OUT" && <button type="button" className="mintButton" disabled>GENESIS SOLD OUT</button>}
        {displayState === "MINTED" && <button type="button" className="mintButton" disabled>{tokenId ? `PASSPORT ACTIVE · TOKEN #${tokenId}` : "PASSPORT ACTIVE"}</button>}
        {address && <button type="button" className="demoEligibility" onClick={() => void disconnect()}>Disconnect {shortAddress}</button>}
        {(authError || message) && <p className="mintError" role="status">{authError || message}</p>}
        <p className="mintFine">One non-transferable Passport per wallet. Complete one mission to mint free, take part in a recorded activity to mint at half price, or mint at the on-chain price shown above. No yield, price, or future value is promised.</p>
      </div>
    </div>

    <div className="missionPreview" id="missions"><header><span>THREE WAYS IN · PICK ONE</span><b>COMPLETE 1 TO QUALIFY</b></header>
      {missions.map((mission) => <article className={completed.includes(mission.id) ? "missionDone" : ""} key={mission.id}><span>{completed.includes(mission.id) ? "✓" : mission.number}</span><div><h4>{mission.title}</h4><p>{mission.description}</p><small>PROOF · {completed.includes(mission.id) ? "VERIFIED" : mission.proof}</small></div><b>{completed.includes(mission.id) ? "DONE" : mission.id === "ARENA" ? "LIVE" : "OPEN"}</b></article>)}
      {address && !eligible && <div className="missionActions"><section><h4>AI AGENT MISSION</h4><input aria-label="Agent wallet address" value={agentAddress} onChange={(event) => setAgentAddress(event.target.value)} placeholder="0x Agent wallet address"/><button type="button" onClick={() => void startAgentMission()}>CREATE CHALLENGE</button>{agentChallenge && <><textarea aria-label="Agent challenge message" readOnly value={agentChallenge.message}/><input aria-label="Agent signature" value={agentSignature} onChange={(event) => setAgentSignature(event.target.value)} placeholder="0x Agent signature"/><button type="button" onClick={() => void verifyAgentMission()}>VERIFY AGENT</button></>}</section><section><h4>X QUOTE MISSION</h4>{!xChallenge ? <button type="button" onClick={() => void startXMission()}>GET PROOF CODE</button> : <><code>{xChallenge.code}</code><p>Publish this exactly — the code and the trailing link both have to stay in it, or the post will not read as a quote of the campaign post.</p><textarea aria-label="X post text" readOnly value={xChallenge.postText}/><a className="missionCompose" href={xChallenge.intentUrl} target="_blank" rel="noreferrer">OPEN IN X COMPOSER ↗</a><input aria-label="X post link or @handle" value={xPostUrl} onChange={(event) => setXPostUrl(event.target.value)} placeholder="Post link, or just @yourhandle"/><button type="button" onClick={() => void verifyXMission()}>VERIFY X POST</button></>}</section></div>}
    </div>
  </div>;
}
