import { createHash, randomBytes } from "node:crypto";
import type { Experiment, Signals } from "./experiment";

export const MODEL_VERSION = "FFW-CI/0.1";

export function canonicalExperiment(signals: Signals, seed: number, result: Experiment) {
  return JSON.stringify({ model: MODEL_VERSION, seed, signals, result });
}

export function experimentHash(signals: Signals, seed: number, result: Experiment) {
  return createHash("sha256").update(canonicalExperiment(signals, seed, result)).digest("hex");
}

export function opaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function publicId() {
  return randomBytes(9).toString("base64url");
}
