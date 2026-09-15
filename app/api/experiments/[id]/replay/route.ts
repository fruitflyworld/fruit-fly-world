import { NextResponse } from "next/server";
import { currentSession } from "../../../../lib/server/session";
import { query, transaction } from "../../../../lib/server/db";
import { runExperiment } from "../../../../lib/experiment";
import { experimentHash } from "../../../../lib/canonical";
import { assertSameOrigin } from "../../../../lib/server/request";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Invalid request origin" }, { status: 403 }); }
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Sign in to verify a replay" }, { status: 401 });
  const found = await query<{ id: string; seed: number; food: number; threat: number; light: number; novelty: number; record_hash: string }>(
    "SELECT id,seed,food,threat,light,novelty,record_hash FROM experiments WHERE public_id=$1", [params.id]
  );
  const source = found.rows[0];
  if (!source) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  const signals = { food: source.food, threat: source.threat, light: source.light, novelty: source.novelty };
  const result = runExperiment(signals, source.seed);
  const match = experimentHash(signals, source.seed, result) === source.record_hash;
  if (match) await transaction(async (client) => {
    await client.query(`INSERT INTO mission_completions(participant_address,mission_type,evidence_experiment_id)
      VALUES($1,'REPLAY',$2) ON CONFLICT DO NOTHING`, [session.address, source.id]);
  });
  return NextResponse.json({ match, result });
}
