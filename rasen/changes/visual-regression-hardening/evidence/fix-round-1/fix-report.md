# Fix round 1 integration report

Recorded at `2026-08-14T14:46:04.225Z` by the non-reviewer fixer integration role.

## Outcome

The nine round-one review findings have focused implementations, regressions, and integrated browser evidence. Tasks 10.1 and 10.2 are complete. This report does **not** close or disposition any finding: all nine remain **OPEN** until a non-author reviewer completes tasks 10.3 and 10.4.

The final audited implementation fingerprint is:

`70737b62e062eb3269a9d266c079576b79147caf9ba3275a13230f20f35509ad`

It covers the 46 allowed implementation-source paths recorded by `fixer-integration-r1-full20-update-26`. No implementation source changed after that update, the final typecheck, or the final browser verification.

## Integrated finding delta

| Finding | Severity | Owning seam repaired | Small regression/evidence | Fixer state |
| --- | --- | --- | --- | --- |
| `VHR-R1-001` blank-canvas false-pass | Blocker | Trusted coordinate routing now correlates physical hit, page receipt, owning canvas, exact editor emitter, behavior, and cleanup. | Positive and rejection coverage in the visual unit suite plus desktop/coarse browser evidence. | IMPLEMENTED-OPEN |
| `VHR-R1-002` incomplete toolbar sequence | Blocker | The final row exercises trusted left/center/right points, sibling and adjacent shielding, row/Escape/outside close behavior, focus, and unmount cleanup. | Visual unit coverage and focused adaptive-toolbar/interactivity tests. | IMPLEMENTED-OPEN |
| `VHR-R1-003` static multi-editor acceptance | Blocker | The fixture and runner execute trusted update, unmount, and recreate phases; old API/owner residue and survivor identity, focus, geometry, profile, and scene are asserted. | Lifecycle unit tests, cached-API regression, isolated run 25, and final full run 27. | IMPLEMENTED-OPEN |
| `VHR-R1-004` echoed coarse/touch declarations | Blocker | Browser input capabilities are applied and queried; mounted-editor acceptance links to the complete product pointer contract and restores prior input exactly. | Mounted-editor product tests and per-scenario input receipts/restoration in the final matrix. | IMPLEMENTED-OPEN |
| `VHR-R1-005` unused application fixtures | Blocker | Fixed local Library, AI, Share, collaboration, loading, recovery, and multi-editor data now feed the real application seams; named Library content has identity assertions. | Fixture/unit coverage and three responsive Library scenarios in the final matrix. | IMPLEMENTED-OPEN |
| `VHR-R1-006` unenforced reviewer artifact boundary | Blocker | A guarded writer authorizes every retained write; strict role parsing precedes proxy work and reviewer execution has a hard-coded entry. | Writer/reviewer-entry rejection tests and separated fixer output roots. | IMPLEMENTED-OPEN |
| `VHR-R1-007` invisible recovery heading | Major | The recovery surface owns a readable foreground and the scenario asserts heading semantics and contrast. | Focused semantic coverage plus inspected recovery candidate/canonical/current images. | IMPLEMENTED-OPEN |
| `VHR-R1-008` restoration claimed before proof | Major | Publication follows post-restore debugger, storage, locale, safe-area, style, focus, marker, scene/app state, input, console, close, and enumeration observations. | Restoration-order/rejection tests and 20 exact final restoration receipts. | IMPLEMENTED-OPEN |
| `VHR-R1-009` direct AI/Share state mutation | Major | Prerequisites are seeded, but acceptance opens both surfaces through trusted visible product controls and owned-state assertions. | Trusted/untrusted and blocked-control unit coverage plus final AI/Share browser scenarios. | IMPLEMENTED-OPEN |

The integrated delta preserves the responsive tier and density model, physical safe-area/direction behavior, context/public types and APIs, marker/pointer neutrality, domain action ownership, and baseline governance. No mask or comparison tolerance was widened, no assertion was weakened, and no drift was approved merely because pixels differed.

## Multi-editor integration race found and repaired

The first final read-only matrix, `fixer-integration-r1-full20-verify-24`, passed 19/20. `multi-editor-isolation` alone failed with 69,098 mismatched pixels (`0.0533163580`); the left rectangle was absent, while semantic, cleanup, performance, console, restoration, close, and enumeration gates were clean. Canonical content remained read-only at `fc7727c7abd68b59d4fc6d2b4fc61b7acec0571e0630984ef54b1aaac34b3ca8`.

The failure exposed an initialization race rather than acceptable raster drift. Multi-editor initialization had waited for roots, APIs, and owners but could record an empty scene while blank-canvas routing was still settling. That empty snapshot could later be restored successfully, producing a mechanically consistent but visually incomplete survivor.

The integration repair requires exact initial scenes before lifecycle capture:

- left: one active `visual-rectangle-01` element of type `rectangle`;
- right: one active `visual-text-01` element of type `text`.

Scene summaries are now part of phase stability and lifecycle assertions. The left scene must survive initial, update, unmount, and restored phases; the restored right scene must equal its initial scene. Unit regressions reject premature empty initialization and survivor-scene loss.

`fixer-integration-r1-multi-scene-25` then passed the isolated scenario 1/1 with zero mismatch and exact scene facts. Its original-resolution image was inspected before the full rerun.

## Candidate inspection and promotion

`fixer-integration-r1-full20-update-26` passed 20/20 on the final source fingerprint. It recorded zero semantic, cleanup, performance, checker, console, restoration, input-restoration, target-close, or enumeration failures and left the then-current canonical hash unchanged.

All 20 candidate PNGs were opened individually at original resolution. Their dimensions and SHA-256 hashes, explicit `intentional-change` classifications, and three distinct observations per image are recorded in:

`evidence/fix-round-1/inspection-fixer-integration-r1-full20-update-26.json`

The inspection manifest strictly matched 20 candidate sidecars and 20 image hashes. The guarded promotion test passed 1/1. The promoted canonical root contains exactly 20 PNGs and 20 JSON metadata files, all approved by `fixer` against the final source fingerprint, with no candidate or temporary residue. Its new directory hash is:

`311666a303148a5f3ccb1327c3fb56f4fc3f1ddf0aaf8b7af927fa12772d5830`

## Final read-only verification

`fixer-integration-r1-full20-verify-27` passed 20/20 in 217.375 seconds.

- Canonical hash before and after: `311666a303148a5f3ccb1327c3fb56f4fc3f1ddf0aaf8b7af927fa12772d5830` — unchanged.
- Failures: semantic `0`, cleanup `0`, performance `0`, console `0`, checker `0`.
- Exact restoration, input restoration, target close, and target absence: 20/20 each.
- Artifacts: 20 current PNGs, 20 result JSONs, and 20 viewport PNGs; no diff PNG.
- `multi-editor-isolation`: zero mismatch, exact left/right scene facts across all four phases, and the left rectangle was personally confirmed in the original-resolution current image.
- `narrow-loading`: 122 spinner-edge pixels differed (`0.0004006568`), below the unchanged `0.0005` per-scenario budget; semantics and cleanup were exact. No mask or tolerance change was made.
- Final proxy health: connected to Chrome port 9222 with `sessions=21`, `managedTabs=0`.

Browser work was deliberately delayed whenever another worker owned managed targets. Every integration browser run started only from the shared `21 / 0` state and returned there. One ordinary unmanaged `localhost:3001` user page was present; it and all other foreign tabs were left untouched. The sticky proxy was not stopped or restarted.

## Automated checks

Checks executed after the final multi-editor source repair:

- exact Prettier and ESLint for `excalidraw-app/visualRegressionHost.tsx`, `scripts/visual-regression/actions.ts`, and `scripts/visual-regression/visual.unit.test.ts`: pass;
- `yarn test:visual:unit`: 78/78 pass;
- root typecheck: pass;
- `yarn test:visual:replay`: 1/1 pass;
- focused package delta: `adaptiveToolbar.test.tsx` 7/7, `LibraryUnit.test.tsx` 2/2, `events.test.tsx` 6/6, and the three modified `interactivity.test.tsx` cases 3/3;
- `git diff --check`: pass;
- current implementation fingerprint recomputation: exact `70737b62e062eb3269a9d266c079576b79147caf9ba3275a13230f20f35509ad` over 46 paths.

Two broader package invocations exposed Vitest collection infrastructure behavior and are not hidden: default four-file concurrency left three files at 0 tests after a worker `fetch` timeout on `ConfirmDialog.tsx`; single-worker four-file collection passed 15 tests in three files but left `interactivity.test.tsx` at 0 tests after a `DialogActionButton.tsx` fetch timeout. Running the three changed interactivity cases alone on one worker then passed 3/3. No assertion failure occurred in either infrastructure-failed attempt.

## Integrity and scope audit

- 109 relevant source/config/evidence/metadata files strictly decode as UTF-8 without BOM, U+FFFD, or known mojibake signatures.
- 65 JSON files parse successfully.
- Candidate, canonical, current, and viewport PNG signatures pass: 20 each; final verify has zero diff PNGs.
- Candidate, canonical, and current SHA-256 associations pass: 20 each.
- Canonical inventory is exactly 20 PNG plus 20 JSON with zero temporary/candidate residue.
- The tracked implementation delta contains 16 allowed paths, no task-outside tracked path, and no `yarn.lock` change.
- Existing `NUL`, stash state, unrelated worktree changes, `.rasen/**`, the sticky proxy, and foreign browser state were preserved.

## Required non-author next step

The original or another non-author reviewer must perform tasks 10.3 and 10.4: re-review each finding against the integrated delta, rerun affected scenarios plus adjacency risks from fresh reviewer-owned targets and output roots, personally inspect every retained reviewer image, and issue explicit finding-by-finding dispositions. The fixer does not claim review-cycle cleanliness or finding closure.
