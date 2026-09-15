import { NextResponse } from "next/server";
import { query } from "../../lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await query<{
      participant_address: string;
      total_rounds: string;
      approach_count: string;
      avoid_count: string;
      explore_count: string;
      freeze_count: string;
      last_active: string;
    }>(`
      SELECT
        participant_address,
        COUNT(*)::text as total_rounds,
        COUNT(*) FILTER (WHERE behavior = 'APPROACH')::text as approach_count,
        COUNT(*) FILTER (WHERE behavior = 'AVOID')::text as avoid_count,
        COUNT(*) FILTER (WHERE behavior = 'EXPLORE')::text as explore_count,
        COUNT(*) FILTER (WHERE behavior = 'FREEZE')::text as freeze_count,
        MAX(created_at)::text as last_active
      FROM experiments
      GROUP BY participant_address
      ORDER BY COUNT(*) DESC, MAX(created_at) DESC
      LIMIT 24
    `);

    const agents = result.rows.map((row) => {
      const total = Number(row.total_rounds);
      const approach = Number(row.approach_count);
      const avoid = Number(row.avoid_count);
      const explore = Number(row.explore_count);
      const freeze = Number(row.freeze_count);

      const approachPct = Math.round((approach / total) * 100);
      const avoidPct = Math.round((avoid / total) * 100);
      const explorePct = Math.round((explore / total) * 100);

      let archetype: string;
      let color: string;
      if (explorePct >= 35) { archetype = "BOLD_EXPLORER"; color = "#baff35"; }
      else if (avoidPct >= 35) { archetype = "CAUTIOUS_OBSERVER"; color = "#ff593f"; }
      else if (approachPct >= 35) { archetype = "ENERGY_SEEKER"; color = "#ffbd3e"; }
      else { archetype = "STOIC_SURVIVOR"; color = "#00d5ff"; }

      return {
        address: row.participant_address,
        totalRounds: total,
        approachCount: approach,
        avoidCount: avoid,
        exploreCount: explore,
        freezeCount: freeze,
        lastActive: row.last_active,
        archetype,
        archetypeColor: color
      };
    });

    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load agents" }, { status: 500 });
  }
}
