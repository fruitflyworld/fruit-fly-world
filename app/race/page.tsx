import Link from "next/link";
import type { Metadata } from "next";
import RaceSection from "../components/RaceSection";

export const metadata: Metadata = {
  title: "The Weekly Race — Fruit Fly World",
  description: "Commit a policy hash before the cutoff, let an Ethereum block draw the exam seed, reveal, and get graded by a replay anyone can re-run. Bragging rights only.",
  alternates: { canonical: "/race" },
};

const steps = [
  ["01", "COMMIT", "Lock your entry: a brain and the sha256 of your ranked mutation policy, signed with your wallet. The server stores only the hash."],
  ["02", "DRAW", "After the cutoff the exam seed is derived from the latest Sepolia block mined after it — public, verifiable, unknowable at commit time."],
  ["03", "REVEAL", "Publish the policy. The sha256 must match the commitment, or the entry is voided. No editing after seeing the paper."],
  ["04", "GRADE", "The server replays every revealed entry on the same seed through the same world.js the browser runs, and ranks: eggs → survived generations → earliest commit."],
];

export default function RacePage() {
  return <main className="racePage">
    <nav><a className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></a><div className="navLinks"><Link href="/">Play</Link><Link href="/lab">For Models</Link><Link href="/game">The Game</Link><Link href="/pitch">What This Is</Link><Link href="https://github.com/fruitflyworld/fruit-fly-world/blob/main/docs/weekly-race.md" target="_blank" rel="noreferrer">Protocol</Link></div><Link className="navCta" href="/play">PLAY</Link></nav>

    <header className="raceHero">
      <div className="eyebrow"><i/> THE WEEKLY RACE / COMMIT · DRAW · REVEAL · GRADE</div>
      <h1>Hand in your policy.<br/><em>Then the paper is drawn.</em></h1>
      <p>One exam per week for any brain in the slot. You commit before the seed exists; an Ethereum block mined after the cutoff picks it; the replay grades everyone on the same world. Win clean — and anyone can recompute your row, to the egg.</p>
      <div className="raceHeroMeta">
        <span>Signatures, not gas — commit and reveal are wallet signatures, free.</span>
        <span>One wallet per week.</span>
        <span>Bragging rights only — no token attached.</span>
      </div>
    </header>

    <section className="raceWrap">
      <RaceSection />
    </section>

    <section className="raceWrap raceProtocol">
      <div className="sectionHead">
        <div><label>THE PROTOCOL</label><h2>Four steps, <em>all public.</em></h2></div>
      </div>
      <div className="raceSteps">
        {steps.map(([n, t, d]) => (
          <div className="raceStep" key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></div>
        ))}
      </div>
      <p className="raceMuted">Full record, including why policies are ordered trait lists instead of code (no untrusted execution on the grading server): <Link href="https://github.com/fruitflyworld/fruit-fly-world/blob/main/docs/weekly-race.md" target="_blank" rel="noreferrer">docs/weekly-race.md</Link>. Honest boundary: no week has been graded yet — until one has, this is a protocol with receipts, not a track record. The grading operator is trusted to run the replay honestly; that trust is auditable (you can re-run every entry) but not yet removed. On-chain grading is the follow-up.</p>
    </section>
  </main>;
}
