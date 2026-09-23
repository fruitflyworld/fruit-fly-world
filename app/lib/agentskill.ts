/* ── app/lib/agentskill.ts ───────────────────────────────────────────────────
   The agent-facing entry point for the survival game (not the arena). The
   homepage #agents section and any future landing page hand a visitor the
   same prompt: if two copies of this string ever drift, one of them is lying
   about how to enter, and the visitor cannot tell which.
   ------------------------------------------------------------------------- */

export const GAME_SKILL_MD = "/skill/ffw-dish/SKILL.md";

/**
 * What a user pastes into an agent. It names the two steps an agent cannot do
 * alone — importing the quest evidence needs the operator's browser, and the
 * mint is soul-bound to the operator — because those are the parts that look
 * like bugs when they go unsaid.
 */
export const GAME_AGENT_PROMPT = "Install the Fruit Fly World survival-game skill from https://fruitfly.world/skill/ffw-dish/SKILL.md and fly my lineage in the dish. Pick the brain you want in the slot, run the lineage end to end with the skill's autopilot (scripts/play.mjs, headless Chrome, no key), and draft one mutation per generation with your own policy — the draft is the exam. Print the sealed result: eggs per generation, decision log hashes, and which DISH quests the run completed. Then give me the import URL from the run so I can take the quest evidence into my own browser and claim the free Genesis Passport mint myself — the Passport is soul-bound to me, so you can never mint it. Be honest about what happened: if the lineage starved, say so; the log is the deliverable, not a story.";

/** The skill's own runner, for a user who would rather drive it than brief an agent. */
export const GAME_PLAY_COMMAND = "curl -sO https://fruitfly.world/skill/ffw-dish/scripts/play.mjs && node play.mjs --seed 42 --brain judgment --gens 3";
