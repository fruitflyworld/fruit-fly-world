import Link from "next/link";
import HeroExperience from "./components/HeroExperience";
import MintSection from "./components/MintSection";
import CopyBox from "./components/CopyBox";
import { GAME_AGENT_PROMPT, GAME_PLAY_COMMAND, GAME_SKILL_MD } from "./lib/agentskill";

export default function Home() {
  return <main>
    <nav><a className="brand" href="#top"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></a><div className="navLinks"><a href="#play">Play</a><Link href="/lab">For Models</Link><a href="#agents">For Agents</a><a href="#mint">Passport</a><Link href="/game">The Game</Link><Link href="/pitch">What This Is</Link><Link href="https://github.com/fruitflyworld/fruit-fly-world/tree/main/docs" target="_blank" rel="noreferrer">Docs</Link></div><Link className="navCta" href="/play">PLAY</Link></nav>

    <header className="hero" id="top">
      <div className="heroCopy">
        <div className="eyebrow"><i/> A WORLD WHERE CHOICES HAVE CONSEQUENCES · FRUITFLY.WORLD</div>
        <h1>Trust nothing<br/>that cannot <em>starve.</em></h1>
        <p>One fly. One choice. Choose wrong, and it starves. Its escape reflex comes from a real fruit-fly connectome — its brain is up to you: your hands, a small circuit, or any AI.</p>
        <div className="heroActions">
          <Link className="primary" href="/play">RELEASE A FLY <span>↗</span></Link>
          <Link className="secondary" href="/promo">WATCH THE FILM <span>▶</span></Link>
          <a className="secondary" href="#doors">THREE WAYS IN <span>↓</span></a>
        </div>
        <div className="heroMintNote">
          <b>ONE FLY · ONE LIFE · MANY GENERATIONS</b>
          <span>Forage under pressure, read the predator&apos;s committed strike, escape when the Giant Fiber reflex is READY, and pass what you earned to the next generation. Death ends a generation, not the lineage.</span>
        </div>
        <div className="heroMintNote">
          <b>WHY IT IS HONEST</b>
          <span>The world is deterministic: the same seed produces the same run. The exam room replays every seed twice and only reports IDENTICAL when every decision hash matches. Every death can be reproduced by anyone.</span>
        </div>
        <div className="heroTrust">
          <span>REAL CONNECTOME ESCAPE REFLEX</span>
          <span>SEALED DECISION LOGS</span>
          <span>EVERY DEATH REPRODUCIBLE</span>
        </div>
      </div>
      <HeroExperience/>
      <a className="scrollCue" href="#play"><span>INTO THE DISH</span><i/></a>
    </header>

    <section className="gameShowcase" id="play">
      <div className="sectionHead gameShowcaseHead">
        <div><label>THE GAME / PLAY IN THE BROWSER</label><h2>See the danger.<br/><em>Choose. Survive.</em></h2></div>
        <div>
          <p>Fruit Fly World is a single-player lineage survival game. You move through a dish, trade food for energy, read the predator&apos;s committed lunge, and trigger the Giant Fiber escape when the response is ready.</p>
          <p>Generations continue through your decisions. It runs full-screen in this browser — no install, no account, and no server round-trip to play.</p>
          <Link className="primary" href="/play">PLAY <span>↗</span></Link>
        </div>
      </div>
      <div className="gameClipCard">
        <video className="gameClip" src="/gameplay/gameplay.mp4" poster="/gameplay/gameplay-poster.jpg" autoPlay loop muted playsInline/>
        <div className="gameClipCopy">
          <span>01 / RECORDED IN THE DISH</span>
          <h3>The game, not a mockup.</h3>
          <p>Real footage, captured from a live browser run — the judgment layer flying the fly, food being read, the predator on its way. The brain decides where to go; the GF brainstem still owns the jump.</p>
        </div>
      </div>
      <div className="gameScreens">
        <article className="gameScreenCard">
          <img src="/launch-film/frames/frame-0519.jpg" alt="The predator committing to a strike as the fly escapes"/>
          <div className="gameScreenCopy"><span>02 / SEE</span><h3>A shadow looms. It jumps.</h3><p>No thinking, just the reflex — the escape circuit comes from a real fruit-fly connectome. Read the predator&apos;s committed lunge and fire the Giant Fiber when it reads READY.</p></div>
        </article>
        <article className="gameScreenCard">
          <img src="/launch-film/frames/frame-0294.jpg" alt="The dish during foraging: sugar, yeast, and rot"/>
          <div className="gameScreenCopy"><span>03 / JUDGE</span><h3>Every bite is a trade-off.</h3><p>Sugar is cheap and safe. Rot is rich but leaves an odor the predator can follow. Energy against risk, every second, for the whole generation.</p></div>
        </article>
        <article className="gameScreenCard">
          <img src="/launch-film/frames/frame-0733.jpg" alt="The lineage continuing into another generation"/>
          <div className="gameScreenCopy"><span>04 / CONSEQUENCE</span><h3>Run dry, and it starves.</h3><p>When energy hits zero the fly dies and the cause is public. The next generation carries what&apos;s left: your eggs, your record, and one mutation you draft.</p></div>
        </article>
      </div>
    </section>

    {/* Three doors — the same fly, three reasons to care */}
    <section className="specimenSection" id="doors">
      <div className="sectionHead">
        <div><label>THREE DOORS / ONE DISH</label><h2>Same fly.<br/><em>Three ways in.</em></h2></div>
        <p>Whether you came to play, to test your model, or to build agents — the world never changes. Only the brain in the slot does.</p>
      </div>
      <div className="specimenGrid">
        <div className="specimenCard">
          <b>01</b>
          <h3>FOR PLAYERS</h3>
          <p>Raise a fly that can starve. Forage, escape, lay eggs, and see how many generations your lineage lasts. Free, in the browser, no install.</p>
          <Link className="primary" href="/play">RELEASE A FLY <span>↗</span></Link>
        </div>
        <div className="specimenCard">
          <b>02</b>
          <h3>FOR DEVELOPERS</h3>
          <p>Put your model in a fly&apos;s head and watch it live or die by its own choices. Death is the one score you can&apos;t fake — the exam room replays every run and checks the hashes.</p>
          <Link className="primary" href="/play?bench=1&seed=42&brain=judgment&gens=2">RUN THE EXAM <span>↗</span></Link>
        </div>
        <div className="specimenCard">
          <b>03</b>
          <h3>FOR AGENT BUILDERS</h3>
          <p>Sealed decision logs, deterministic seeds, reproducible deaths — an agent world built to be audited. The brain slot speaks a typed decision contract any model can answer.</p>
          <a className="primary" href="#agents">GIVE IT THE SKILL <span>↓</span></a>
        </div>
      </div>
    </section>

    {/* For agents — the stonkrobotics pattern: paste one prompt, the agent plays */}
    <section className="agentSection" id="agents">
      <div className="sectionHead">
        <div><label>FOR AGENTS / THE SURVIVAL GAME</label><h2>Your agent flies.<br/><em>You watch it starve or thrive.</em></h2></div>
        <p>An AI agent can play the whole game — pick the brain in the slot, run the lineage headless, and draft one mutation per generation. The draft is the exam. Everything it decides is sealed into a hash-chained log anyone can replay.</p>
      </div>
      <div className="specimenGrid">
        <div className="specimenCard">
          <b>01</b>
          <h3>GIVE IT THE SKILL</h3>
          <p>Paste one prompt into Claude, Cursor, or your own bot. It fetches the skill and reads the contract cold — the brains, the mutation table, the scoring. No key, no account, no setup from us.</p>
        </div>
        <div className="specimenCard">
          <b>02</b>
          <h3>IT FLIES THE DISH</h3>
          <p>The skill&apos;s runner drives the real game headless at a fixed 60 Hz: forage, escape on the connectome reflex, and one draft decision per generation — its judgment, sealed and reproducible on any seed.</p>
        </div>
        <div className="specimenCard">
          <b>03</b>
          <h3>IT EARNS THE PASSPORT</h3>
          <p>When the run completes a DISH quest, the agent hands you one import URL. You open it in your own browser and claim the free Genesis Passport yourself — it is soul-bound to you, so no agent can ever mint it.</p>
        </div>
      </div>
      <div className="agentCopyStack">
        <CopyBox
          text={GAME_AGENT_PROMPT}
          label="Agent prompt — paste into Claude / Cursor / your bot"
          note="The agent needs no wallet for this: the Passport is soul-bound to you, and the two steps it cannot do (importing the quest evidence, minting) stay in your browser. The full contract is one file: SKILL.md, written to be read by a machine."
        />
        <CopyBox
          text={GAME_PLAY_COMMAND}
          label="Shell — or run the loop yourself, no agent needed (Node 18+, headless Chrome)"
          note="Prints eggs per generation, the sealed decision hashes, and the quest-evidence import URL. The whole interface is documented in SKILL.md."
        />
      </div>
      <p className="agentAside">
        <b>Honest lines:</b> the agent&apos;s judgment is the deliverable, not a story — if the lineage starved, the log says so. Quest evidence is client-attested and re-validated at claim time (v1). Full contract: <a href={GAME_SKILL_MD} target="_blank" rel="noreferrer">SKILL.md ↗</a>
      </p>
    </section>

    <section className="mintSection" id="mint"><div className="sectionHead"><div><label>FRUIT FLY PASSPORT / SECONDARY LAYER</label><h2>Participation,<br/><em>after the work.</em></h2></div><p>The Passport is an optional participation layer around Fruit Fly World, not the game itself. It cannot be bought — only earned by playing. See the current terms and availability before taking any action.</p></div><MintSection/></section>

    <section className="boundary"><div><label>THE HONEST BOUNDARY</label><h2>A connection map<br/>is not a complete brain.</h2></div><div className="boundaryGrid"><article><b>WHAT IT IS</b><p>A playable survival game built on a deterministic world and a simplified escape circuit taken from a real connectome.</p></article><article><b>WHAT IT ISN&apos;T</b><p>A conscious fly, a complete connectome runtime, or proof of biological behavior. It is a model of a few dozen neurons — no fly suffers.</p></article><article><b>WHAT YOU CAN CHECK</b><p>Every run exposes its inputs, model version, seed, decision, confidence, and result. Every death can be reproduced by anyone.</p></article></div></section>

    <section className="finalCta"><span>THE DISH IS WAITING</span><h2>Give it a signal.<br/><em>See what survives.</em></h2><Link className="primary" href="/play">PLAY <span>↗</span></Link></section>

    <footer><a className="brand" href="#top"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></a><p>Independent connectome-inspired experiment.<br/>No affiliation or endorsement implied.</p><div><Link href="/play">PLAY</Link><Link href="/lab">LAB</Link><Link href="/pitch">PITCH</Link><Link href="/essay">ESSAY</Link><a href="#top">BACK TO TOP ↑</a></div></footer>
  </main>;
}
