BEGIN;

ALTER TABLE mission_completions DROP CONSTRAINT IF EXISTS mission_completions_mission_type_check;
ALTER TABLE mission_completions ALTER COLUMN evidence_experiment_id DROP NOT NULL;
ALTER TABLE mission_completions ADD COLUMN IF NOT EXISTS campaign_id text NOT NULL DEFAULT 'genesis';
ALTER TABLE mission_completions ADD COLUMN IF NOT EXISTS evidence_type text;
ALTER TABLE mission_completions ADD COLUMN IF NOT EXISTS evidence_ref text;
ALTER TABLE mission_completions ADD COLUMN IF NOT EXISTS evidence_hash text;
ALTER TABLE mission_completions ADD CONSTRAINT mission_completions_mission_type_check
  CHECK (mission_type IN ('RUN','REPLAY','AGENT','X_QUOTE'));

CREATE TABLE IF NOT EXISTS mission_campaigns (
  id text PRIMARY KEY,
  official_x_post_id text CHECK (official_x_post_id IS NULL OR official_x_post_id ~ '^[0-9]+$'),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

INSERT INTO mission_campaigns(id, starts_at, ends_at, enabled)
VALUES ('genesis', now(), now() + interval '180 days', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS agent_challenges (
  nonce_hash text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES mission_campaigns(id),
  participant_address text NOT NULL REFERENCES participants(address),
  agent_address text NOT NULL CHECK (agent_address ~ '^0x[0-9a-f]{40}$'),
  challenge_message text NOT NULL,
  food smallint NOT NULL CHECK (food BETWEEN 0 AND 100),
  threat smallint NOT NULL CHECK (threat BETWEEN 0 AND 100),
  light smallint NOT NULL CHECK (light BETWEEN 0 AND 100),
  novelty smallint NOT NULL CHECK (novelty BETWEEN 0 AND 100),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_mission_proofs (
  campaign_id text NOT NULL REFERENCES mission_campaigns(id),
  participant_address text NOT NULL REFERENCES participants(address),
  agent_address text NOT NULL CHECK (agent_address ~ '^0x[0-9a-f]{40}$'),
  experiment_id bigint NOT NULL REFERENCES experiments(id),
  evidence_hash text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, participant_address),
  UNIQUE (campaign_id, agent_address)
);

CREATE TABLE IF NOT EXISTS x_mission_challenges (
  code_hash text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES mission_campaigns(id),
  participant_address text NOT NULL REFERENCES participants(address),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS x_mission_proofs (
  campaign_id text NOT NULL REFERENCES mission_campaigns(id),
  participant_address text NOT NULL REFERENCES participants(address),
  x_author_id text NOT NULL CHECK (x_author_id ~ '^[0-9]+$'),
  x_post_id text NOT NULL CHECK (x_post_id ~ '^[0-9]+$'),
  evidence_hash text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, participant_address),
  UNIQUE (campaign_id, x_author_id),
  UNIQUE (campaign_id, x_post_id)
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  action text NOT NULL,
  subject_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count > 0),
  PRIMARY KEY (action, subject_hash, window_start)
);

CREATE INDEX IF NOT EXISTS agent_challenges_expiry_idx ON agent_challenges(expires_at);
CREATE INDEX IF NOT EXISTS x_challenges_expiry_idx ON x_mission_challenges(expires_at);
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON api_rate_limits(window_start);

COMMIT;
