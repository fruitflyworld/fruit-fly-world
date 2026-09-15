import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const FRAMES = path.join(ROOT, "media/launch-film/frames");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 3299;
const DEBUG_PORT = 9333;
const TOTAL = 840;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ready(url, attempts = 120) {
  for (let i = 0; i < attempts; i++) {
    try { const response = await fetch(url); if (response.ok) return response; } catch {}
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  await rm(FRAMES, { recursive: true, force: true });
  await mkdir(FRAMES, { recursive: true });
  const next = spawn("npm", ["run", "dev", "--", "-H", "127.0.0.1", "-p", String(PORT)], { cwd: ROOT, stdio: "inherit" });
  const chrome = spawn(CHROME, ["--headless=new", "--hide-scrollbars", "--disable-gpu", "--force-device-scale-factor=1", `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${path.join(FRAMES, ".chrome")}`, "about:blank"], { stdio: "ignore" });
  const stop = () => { next.kill("SIGTERM"); chrome.kill("SIGTERM"); };
  process.on("SIGINT", () => { stop(); process.exit(130); });
  try {
    await ready(`http://127.0.0.1:${PORT}/launch-film`);
    const target = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?http://127.0.0.1:${PORT}/launch-film`, { method: "PUT" }).then((r) => r.json());
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = ({ data }) => { const message = JSON.parse(data); const handler = pending.get(message.id); if (handler) { pending.delete(message.id); handler(message); } };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const callId = ++id; pending.set(callId, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result));
      ws.send(JSON.stringify({ id: callId, method, params }));
    });
    await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/launch-film` });
    await ready(`http://127.0.0.1:${PORT}/launch-film`);
    await wait(1200);
    await send("Runtime.evaluate", { expression: "document.fonts.ready", awaitPromise: true });
    for (let frame = 0; frame < TOTAL; frame++) {
      await send("Runtime.evaluate", { expression: `window.__setFilmFrame(${frame});new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`, awaitPromise: true });
      const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 95, fromSurface: true });
      await writeFile(path.join(FRAMES, `frame-${String(frame).padStart(4, "0")}.jpg`), Buffer.from(shot.data, "base64"));
      if (frame % 60 === 0) process.stdout.write(`Captured ${frame}/${TOTAL}\n`);
    }
    ws.close();
  } finally { stop(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
