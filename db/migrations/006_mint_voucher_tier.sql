-- The voucher now carries its billing tier, mirroring arena_entries.lane: the tier is
-- bookkeeping, the contract re-derives the price from the signed flags.
BEGIN;

ALTER TABLE mint_vouchers ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free';
ALTER TABLE mint_vouchers DROP CONSTRAINT IF EXISTS mint_vouchers_tier_check;
ALTER TABLE mint_vouchers ADD CONSTRAINT mint_vouchers_tier_check
  CHECK (tier IN ('free','participant'));

COMMIT;
