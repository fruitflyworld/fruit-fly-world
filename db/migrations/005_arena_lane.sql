BEGIN;

/* ── Which door an entry came through ────────────────────────────────────────
   One window, one table, two ways in: an agent wallet signs its route at
   POST /api/arena/submit, or the operator submits by hand at
   POST /api/arena/enter with their session. Both write arena_entries, both are
   scored by the same server-side scoreRoute(), and both compete for the same
   slot — so the lane is bookkeeping for the board, never a ranking input.

   Existing rows are agent entries: they were the only lane that existed. */
ALTER TABLE arena_entries ADD COLUMN IF NOT EXISTS lane text NOT NULL DEFAULT 'agent';
ALTER TABLE arena_entries DROP CONSTRAINT IF EXISTS arena_entries_lane_check;
ALTER TABLE arena_entries ADD CONSTRAINT arena_entries_lane_check CHECK (lane IN ('agent','manual'));

/* Copied onto the win when the window closes, so the board can say who took the
   last slot without re-reading the winning entry. */
ALTER TABLE arena_wins ADD COLUMN IF NOT EXISTS lane text NOT NULL DEFAULT 'agent';
ALTER TABLE arena_wins DROP CONSTRAINT IF EXISTS arena_wins_lane_check;
ALTER TABLE arena_wins ADD CONSTRAINT arena_wins_lane_check CHECK (lane IN ('agent','manual'));

COMMIT;
