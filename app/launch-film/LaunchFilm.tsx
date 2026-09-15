"use client";

import { useEffect, useState } from "react";
import NeuralFly from "../components/NeuralFly";
import { initialExperiment } from "../lib/experiment";

const FPS = 30;
const TOTAL_FRAMES = 840;
/** The real experimentHash() of `initialExperiment`, the specimen every scene renders.
 *  Recompute it after any change to the model or the seed — the film's whole argument is
 *  that this string is reproducible, so a stale literal here is a false claim on screen:
 *    npx tsx -e "import{initialExperiment as e}from'./app/lib/experiment';import{experimentHash as h}from'./app/lib/canonical';console.log(h(e.signals,e.seed,e))" */
const HASH = "7a84d8c131f2cc396d3a7ce00882f4a6e8f25f5bfcaa252ab2102e691db82e88";
const RECORD = "capture-specimen-001";
const signals = Object.entries(initialExperiment.signals);
const SUBS: [number, number, string][] = [
  [15, 60, "This is not a chatbot."],
  [93, 186, "An AI agent has entered a world that remembers."],
  [216, 318, "Bounded signals in. One choice out."],
  [330, 408, "The shared world changes, permanently."],
  [438, 549, "Every decision sealed with a SHA-256 receipt."],
  [576, 657, "Anyone can replay it — same hash."],
  [690, 711, "Decide."],
  [721, 744, "Change."],
  [753, 777, "Prove."]
];
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const span = (frame: number, start: number, end: number) => clamp((frame - start) / (end - start));
const visible = (frame: number, start: number, end: number, fade = 12) =>
  clamp(Math.min((frame - start) / fade, (end - frame) / fade));

declare global { interface Window { __setFilmFrame?: (frame: number) => void; __filmReady?: boolean } }

export default function LaunchFilm() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    window.__setFilmFrame = (next) => setFrame(Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(next))));
    window.__filmReady = true;
    return () => { delete window.__setFilmFrame; delete window.__filmReady; };
  }, []);
  const t = frame / FPS;
  const scene = frame < 66 ? "hook" : frame < 180 ? "signals" : frame < 276 ? "choice" : frame < 390 ? "world" : frame < 522 ? "receipt" : frame < 684 ? "replay" : frame < 774 ? "thesis" : "end";
  const choiceLock = span(frame, 190, 235);
  const worldProgress = span(frame, 288, 350);
  const hashChars = Math.floor(HASH.length * span(frame, 415, 485));
  const replayProgress = span(frame, 555, 640);
  const sub = SUBS.find(([start, end]) => frame >= start && frame <= end);
  return <main className={`film scene-${scene}`} style={{ "--frame": frame, "--time": `${t}s` } as React.CSSProperties}>
    <div className="filmGrid"/><div className="filmNoise"/><div className="filmScan"/>
    <header className="filmHeader"><div className="filmBrand"><i>FF</i><span>FRUIT FLY <b>WORLD</b></span></div><span>CAPTURE SPECIMEN / 001</span><b>{String(frame).padStart(4,"0")} / {TOTAL_FRAMES}</b></header>

    <section className="hookScene" style={{opacity: visible(frame, 0, 78)}}>
      <div className="hookFly" style={{opacity: span(frame, 4, 32) * (1 - span(frame, 56, 78) * .45), transform: `translate(-50%,-50%) scale(${1.55 - span(frame, 0, 78) * .9})`}}><NeuralFly experiment={initialExperiment} filmFrame={frame}/></div>
      <p style={{opacity: span(frame, 4, 18)}}>OBSERVATION CHAMBER / JKT-01</p><h1 style={{opacity: span(frame, 12, 28), transform: `translateY(${(1 - span(frame, 12, 28)) * 34}px)`}}>AN AI AGENT ENTERED<br/>A WORLD <em>THAT REMEMBERS.</em></h1><div className="hookRule"/>
    </section>

    <section className="agentScene" style={{opacity: visible(frame, 58, 300)}}>
      <div className="agentHud"><span>SUBJECT</span><b>FF-001</b><small>SYNAPSE LINK ACTIVE</small></div>
      <div className="agentSpecimen"><div className="specimenReticle"><i/><i/><i/><i/></div><NeuralFly experiment={initialExperiment} filmFrame={frame}/><div className="specimenScale"><span>100 μm</span></div></div>
      <div className="agentStatus"><small>{scene === "choice" ? "DECISION LOCK" : "LIVE MODEL"}</small><strong>{scene === "choice" ? initialExperiment.behavior : "SENSING"}</strong><span>{scene === "choice" ? `${Math.round(initialExperiment.confidence * 100)}% CONFIDENCE` : "FFW-CI / 0.1"}</span></div>
    </section>

    <section className="signalScene" style={{opacity: visible(frame, 66, 198)}}><div className="sceneLabel">01 / BOUNDED SIGNALS IN</div><div className="signalRack">
      {signals.map(([name,value], index) => { const p = span(frame, 76 + index * 18, 105 + index * 18); return <article key={name} style={{opacity:p}}><span>{name.toUpperCase()}</span><b>{String(value).padStart(2,"0")}</b><i><em style={{width:`${value * p}%`}}/></i></article>; })}
    </div></section>

    <section className="choiceScene" style={{opacity: visible(frame, 174, 288)}}><div className="sceneLabel">02 / DETERMINISTIC CHOICE</div><div className="choiceWord" style={{transform:`translateY(${(1-choiceLock)*50}px)`,opacity:choiceLock}}><small>MODEL OUTPUT</small><strong>{initialExperiment.behavior}</strong><span>{Math.round(initialExperiment.confidence*100)}%</span></div></section>

    <section className="worldScene" style={{opacity: visible(frame, 276, 402)}}><div className="sceneLabel dark">03 / ONE SHARED WORLD CHANGES</div><div className="worldMapFilm"><div className="radar"/><i className="node n1"/><i className="node n2"/><i className="node n3 active"/><div className="marker" style={{left:`${20+worldProgress*34}%`,top:`${68-worldProgress*27}%`}}>FF-001</div></div><div className="worldEvidence"><div><span>WORLD REVISION</span><b>{worldProgress < .55 ? "#000" : "#001"}</b></div><div><span>ENERGY</span><b>{worldProgress < .55 ? "100" : "112"}</b></div><article style={{opacity:span(frame,330,360)}}><small>#001</small><strong>APPROACH</strong><span>Energy source reached</span><b>F-03 · +12 ENERGY</b></article></div></section>

    <section className="receiptScene" style={{opacity: visible(frame, 384, 540)}}><div className="sceneLabel">04 / SHA-256 CANONICAL RECEIPT</div><div className="receiptCard"><header><span>PUBLIC RECORD / {RECORD}</span><b>SHA-256 VERIFIED</b></header><div className="receiptMain"><div><small>DECISION</small><strong>{initialExperiment.behavior}</strong><span>{Math.round(initialExperiment.confidence*100)}% CONFIDENCE</span></div><dl><dt>MODEL</dt><dd>FFW-CI/0.1</dd><dt>SEED</dt><dd>{initialExperiment.seed}</dd><dt>WORLD</dt><dd>#001 / +12</dd></dl></div><p>SHA-256 / {HASH.slice(0,hashChars)}<i/></p></div></section>

    <section className="replayScene" style={{opacity: visible(frame, 516, 702)}}><div className="sceneLabel">05 / INDEPENDENT REPLAY</div><div className="jsonSheet" style={{transform:`translateX(${-replayProgress*38}vw) rotate(${-2+replayProgress*2}deg)`}}><b>{RECORD}.json</b><code>{`{\n  "model": "FFW-CI/0.1",\n  "seed": 190826,\n  "behavior": "APPROACH"\n}`}</code></div><div className="verifyPanel"><span>SAME INPUTS · SAME MODEL · SAME SEED</span><div className="verifyTrack"><i style={{width:`${replayProgress*100}%`}}/></div><small>RECOMPUTED HASH</small><code>{HASH}</code><strong className={replayProgress > .88 ? "locked" : ""}>{replayProgress > .88 ? "EXACT MATCH VERIFIED" : "RECOMPUTING…"}</strong></div></section>

    <section className="thesisScene" style={{opacity: visible(frame, 678, 786)}}><div><span className={frame>690?"on":""}>DECIDE</span><i>→</i><span className={frame>720?"on":""}>CHANGE</span><i>→</i><span className={frame>750?"on":""}>PROVE</span></div><code>SHA-256 / {HASH}</code></section>

    <section className="endScene" style={{opacity: span(frame, 774, 800)}}><div className="endFly"><NeuralFly experiment={initialExperiment} filmFrame={frame}/></div><div className="endMark">FF</div><h2>FRUIT FLY <em>WORLD</em></h2><p>A persistent world for AI agents.</p><a>fruitfly.world</a><small>GENESIS PASSPORT · VERIFIED MISSIONS</small><img className="endPassport" src="/passport-genesis.png" alt="Genesis Passport" style={{opacity: span(frame, 782, 797), transform: `translateY(calc(-50% + ${(1 - span(frame, 782, 797)) * 46}px)) rotate(-4deg)`}}/></section>
    <div className="impactFlash" style={{opacity: clamp(1 - Math.abs(frame - 285) / 5)}}/>
    <div className="filmSubs" style={{opacity: sub ? 1 : 0}}>{sub?.[2] ?? " "}</div>
    <footer className="filmFooter"><span>DETERMINISTIC · PERSISTENT · REPLAYABLE</span><span>NO WALLET OR MINT ACTIONS IN CAPTURE MODE</span></footer>
  </main>;
}
