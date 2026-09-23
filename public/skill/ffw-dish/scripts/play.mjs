#!/usr/bin/env node
/* ── ffw-dish/scripts/play.mjs ──────────────────────────────────────────────
   Fly a Fruit Fly World lineage headless, no npm dependencies (Node 18+).

   Opens the game in headless Chrome (CDP over --remote-debugging-pipe), calls
   FlyLabAPI.autopilot once, prints the sealed result, writes ffw-run.json,
   and prints the import URL that carries the run's DISH-quest evidence into
   the operator's own browser.

     node play.mjs --seed 42 --brain judgment --gens 3
     node play.mjs --seed 7 --brain circuit --gens 5 --policy ./my-policy.mjs
   ------------------------------------------------------------------------- */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

/* ── args ─────────────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt;
};
const BASE = flag("base", "https://fruitfly.world").replace(/\/$/, "");
const SEED = (Number(flag("seed", 42)) >>> 0);
const BRAIN = ["manual", "genes", "circuit", "judgment"].includes(flag("brain", "judgment"))
  ? flag("brain", "judgment") : "judgment";
const GENS = Math.max(1, Math.min(8, Number(flag("gens", 3)) || 3));
const POLICY_PATH = flag("policy", null);
const OUT = flag("out", "ffw-run.json");
const TIMEOUT_MS = Number(flag("timeout", 600000)) || 600000;

if (args.includes("--help") || args.includes("-h")) {
  console.log(`usage: node play.mjs [--seed N] [--brain manual|genes|circuit|judgment] [--gens 1-8]
                [--policy ./my-policy.mjs] [--base https://fruitfly.world]
                [--out ffw-run.json] [--timeout ms]

  --policy   a module whose default export is (cards, state) => traitId —
             your draft decision, called once per generation. May be async.
             Without it the run uses the built-in economy-first default.`);
  process.exit(0);
}

/* ── policy: load in Node, ship its source to the page ───────────────────── */
let policySrc = null;
if (POLICY_PATH) {
  const mod = await import(pathToFileURL(POLICY_PATH).href);
  const fn = mod.default;
  if (typeof fn !== "function") {
    console.error("policy module must default-export a function (cards, state) => traitId");
    process.exit(1);
  }
  policySrc = fn.toString(); // must be self-contained: no closed-over imports
}

/* ── chrome ───────────────────────────────────────────────────────────────── */
function findChrome() {
  if (process.env.FFW_CHROME) return process.env.FFW_CHROME;
  if (process.platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  for (const c of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"]) {
    return c; // first hit on PATH — spawn resolves it
  }
}
const profile = mkdtempSync(tmpdir() + "/ffw-dish-");
const CHROME_ARGS = ["--headless=new", "--disable-gpu", "--no-first-run",
  "--no-default-browser-check", `--user-data-dir=${profile}`, "--remote-debugging-pipe", "about:blank"];

function launch(useArchWrap) {
  const exe = findChrome();
  // x64 Node on Apple Silicon spawns Chrome under Rosetta, where external
  // module loads stall — pin the arm64 slice instead.
  const cmd = useArchWrap && process.platform === "darwin" && process.arch === "x64"
    ? "arch" : exe;
  const argv = useArchWrap && cmd === "arch" ? ["-arm64", exe, ...CHROME_ARGS] : CHROME_ARGS;
  return spawn(cmd, argv, { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
}

let chrome = launch(true);
if (chrome.pid === undefined) chrome = launch(false); // arch wrap unavailable
chrome.on("error", (e) => {
  console.error("FFW-PLAY FAILED: could not launch Chrome (" + e.message + "). Set FFW_CHROME=/path/to/chrome");
  process.exit(1);
});

/* ── CDP over fd 3/4 (NUL-delimited JSON) ─────────────────────────────────── */
let buf = "";
const pending = new Map();
let nextId = 1;
const exceptions = [];
function send(method, params = {}, sessionId) {
  const id = nextId++;
  const msg = { id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  chrome.stdio[3].write(JSON.stringify(msg) + "\0");
  return new Promise((res) => pending.set(id, res));
}
chrome.stdio[4].on("data", (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf("\0")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    try {
      const m = JSON.parse(line);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      else if (m.method === "Runtime.exceptionThrown") {
        exceptions.push((m.params.exceptionDetails.exception || {}).description
          || m.params.exceptionDetails.text || "unknown page exception");
      }
    } catch { /* partial frame */ }
  }
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const die = async (msg) => { console.error("FFW-PLAY FAILED:", msg); try { chrome.kill(); } catch {} process.exit(1); };

/* ── the run ──────────────────────────────────────────────────────────────── */
try {
  await sleep(600);
  const t = await send("Target.createTarget", { url: `${BASE}/play` });
  if (!t.result) await die("Chrome did not answer Target.createTarget — is FFW_CHROME set to a real Chrome?");
  const a = await send("Target.attachToTarget", { targetId: t.result.targetId, flatten: true });
  const S = a.result.sessionId;
  await send("Runtime.enable", {}, S);

  // wait for the game to expose its API
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    await sleep(500);
    const r = await send("Runtime.evaluate",
      { expression: "typeof FlyLabAPI !== 'undefined' && !!FlyLabAPI.autopilot", returnByValue: true }, S);
    ready = r.result && r.result.result && r.result.result.value === true;
  }
  if (!ready) await die("the game never became ready at " + BASE + "/play");

  console.log(`# fruitfly.world — autopilot run`);
  console.log(`# seed ${SEED} · brain ${BRAIN} · gens ${GENS} · policy ${policySrc ? "custom" : "default-economy"}`);
  const started = Date.now();
  const expression = `(async()=>{
    const policy = ${policySrc ? `eval("(" + ${JSON.stringify(policySrc)} + ")")` : "null"};
    const r = await FlyLabAPI.autopilot({ seed: ${SEED}, brain: "${BRAIN}", gens: ${GENS}, policy });
    return JSON.stringify(r);
  })()`;
  const ev = await send("Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true }, S);

  if (!ev.result || !ev.result.result)
    await die("autopilot evaluate failed: " + JSON.stringify(ev).slice(0, 400));
  // surface page-side errors properly — a policy that throws (e.g. references
  // module-scope bindings that did not survive serialization) must be reported
  // as what it is, not as a JSON parse failure one step later
  const exd = ev.result.exceptionDetails;
  if (exd) {
    const what = (exd.exception && (exd.exception.description || exd.exception.value)) || exd.text;
    await die("the page threw during the run (if this names an undefined variable, your policy "
      + "function references module-scope bindings — policies must be self-contained): " + what);
  }
  if (ev.result.result.subtype === "error")
    await die("page threw: " + ev.result.result.description);

  const result = JSON.parse(ev.result.result.value);
  writeFileSync(OUT, JSON.stringify(result, null, 2));

  console.log("");
  for (const g of result.gens) {
    console.log(`  gen ${g.gen}: eggs ${g.eggs} vs rival ${g.rivalEggs} · `
      + (g.survived ? "survived" : `died (${g.deathReason})`)
      + ` · ${g.decisions} decisions · logHash ${g.logHash.slice(0, 12)}`);
  }
  console.log(`  total: ${result.eggsTotal} eggs · ${result.decisions} sealed decisions · ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`  full run + sealed log: ${OUT}`);

  const questKeys = Object.keys(result.quests || {});
  console.log("");
  if (questKeys.length > 0) {
    console.log(`  DISH quests completed this run: ${questKeys.join(", ")}`);
    console.log(`  import URL for your operator (open it once, in THEIR browser):`);
    console.log(`  ${BASE}/play?import=${encodeURIComponent(JSON.stringify(result.quests))}`);
    console.log(`  then they claim the free mint themselves at ${BASE}/#mint — the Passport is`);
    console.log(`  soul-bound to them; an agent can never mint it.`);
  } else {
    console.log(`  no DISH quests completed this run (need: survive one gen / 3 eggs in one gen /`);
    console.log(`  3 escapes in one gen — or an IDENTICAL exam run at ${BASE}/play?bench=1).`);
  }
  if (exceptions.length) {
    console.log("");
    console.log("  page exceptions during the run:");
    exceptions.slice(0, 5).forEach((e) => console.log("   !", e.slice(0, 300)));
  }
  await send("Browser.close", {});
  chrome.kill();
  process.exit(0);
} catch (e) {
  await die(e.message);
}
