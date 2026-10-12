import Link from "next/link";
import { Bi } from "../Bi";
import { TOKEN } from "../../lib/token";

export default function FlyFooter() {
  return <footer className="tfFooter">
    <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
    <p><Bi en={TOKEN.live
      ? "Paper market: simulated coins, paper money. $FLY is live on Robinhood Chain — the address and the fee split are published on the homepage."
      : "Paper season: simulated coins, paper money. No token is live."}  /><br /><Bi en="Independent connectome-inspired experiment. Not investment advice."  /></p>
    <div>
      <Link href="/fly/dusty">DUSTY</Link>
      <Link href="/dish#mint"><Bi en="PASSPORT"  /></Link>
      <Link href="/race"><Bi en="RACE"  /></Link>
      <Link href="/lab">LAB</Link>
      <Link href="https://github.com/fruitflyworld/fruit-fly-world/blob/main/docs/flies-that-trade.md" target="_blank" rel="noreferrer">DOCS</Link>
    </div>
  </footer>;
}
