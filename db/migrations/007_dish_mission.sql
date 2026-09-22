-- 007 — DISH quests: the game-gated freemint.
-- Completing a quest in the dish (/play) or the exam room (?bench=1) is the
-- fourth verified way to a free Genesis Passport. v1 trusts the client-side
-- evidence object (the Passport is soul-bound and free — the prize for forging
-- one is a badge you cannot sell); v2 will re-simulate the run server-side
-- once flyline-sim is extracted.

BEGIN;

ALTER TABLE mission_completions DROP CONSTRAINT IF EXISTS mission_completions_mission_type_check;
ALTER TABLE mission_completions ADD CONSTRAINT mission_completions_mission_type_check
  CHECK (mission_type IN ('RUN','REPLAY','AGENT','X_QUOTE','ARENA','DISH'));

COMMIT;
