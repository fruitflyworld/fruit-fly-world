import type { Metadata } from "next";
import Link from "next/link";

/* ── app/calibration/page.tsx ─────────────────────────────────────────────────
   The death-calibration experiment: does a brain's danger score mean anything,
   measured against the only grader that cannot be gamed — dying. The numbers
   are produced per run in the exam room and shown on the bench report; this
   page is the method, written down so anyone can reproduce or attack it.
   ------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "Death calibration — does the brain's danger score mean anything? — Fruit Fly World",
  description: "A closed-loop calibration test for judgment models: bucket sealed danger scores against actual death within 5 seconds. Method, interpretation, and honest limits.",
  alternates: { canonical: "/calibration" }
};

function Bucket({ range, expect }: { range: string; expect: string }) {
  return (
    <tr>
      <td><code>{range}</code></td>
      <td>{expect}</td>
    </tr>
  );
}

export default function CalibrationPage() {
  return <main className="essayPage">
    <nav className="essayNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div>
        <Link href="/play">PLAY</Link>
        <Link href="/play?bench=1&seed=42&brain=judgment&gens=4">RUN IT</Link>
        <Link href="/essay">ESSAY</Link>
        <Link href="/">← BACK</Link>
      </div>
    </nav>

    <article className="essayBody">
      <header>
        <span className="essayKicker">THE EXPERIMENT · FRUITFLY.WORLD</span>
        <h1>When the brain says <em>danger,</em><br/>does death actually follow?</h1>
        <p className="essayLede">Every brain in the dish returns a danger score from 0 to 3 with each sealed decision. That number is easy to print and easy to fake. The death-calibration test checks it against the only grader that cannot be gamed: <b>dying</b>.</p>
        <div className="essayMeta"><span>DETERMINISTIC · SEALED LOG · REPRODUCIBLE</span></div>
      </header>

      <section>
        <h2>1 · The question</h2>
        <p>Confidence is a claim about the future. &quot;Danger 2.8&quot; claims: <i>given this situation, something lethal is likely to happen soon.</i> In a quiz, nobody ever checks. In the dish, the world keeps running after the claim — so we can.</p>
        <p>This is the same lesson as the judge-audit failures in the judgment-model ecosystem: a model can sound certain and be wrong. The cure is not a better prompt. The cure is consequences that arrive on a clock.</p>
      </section>

      <section>
        <h2>2 · The method</h2>
        <p>Run the exam room (<Link href="/play?bench=1&seed=42&brain=judgment&gens=4"><code>?bench=1</code></Link>) with any brain. Every decision is already sealed with its situation and a content hash. For each generation we know one more thing the model never sees at decision time: <b>when the fly died</b>. Then:</p>
        <ul>
          <li>A decision is <b>positive</b> if the fly died and the decision was made within <b>5 seconds</b> of death.</li>
          <li>Bucket every decision by its danger score: <code>0–1</code>, <code>1–2</code>, <code>2–3</code>.</li>
          <li>Report the <b>actual death rate</b> per bucket, plus a <b>Brier score</b> treating <code>danger/3</code> as the claimed probability of dying within 5 s.</li>
        </ul>
        <p>A perfectly calibrated brain would see death rates rise monotonically with the bucket — roughly 17% / 50% / 83% if scores were uniform within buckets. A brain that cries danger at nothing shows a flat table. A brain that dies surprised shows deaths in the low buckets.</p>
        <table>
          <thead><tr><th>danger bucket</th><th>a calibrated brain looks like</th></tr></thead>
          <tbody>
            <Bucket range="0–1" expect="almost no deaths within 5 s" />
            <Bucket range="1–2" expect="deaths begin" />
            <Bucket range="2–3" expect="death is the norm, not the exception" />
          </tbody>
        </table>
      </section>

      <section>
        <h2>3 · What it does not prove</h2>
        <p>One seed is one row, not a theorem. The table is a property of <i>this brain on this world with this predator</i>, measured — a reproducible number, not a moral. The danger score is also <b>actionable</b>: a brain that fears danger and successfully escapes may show high scores and no deaths, which the raw table reads as over-prediction. That ambiguity is honest and worth stating: calibration in a closed loop mixes perception with policy. Disentangling them — scoring the read, not the reflex — is future work, and the sealed logs are exactly the data such work needs.</p>
      </section>

      <section>
        <h2>4 · Run it yourself</h2>
        <ul>
          <li><Link href="/play?bench=1&seed=42&brain=judgment&gens=4">Judgment brain · seed 42 · 4 generations</Link> — the calibration table prints on the exam report.</li>
          <li><Link href="/play?bench=1&seed=1337&brain=circuit&gens=4">Circuit brain · seed 1337</Link> — the same test for the 24-neuron circuit.</li>
          <li>Change the seed in the URL and the whole world — food, predator, drafts, deaths — changes with it, deterministically.</li>
        </ul>
        <p className="essayOut">The dish does not grade opinions. It grades the next five seconds.</p>
      </section>
    </article>

    <footer className="essayFooter">
      <p>Fruit Fly World · <Link href="/">fruitfly.world</Link> · <Link href="/play?bench=1">the exam room</Link> · every decision sealed</p>
    </footer>
  </main>;
}
