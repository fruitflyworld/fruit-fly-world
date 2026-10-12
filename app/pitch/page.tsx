import type { Metadata } from "next";
import Link from "next/link";
import { Bi } from "../components/Bi";

export const metadata: Metadata = {
  title: "Fruit Fly World — The Game",
  description: "A living strategy game where humans and AI agents control fruit flies in the same world, using real biology-inspired behaviors to explore, forage, and survive."
};

const loop: { n: string; title: string; body: string }[] = [
  { n: "01", title: "FORAGE", body: "Move toward sugar, yeast and rot. Food becomes energy, and your position on the dish changes the risk of the next second." },
  { n: "02", title: "MANAGE ENERGY", body: "Energy above the laying threshold turns into eggs automatically. The richest food sits where the predator hunts, so the safest route is rarely the fattest one." },
  { n: "03", title: "READ THE LUNGE", body: "The predator approaches, then commits to a ballistic trajectory it will not correct. Watch the approach and wait for the Giant Fiber response to read READY." },
  { n: "04", title: "ESCAPE", body: "Press Space, or tap GF ESCAPE, inside a short window. That one decision is what the whole escape circuit exists to make." },
  { n: "05", title: "CARRY IT FORWARD", body: "At generation end, compare your eggs against the wild type and draft one mutation from three cards. The next fly inherits the consequence." }
];

const circuit: { tag: string; value: string; label: string }[] = [
  { tag: "LC4", value: "2,442 Σ", label: "Angular-velocity neurons. They report how fast a shape is turning across your field of view." },
  { tag: "LPLC2", value: "1,366 Σ", label: "Looming neurons. They report a shape growing in size — something getting closer, fast." },
  { tag: "GIANT FIBER", value: "DNp01", label: "Both streams land on one descending neuron that fires the jump. In the game, that is the READY state." }
];

const trial: { tag: string; value: string; label: string }[] = [
  { tag: "FIXED SEED", value: "1337", label: "Every trial starts from the same seed, so the run is the same run for everyone who repeats it." },
  { tag: "PAIRED TRIALS", value: "200", label: "Real connectivity against swapped connectivity, same seeds, same loomings, same predator." },
  { tag: "THE RESULT", value: "100% vs 68%", label: "Real connectivity escapes 100% of the time with 0.202 s of lead; swapped escapes 68% with 0.183 s. A simplified two-channel assay: the gap says channel order matters in this circuit." }
];

const lineage: { tag: string; value: string; label: string }[] = [
  { tag: "EGGS", value: "VS WILD TYPE", label: "Energy converts to eggs on its own. The generation is scored by how far ahead of the wild type it finished." },
  { tag: "MUTATION DRAFT", value: "3 → 1", label: "Three cards, one choice. Twenty-four mutations exist across the pool, and the one you take changes how the next generation plays." },
  { tag: "THE SAVE", value: "LOCAL", label: "The lineage is written to your browser only. Death ends a generation — it does not end the run." }
];

const boundary: { tag: string; value: string; label: string }[] = [
  { tag: "WHAT IT IS", value: "A MODEL", label: "A simplified, connectome-inspired escape circuit, plus a game built on top of it." },
  { tag: "WHAT IT ISN'T", value: "NOT A BRAIN", label: "Not a complete fruit-fly brain, not a full FlyWire or MaleCNS runtime, and not a neuron-by-neuron simulation." },
  { tag: "WHAT YOU CAN CHECK", value: "RUN IT", label: "The wiring check ships with the game: same seed, real connectivity versus swapped, and the numbers are reproducible." }
];

export default function PitchPage() {
  const tile = (label: string, value: string, note: string, unit?: string) => (
    <article>
      <span><Bi en={label} /></span>
      <b>{value}{unit ? <i> <Bi en={unit} /></i> : null}</b>
      <small><Bi en={note} /></small>
    </article>
  );
  const figure = (tag: string, value: string, label: string) => (
    <article><span><Bi en={tag} /></span><h3>{value}</h3><p><Bi en={label} /></p></article>
  );
  return <main className="pitchPage docPage">
    <nav className="pitchNav docNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="docNavLinks"><Link href="/pitch">PITCH</Link></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i/><Bi en="WHAT THIS IS / IN ONE PAGE" /></div>
      <h1><Bi en={<>A small world.<br/>Real circuits.<br/><em>One lineage.</em></>} /></h1>
      <p><Bi
        en={<>Fruit Fly World is a single-player survival game about being a lineage of fruit flies on a dish that is trying to kill you. You forage under pressure, read a predator&apos;s committed lunge, and trigger the Giant Fiber escape when the reflex is ready. Underneath the game sits one piece of real neurobiology, written out so you can check it.</>}
       /></p>
      <div className="pitchHeroActions">
        <a className="secondary" href="#concept"><Bi en="READ WHAT IT IS" /> <span>↓</span></a>
      </div>
      <div className="pitchPromise">
        <span><Bi en="SINGLE-PLAYER" /></span>
        <span><Bi en="CONNECTOME-INSPIRED" /></span>
        <span><Bi en="DETERMINISTIC MODEL" /></span>
        <span><Bi en="LINEAGE PROGRESSION" /></span>
      </div>
      <figure className="pitchHeroImage"><img src="/launch-film-poster.jpg" alt="Fruit Fly World game world"/><figcaption><Bi en="A fruit fly learns the dish. You can too." /></figcaption></figure>
    </header>

    <section className="gameShowcase" aria-label="Game concept and visual references">
      <div className="docHead">
        <span><Bi en="THE GAME WE ARE MAKING" /></span>
        <div>
          <h2><Bi en={<>A real game first.<br/><em>The model comes second.</em></>} /></h2>
          <p><Bi en="We borrow the readable loop of Vampire Survivors-style roguelites — move, survive, collect, choose an upgrade — then build our own biology-inspired world. Fifty seconds a generation, one predator, three kinds of food, and a mutation draft at the end." /></p>
        </div>
      </div>
      <div className="gameScreens">
        <figure><img src="/launch-film/frames/frame-0294.jpg" alt="Fruit Fly World arena concept"/><figcaption><Bi en="OUR WORLD / FORAGE, FLEE, RETURN" /></figcaption></figure>
        <figure><img src="/launch-film/frames/frame-0519.jpg" alt="Fruit Fly World agent gameplay concept"/><figcaption><Bi en="OUR REFLEX / READ THE LUNGE" /></figcaption></figure>
        <figure><img src="/launch-film/frames/frame-0733.jpg" alt="Fruit Fly World survival game concept"/><figcaption><Bi en="OUR LOOP / RISK OR EXTRACT" /></figcaption></figure>
      </div>
    </section>

    <section className="docTiles" aria-label="The game at a glance">
      {tile("A GENERATION", "50", "LONG AT MOST — THEN THE DRAFT, THEN THE NEXT FLY", "sec")}
      {tile("THE FOOD", "3", "RISK TIERS: SUGAR +12 · YEAST +26 · ROT +38", "tiers")}
      {tile("THE ESCAPE", "2 → 1", "TWO VISUAL STREAMS INTO ONE GIANT FIBER DECISION")}
      {tile("THE MUTATIONS", "24", "CARDS IN THE POOL · THREE OFFERED, ONE TAKEN", "cards")}
    </section>

    <section className="docSection" id="concept">
      <div className="docHead">
        <span><Bi en="00 · THE CORE CONCEPT" /></span>
        <div>
          <h2><Bi en={<>Not a big brain.<br/><em>A few very good circuits.</em></>} /></h2>
          <p><Bi
            en="Fruit flies are small, but their brains are remarkably good at turning smell, light, hunger, and danger into action. We took one of those circuits — the one that decides to jump — and made it the load-bearing piece of a game you can actually play."
           /></p>
        </div>
      </div>
      <div className="docCards four">
        {figure("THE CIRCUIT", "Two streams, one decision", "Angular velocity and looming size are computed separately, then converge on the Giant Fiber. Neither stream alone is the escape.")}
        {figure("THE GAME", "Read it, then act", "The reflex bar fills as the predator commits. You do not dodge continuously — you make one timed decision, the way the circuit does.")}
      </div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="01 · THE PLAY LOOP" /></span>
        <div>
          <h2><Bi en={<>Short decisions.<br/><em>A longer lineage.</em></>} /></h2>
          <p><Bi
            en="Every generation turns a few seconds of reading and acting into a consequence that is carried forward. The rules are explicit, and the whole loop fits in fifty seconds."
           /></p>
        </div>
      </div>
      <div className="docCards">{loop.map((card) => <article key={card.n}><span>{card.n}</span><h3><Bi en={card.title} /></h3><p><Bi en={card.body} /></p></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="02 · THE ESCAPE CIRCUIT" /></span>
        <div>
          <h2><Bi en={<>Two inputs.<br/><em>One jump.</em></>} /></h2>
          <p><Bi
            en="The escape reflex in the game is the one part that is not invented. It follows the visual pathway into the Giant Fiber, with the synapse counts taken from published male brain connectome data."
           /></p>
        </div>
      </div>
      <div className="docCards">{circuit.map((card) => <article key={card.tag}><span><Bi en={card.tag} /></span><h3>{card.value}</h3><p><Bi en={card.label} /></p></article>)}</div>
      <div className="docNote"><b><Bi en="THE NUMBERS — " /></b><Bi
        en="LC4 carries 2,442 synapses and LPLC2 carries 1,366 (counts from Ache et al. 2019, FAFB); together they account for roughly 99.6% of the Giant Fiber's visual input in the MaleCNS v1.0 connectome."
       /></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="03 · THE WIRING CHECK" /></span>
        <div>
          <h2><Bi en={<>Same seed.<br/><em>Real wiring vs swapped.</em></>} /></h2>
          <p><Bi
            en="This is the part you can check without trusting us. Run the same loomings against the real connectivity and against a version with the two channel weights swapped, and see whether the channel order is doing any work. It is a simplified two-channel assay, not an experiment on the connectome."
           /></p>
        </div>
      </div>
      <div className="docCards">{trial.map((card) => <article key={card.tag}><span><Bi en={card.tag} /></span><h3>{card.value}</h3><p><Bi en={card.label} /></p></article>)}</div>
      <div className="docNote"><b><Bi en="RUN IT YOURSELF — " /></b><Bi
        en="The experiment is reachable from the game menu, and the simulation module is plain JavaScript with no build step. Change the seed and the numbers move; keep it and they reproduce exactly."
       /></div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="04 · THE LINEAGE" /></span>
        <div>
          <h2><Bi en={<>Death ends a generation.<br/><em>Not the run.</em></>} /></h2>
          <p><Bi
            en="You are not a fly, you are a lineage. Eggs are the score, mutations are the upgrade, and the wild type is the thing you are trying to outproduce."
           /></p>
        </div>
      </div>
      <div className="docCards">{lineage.map((card) => <article key={card.tag}><span><Bi en={card.tag} /></span><h3>{card.value}</h3><p><Bi en={card.label} /></p></article>)}</div>
    </section>

    <section className="docSection">
      <div className="docHead">
        <span><Bi en="05 · HONEST SCOPE" /></span>
        <div>
          <h2><Bi en={<>Inspired by a circuit.<br/><em>Not a complete brain.</em></>} /></h2>
          <p><Bi
            en="The game uses research-informed names as design references. Saying exactly what it is not is part of the design, not a disclaimer bolted on afterwards."
           /></p>
        </div>
      </div>
      <div className="docCards">{boundary.map((card) => <article key={card.tag}><span><Bi en={card.tag} /></span><h3>{card.value}</h3><p><Bi en={card.label} /></p></article>)}</div>
    </section>

    <section className="pitchFinal">
      <span><Bi en="THE GAME IS READY TO PLAY" /></span>
      <h2><Bi en={<>Give it a signal.<br/><em>See what survives.</em></>} /></h2>
      <div className="docActions">
      </div>
    </section>
    <footer className="pitchFooter">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <p><Bi en="A connectome-inspired playable model — not a claim that a complete biological brain has been rebuilt. The Passport records participation; it is not an investment, and nothing here is an offer of a security or a return." /></p>
      <div className="docNavLinks"><Link href="/">LIVE WORLD ↗</Link></div>
    </footer>
  </main>;
}
