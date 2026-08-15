# Round 1 independent delta re-review

## Verdict

**NOT_CLEAN — 8 findings RESOLVED, 1 Blocker OPEN.** The fresh reviewer-owned full matrix completed all 20 scenarios, but `multi-editor-isolation` failed its canonical comparison because the final left canvas was visibly blank. The machine lifecycle receipt claimed that `visual-rectangle-01` remained present, while the reviewer screenshot omitted it and differed by 69,098 pixels (`0.05331635802469136`) in the exact rectangle region. This is a material rendered-state race and keeps `VHR-R1-003` open.

Tasks 10.3 and 10.4 remain unticked. This reviewer made no product, harness, baseline, candidate, package-script, assertion, run-state, commit, push, archive, or spec-sync change.

## Reviewer provenance and reviewed state

- Mode: dispatched, report-only, non-author reviewer.
- Reviewer run id: `reviewer-r1-delta-20260814-2319`.
- Hard-coded entry: `yarn test:visual:reviewer`; no scenario filter and no caller-selected role were supplied.
- Fresh reviewer results: `scripts/visual-regression/results/reviewer/reviewer-r1-delta-20260814-2319/`.
- Reviewer inventory: `evidence/reviewer/run-reviewer-r1-delta-20260814-2319.json`.
- Reviewer screenshots: `evidence/reviewer/screenshots/*__reviewer__reviewer-r1-delta-20260814-2319__evidence.png`.
- Personal inspection inventory: `evidence/reviewer/inspection-reviewer-r1-delta-20260814-2319.json`.
- Independently recomputed implementation source fingerprint over the runner's 46 ordinal-sorted source paths: `70737b62e062eb3269a9d266c079576b79147caf9ba3275a13230f20f35509ad`.
- Git commit and tree identity: `4d3ac154838ab910e1156022e4963395d21105a4` / `ff741af2b5aea30091c2cb154e1ff6abd3fe1c67`; the custom source fingerprint above is authoritative for the tracked-plus-untracked implementation state exercised by the visual runner.
- Canonical hash before and after: `311666a303148a5f3ccb1327c3fb56f4fc3f1ddf0aaf8b7af927fa12772d5830` — unchanged.
- Sticky proxy before and after: connected to Chrome port 9222, `sessions=21`, `managedTabs=0`; no restart or stop occurred and no unmanaged tab was closed.

The fixer runs and reports were used only to locate the intended delta. Every disposition below is based on this reviewer's fresh results, direct source/spec reads, focused test commands, and personal inspection of reviewer-owned images.

### Provenance clarification

A mistakenly spawned nested read-only task, `/root/visual_hardening_reviewer_r1_delta/visual_multi_editor_race_map`, was interrupted immediately and returned no output. A shared-tree provenance audit found no artifact or edit attributable to it, and none of its conclusions or inferences were available or used. This report and every disposition remain based solely on this reviewer's fresh full20 run, direct source/spec reads, focused tests, and personal inspection of reviewer-owned images.

## Fresh matrix result

- Scenarios: 20 completed; 19 pass, 1 fail.
- Fresh disposable targets: 20 created; 20 exact closes and 20 absence enumerations succeeded.
- Semantic failures: 0.
- Cleanup failures: 0.
- Performance failures: 0.
- Error-level console events: 0.
- Checker badges/windows: 0.
- Fresh restoration verification: 20/20.
- Exact input restoration: 20/20.
- Final result reports: exactly 20, published once per scenario after restoration/close/enumeration.
- Pixel results: 18 exact matches, `narrow-loading` passed with 81 spinner-edge pixels (`0.00026600985221674877`) under the unchanged `0.0005` scenario budget, and `multi-editor-isolation` failed with 69,098 pixels (`0.05331635802469136`). No tolerance, mask, or assertion changed.
- Budgeted short-landscape medians from one warm-up plus three accepted samples: CLS `0`, long task `0 ms`, interaction `51.700000047683716 ms`, resource count `250`, transfer `67,800 bytes`, and harness duration `1663.6641000000236 ms`.

All 20 primary reviewer PNGs and the additional short-landscape restored-state PNG were opened individually at original resolution. The machine-checkable inspection inventory records file, SHA-256, dimensions, classification, and at least three distinct observations per image. Nineteen primary images were accepted; the multi-editor image was rejected.

## Finding-by-finding disposition

| Finding | Severity | Disposition | Independent reviewer confirmation |
| --- | --- | --- | --- |
| `VHR-R1-001` blank-canvas trusted routing | Blocker | **RESOLVED** | Seventeen applicable scenarios independently recorded exact canvas hits, browser-trusted page receipts, exact-editor `ExcalidrawImperativeAPI.onPointerDown` receipts, finite scene points, behavior correlation, and complete cleanup. The three non-applicable cases gave narrow reasons: active text editing, modal isolation, and application-owned recovery. No accepted result reported a false canvas route. |
| `VHR-R1-002` toolbar click/close/lifecycle sequence | Blocker | **RESOLVED** | The short-landscape reviewer result trusted-clicked the final Line row at ratios `0.15`, `0.50`, and `0.85`, each with `1/0/0` row/sibling/adjacent activations. Trusted CDP Escape closed with trigger focus; trusted outside canvas input closed without trigger focus; adjacent actions restored from hidden/inert to visible/interactive. Trusted unmount/recreate produced distinct editor generations, detached all old nodes/claims, and left helper count zero. Both open and restored reviewer images were personally inspected. |
| `VHR-R1-003` multi-editor update/unmount/recreate isolation | Blocker | **OPEN** | Trusted UPDATE, UNMOUNT, and RECREATE receipts, distinct APIs/roots, old-API destruction, owner cleanup, and stable survivor geometry were present, but the final reviewer bitmap visibly omitted the left rectangle while the lifecycle receipt claimed it existed. The scenario failed with the exact historical 69,098-pixel rectangle-region mismatch. Machine scene identity without rendered-pixel presence is insufficient acceptance. |
| `VHR-R1-004` real coarse/touch capability | Blocker | **RESOLVED** | Both phone scenarios independently observed requested and actual `coarse / no-hover / 1`, matching phone/touch root projections, and a passing `full-mounted-editor` receipt bound to fingerprint `70737b62e062eb3269a9d266c079576b79147caf9ba3275a13230f20f35509ad`. Fine desktop remained `fine / hover / 10`, and all 20 scenarios restored exact prior input capability. The mounted pointer authority cases also passed 2/2 in the focused package run. |
| `VHR-R1-005` real Library fixture | Blocker | **RESOLVED** | Desktop, tablet, and phone Library scenarios passed strict visible-item assertions for the fixed `Reusable card` and their reviewer images visibly contained the purple item instead of the previous empty-only state. All three canonical comparisons were exact. |
| `VHR-R1-006` guarded writer and hard-coded reviewer entry | Blocker | **RESOLVED** | The reviewer-only package entry produced role `reviewer` outputs under reviewer roots even with no `VISUAL_ROLE` authority, while canonical hash remained unchanged. The 78/78 visual unit suite independently covered guarded writes, role parsing, forbidden reviewer destinations, escape/link rejection, update/promotion refusal, and hard-coded entry behavior. |
| `VHR-R1-007` recovery heading semantics and contrast | Major | **RESOLVED** | The reviewer recovery image visibly showed the full two-line heading. Semantic results recorded owner role `main`, exact accessible name and `aria-labelledby`, heading role/name, `rgb(27,27,31)` on white, and contrast `17.1686267287442:1`. The canonical comparison was exact. |
| `VHR-R1-008` fresh restoration query and single final publication | Major | **RESOLVED** | All 20 reviewer results recorded fresh post-restore host/input/console facts, exact input restoration, successful close, and target absence before the final report. Exactly 20 final result JSON files exist for 20 scenarios; no provisional duplicate report exists. Restoration and publication negative paths passed in the 78/78 unit suite. |
| `VHR-R1-009` visible trusted AI/Share actions | Major | **RESOLVED** | AI opened through two visible actionable controls; both page receipts were `isTrusted: true` and target-owned before the owned text-to-diagram surface appeared with focus inside. Share opened through the visible Share button with the same trusted receipt and focus-owned result. Both reviewer images and exact canonical comparisons confirm the final surfaces. |

## Open Blocker: rendered scene can lag the accepted lifecycle receipt

`multi-editor-isolation` is not a tolerance or baseline-governance issue. Its reviewer result has zero semantic, cleanup, performance, console, or checker failures and reports the left scene as exactly one `visual-rectangle-01` rectangle through initial, updated, unmounted, and restored phases. Nevertheless, the final 1440×900 reviewer image shows a blank left canvas. The canonical image contains the expected purple rectangle, and the high-visibility diff isolates a `325×213` region at `(382,287)`.

This independently reproduces the same 69,098-pixel failure shape documented during fixer integration before its final run. A later passing fixer capture did not eliminate the race. The present full reviewer matrix correctly fails it, so the review loop cannot close.

### Exact round-2 delta recommendation

1. Repair the multi-editor readiness seam so lifecycle acceptance waits for rendered canvas presence, not only API scene identities. Add an observable rendered-scene/canvas paint signature for the left rectangle after initial setup and again after UPDATE, UNMOUNT, and RECREATE settle.
2. Make absence of that rendered signature a semantic failure before screenshot comparison; preserve the exact scene-id/type assertions as a companion gate.
3. Add a focused regression that deliberately delays scene-to-canvas paint and proves the runner cannot publish a passing lifecycle receipt or capture early.
4. Run repeated isolated multi-editor reviewer attempts to establish determinism, then run a fresh reviewer-owned full20 matrix and inspect all affected plus adjacency images. Do not modify the canonical image, `0.0005` loading budget, any tolerance, mask, or assertion to absorb this failure.

## Standards and specification axes

### Standards

One material correctness issue remains: the lifecycle/readiness boundary accepts a data-level scene fact before the browser has rendered that fact. This is a concurrency/readiness defect and an incomplete negative-path test at the browser seam. No additional Blocker, Major, Minor, or Trivial delta finding was identified from the remaining eight fixes.

### Specification

The update/unmount/recreate receipts satisfy most of the multi-editor lifecycle contract, but the required visible scene and geometry are not stable in the accepted final state. The multi-editor requirement and the separate implementation/reviewer acceptance requirement therefore remain unmet. The other eight findings now have reviewer-owned browser and focused-test proof matching their specified behavior.

## Verification evidence

| Scope and rationale | Exact command | Result |
| --- | --- | --- |
| Visual manifest, writer, routing, lifecycle, restoration, fixtures, comparison, and negative-path coverage | `yarn test:visual:unit` | PASS — 78/78 |
| Shared manifest replay contract and reviewer inventory shape | `yarn test:visual:replay` | PASS — 1/1 |
| Adaptive toolbar structural/product regressions | `yarn test:app --run --minWorkers=1 --maxWorkers=1 packages/excalidraw/components/adaptiveToolbar.test.tsx` | PASS — 7/7 |
| Real Library item DOM identity and accessible naming | `yarn test:app --run --minWorkers=1 --maxWorkers=1 packages/excalidraw/components/LibraryUnit.test.tsx` | PASS — 2/2 |
| Cached imperative API destruction during multi-editor unmount | `yarn test:app --run --minWorkers=1 --maxWorkers=1 packages/excalidraw/tests/packages/events.test.tsx` | PASS — 6/6 |
| Complete mounted input authority and toolbar shielding cleanup | `yarn test:app --run --minWorkers=1 --maxWorkers=1 packages/excalidraw/tests/interactivity.test.tsx -t "uses the complete mounted-editor pointer-aware activation authority|cleans phone toolbar shielding"` | PASS — 3/3, 80 skipped |
| Fresh full browser matrix, independent artifacts, physical actions, semantic/performance/cleanup gates | `VISUAL_RUN_ID=reviewer-r1-delta-20260814-2319 yarn test:visual:reviewer` (PowerShell environment equivalent; no role or scenario override) | FAIL as required — 19/20; only `multi-editor-isolation` failed |
| Diff whitespace | `git diff --check` | PASS |

One preliminary focused invocation used `--maxWorkers=1` without matching `--minWorkers=1`; Vitest rejected the conflicting pool bounds before collecting tests. The corrected exact commands above passed 18/18 and are the accepted package evidence. No test assertion was hidden or reclassified.

## Final state

- Review-cycle verdict: **NOT_CLEAN**.
- Open material findings: `VHR-R1-003` (Blocker).
- Resolved findings: `VHR-R1-001`, `002`, `004`, `005`, `006`, `007`, `008`, `009`.
- Tasks 10.3 and 10.4: intentionally not checked.
- Required next stage: round-2 non-reviewer fix at the multi-editor rendered-readiness seam, followed by another non-author delta re-review.
