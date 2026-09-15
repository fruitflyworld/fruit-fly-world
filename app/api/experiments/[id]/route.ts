import { NextResponse } from "next/server";
import { query } from "../../../lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const result = await query(
    `SELECT e.public_id AS id,e.seed,e.food,e.threat,e.light,e.novelty,e.behavior,e.confidence::float,e.event,e.sector,
      e.model_version AS "modelVersion",e.record_hash AS hash,e.replay_of AS "replayOf",e.created_at AS "createdAt",
      w.revision::text AS revision,w.energy_delta AS "energyDelta"
     FROM experiments e LEFT JOIN world_events w ON w.experiment_id=e.id WHERE e.public_id=$1`, [params.id]
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  const row = result.rows[0] as Record<string, unknown>;
  const revision = row.revision === null ? undefined : Number(row.revision);
  return NextResponse.json({ ...row, revision, signals: { food: row.food, threat: row.threat, light: row.light, novelty: row.novelty } });
}
