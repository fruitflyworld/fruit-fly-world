import { NextResponse } from "next/server";
import { query } from "../../../lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { address: string } }) {
  try {
    const address = params.address.toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid agent address" }, { status: 400 });
    }

    const statsResult = await query<{
      total_rounds: string;
      approach_count: string;
      avoid_count: string;
      explore_count: string;
      freeze_count: string;
      first_seen: string;
      last_active: string;
    }>(`
      SELECT
        COUNT(*)::text as total_rounds,
        COUNT(*) FILTER (WHERE behavior = 'APPROACH')::text as approach_count,
        COUNT(*) FILTER (WHERE behavior = 'AVOID')::text as avoid_count,
        COUNT(*) FILTER (WHERE behavior = 'EXPLORE')::text as explore_count,
        COUNT(*) FILTER (WHERE behavior = 'FREEZE')::text as freeze_count,
        MIN(created_at)::text as first_seen,
        MAX(created_at)::text as last_active
      FROM experiments
      WHERE participant_address = $1
    `, [address]);

    if (Number(statsResult.rows[0]?.total_rounds) === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const stats = statsResult.rows[0];
    const total = Number(stats.total_rounds);
    const approach = Number(stats.approach_count);
    const avoid = Number(stats.avoid_count);
    const explore = Number(stats.explore_count);
    const freeze = Number(stats.freeze_count);

    const approachPct = Math.round((approach / total) * 100);
    const avoidPct = Math.round((avoid / total) * 100);
    const explorePct = Math.round((explore / total) * 100);
    const freezePct = Math.round((freeze / total) * 100);

    let archetype: string;
    let archetypeTagline: string;
    let archetypeColor: string;
    if (explorePct >= 35) { archetype = "BOLD_EXPLORER"; archetypeTagline = "Drawn to the unknown. Maps new sectors."; archetypeColor = "#baff35"; }
    else if (avoidPct >= 35) { archetype = "CAUTIOUS_OBSERVER"; archetypeTagline = "Survives by reading the room."; archetypeColor = "#ff593f"; }
    else if (approachPct >= 35) { archetype = "ENERGY_SEEKER"; archetypeTagline = "Follows the signal. Conserves the rest."; archetypeColor = "#ffbd3e"; }
    else { archetype = "STOIC_SURVIVOR"; archetypeTagline = "Holds position. Outlasts the storm."; archetypeColor = "#00d5ff"; }

    const historyResult = await query<{
      public_id: string;
      behavior: string;
      event: string;
      sector: string;
      confidence: string;
      seed: string;
      created_at: string;
    }>(`
      SELECT public_id, behavior, event, sector, confidence::text, seed::text, created_at::text
      FROM experiments
      WHERE participant_address = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [address]);

    return NextResponse.json({
      address,
      totalRounds: total,
      approachCount: approach,
      avoidCount: avoid,
      exploreCount: explore,
      freezeCount: freeze,
      approachPct,
      avoidPct,
      explorePct,
      freezePct,
      archetype,
      archetypeTagline,
      archetypeColor,
      firstSeen: stats.first_seen,
      lastActive: stats.last_active,
      history: historyResult.rows.map((row) => ({
        publicId: row.public_id,
        behavior: row.behavior,
        event: row.event,
        sector: row.sector,
        confidence: Number(row.confidence),
        seed: Number(row.seed),
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load agent" }, { status: 500 });
  }
}
