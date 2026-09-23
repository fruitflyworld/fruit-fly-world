/* ── app/lib/passport.ts ────────────────────────────────────────────────────
   The Passport's artwork, drawn from the token number alone.

   Why this exists: the metadata used to point at static files named
   `passport-genesis-<NNN>.png`. Only #1 was ever rendered, so every Genesis
   Passport after it served a broken image — and a tokenURI is permanent. Drawing
   the SVG per token costs nothing and cannot fall behind the supply.

   Nothing here reads a file or a database, so the same call in the metadata route,
   in a test, or in a shell produces the same bytes. The fly is identical on every
   Passport; what changes is the frame, the label, and the number. It is a specimen
   plate, not a portrait of the winner's route — so no per-token signal readings,
   which would imply data the artwork does not have.
   ------------------------------------------------------------------------- */

export const MAX_SUPPLY = 4444;

/** The chain stamp on the plate, read from the configured chain — never a
 *  hardcoded network name. */
function chainStamp(): string {
  const id = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);
  const names: Record<number, string> = { 11155111: "SEPOLIA", 4663: "ROBINHOOD", 46630: "RBH TESTNET" };
  return names[id] || `CHAIN ${id}`;
}

export type PassportRarity = "genesis" | "rare" | "epic" | "legendary";

/** The tier boundaries, in one place. `app/api/metadata/[tokenId]` reads them from
 *  here so the artwork and the attribute can never disagree about a token. */
export function rarityOf(tokenId: number): PassportRarity {
  if (tokenId <= 1000) return "genesis";
  if (tokenId <= 3000) return "rare";
  if (tokenId <= 4000) return "epic";
  return "legendary";
}

export const rarityLabel = (rarity: PassportRarity) => rarity.charAt(0).toUpperCase() + rarity.slice(1);

/** Frame and label ink per tier. The specimen itself keeps its own colours — a
 *  passport should look like a passport whichever tier it is. */
const INK: Record<PassportRarity, { accent: string; text: string }> = {
  genesis: { accent: "#d5ff5f", text: "#eaffbc" },
  rare: { accent: "#5ec8ff", text: "#c6ecff" },
  epic: { accent: "#ffbd3e", text: "#ffe6b4" },
  legendary: { accent: "#e07bff", text: "#f2ccff" }
};

export function passportSvg(tokenId: number): string {
  const rarity = rarityOf(tokenId);
  const { accent, text } = INK[rarity];
  const stamped = String(tokenId).padStart(3, "0");
  const label = rarityLabel(rarity);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200" role="img" aria-labelledby="title desc">
  <title id="title">Fruit Fly World Passport #${tokenId}</title>
  <desc id="desc">The ${label} tier Fruit Fly World Passport #${tokenId} for Agent FF-001. Non-transferable, one per wallet, ${MAX_SUPPLY} in the campaign.</desc>
  <defs>
    <radialGradient id="field" cx="50%" cy="42%" r="72%">
      <stop offset="0" stop-color="#31411f"/>
      <stop offset=".48" stop-color="#141c0e"/>
      <stop offset="1" stop-color="#050705"/>
    </radialGradient>
    <radialGradient id="halo">
      <stop offset="0" stop-color="#eaff74" stop-opacity=".9"/>
      <stop offset=".45" stop-color="#a5e83a" stop-opacity=".3"/>
      <stop offset="1" stop-color="#90d92e" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="core">
      <stop offset="0" stop-color="#f6ffb2" stop-opacity=".38"/>
      <stop offset="1" stop-color="#f6ffb2" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="wing" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#f4ffd0" stop-opacity=".8"/>
      <stop offset=".55" stop-color="#cfeaa0" stop-opacity=".28"/>
      <stop offset="1" stop-color="#88a66c" stop-opacity=".06"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d99a45"/>
      <stop offset=".55" stop-color="#a26a24"/>
      <stop offset="1" stop-color="#6e4215"/>
    </linearGradient>
    <radialGradient id="head" cx="42%" cy="30%" r="80%">
      <stop offset="0" stop-color="#cf9440"/>
      <stop offset="1" stop-color="#6e4416"/>
    </radialGradient>
    <radialGradient id="eye" cx="38%" cy="32%" r="85%">
      <stop offset="0" stop-color="#ff8a5c"/>
      <stop offset=".5" stop-color="#d63a22"/>
      <stop offset="1" stop-color="#7d130d"/>
    </radialGradient>
    <pattern id="facets" width="11" height="9.6" patternUnits="userSpaceOnUse">
      <circle cx="5.5" cy="4.8" r="3.5" fill="none" stroke="#5f0d08" stroke-opacity=".6" stroke-width="1.1"/>
    </pattern>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="15"/></filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="17"/>
      <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .08 0"/>
    </filter>
  </defs>

  <rect width="1200" height="1200" fill="url(#field)"/>
  <g stroke="${accent}" stroke-opacity=".045">
    <path d="M180 44v1112M300 44v1112M420 44v1112M540 44v1112M660 44v1112M780 44v1112M900 44v1112M1020 44v1112"/>
    <path d="M44 180h1112M44 300h1112M44 420h1112M44 540h1112M44 660h1112M44 780h1112M44 900h1112M44 1020h1112"/>
  </g>
  <rect x="44" y="44" width="1112" height="1112" rx="42" fill="none" stroke="${accent}" stroke-opacity=".7" stroke-width="2"/>
  <rect x="64" y="64" width="1072" height="1072" rx="29" fill="none" stroke="#dce9cf" stroke-opacity=".18"/>
  <path d="M64 118V64h54M1136 64v54h-54M64 1082v54h54M1136 1082v-54h-54" fill="none" stroke="${accent}" stroke-opacity=".55" stroke-width="3" transform="translate(-24 -24) scale(1.04)"/>

  <text x="600" y="560" text-anchor="middle" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="132" font-weight="700" letter-spacing="18" fill="none" stroke="${accent}" stroke-opacity=".08">#${stamped}</text>

  <circle cx="600" cy="535" r="392" fill="url(#halo)"/>
  <circle cx="600" cy="535" r="168" fill="url(#core)"/>
  <circle cx="600" cy="535" r="336" fill="none" stroke="${accent}" stroke-opacity=".22" stroke-width="16" stroke-dasharray="3 32.19"/>
  <circle cx="600" cy="535" r="302" fill="none" stroke="${accent}" stroke-opacity=".22"/>
  <circle cx="600" cy="535" r="216" fill="none" stroke="${accent}" stroke-opacity=".14" stroke-dasharray="5 14"/>
  <path d="M600 190v690M255 535h690" stroke="${accent}" stroke-opacity=".14"/>

  <g transform="translate(600 530)" stroke-linecap="round" stroke-linejoin="round">
    <g id="wingL">
      <path d="M-38-82C-126-169-285-182-306-86c-17 78 121 122 260 62Z" fill="url(#wing)" stroke="#f2ffd2" stroke-opacity=".8" stroke-width="3"/>
      <g fill="none" stroke="#eaffc4" stroke-opacity=".5" stroke-width="2.5">
        <path d="M-46-86C-136-154-228-166-296-110"/>
        <path d="M-50-70C-142-112-232-114-302-76"/>
        <path d="M-50-50C-140-58-236-46-298-24"/>
        <path d="M-52-32C-130-24-220-6-284 6"/>
        <path d="M-176-122C-172-96-172-70-178-44"/>
      </g>
    </g>
    <use href="#wingL" transform="scale(-1 1)"/>

    <g id="legL" fill="none" stroke="#b5dc52" stroke-width="6">
      <path d="M-40-34L-128 38L-208 92"/>
      <path d="M-44 2L-140 76L-196 152"/>
      <path d="M-42 38L-128 118L-176 196"/>
    </g>
    <use href="#legL" transform="scale(-1 1)"/>

    <path d="M-61-54C-58-118-38-151 0-151s58 33 61 97L48 93C42 153 25 187 0 187s-42-34-48-94Z" fill="url(#body)" stroke="#e8ff7e" stroke-width="4"/>
    <ellipse cx="-18" cy="-52" rx="22" ry="64" fill="#ffffff" opacity=".16" transform="rotate(-8 -18 -52)"/>
    <g fill="none" stroke="#38220a" stroke-width="9" opacity=".85">
      <path d="M-57-40Q0-16 57-40"/>
      <path d="M-53 8Q0 32 53 8"/>
      <path d="M-49 56Q0 80 49 56"/>
      <path d="M-41 104Q0 124 41 104"/>
    </g>
    <g fill="none" stroke="#ffdf9a" stroke-width="2" opacity=".5">
      <path d="M-57-34Q0-10 57-34"/>
      <path d="M-53 14Q0 38 53 14"/>
    </g>

    <g stroke="#d4ff5e" stroke-opacity=".6" stroke-width="2.5">
      <path d="M-25-72 0-94M0-94 25-72M-25-72-30-34M0-94 0-38M25-72 31-33M-30-34 0-38M0-38 31-33M-30-34-23 3M0-38 17 9M31-33 17 9M-23 3-18 46M17 9 21 54M-18 46 0 86M21 54 0 86" fill="none"/>
    </g>
    <g fill="#dcff63" filter="url(#glow)">
      <circle cx="-25" cy="-72" r="7"/><circle cx="0" cy="-94" r="8"/><circle cx="25" cy="-72" r="7"/>
      <circle cx="-30" cy="-34" r="6"/><circle cx="0" cy="-38" r="7"/><circle cx="31" cy="-33" r="6"/>
      <circle cx="-23" cy="3" r="6"/><circle cx="17" cy="9" r="6"/>
      <circle cx="-18" cy="46" r="6"/><circle cx="21" cy="54" r="6"/><circle cx="0" cy="86" r="7"/>
    </g>
    <g fill="#ffffe2">
      <circle cx="-25" cy="-72" r="2.4"/><circle cx="0" cy="-94" r="2.8"/><circle cx="25" cy="-72" r="2.4"/>
      <circle cx="-30" cy="-34" r="2"/><circle cx="0" cy="-38" r="2.4"/><circle cx="31" cy="-33" r="2"/>
      <circle cx="-23" cy="3" r="2"/><circle cx="17" cy="9" r="2"/>
      <circle cx="-18" cy="46" r="2"/><circle cx="21" cy="54" r="2"/><circle cx="0" cy="86" r="2.4"/>
    </g>

    <ellipse cy="-145" rx="79" ry="68" fill="url(#head)" stroke="#e8ff7e" stroke-width="4"/>
    <g>
      <ellipse cx="-43" cy="-159" rx="36" ry="40" fill="url(#eye)" stroke="#ff9d85" stroke-width="3.5"/>
      <ellipse cx="43" cy="-159" rx="36" ry="40" fill="url(#eye)" stroke="#ff9d85" stroke-width="3.5"/>
      <ellipse cx="-43" cy="-159" rx="36" ry="40" fill="url(#facets)"/>
      <ellipse cx="43" cy="-159" rx="36" ry="40" fill="url(#facets)"/>
      <ellipse cx="-52" cy="-172" rx="10" ry="7" fill="#ffd9b0" opacity=".85" transform="rotate(-18 -52 -172)"/>
      <ellipse cx="34" cy="-172" rx="10" ry="7" fill="#ffd9b0" opacity=".85" transform="rotate(18 34 -172)"/>
    </g>
    <circle cx="0" cy="-206" r="3.5" fill="#ffd0a8"/><circle cx="-13" cy="-199" r="3" fill="#ffd0a8"/><circle cx="13" cy="-199" r="3" fill="#ffd0a8"/>
    <g fill="none" stroke="#dfff68" stroke-width="5">
      <path d="M-24-204Q-64-252-108-258"/>
      <path d="M24-204Q64-252 108-258"/>
    </g>
    <g fill="none" stroke="#dfff68" stroke-width="2.5" stroke-opacity=".8">
      <path d="M-108-258l-14-8M-108-258l-16 2M-108-258l-12 12"/>
      <path d="M108-258l14-8M108-258l16 2M108-258l12 12"/>
    </g>
  </g>

  <g fill="${text}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace">
    <text x="92" y="124" font-size="25" letter-spacing="6">FRUIT FLY WORLD</text>
    <text x="1108" y="124" font-size="18" text-anchor="end" letter-spacing="3">${label.toUpperCase()} / ${stamped}</text>
    <text x="92" y="172" font-size="15" letter-spacing="4" opacity=".6">PASSPORT ${stamped} / ${MAX_SUPPLY}</text>
    <text x="1108" y="172" font-size="15" text-anchor="end" letter-spacing="4" opacity=".6">CAMPAIGN GENESIS</text>
    <text x="92" y="1000" font-size="78" font-weight="700" letter-spacing="5">PASSPORT</text>
    <text x="96" y="1047" font-size="19" letter-spacing="4" opacity=".78">AGENT FF-001 &#183; NON-TRANSFERABLE</text>
    <text x="1104" y="1004" font-size="19" text-anchor="end" letter-spacing="3">${chainStamp()}</text>
    <text x="1104" y="1047" font-size="16" text-anchor="end" letter-spacing="2" opacity=".78">SOULBOUND</text>
    <g opacity=".55" font-size="13" letter-spacing="2">
      <text x="1108" y="862" text-anchor="end">RARITY ${label.toUpperCase()}</text>
      <text x="1108" y="886" text-anchor="end">MAX SUPPLY ${MAX_SUPPLY}</text>
      <text x="1108" y="910" text-anchor="end">CAMPAIGN GENESIS</text>
      <text x="1108" y="934" text-anchor="end">ONE PER WALLET</text>
    </g>
  </g>
  <g stroke="${text}" stroke-opacity=".7" stroke-width="2">
    <path d="M92 926h80M92 918v16M172 918v16"/>
  </g>
  <text x="92" y="908" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="14" letter-spacing="2" fill="${text}" opacity=".7">100 μm</text>

  <rect width="1200" height="1200" filter="url(#grain)" opacity=".7"/>
</svg>
`;
}
