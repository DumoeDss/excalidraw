# Handoff: visual-regression-hardening fixer round 2

## Position

The round-two non-reviewer fix for `VHR-R1-003` is complete and remains **IMPLEMENTED-OPEN**. No reviewer disposition, tasks 10.3/10.4 edit, run-state write, commit, push, archive, spec sync, deployment, or merge was performed.

## What changed

- The multi-editor host now records an actual static-canvas rendered-scene signature for the left rectangle.
- Initial setup performs at most three unchanged-scene refreshes when data exists but paint is absent, then remains bounded by the five-second readiness deadline.
- UPDATE, UNMOUNT survivor, RECREATE, and final pre-capture readiness require two identical painted observations.
- Data-ready/unpainted receipts fail before capture; the delayed-render unit regression proves capture and publication do not occur before paint stabilizes.

Changed implementation/test files:

- `excalidraw-app/visualRegressionHost.tsx`
- `scripts/visual-regression/actions.ts`
- `scripts/visual-regression/runner.ts`
- `scripts/visual-regression/visual.unit.test.ts`

Fix evidence:

- `evidence/fix-round-2/fix-report.md`

## Root cause

The old lifecycle gate stabilized API scene identities, but simultaneous editor data commits can precede or supersede the corresponding animation-frame-throttled static-canvas draw. A positive `getSceneElements*()` receipt therefore did not prove that the left rectangle existed in the bitmap the runner was about to capture.

## Final evidence

- Final source fingerprint: `10aeb221ea7aebfe319738908d442ae0233020f716d8ad134d94ce2f4d4748f0` over 46 implementation paths.
- Canonical hash: `311666a303148a5f3ccb1327c3fb56f4fc3f1ddf0aaf8b7af927fa12772d5830`, unchanged before/after every accepted run.
- Three consecutive isolated fixer runs:
  - `fixer-r2-final-multi-01-20260815-0019` — pass, 0 mismatches;
  - `fixer-r2-final-multi-02-20260815-0019` — pass, 0 mismatches;
  - `fixer-r2-final-multi-03-20260815-0019` — pass, 0 mismatches.
- All four lifecycle phases in the final receipt: left `visual-rectangle-01`/`rectangle`, paint present, ratio `1`, signature `5a41e4c5`, stable root/API/geometry/focus.
- Adjacency run `fixer-r2-adjacency-01-20260815-0017`: selected rectangle and active text both pass with 0 mismatches.
- Every retained targeted current PNG from the accepted runs was opened individually at original resolution. The rectangle, two editor regions, owner markers, control rail, adjacent source fixtures, and bounds were correct; no checker or residue was visible.
- Visual unit 80/80, focused lifecycle/render 5/5, API lifecycle adjacency 6/6, root typecheck, exact Prettier, and exact ESLint pass.
- Final sticky proxy state: `sessions=21`, `managedTabs=0`; it was not restarted and no unmanaged tab was closed.

## Eliminated hypotheses

- The original 69,098-pixel failure was not a tolerance, mask, canonical, or comparator defect; the API/bitmap split reproduces the exact false-positive shape.
- Root/API/owner/scene stability and two generic animation frames do not prove static-canvas paint; the bitmap needs its own observable signature.
- The first sampler's document-offset mapping was invalid because static-canvas rendering uses canvas-local scene/scroll/zoom coordinates. The corrected sampler targets the canonical rectangle region and reports ratio `1` in every accepted phase.
- No product-wide renderer or public API change is required for this focused harness repair; a bounded unchanged-scene refresh after competing initial mounts is sufficient, and the final pre-capture gate remains fail-closed.

## Next action

Dispatch the original non-author reviewer for the round-two delta. It must use fresh reviewer run ids/output roots, repeat isolated multi-editor attempts and required adjacency/full-matrix coverage, inspect its own PNGs, keep the canonical hash unchanged, and issue an explicit `RESOLVED` or `OPEN` disposition for `VHR-R1-003`. Fixer evidence cannot close the finding.
