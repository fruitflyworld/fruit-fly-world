"use client";

import { useEffect, useMemo, useState } from "react";
import FruitFlySwarm from "./FruitFlySwarm";
import { runExperiment, type Experiment } from "../lib/experiment";

const rounds: Experiment[] = [
  runExperiment({ food: 82, threat: 36, light: 58, novelty: 71 }, 190826),
  runExperiment({ food: 18, threat: 91, light: 42, novelty: 38 }, 190843),
  runExperiment({ food: 34, threat: 20, light: 66, novelty: 94 }, 190860),
  runExperiment({ food: 91, threat: 12, light: 78, novelty: 45 }, 190877),
  runExperiment({ food: 55, threat: 55, light: 50, novelty: 88 }, 190891)
];

const fakeHistory = [
  { behavior: "APPROACH" as const, event: "Energy source reached", seed: 190826 },
  { behavior: "AVOID" as const, event: "Threat corridor escaped", seed: 190843 },
  { behavior: "EXPLORE" as const, event: "F-12 mapped", seed: 190860 },
  { behavior: "FREEZE" as const, event: "Position held; energy conserved", seed: 190877 },
  { behavior: "APPROACH" as const, event: "Energy source reached", seed: 190891 }
];

type ArchetypeKey = "BOLD_EXPLORER" | "CAUTIOUS_OBSERVER" | "ENERGY_SEEKER" | "STOIC_SURVIVOR";
type Archetype = { key: ArchetypeKey; title: string; tagline: string; color: string };

function getArchetype(signals: Experiment["signals"]): Archetype {
  const { food, threat, light, novelty } = signals;
  if (novelty > 70 && threat < 50) return { key: "BOLD_EXPLORER", title: "BOLD EXPLORER", tagline: "Drawn to the unknown. Maps new sectors.", color: "#baff35" };
  if (threat > 70) return { key: "CAUTIOUS_OBSERVER", title: "CAUTIOUS OBSERVER", tagline: "Survives by reading the room.", color: "#ff593f" };
  if (food > 70 && novelty < 50) return { key: "ENERGY_SEEKER", title: "ENERGY SEEKER", tagline: "Follows the signal. Conserves the rest.", color: "#ffbd3e" };
  return { key: "STOIC_SURVIVOR", title: "STOIC SURVIVOR", tagline: "Holds position. Outlasts the storm.", color: "#00d5ff" };
}

export default function HeroExperience() {
  const [index, setIndex] = useState(0);
  const experiment = rounds[index];
  const archetype = useMemo(() => getArchetype(experiment.signals), [experiment]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((v) => (v + 1) % rounds.length), 4200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="heroSpecimen">
      <div className="specimenAtmosphere" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
      <div className="specimenTop">
        <span><i/> SUBJECT FF-001 · SYNAPSE LINK ACTIVE</span>
        <div className="specimenIndex" aria-hidden="true">0{index + 1}<span>/0{rounds.length}</span></div>
        <b>LIVE OPTICAL FEED / 0{index + 1}</b>
      </div>

      {/* The arena. Only hairlines live in here — every opaque readout is in
          .heroReadouts below, so no panel ever sits in front of a fly. */}
      <div className="specimenStage">
        <div className="specimenReticle" aria-hidden="true"><i/><i/><i/><i/></div>
        <FruitFlySwarm variant="hero" lead={experiment.behavior} />
        <div className="specimenScale" aria-hidden="true"><span>100 μm</span></div>
      </div>

      <div className="heroReadouts">
        {/* Decision lock */}
        <div className="heroDecision" key={index}>
          <small>DECISION LOCK / 00:{String(42 + index * 4).padStart(2, "0")}</small>
          <strong>{experiment.behavior}</strong>
          <span>{experiment.event}</span>
        </div>

        {/* Agent identity card */}
        <div className="agentIdentity" style={{ "--agent-color": archetype.color } as React.CSSProperties}>
          <small>AGENT PERSONALITY</small>
          <strong>{archetype.title}</strong>
          <span>{archetype.tagline}</span>
        </div>

        {/* Signal strip */}
        <div className="signalStrip">
          {Object.entries(experiment.signals).map(([name, value]) => (
            <div key={name}>
              <span>{name.toUpperCase()}</span>
              <b>{String(value).padStart(2, "0")}</b>
              <i><em style={{ width: `${value}%` }} /></i>
            </div>
          ))}
        </div>

        {/* Decision history */}
        <div className="decisionHistory">
          {fakeHistory.map((h, i) => (
            <div key={i} className={i === index ? "active" : ""}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <b>{h.behavior}</b>
              <i />
            </div>
          ))}
        </div>

        <div className="raceBanner">
          <span><i/> GENERATION {String(index + 1).padStart(2, "0")} · GF REFLEX {experiment.behavior === "FREEZE" ? "STANDBY" : "READY"}</span>
          <div className="raceMetrics">
            <div><small>SIGNAL SEED</small><b>{experiment.seed}</b></div>
            <div><small>DECISION</small><b>{experiment.behavior}</b></div>
            <div><small>LINEAGE</small><b>CARRIED FORWARD</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}
