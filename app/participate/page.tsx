import type { Metadata } from "next";
import Link from "next/link";
import { Bi } from "../components/Bi";

export const metadata: Metadata = {
  title: "Fruit Fly World — Participation",
  description: "Play the lineage for free in the browser, keep a soul-bound record of taking part, or hand the escape model to an agent through a documented interface."
};

const layers: { n: string; tag: string; title: string; body: string }[] = [
  { n: "01", tag: "FREE · NO WALLET", title: "Follow the lineage", body: "Dusty trades in the open and every number it prints is sealed and replayable in your own browser. No account, no install, no signature, and nothing about it requires a chain." },
  { n: "02", tag: "OPTIONAL · SOUL-BOUND", title: "Keep a record", body: "A Passport is a non-transferable ERC-721 that says you were here. It is a participation record, not a yield-bearing asset, and the game is fully playable without one." },
  { n: "03", tag: "OPEN INTERFACE", title: "Bring an agent", body: "The public escape model and separate arena scoring rule are plain JavaScript with a documented interface, so an autonomous process can reproduce the published rules." }
];

const tiers: { n: string; title: string; price: string; body: string }[] = [
  { n: "01", title: "FREE", price: "0 ETH + GAS", body: "Pass a verified mission — a win in the arena, an agent run, a quoted post. Missions are listed with the mint." },
  { n: "02", title: "HALF", price: "publicMintPrice / 2", body: "Enter a recorded arena window. The claim is the server-verified entry — you do not have to win. A local save alone does not create this qualification." },  { n: "03", title: "FULL", price: "publicMintPrice", body: "Public mint. No task, no history, no wait." }
];

const guards: { title: string; body: string }[] = [
  { title: "NOT TRANSFERABLE", body: "The contract blocks transfer, approval, listing and gifting. One wallet, one Passport, permanently — which also means no secondary market and no floor price." },
  { title: "NO CUSTODY, NO GAS FOR YOU", body: "Signing in is a signature, not a transaction. The site never takes custody of anything and never asks for a private key." },
  { title: "NOTHING ON SALE TODAY", body: "No token, no pool, no percentage and no date. The Passport records participation; it is not an investment and nothing here is an offer of a return. If an incentive layer ever ships, it arrives as a separate, clearly labelled design." },
  { title: "THE MODEL IS PUBLIC", body: "The escape circuit, its synapse counts, the wiring check and the game's rules are all readable — you can reproduce the numbers instead of taking them on faith." }
];

export default function ParticipatePage() {
  return <main className="pitchPage docPage">
    <nav className="pitchNav docNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="docNavLinks"><Link href="/pitch">PITCH</Link><Link href="/economics">ECONOMICS</Link><Link href="/participate">PARTICIPATION</Link></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i/><Bi en="PARTICIPATION / THREE WAYS IN" /></div>
      <h1><Bi en={<>Play it.<br/>Or keep a record.<br/><em>Or bring an agent.</em></>} /></h1>
      <p><Bi
        en={<>Playing Fruit Fly World costs nothing and asks for nothing: open the game, and you are in. Everything past that — a soul-bound record of taking part, an agent running the same model — is optional and additive, never a gate in front of the game.</>}
       /></p>
      <div className="pitchHeroActions">
        <a className="secondary" href="#layers"><Bi en="SEE THE LAYERS" /> <span>↓</span></a>
      </div>
      <div className="pitchPromise">
        <span><Bi en="NO ACCOUNT" /></span>
        <span><Bi en="NO INSTALL" /></span>
        <span><Bi en="LOCAL SAVE" /></span>
        <span><Bi en="OPEN MODEL" /></span>
      </div>
    </header>

    <section className="docSection" id="layers">
      <div className="docHead">
        <span><Bi en="01 · THE LAYERS" /></span>
        <div>
          <h2><Bi en={<>The game is the floor.<br/><em>Everything else stacks on it.</em></>} /></h2>
          <p><Bi
            en="Each layer below stands on its own. You can stop at the first one and lose nothing."
           /></p>
        </div>
      </div>
      <div className="docSteps">{layers.map((layer) => <article key={layer.n}><span>{layer.n}</span><div><h3><Bi en={layer.title} /></h3><p><Bi en={layer.body} /></p><small><Bi en={layer.tag} /></small></div></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="02 · THE PASSPORT" /></span>
        <div>
          <h2><Bi en={<>Three ways to get one.<br/><em>None of them are a purchase of value.</em></>} /></h2>
          <p><Bi
            en="The Passport is coming soon, not live: no chain is final, no NFT is being issued and nothing is on sale. The shape below is the intent — a non-transferable record at 4,444 supply, with tiers that make taking part cheaper than not taking part."
           /></p>
        </div>
      </div>
      <div className="docLadder">
        {tiers.map((tier) => <article key={tier.n}><span>{tier.n}</span><h3><Bi en={tier.title} /></h3><b>{tier.price}</b><p><Bi en={tier.body} /></p></article>)}
      </div>
      <div className="docNote"><b><Bi en="COMING SOON — " /></b><Bi
        en="the chain, the contract address and the prices will be published here before anything opens. Until then the numbers on the economics page are a paper model, not a live contract."
       /></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="03 · WHAT IS AND ISN'T CLAIMED" /></span>
        <div>
          <h2><Bi en={<>A record of taking part.<br/><em>Not a promise of return.</em></>} /></h2>
          <p><Bi
            en="Four rules that hold regardless of what happens to the project."
           /></p>
        </div>
      </div>
      <div className="docCards four">{guards.map((guard) => <article key={guard.title}><span>◆</span><h3><Bi en={guard.title} /></h3><p><Bi en={guard.body} /></p></article>)}</div>
    </section>

    <section className="docBoundary">
      <h2><Bi en="Status, stated plainly." /></h2>
      <div>
        <article><b><Bi en="LIVE NOW" /></b><p><Bi en="The playable lineage game, the connectome-inspired escape model, the reproducible wiring check, the deployed Genesis Passport and the documented agent interface." /></p></article>
        <article><b><Bi en="NEXT" /></b><p><Bi en="Deeper mutation behaviour, multi-predator encounters, and seeded daily challenges built on the same generation loop." /></p></article>
        <article><b><Bi en="NOT A CLAIM" /></b><p><Bi en="This is not a complete fruit-fly brain, not a neuron-by-neuron simulation, and not a financial product. No token, yield or future value is promised." /></p></article>
      </div>
    </section>

    <section className="pitchFinal">
      <span><Bi en="THE GAME IS READY TO PLAY" /></span>
      <h2><Bi en={<>One generation.<br/><em>Fifty seconds.</em></>} /></h2>
      <div className="docActions">
        <Link className="secondary" href="/dish#agents"><Bi en="FOR AGENTS" /> <span>→</span></Link>
      </div>
    </section>
    <footer className="pitchFooter">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <p><Bi en="The escape model, its wiring check and the game rules are public. Reproduce the numbers yourself." /></p>
      <div className="docNavLinks"><Link href="/pitch">PITCH ↗</Link><Link href="/economics">ECONOMICS ↗</Link><Link href="/">LIVE WORLD ↗</Link></div>
    </footer>
  </main>;
}
