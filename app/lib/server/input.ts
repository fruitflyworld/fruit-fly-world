import type { Signals } from "../experiment";

export function parseSignals(value: unknown): Signals {
  if (!value || typeof value !== "object") throw new Error("Signals are required");
  const input = value as Record<string, unknown>;
  const names = ["food", "threat", "light", "novelty"] as const;
  const output = {} as Signals;
  for (const name of names) {
    const item = input[name];
    if (typeof item !== "number" || !Number.isFinite(item) || item < 0 || item > 100) {
      throw new Error(`${name} must be a number from 0 to 100`);
    }
    output[name] = Math.round(item);
  }
  return output;
}

export async function smallJson(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 8_192) throw new Error("Request body is too large");
  return request.json() as Promise<unknown>;
}
