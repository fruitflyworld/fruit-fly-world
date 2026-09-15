import { NextResponse } from "next/server";
import { currentSession } from "../../lib/server/session";
import { parseSignals, smallJson } from "../../lib/server/input";
import { transaction } from "../../lib/server/db";
import { runExperiment } from "../../lib/experiment";
import { experimentHash, MODEL_VERSION, publicId } from "../../lib/canonical";

import { assertSameOrigin, clientIp } from "../../lib/server/request";
import { enforceRateLimit } from "../../lib/server/rate-limit";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 403 }); }
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Sign in before running a public experiment" }, { status: 401 });
  try {
    await enforceRateLimit("experiment", `${clientIp(request)}:${session.address}`, 20, 600);
    const body = await smallJson(request) as { signals?: unknown };
    const signals = parseSignals(body.signals);
    const seed = Math.floor(Math.random() * 2_000_000_000);
    const experiment = runExperiment(signals, seed);
    const hash = experimentHash(signals, seed, experiment);
    const id = publicId();
    const record = await transaction(async (client) => {
      await client.query("SELECT singleton FROM world_state WHERE singleton=true FOR UPDATE");
      const inserted = await client.query<{ id: string; created_at: Date }>(
        `INSERT INTO experiments(public_id,participant_address,seed,food,threat,light,novelty,behavior,confidence,event,sector,model_version,record_hash)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id,created_at`,
        [id, session.address, seed, signals.food, signals.threat, signals.light, signals.novelty, experiment.behavior, experiment.confidence, experiment.event, experiment.sector, MODEL_VERSION, hash]
      );
      const energyDelta = experiment.behavior === "APPROACH" ? 12 : experiment.behavior === "AVOID" ? -4 : experiment.behavior === "FREEZE" ? 2 : -2;
      const world = await client.query<{ revision: string; energy: number }>(
        `UPDATE world_state SET revision=revision+1, energy=GREATEST(0,LEAST(999,energy+$1)),
         mapped_sectors=CASE WHEN NOT ($2=ANY(mapped_sectors)) THEN array_append(mapped_sectors,$2) ELSE mapped_sectors END,
         updated_at=now() WHERE singleton=true RETURNING revision,energy`, [energyDelta, experiment.sector]
      );
      await client.query(`INSERT INTO world_events(experiment_id,revision,behavior,description,sector,energy_delta)
        VALUES($1,$2,$3,$4,$5,$6)`, [inserted.rows[0].id, world.rows[0].revision, experiment.behavior, experiment.event, experiment.sector, energyDelta]);
      await client.query(`INSERT INTO mission_completions(participant_address,mission_type,evidence_experiment_id)
        VALUES($1,'RUN',$2) ON CONFLICT DO NOTHING`, [session.address, inserted.rows[0].id]);
      return { revision: Number(world.rows[0].revision), energy: world.rows[0].energy, createdAt: inserted.rows[0].created_at.toISOString() };
    });
    return NextResponse.json({ id, hash, modelVersion: MODEL_VERSION, ...experiment, ...record }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Experiment failed" }, { status: 400 });
  }
}
