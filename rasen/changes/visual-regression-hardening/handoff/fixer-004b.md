# Fixer 004b handoff

## Original intent

Independently audit and complete `VHR-R1-004`: apply real target-scoped coarse/fine capabilities before navigation, read them back from the navigated document, prove mounted editor projection plus the complete pointer-aware harness, restore prior capabilities exactly, audit the retired worker's formatter collateral, and leave no owned Chrome targets or new session-map growth.

## Position

Atomic implementation/evidence is complete. The finding remains **OPEN** for the original reviewer and integration. Full scenario acceptance is still blocked by a separate exact-target trusted-keyboard verification, and every retained image is checker-contaminated.

Authoritative report: `rasen/changes/visual-regression-hardening/evidence/fix-round-1/atomic-004/fix-report.md`.

## Retained implementation

The independently audited 004 files are:

- `scripts/visual-regression/proxy.ts`
- `scripts/visual-regression/browserScripts.ts`
- `scripts/visual-regression/scenarios.ts`
- `scripts/visual-regression/runner.ts`
- `scripts/visual-regression/types.ts`
- `scripts/visual-regression/visual.unit.test.ts`

This successor changed only `proxy.ts` and `visual.unit.test.ts`:

- exact DevTools auxiliary targets are discovered through `Target.getTargets` and the helper page's recursive `parentId` tree;
- auxiliaries close before the DevTools page, preventing stale proxy sessions after application navigation;
- empty HTTP 200 responses from non-page `/close` calls are treated as successful deletion;
- focused tests prevent unrelated/orphan targets from entering the cleanup set.

## Verification summary

- visual unit: 40/40 pass;
- complete mounted-editor contract: 2/2 pass, 81 skipped;
- six-file Prettier and ESLint: pass;
- portrait coarse: exact apply, post-navigation match, `phone / phone / touch`, exact restore;
- short-landscape coarse: exact apply, post-navigation match, `phone / phone / landscape / short / touch`, exact restore;
- desktop fine: preserves physical touch count, `desktop / desktop / compact`, exact restore;
- after cleanup repair, all targeted runs remain `sessions=21`, `managedTabs=0` before/after and leave zero owned helper targets;
- canonical hash unchanged: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`;
- six-path fingerprint: `b272e6b40677e92127f8c7c856ba6b3780ea55d717e705fa985351eb7a395723`;
- full source fingerprint: `9282a3e1a0660cb4f32795e321157838b6fb367aa03a57d79f181df3011110f8`.

All 14 successor-retained PNGs were personally inspected. They are diagnostic only: each visible product capture contains the red checker badge, and preliminary phone run 1 also contains localized empty-Library drift. Do not promote any of them.

## Proxy process degradation

The inherited proxy started at `18 / 0`. Pre-fix reproduction and one relationship probe exposed the auxiliary leak and left three closed ids in the proxy's in-memory session map, so the process now reports `21 / 0`. Restarting the sticky proxy to clear those stale keys was forbidden, and closed ids are not exposed for safe deletion.

An early diagnostic difference probe also closed one newly started unattached extension service worker. It closed no ordinary page/tab and was rejected as too broad. Delivered code uses only exact `parentId` ownership.

After the repair, repeated navigation, success cleanup, and failure cleanup all remain stable at their starting session count. Final target enumeration has no owned main/helper targets.

## Formatter collateral

All 32 exact paths from `handoff/fixer-004.md` were audited read-only:

- 27 JSON parse and round-trip semantically;
- nine inventory and 17 result envelopes retain required structure;
- manual replay contains 20/20 scenario identities;
- the older implementer handoff retains all required semantic sections;
- no BOM, replacement character, or known mojibake signature;
- current semantic aggregate `948e4f70de3a9b71f9173c0fa2809d31981442c873b5c105e5bac764a42b8f23`.

The lead-owned `auto-run.json` is valid but is the only one of the 32 that currently fails Prettier check; it was not rewritten. No historical pre-format bytes exist, so prior whitespace and exact pre-command identity remain unprovable.

## Eliminated hypotheses

- The three visible page targets were not the stale-session source; a pure `about:blank` helper lifecycle returned exactly to baseline.
- `openerId` is insufficient; the helper worker and iframe expose the owning DevTools target through `parentId`.
- Time-window selection of every new non-page target is unsafe because unrelated extension service workers can start in the same interval.
- The retained coarse/fine application is not a metadata echo: real Chrome immediate and post-navigation reads changed exactly as requested and restored exactly.
- Full phone/desktop failures after 004 acceptance are not evidence against input application; both stop later in a separate trusted-input action gate.

## Next action

The original reviewer should re-review `VHR-R1-004` from the atomic report, beginning from the proxy count they observe and requiring no delta after each fresh reviewer target. After the separate trusted-input findings and checker badge/detector mismatch are fixed, rerun `phone-light-library`, `phone-dark-landscape`, and fine desktop adjacency through complete flows with fresh reviewer-owned images. Keep the finding open until that non-author disposition; do not promote the retained fixer images.
