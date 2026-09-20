import type { Fly, Genome, Trait, VialConfig, VialState } from "./types";

const DEFAULT_ENVIRONMENT = { temperature: 25, food: 72, crowding: 50, lightHours: 12 };
const traits: Trait[] = ["rover", "sitter", "normal"];

export function random(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

export function createGenome(next: () => number): Genome {
  const trait = () => traits[Math.floor(next() * traits.length)];
  return { foraging: [trait(), trait()], coldTolerance: [next(), next()] };
}

export function phenotype(fly: Fly): Trait {
  if (fly.genome.foraging[0] === fly.genome.foraging[1]) return fly.genome.foraging[0];
  return fly.genome.foraging.includes("rover") ? "rover" : "sitter";
}

export function createVial(config: VialConfig): VialState {
  const next = random(config.seed);
  const population = config.initialPopulation ?? 12;
  const flies: Fly[] = Array.from({ length: population }, (_, index) => ({
    id: `F-${String(index + 1).padStart(3, "0")}`,
    parentIds: null,
    sex: next() < 0.5 ? "F" : "M",
    age: Math.floor(next() * 4),
    energy: 70 + Math.floor(next() * 25),
    genome: createGenome(next),
    alive: true
  }));
  return {
    seed: config.seed,
    day: 0,
    generation: 0,
    environment: { ...DEFAULT_ENVIRONMENT, ...config.environment },
    flies,
    events: []
  };
}
