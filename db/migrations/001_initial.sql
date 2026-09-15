CREATE TABLE IF NOT EXISTS participants (
  address text PRIMARY KEY CHECK (address ~ '^0x[0-9a-f]{40}$'),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wallet_nonces (
  nonce_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wallet_sessions (
  token_hash text PRIMARY KEY,
  address text NOT NULL REFERENCES participants(address) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS experiments (
  id bigserial PRIMARY KEY,
  public_id text UNIQUE NOT NULL,
  participant_address text NOT NULL REFERENCES participants(address),
  seed integer NOT NULL,
  food smallint NOT NULL CHECK (food BETWEEN 0 AND 100),
  threat smallint NOT NULL CHECK (threat BETWEEN 0 AND 100),
  light smallint NOT NULL CHECK (light BETWEEN 0 AND 100),
  novelty smallint NOT NULL CHECK (novelty BETWEEN 0 AND 100),
  behavior text NOT NULL CHECK (behavior IN ('APPROACH','AVOID','EXPLORE','FREEZE')),
  confidence numeric(4,2) NOT NULL,
  event text NOT NULL,
  sector text NOT NULL,
  model_version text NOT NULL,
  record_hash text UNIQUE NOT NULL,
  replay_of text REFERENCES experiments(public_id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS world_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision bigint NOT NULL DEFAULT 0,
  energy integer NOT NULL DEFAULT 100,
  mapped_sectors text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO world_state(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS world_events (
  id bigserial PRIMARY KEY,
  experiment_id bigint UNIQUE NOT NULL REFERENCES experiments(id),
  revision bigint UNIQUE NOT NULL,
  behavior text NOT NULL,
  description text NOT NULL,
  sector text NOT NULL,
  energy_delta integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mission_completions (
  participant_address text NOT NULL REFERENCES participants(address),
  mission_type text NOT NULL CHECK (mission_type IN ('RUN','REPLAY')),
  evidence_experiment_id bigint NOT NULL REFERENCES experiments(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(participant_address, mission_type)
);
CREATE INDEX IF NOT EXISTS experiments_created_idx ON experiments(created_at DESC);
CREATE INDEX IF NOT EXISTS world_events_created_idx ON world_events(created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_sessions_expiry_idx ON wallet_sessions(expires_at);
