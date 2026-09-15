import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "media/launch-film");
const VO_DIR = path.join(OUT, "vo");
const ffmpeg = "/usr/local/bin/ffmpeg";
const VOICE = process.env.FFW_VO_VOICE || "en-US-ChristopherNeural";
const RATE = process.env.FFW_VO_RATE || "+0%";

// [startMs, line] aligned to the 28s / 840-frame scene timeline
const lines = [
  [500, "This is not a chatbot."],
  [3100, "An AI agent has entered a world that remembers."],
  [7200, "Bounded signals in. One choice out."],
  [11000, "The shared world changes, permanently."],
  [14600, "Every decision sealed with a SHA-256 receipt."],
  [19200, "Anyone can replay it — same hash."],
  [23000, "Decide."],
  [24050, "Change."],
  [25100, "Prove."]
];

const run = (cmd, args) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { stdio: "inherit" });
  child.on("error", reject);
  child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)));
});

await mkdir(VO_DIR, { recursive: true });
const segments = [];
for (let i = 0; i < lines.length; i++) {
  const [startMs, text] = lines[i];
  const raw = path.join(VO_DIR, `vo-${String(i).padStart(2, "0")}-raw.mp3`);
  const file = path.join(VO_DIR, `vo-${String(i).padStart(2, "0")}.mp3`);
  await run("python3", ["-m", "edge_tts", "--voice", VOICE, `--rate=${RATE}`, "--text", text, "--write-media", raw]);
  await run(ffmpeg, ["-y", "-i", raw, "-af", "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse", file]);
  segments.push({ startMs, file });
}

const sound = path.join(OUT, "sound-design.wav");
const mix = path.join(OUT, "voice-mix.wav");
const inputs = ["-i", sound, ...segments.flatMap((s) => ["-i", s.file])];
const filters = [
  "[0:a]volume=0.5[bed]",
  ...segments.map((s, i) => `[${i + 1}:a]adelay=${s.startMs}|${s.startMs}[v${i}]`),
  `[bed]${segments.map((_, i) => `[v${i}]`).join("")}amix=inputs=${segments.length + 1}:normalize=0,alimiter=limit=.85[a]`
].join(";");
await run(ffmpeg, ["-y", ...inputs, "-filter_complex", filters, "-map", "[a]", "-t", "28", "-c:a", "pcm_s24le", mix]);
console.log(`\nVoiceover mix:\n${mix}`);
