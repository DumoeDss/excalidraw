# Handoff: visual-regression-hardening — fixer integration 1

## Position

Round-one fixer integration is complete for tasks 10.1 and 10.2. All nine reviewer findings have focused implementations and integrated evidence, but every finding remains **OPEN** for non-author disposition. Tasks 10.3, 10.4, and all 11.x work are intentionally untouched.

Do not treat the successful fixer matrix as reviewer closure. Do not commit, push, archive, sync specs, edit `.rasen/**`, restart the sticky proxy, close foreign tabs, or reuse fixer images as reviewer-owned proof.

## Authoritative state

- Source fingerprint: `70737b62e062eb3269a9d266c079576b79147caf9ba3275a13230f20f35509ad` over 46 allowed paths.
- Fix report: `evidence/fix-round-1/fix-report.md`.
- Candidate run: `evidence/fixer/run-fixer-integration-r1-full20-update-26.json` — 20/20 pass.
- Inspection: `evidence/fix-round-1/inspection-fixer-integration-r1-full20-update-26.json` — all 20 PNGs opened individually at original resolution, 20 hashes, 60 observations.
- Final verify: `evidence/fixer/run-fixer-integration-r1-full20-verify-27.json` — 20/20 pass.
- Canonical directory hash: `311666a303148a5f3ccb1327c3fb56f4fc3f1ddf0aaf8b7af927fa12772d5830`, unchanged during VERIFY-27.
- Final proxy health: `sessions=21`, `managedTabs=0`, Chrome port 9222.

## Important integration diagnosis

Historical VERIFY-24 passed 19/20 but lost the multi-editor left rectangle: 69,098 pixels (`5.3316358%`) differed while every non-pixel gate passed. Initialization had captured an empty scene before blank-routing settled, then faithfully restored the bad snapshot.

The final repair waits for exact initial scene IDs/types and carries scene summaries through stability and lifecycle assertions. Left `visual-rectangle-01` survives initial/update/unmount/restored; right `visual-text-01` exists initially and after update, and its restored scene equals its initial scene. Two unit regressions reject empty initialization and survivor loss. Isolated run 25 and full runs 26/27 prove the repaired path; the final current image visibly contains the left rectangle.

## Verification summary

- Visual unit: 78/78.
- Visual replay: 1/1.
- Final full matrix: 20/20 with zero semantic, cleanup, performance, console, checker, restoration, input-restoration, close, or enumeration failures.
- Focused package delta: 18/18 across adaptive toolbar, Library unit, events/API lifecycle, and the three changed interactivity cases.
- Typecheck and exact final-source Prettier/ESLint: pass.
- UTF-8: 109 files; JSON parse: 65; PNG signature: 80; hash associations: 60; all pass.
- `git diff --check`, source scope, and canonical inventory/residue audits: pass.

Vitest's broad four-file collection twice hit module-fetch infrastructure timeouts before executing the affected large suite. The successful evidence uses one worker and the exact changed interactivity names; details are in the fix report. Do not reinterpret the 0-test collection failures as product assertions.

## Browser concurrency constraints

Shared-browser work was serialized around foreign managed targets. Runs began only after the LEAD reported `/health` at `21 / 0` and returned to the same state. An ordinary unmanaged `localhost:3001` user page remains open and must not be closed. The sticky proxy must remain running.

## Eliminated hypotheses

- The VERIFY-24 rectangle loss was not a tolerance, mask, or comparator problem; exact scene evidence identified premature empty initialization.
- Successful root/API/owner readiness did not imply scene readiness; scene identities and types are now explicit prerequisites.
- The loading spinner edge variance is bounded raster timing, not a semantic or cleanup regression; its final ratio is below the existing unchanged budget.
- Multi-file package 0-test failures were Vitest worker module-fetch timeouts; the same changed tests pass when collected in the focused single-worker shape.

## Next action

Dispatch the original or another non-author reviewer for tasks 10.3 and 10.4. The reviewer must use fresh reviewer-owned targets, results, and inspected images; repeat each affected scenario and adjacency risk; compare the exact trusted-action, fixture, role-boundary, restoration, input, lifecycle, and scene facts; and disposition all nine findings individually. Keep any finding open if its required fact is absent. Only after that independent gate may final 11.x audits or local delivery proceed.
