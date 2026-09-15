"use client";

import { useEffect, useState } from "react";
import NeuralFly from "../../components/NeuralFly";
import { runExperiment } from "../../lib/experiment";

type HistoryEntry = {
  publicId: string;
  behavior: string;
  event: string;
  sector: string;
  confidence: number;
  seed: number;
  createdAt: string;
};

type AgentData = {
  address: string;
  totalRounds: number;
  approachCount: number;
  avoidCount: number;
  exploreCount: number;
  freezeCount: number;
  approachPct: number;
  avoidPct: number;
  explorePct: number;
  freezePct: number;
  archetype: string;
  archetypeTagline: string;
  archetypeColor: string;
  firstSeen: string;
  lastActive: string;
  history: HistoryEntry[];
};

const archetypeLabels: Record<string, string> = {
  BOLD_EXPLORER: "BOLD EXPLORER",
  CAUTIOUS_OBSERVER: "CAUTIOUS OBSERVER",
  ENERGY_SEEKER: "ENERGY SEEKER",
  STOIC_SURVIVOR: "STOIC SURVIVOR"
};

export default function AgentPage({ params }: { params: { address: string } }) {
  const [agent, setAgent] = useState<AgentData>();
  const [error, setError] = useState<string>();
  const [flyIndex, setFlyIndex] = useState(0);

  useEffect(() => {
    fetch(`/api/agents/${params.address}`, { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("Agent not found"); return r.json(); })
      .then((data) => setAgent(data))
      .catch((e) => setError(e.message));
  }, [params.address]);

  useEffect(() => {
    if (!agent?.history.length) return;
    const timer = setInterval(() => setFlyIndex((v) => (v + 1) % agent.history.length), 3500);
    return () => clearInterval(timer);
  }, [agent]);

  if (error) return <div className="recordLoading"><b>AGENT NOT FOUND</b><p>{error}</p><a href="/">← BACK TO WORLD</a></div>;
  if (!agent) return <div className="recordLoading"><b>LOADING AGENT…</b></div>;

  const currentExperiment = agent.history[flyIndex]
    ? runExperiment({ food: 50, threat: 50, light: 50, novelty: 50 }, agent.history[flyIndex].seed)
    : runExperiment({ food: 50, threat: 50, light: 50, novelty: 50 }, 42);

  const shortAddr = `${agent.address.slice(0, 8)}…${agent.address.slice(-6)}`;

  return (
    <div className="recordPage">
      <div className="agentHero">
        <div className="agentHeroCopy">
          <label>AGENT PROFILE</label>
          <h1>{archetypeLabels[agent.archetype] || agent.archetype}</h1>
          <p>{agent.archetypeTagline}</p>
          <div className="agentHeroAddr"><span>{shortAddr}</span><b>{agent.totalRounds} ROUNDS</b></div>
          <div className="agentHeroStats">
            <div><small>APPROACH</small><b style={{ color: "#ffbd3e" }}>{agent.approachPct}%</b><span>{agent.approachCount}</span></div>
            <div><small>AVOID</small><b style={{ color: "#ff593f" }}>{agent.avoidPct}%</b><span>{agent.avoidCount}</span></div>
            <div><small>EXPLORE</small><b style={{ color: "#baff35" }}>{agent.explorePct}%</b><span>{agent.exploreCount}</span></div>
            <div><small>FREEZE</small><b style={{ color: "#00d5ff" }}>{agent.freezePct}%</b><span>{agent.freezeCount}</span></div>
          </div>
          <a className="secondary" href="#history">VIEW DECISION HISTORY ↓</a>
        </div>
        <div className="agentHeroVisual">
          <NeuralFly experiment={currentExperiment} />
          <div className="heroDecision" key={flyIndex}>
            <small>ROUND {String(flyIndex + 1).padStart(2, "0")}</small>
            <strong>{currentExperiment.behavior}</strong>
            <span>{currentExperiment.event}</span>
          </div>
          <div className="signalStrip">
            {Object.entries(currentExperiment.signals).map(([name, value]) => (
              <div key={name}>
                <span>{name.toUpperCase()}</span>
                <b>{String(value).padStart(2, "0")}</b>
                <i><em style={{ width: `${value}%` }} /></i>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="agentHistory" id="history">
        <header><span>DECISION HISTORY</span><b>{agent.history.length} RECORDS</b></header>
        {agent.history.map((entry, i) => (
          <a className={`agentHistoryRow ${i === flyIndex ? "active" : ""}`} href={`/experiments/${entry.publicId}`} key={entry.publicId}>
            <time>#{i + 1}</time>
            <b>{entry.behavior}</b>
            <span>{entry.event}</span>
            <small>{entry.sector} · {Math.round(entry.confidence * 100)}% conf</small>
          </a>
        ))}
      </div>

      <div className="agentActions">
        <a href="/">← BACK TO WORLD</a>
      </div>
    </div>
  );
}
