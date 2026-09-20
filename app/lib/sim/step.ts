import { inheritGenome } from "./genetics";
import { phenotype, random } from "./world";
import type { Fly, SimEvent, VialState } from "./types";

const GENERATION_DAYS = 10;

function makeChild(mother: Fly, father: Fly, id: string, next: () => number): Fly {
  return {
    id,
    parentIds: [mother.id, father.id],
    sex: next() < 0.5 ? "F" : "M",
    age: 0,
    energy: 55,
    genome: inheritGenome(mother, father, next),
    alive: true
  };
}

export function stepVial(state: VialState): VialState {
  const next = random(state.seed + state.day + 1);
  const events: SimEvent[] = [];
  const alive = state.flies.filter((fly) => fly.alive);
  const densityPenalty = Math.max(0, alive.length - state.environment.crowding / 4) * 0.45;
  const temperaturePenalty = Math.abs(state.environment.temperature - 25) * 0.8;

  for (const fly of alive) {
    fly.age += 1;
    const trait = phenotype(fly);
    const forage = trait === "rover" ? 5 : trait === "sitter" ? 3 : 4;
    const temperatureFit = 1 - Math.min(1, Math.abs(state.environment.temperature - 25) / 15);
    fly.energy += Math.round((state.environment.food / 20) * temperatureFit + forage / 3 - densityPenalty - temperaturePenalty / 4);
    fly.energy -= 4 + Math.round(Math.abs(state.environment.lightHours - 12) / 6);
    if (fly.energy <= 0 || fly.age > 40 || next() < Math.max(0, 0.01 + temperaturePenalty / 700)) {
      fly.alive = false;
      events.push({ day: state.day + 1, type: "death", flyIds: [fly.id], detail: "The fly died." });
    }
  }

  const females = alive.filter((fly) => fly.alive && fly.sex === "F" && fly.age >= 3 && fly.energy >= 45);
  const males = alive.filter((fly) => fly.alive && fly.sex === "M" && fly.age >= 3 && fly.energy >= 35);
  const births: Fly[] = [];
  for (const mother of females) {
    if (!males.length || state.environment.food < 20 || next() > 0.35) continue;
    const father = males[Math.floor(next() * males.length)];
    const count = next() < 0.65 ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const id = `F-${String(state.flies.length + births.length + 1).padStart(3, "0")}`;
      births.push(makeChild(mother, father, id, next));
    }
    mother.energy -= 12;
    events.push({ day: state.day + 1, type: "mate", flyIds: [mother.id, father.id], detail: "A pair produced eggs." });
  }
  for (const child of births) events.push({ day: state.day + 1, type: "birth", flyIds: [child.id], detail: "A new fly entered the vial." });

  const day = state.day + 1;
  const generation = Math.floor(day / GENERATION_DAYS);
  if (generation > state.generation) events.push({ day, type: "generation", flyIds: [], detail: `Generation ${generation} emerged.` });
  return { ...state, day, generation, flies: [...state.flies, ...births], events: [...state.events, ...events] };
}

export function runVial(state: VialState, days: number): VialState {
  let current = state;
  for (let i = 0; i < days; i++) current = stepVial(current);
  return current;
}
