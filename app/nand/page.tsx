import type { Metadata } from "next";
import Link from "next/link";
import { Bi } from "../components/Bi";
import NandLab from "./NandLab";
import { BEHAVIORS, LEVELS, decodeOutputs } from "../lib/nand/encode";
import { OFFICIAL, evalWord } from "../lib/nand/netlist";
import { RULES } from "../lib/nand/rules";
import "./nand.css";

/* Everything on this page is computed from the committed netlist at build time or
   in the reader's browser. No chain, no wallet, no server round-trip. */

const GATES = OFFICIAL.gates.length;
const INPUTS: [string, string][] = [
  ["bits 0–1", "food"], ["bits 2–3", "threat"], ["bits 4–5", "light"],
  ["bits 6–7", "novelty"], ["bits 8–9", "hunger"], ["bits 10–11", "previous behavior"]
];

const CODE = "0xb1024b89886b9a34aa4ff5f31c411d708b20a14c";
const TRANSISTOR = "0xcc42ba5de07f01b472a5b14cf45abcca79eb8087";

/** Behavior mix and escape rate over all 4096 words, straight from the netlist. */
function census() {
  const counts = [0, 0, 0, 0];
  let escapes = 0;
  for (let w = 0; w < 1 << OFFICIAL.nIn; w++) {
    const d = decodeOutputs(evalWord(OFFICIAL, w));
    counts[BEHAVIORS.indexOf(d.behavior)]++;
    if (d.gf) escapes++;
  }
  return { counts, escapes };
}

export const metadata: Metadata = {
  title: "FFW-NAND/1 — the fly brain as 50 NAND gates",
  description:
    "A fruit-fly decision layer compiled to 50 NAND gates and 0 latches: 12 input bits in, 3 bits out, identical to its seven rules on all 4096 words. Built and tested offline; not yet taped out to TapeOut on BNB Chain.",
  alternates: { canonical: "/nand" }
};

export default function NandPage() {
  const { counts, escapes } = census();
  const total = 1 << OFFICIAL.nIn;

  return <main className="pitchPage docPage">
    <nav className="pitchNav docNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="docNavLinks"><Link href="/fly/dusty">THE FLY</Link><Link href="/nand">TAPEOUT</Link><Link href="/anchors">ANCHORS</Link></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i /><Bi en="TAPEOUT / FFW-NAND/1 — A BRAIN THAT FITS IN FIFTY GATES" /></div>
      <h1><Bi en={<>Fifty NAND gates.<br /><em>One fly brain.</em></>} /></h1>
      <p><Bi en={<>
        Every move a fly makes has to come from somewhere. FFW-NAND/1 is that somewhere made
        small and checkable: twelve input bits, three output bits, fifty NAND gates, no memory
        of its own. Small enough to read on one screen and to build on
        <a href="https://tapeout.net/" target="_blank" rel="noreferrer"> TapeOut</a>&apos;s canvas, where a circuit
        lives on BNB Chain and anyone can evaluate it with a free, read-only call.
      </>} /></p>
      <div className="pitchPromise">
        <span><Bi en={`${GATES} NAND · 0 LATCH`} /></span>
        <span><Bi en={`${total}/${total} WORDS MATCH THE RULES`} /></span>
        <span><Bi en="NOT TAPED OUT YET" /></span>
      </div>
    </header>

    <section className="docSection" id="circuit">
      <div className="docHead">
        <span><Bi en="01 · THE CIRCUIT" /></span>
        <div>
          <h2><Bi en={<>Feed it a word.<br /><em>Watch the gates answer.</em></>} /></h2>
          <p><Bi en={<>Pick a level for each signal and the previous move, and the diagram lights up: every wire
            carries a 0 or a 1, every gate shows what it computes, and the three outputs at the right are the
            move the fly takes. This is the whole circuit — nothing is hidden and nothing is simulated at a
            higher level.</>} /></p>
        </div>
      </div>

      <div className="docTiles">
        <article><span>INPUTS</span><b>12 <i>bits</i></b><small>five signals + the previous move</small></article>
        <article><span>OUTPUTS</span><b>3 <i>bits</i></b><small>a move, and the Giant Fiber</small></article>
        <article><span>GATES</span><b>{GATES} <i>NAND</i></b><small>no latch, no sub-circuit</small></article>
        <article><span>DEPTH</span><b>9</b><small>gates on the longest path</small></article>
      </div>

      <div style={{ marginTop: 26 }}><NandLab /></div>

      <div className="docNote">
        <b>WHERE THIS RUNS — </b>
        in your browser, from the netlist committed to the repository
        (<code>app/lib/nand/ffw-nand-1.netlist.json</code>). Nothing on this page reads a chain, and there
        is nothing on a chain to read yet: the circuit has not been taped out. When it is, the same words
        can be sent to the on-chain <code>eval()</code> and compared, which is what
        <code> npm run nand:verify</code> does.
      </div>
    </section>

    <section className="docSection" id="interface">
      <div className="docHead">
        <span><Bi en="02 · THE INTERFACE" /></span>
        <div>
          <h2><Bi en={<>Twelve bits in,<br /><em>three bits out.</em></>} /></h2>
          <p><Bi en={<>A brain in Fruit Fly World maps four smells plus hunger and the previous move to one of
            four moves. FFW-NAND/1 turns each number into a level from 0 to 3, packs the levels into twelve
            bits, and answers in three. That packing is the entire contract a TapeOut circuit has to honour.</>} /></p>
        </div>
      </div>

      <div className="docTableWrap">
        <table className="docTable">
          <thead><tr><th>Level</th><th>0</th><th>1</th><th>2</th><th>3</th></tr></thead>
          <tbody>
            <tr><th>Value</th><td>below {LEVELS[0]}</td><td>{LEVELS[0]} to {LEVELS[1]}</td><td>{LEVELS[1]} to {LEVELS[2]}</td><td>{LEVELS[2]} and above</td></tr>
          </tbody>
        </table>
      </div>

      <table className="docTable" style={{ marginTop: 20, minWidth: 0 }}>
        <thead><tr><th>Bits</th><th>Reads</th></tr></thead>
        <tbody>
          {INPUTS.map(([bits, name]) => <tr key={name}><th>{bits}</th><td>{name}</td></tr>)}
        </tbody>
      </table>
      <p className="docNote"><Bi en={<>The levels are packed pin 0 first: TapeOut packs input pin <i>i</i> into bit <i>i</i>.
        The output word is <code>move | escape &lt;&lt; 2</code>, where a move is 0 approach, 1 avoid, 2 explore, 3 freeze.
        A missing pin reads as 0, so a taped-out circuit and this page always agree on the same word.</>} /></p>
    </section>

    <section className="docSection" id="rules">
      <div className="docHead">
        <span><Bi en="03 · THE SEVEN RULES" /></span>
        <div>
          <h2><Bi en={<>Read top to bottom.<br /><em>The first match decides.</em></>} /></h2>
          <p><Bi en={<>The circuit is not a trained model and not a lookup table. It is these rules, compiled. Rule 1 is
            the brainstem the game already models — a looming threat drives the Giant Fiber and the fly jumps,
            and in the trading dish a Giant Fiber spike sells everything.</>} /></p>
        </div>
      </div>

      <div className="docSteps">
        {RULES.map((r, i) => <article key={r.id}>
          <span>{String(i + 1).padStart(2, "0")}</span>
          <div><h3>{r.id.toUpperCase()}</h3><p>{r.text}</p></div>
        </article>)}
      </div>
      <p className="docNote"><Bi en={<>Source of truth: <code>app/lib/nand/rules.ts</code>. The test suite compiles
        these rules into a 4096-row table and asserts the netlist reproduces every row, so the picture above and
        the prose here cannot drift apart without a test failing.</>} /></p>
    </section>

    <section className="docSection" id="cost">
      <div className="docHead">
        <span><Bi en="04 · WHAT TAPING OUT WOULD COST" /></span>
        <div>
          <h2><Bi en={<>Fifty transistors<br /><em>and a fee.</em></>} /></h2>
          <p><Bi en={<>TapeOut runs on BNB Chain: you buy transistors, lay out a circuit, and pay to burn the
            transistors you used. Here is the arithmetic for this circuit, with the numbers we can point at and
            the ones we cannot kept apart.</>} /></p>
        </div>
      </div>

      <div className="ndCost">
        <article><span>One transistor · list</span><b>0.0005 BNB</b><small>list price on the official TapeOut processor, read from its contract on 2026-10-16. Its 1,000,000 transistors are all minted out, so a buy today is a secondary-market purchase, not a mint.</small></article>
        <article><span>This circuit needs</span><b>{GATES} NAND</b><small>and nothing else. No LATCH: the brain keeps its only memory — the previous move — in the world, which passes it back in as an input.</small></article>
        <article><span>Transistors alone</span><b>≈ 0.025 BNB</b><small>{GATES} × 0.0005. The tape-out fee and the protocol fee are <em>not</em> in this number: they are not confirmed on BNB Chain and we will not guess them.</small></article>
      </div>

      <div className="docNote">
        <b>THE ADDRESSES WE HAVE — </b>
        the official processor is <code>{CODE}</code> and its transistor token is <code>{TRANSISTOR}</code>,
        both on BNB Chain, both read from the public registry at
        <a href="https://tapeout.work/" target="_blank" rel="noreferrer"> tapeout.work</a>. What is still open —
        the tape-out fee, the protocol fee, and the byte order for inputs past bit 7 — is listed in
        <code> docs/tapeout-notes.md</code>. For scale, a neighbouring team reports a 3,800-gate tape-out on
        X Layer costing about 0.0023 OKB net; that is a different chain and not our quote.
      </div>
    </section>

    <section className="docSection" id="verify">
      <div className="docHead">
        <span><Bi en="05 · THE VERIFICATION LADDER" /></span>
        <div>
          <h2><Bi en={<>Three rungs.<br /><em>We are on the first.</em></>} /></h2>
          <p><Bi en={<>A claim about a circuit is worth exactly as much as the cheapest way to falsify it. Here is
            where this one stands today, and what would move it up a rung.</>} /></p>
        </div>
      </div>

      <div className="ndLadder">
        <article className="ok">
          <h3>Local, all words</h3>
          <div><b>4096 / 4096 words identical to the rules</b><p>The committed netlist is evaluated on every one of the 4096 input words and compared with the truth table compiled from the seven rules. The tape-out bytes are pinned by SHA-256, so a changed circuit fails the build.</p></div>
          <span className="mark">✓</span>
        </article>
        <article className="todo">
          <h3>Silicon</h3>
          <div><b>Not taped out</b><p>No transistors have been burned and no circuit exists on BNB Chain. Buying the 50 NAND and calling <code>tapeout(bytes, 12, 3)</code> is a deliberate, one-off, human step.</p></div>
          <span className="mark">—</span>
        </article>
        <article className="todo">
          <h3>On-chain eval</h3>
          <div><b>Not checked against a chain</b><p>Once taped out, <code>npm run nand:verify</code> reads the netlist back from the processor and calls the free <code>eval()</code> on all 4096 words. It must print <code>IDENTICAL: all 4096 words</code> before any season runs on this brain.</p></div>
          <span className="mark">—</span>
        </article>
      </div>
    </section>

    <section className="docSection" id="compare">
      <div className="docHead">
        <span><Bi en="06 · HOW IT COMPARES" /></span>
        <div>
          <h2><Bi en={<>Inspired by the fly.<br /><em>Not a copy of it.</em></>} /></h2>
          <p><Bi en={<>The day the game already ships is driven by FFW-CX/0.1, a 24-neuron circuit. FFW-NAND/1 is
            a different, much smaller brain, tuned in closed loop until its day in the same dish matched. Same
            dish, same tapes: six fly seeds across four seasons, twenty-four trading days.</>} /></p>
        </div>
      </div>

      <div className="docTableWrap">
        <table className="docTable">
          <thead><tr><th>Per day, averaged</th><th>FFW-CX/0.1 · market/2</th><th>FFW-NAND/1 · market/3</th></tr></thead>
          <tbody>
            <tr><th>Share of ticks alive</th><td>0.997</td><td>0.997</td></tr>
            <tr><th>Deaths</th><td>1.96</td><td>1.96</td></tr>
            <tr><th>Generations</th><td>2.92</td><td>2.92</td></tr>
            <tr><th>Giant Fiber escapes, per day</th><td>67.9</td><td>85.6</td></tr>
            <tr><th>Trades</th><td>269</td><td>1,495</td></tr>
            <tr><th>Equity at day end, paper USD</th><td>1,218</td><td>1,490</td></tr>
          </tbody>
        </table>
      </div>
      <p className="docNote"><Bi en={<>It lives as well — deaths and generations match exactly, because in this dish
        they are driven by the fee rhythm, not by the brain. It is a busier trader: it approaches more, rests less,
        and trades about five times as often. <b>Say it plainly: this is a different brain with a similar temperament,
        inspired by FFW-CX/0.1 and tuned against it — never "the same brain".</b></>} /></p>

      <div style={{ marginTop: 34 }}>
        <span className="ndMono" style={{ color: "var(--muted)" }}>WHAT THE CIRCUIT ANSWERS, OVER ALL {total} WORDS</span>
        <ul className="ndDist" style={{ marginTop: 14 }}>
          {BEHAVIORS.map((b, i) => <li key={b} className={`b-${b}`}>
            <span>{b}</span>
            <em><i style={{ width: `${(counts[i] / total) * 100}%` }} /></em>
            <b>{counts[i]}</b>
          </li>)}
        </ul>
        <p className="docNote"><Bi en={<>Counted straight off the netlist, not from the rules. The Giant Fiber fires on
          <b> {escapes}</b> of {total} words — every word where threat reads 2 or higher.</>} /></p>
      </div>
    </section>

    <section className="docSection" id="made">
      <div className="docHead">
        <span><Bi en="07 · HOW IT WAS MADE" /></span>
        <div>
          <h2><Bi en={<>Four attempts.<br /><em>Three did not work.</em></>} /></h2>
          <p><Bi en={<>The obvious move — distil the 24-neuron brain into a table and compile it — is the one that
            fails. Writing down what failed is the part that makes the rest believable.</>} /></p>
        </div>
      </div>

      <div className="docCards four">
        <article><span>ATTEMPT 1</span><h3>Distilled table</h3><p>Sampling 380,000 decisions and compiling the most common behaviour per word produced 2,472–3,398 gates, and in closed loop the fly locked into one move: the neuron brain repeats its previous action 96% of the time, so "copy the last move" is what a stateless table learns.</p></article>
        <article><span>ATTEMPT 2</span><h3>Small decision trees</h3><p>Down to 11–54 gates, with the same lock-in whenever the tree could read the previous move, and no resting or avoiding when it could not.</p></article>
        <article><span>ATTEMPT 3</span><h3>Closed-loop distillation</h3><p>Letting a shadow FFW-CX/0.1 label the states the gate fly actually visited stalled near 50% agreement, and small parameter changes swung the behaviour mix widely. Unstable.</p></article>
        <article><span>ATTEMPT 4</span><h3>Seven rules, tuned</h3><p>Explicit, readable rules tuned in closed loop: 35–53 gates across the settings tried, stable, and close on survival, equity and the behaviour mix. This is FFW-NAND/1.</p></article>
      </div>
      <p className="docNote"><Bi en={<>The lesson, kept for anyone building a brain here: a circuit with no state needs the
        world to hand it a little memory — here, the previous move — and at this size readable rules beat imitation.</>} /></p>
    </section>

    <section className="docBoundary">
      <h2><Bi en={<>A small circuit.<br />A real reflex.</>} /></h2>
      <div>
        <article><b>WHAT THIS IS</b><p>A gate-level decision layer — 50 NAND gates, 12 bits in, 3 bits out — that reproduces seven fly reflex rules on every possible input, and can be taped out to TapeOut on BNB Chain so a free read-only call answers the same way.</p></article>
        <article><b>WHAT THIS ISN'T</b><p>Not a simulation of a whole fly brain, not a trading strategy, and not investment advice. It is not the same brain as FFW-CX/0.1, and it is not on chain: no transistors have been bought and no circuit exists.</p></article>
        <article><b>WHAT YOU CAN CHECK</b><p>The circuit, its bytes and its SHA-256 in the repository; the whole truth table in your browser above; and, once it is taped out, every one of the 4096 words against the on-chain circuit with one command.</p></article>
      </div>
    </section>

    <footer className="pitchFooter">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <p><Bi en="Built and tested offline. Read the spec in docs/nand-brain.md and what is still open in docs/tapeout-notes.md." /></p>
      <div className="docNavLinks"><Link href="/fly/dusty">THE FLY ↗</Link><Link href="/lab">BRAIN LAB ↗</Link><Link href="/">LIVE WORLD ↗</Link></div>
    </footer>
  </main>;
}
