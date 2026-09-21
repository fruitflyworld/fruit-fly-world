import type { Metadata } from "next";
import Link from "next/link";

/* ── app/promo/page.tsx ─────────────────────────────────────────────────────
   The 28-second promo film. Every shot in it is a real artifact of the game:
   the clip is the live /play canvas, the stills are browser captures, the
   exam verdict is a genuine ?bench=1 double run. The page says so, because
   a promo that looks rendered when it isn't would be the one false claim.
   ------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "Fruit Fly World — Don't exam the model. Starve it.",
  description: "The 28-second film: one dish, one predator, four brains — and a determinism exam that runs the same seed twice. All footage captured from the live game.",
  alternates: { canonical: "/promo" },
  openGraph: {
    title: "Don't exam the model. Starve it.",
    description: "A 28-second film of the dish, the brains, and the exam room. Every frame is captured from the live game.",
    url: "https://fruitfly.world/promo",
    siteName: "Fruit Fly World",
    images: [{ url: "/promo/fruit-fly-world-promo-poster.jpg", width: 1920, height: 1080 }],
    type: "video.other"
  }
};

const beats = [
  ["00:00", "THE CLAIM", "Don't exam the model. Starve it. A benchmark asks a model questions; a world makes it live."],
  ["00:05", "THE DISH", "Forage, read the predator's committed lunge, escape on the Giant Fiber reflex, carry the lineage forward."],
  ["00:11", "THE RECEIPTS", "Every signal in, one behavior out — sealed with a content hash, downloadable at the end of every generation."],
  ["00:15", "THE BRAINS", "The fly's brain is a slot: your hands, the genes auto-pilot, a 24-neuron spiking circuit, or a judgment model."],
  ["00:18", "THE EXAM", "Same seed, run twice at a fixed 60 Hz. Identical decision hashes or it's a bug report, not a score."],
  ["00:24", "THE DOOR", "fruitfly.world/play — no install, no account, no wallet."]
];

export default function PromoPage() {
  return <main className="promoPage">
    <nav className="promoNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div><Link href="/play">PLAY THE GAME</Link><Link href="/">← BACK TO THE WORLD</Link></div>
    </nav>

    <header className="promoHead">
      <div className="promoKicker"><i/> THE 28-SECOND FILM</div>
      <h1>Don&apos;t exam the model.<br/><em>Starve it.</em></h1>
      <p>Every shot in this film is a real artifact: the gameplay is the live game canvas, the HUD and the brain menu are browser captures, and the exam verdict is a genuine <code>?bench=1</code> double run. Nothing here is a render of a thing that doesn&apos;t exist.</p>
    </header>

    <div className="promoPlayer">
      <video controls autoPlay muted loop playsInline poster="/promo/fruit-fly-world-promo-poster.jpg">
        <source src="/promo/fruit-fly-world-promo.mp4" type="video/mp4"/>
      </video>
      <div className="promoPlayerBar">
        <span>SOURCE · LIVE GAME CAPTURE · 1920×1080 · 28 S</span>
        <a href="/promo/fruit-fly-world-promo.mp4" download>DOWNLOAD MP4 ↧</a>
      </div>
    </div>

    <section className="promoBeats">
      {beats.map(([t, title, body]) => <article key={t}>
        <span>{t}</span>
        <h3>{title}</h3>
        <p>{body}</p>
      </article>)}
    </section>

    <section className="promoFinal">
      <Link className="primary" href="/play">PLAY IT YOURSELF <span>↗</span></Link>
      <Link className="secondary" href="/play?bench=1&seed=42&brain=judgment&gens=2">RUN THE EXAM <span>→</span></Link>
    </section>

    <footer className="promoFooter">
      <p>Fruit Fly World · <Link href="/">fruitfly.world</Link> · every frame captured from the live game</p>
    </footer>
  </main>;
}
