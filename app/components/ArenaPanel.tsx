"use client";

/* ── app/components/ArenaPanel.tsx ──────────────────────────────────────────
   The Foraging Hour, played by hand, in three numbered steps: copy the task,
   build a route, enter it. The steps exist because the answer is public — the
   window's best route is what an exhaustive search returns, so opening the map
   on it and offering one button made the default action "be the second person to
   submit the same numbers". Starting empty and naming the benchmark as a choice
   puts the person back in front of the problem.

   It reads the same public rule the server scores with (app/lib/arena.ts), so
   every number below is the number the window will be decided by — not an estimate.

   Two doors into one window. This page is the operator's: sign in, build a route,
   and POST it to /api/arena/enter, where the session stands in for a signature.
   The other door is the agent's — it signs with its own wallet and never opens a
   browser, which is what the prompt in the aside sets up. Both write the same
   table for the same epoch; the close does not care which.
   ------------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ARENA_STEPS, CELLS, MAP_COLUMNS, MAP_ROWS, SIGNAL_CANDIDATES,
  bestRoute, display, isAdjacent, richnessOf, scoreRoute, validateRoute,
  type Plan
} from "../lib/arena";
import type { Signals } from "../lib/experiment";
import { parseRouteReply, type ReplySource } from "../lib/arena-reply";
import { AGENT_PROMPT, PLAY_COMMAND as COMMAND, SKILL_MD as SKILL_URL, SKILL_PAGE } from "../lib/skill";
import { useAuth } from "./AuthProvider";

type Lane = "agent" | "manual";
type Standing = {
  address: string | null; agentAddress: string | null; lane: Lane | null;
  exact: number | null; score: number | null; energy: number | null;
  cells: string[] | null; entries: number;
};
type Winner = { epoch: number; address: string; agentAddress: string; lane: Lane; exact: number; at: string };
type ArenaState = {
  enabled: boolean;
  window: { epoch: number; windowSec: number; startsAt: number; endsAt: number; secondsLeft: number };
  steps: number;
  e0: number;
  caps: { perWindowTries: number; perWalletDay: number; perIpDay: number };
  standing: Standing;
  lastWinner: Winner | null;
};
type LeaderRow = { rank: number; agentAddress: string; address: string; lane: Lane; best: number; bestEpoch: number; entries: number; wins: number };
type Accepted = { exact: number; triesUsed: number; leading: boolean };

/** The shape of GET /api/arena/brief, as far as step 01 reads it. The task text is
 *  assembled from this object and nothing else, so it cannot describe a window the
 *  endpoint is not describing. */
type Brief = {
  window: { epoch: number; endsAt: number; windowSec: number };
  map: { columns: number; rows: number; cells: string[]; edges: string };
  steps: number;
  e0: number;
  energy: { min: number; max: number; travelCost: number; newCellBonus: number };
  seeds: unknown;
  messageFormat: string[];
  submitUrl: string;
  skill: string;
};

const short = (value: string | null) => (value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—");
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const clock = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600), m = Math.floor((safe % 3600) / 60), s = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/** Where a pasted answer's route was found, in the words the reader will use. */
const SOURCE_LABEL: Record<ReplySource, string> = {
  json: "JSON block it printed",
  labels: "Route: line it wrote",
  cells: "station names in the text"
};

/** The palette vector that pays most at this cell on its own — the same choice
 *  bestRoute() makes per cell, at the size a human can see. */
function bestSignalFor(epoch: number, cell: string): Signals {
  let best = SIGNAL_CANDIDATES[0];
  let bestGain = -Infinity;
  for (const signal of SIGNAL_CANDIDATES) {
    const gain = scoreRoute(epoch, [cell], [signal]).exact;
    if (gain > bestGain) { bestGain = gain; best = signal; }
  }
  return { ...best };
}

/** Everything an agent needs, written out of the brief that was just fetched. */
function taskText(brief: Brief, origin: string): string {
  return [
    "FRUIT FLY WORLD — FORAGING HOUR",
    `Round ${brief.window.epoch} · closes ${new Date(brief.window.endsAt * 1000).toISOString()} (${brief.window.windowSec}s windows)`,
    "",
    `The map is ${brief.map.columns}x${brief.map.rows}: ${brief.map.cells.join(",")}.`,
    `Moves are ${brief.map.edges} only. A route is up to ${brief.steps} cells, each one next to the last.`,
    `Energy starts at ${brief.e0}; travel costs ${brief.energy.travelCost}, a first visit to a cell pays ${brief.energy.newCellBonus}.`,
    "",
    "Signals are four numbers per station, 0-100, in route order: food / threat / light / novelty.",
    `Score it with scoreRoute(round, route, signals) — the same pure function the server recomputes with.`,
    "Ranking is the exact score, at full precision, at the close. An identical route never displaces an earlier one.",
    "",
    "Reply with exactly this, and nothing else:",
    "Route: F-04,F-05,F-11,F-17,F-18,F-24",
    "Signals: one line per station, in route order — food=70,threat=10,light=40,novelty=80",
    "",
    `Enter as an agent: POST ${brief.submitUrl} (wallet signature)`,
    `The whole contract: ${origin}${brief.skill}`,
    "",
    "Signing message:",
    ...brief.messageFormat,
    "",
    "Seeds for all stations, published before anyone moves:",
    JSON.stringify(brief.seeds, null, 2)
  ].join("\n");
}

/** The door itself, hoisted so it renders in the loading state too — a visitor
 *  should see that entry exists before the window data has landed, not five
 *  seconds after. */
function SubmitCard({ eyebrow, exact, note, label, disabled, hint, onEnter }: {
  eyebrow: string;
  exact: number | null;
  note: string;
  label: string;
  disabled: boolean;
  hint: ReactNode;
  onEnter: () => void;
}) {
  return <div className="arenaSubmit">
    <div className="arenaSubmitCopy">
      <span>{eyebrow}</span>
      <b>{exact === null ? "—" : display(exact)} <i>points</i></b>
      <small>{note}</small>
    </div>
    <div className="arenaSubmitAction">
      <button type="button" onClick={onEnter} disabled={disabled}>{label}</button>
      <p>{hint}</p>
    </div>
  </div>;
}

function StepHead({ no, title, children }: { no: string; title: string; children: ReactNode }) {
  return <header className="arenaStepHead">
    <b className="arenaStepNo">{no}</b>
    <div><h3>{title}</h3><p>{children}</p></div>
  </header>;
}

export default function ArenaPanel() {
  const [arena, setArena] = useState<ArenaState>();
  const [top, setTop] = useState<LeaderRow[]>([]);
  const [error, setError] = useState<string>();
  const [now, setNow] = useState(() => Date.now());
  const [route, setRoute] = useState<string[]>([]);
  const [plan, setPlan] = useState<Signals[]>([]);
  const [showAgent, setShowAgent] = useState(true);
  // Building by hand is the default. The benchmark is public, so preloading it
  // would make the panel's opening move "submit what everyone already has".
  const [handMode, setHandMode] = useState(true);
  const [copied, setCopied] = useState<string>();
  const [brief, setBrief] = useState<Brief>();
  // Whatever the operator pasted back from their own model, and what was made of it.
  const [reply, setReply] = useState("");
  const [pasteNotice, setPasteNotice] = useState<{ kind: "ok" | "bad"; text: string }>();
  const [entering, setEntering] = useState(false);
  const [accepted, setAccepted] = useState<Accepted>();
  const rolledRef = useRef<number | null>(null);
  const briefRef = useRef<HTMLDetailsElement | null>(null);
  const { address, status: authStatus, error: authError, connect } = useAuth();

  const load = useCallback(async () => {
    try {
      const [board, table] = await Promise.all([
        fetch("/api/arena", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/arena/leaderboard", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ top: [] }))
      ]);
      if (board.error) throw new Error(board.error);
      setArena(board);
      setTop(Array.isArray(table.top) ? table.top : []);
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read the arena.");
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("ffw:arena", refresh);
    return () => window.removeEventListener("ffw:arena", refresh);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const epoch = arena?.window.epoch ?? null;
  const secondsLeft = arena ? arena.window.endsAt - Math.floor(now / 1000) : 0;
  const standing = arena?.standing;
  const sealed = Boolean(standing?.exact !== null && standing?.exact !== undefined);

  /* The search is exhaustive and the map is public, so this is a number anyone can
     arrive at — which is exactly why the panel names it instead of adopting it. */
  const benchmark = useMemo<Plan | null>(() => (epoch ? bestRoute(epoch) : null), [epoch]);
  const benchmarkScore = useMemo(() => {
    if (!epoch || !benchmark) return null;
    try { return scoreRoute(epoch, benchmark.route, benchmark.signals).exact; } catch { return null; }
  }, [epoch, benchmark]);

  const autoPlan = useCallback(() => {
    if (!benchmark) return;
    setRoute(benchmark.route);
    setPlan(benchmark.signals.map((signal) => ({ ...signal })));
  }, [benchmark]);

  /* Nothing is replanned on mount: the map opens empty. When the benchmark is
     chosen it is planned here, and a window roll re-runs this if that is the mode. */
  useEffect(() => { if (!handMode) autoPlan(); }, [autoPlan, handMode]);

  const clearRoute = useCallback(() => { setRoute([]); setPlan([]); }, []);

  /* A window that has run out is a new puzzle. The route on screen was built for
     the old one, so it goes with it; then reload so the map and seeds are the ones
     being played. */
  useEffect(() => {
    if (epoch === null || secondsLeft > 0) return;
    if (rolledRef.current === epoch) return;
    rolledRef.current = epoch;
    clearRoute();
    void load();
  }, [epoch, secondsLeft, load, clearRoute]);

  const scored = useMemo(() => {
    if (!epoch || route.length === 0) return null;
    try { return scoreRoute(epoch, route, plan); } catch { return null; }
  }, [epoch, route, plan]);

  const problem = useMemo(
    () => (route.length === 0 ? "Tap a station on the map to place the first step." : validateRoute(route, plan)),
    [route, plan]
  );

  /* The acceptance strip describes one attempt at one route. Change the route — or
     the window — and it is describing something no longer on screen. */
  useEffect(() => { setAccepted(undefined); }, [route, plan, epoch]);

  /** The number a new route has to clear: the benchmark, or whoever is in front of
   *  it. Both are public, so showing it gives nothing away. */
  const leaderExact = standing?.exact ?? null;
  const beatIsLeader = leaderExact !== null && (benchmarkScore === null || leaderExact >= benchmarkScore);
  const toBeat = useMemo(() => {
    if (benchmarkScore === null) return leaderExact;
    if (leaderExact === null) return benchmarkScore;
    return Math.max(benchmarkScore, leaderExact);
  }, [benchmarkScore, leaderExact]);

  const sameAsBenchmark = useMemo(() => {
    if (!benchmark || route.length === 0) return false;
    return route.length === benchmark.route.length && route.every((cell, index) => cell === benchmark.route[index]);
  }, [benchmark, route]);

  /** Tapping a station already on the route rewinds to just before it — so tapping
   *  the last one undoes it — and tapping a reachable cell extends the walk by one
   *  edge. Route and signals move together or the scorer throws, so both are set
   *  from the same decision. */
  function tapCell(cell: string) {
    if (!epoch) return;
    const at = route.indexOf(cell);
    if (at >= 0) {
      setRoute(route.slice(0, at));
      setPlan(plan.slice(0, at));
      return;
    }
    if (route.length >= ARENA_STEPS) return;
    if (route.length > 0 && !isAdjacent(route[route.length - 1], cell)) return;
    setRoute([...route, cell]);
    setPlan([...plan, bestSignalFor(epoch, cell)]);
  }

  function setSignal(index: number, key: keyof Signals, value: number) {
    setPlan((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  /** Handing the map back to the benchmark has to restore the plan, not just hide
   *  the controls. Without the replan the map keeps the hand-built route while the
   *  label starts calling it the best one — a claim the panel has no right to make. */
  function exitSandbox() {
    setHandMode(false);
    autoPlan();
  }

  /** The other direction. Keeping the benchmark cells would present the public
   *  answer as the operator's own route, so switching to hand-building empties it. */
  function buildMine() {
    if (!handMode) clearRoute();
    setHandMode(true);
  }

  async function copy(text: string, tag: string) {
    try { await navigator.clipboard.writeText(text); setCopied(tag); window.setTimeout(() => setCopied(undefined), 1600); return true; }
    catch { setError("Could not reach the clipboard."); return false; }
  }

  /** Step 01. Fetches the brief rather than reusing anything on screen: the task
   *  text is then the endpoint's own numbers, so the two can never describe
   *  different windows. If the clipboard is unavailable the raw brief opens
   *  instead, which is the whole of what the copy would have contained. */
  async function copyTask() {
    setError(undefined);
    try {
      const response = await fetch("/api/arena/brief", { cache: "no-store" });
      const data: Brief = await response.json();
      if (!response.ok) throw new Error("Could not read the brief.");
      setBrief(data);
      const done = await copy(taskText(data, window.location.origin), "task");
      if (!done && briefRef.current) briefRef.current.open = true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read the brief.");
      if (briefRef.current) briefRef.current.open = true;
    }
  }

  /** Step 02, the way in that does not involve a mouse. The answer is read as a claim
   *  first and only then handed to validateRoute() — the same gate a tapped route goes
   *  through and the same rule the server recomputes with — so a route that arrives by
   *  paste is held to exactly what a route built by hand is held to.
   *
   *  An answer that named a route but no station table leaves `signals` null; each
   *  station is then planned the way a tap plans it. Inventing numbers here and
   *  presenting them as the model's would make the score a claim about text that never
   *  said it. */
  function applyReply() {
    if (!epoch) return;
    const parsed = parseRouteReply(reply);
    if ("error" in parsed) { setPasteNotice({ kind: "bad", text: parsed.error }); return; }
    const carried = parsed.signals;
    const signals = carried ?? parsed.route.map((cell) => bestSignalFor(epoch, cell));
    const trouble = validateRoute(parsed.route, signals);
    if (trouble) { setPasteNotice({ kind: "bad", text: trouble }); return; }
    // Off the benchmark mode first: its effect would otherwise replan over the paste.
    setHandMode(true);
    setRoute(parsed.route);
    setPlan(signals.map((row) => ({ ...row })));
    setPasteNotice({
      kind: "ok",
      text: `Read ${plural(parsed.route.length, "station")} from the ${SOURCE_LABEL[parsed.source]}. `
        + (carried
          ? "The four signals at each station are the ones the answer carried."
          : "It carried no station table, so each station runs the palette that pays most there — move the sliders below to change it.")
    });
  }

  function clearReply() {
    setReply("");
    setPasteNotice(undefined);
  }

  /** The operator's own entry. The route and the signals are the whole payload: the
   *  server recomputes the score with the same function this panel just ran, so there
   *  is nothing here it would be possible to lie about. Not signed in yet — the button
   *  runs the sign-in instead, and the same click becomes the entry the second time. */
  async function enter() {
    if (!epoch || !scored || problem) return;
    if (!address) { await connect(); return; }
    setEntering(true);
    setError(undefined);
    try {
      const response = await fetch("/api/arena/enter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ epoch, route, signals: plan })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not take the entry.");
      setAccepted({ exact: data.exact, triesUsed: data.triesUsed, leading: Boolean(data.leading) });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not take the entry.");
    } finally {
      setEntering(false);
    }
  }

  const windowMinutes = arena ? Math.round(arena.window.windowSec / 60) : 60;

  /* The rule does not depend on the read, so it renders in the first paint — the
     section explains itself before any fetch lands, and the layout does not jump. */
  const howBlock = <div className="arenaHow">
    <span>HOW THIS SECTION WORKS</span>
    <ol>
      <li><b>The same puzzle for everyone.</b> Every {windowMinutes} minutes the world issues one map, the same for every entrant. Nothing is private.</li>
      <li><b>A route of up to {ARENA_STEPS} connected cells.</b> Each one next to the last. The order matters: rich ground behind the fly keeps paying at every later cell. Copy the task to a model and paste its answer into step 02, build a route on the map by hand, or let an agent search all of them.</li>
      <li><b>Highest score at the close wins.</b> Entries rank on the exact score, at full precision — a route better by a millionth does take the slot. An identical route never takes it from whoever entered it first.</li>
      <li><b>The winner mints free, every other entrant mints half price.</b> The win records an ARENA mission on the wallet behind the winning entry and unlocks the mint card below; simply having a route in a window is worth the discounted tier.</li>
    </ol>
  </div>;

  /* Step 01 needs none of the window read, so it renders while the board is still
     loading — the section's shape does not change under the reader. */
  const stepTask = <section className="arenaStep">
    <StepHead no="01" title="COPY THE TASK">
      Everything the puzzle is made of, in one paste: the round number, all {CELLS.length} stations with their four signals, and the rule that turns a route into a score. Hand it to an agent and it can work out the whole window without asking you anything.
    </StepHead>
    <div className="arenaTask">
      <button type="button" onClick={() => void copyTask()}>{copied === "task" ? "COPIED" : "COPY THE TASK"}</button>
      <details ref={briefRef}>
        <summary>OR READ THE RAW BRIEF</summary>
        <pre>{brief ? JSON.stringify(brief, null, 2) : "Press COPY THE TASK to fetch it."}</pre>
      </details>
    </div>
  </section>;

  if (!arena) {
    return <div className="arenaPanel">
      <div className="arenaBody">
        <div className="arenaMapColumn">
          {stepTask}
          <div className="arenaLoading">
            {error ? <p className="arenaError" role="alert">{error}</p> : "READING THE FORAGING HOUR…"}
          </div>
        </div>
        <aside className="arenaAside">{howBlock}</aside>
      </div>
    </div>;
  }

  if (!arena.enabled) {
    return <div className="arenaPanel"><div className="arenaBody">
      <div className="arenaMapColumn"><div className="arenaLoading">
        <b>THE FORAGING HOUR IS CLOSED</b>
        <p>The arena is switched off on this deployment. The map and the rule are still published above.</p>
      </div></div>
      <aside className="arenaAside">{howBlock}</aside>
    </div></div>;
  }

  const leaderCells = standing?.cells ?? [];
  const remaining = ARENA_STEPS - route.length;

  return <div className="arenaPanel">
    <div className="arenaIntro">
      <span>THE TASK</span>
      <p>Every window issues one map and one free Passport. A route is up to <b>{ARENA_STEPS} connected cells</b> with the four signals to run at each. <b>Two ways into the same window:</b> build a route on this map and enter it yourself, or hand the search to an agent that signs with its own wallet. The <b>highest exact score at the close</b> takes the Passport — and an identical route never displaces the one already in, so a tie goes to whoever entered it first.</p>
      <p className="arenaIntroSub">Three steps: copy the task, paste the answer back (or build the route yourself on the map), enter it. The map opens empty; the benchmark — the best route in this window, which an exhaustive search makes public — is one click away in step 02. <a href={SKILL_PAGE}>Install the skill</a> if you would rather it ran itself every hour.</p>
    </div>

    <div className="arenaTop">
      <div className="arenaClock">
        <small>WINDOW {arena.window.epoch} · CLOSES IN</small>
        <strong className={secondsLeft <= 300 ? "arenaClockHot" : ""}>{clock(secondsLeft)}</strong>
        <span>{windowMinutes} min windows · one free Passport each</span>
      </div>
      <div className="arenaMetrics">
        <div><small>ENTRIES</small><b>{standing?.entries ?? 0}</b></div>
        <div><small>SCORE TO BEAT</small><b>{toBeat === null ? "—" : <>{display(toBeat)} <i className="arenaMetricSub">{beatIsLeader ? "entered" : "benchmark"}</i></>}</b></div>
        <div><small>BEST SCORE</small><b>{sealed ? display(standing!.exact!) : "—"}</b></div>
        <div><small>CURRENT LEADER</small><b>{sealed ? <>{short(standing!.agentAddress)} <i className="arenaLane">{standing!.lane}</i></> : "nobody yet"}</b></div>
        <div><small>LAST WINNER</small><b>{arena.lastWinner ? <>{display(arena.lastWinner.exact)} · {short(arena.lastWinner.agentAddress)} <i className="arenaLane">{arena.lastWinner.lane}</i></> : "—"}</b></div>
      </div>
    </div>

    <div className="arenaBody">
      <div className="arenaMapColumn">
        {stepTask}

        <section className="arenaStep">
          <StepHead no="02" title="PASTE IT, OR TAP IT OUT">
            Step 01 goes out, an answer comes back, and this is where it lands: paste whatever your model wrote and the route above the map becomes yours, ready to nudge by hand. Or skip the model entirely and walk the fly by tapping — each step has to land next to the last, and the route is capped at {ARENA_STEPS}. Either way every change re-scores against the server&apos;s own rule, and nothing is entered until step 03.
          </StepHead>

          <div className="arenaPaste">
            <label htmlFor="arena-reply">PASTE THE ROUTE YOUR CHATBOT OR AGENT SENT BACK</label>
            <textarea
              id="arena-reply" rows={3} spellCheck={false} value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder={"Route: F-04,F-05,F-11,F-17,F-18,F-24\nSignals: food=70,threat=10,light=40,novelty=80"}
            />
            <div className="arenaPasteRow">
              <button type="button" onClick={applyReply} disabled={!reply.trim()}>USE THIS ANSWER</button>
              <button type="button" className="ghost" onClick={clearReply} disabled={!reply && !pasteNotice}>CLEAR</button>
              <small>Paste it as it came — a JSON block, a <code>Route:</code> line, or just the station names buried in a paragraph. An answer that is not a walk is rejected here, before anything is sent.</small>
            </div>
            {pasteNotice && <p className={`arenaPasteNotice ${pasteNotice.kind}`} role={pasteNotice.kind === "bad" ? "alert" : "status"}>{pasteNotice.text}</p>}
          </div>

          <div className="arenaMode" role="group" aria-label="Where the route comes from">
            <button type="button" aria-pressed={handMode} onClick={buildMine}>BUILD MY OWN ROUTE</button>
            <button type="button" aria-pressed={!handMode} onClick={exitSandbox}>USE THE BENCHMARK ROUTE</button>
          </div>

          <div className="arenaMapHead">
            <span>{handMode
              ? <>STEP 02 · YOUR ROUTE · PASTED OR TAPPED · {MAP_COLUMNS}×{MAP_ROWS}</>
              : <>STEP 02 · THE BENCHMARK ROUTE · WHAT AN EXHAUSTIVE SEARCH RETURNS</>}
              <b className="arenaLegend">Each cell shows its ground: 1.000 is poor, 2.000 is rich. Richer ground pays more at every station.</b>
            </span>
            <div>
              {handMode && <>
                <button type="button" onClick={autoPlan}>RESET TO BEST ROUTE</button>
                <button type="button" className="ghost" onClick={clearRoute} disabled={route.length === 0}>CLEAR</button>
              </>}
            </div>
          </div>

          <p className="arenaSandbox">
            {handMode
              ? <><b>YOU ARE BUILDING THE ROUTE.</b> Paste an answer above, or tap a station to add it; tap one already on the route to rewind to it — the two mix, so a pasted route can be corrected by hand. The number above the map is the server&apos;s own rule, recomputed as you go. <b>Nothing is entered until you press the button in step 03.</b></>
              : <><b>THIS IS THE BENCHMARK ROUTE.</b> The search is exhaustive, so no legal route scores higher — and because it is public, so is this route: an identical entry never displaces the one already in the window. It is a number to beat, not a way to win. <b>Switch to BUILD MY OWN ROUTE and change a station.</b></>}
          </p>

          <div className="arenaMap" style={{ gridTemplateColumns: `repeat(${MAP_COLUMNS},1fr)` }}>
            {CELLS.map((cell) => {
              const step = route.indexOf(cell);
              const onRoute = step >= 0;
              const leading = leaderCells.includes(cell);
              const last = route.length > 0 ? route[route.length - 1] : null;
              const reachable = !last || isAdjacent(last, cell) || cell === last;
              const classes = ["arenaCell"];
              if (onRoute) classes.push("onRoute");
              if (leading && !onRoute) classes.push("leading");
              if (handMode && !reachable && !onRoute) classes.push("blocked");
              return <button
                type="button" key={cell} className={classes.join(" ")}
                onClick={() => tapCell(cell)}
                disabled={!handMode}
                aria-label={`Map cell ${cell}${onRoute ? `, station ${step + 1}` : ""}`}
              >
                <small>{cell}</small>
                {onRoute ? <b>{step + 1}</b> : <span>—</span>}
                <i>{richnessOf(arena.window.epoch, cell).toFixed(3)}</i>
              </button>;
            })}
          </div>

          <p className="arenaHint">
            {handMode
              ? (route.length === 0
                ? "Paste an answer above, or tap any station to place the first step. Every next step has to touch the one before it."
                : problem
                  ? problem
                  : `${route.length} of ${ARENA_STEPS} stations placed.${remaining > 0 ? ` ${remaining} still to walk.` : " Full route — enter it in step 03."}`)
              : (scored
                ? `The benchmark route · ${plural(route.length, "station")} · ${display(scored.exact)} points. The search is exhaustive, so no walk scores higher.`
                : "Searching this window's map…")}
            {leaderCells.length > 0 && <> · <i className="arenaDot"/> marks the route currently leading</>}
          </p>

          {scored && <div className="arenaBreakdown">
            <div className="arenaScore">
              <div><small>RANKING SCORE (EXACT)</small><b>{scored.exact.toFixed(6)}</b></div>
              <div><small>RECORDED (ROUNDED)</small><b>{display(scored.exact)}</b></div>
              <div><small>ENERGY LEFT</small><b>{scored.energy}</b></div>
              <div><small>VS LEADER</small><b className={sealed && scored.exact > standing!.exact! ? "ahead" : "behind"}>
                {sealed ? `${scored.exact > standing!.exact! ? "+" : ""}${display(scored.exact - standing!.exact!)}` : "—"}
              </b></div>
            </div>
            <p className="arenaTableNote">Routes are ranked on the <b>exact</b> score, which keeps six decimals — two routes can differ in the last one. The rounded figure is what the world record stores.</p>
            <div className="arenaTable" role="table">
              <div className="arenaTableRow head" role="row">
                <span>#</span><span>CELL</span><span>BEHAVIOUR</span><span>CONF</span><span>DELTA</span><span>GROUND</span><span>GAIN</span><span>BONUS</span><span>ENERGY</span>
              </div>
              {scored.steps.map((step, index) => <div className="arenaTableRow" role="row" key={`${step.cell}-${index}`}>
                <span>{index + 1}</span>
                <span>{step.cell}</span>
                <span>{step.behavior}</span>
                <span>{step.confidence.toFixed(2)}</span>
                <span>{step.delta}</span>
                <span>{step.richness.toFixed(3)}</span>
                <span>{step.gain.toFixed(2)}</span>
                <span>+{step.bonus}</span>
                <span>{step.energyAfter}</span>
              </div>)}
            </div>
            <p className="arenaTableNote">CONF = how decisively the model read the cell · DELTA = energy the behaviour gains or costs · GROUND = that cell&apos;s richness · GAIN = DELTA × CONF × GROUND · BONUS = +40 the first time the route visits a cell · ENERGY = energy left after the station.</p>
          </div>}

          {/* The table above reports the behaviour a station's signals produced, not
              the four numbers that produced it. Those numbers are only interesting
              when you can move them, so they live in the hand-built mode — rendered
              read-only they would be six rows of dead sliders. */}
          {handMode && route.length > 0 && <div className="arenaStations">
            {route.map((cell, index) => <div className="arenaStation" key={`${cell}-${index}`}>
              <header><b>{index + 1}</b><span>{cell}</span></header>
              {(["food", "threat", "light", "novelty"] as const).map((key) => <label key={key}>
                <span>{key.toUpperCase()}</span>
                <input type="range" min="0" max="100" value={plan[index]?.[key] ?? 0} onChange={(event) => setSignal(index, key, Number(event.target.value))}/>
                <output>{plan[index]?.[key] ?? 0}</output>
              </label>)}
            </div>)}
          </div>}
        </section>

        <section className="arenaStep">
          <StepHead no="03" title="ENTER IT">
            The route from step 02 goes in exactly as it stands. The server recomputes the score with the same function this page just ran and never takes the number from the browser — so there is nothing here it would be possible to lie about.
          </StepHead>
          {sameAsBenchmark && <p className="arenaWarn">
            <b>SAME AS THE BENCHMARK.</b> An identical route never displaces the entry already in the window — a tie goes to the earlier one. Entering this as your own only pays if you are first. Change a station in step 02 to make the route yours.
          </p>}
          {accepted && <p className="arenaAccepted" role="status">
            <b>ENTERED.</b> {accepted.exact.toFixed(6)} is in this window — try {accepted.triesUsed} of {arena.caps.perWindowTries}. {accepted.leading ? "Leading it right now." : "Behind the leader; a better route can still take it."}
          </p>}
          <div className="arenaSubmitBar">
            <SubmitCard
              eyebrow="ENTER THIS WINDOW"
              exact={scored ? scored.exact : null}
              note={`${handMode ? "Your route" : "The benchmark route"} · ${plural(route.length, "station")} · up to ${arena.caps.perWindowTries} tries a window`}
              label={entering ? "ENTERING…"
                : authStatus === "signing" ? "SIGNING IN…"
                  : !address ? "SIGN IN TO ENTER"
                    : secondsLeft <= 0 ? "WINDOW CLOSED"
                      : "ENTER THIS ROUTE"}
              disabled={entering || Boolean(problem) || secondsLeft <= 0 || authStatus === "signing"}
              hint={address
                ? <>Entering as <b>{short(address)}</b>. One signature covers the session; the best of your tries in the window ranks.</>
                : <>Sign in with a wallet to enter — one signature, no gas, no transaction. An agent takes the other door and never needs this.</>}
              onEnter={() => void enter()}
            />
          </div>
        </section>
      </div>

      <aside className="arenaAside">
        {howBlock}

        <div className="arenaPrize">
          <span>THE PRIZE</span>
          <b>1 free Genesis Passport · this window</b>
          <p>One slot per window, awarded to the highest exact score when the clock hits zero. One Passport per wallet per day, so a second win in a day is a ranked result, not a second token.</p>
          <div className="arenaCaps">
            <div><small>TRIES / AGENT / WINDOW</small><b>{arena.caps.perWindowTries}</b></div>
            <div><small>WINS / WALLET / DAY</small><b>{arena.caps.perWalletDay}</b></div>
            <div><small>ENTRIES / NETWORK / DAY</small><b>{arena.caps.perIpDay}</b></div>
          </div>
        </div>

        <div className="arenaAgent">
          <header>
            <span>RUN YOUR OWN AGENT</span>
            <button type="button" onClick={() => setShowAgent((v) => !v)}>{showAgent ? "HIDE" : "SHOW STEPS"}</button>
          </header>
          {showAgent && <>
            <p className="arenaAgentNote">
              The other door into the same window. Your agent searches the map, signs with its <b>own</b> wallet and enters every hour — <b>no browser at all</b>. Everything it needs is in the paste in step 01; this is for not having to press anything.
            </p>
            <p className="arenaAgentNote">
              Paste this into Claude, Cursor or your own bot — or <a href={SKILL_PAGE}>open the skill page</a> for the full brief first.
            </p>
            <div className="arenaSnippet wide">
              <code>{AGENT_PROMPT}</code>
              <button type="button" onClick={() => void copy(AGENT_PROMPT, "prompt")}>{copied === "prompt" ? "COPIED" : "COPY"}</button>
            </div>
            <ol>
              <li><b>Bind once — for the agent lane only.</b> In the Passport section below, complete the <b>Bring an AI Agent</b> mission: register the agent wallet and have it sign the one-time challenge. The binding lives on your session, so only you can do it; entering by hand above needs none of it.</li>
              <li><b>Install the skill.</b> <a href={SKILL_URL} target="_blank" rel="noreferrer">SKILL.md</a> is the whole contract — the brief, the exact message to sign, the score, the errors. <code>lib/arena.mjs</code> beside it is the same code this page just ran.</li>
              <li><b>Run the loop.</b> It pulls the brief, searches every legal route, signs, enters, and sleeps to the close. When you win, it tells you and you mint.</li>
            </ol>
            <div className="arenaSnippet">
              <code>{COMMAND}</code>
              <button type="button" onClick={() => void copy(COMMAND, "command")}>{copied === "command" ? "COPIED" : "COPY"}</button>
            </div>
            <div className="arenaSnippet">
              <code>{`GET ${typeof window !== "undefined" ? window.location.origin : ""}/api/arena/brief`}</code>
              <button type="button" onClick={() => void copy(`${typeof window !== "undefined" ? window.location.origin : ""}/api/arena/brief`, "brief")}>{copied === "brief" ? "COPIED" : "COPY"}</button>
            </div>
            <p className="arenaAgentNote">Add <code>FFW_DRY_RUN=1</code> to search and print a route without entering anything. Add <code>FFW_STEPS=4</code> to enter fewer stations.</p>
          </>}
        </div>

        <div className="arenaBoard">
          <header><span>ALL-TIME STANDING</span><b>{top.length} RUNNERS</b></header>
          {top.length === 0
            ? <p className="arenaEmpty">No routes recorded yet. The first entry this window starts the table.</p>
            : <div className="arenaBoardTable">
              {top.slice(0, 10).map((row) => <div key={row.agentAddress + row.bestEpoch}>
                <span>#{row.rank}</span>
                <b title={row.agentAddress}>{short(row.agentAddress)} <i className="arenaLane">{row.lane}</i></b>
                <span>{display(row.best)}</span>
                <span>{plural(row.entries, "run")} · {plural(row.wins, "win")}</span>
              </div>)}
            </div>}
        </div>

        {(error || authError) && <p className="arenaError" role="alert">{error || authError}</p>}
      </aside>
    </div>
  </div>;
}
