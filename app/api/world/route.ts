import { NextResponse } from "next/server";
import { query } from "../../lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [state, events] = await Promise.all([
    query<{ revision: string; energy: number; mapped_sectors: string[]; updated_at: Date }>("SELECT revision,energy,mapped_sectors,updated_at FROM world_state WHERE singleton=true"),
    query<{ revision: string; experiment_id: string; public_id: string; record_hash: string; behavior: string; description: string; sector: string; energy_delta: number; created_at: Date }>(
      `SELECT w.revision,w.experiment_id::text,e.public_id,e.record_hash,w.behavior,w.description,w.sector,w.energy_delta,w.created_at
       FROM world_events w JOIN experiments e ON e.id=w.experiment_id ORDER BY w.revision DESC LIMIT 8`)
  ]);
  const current = state.rows[0];
  return NextResponse.json({
    revision: Number(current.revision), energy: current.energy, mappedSectors: current.mapped_sectors, updatedAt: current.updated_at.toISOString(),
    events: events.rows.map((event) => ({ ...event, revision: Number(event.revision), created_at: event.created_at.toISOString() }))
  });
}
