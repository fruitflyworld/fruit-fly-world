import { access, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "media/launch-film");
const FRAMES = path.join(OUT, "frames/frame-%04d.jpg");
const ffmpeg = "/usr/local/bin/ffmpeg";
const run = (args) => new Promise((resolve, reject) => {
  const child = spawn(ffmpeg, args, { stdio: "inherit" });
  child.on("error", reject); child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
});

await mkdir(OUT, { recursive: true });
const audio = path.join(OUT, "sound-design.wav");
const master = path.join(OUT, "fruit-fly-world-launch-master.mp4");
const social = path.join(OUT, "fruit-fly-world-launch-x.mp4");
const silent = path.join(OUT, "fruit-fly-world-launch-silent.mp4");
const poster = path.join(OUT, "fruit-fly-world-launch-poster.jpg");

const tones = [
  "sine=f=54:r=48000:d=28,volume=0.10,lowpass=f=180[bed]",
  "sine=f=920:r=48000:d=0.06,adelay=2300|2300,volume=0.17[t1]",
  "sine=f=1080:r=48000:d=0.06,adelay=2900|2900,volume=0.15[t2]",
  "sine=f=1240:r=48000:d=0.06,adelay=3500|3500,volume=0.14[t3]",
  "sine=f=1450:r=48000:d=0.07,adelay=4100|4100,volume=0.13[t4]",
  "anoisesrc=color=pink:r=48000:d=3.2,highpass=f=500,lowpass=f=5000,volume=0.035,afade=t=in:d=2,afade=t=out:st=2.7:d=0.5,adelay=6000|6000[rise]",
  "sine=f=92:r=48000:d=0.45,volume=0.32,afade=t=out:st=0.08:d=0.37,adelay=9500|9500[impact]",
  "anoisesrc=color=white:r=48000:d=4.4,highpass=f=1600,volume=0.014,adelay=13200|13200[print]",
  "sine=f=660:r=48000:d=0.12,adelay=17600|17600,volume=0.13[j1]",
  "sine=f=880:r=48000:d=0.16,adelay=21500|21500,volume=0.17[j2]",
  "sine=f=1320:r=48000:d=0.22,adelay=22200|22200,volume=0.16[j3]",
  "sine=f=196:r=48000:d=2.1,adelay=25800|25800,volume=0.12,afade=t=out:st=1.2:d=0.9[end]",
  "[bed][t1][t2][t3][t4][rise][impact][print][j1][j2][j3][end]amix=inputs=12:normalize=0,alimiter=limit=0.82,afade=t=out:st=27.2:d=0.8[a]"
].join(";");
await run(["-y", "-filter_complex", tones, "-map", "[a]", "-c:a", "pcm_s24le", audio]);
const voiceMix = path.join(OUT, "voice-mix.wav");
const audioIn = await access(voiceMix).then(() => voiceMix).catch(() => audio);
await run(["-y", "-framerate", "30", "-i", FRAMES, "-i", audioIn, "-t", "28", "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-profile:v", "high", "-pix_fmt", "yuv420p", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", master]);
await run(["-y", "-i", master, "-c:v", "libx264", "-preset", "slow", "-b:v", "10M", "-maxrate", "12M", "-bufsize", "20M", "-profile:v", "high", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", social]);
await run(["-y", "-i", master, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", silent]);
await run(["-y", "-ss", "26.4", "-i", master, "-frames:v", "1", "-q:v", "2", "-update", "1", poster]);
console.log(`\nExports:\n${master}\n${social}\n${silent}\n${poster}`);
