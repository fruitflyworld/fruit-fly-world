import Link from "next/link";
import { Bi } from "../Bi";

export default function FlyNav({ home = false }: { home?: boolean }) {
  const h = (id: string) => (home ? `#${id}` : `/#${id}`);
  return <nav className="tfNav">
    <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
    <div className="navLinks">
      <a href={h("live")}><Bi en="Live"  /></a>
      <a href={h("how")}><Bi en="How it works"  /></a>
      <a href={h("replay")}><Bi en="Replay"  /></a>
      <Link href="/fly/dusty"><Bi en="Dusty's page"  /></Link>
      <a href={h("launch")}>$FLY</a>
      <Link href="/dish#mint"><Bi en="Passport"  /></Link>
    </div>
    <div className="tfNavEnd">
      <Link className="navCta" href="/fly/dusty"><Bi en="WATCH DUSTY"  /></Link>
    </div>
  </nav>;
}
