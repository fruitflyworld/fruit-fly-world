// bench.js — "Don't exam the model. Starve it." — the closed-loop exam room.
// ?bench=1 pauses the render loop and drives the GameScene manually at a fixed
// 60 Hz step. The same (seed, brain, generations) is run twice; if every
// decision hash and every generation outcome matches, the run is bit-identical
// and the world is a fair exam: same paper, same grader, no favors.
// Results go into a local leaderboard (localStorage flyline_bench_v1).
import { GEN_DURATION, draftCards, makeGFState } from "./sim.js";
import { contentHash } from "./brain.js";

const DT = 1000 / 60;
const MAX_GENS = 8;

export async function runBench(scene, opts = {}) {
  const seed = (opts.seed || 42) >>> 0;
  const brain = ["circuit", "judgment", "genes", "manual"].includes(opts.brain) ? opts.brain : "circuit";
  const gens = Math.max(1, Math.min(MAX_GENS, opts.gens || 2));

  const savedState = JSON.parse(JSON.stringify(scene.state));
  const savedKey = localStorage.getItem("flyline_jev_key");
  // bench only grades deterministic brains; a remote oracle cannot be re-run
  if (savedKey) localStorage.removeItem("flyline_jev_key");

  scene.__bench = true;
  try { scene.scene.pause(); } catch (e) { /* loop already stopped */ }

  const t0 = performance.now();

  async function runOnce() {
    scene.state = JSON.parse(JSON.stringify(savedState));
    scene.state.worldSeed = seed;
    scene.state.brainId = brain;
    scene.state.genNumber = 1;
    scene.state.ownedTraits = [];
    scene.state.rivalTraits = [];
    scene.rivalFly.rivalTraits = []; // resetGenerationWorld reads the fly, not the state
    scene.state.lineageEggs = 0;
    scene.state.bestEggs = 0;
    scene.state.eggsHistory = [];
    scene.playerBrainId = brain;
    scene.attachBrain(brain, { silent: true });
    scene.started = true;
    // clear residue the constructor normally owns: novelty memory and clocks
    scene.visitedCells = new Set();
    scene.simTime = 0; scene.slowmoT = 0; scene.dangerFlash = 0;
    scene.savedRivalSnapshot = null;
    scene.predator.target = null; scene.predator.angle = 0;
    scene.predator.lungeDir = { x: 0, y: 0 }; scene.predator.legPhase = 0;
    scene.agentVec = null; scene.touchVec = null;
    // resetFly does not touch the GF neuron; leftover membrane potential would
    // make run B's escape reflex fire on a different frame than run A's
    scene.playerFly.gf = makeGFState();
    scene.rivalFly.gf = makeGFState();
    scene.resetGenerationWorld(); // gen 1 (also re-seeds the world rng)

    const out = [];
    for (let g = 1; g <= gens; g++) {
      let frames = 0;
      while (!scene.ended && frames < GEN_DURATION * 60 + 240) {
        scene.update(frames * DT, DT);
        frames++;
        await Promise.resolve(); // let sealed decisions (microtasks) land
      }
      const log = scene.brainLog.slice();
      out.push({
        gen: g,
        eggs: scene.playerFly.eggs,
        rivalEggs: scene.rivalFly.eggs,
        survived: scene.playerFly.alive,
        deathReason: scene.playerFly.alive ? "time" : scene.playerFly.deathReason || "predator",
        decisions: log.length,
        logHash: contentHash(log.map(r => r.contentHash)),
      });
      if (g < gens) {
        // deterministic player: always inherit the first offered card
        const cards = draftCards(seed, scene.state.genNumber,
          scene.playerFly.eggs, scene.rivalFly.eggs, scene.state.ownedTraits);
        scene.nextGen(cards[0]); // resets the world for g+1
      }
    }
    return out;
  }

  const runA = await runOnce();
  const runB = await runOnce();
  const identical = contentHash(runA) === contentHash(runB);

  // restore the player's save and key; leave the scene paused behind the report
  scene.state = savedState;
  if (savedKey) localStorage.setItem("flyline_jev_key", savedKey);

  const result = {
    ts: Date.now(), seed, brain, gens, identical,
    eggsTotal: runA.reduce((a, g) => a + g.eggs, 0),
    decisions: runA.reduce((a, g) => a + g.decisions, 0),
    elapsedMs: Math.round(performance.now() - t0),
  };
  try {
    const board = JSON.parse(localStorage.getItem("flyline_bench_v1") || "[]");
    board.push(result);
    while (board.length > 30) board.shift();
    localStorage.setItem("flyline_bench_v1", JSON.stringify(board));
  } catch (e) { /* private mode: report still shows */ }

  // An IDENTICAL double run is the EXAMINED dish quest — first one is kept as
  // freemint evidence (client-attested v1, validated by app/lib/dish.ts).
  if (identical) {
    try {
      const store = JSON.parse(localStorage.getItem("flyline_quests_v1") || "{}");
      if (!store.EXAMINED) {
        store.EXAMINED = {
          quest: "EXAMINED", gen: 1,
          eggs: result.eggsTotal, rivalEggs: runA.reduce((a, g) => a + g.rivalEggs, 0),
          survived: runA.every((g) => g.survived), deathReason: "time", escapes: 0,
          brain: { id: brain, model: null }, decisions: result.decisions,
          seed, gens, identical: true, ts: Date.now(),
        };
        localStorage.setItem("flyline_quests_v1", JSON.stringify(store));
      }
    } catch (e) { /* private mode: report still shows */ }
  }

  return { ...result, runA, runB };
}

// Renders the exam report into the page (bench mode replaces the game UI).
export function renderBenchReport(r) {
  const old = document.getElementById("benchReport");
  if (old) old.remove();
  const el = document.createElement("div");
  el.id = "benchReport";
  const rows = r.runA.map(g =>
    `<tr><td>${g.gen}</td><td>${g.eggs}</td><td>${g.rivalEggs}</td><td>${g.survived ? "yes" : g.deathReason}</td>` +
    `<td>${g.decisions}</td><td class="mono">${g.logHash}</td></tr>`
  ).join("");
  const board = (() => {
    try { return JSON.parse(localStorage.getItem("flyline_bench_v1") || "[]"); } catch { return []; }
  })().slice().reverse().slice(0, 8);
  const brows = board.map(b =>
    `<tr class="${b.identical ? "" : "bad"}"><td>${new Date(b.ts).toISOString().slice(0, 16).replace("T", " ")}</td>` +
    `<td>${b.seed}</td><td>${b.brain}</td><td>${b.gens}</td><td>${b.identical ? "identical" : "DIVERGED"}</td>` +
    `<td>${b.eggsTotal}</td><td>${b.decisions}</td></tr>`
  ).join("");
  // The shareable one-liner: every result doubles as a challenge someone else
  // can accept by clicking the link — same seed, same brain, same paper.
  const challenge =
    `Fruit Fly World — exam result\n` +
    `${r.identical ? "IDENTICAL" : "DIVERGED"} · seed ${r.seed} · brain ${r.brain} · ${r.gens} gen ×2 runs\n` +
    `${r.eggsTotal} eggs · ${r.decisions} sealed decisions\n` +
    `Run the same exam and beat my eggs:\n` +
    `https://fruitfly.world/play?bench=1&seed=${r.seed}&brain=${r.brain}&gens=${r.gens}`;
  el.innerHTML =
    `<div class="verdict ${r.identical ? "win" : "lose"}">${r.identical
      ? "IDENTICAL — same seed, same brain, same paper. Every decision hash and every outcome matched."
      : "DIVERGED — the two runs disagreed. This is a bug report, not a score."}</div>` +
    `<div class="benchMeta">seed ${r.seed} · brain ${r.brain} · ${r.gens} generation${r.gens > 1 ? "s" : ""} ×2 runs · ` +
    `${r.decisions} sealed decisions · ${r.elapsedMs} ms ` +
    `<button type="button" class="benchCopy" id="benchCopyBtn">COPY RESULT AS CHALLENGE</button></div>` +
    `<table><thead><tr><th>gen</th><th>eggs</th><th>wild type</th><th>survived</th><th>decisions</th><th>decision-log hash</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>` +
    `<div class="benchH2">Recent exams (this browser)</div>` +
    `<table><thead><tr><th>when</th><th>seed</th><th>brain</th><th>gens</th><th>verdict</th><th>eggs</th><th>decisions</th></tr></thead>` +
    `<tbody>${brows}</tbody></table>` +
    `<div class="benchFoot">Don't exam the model. Starve it. — try <a href="?bench=1&seed=42&brain=judgment&gens=2">seed 42 · judgment</a> · ` +
    `<a href="?bench=1&seed=1337&brain=circuit&gens=2">seed 1337 · circuit</a> · <a href="/play">← back to the dish</a></div>`;
  document.getElementById("gameWrap").appendChild(el);
  const btn = document.getElementById("benchCopyBtn");
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(challenge).then(() => {
      btn.textContent = "COPIED ✓ — PASTE IT ANYWHERE";
      setTimeout(() => { btn.textContent = "COPY RESULT AS CHALLENGE"; }, 2500);
    }).catch(() => { /* clipboard blocked: the report itself is still screenshottable */ });
  });
  return el;
}
