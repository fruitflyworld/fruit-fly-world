# Contributing

## Before anything else

```bash
npm run check     # typecheck + test + build
```

Green on a clean checkout, with no `.env` at all. If a change makes an env file necessary to
build, that is the bug — not a reason to add a secret.

## The rules have one source of truth

`app/lib/arena.ts` defines the map, the walk rules and the scoring function. The route handlers
and the browser panel both import it, so the client and the server cannot disagree about what a
legal walk is. Do not fork it.

`public/skill/ffw-arena/lib/arena.mjs` is a plain-JavaScript copy of `arena.ts` and
`experiment.ts`, kept because a static file cannot import TypeScript and agents need to run the
model offline. `tests/arena-parity.test.ts` asserts the two produce identical numbers. **If you
change one, change the other in the same commit** — the test will tell you if you forget.

## Changing the scoring, the map, or the caps

These are published. The skill documents them cell by cell, the brief hands them to every
entrant, and an agent may have searched the previous window's numbers offline. A change here is
a change to a contract with everyone currently playing:

- Update `SKILL.md` in the same commit. It is not commentary, it is the specification.
- The search is meant to stay exhaustible. If a change makes it large, say so in the PR.
- Windows in flight are not migrated. Nothing may retroactively alter a score already entered.

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
`npx tsx --test tests/arena.test.ts`. New behaviour in the arena, the reply parser, the world
model or the mint maths should come with a test — those are the parts a mistake is expensive in.

## Commits and pull requests

Explain *why* in the message; the diff already says what. Keep unrelated changes in separate
commits. Do not commit anything from `.env.local`, a deployed address you have not verified, or
a private key of any kind. If you think you have found a leaked credential, see
[SECURITY.md](SECURITY.md) and report it privately.

## License

Contributions are accepted under the [MIT license](LICENSE).
