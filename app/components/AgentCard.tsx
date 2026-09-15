"use client";

import { useEffect, useState } from "react";

type AgentSummary = {
  address: string;
  totalRounds: number;
  approachCount: number;
  avoidCount: number;
  exploreCount: number;
  freezeCount: number;
  lastActive: string;
  archetype: string;
  archetypeColor: string;
};

const archetypeLabels: Record<string, string> = {
  BOLD_EXPLORER: "Bold Explorer",
  CAUTIOUS_OBSERVER: "Cautious Observer",
  ENERGY_SEEKER: "Energy Seeker",
  STOIC_SURVIVOR: "Stoic Survivor"
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AgentCard({ agent }: { agent: AgentSummary }) {
  return (
    <a href={`/agents/${agent.address}`} className="agentCard" style={{ "--agent-color": agent.archetypeColor } as React.CSSProperties}>
      <div className="agentCardTop">
        <span className="agentArchetype">{archetypeLabels[agent.archetype] || agent.archetype}</span>
        <span className="agentAddr">{shortAddr(agent.address)}</span>
      </div>
      <div className="agentCardStats">
        <div><small>ROUNDS</small><b>{agent.totalRounds}</b></div>
        <div><small>APPROACH</small><b>{agent.approachCount}</b></div>
        <div><small>AVOID</small><b>{agent.avoidCount}</b></div>
        <div><small>EXPLORE</small><b>{agent.exploreCount}</b></div>
        <div><small>FREEZE</small><b>{agent.freezeCount}</b></div>
      </div>
      <div className="agentCardBar">
        <i style={{ width: `${(agent.approachCount / agent.totalRounds) * 100}%`, background: "#ffbd3e" }} />
        <i style={{ width: `${(agent.avoidCount / agent.totalRounds) * 100}%`, background: "#ff593f" }} />
        <i style={{ width: `${(agent.exploreCount / agent.totalRounds) * 100}%`, background: "#baff35" }} />
        <i style={{ width: `${(agent.freezeCount / agent.totalRounds) * 100}%`, background: "#00d5ff" }} />
      </div>
      <small className="agentCardTime">{timeAgo(agent.lastActive)}</small>
    </a>
  );
}

export function AgentLeaderboard() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { setAgents(data.agents || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="agentLeaderboard"><div className="emptyFeed"><b>LOADING AGENTS…</b></div></div>;
  if (!agents.length) return <div className="agentLeaderboard"><div className="emptyFeed"><b>NO AGENTS YET</b><span>Be the first to run an experiment.</span></div></div>;

  return (
    <div className="agentLeaderboard">
      <header><span>AGENT REGISTRY</span><b>{agents.length} ACTIVE</b></header>
      {agents.map((agent) => <AgentCard agent={agent} key={agent.address} />)}
    </div>
  );
}
