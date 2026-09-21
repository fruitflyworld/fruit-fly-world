// /api/jev — same-origin proxy for the judgment layer.
// The browser never talks to the judgment vendor directly: no CORS problems,
// the API key never leaves the origin it was entered on, and this route can
// enforce the rules replay depends on (pinned model versions, small bodies,
// bounded latency, per-IP rate limits). The Authorization header is forwarded
// but never logged.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPSTREAM = process.env.JEV_UPSTREAM || "https://api.typesafe.ai/v1/systemone";
const MAX_BODY_BYTES = 8 * 1024; // the dish state is a few hundred bytes; 8KB is generous
const UPSTREAM_TIMEOUT_MS = 10_000;
const RATE_LIMIT = 30; // requests per minute per IP
const RATE_WINDOW_MS = 60_000;

const hits = new Map<string, number[]>(); // ip -> timestamps of accepted requests

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_LIMIT) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate limit exceeded (30 req/min)" }, { status: 429 });
  }

  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "body too large" }, { status: 413 });
  }

  let body: { model?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  // Replay requires an exact model; floating aliases are refused here so a
  // misconfigured client cannot produce unversioned decision logs.
  if (typeof body.model !== "string" || !body.model || body.model.includes("latest")) {
    return NextResponse.json({ error: "model must be a pinned version" }, { status: 400 });
  }

  try {
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        Authorization: auth, // forwarded, never logged
        "Content-Type": "application/json",
      },
      body: raw,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = (e as Error)?.name === "TimeoutError" ? 504 : 502;
    return NextResponse.json({ error: "upstream unreachable" }, { status });
  }
}

export async function GET() {
  return NextResponse.json({ proxy: "jev", upstream: UPSTREAM.split("/v1")[0], pinned: true });
}
