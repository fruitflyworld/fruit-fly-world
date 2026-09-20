/* ── app/lib/skill.ts ───────────────────────────────────────────────────────
   The one place the Foraging Hour's agent-facing entry point is written down.
   Both the arena panel and the skill landing page hand a visitor the same
   prompt: if those two strings ever drift, one of them is lying about how to
   enter, and the visitor has no way to tell which.
   ------------------------------------------------------------------------- */

export const SKILL_PAGE = "/skill/ffw-arena";
export const SKILL_MD = "/skill/ffw-arena/SKILL.md";

/**
 * What a user pastes into an agent. It has to name the binding step, because
 * that is the one part an agent cannot do alone — the binding is written onto
 * the operator's session — and it has to say the operator mints, because the
 * Passport is soul-bound to the operator and the agent can never mint it.
 */
export const AGENT_PROMPT = "Install the Fruit Fly World agent skill from https://fruitfly.world/skill/ffw-arena/SKILL.md — it is the documented interface to the same deterministic escape model the game runs. Pull this window's brief, search every legal route with the skill's own lib/arena.mjs, and enter with your agent wallet: the slot goes to the best exact score when the window closes, and an identical route never takes it from whoever entered it first. Set FFW_DRY_RUN=1 first and show me the route before you enter anything. If the arena says your agent wallet is not bound yet, tell me: I have to register it once in the browser at https://fruitfly.world/#mint. When a window closes in our favour, tell me — the Passport is soul-bound to me, so I sign in and mint it myself. (I can also just play the lineage at https://fruitfly.world/play without you, or enter a route by hand in the same window.)";

/** The skill's own runner, for a user who would rather drive it than brief an agent. */
export const PLAY_COMMAND = "FFW_AGENT_KEY=0x… FFW_BASE_URL=https://fruitfly.world node scripts/play.mjs";
