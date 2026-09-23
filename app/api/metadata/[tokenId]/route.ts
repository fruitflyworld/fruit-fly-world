import { NextResponse } from "next/server";
import { MAX_SUPPLY, rarityLabel, rarityOf } from "../../../lib/passport";

const TOKEN_ID = /^[1-9][0-9]*$/;

export const dynamic = "force-static";

export async function GET(_: Request, { params }: { params: { tokenId: string } }) {
  if (!TOKEN_ID.test(params.tokenId)) {
    return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
  }

  const tokenNum = Number(params.tokenId);
  const rarity = rarityOf(tokenNum);

  return NextResponse.json({
    name: `Fruit Fly Passport #${params.tokenId}`,
    description: `A non-transferable Genesis Passport for Fruit Fly World, earned in the dish. ${rarityLabel(rarity)} tier, ${MAX_SUPPLY} in the campaign.`,
    image: `https://fruitfly.world/api/passport/${params.tokenId}.svg`,
    external_url: "https://fruitfly.world",
    attributes: [
      { trait_type: "World", value: "Fruit Fly World" },
      { trait_type: "Agent", value: "FF-001" },
      { trait_type: "Campaign", value: "Genesis" },
      { trait_type: "Status", value: "Earned in the Dish" },
      { trait_type: "Transferability", value: "Soulbound" },
      { trait_type: "Rarity", value: rarityLabel(rarity) },
      { display_type: "number", trait_type: "Passport Number", value: tokenNum }
    ]
  }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
