## What this PR does

<!-- One or two sentences. Link to an issue if relevant. -->

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Docs / packaging
- [ ] Test / CI
- [ ] Scoring, map, or caps — **see the checklist item below**

## Checklist

- [ ] `npm run check` passes (typecheck, tests, build)
- [ ] If `app/lib/arena.ts` changed, `public/skill/ffw-arena/lib/arena.mjs` changed with it in this
      commit — the parity test fails the build otherwise
- [ ] If the scoring, the map, the energy rule or the caps changed, `public/skill/ffw-arena/SKILL.md`
      was updated in the same commit
- [ ] No secrets, private keys, RPC keys, or credentials added
- [ ] No superlatives, no token price or yield claims, and any incentive-layer text is labelled
      roadmap with no date
- [ ] On-chain numbers (address, price, supply) are read from the contract, not restated in prose
- [ ] CHANGELOG updated for user-visible changes

## Notes for reviewers

<!-- Reproduction steps, the epoch you tested on, the score you got, screenshots. -->
