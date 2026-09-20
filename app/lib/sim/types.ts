export type Sex = "F" | "M";
export type Trait = "rover" | "sitter" | "normal";

export type Environment = {
  temperature: number;
  food: number;
  crowding: number;
  lightHours: number;
};

export type Genome = {
  foraging: [Trait, Trait];
  coldTolerance: [number, number];
};

export type Fly = {
  id: string;
  parentIds: [string, string] | null;
  sex: Sex;
  age: number;
  energy: number;
  genome: Genome;
  alive: boolean;
};

export type SimEvent = {
  day: number;
  type: "feed" | "mate" | "birth" | "death" | "generation";
  flyIds: string[];
  detail: string;
};

export type VialState = {
  seed: number;
  day: number;
  generation: number;
  environment: Environment;
  flies: Fly[];
  events: SimEvent[];
};

export type VialConfig = {
  seed: number;
  environment?: Partial<Environment>;
  initialPopulation?: number;
};
