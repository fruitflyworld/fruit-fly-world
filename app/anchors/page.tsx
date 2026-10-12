import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync } from "node:fs";
import { Bi } from "../components/Bi";
import { ANCHORS, explorerUrl, memoFor, type Anchor } from "../lib/anchors";
import { TOKEN } from "../lib/token";
import committedStatus from "../../anchors/status.json";

/**
 * The daily anchor job writes on chain from the server, outside the release directory, so that a
 * deploy cannot wipe the record. This page therefore reads the live files when they exist and falls
 * back to the committed snapshot — which is what CI enforces — everywhere else (a fresh clone, a
 * build, a reviewer reading the repository).
 */
export const dynamic = "force-dynamic";

const RUNTIME_MANIFEST = process.env.ANCHORS_RUNTIME_FILE || "/srv/fruit-fly-world/anchors.json";
const RUNTIME_STATUS = process.env.ANCHORS_STATUS_FILE || "/srv/fruit-fly-world/anchors-status.json";

type StatusEntry = { season: number; ok: boolean; problem: string | null };
const readJson = <T,>(file: string): T | null => {
  try { return JSON.parse(readFileSync(file, "utf8")) as T; } catch { return null; }
};

export const metadata: Metadata = {
  title: "Daily anchors — Fruit Fly World",
  description:
    "One closed UTC day, one chain head, written on chain as a memo. Anyone can recompute the head from the code and compare it with what was published — that is the difference between a claim and a commitment.",
  alternates: { canonical: "/anchors" }
};

export default function AnchorsPage() {
  const runtimeManifest = readJson<{ anchors: Anchor[] }>(RUNTIME_MANIFEST);
  const live = Boolean(runtimeManifest?.anchors?.length);
  const anchors: Anchor[] = live ? runtimeManifest!.anchors : ANCHORS;
  const runtimeStatus = readJson<{ entries: StatusEntry[] }>(RUNTIME_STATUS);
  const verified = new Map(((runtimeStatus?.entries ?? committedStatus.entries) as StatusEntry[]).map((e) => [e.season, e]));

  return <main className="pitchPage docPage">
    <nav className="pitchNav docNav">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <div className="docNavLinks"><Link href="/fly/dusty">THE FLY</Link><Link href="/economics">ECONOMICS</Link><Link href="/participate">PARTICIPATION</Link></div>
    </nav>

    <header className="docHero">
      <div className="pitchKicker"><i/><Bi en="ANCHORS / ONE DAY, ONE HEAD, ON CHAIN" /></div>
      <h1><Bi en={<>A head this project<br /><em>cannot edit afterwards.</em></>} /></h1>
      <p><Bi
        en={<>Every closed UTC day, the day&apos;s last sealed chain head is written on chain as a memo. Recompute the day from the code and you get the same hash — or you have caught us. That is the whole point: the site can be changed, the chain cannot.</>}
      /></p>
      <div className="pitchPromise">
        <span><Bi en={`${anchors.length} ANCHORED DAY${anchors.length === 1 ? "" : "S"}`} /></span>
        <span><Bi en="SHA-256 FROM SEASON 3" /></span>
        <span><Bi en="RECOMPUTABLE BY ANYONE" /></span>
      </div>
    </header>

    <section className="docSection" id="anchors">
      <div className="docHead">
        <span><Bi en="01 · THE DAILY ANCHORS" /></span>
        <div>
          <h2><Bi en={<>What was written,<br /><em>and what it commits to.</em></>} /></h2>
          <p><Bi
            en={<>A memo of the form <code>ffw:1|season|date|lastTick|chainHash</code>. Season 0 was sealed with market/1 (FNV-1a); from season 3 the head is SHA-256. The head commits to every tick before it, including the ones nobody can change now.</>}
          /></p>
        </div>
      </div>

      {anchors.length === 0
        ? <div className="docNote">
          <b>NO ANCHORS YET — </b>
          the first one is written once the next UTC day closes (00:00 UTC), from the project&apos;s anchor wallet.
          Until then there is nothing on chain to point at, and this page says so instead of showing an empty table as if it were a result.
          Seasons 0 and 1 have already closed and their heads are recomputable from this repository today.
        </div>
        : <div className="docLadder">{anchors.map((anchor) => {
          const check = verified.get(anchor.season);
          const diverged = check ? !check.ok : false;
          return <article key={anchor.season}>
            <span>{anchor.date}</span>
            <h3>
              <Bi en={`Season ${anchor.season} · ${anchor.worldVersion}`} />
            </h3>
            <p className="tfMono" style={{ overflowWrap: "anywhere", fontSize: 12 }}>
              {anchor.chainHash}
            </p>
            <p>
              <a href={explorerUrl(anchor.chain, anchor.tx)} target="_blank" rel="noreferrer">memo transaction ↗</a>
              {" · "}
              <span style={{ color: diverged ? "#ff6b6b" : undefined }}>
                {diverged ? `DIVERGED — ${check!.problem ?? "replay differs"}` : "verified identical on every push"}
              </span>
            </p>
          </article>;
        })}</div>}

      <div className="docNote">
        <b>CHECK IT YOURSELF — </b>
        <code>npm run verify:anchors</code> recomputes every day in this list from the code; add
        <code> --chain</code> to read the memo back from a public RPC. Both the manifest and the status
        shown here are enforced by CI: <code>tests/anchors.test.ts</code> recomputes every anchor on every push and
        fails if a hash disagrees. A divergence is never silently re-anchored — it is marked here in red.
      </div>
      <div className="docNote">
        <b>WHERE THIS LIST COMES FROM — </b>
        {live
          ? "the site's server, which is where the daily job appends each confirmed memo. The same file is published in the repository as anchors/anchors.json, and CI recomputes every entry in it on every push."
          : "the committed snapshot in this repository (anchors/anchors.json). The live list appears here as soon as the server has anchored its first day."}
      </div>
      <div className="docNote">
        <b>ANCHOR WALLET — </b>
        <code>{TOKEN.anchorWallet}</code> — the only key that writes these memos. It holds a few
        cents of SOL for fees and nothing else, and every memo it has ever sent is listed above.
      </div>
      <div className="docNote">
        <b>MEMO FORMAT — </b>
        <code>{anchors.length ? memoFor(anchors[anchors.length - 1].season, anchors[anchors.length - 1].chainHash) : memoFor(0, "55bdf958")}</code>
        {" "}(the latest entry, or season 0&apos;s head before the first anchor lands)
      </div>
    </section>

    <footer className="pitchFooter">
      <Link className="brand" href="/"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></Link>
      <p><Bi en="Written by the project, checkable by anyone. Read the manifest in the repository: anchors/anchors.json." /></p>
      <div className="docNavLinks"><Link href="/fly/dusty">THE FLY ↗</Link><Link href="/essay">ESSAY ↗</Link><Link href="/">LIVE WORLD ↗</Link></div>
    </footer>
  </main>;
}
