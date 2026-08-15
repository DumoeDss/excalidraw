# Fix round 2: multi-editor rendered-scene readiness

Recorded on `2026-08-15` by the non-reviewer round-two fixer for `VHR-R1-003`.

## Outcome

`VHR-R1-003` is **IMPLEMENTED-OPEN**. The multi-editor lifecycle can no longer accept API scene identities as proof that the left canvas has painted. Initial setup, UPDATE, UNMOUNT survivor, RECREATE settle, and the final pre-capture gate now require a stable rendered-scene signature from the actual left static canvas.

This fixer does not close the finding. A non-author reviewer must repeat the affected and adjacent scenarios before the review cycle can become clean.

Final implementation source fingerprint over the runner's 46 ordinal-sorted implementation paths:

`10aeb221ea7aebfe319738908d442ae0233020f716d8ad134d94ce2f4d4748f0`

## Root cause

The prior lifecycle receipt read `getSceneElements*()` and stabilized root/API/scene/geometry facts. Those data become observable before the static canvas necessarily receives the corresponding draw. Static-scene rendering is animation-frame throttled with latest-argument scheduling shared by simultaneous editor renders, so the two initial editor commits can leave the left API with `visual-rectangle-01` while the left static bitmap remains blank. Two stable data snapshots therefore did not imply two stable painted frames.

The reviewer failure was exact evidence of this split: all four data-level left scene summaries contained one `visual-rectangle-01` rectangle, but the screenshot omitted the same `325×213` painted region and differed by 69,098 pixels.

## Focused implementation

- `excalidraw-app/visualRegressionHost.tsx`
  - Reads the actual `.excalidraw__canvas.static` bitmap for the left `visual-rectangle-01`.
  - Samples the inner 60 percent of the element in canvas-local coordinates, records canvas dimensions, sample bounds, matching pixels and ratio, and an RGBA pixel signature, and exposes a boolean paint-presence fact.
  - When the API scene is ready but the initial left paint is absent, reissues the unchanged scene at most three times and continues only on animation-frame observations. The overall initialization remains bounded by the existing five-second deadline.
  - Records the rendered facts in every lifecycle snapshot without replacing scene id/type, API, owner, geometry, focus, direction, theme, or profile facts.
- `scripts/visual-regression/actions.ts`
  - Requires the left rendered-scene fact in the initial, updated, unmounted-survivor, and restored assertions.
  - Replaces the data-only phase loop with a reusable bounded waiter that polls after observable animation frames and requires two identical, painted signatures.
  - Keeps all prior scene, API destruction, root identity, owner cleanup, geometry, focus, profile, direction, and trusted-control assertions.
- `scripts/visual-regression/runner.ts`
  - Repeats the rendered-scene waiter after ordinary action readiness and before crop, semantic queries, and screenshot capture.
  - Records a compact pre-capture receipt. A missing rendered signature fails at the semantic readiness stage rather than waiting for pixel comparison.
- `scripts/visual-regression/visual.unit.test.ts`
  - Adds rendered facts to the valid lifecycle model.
  - Simulates two data-ready but unpainted observations followed by two painted observations and proves capture/publication remain at zero until the painted signature stabilizes.
  - Rejects a data-ready lifecycle receipt whose rendered signature is absent.

No canonical/candidate file, tolerance, mask, loading budget, package entry, public API, or existing assertion was changed.

## Browser verification

Every browser run began from and returned to sticky-proxy health `sessions=21`, `managedTabs=0`. The proxy stayed running and no unmanaged tab was closed.

### Three consecutive final isolated runs

| Fixer run id | Scenario result | Pixel result | Rendered gate | Current SHA-256 | Canonical hash before/after |
| --- | --- | --- | --- | --- | --- |
| `fixer-r2-final-multi-01-20260815-0019` | 1/1 pass | 0 mismatches | paint present, ratio `1`, signature `5a41e4c5` | `2f8acc38fe7652b90895d85b8ff9225e6d09c6a393ace917039c2fb7e9a2d85a` | `311666a303148a5f3ccb1327c3fb56f4fc3f1ddf0aaf8b7af927fa12772d5830` unchanged |
| `fixer-r2-final-multi-02-20260815-0019` | 1/1 pass | 0 mismatches | paint present, ratio `1`, signature `5a41e4c5` | `2f8acc38fe7652b90895d85b8ff9225e6d09c6a393ace917039c2fb7e9a2d85a` | same unchanged hash |
| `fixer-r2-final-multi-03-20260815-0019` | 1/1 pass | 0 mismatches | paint present, ratio `1`, signature `5a41e4c5` | `78a291f372a8315bdadef1a89f767b14a578373e31fa9b006fbc3cd56152040f` | same unchanged hash |

The first two current files have harmless byte-level raster variation within the existing comparison policy; both record zero mismatches and no diff artifact. No comparison policy changed. The third current hash is byte-identical to canonical.

For all three runs:

- initial, UPDATE, UNMOUNT survivor, and RECREATE each retained the same left root/API, `visual-rectangle-01`/`rectangle` scene, `5a41e4c5` paint signature, matching ratio `1`, geometry `24,68,1008,808`, and left focus owner;
- semantic, cleanup, performance, console, and checker failures were zero;
- restoration, exact input restoration, target close, and target absence succeeded;
- each retained 1440×900 current PNG was opened separately at original resolution: the left purple rectangle was visible, both editor regions and owner markers were bounded, and no checker or lifecycle residue was visible.

Durable inventories:

- `evidence/fixer/run-fixer-r2-final-multi-01-20260815-0019.json`
- `evidence/fixer/run-fixer-r2-final-multi-02-20260815-0019.json`
- `evidence/fixer/run-fixer-r2-final-multi-03-20260815-0019.json`
- `scripts/visual-regression/results/fixer/fixer-r2-final-multi-01-20260815-0019/`
- `scripts/visual-regression/results/fixer/fixer-r2-final-multi-02-20260815-0019/`
- `scripts/visual-regression/results/fixer/fixer-r2-final-multi-03-20260815-0019/`

### Adjacency

`fixer-r2-adjacency-01-20260815-0017` verified the two source fixtures adjacent to the multi-editor host:

- `desktop-selected-rectangle`: pass, 0 mismatches, current hash `3aa963a21627d5bf7279fd3d124023121947136ce6e39bded50554e1ca751bc9`;
- `desktop-active-text`: pass, 0 mismatches, current hash `e8d8c3629d6ee0435a10ae6c6656720c3156b71dc02e3c7ecbc4e89d5cdf7397`.

Both original-resolution PNGs were opened separately. The selected rectangle, property surface, active text state, controls, and canvas bounds were correct with no checker or clipping.

One exploratory run, `fixer-r2-multi-01-20260815-0009`, deliberately failed closed before capture while the first sampler draft used document-offset coordinates against a canvas-local bitmap. Correcting the sampler to the renderer's canvas-local coordinate system produced the final evidence above. The failure demonstrated that a missing paint signature no longer reaches pixel comparison as a passing lifecycle receipt.

## Automated checks

- Focused lifecycle/render tests: `yarn test:visual:unit -t "multi-editor|delayed canvas paint|rendered signature"` — 5/5 pass.
- Complete visual unit suite: `yarn test:visual:unit` — 80/80 pass.
- API lifecycle adjacency: `yarn test:app --run --minWorkers=1 --maxWorkers=1 packages/excalidraw/tests/packages/events.test.tsx` — 6/6 pass.
- Root typecheck: `yarn test:typecheck` — pass.
- Exact Prettier and ESLint over the four changed source/test files — pass with zero warnings.
- `git diff --check` — pass; six changed source/report files strictly decode as UTF-8 without BOM, U+FFFD, or known mojibake signatures; nine final-run inventory/result JSON files parse; five retained current PNG signatures and SHA-256 associations pass; restricted-term scan is empty.

## Required next step

Resume the non-author reviewer for round-two delta review. The reviewer must treat fixer evidence only as a locator, run fresh reviewer-owned isolated repetitions plus the required adjacency/full matrix, personally inspect its own images, and explicitly disposition `VHR-R1-003`. Until then the finding remains **IMPLEMENTED-OPEN** and tasks 10.3/10.4 remain untouched.
