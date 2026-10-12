import { NextResponse } from "next/server";
import { CX_MODEL_VERSION } from "../../../../public/play/js/cx-circuit.js";
import { equityOf } from "../../../lib/market/engine";
import { FLIES, runTo, seasonClock, tickClock, TICKS_PER_SEASON } from "../../../lib/market/fly";
import { contentHash } from "../../../../public/play/js/brain.js";

export const dynamic = "force-dynamic";

// A small cache: the answer for (fly, season, tick) never changes.
const cache = new Map<string, unknown>();

/**
 * GET /api/fly/:slug?season=S&tick=T
 * The server's replay of one tick: the sealed record, its hash, and the chain
 * hash that commits to every tick before it. Ticks in the future are refused:
 * the page only ever shows what has already happened.
 */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const fly = FLIES[params.slug];
  if (!fly) return NextResponse.json({ error: "No such fly." }, { status: 404 });
  const url = new URL(req.url);
  const clock = seasonClock(Date.now());
  const season = url.searchParams.has("season") ? Number(url.searchParams.get("season")) : clock.season;
  const tick = url.searchParams.has("tick") ? Number(url.searchParams.get("tick")) : clock.tick;
  if (!Number.isInteger(season) || season < 0 || !Number.isInteger(tick) || tick < 0 || tick >= TICKS_PER_SEASON) {
    return NextResponse.json({ error: "season and tick must be whole numbers inside a season." }, { status: 400 });
  }
  if (season > clock.season || (season === clock.season && tick > clock.tick)) {
    return NextResponse.json({ error: "That tick has not happened yet." }, { status: 425 });
  }
  const key = `${fly.slug}:${season}:${tick}`;
  let body = cache.get(key);
  if (!body) {
    const { run, record, chain } = runTo(fly, season, tick, { keepEvents: 1 });
    const s = run.runner.state;
    body = {
      worldVersion: run.runner.version,
      circuit: CX_MODEL_VERSION,
      mode: fly.mode,
      fly: { slug: fly.slug, name: fly.name },
      season, tick, clock: tickClock(tick) + " UTC",
      chain,
      recordHash: contentHash(record),
      record,
      equity: Math.round(equityOf(s) * 100) / 100,
    };
    if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
    cache.set(key, body);
  }
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=60" } });
}
