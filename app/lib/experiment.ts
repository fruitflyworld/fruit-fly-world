export type Signals = { food: number; threat: number; light: number; novelty: number };
export type Behavior = "APPROACH" | "AVOID" | "EXPLORE" | "FREEZE";
export type Experiment = { seed: number; signals: Signals; behavior: Behavior; confidence: number; event: string; sector: string };

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const seededNoise = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return (value - Math.floor(value)) * 8 - 4;
};

export function runExperiment(signals: Signals, seed: number): Experiment {
  const safe = {
    food: clamp(signals.food),
    threat: clamp(signals.threat),
    light: clamp(signals.light),
    novelty: clamp(signals.novelty)
  };
  const noise = seededNoise(seed);
  const scores: Record<Behavior, number> = {
    APPROACH: safe.food * 1.15 + safe.light * 0.24 - safe.threat * 0.72 + noise,
    AVOID: safe.threat * 1.32 - safe.food * 0.22 - noise,
    EXPLORE: safe.novelty * 1.08 + safe.light * 0.18 - safe.threat * 0.35 + noise / 2,
    FREEZE: safe.threat * 0.72 + (100 - safe.novelty) * 0.46 - safe.food * 0.2
  };
  const ranked = (Object.entries(scores) as [Behavior, number][]).sort((a, b) => b[1] - a[1]);
  const behavior = ranked[0][0];
  const gap = Math.max(0, ranked[0][1] - ranked[1][1]);
  const confidence = Number(Math.min(0.96, 0.5 + gap / 120).toFixed(2));
  const sector = `F-${String((Math.abs(seed) % 24) + 1).padStart(2, "0")}`;
  const events: Record<Behavior, string> = {
    APPROACH: "Energy source reached",
    AVOID: "Threat corridor escaped",
    EXPLORE: `${sector} mapped`,
    FREEZE: "Position held; energy conserved"
  };
  return { seed, signals: safe, behavior, confidence, event: events[behavior], sector };
}

export const initialExperiment = runExperiment({ food: 82, threat: 36, light: 58, novelty: 71 }, 190826);
