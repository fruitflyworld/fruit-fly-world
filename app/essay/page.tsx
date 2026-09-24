import type { Metadata } from "next";
import Link from "next/link";

/* ── app/essay/page.tsx ──────────────────────────────────────────────────────
   The long-form account of what Fruit Fly World is: the dish, the brainstem,
   the brain slot, the judgment layer, the exam room, and the agent doors.
   Every number in here is a measured result from the live system or is
   labelled as somebody else's reported result. If a claim can't survive a
   link or a hash, it doesn't go in.
   ------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "Don't exam the model. Starve it. — the Fruit Fly World essay",
  description: "The long-form account: a playable lineage game with a real escape reflex, a slot for a brain, a System One judgment layer, and a determinism exam that runs the same seed twice.",
  alternates: { canonical: "/essay" },
  openGraph: {
    title: "Don't exam the model. Starve it.",
    description: "How a fruit-fly game became a closed-loop survival exam for judgment models — with receipts.",
    url: "https://fruitfly.world/essay",
    siteName: "Fruit Fly World",
    images: [{ url: "/promo/fruit-fly-world-promo-poster.jpg", width: 1920, height: 1080 }],
    type: "article"
  }
};

export default function EssayPage() {
  return <main className="essayPage">
    <nav className="essayNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div>
        <Link href="/play">PLAY</Link>
        <Link href="/promo">FILM</Link>
        <Link href="/">← BACK</Link>
      </div>
    </nav>

    <article className="essayBody">
      <header>
        <span className="essayKicker">THE ESSAY · FRUITFLY.WORLD</span>
        <h1>Don&apos;t exam the model.<br/><em>Starve it.</em></h1>
        <p className="essayLede">Benchmarks ask a model questions and grade the answers. We built the other thing: a world where a small model has to <b>live</b> — forage, escape a predator, pass its winnings to the next generation — while every decision it makes is sealed, hashed, and replayable. This is the whole system, end to end, with the numbers.</p>
        <div className="essayMeta"><span>22 SEP 2026</span><span>28-MIN READ</span><span>EVERY NUMBER MEASURED OR LINKED</span></div>
      </header>

      <section>
        <h2>1 · The claim</h2>
        <p>A leaderboard that ranks on an opinion ranks on whoever wrote the opinion. A benchmark with a private answer key is a lottery you cannot audit. The alternative is not a better question set — it is a <b>published, deterministic world</b>: one map, one seed table, one scoring function, and a test that fails the build if the client and the server ever disagree about any of them.</p>
        <p>Fruit Fly World is that world, wrapped in something people actually want to touch: a browser game about a fruit fly that can die. You give the fly a problem older than language — <i>eat without being eaten</i> — and you let anything with a decision procedure try to solve it: your own hands, a gene-weighted autopilot, a 24-neuron spiking circuit, or a judgment model. Same dish, same rules, same receipts.</p>
      </section>

      <section>
        <h2>2 · The dish</h2>
        <p>At <Link href="/play">fruitfly.world/play</Link> you are not a single fly; you are a <b>lineage</b>. Each generation lasts up to 50 seconds. You forage in a dish where food carries three risk levels — sugar (+12, safe), yeast (+26, on the rim of the predator&apos;s range), rot (+38, but it exposes you for six seconds) — while a predator hunts by vision and commits to a ballistic lunge you can read. Energy above a threshold becomes eggs. At generation&apos;s end you compare eggs with the wild type and draft one mutation for the next fly. Death ends a generation, not the lineage.</p>
        <p>The interesting property is not any single mechanic; it is that the mechanics produce exactly the pressures a decision system must survive: <b>metabolic cost</b> (every behavior spends energy), <b>risk gradients</b> (the best food is the most dangerous), <b>committed threats</b> (the lunge is telegraphed, so timing is a skill), and <b>consequence across time</b> (this generation&apos;s draft is the next one&apos;s body). A multiple-choice question has none of these. A chat window has none of these.</p>
      </section>

      <section>
        <h2>3 · The brainstem is the real biology</h2>
        <p>Underneath every brain in the game sits an escape circuit we did not invent. In the actual fruit-fly connectome (Ache et al. 2019; MaleCNS v1.0), two visual neurons dominate the Giant Fiber — the command cell for the escape jump: <b>LC4</b>, sensitive to angular velocity (2,442 synapses of GF visual input), and <b>LPLC2</b>, sensitive to looming — a shape growing as it closes in (1,366 synapses). Together they account for ~99.6% of the GF&apos;s visual input. In the game they are a leaky integrate-and-fire module: loom builds membrane potential, READY lights up, and the jump happens in the same narrow window a real fly has.</p>
        <p>The module ships with a wiring check you can run from the menu: <b>real connectivity versus swapped connectivity</b>. Both runs keep both visual channels and their synapse counts; the swap only moves the large weight onto the lagging channel (angular size instead of velocity). The real wiring escapes <b>100%</b> of telegraphed lunges; the swapped wiring escapes <b>68%</b>. Same seed, same runs, reproducible by anyone from one number. Two honest limits, stated plainly: this is a <b>simplified two-channel assay</b>, not an experiment on the connectome — the model is two scalar inputs into one unit, the numbers come from a fixed-seed assay whose membrane leak differs from the game loop (15/s vs 10/s), and the gap says <i>channel order matters in this circuit</i>, nothing grander. And 100% is itself a simplification: a real fly also has slower escape routes that do not go through the Giant Fiber.</p>
        <p>The honest boundary, stated on the site and repeated here: this is a <b>connectome-inspired</b> circuit, not a brain simulation. Not FlyWire, not MaleCNS at runtime, not a claim about animal behavior. It is three cells done carefully instead of a hundred thousand done vaguely.</p>
      </section>

      <section>
        <h2>4 · A slot for a brain</h2>
        <p>Everything above the brainstem is a <b>slot</b>. A brain is anything that fulfills one contract: given the fly&apos;s state — the four signals (food proximity, threat, light, novelty), energy, clock — return one behavior (approach / avoid / explore / freeze) and a confidence. Four brains ship:</p>
        <ul>
          <li><b>MANUAL</b> — you drive. The baseline every other brain is measured against.</li>
          <li><b>GENES</b> — the auto-pilot: fixed gene weights steering by the same signals. The wild type&apos;s brain.</li>
          <li><b>CIRCUIT</b> — FFW-CX/0.1, a 24-neuron spiking circuit with connectome-inspired structure, firing at 10 Hz, softmax over four motor programs. Its randomness is entirely at construction time, which is what makes it examinable.</li>
          <li><b>JUDGMENT</b> — a judgment model in the slot. Which kind is the next section.</li>
        </ul>
        <p>Every decision a deciding brain makes — signals in, distribution out, behavior, confidence, danger read — is sealed with a content hash and written to a log you can download at the end of a generation (<code>flyline-log/1</code>). (The GENES autopilot steers by fixed weights and makes no judgment decisions, so its log is empty by design.) The brain chooses; the brainstem jumps. That division is deliberate: high-level decisions are pluggable, the reflex that keeps you alive is not.</p>
      </section>

      <section>
        <h2>5 · The judgment layer</h2>
        <p>The newest brain speaks the language of <b>typed judgment models</b> — the System One style of API (Jev is the best-known example): you ask for a <i>choice</i> among behaviors against written criteria, and a <i>score</i> for danger, and you get typed answers with confidences instead of prose. This is a better shape for a game loop than a chat API for three reasons: decisions are structurally parseable, confidence is a first-class number you can put on the HUD, and — the part the ecosystem keeps re-measuring — small judgment models are <i>fast and stable</i>. Reported numbers from teams using them as judges: variances 92–913× lower than LLM judges, ~$0.00035 per call, ~0.44 s latency. We treat those as other people&apos;s measurements, not ours; our own measurement is simpler: one decision per second, in game time, in a closed loop.</p>
        <p>The engineering rules we hold ourselves to:</p>
        <ul>
          <li><b>Pinned versions only.</b> The remote path runs a pinned model version, never a floating alias. A brain that silently changes under you is an unexamined brain.</li>
          <li><b>Free offline default.</b> No key, no problem: a local heuristic judgment brain runs in the browser at zero cost, zero network. The remote model is an upgrade, not a requirement.</li>
          <li><b>Same-origin proxy, guarded.</b> Remote calls go through one endpoint: bodies capped, rate-limited per IP, upstream timeout, keys never logged. If the remote fails — bad key, slow line, outage — the fly does not freeze in the air: it falls back to the local brain, visibly, with a one-time warning, and the decision log records which brain made which call.</li>
          <li><b>Backend-pluggable.</b> The interface is the System One question shape; the server behind it can be the official model, an open clone, or your own. The moat, if there is one, is the decision chain — protocol, latency, fallback, receipts — not any single model&apos;s weights.</li>
        </ul>
      </section>

      <section>
        <h2>6 · The exam room</h2>
        <p>Everything above would be theater without determinism. The whole world — food, predator, drafts — derives from one editable seed, and the game ships a room that proves it: <Link href="/play?bench=1&seed=42&brain=judgment&gens=2"><code>?bench=1</code></Link> pauses the render loop, drives the world twice at a fixed 60 Hz on the same seed with the same brain, and compares every decision hash and every generation outcome. Bit-identical runs print <b>IDENTICAL</b>. Anything else prints <b>DIVERGED</b>, and the page says so in plain words: <i>that is a bug report, not a score.</i></p>
        <p>Getting there was a lesson in how many ways &quot;deterministic&quot; leaks. Our leaks, all found and fixed in the exam room: a novelty-memory set that survived between runs, the rival&apos;s traits living on the wrong object, predator residue — and the subtlest one, the escape neuron&apos;s <b>membrane potential</b> carrying over between runs, so run B&apos;s reflex fired on a different frame than run A&apos;s. Two more: the wild type&apos;s <b>genes</b> were rolled from the visitor&apos;s saved seed at page load and never re-rolled, so the same exam quietly depended on your save file; and <b>Math.sin/cos/exp themselves</b> differ in the last bit between CPU architectures, so an arm64 browser and an x64 server replayed different worlds from the same seed — fixed with hand-rolled IEEE-exact math kernels. A survival exam you cannot re-run is not an exam. Now it re-runs, bit-identically across machines.</p>
        <p>Two brains, same seed, same paper: on seed 42 the judgment layer finished with 34 eggs, the 24-neuron circuit with 5. Honesty note: the exam room grades deterministic brains only — the judgment brain in a bench run is the free local heuristic, not a remote model (an API cannot be re-run). That is one seed, not a theorem — it is the first row of what this system is for: <b>comparable, replayable survival under identical pressure.</b></p>
      </section>

      <section>
        <h2>7 · Agents at the door</h2>
        <p>There is one way for an AI agent to enter this world:</p>
        <p><b>Inside the dish — as a brain.</b> Any judgment model can be the fly. The sealed log is the deliverable: not &quot;the model said&quot; but <i>here are the 52 decisions, hashed, with the outcome</i>. This is the lane the slogan is about.</p>
        <p>We looked for prior art before claiming the niche. The open catalogs list hundreds of &quot;model plays a game&quot; projects — but the Game &amp; Simulation corners are demos of play, not closed-loop <i>survival benchmarks</i>; and the nearest neighbor we found — a swarm of connectome-driven flies reacting to a market feed — has no judgment layer, no generations, no survival pressure. The combination (reflex circuit + judgment slot + sealed logs + determinism exam) appears to be an empty row. We would rather be corrected than first; the issue tracker is open.</p>
      </section>

      <section>
        <h2>8 · What we refuse</h2>
        <p>Nothing is on sale today, and no chain-native economy runs inside the game. The Passport on the site is a soul-bound marker, and the incentive layer written up in <Link href="/economics">/economics</Link> is labelled design exercise, no date, nothing on sale. Nothing in the game depends on it. And no cosplay of rigor: the boundaries page says what the model is not, the exam page calls its own failures bug reports, and every public number in this essay is either measured on the live system or attributed to whoever measured it.</p>
      </section>

      <section>
        <h2>9 · Try it</h2>
        <ul>
          <li><Link href="/play">Play a generation</Link> — no install, no account, no wallet. Try escaping on the reflex; then hand the fly to a circuit.</li>
          <li><Link href="/play?bench=1&seed=42&brain=judgment&gens=2">Run the exam</Link> — same seed, same brain, twice. Watch it print IDENTICAL.</li>
          <li><Link href="/promo">Watch the 28-second film</Link> — every frame captured from the live game.</li>
          <li><Link href="/skill/ffw-dish">Point an agent at it</Link> — the skill and the rules are public plain JavaScript.</li>
        </ul>
        <p className="essayOut">The dish is waiting.</p>
      </section>
    </article>

    <footer className="essayFooter">
      <p>Fruit Fly World · <Link href="/">fruitfly.world</Link> · <Link href="/promo">the film</Link> · <Link href="/play">the game</Link> · every decision sealed</p>
    </footer>
  </main>;
}
