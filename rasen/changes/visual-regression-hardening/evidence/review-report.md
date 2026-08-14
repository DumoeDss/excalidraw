# Independent review report

## Verdict

**FAIL — 6 Blockers and 3 Majors.** The independent Chrome run completed all 20 scenarios and the runner labelled all 20 `pass`, but that mechanical result is not a clean review verdict. Several required acceptance paths were not executed, and the current pass logic accepts those omissions. One committed recovery baseline also contains a visible product regression.

Review role: non-author reviewer. This pass did not edit product or harness implementation, did not promote or modify a canonical baseline, and did not reuse implementer captures as reviewer proof.

### Provenance clarification

During review resumption, this leaf reviewer mistakenly spawned two nested read-only audit workers, including `review_artifact_audit`, before recognizing the flat-orchestration boundary and immediately interrupting them. `review_artifact_audit` returned no conclusion and, consistent with its explicit read-only instruction and the durable artifact check, wrote no artifact. No output or inference from either unauthorized nested worker was received or adopted. This report and its inspection inventory are based solely on this reviewer's own 20-scenario run, personal inspection of all 20 reviewer-owned images, direct reads of the run/result artifacts, and direct source/spec analysis.

## Reviewed evidence

- Reviewed implementation fingerprint: `c78e6b921d570d448e881adb693bb12390368ad638d90609961bb5007588facb` (independently reproduced before the reviewer run; the verify inventory itself records `sourceFingerprint: null`, so the report retains the reviewed value explicitly).
- Reviewer run: `reviewer-matrix-20260814-1`.
- Reviewer inventory: `evidence/reviewer/run-reviewer-matrix-20260814-1.json`.
- Personal image inspection: `evidence/reviewer/inspection-reviewer-matrix-20260814-1.json`.
- Reviewer captures: `evidence/reviewer/screenshots/` (20 reviewer-owned PNGs, one per manifest scenario).
- Runner results: `scripts/visual-regression/results/reviewer/reviewer-matrix-20260814-1/`.
- Canonical directory hash before and after: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`.
- Fresh disposable targets: 20 created, all absent after the run. Inventory reports `targetsClean: true` and `proxyHealthy: true`; the sticky proxy remained connected with zero sessions and zero managed tabs after inspection.
- Runtime gates: zero cleanup failures, zero error-level console events, and zero checker overlays across the inventory.
- Focused automated checks observed for the reviewed fingerprint: visual unit 30/30; toolbar/responsive/lifecycle 54/54.

The budgeted short-landscape scenario used one warm-up and three accepted samples. Accepted medians were CLS `0`, long-task duration `0 ms`, interaction duration `41.7 ms`, harness duration `1668.49 ms`, resource count `250`, and transfer size `67,500 bytes`. No declared performance limit was exceeded.

## Acceptance coverage map

```text
manifest (20 scenarios)
  -> fresh reviewer targets and role-owned captures .......... observed: 20/20
  -> bounded pixel comparison ............................... observed: 20 runner passes
  -> semantic/readiness/console/checker checks .............. observed, but incomplete
  -> trusted physical interaction sequences ................. missing required branches
  -> deterministic application fixtures ..................... declared, mostly not consumed
  -> exact cleanup and evidence-role enforcement ............. asserted by labels, not proved
  -> personal visual inspection .............................. observed: 20/20
  -> independent severity verdict ............................ FAIL: findings below
```

## Findings

### Blocker — blank-canvas routing can fail while the scenario passes

Classification: **harness false-pass**.

The runner calls `assertBlankShellRoutesToCanvas()` for every scenario but only fails when `neutral` is false; it records `canvas` without enforcing it (`scripts/visual-regression/runner.ts:592-600`, `scripts/visual-regression/runner.ts:729-734`). The helper performs only `elementFromPoint` and never dispatches trusted outside input or verifies resulting editor behavior (`scripts/visual-regression/actions.ts:182-199`). Eight accepted reviewer scenarios record `blankCanvasRouting: false`: `desktop-ai`, `desktop-share`, `phone-light-library`, `phone-dark-landscape`, `embed-dark-help`, `multi-editor-isolation`, `narrow-recoverable-error`, and `top-level-recovery`.

This contradicts the required trusted empty-shell behavior in `spec.md:211-226`. A scenario must fail when the physical target is not the canvas, and the browser path must pair the point observation with a trusted coordinate action and a resulting editor-behavior assertion.

### Blocker — the toolbar pass does not execute the required interaction sequence

Classification: **unsupported/inconclusive acceptance evidence**.

`exerciseFinalToolbarRow()` samples left, center, and right with `elementFromPoint`, but executes a single generic selector click, closes by activating the final row, reopens the menu, and repeats only static hit observations (`scripts/visual-regression/actions.ts:106-179`). It does not trusted-click representative left/center/right coordinates, prove that adjacent actions are shielded, close through Escape, close through an outside click, verify focus return, or exercise unmount cleanup. The manifest exposes only open plus exercise in the short-phone case (`scripts/visual-regression/scenarios.ts:414-457`); the separate close action adapters exist but are not included in that scenario (`excalidraw-app/visualRegressionHost.tsx:487-498`).

This is materially below `spec.md:211-221` and `design.md:137`. The stable open screenshot is legitimate visual evidence, but it cannot certify the interaction contract.

### Blocker — multi-editor isolation is accepted from a static initial frame

Classification: **harness false-pass**.

The scenario declares no actions and asserts only initial count/theme/direction plus fixture bounds (`scripts/visual-regression/scenarios.ts:487-517`). The fixture mounts two editors but never updates one instance, verifies that the other stays unchanged, unmounts an instance, or checks the survivor's focus, surface ownership, responsive profile, and geometry (`excalidraw-app/visualRegressionHost.tsx:166-210`).

The screenshot proves that two initially different instances can render side by side. It does not prove the update/unmount sequence required by `spec.md:151-154`; the runner must exercise and assert that lifecycle before this scenario can pass.

### Blocker — coarse/touch input declarations are echoed rather than applied and proved

Classification: **harness false-pass**.

Phone scenarios declare `pointer: coarse`, `hover: false`, `touchPoints: 1`, and `acceptance: mounted-editor` (`scripts/visual-regression/scenarios.ts:23-34`, `scripts/visual-regression/scenarios.ts:387-420`). The host accepts those fields but only returns `request.input.acceptance` as metadata (`excalidraw-app/visualRegressionHost.tsx:10-25`, `excalidraw-app/visualRegressionHost.tsx:450-460`). No browser/device capability override or mounted-editor input-contract proof consumes pointer, hover, or touch-point values.

The coarse-phone screenshots therefore cannot be accepted under `spec.md:24`, `spec.md:175-178`, and `spec.md:211-231`. The runner must apply and verify the media/input state, or link the scenario to a complete mounted-editor acceptance result that preserves the React/editor pointer contract.

### Blocker — application scenarios do not consume the fixed fixture source of truth

Classification: **harness false-pass**.

`createApplicationFixtures()` declares local Library, AI, sharing, collaboration, loading, recovery, and multi-editor data (`scripts/visual-regression/fixtures.ts:78-111`), but production scenario setup never imports or consumes it; repository references outside its definition are unit-test-only. Library setup changes editor state and opens the real sidebar without seeding the declared fixed Library item (`excalidraw-app/visualRegressionHost.tsx:340-404`, `excalidraw-app/visualRegressionHost.tsx:527-534`). The reviewer images for `desktop-library`, `tablet-dark-library`, and `phone-light-library` visibly contain the empty-library state despite manifest names/tags promising Library content (`scripts/visual-regression/scenarios.ts:260-278`, `scripts/visual-regression/scenarios.ts:341-364`, `scripts/visual-regression/scenarios.ts:386-411`).

This violates the fixed local application-content requirement in `spec.md:22-29` and the representative Library-content matrix in `spec.md:115-134`. Connect the named fixture adapter to real application state and assert an identifiable local item rather than accepting an empty sidebar.

### Blocker — reviewer artifact separation is not enforced on the runtime write path

Classification: **unsupported/inconclusive evidence boundary**.

`assertRoleMayWrite()` contains the intended reviewer/implementer and canonical-path checks (`scripts/visual-regression/paths.ts:45-65`), but the runner's actual screenshot, current, report, candidate, and inventory writes do not call it (`scripts/visual-regression/runner.ts:600-627`, `scripts/visual-regression/runner.ts:700-744`, `scripts/visual-regression/runner.ts:795-840`). Verify mode also accepts `VISUAL_ROLE` through an unchecked TypeScript cast (`scripts/visual-regression/visual.verify.test.ts:7-14`). A reviewer process can claim `implementer` and write into implementer-owned result/evidence paths; the present run was self-disciplined, but the harness does not make the forbidden attempt fail.

That fails the evidence-boundary behavior required by `spec.md:305-322`. Invoke the guard at every artifact write boundary and reject unknown or role-incompatible runtime values before opening targets.

### Major — the committed top-level recovery baseline hides its heading

Classification: **product regression normalized by the baseline**.

The reviewer-owned recovery image shows body copy, link, and primary action, but the expected heading is visually absent. The fixture card explicitly sets a white background while its `h1` has no foreground color (`excalidraw-app/visualRegressionHost.tsx:166-176`), allowing it to inherit the application's light foreground and render white on white. The scenario asserts only fixture-root visibility and button focus (`scripts/visual-regression/scenarios.ts:565-590`), so neither accessible heading/name nor heading contrast fails and the same bad image is canonical.

This violates readable recovery content and representative contrast requirements in `spec.md:156-183`. Fix the fixture-owned foreground, add a semantic heading/contrast assertion, and regenerate the baseline only through inspected candidate promotion.

### Major — cleanup success is reported before exact restoration is verified

Classification: **unsupported/inconclusive cleanup evidence**.

The result is constructed inside the run phase with `debuggerRestored: true` before lifecycle cleanup executes (`scripts/visual-regression/runner.ts:705-737`). Cleanup invokes the host restore and records thrown failures, but never re-queries debugger/live canvas, storage, locale, media/input state, safe-area values, injected styles, console state, or focus after restoration (`scripts/visual-regression/runner.ts:521-527`). The host also marks pre-existing transient nodes with `data-visual-prior-transient` and registers no removal for that marker (`excalidraw-app/visualRegressionHost.tsx:441-447`).

The zero cleanup-failure count is useful but does not prove the exact restoration contract in `spec.md:46-58` and `spec.md:281-298`. Derive restoration fields from post-restore observations and fail on residual control styles, markers, or altered global state.

### Major — AI/share acceptance bypasses visible product actions

Classification: **unsupported/inconclusive application-workflow evidence**.

The manifest presents named `open-ai` and `open-share` interactions (`scripts/visual-regression/scenarios.ts:280-318`), but the host opens AI through direct internal app state and Share through direct atom mutation, returning `type: none` for both (`excalidraw-app/visualRegressionHost.tsx:535-543`). No trusted click or keyboard input activates a visible product control, so the images establish only the final surfaces, not their claimed acceptance workflows.

This conflicts with the real visible acceptance-action policy in `design.md:74`, `design.md:178`, and the shared manifest interaction contract in `spec.md:3-10`. Seed only prerequisites, then use a trusted visible control and assert the resulting owned state.

## Image inventory and classification summary

The machine-readable inspection contains exact filenames, SHA-256 hashes, dimensions, classifications, and three distinct observations for each of the 20 reviewer captures.

- Product regression: 1 (`top-level-recovery`).
- Harness false-pass: 5 captured scenarios (`desktop-library`, `tablet-dark-library`, `phone-light-library`, `phone-dark-landscape`, `multi-editor-isolation`), with blank-routing false values also present in eight accepted results.
- Unsupported/inconclusive evidence: 3 captured scenarios (`desktop-ai`, `desktop-share`, `desktop-toolbar-group`) plus cross-cutting role and cleanup gaps.
- Deterministic harness/environment drift within policy: 2 (`embed-dark-help`; `narrow-loading`, where 20 pixels in an `11×9` spinner region remained under the bounded tolerance).
- Legitimate intentional visual state with no image-level finding: 9.

No image was classified as an unexplained product pixel mismatch. Pixel stability does not close the findings because most concern acceptance paths that the current runner never executes.

## Standards and specification disposition

| Area | Evidence | Disposition |
| --- | --- | --- |
| Fresh reviewer ownership and canonical read-only behavior | 20 fresh targets; reviewer paths; unchanged canonical hash | Pass for this run |
| One reviewer image and personal inspection per required scenario | 20 PNGs and 20 machine-readable inspection entries | Pass |
| Pixel comparison and bounded drift | 20 runner passes; two non-identical hashes remained within policy | Pass, subject to semantic findings |
| Console, checker, performance, and target cleanup | zero runtime errors; performance medians within limits; targets absent | Mechanical pass; exact state restoration remains inconclusive |
| Physical blank-canvas and toolbar interactions | required trusted branches omitted | Fail |
| Coarse/touch acceptance | declared profile not applied or proved | Fail |
| Multi-editor update/unmount isolation | static initial render only | Fail |
| Representative local application fixtures and visible actions | fixture adapter disconnected; Library empty; AI/share direct-state | Fail |
| Accessibility/readability | recovery heading invisible and unasserted | Fail |
| Runtime evidence-role write protection | guard exists but is unused | Fail |

## Required next stage

Dispatch a non-reviewer fixer under tasks 10.1-10.2. Each finding needs the smallest owning harness or fixture fix plus a focused regression. Then a non-author reviewer must repeat every affected scenario and adjacency risk with fresh reviewer-owned captures and issue finding-by-finding dispositions. Do not widen tolerances, weaken assertions, or promote new baselines until the affected semantic and interaction paths are green.
