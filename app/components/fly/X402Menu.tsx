import { Bi } from "../Bi";

const ITEMS: { price: string; en: string; den: string; later?: boolean }[] = [
  { price: "Opens after launch", en: "Feed it", den: "Adds energy and keeps it alive. When the fees dry up at night, this is what saves it." },
  { price: "Opens after launch", en: "Shout-out", den: "Its next diary entry names you. The brag is yours; the numbers are still its own." },
  { price: "Opens after launch", en: "Famous-moment certificate", den: "A sealed replay of one classic trade. Anyone can re-run it, forever." },
  { price: "Opens after launch", en: "Sponsor a food spot", den: "Your coin appears in the dish, labelled “sponsored”. It buys a spot on the menu, never a buy." },
  { price: "Opens after launch", en: "Bet on the weekly race", den: "The race protocol and contracts are written and tested. Betting opens later.", later: true },
];

export default function X402Menu() {
  return <div className="tfX402">
    <div className="tfX402Grid">
      {ITEMS.map((it) => <article key={it.en} className={`tfTag${it.later ? " later" : ""}`}>
        <span className="tfTagPrice tfMono"><Bi en={it.price}  /></span>
        <h3><Bi en={it.en}  /></h3>
        <p><Bi en={it.den}  /></p>
        <span className="tfTagState"><i /><Bi en={it.later ? "LATER" : "OPENS AT LAUNCH"}  /></span>
      </article>)}
    </div>
    <div className="tfX402Note">
      <code className="tfMono">HTTP 402 · USDC</code>
      <p><Bi en="Payments use x402 and settle in USDC. The chain you pay on has nothing to do with the chain the token lives on. People and AI agents pay the same way: one HTTP request, one receipt."  /></p>
    </div>
  </div>;
}
