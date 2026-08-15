# Round 2 non-author re-review: rendered multi-editor readiness

Recorded on `2026-08-15` by the fresh non-author round-two reviewer for `VHR-R1-003`.

## Verdict

**CLEAN. `VHR-R1-003` is RESOLVED.**

The round-two fix now binds the multi-editor lifecycle and final capture to stable paint observed from the real left static canvas. Three consecutive reviewer-owned isolated runs, the two adjacent source-fixture scenarios, and a fresh unfiltered 20-scenario reviewer matrix all pass. The previously missing purple rectangle is visible in every retained multi-editor image and is corroborated by a stable paint signature in every lifecycle phase and immediately before capture.

No Blocker, Major, Minor, or Trivial finding remains. There are no accepted-known Minor or Trivial findings.

## Independence and immutable scope

- Fix author: the round-two non-reviewer fixer recorded in `evidence/fix-round-2/fix-report.md`.
- Verifier: a separate fresh reviewer context that did not author the fix and did not use fixer images as acceptance evidence.
- The reviewer directly inspected the implementation seam, ran fresh reviewer-only browser commands, opened every retained reviewer image at original resolution, and generated its own inventories and results.
- No implementation source, canonical baseline, candidate, comparison threshold, mask, package entry, run state, or unmanaged browser tab was changed by this review.
- Git base tree: `ff741af2b5aea30091c2cb154e1ff6abd3fe1c67` (`HEAD` `4d3ac154838ab910e1156022e4963395d21105a4`).
- Independently recomputed 46-path implementation source fingerprint: `10aeb221ea7aebfe319738908d442ae0233020f716d8ad134d94ce2f4d4748f0`.
- Independently recomputed canonical directory hash before and after all reviewer work: `311666a303148a5f3ccb1327c3fb56f4fc3f1ddf0aaf8b7af927fa12772d5830`.

## Direct source review

The reviewer read the complete round-two seam in:

- `excalidraw-app/visualRegressionHost.tsx`
- `scripts/visual-regression/actions.ts`
- `scripts/visual-regression/runner.ts`
- `scripts/visual-regression/visual.unit.test.ts`

The host samples the real `.excalidraw__canvas.static` bitmap for the left `visual-rectangle-01`, retains scene/API/owner/geometry facts, and exposes a compact paint receipt. Initial readiness may reissue the unchanged scene only within a fixed limit when API data is ready but paint is absent. The action layer requires two identical painted observations for initial, UPDATE, UNMOUNT survivor, and RECREATE phases. The runner repeats the same requirement immediately before crop, semantics, and capture. The delayed-paint unit regression proves capture and final publication remain blocked until paint stabilizes. No weakening or scope expansion was found.

## Fresh reviewer browser evidence

Every command used the hard-coded `test:visual:reviewer` entry. No `VISUAL_ROLE` override was set. The sticky proxy remained running and returned to `sessions=21`, `managedTabs=0` after every run.

| Scope | Exact PowerShell command shape | Run id | Result |
| --- | --- | --- | --- |
| Isolated repeat 1 | `$env:VISUAL_SCENARIOS='multi-editor-isolation'; $env:VISUAL_RUN_ID='reviewer-r2-multi-01-20260815'; yarn test:visual:reviewer` | `reviewer-r2-multi-01-20260815` | 1/1 pass, 0 mismatches |
| Isolated repeat 2 | `$env:VISUAL_SCENARIOS='multi-editor-isolation'; $env:VISUAL_RUN_ID='reviewer-r2-multi-02-20260815'; yarn test:visual:reviewer` | `reviewer-r2-multi-02-20260815` | 1/1 pass, 0 mismatches |
| Isolated repeat 3 | `$env:VISUAL_SCENARIOS='multi-editor-isolation'; $env:VISUAL_RUN_ID='reviewer-r2-multi-03-20260815'; yarn test:visual:reviewer` | `reviewer-r2-multi-03-20260815` | 1/1 pass, 0 mismatches |
| Adjacency | `$env:VISUAL_SCENARIOS='desktop-selected-rectangle,desktop-active-text'; $env:VISUAL_RUN_ID='reviewer-r2-adjacency-20260815'; yarn test:visual:reviewer` | `reviewer-r2-adjacency-20260815` | 2/2 pass, 0 mismatches |
| Fresh full matrix | `Remove-Item Env:VISUAL_SCENARIOS -ErrorAction SilentlyContinue; $env:VISUAL_RUN_ID='reviewer-r2-full20-20260815'; yarn test:visual:reviewer` | `reviewer-r2-full20-20260815` | 20/20 pass |

The environment variables were cleared after each command. All five runs report fresh disposable target closure, exact target absence, `targetsClean=true`, `proxyHealthy=true`, and unchanged canonical hashes.

### Isolated lifecycle proof

All three isolated runs and the full-matrix multi-editor result record the same left-editor facts:

| Phase | Scene | Paint | Matching ratio | Signature | Root/API | Geometry |
| --- | --- | --- | --- | --- | --- | --- |
| initial | `visual-rectangle-01` | present | `1` | `5a41e4c5` | `left-root-1` / `left-api-2` | `24,68,1008,808` |
| updated | same | present | `1` | `5a41e4c5` | same | same |
| unmounted survivor | same | present | `1` | `5a41e4c5` | same | same |
| restored | same | present | `1` | `5a41e4c5` | same | same |
| final pre-capture | same | present | `1` | `5a41e4c5` | capture bound to restored phase | same canvas |

Trusted UPDATE, UNMOUNT, and RECREATE controls were accepted. The prior right root/API were destroyed and disconnected, associations and owner claims were cleaned, the recreated right generation was distinct, and the left survivor stayed physically and semantically stable. Semantic, cleanup, performance, console, and checker failure arrays are empty; debugger state, input capabilities, target close, and target enumeration restore exactly.

### Full 20-scenario matrix

- Exactly 20 final reviewer `__result.json` files exist for 20 unique scenarios; all are reviewer/run-scoped and parse under strict UTF-8.
- All 20 scenarios pass. Nineteen have zero mismatched pixels.
- `narrow-loading` has 122 spinner-edge pixels, ratio `0.0004006568144499179`, below the unchanged `0.0005` comparison budget.
- Semantic, cleanup, performance, console, checker-overlay, checker-badge, and checker-window failures are zero.
- The recoverable-error scenario intentionally contains its product error dialog; the checker host remains hidden and its overlay/badge/window counts remain zero.
- Restoration, input restoration, target close, and final target absence succeed for 20/20 scenarios.
- The run uses 20 disposable targets, reports `targetsClean=true` and `proxyHealthy=true`, and leaves the canonical hash unchanged.

## Personal image inspection

The reviewer opened 26 retained PNGs individually at original resolution:

- 20 full-matrix primary images;
- the short-landscape toolbar-restored companion image;
- three isolated multi-editor repeats;
- two adjacency images.

The machine-checkable inventory `evidence/reviewer/inspection-reviewer-r2-20260815.json` records each file, SHA-256, dimensions, classification, and at least three distinct observations. All 20 primary images and all six companions are accepted. In particular, every multi-editor image visibly contains the left purple rectangle, physically distinct light/dark editor regions, bounded owner chrome, and no checker or lifecycle residue.

## Automated and integrity checks

| Gate | Exact command | Result |
| --- | --- | --- |
| Complete visual unit suite | `yarn test:visual:unit` | 80/80 pass |
| Manual replay contract | `yarn test:visual:replay` | 1/1 pass |
| API lifecycle adjacency | `yarn test:app --run --minWorkers=1 --maxWorkers=1 packages/excalidraw/tests/packages/events.test.tsx` | 6/6 pass |
| Exact formatting | `node node_modules/prettier/bin-prettier.js --check excalidraw-app/visualRegressionHost.tsx scripts/visual-regression/actions.ts scripts/visual-regression/runner.ts scripts/visual-regression/visual.unit.test.ts` | pass |
| Exact lint | `node node_modules/eslint/bin/eslint.js excalidraw-app/visualRegressionHost.tsx scripts/visual-regression/actions.ts scripts/visual-regression/runner.ts scripts/visual-regression/visual.unit.test.ts` | pass, zero warnings |
| Whitespace | `git diff --check` | pass |

Additional read-only audits confirm strict UTF-8 decoding without BOM, U+FFFD, or known mojibake signatures for the reviewed source and report files; JSON parsing; PNG signatures, dimensions, and inventory hashes; exact reviewer artifact scope; exactly one final result per full-matrix scenario; unchanged comparison policy; and unchanged canonical hash. The final proxy query is `status=ok`, connected to Chrome port `9222`, `sessions=21`, `managedTabs=0`.

## Finding disposition

| Finding | Entry severity | Round-two fix | Independent evidence | Disposition |
| --- | --- | --- | --- | --- |
| `VHR-R1-003` multi-editor lifecycle isolation | Blocker | Stable real-canvas paint signature at all lifecycle phases and immediately before capture, with delayed-paint regression | Three isolated reviewer repeats, two adjacency scenarios, fresh 20/20 matrix, 26 original-resolution images, and focused automated gates | **RESOLVED** |

## Loop decision

The author/verifier separation invariant is satisfied, the only round-two entry finding is resolved, the required affected/adjacent/full-matrix evidence is green, and no new finding was introduced. The review cycle terminates **CLEAN** at round 2 of the three-round cap. Tasks 10.3 and 10.4 may be marked complete. Final audit and local-only delivery tasks remain outside this reviewer-owned report.
