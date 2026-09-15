import "server-only";
import { transaction } from "./db";
import { runExperiment, type Signals } from "../experiment";
import { experimentHash, MODEL_VERSION, publicId } from "../canonical";

export async function persistAgentExperiment(input: { participant: string; agent: string; campaign: string; signals: Signals; evidenceHash: string; nonceHash: string }) {
  const seed = Math.floor(Math.random() * 2_000_000_000);
  const experiment = runExperiment(input.signals, seed);
  const hash = experimentHash(input.signals, seed, experiment);
  const id = publicId();
  return transaction(async (client) => {
    const consumed = await client.query(
      `UPDATE agent_challenges SET consumed_at=now()
       WHERE nonce_hash=$1 AND campaign_id=$2 AND participant_address=$3 AND agent_address=$4
         AND consumed_at IS NULL AND expires_at>now()
       RETURNING nonce_hash`,
      [input.nonceHash, input.campaign, input.participant, input.agent]
    );
    if (!consumed.rowCount) throw new Error("Agent challenge expired or already used");
    await client.query("SELECT singleton FROM world_state WHERE singleton=true FOR UPDATE");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO experiments(public_id,participant_address,seed,food,threat,light,novelty,behavior,confidence,event,sector,model_version,record_hash)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [id, input.participant, seed, input.signals.food, input.signals.threat, input.signals.light, input.signals.novelty, experiment.behavior, experiment.confidence, experiment.event, experiment.sector, MODEL_VERSION, hash]
    );
    const experimentId = inserted.rows[0].id;
    const energyDelta = experiment.behavior === "APPROACH" ? 12 : experiment.behavior === "AVOID" ? -4 : experiment.behavior === "FREEZE" ? 2 : -2;
    const world = await client.query<{ revision: string }>(
      `UPDATE world_state SET revision=revision+1, energy=GREATEST(0,LEAST(999,energy+$1)),
       mapped_sectors=CASE WHEN NOT ($2=ANY(mapped_sectors)) THEN array_append(mapped_sectors,$2) ELSE mapped_sectors END,
       updated_at=now() WHERE singleton=true RETURNING revision`, [energyDelta, experiment.sector]
    );
    await client.query(`INSERT INTO world_events(experiment_id,revision,behavior,description,sector,energy_delta)
      VALUES($1,$2,$3,$4,$5,$6)`, [experimentId, world.rows[0].revision, experiment.behavior, experiment.event, experiment.sector, energyDelta]);
    await client.query(`INSERT INTO agent_mission_proofs(campaign_id,participant_address,agent_address,experiment_id,evidence_hash)
      VALUES($1,$2,$3,$4,$5)`, [input.campaign, input.participant, input.agent, experimentId, input.evidenceHash]);
    await client.query(`INSERT INTO mission_completions(participant_address,mission_type,evidence_experiment_id,campaign_id,evidence_type,evidence_ref,evidence_hash)
      VALUES($1,'AGENT',$2,$3,'agent_wallet',$4,$5) ON CONFLICT DO NOTHING`,
      [input.participant, experimentId, input.campaign, input.agent, input.evidenceHash]);
    return { id, hash, revision: Number(world.rows[0].revision), ...experiment };
  });
}
