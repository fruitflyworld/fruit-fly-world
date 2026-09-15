import { NextResponse } from "next/server";
import { MAX_SUPPLY, passportSvg } from "../../../lib/passport";

/* The artwork every Passport's tokenURI resolves to. Served as a document rather
   than a file so the supply is not bounded by how many PNGs were ever rendered —
   see app/lib/passport.ts. The `.svg` suffix is part of the URL because wallets and
   marketplaces sniff it before they sniff the content type. */
const TOKEN_ID = /^([1-9][0-9]*)\.svg$/;

export const dynamic = "force-static";

export async function GET(_: Request, { params }: { params: { tokenId: string } }) {
  const match = TOKEN_ID.exec(params.tokenId);
  const tokenId = match ? Number(match[1]) : NaN;
  if (!match || tokenId > MAX_SUPPLY) {
    return NextResponse.json({ error: "Invalid token ID" }, { status: 404 });
  }

  return new NextResponse(passportSvg(tokenId), {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
    }
  });
}
