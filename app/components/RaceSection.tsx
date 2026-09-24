"use client";

/* ── app/components/RaceSection.tsx ─────────────────────────────────────────
   The interactive half of the weekly race page: connect a wallet, pick a
   brain, rank mutation preferences, sign the EIP-191 commit (the server keeps
   only the sha256), then reveal after the draw. The board on the right shows
   live commitments during the week and the graded leaderboard after it.

   The wallet never leaves the browser except for the two signatures — no
   chain, no gas: commit/reveal are server records (race/1), which is exactly
   what the honest-bounds copy promises.
   ------------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useState } from "react";
import { createWalletClient, custom } from "viem";
import CopyBox from "./CopyBox";
import {
  RACE_BRAINS, RACE_TRAITS, canonicalPolicyJson, commitmentOfWeb,
  commitMessage, revealMessage, type RaceBrain,
} from "../lib/race-shared";

type Draw = { seed: number; block: number; hash: string } | null;

type LiveEntry = { entrant: string; brain: string; commitment: string; revealed: boolean; graded: boolean };
type BoardRow = { rank: number; entrant: string; brain: string; eggs: number; survivedGens: number; logHashes: unknown; policy: unknown };

type Status = {
  week: number;
  phase: "commit" | "reveal" | "closed";
  commitCutoffUnix: number;
  weekEndUnix: number;
  draw: Draw;
  entries: number;
  revealed: number;
  graded: number;
  worldGens: number;
  liveEntries?: LiveEntry[];
  leaderboard?: BoardRow[];
};

const POLICY_KEY = "ffw_race_policy_v1";
type SavedPolicy = { week: number; brain: RaceBrain; preference: string[]; commitment: string };

const BRAIN_BLURB: Record<RaceBrain, string> = {
  genes: "The wild-type auto-pilot. Fixed weights, no judgment log. The passing baseline.",
  circuit: "FFW-CX/0.1 — a 24-neuron spiking circuit, connectome-inspired, firing at 10 Hz.",
  judgment: "The System One judgment layer (the free local heuristic in the race lane).",
};

function short(a: string, n = 6): string {
  return a.length > 2 * n + 2 ? `${a.slice(0, n + 2)}…${a.slice(-4)}` : a;
}

function countdown(targetMs: number, nowMs: number): string {
  const s = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s % 60).padStart(2, "0")}s`;
}

function getEth(): { request(args: { method: string; params?: unknown[] }): Promise<unknown> } | undefined {
  return (window as unknown as { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> } }).ethereum;
}

function loadSaved(week: number): SavedPolicy | null {
  try {
    const p = JSON.parse(window.localStorage.getItem(POLICY_KEY) || "null") as SavedPolicy | null;
    return p && p.week === week ? p : null;
  } catch { return null; }
}

export default function RaceSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [prev, setPrev] = useState<BoardRow[]>([]);
  const [address, setAddress] = useState<string | null>(null);
  const [brain, setBrain] = useState<RaceBrain>("judgment");
  const [pref, setPref] = useState<string[]>([]);
  const [commitment, setCommitment] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedPolicy | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pasteValue, setPasteValue] = useState("");

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/race", { cache: "no-store" });
      const j = (await r.json()) as Status;
      if (!("error" in j)) setStatus(j);
      if (j.week > 1) {
        const p = await fetch(`/api/race?week=${j.week - 1}`, { cache: "no-store" });
        const pj = (await p.json()) as { leaderboard?: BoardRow[] };
        setPrev(pj.leaderboard ?? []);
      }
    } catch { /* the status strip simply stays on the last good poll */ }
  }, []);

  useEffect(() => { void refresh(); const t = window.setInterval(() => void refresh(), 30_000); return () => window.clearInterval(t); }, [refresh]);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  useEffect(() => { setSaved(status ? loadSaved(status.week) : null); }, [status?.week]);

  // live preview of what will be signed
  useEffect(() => {
    let live = true;
    if (!status || status.phase !== "commit") { setCommitment(null); return; }
    void commitmentOfWeb(status.week, { brain, preference: pref }).then((c) => { if (live) setCommitment(c); });
    return () => { live = false; };
  }, [status?.week, status?.phase, brain, pref]);

  const myEntry = useMemo(() => {
    if (!status?.liveEntries || !address) return null;
    return status.liveEntries.find((e) => e.entrant === address.toLowerCase()) ?? null;
  }, [status?.liveEntries, address]);

  const canonical = status ? canonicalPolicyJson(status.week, { brain, preference: pref }) : "";

  function toggleTrait(id: string) {
    setPref((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 24 ? p : [...p, id]));
  }
  function move(i: number, dir: -1 | 1) {
    setPref((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const q = [...p];
      [q[i], q[j]] = [q[j], q[i]];
      return q;
    });
  }

  async function connect() {
    setError(null);
    const eth = getEth();
    if (!eth) { setError("No wallet found — install MetaMask (or any EIP-1193 wallet) and reload."); return; }
    try {
      setBusy("connect");
      const wallet = createWalletClient({ transport: custom(eth) });
      const [account] = await wallet.requestAddresses();
      setAddress(account.toLowerCase());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet connection failed.");
    } finally { setBusy(null); }
  }

  async function signAndPost(kind: "commit" | "reveal", brainArg: RaceBrain, prefArg: string[], entryCommitment?: string) {
    if (!address || !status) throw new Error("connect a wallet first");
    const eth = getEth();
    if (!eth) throw new Error("wallet not available");
    const wallet = createWalletClient({ transport: custom(eth) });
    const c = kind === "commit"
      ? (commitment ?? await commitmentOfWeb(status.week, { brain: brainArg, preference: prefArg }))
      : entryCommitment!;
    const message = kind === "commit"
      ? commitMessage(status.week, brainArg, c)
      : revealMessage(status.week, c);
    const signature = await wallet.signMessage({ account: `0x${address}` as `0x${string}`, message });
    const res = await fetch(`/api/race/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, signature, brain: brainArg, preference: prefArg }),
    });
    const j = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new Error(String(j.error ?? res.statusText));
    return { commitment: c, response: j };
  }

  async function commit() {
    setError(null); setNote(null);
    if (!address) { setError("Connect a wallet first."); return; }
    if (!status || status.phase !== "commit") { setError("The commit window for this week is closed."); return; }
    try {
      setBusy("commit-sign");
      const { commitment: c } = await signAndPost("commit", brain, pref);
      const rec: SavedPolicy = { week: status.week, brain, preference: pref, commitment: c };
      window.localStorage.setItem(POLICY_KEY, JSON.stringify(rec));
      setSaved(rec);
      setNote("Committed. Keep this page (or the saved policy file) — you will need the exact policy to reveal after the draw.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Commit failed.");
    } finally { setBusy(null); }
  }

  async function reveal(fromPaste = false) {
    setError(null); setNote(null);
    if (!address || !status) return;
    const rec = fromPaste
      ? (() => { try { return JSON.parse(pasteValue) as SavedPolicy; } catch { return null; } })()
      : saved;
    if (!rec || rec.week !== status.week || !rec.brain || !Array.isArray(rec.preference)) {
      setError("Paste the policy JSON you saved at commit time (same week, exact brain and trait order).");
      return;
    }
    const entry = status.liveEntries?.find((e) => e.entrant === address.toLowerCase());
    if (!entry) { setError("No committed entry found for this wallet this week."); return; }
    try {
      setBusy("reveal-sign");
      const check = await commitmentOfWeb(status.week, { brain: rec.brain, preference: rec.preference });
      if (check !== entry.commitment) {
        setError("This policy does not hash to your commitment — it is not what you committed.");
        return;
      }
      await signAndPost("reveal", rec.brain, rec.preference, entry.commitment);
      setNote("Revealed. Grading replays every entry on the drawn seed; the board updates when the week closes.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reveal failed.");
    } finally { setBusy(null); }
  }

  if (!status) return <div className="racePanel"><p className="raceMuted">loading the week…</p></div>;

  const targetMs = status.phase === "commit" ? status.commitCutoffUnix * 1000 : status.weekEndUnix * 1000;
  const phaseLabel = status.phase === "commit" ? "COMMIT OPEN" : status.phase === "reveal" ? "DRAW & REVEAL" : "CLOSED";

  return <div className="raceGrid">
    {/* ── left column: enter the week ─────────────────────────────── */}
    <div className="racePanel">
      <div className="racePhaseRow">
        <span className={`raceChip phase-${status.phase}`}>{phaseLabel}</span>
        <span className="raceMono">WEEK {status.week}</span>
        <span className="raceCount">{status.phase === "closed" ? "—" : countdown(targetMs, now)}</span>
      </div>
      <p className="raceMuted">
        {status.phase === "commit"
          ? "Pick a brain, rank the mutation cards you want most, sign once. The server stores only the sha256 of your policy — nobody (including us) can see it until you reveal, after the draw."
          : status.phase === "reveal"
            ? "The commit window is closed and the exam seed has been drawn from an Ethereum block. Reveal your committed policy now — the hash must match."
            : "This week is over. The next week's commit window is open at the top of the page."}
      </p>

      {/* wallet */}
      <div className="raceWallet">
        {address
          ? <span className="raceMono raceAddr">{short(address, 8)}</span>
          : <button className="raceBtn" onClick={() => void connect()} disabled={busy === "connect"}>
              {busy === "connect" ? "CONNECTING…" : "CONNECT WALLET"}
            </button>}
        {address && !myEntry && status.phase === "commit" && <span className="raceMuted">not entered yet</span>}
        {myEntry && <span className="raceOk">✓ entered · {myEntry.revealed ? "revealed" : "commitment locked"}</span>}
      </div>

      {/* commit form */}
      {status.phase === "commit" && !myEntry && <div className="raceForm">
        <label className="raceLabel">1 · PICK A BRAIN</label>
        <div className="raceBrains">
          {RACE_BRAINS.map((b) => (
            <button key={b} type="button" className={`raceBrain ${brain === b ? "on" : ""}`} onClick={() => setBrain(b)}>
              <b>{b}</b><span>{BRAIN_BLURB[b]}</span>
            </button>
          ))}
        </div>

        <label className="raceLabel">2 · RANK THE CARDS YOU WANT (OPTIONAL, IN ORDER)</label>
        <p className="raceMuted">At every mutation draft the replay takes the offered card ranked earliest on your list. No list = always the first card. Unlisted cards are never picked by name.</p>
        <div className="raceTraits">
          {RACE_TRAITS.map((t) => (
            <button key={t.id} type="button"
              className={`raceTrait rarity-${t.rarity} ${pref.includes(t.id) ? "on" : ""}`}
              title={t.good + (t.cost !== "—" ? ` / cost: ${t.cost}` : "")}
              onClick={() => toggleTrait(t.id)}>
              <b>{t.name}</b><span>{t.good}</span>
            </button>
          ))}
        </div>
        {pref.length > 0 && <ol className="racePrefList">
          {pref.map((id, i) => {
            const t = RACE_TRAITS.find((x) => x.id === id)!;
            return <li key={id}>
              <span className="raceMono">{i + 1}</span> {t.name}
              <i className="raceReorder">
                <button type="button" aria-label="move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button type="button" aria-label="move down" onClick={() => move(i, 1)} disabled={i === pref.length - 1}>↓</button>
                <button type="button" aria-label="remove" onClick={() => toggleTrait(id)}>×</button>
              </i>
            </li>;
          })}
        </ol>}

        <label className="raceLabel">3 · WHAT YOUR WALLET WILL SIGN</label>
        <pre className="raceCanonical">{canonical}
{commitment ?? ""}</pre>
        <button className="raceBtn primary" onClick={() => void commit()} disabled={busy === "commit-sign" || !address}>
          {busy === "commit-sign" ? "CHECK YOUR WALLET…" : address ? "SIGN & COMMIT" : "CONNECT WALLET FIRST"}
        </button>
      </div>}

      {/* committed: hold the receipt */}
      {status.phase === "commit" && myEntry && (saved || address) && <div className="raceForm">
        <label className="raceLabel">YOUR COMMITMENT</label>
        <pre className="raceCanonical">{myEntry.commitment}</pre>
        {saved
          ? <CopyBox label="SAVE YOUR POLICY — NEEDED AT REVEAL" text={JSON.stringify({ week: saved.week, brain: saved.brain, preference: saved.preference, commitment: saved.commitment }, null, 2)} note="Stored in this browser too (localStorage). If you switch browsers, keep this file." />
          : <p className="raceMuted">Committed from another browser. Keep the policy JSON you saved there — reveal requires the exact brain and trait order.</p>}
      </div>}

      {/* reveal */}
      {status.phase === "reveal" && address && myEntry && !myEntry.revealed && <div className="raceForm">
        {saved
          ? <button className="raceBtn primary" onClick={() => void reveal(false)} disabled={busy === "reveal-sign"}>
              {busy === "reveal-sign" ? "CHECK YOUR WALLET…" : "SIGN & REVEAL"}
            </button>
          : <p className="raceMuted">No saved policy in this browser. Paste the JSON you saved at commit time:</p>}
        {!saved && <textarea className="racePaste" rows={5} value={pasteValue} onChange={(e) => setPasteValue(e.target.value)} placeholder='{"week":…,"brain":"…","preference":[…]}' />}
        {!saved && <button className="raceBtn" onClick={() => void reveal(true)} disabled={busy === "reveal-sign"}>REVEAL FROM PASTE</button>}
      </div>}

      {status.phase === "reveal" && myEntry?.revealed && <p className="raceOk">Revealed. Grading runs when the week closes — the leaderboard then appears on this page, recomputable by anyone.</p>}

      {error && <p className="raceError">{error}</p>}
      {note && <p className="raceNote">{note}</p>}
    </div>

    {/* ── right column: the paper & the board ─────────────────────── */}
    <div className="raceSide">
      {status.draw && <div className="racePanel raceDraw">
        <label className="raceLabel">THE DRAW · WEEK {status.week}</label>
        <p><span className="raceMono raceSeed">seed {status.draw.seed}</span></p>
        <p className="raceMuted">Sepolia block <a href={`https://sepolia.etherscan.io/block/${status.draw.block}`} target="_blank" rel="noreferrer">#{status.draw.block}</a> — mined after the commit cutoff, unknowable at commit time. Same seed for every entrant; {status.worldGens} generations; ranked by eggs → survived generations → earliest commit.</p>
      </div>}

      <div className="racePanel">
        <label className="raceLabel">{status.phase === "commit" ? "COMMITTED THIS WEEK" : "THE BOARD"}</label>
        {status.phase !== "commit" && (status.leaderboard?.length ?? 0) > 0
          ? <table className="raceTable"><thead><tr><th>#</th><th>fly</th><th>brain</th><th>eggs</th><th>gens</th></tr></thead>
              <tbody>{(status.leaderboard ?? []).map((r) => (
                <tr key={r.entrant} className={address && r.entrant === address.toLowerCase() ? "me" : ""}>
                  <td className="raceMono">{r.rank}</td><td className="raceMono">{short(r.entrant)}</td>
                  <td>{r.brain}</td><td className="raceMono">{r.eggs}</td><td className="raceMono">{r.survivedGens}</td>
                </tr>))}</tbody></table>
          : (status.liveEntries?.length ?? 0) > 0
            ? <table className="raceTable"><thead><tr><th>fly</th><th>brain</th><th>commitment</th><th>revealed</th></tr></thead>
                <tbody>{(status.liveEntries ?? []).map((e) => (
                  <tr key={e.entrant} className={address && e.entrant === address.toLowerCase() ? "me" : ""}>
                    <td className="raceMono">{short(e.entrant)}</td><td>{e.brain}</td>
                    <td className="raceMono">{short(e.commitment, 8)}</td><td>{e.revealed ? "✓" : "—"}</td>
                  </tr>))}</tbody></table>
            : <p className="raceMuted">No entries yet this week. Be the first — an empty first race is still a race anyone can audit.</p>}
        {status.entries > 0 && <p className="raceMuted">{status.entries} entered · {status.revealed} revealed · {status.graded} graded</p>}
      </div>

      {prev.length > 0 && <div className="racePanel">
        <label className="raceLabel">LAST WEEK (WEEK {status.week - 1})</label>
        <table className="raceTable"><thead><tr><th>#</th><th>fly</th><th>brain</th><th>eggs</th></tr></thead>
          <tbody>{prev.map((r) => (
            <tr key={r.entrant}><td className="raceMono">{r.rank}</td><td className="raceMono">{short(r.entrant)}</td>
              <td>{r.brain}</td><td className="raceMono">{r.eggs}</td></tr>))}</tbody></table>
      </div>}

      <div className="racePanel">
        <label className="raceLabel">VERIFY IT YOURSELF</label>
        <CopyBox
          label="RE-RUN ANY GRADED LINEAGE"
          text={status.draw
            ? `git clone https://github.com/fruitflyworld/sim && cd sim\nnode cli.mjs --seed ${status.draw.seed} --brain judgment --gens=${status.worldGens}`
            : "git clone https://github.com/fruitflyworld/sim && cd sim\nnode cli.mjs --seed <draw.seed> --brain <brain> --gens=3"}
          note="Eggs must match the leaderboard row, to the egg. The server replays the same vendored world.js bytes the browser runs."
        />
        <p className="raceMuted">Bragging rights only — no token, no prize pool attached to this board yet. When a week is graded, anyone can recompute every row from the public draw seed.</p>
      </div>
    </div>
  </div>;
}
