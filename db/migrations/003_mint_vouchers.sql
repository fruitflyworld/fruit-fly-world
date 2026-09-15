BEGIN;

CREATE TABLE IF NOT EXISTS mint_vouchers (
  nonce text PRIMARY KEY CHECK (nonce ~ '^0x[0-9a-f]{64}$'),
  campaign_id text NOT NULL REFERENCES mission_campaigns(id),
  participant_address text NOT NULL REFERENCES participants(address),
  deadline timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mint_vouchers_participant_idx
  ON mint_vouchers(campaign_id, participant_address, created_at DESC);
CREATE INDEX IF NOT EXISTS mint_vouchers_deadline_idx ON mint_vouchers(deadline);

COMMIT;
