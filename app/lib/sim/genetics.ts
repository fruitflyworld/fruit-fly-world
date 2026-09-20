import type { Fly, Genome } from "./types";

const traitChoices = ["rover", "sitter", "normal"] as const;

export function inheritGenome(mother: Fly, father: Fly, next: () => number): Genome {
  const pickTrait = (pair: readonly (typeof traitChoices[number])[]) => pair[next() < 0.5 ? 0 : 1];
  const pickNumber = (pair: readonly number[]) => pair[next() < 0.5 ? 0 : 1];
  const mutate = (trait: typeof traitChoices[number]) => next() < 0.015 ? traitChoices[Math.floor(next() * traitChoices.length)] : trait;
  return {
    foraging: [mutate(pickTrait(mother.genome.foraging)), mutate(pickTrait(father.genome.foraging))],
    coldTolerance: [
      Math.max(0, Math.min(1, pickNumber(mother.genome.coldTolerance) + (next() - 0.5) * 0.08)),
      Math.max(0, Math.min(1, pickNumber(father.genome.coldTolerance) + (next() - 0.5) * 0.08))
    ]
  };
}
