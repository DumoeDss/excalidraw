# VHR-R1-006 atomic fix report

## Status

**DONE — the runtime artifact boundary is implemented and negatively/positively exercised. The finding remains OPEN pending non-author reviewer and integration disposition.** No reviewer acceptance is self-certified here. No browser target, candidate, canonical baseline, promotion output, task state, run state, commit, or push was created.

## Owning seam and retained partial audit

The interrupted partial implementation had a strict role parser and many `assertRoleMayWrite()` calls, but authorization remained separated from `mkdir`, proxy screenshot, `writeFile`, stable JSON, and canonical temp/rename operations. It also omitted the cleanup-time report overwrite and the canonical temporary destination. This pass replaced those scattered check-then-open sites with one `GuardedArtifactWriter.writeThrough()` callback seam.

The seam now owns authorization, nearest-existing-parent resolution, parent creation, the actual write callback, and post-write verification. The byte, stable-JSON, and atomic helpers all delegate to that seam. It enforces:

- exact `implementer`, `reviewer`, or `fixer` runtime parsing;
- reviewer result/evidence writes only under reviewer-owned roots;
- no reviewer candidate, canonical, update, or promotion capability;
- unchanged implementer/fixer result, evidence, candidate, update, canonical, and promotion capabilities;
- lexical root containment, every existing symlink/junction component, realpath containment through the nearest existing parent before and after directory creation, hard-linked destination rejection, and post-write containment;
- separate authorization of the canonical temporary file and final rename destination, with owned-temp cleanup if final authorization or rename fails.

Node on Windows does not expose an `openat`/no-follow directory-chain primitive. A hostile local process with concurrent filesystem write access could still race the final validation and the callback's open. The writer documents that residual local-race boundary; ordinary path, junction, symlink, hard-link, and nearest-existing-parent escapes are rejected by the APIs available here.

## Complete runtime write routing

The runner now routes all retained writes through the guarded writer:

- proxy viewport and toolbar-restoration screenshots through `writeThrough()`;
- evidence screenshots, current PNGs, and diff PNGs through `writeFile()`;
- the initial scenario report and the existing post-cleanup report overwrite through `writeStableJson()`;
- candidate PNGs and candidate metadata through writer helpers;
- aggregate run inventory through `writeStableJson()`;
- canonical PNG temporary write plus rename through `writeFileAtomically()` and canonical metadata through `writeStableJson()`.

The manual replay evidence entry was also moved off direct `mkdir`/`writeFile` and onto the same writer. The unguarded stable-JSON write helper was removed from `baseline.ts`. A source audit leaves filesystem mutation primitives only inside `artifactWriter.ts` and test-local temporary-directory setup; the proxy screenshot calls in `runner.ts` are nested inside `writeThrough()` callbacks.

The current two-phase scenario report behavior is intentionally unchanged for VHR-R1-008. Both phases now use the reusable seam, so the later single-final-report cleanup can reuse it without reopening this boundary fix.

## Runtime role and reviewer entry

`runVisualScenarios()` constructs the writer and parses/authorizes the role before implementation fingerprint work, proxy preflight, or target creation. Invalid roles and reviewer update attempts were exercised against a fake proxy and invoked neither `preflight()` nor `createTarget()`.

Normal worker verify/update/promote entries accept only implementer/fixer roles. Reviewer acceptance has a separate `test:visual:reviewer` package entry. Its `runReviewerVisualVerification()` wiring hard-codes both `mode: "verify"` and `role: "reviewer"`; it does not read `VISUAL_ROLE` or any replacement caller-controlled authority variable. A fake-runner smoke proved that even with `VISUAL_ROLE=implementer` in the process, the entry dispatches reviewer verify.

## Exact atomic paths

- `package.json`
- `scripts/visual-regression/artifactWriter.ts`
- `scripts/visual-regression/baseline.ts`
- `scripts/visual-regression/paths.ts`
- `scripts/visual-regression/replay.test.ts`
- `scripts/visual-regression/reviewerEntrypoint.ts`
- `scripts/visual-regression/runner.ts`
- `scripts/visual-regression/visual.promote.test.ts`
- `scripts/visual-regression/visual.reviewer.verify.test.ts`
- `scripts/visual-regression/visual.unit.test.ts`
- `scripts/visual-regression/visual.update.test.ts`
- `scripts/visual-regression/visual.verify.test.ts`

Path-content atomic fingerprint over those 12 sorted paths using `path + NUL + bytes + NUL`: `3d6d466d63a9132d3bd62aa4ff280f1beb0151c3cf8a44d5973878d983d6dd52`.

Full implementation source fingerprint over the current 41 allowed sources: `b7bcc8e157ce8324628e7684aced3ee1dca6c33890c4966dd993c8f1f1179220`.

## Focused verification

- Guarded writer/entry/preflight subset: **4/4 passed**. It used the real writer against temporary filesystem roots.
- Complete visual unit suite: **64/64 passed**.
- Positive reviewer proof wrote reviewer-owned result and evidence JSON and read both back exactly.
- Negative proofs rejected reviewer writes to implementer/fixer results, implementer evidence, reviewer candidates, and canonical baselines; each forbidden destination was asserted absent and each guarded callback was asserted uninvoked.
- Update and promotion proofs rejected reviewer authority before proxy or inspection-file work.
- Escape proofs rejected lexical escape, a directory junction to an outside root, a hard-linked evidence leaf, a junction occupying the canonical temp path, and a hard-linked canonical final destination. Outside bytes stayed unchanged; failed atomic final authorization left no owned temp file.
- Direct exact-file Prettier check over the 12 atomic source/package paths: **PASS**.
- Direct exact-file ESLint over the 11 TypeScript paths: **PASS, zero warnings/errors**.
- `git diff --check`: **PASS** for tracked delta; exact-file trailing-whitespace and strict UTF-8 checks cover the shared untracked harness files.
- Root `yarn test:typecheck`: **expected adjacency failure only** at `excalidraw-app/visualRegressionHost.tsx:1463` (`LibraryItem.status` widening) and `packages/excalidraw/components/LibraryMenuSection.tsx:70` (placeholder union lacks `name`). No 006 path produced a type error.
- Canonical directory hash: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`, unchanged from the accepted prior evidence hash. No `.candidate` temp exists under canonical baselines.

The repository `yarn prettier` wrapper was not used as a verdict because it prepends a global repository glob and encounters an unrelated Chrome-profile JSON-lines file. Direct Prettier over the exact files passed.

## Proxy and target lifecycle

No real browser scenario was needed: the reviewer entry smoke injected a fake runner and writer tests used temporary filesystem roots. After reading the required chrome-use instructions, dependency and health checks reported Node v24.15.0, Chrome port 9222, proxy ready/connected, `sessions=21`, and `managedTabs=0`. This fixer allocated no target id, so there is no fixer-owned exact target to close; the inherited browser state remained 21/0 and the sticky proxy was not stopped or restarted.

## Durable findings

1. A path guard is not an artifact boundary until it owns the operation that opens or delegates the destination; callback-based screenshot writers need the same coupling as local byte writers.
2. Role ownership must come from entry wiring for acceptance evidence. An environment-selected role is useful for implementer/fixer tooling but cannot establish independent reviewer provenance.
3. Canonical promotion has two destinations, not one: the temporary leaf and the rename target both require authorization and link/escape checks, plus temp cleanup on a rejected final target.

`VHR-R1-006` remains **OPEN pending non-author reviewer and integration disposition**.
