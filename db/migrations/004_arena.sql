BEGIN;

/* ── The Foraging Hour ───────────────────────────────────────────────────────
   One window per hour, one free-Passport slot per window. Ranking happens when
   the window closes, not when an entry arrives, so submission time is worth
   nothing and route quality is worth everything. See app/lib/arena.ts for the
   scoring rule — it is public and recomputable, so nothing here is secret.

   Postgres replaces the Redis the reference arena used: the running-best key,
   the NX lock and the repair pass all collapse into
     SELECT ... ORDER BY exact DESC LIMIT 1
   and closing a window is a single atomic
     UPDATE arena_windows SET ... WHERE epoch = $1 AND status = 'open' RETURNING *
   which is idempotent across instances with no lock and no cron.
   ------------------------------------------------------------------------- */

CREATE TABLE IF NOT EXISTS arena_windows (
  epoch bigint PRIMARY KEY,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  seed_version text NOT NULL DEFAULT 'hash32:v1',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  entries integer NOT NULL DEFAULT 0 CHECK (entries >= 0),
  winner_address text CHECK (winner_address IS NULL OR winner_address ~ '^0x[0-9a-f]{40}$'),
  winner_agent_address text CHECK (winner_agent_address IS NULL OR winner_agent_address ~ '^0x[0-9a-f]{40}$'),
  /* Full precision: `exact` is never rounded before it is compared. A numeric(p,s)
     would collapse two routes a millionth apart into the same value, which is the
     tie this game exists to avoid. See app/lib/arena.ts, displaces(). */
  winning_exact double precision,
  winning_score integer,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (status = 'open' OR finalized_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS arena_entries (
  id bigserial PRIMARY KEY,
  epoch bigint NOT NULL REFERENCES arena_windows(epoch) ON DELETE CASCADE,
  participant_address text NOT NULL REFERENCES participants(address),
  agent_address text NOT NULL CHECK (agent_address ~ '^0x[0-9a-f]{40}$'),
  route jsonb NOT NULL,
  signals jsonb NOT NULL,
  exact double precision NOT NULL,
  score integer NOT NULL,
  energy integer NOT NULL,
  cells_mapped smallint NOT NULL CHECK (cells_mapped BETWEEN 1 AND 24),
  nonce text NOT NULL CHECK (nonce ~ '^0x[0-9a-f]{32,64}$'),
  ip_tag text,
  created_at timestamptz NOT NULL DEFAULT now(),
  /* Replay guard: no server-side challenge table, the brief is deterministic. */
  UNIQUE (epoch, agent_address, nonce)
);

CREATE TABLE IF NOT EXISTS arena_wins (
  epoch bigint PRIMARY KEY REFERENCES arena_windows(epoch) ON DELETE CASCADE,
  participant_address text NOT NULL REFERENCES participants(address),
  agent_address text NOT NULL CHECK (agent_address ~ '^0x[0-9a-f]{40}$'),
  exact double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

/* An earlier draft of this migration stored `exact` as numeric(8,2), which silently
   threw away the digits the ranking depends on. Convert any database that already
   ran it. Guarded on the current type so re-running this file is a no-op. */
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'arena_entries' AND column_name = 'exact' AND data_type = 'numeric') THEN
    ALTER TABLE arena_entries ALTER COLUMN exact TYPE double precision USING exact::double precision;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'arena_windows' AND column_name = 'winning_exact' AND data_type = 'numeric') THEN
    ALTER TABLE arena_windows ALTER COLUMN winning_exact TYPE double precision USING winning_exact::double precision;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'arena_wins' AND column_name = 'exact' AND data_type = 'numeric') THEN
    ALTER TABLE arena_wins ALTER COLUMN exact TYPE double precision USING exact::double precision;
  END IF;
END $$;

/* Ranked reads: the leader for a window, and the top ten of the last windows. */
CREATE INDEX IF NOT EXISTS arena_entries_rank_idx ON arena_entries(epoch, exact DESC, created_at);
/* The caps, each a plain count over a time range. */
CREATE INDEX IF NOT EXISTS arena_entries_wallet_idx ON arena_entries(participant_address, created_at DESC);
CREATE INDEX IF NOT EXISTS arena_entries_agent_idx ON arena_entries(agent_address, created_at DESC);
CREATE INDEX IF NOT EXISTS arena_entries_ip_idx ON arena_entries(ip_tag, created_at DESC);
CREATE INDEX IF NOT EXISTS arena_wins_created_idx ON arena_wins(created_at DESC);

/* The winner becomes mint-eligible through the *existing* mission path, so the
   prize flows through /api/mint/voucher → mint() with no new claim endpoint. */
ALTER TABLE mission_completions DROP CONSTRAINT IF EXISTS mission_completions_mission_type_check;
ALTER TABLE mission_completions ADD CONSTRAINT mission_completions_mission_type_check
  CHECK (mission_type IN ('RUN','REPLAY','AGENT','X_QUOTE','ARENA'));

COMMIT;
