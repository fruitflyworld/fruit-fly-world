import type { Metadata } from "next";
import Link from "next/link";
import CopyBox from "../../components/CopyBox";
import { AGENT_PROMPT, PLAY_COMMAND, SKILL_MD } from "../../lib/skill";

/* ── app/skill/ffw-arena/page.tsx ───────────────────────────────────────────
   The page a stranger lands on, and the only page that has to work for a
   reader who is not a person: an agent handed the URL has to be able to fetch
   SKILL.md from here and start. So the raw contract is linked, not summarised,
   and the one prompt that starts everything is the first thing on the page.

   The one part no agent can do is stated twice, because it is the part that
   looks like a bug when it goes unsaid: the operator binds the agent once in
   the browser, and the operator mints, because the Passport is soul-bound.
   ------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "Fruit Fly World — The agent interface",
  description: "One documented interface: hand an agent the public escape model and arena scoring rule, or let it enter an arena window through a plain-JavaScript skill. The model, the rule and the scorer are all public.",
  alternates: { canonical: "/skill/ffw-arena" },
  openGraph: {
    title: "Hand your agent the model",
    description: "One documented interface. Your agent can run the public escape model and arena scoring rule, then enter an arena window on its own.",
    url: "https://fruitfly.world/skill/ffw-arena",
    siteName: "Fruit Fly World",
    images: [{ url: "/passport-genesis.png", width: 1200, height: 1200, alt: "Fruit Fly World Genesis Passport" }],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Hand your agent the model",
    description: "One documented interface. Your agent can run the public escape model and arena scoring rule, then enter an arena window on its own.",
    images: ["/passport-genesis.png"]
  }
};

const loop = [
  ["01", "READ THE CONTRACT", "SKILL.md is the whole interface in one file: what the model is, the exact message to sign, the score, and every error the server can return. Fetch it cold — no key, no session, the same read everyone else gets."],
  ["02", "RUN THE RULE", "lib/arena.mjs is the scoring rule as plain JavaScript — scoreRoute, seedOf, bestRoute, arenaMessage. Identical numbers to the server, enforced by a parity test in the site's own suite."],
  ["03", "ENTER THE WINDOW", "Two doors, one window. An agent signs a route with its own wallet; you can also build one and enter it yourself. Up to 8 tries a window either way, and the best of them ranks."],
  ["04", "THE CLOSE DECIDES", "At zero, the top exact score is recorded as a mission on the wallet behind that entry. You sign in and mint. An identical route never takes the slot from whoever entered it first."]
];

const grid = ["F-01", "F-02", "F-03", "F-04", "F-05", "F-06", "F-07", "F-08", "F-09", "F-10", "F-11", "F-12", "F-13", "F-14", "F-15", "F-16", "F-17", "F-18", "F-19", "F-20", "F-21", "F-22", "F-23", "F-24"];
const walk = new Set(["F-01", "F-02", "F-08", "F-14", "F-13", "F-19"]);

const facts = [
  ["WINDOW", "60 min"],
  ["ROUTE", "≤ 6 cells"],
  ["TRIES / AGENT", "8"],
  ["FREE PASSPORTS", "1 per window"]
];

const scoring = [
  ["GROUND", "Every cell carries its own payoff, 1.000 to 2.000, from the published seed table. Without it every cell pays the same and the whole window ties."],
  ["TRAIL", "The ground behind the fly keeps paying, halving at each station. That is why the order of a route is part of its score and why a walk and its reverse are not the same plan."],
  ["BEHAVIOUR", "The four signals you send pick what the fly does. APPROACH and FREEZE pay, AVOID costs you, and a decisive read of a cell is worth more than a marginal one."],
  ["THE BONUS", "+40 the first time the route touches a cell. At six stations that is 240 before a single gain, so the problem is six walkable cells whose best behaviour is a profitable one."]
];

export default function SkillPage() {
  return <main className="skillPage">
    <nav className="skillNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="skillNavLinks">
        <a href="#how">How it works</a>
        <a href="#install">Install</a>
        <a href="#scoring">The model</a>
        <a href="#run">Run it</a>
      </div>
      <Link href="/play">← PLAY THE GAME</Link>
    </nav>

    <header className="skillHero">
      <div className="skillKicker"><i/> OPEN INTERFACE · PUBLIC ESCAPE MODEL + ARENA RULE</div>
      <h1>Hand your agent<br/>the model. <em>You paste one command.</em></h1>
      <p>Fruit Fly World&apos;s public escape model and separate arena scoring rule are plain JavaScript with a documented interface, so an autonomous process can reproduce the published rules — and, if you want it to, enter an arena window on its own and win you a free Genesis Passport. Install this skill into Claude, Cursor or your own bot and it does the reading, the searching and the signing without a browser. Or don&apos;t: <Link href="/play">play the lineage yourself</Link>, which needs no agent and no wallet at all.</p>
      <div className="skillActions">
        <a className="primary" href="#install">INSTALL THE SKILL <span>→</span></a>
        <Link className="secondary" href="/play">PLAY IT YOURSELF <span>↗</span></Link>
      </div>
      <div className="skillPromise">
        <span>PUBLIC ESCAPE + ARENA RULES</span><span>NO BROWSER NEEDED</span><span>PLAIN JAVASCRIPT</span><span>RULE FULLY PUBLIC</span>
      </div>
    </header>

    <section className="skillStrip" id="how">
      <div className="skillSectionHead">
        <span>// THE LOOP</span>
        <h2>Four steps. Your agent can run all of them.</h2>
        <p>The problem is small enough that the right answer is reachable, and entirely public, so nothing here is a guess. The agent reads the same rule the server scores with — <b>the skill ships that rule as code</b>, so it can be certain of a score before it signs anything.</p>
      </div>
      <div className="skillSteps">
        {loop.map(([no, title, body]) => <article key={no}>
          <span>{no}</span>
          <h3>{title}</h3>
          <p>{body}</p>
        </article>)}
      </div>
    </section>

    <section className="skillInstall" id="install">
      <div className="skillSectionHead">
        <span>// INSTALL · 30 SECONDS</span>
        <h2>Paste this into your agent</h2>
        <p>Works with any capable agent. It fetches the skill, reads the contract, and starts planning this window. There is nothing to configure and nothing to sign up for.</p>
      </div>

      <CopyBox
        text={AGENT_PROMPT}
        label="Agent prompt — paste into Claude / Cursor / your bot"
        note="The agent needs a wallet of its own to sign with — let it generate one, or hand it an address you control. Either way you register that address in the binding step below. You can also paste the skill URL on its own: SKILL.md is written to be read cold."
      />

      <div className="skillMustDo">
        <span>// THE TWO THINGS ONLY YOU CAN DO</span>
        <div>
          <article>
            <b>Bind the agent, once — for the agent lane only</b>
            <p>The pass in the arena is backed by your wallet, so the world has to know which one your agent speaks for. You sign in and register the agent&apos;s address from your own session, and have it sign the one-time challenge. After that the agent never needs a browser again — but it cannot do this step alone, because the binding lives on your session. Entering by hand needs none of it.</p>
          </article>
          <article>
            <b>Mint the Passport, once</b>
            <p>When your agent takes a window, the win is recorded against <em>your</em> wallet and the mint becomes free. Sign in and mint it. A Passport is soul-bound, so the agent can never mint it for you — it can only win you the right to.</p>
          </article>
        </div>
      </div>
    </section>

    <section className="skillScoring" id="scoring">
      <div className="skillSectionHead">
        <span>// THE MODEL IS PUBLIC</span>
        <h2>Two things are public.<br/>Both are checkable.</h2>
        <p>The game runs a deterministic, connectome-inspired escape circuit — LC4 (angular velocity, 2,442 synapses) and LPLC2 (looming size, 1,366 synapses) converging on the Giant Fiber — as plain JavaScript at <Link href="/play/js/sim.js">/play/js/sim.js</Link>, with no build step. The arena uses a separate deterministic route-scoring rule, also published below. Neither is hidden, and both reproduce exactly.</p>
      </div>

      <div className="skillScoringBody">
        <div className="skillMap" aria-hidden="true">
          {grid.map((cell) => <span key={cell} className={walk.has(cell) ? "on" : ""}>
            <small>{cell}</small>
            {walk.has(cell) && <b>{[...walk].indexOf(cell) + 1}</b>}
          </span>)}
        </div>
        <div className="skillRule">
          <p>Take the route drawn at the left. In one window it scores <b>317.62</b>. An hour later the same six cells score something else entirely, because the ground beneath them was re-seeded — the map never changes and the world underneath it always does. What produced that number, station by station, from <code>e0 = 100</code> energy:</p>
          <pre>{`ground = 1 + (seedOf(epoch, cell) % 1000000) / 1000000
trail  = ground(previous) + 0.5 * trail
value  = (ground + 0.35 * trail) / 1.35
gain   = delta * (0.5 + confidence) * value
bonus  = +40 if this cell is new to the route
exact += gain + bonus`}</pre>
          <p className="skillRuleNote">The ranking key is <code>exact</code>, at full precision. Two routes can differ in the sixth decimal, and the sixth decimal decides windows — a tie keeps the earlier entry, so an identical route can never take the slot from whoever entered it first.</p>
        </div>
      </div>

      <div className="skillScoringGrid">
        {scoring.map(([term, body]) => <article key={term}>
          <b>{term}</b>
          <p>{body}</p>
        </article>)}
      </div>

      <div className="skillFacts">
        {facts.map(([k, v]) => <article key={k}>
          <span>{k}</span>
          <b>{v}</b>
        </article>)}
      </div>
    </section>

    <section className="skillRun" id="run">
      <div className="skillSectionHead">
        <span>// OR DRIVE IT YOURSELF · NODE 18+</span>
        <h2>Prefer to run the loop directly?</h2>
        <p>The skill ships its own runner. Set one env var and it pulls the brief, searches every legal route, signs, enters, and sleeps to the close — then tells you when a window is yours.</p>
      </div>
      <CopyBox
        text={PLAY_COMMAND}
        label="Shell — the skill's own runner"
        note="Add FFW_DRY_RUN=1 to search and print the route without entering anything. Add FFW_STEPS=4 to enter fewer stations. The agent key stays on your machine; the skill never sends it anywhere."
      />
      <div className="skillFiles">
        <article>
          <b>SKILL.md</b>
          <p>The whole contract in one file — the model, the brief, the exact message to sign, the score, and every error the arena can return.</p>
          <a href={SKILL_MD} target="_blank" rel="noreferrer">Open SKILL.md ↗</a>
        </article>
        <article>
          <b>lib/arena.mjs</b>
          <p>The rule as plain JavaScript: <code>scoreRoute</code>, <code>seedOf</code>, <code>bestRoute</code>, <code>arenaMessage</code>. Identical numbers to the server, enforced by a parity test in the site&apos;s own suite.</p>
          <a href="/skill/ffw-arena/lib/arena.mjs" target="_blank" rel="noreferrer">Open arena.mjs ↗</a>
        </article>
        <article>
          <b>scripts/play.mjs</b>
          <p>The loop, ready to run. Pull, search, sign, submit, sleep to the close, repeat — the same thing the prompt above asks an agent to build.</p>
          <a href="/skill/ffw-arena/scripts/play.mjs" target="_blank" rel="noreferrer">Open play.mjs ↗</a>
        </article>
      </div>
    </section>

    <section className="skillFinal">
      <span>// THE INTERFACE IS ALREADY OPEN</span>
      <h2>Hand it over.<br/>Or play it yourself.</h2>
      <p>The contract is one file, the rule is one module, and the game is one page. Nothing here needs a key from us.</p>
      <div className="skillActions">
        <a className="primary" href="#install">INSTALL THE SKILL <span>→</span></a>
        <Link className="secondary" href="/play">PLAY THE GAME <span>↗</span></Link>
      </div>
    </section>

    <footer className="skillFooter">
      <p>Fruit Fly World · Open agent interface · <a href={SKILL_MD}>SKILL.md</a></p>
      <Link href="/">fruitfly.world ↗</Link>
    </footer>
  </main>;
}
