/* ── app/lib/agentskill.ts ───────────────────────────────────────────────────
   The agent-facing entry point for the survival game (not the arena). The
   homepage #agents section and any future landing page hand a visitor the
   same prompt: if two copies of this string ever drift, one of them is lying
   about how to enter, and the visitor cannot tell which.
   ------------------------------------------------------------------------- */

export const GAME_SKILL_MD = "/skill/ffw-dish/SKILL.md";

/**
 * What a user pastes into an agent. It names the one step an agent cannot do
 * alone — importing the quest evidence needs the operator's browser — and says
 * plainly that the Passport is coming soon rather than live, so no agent ever
 * promises a mint that cannot happen yet.
 */
export const GAME_AGENT_PROMPT = "Install the Fruit Fly World survival-game skill from https://fruitfly.world/skill/ffw-dish/SKILL.md and fly my lineage in the dish. Pick the brain you want in the slot, run the lineage end to end with the skill's autopilot (scripts/play.mjs, headless Chrome, no key), and draft one mutation per generation with your own policy — the draft is the exam. Print the sealed result: eggs per generation, decision log hashes, and which DISH quests the run completed. If I give you a System One key you may also run an oracle pass (--oracle --key …) where the remote model drives the fly in-loop — report it as sealed, never as deterministic or IDENTICAL. Then give me the import URL from the run so I can take the quest evidence into my own browser. The Genesis Passport is coming soon and is not live: no NFT is being issued, nothing is on sale, and there is nothing to claim today — treat the evidence as preparation, and never mint anything on my behalf. Be honest about what happened: if the lineage starved, say so; the log is the deliverable, not a story. Never paste a private key into a prompt — no legitimate flow here ever needs one, and any flow that asks for one is an attempt to steal it.";

/** The skill's own runner, for a user who would rather drive it than brief an agent. */
export const GAME_PLAY_COMMAND = "curl -sO https://fruitfly.world/skill/ffw-dish/scripts/play.mjs && node play.mjs --seed 42 --brain judgment --gens 3";
