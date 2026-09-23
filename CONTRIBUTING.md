# Contributing

## Before anything else

```bash
npm run check     # typecheck + test + build
```

Green on a clean checkout, with no `.env` at all. If a change makes an env file necessary to
build, that is the bug — not a reason to add a secret.

## One source of truth per surface

The survival game's logic lives in `public/play/js/` and is driven by exactly one
implementation — the game itself. The agent skill (`public/skill/ffw-dish/`) drives the
real game through `FlyLabAPI.autopilot` and must never grow a second copy of the model.
If you change game logic, run the skill end to end in the same commit.

## Copy rules

The site and the docs make claims, and some of them are load-bearing:

- Anything about a token, a treasury, or incentives is **roadmap** — no date, nothing on sale,
  no price, no yield, no future-value statement.
- Do not describe the project as the first, the only, or the largest at anything.
- The world model is connectome-inspired. Do not describe it as a simulation of a real fly brain.
- Passport distribution and pricing numbers live on chain. Read them from the contract; do not
  restate them in prose where they can go stale.

## Tests

`node:test` via `tsx`, in `tests/`. Run one file with
`npx tsx --test tests/bench.test.ts`. New behaviour in the world
model, the bench or the mint maths should come with a test — those are the parts a mistake is expensive in.

## Commits and pull requests

Explain *why* in the message; the diff already says what. Keep unrelated changes in separate
commits. Do not commit anything from `.env.local`, a deployed address you have not verified, or
a private key of any kind. If you think you have found a leaked credential, see
[SECURITY.md](SECURITY.md) and report it privately.

## License

Contributions are accepted under the [MIT license](LICENSE).
