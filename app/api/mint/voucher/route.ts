import { NextResponse } from "next/server";
import { createPublicClient, getAddress, http, type Hex } from "viem";
import { configuredChain } from "../../../lib/chain";
import { opaqueToken, tokenHash } from "../../../lib/canonical";
import { transaction } from "../../../lib/server/db";
import { smallJson } from "../../../lib/server/input";
import {
  MINT_CAMPAIGN, MINT_CAMPAIGN_HASH, mintSigningConfiguration, mintVoucherTypes,
  passportPricingAbi, type MintTier
} from "../../../lib/server/mint-voucher";
import { enforceRateLimit } from "../../../lib/server/rate-limit";
import { assertSameOrigin, clientIp } from "../../../lib/server/request";
import { currentSession } from "../../../lib/server/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await currentSession();
    if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    await enforceRateLimit("mint_voucher", `${clientIp(request)}:${session.address}`, 5, 600);
    await smallJson(request);
    const config = mintSigningConfiguration();
    const recipient = getAddress(session.address);
    const nonce = `0x${tokenHash(opaqueToken(32))}` as Hex;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 10 * 60);

    // A verified mission mints free; having entered a Foraging Hour window is worth half price.
    const tier: MintTier = await transaction(async (client) => {
      const eligible = await client.query(
        `SELECT 1 FROM mission_completions mc
         JOIN mission_campaigns c ON c.id=mc.campaign_id
         WHERE mc.participant_address=$1 AND mc.campaign_id=$2
           AND mc.mission_type IN ('AGENT','X_QUOTE','ARENA','DISH')
           AND c.enabled=true AND c.starts_at<=now() AND c.ends_at>now()
         LIMIT 1 FOR UPDATE OF c`,
        [session.address, MINT_CAMPAIGN]
      );
      let resolved: MintTier = "free";
      if (!eligible.rowCount) {
        const entered = await client.query(
          "SELECT 1 FROM arena_entries WHERE participant_address=$1 LIMIT 1",
          [session.address]
        );
        if (!entered.rowCount) throw new Error("Complete one verified mission, or enter a Foraging Hour window, first");
        resolved = "participant";
      }
      await client.query(
        "INSERT INTO mint_vouchers(nonce,campaign_id,participant_address,tier,deadline) VALUES($1,$2,$3,$4,to_timestamp($5))",
        [nonce, MINT_CAMPAIGN, session.address, resolved, deadline.toString()]
      );
      return resolved;
    });

    // The contract owns the ladder, so quote the price from it rather than halving it here.
    let price = "0";
    if (tier === "participant") {
      const chain = configuredChain(config.chainId);
      const client = createPublicClient({ chain, transport: http(process.env.CHAIN_RPC_URL) });
      price = (await client.readContract({
        address: config.contract, abi: passportPricingAbi, functionName: "participantPrice"
      })).toString();
    }

    const free = tier === "free";
    const voucher = { recipient, campaign: MINT_CAMPAIGN_HASH, nonce, deadline, participant: !free, free };
    const signature = await config.account.signTypedData({
      domain: { name: "Fruit Fly Passport", version: "1", chainId: config.chainId, verifyingContract: config.contract },
      types: mintVoucherTypes,
      primaryType: "MintVoucher",
      message: voucher
    });
    return NextResponse.json({
      voucher: { ...voucher, deadline: deadline.toString() },
      signature,
      contract: config.contract,
      chainId: config.chainId,
      tier,
      price
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not issue mint voucher" }, { status: 400 });
  }
}
