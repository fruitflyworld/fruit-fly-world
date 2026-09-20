import { createVial } from "./world";
import { runVial } from "./step";
import type { VialConfig, VialState } from "./types";

export type Replay = { config: VialConfig; days: number; state: VialState };

export function replay(config: VialConfig, days: number): Replay {
  return { config, days, state: runVial(createVial(config), days) };
}
