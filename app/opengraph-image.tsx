import { ImageResponse } from "next/og";

export const alt = "Fruit Fly World — a fruit fly that trades. It can brag. Every number replays.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COINS: [string, number, number, string][] = [
  ["BANANA", 0, -0.72, "#ffbd3e"], ["MANGO", 0.62, -0.36, "#baff35"], ["PLUM", 0.62, 0.36, "#baff35"],
  ["FIG", 0, 0.72, "#ff593f"], ["KIWI", -0.62, 0.36, "#ffbd3e"], ["PEAR", -0.62, -0.36, "#baff35"],
];

export default function OgImage() {
  const R = 230, cx = 905, cy = 315;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#050805", color: "#f1f7eb", position: "relative" }}>
      <div style={{ position: "absolute", left: cx - R, top: cy - R, width: R * 2, height: R * 2, borderRadius: R, border: "2px solid #baff3555", background: "radial-gradient(circle at 50% 40%, #132015, #060a06)", display: "flex" }} />
      {COINS.map(([t, x, y, c]) => <div key={t} style={{ position: "absolute", left: cx + x * R - 38, top: cy + y * R - 38, width: 76, height: 76, borderRadius: 38, border: `3px solid ${c}`, background: "#0b110c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>{t}</div>)}
      <div style={{ position: "absolute", left: cx - 110, top: cy + 10, width: 46, height: 46, borderRadius: 23, border: "3px solid #baff35", display: "flex" }} />
      <div style={{ position: "absolute", left: cx - 98, top: cy + 22, width: 22, height: 22, borderRadius: 11, background: "#c98a2b", display: "flex" }} />
      <div style={{ position: "absolute", left: 70, top: 70, display: "flex", flexDirection: "column", width: 580 }}>
        <div style={{ fontSize: 20, letterSpacing: 4, color: "#baff35", display: "flex" }}>FRUIT FLY WORLD</div>
        <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 0.92, letterSpacing: -4, marginTop: 40, display: "flex", flexDirection: "column" }}>
          <span>A fruit fly</span><span style={{ color: "#baff35" }}>that trades.</span>
        </div>
        <div style={{ marginTop: 44, paddingLeft: 20, borderLeft: "4px solid #baff35", fontSize: 34, fontWeight: 700, display: "flex", flexDirection: "column" }}>
          <span>It can brag.</span><span style={{ color: "#baff35" }}>Every number replays.</span>
        </div>
      </div>
    </div>,
    size,
  );
}
