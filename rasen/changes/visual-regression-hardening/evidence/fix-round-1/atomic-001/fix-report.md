# VHR-R1-001 atomic fix report

## Status

**IMPLEMENTED AND ATOMICALLY EVIDENCED — OPEN pending non-author reviewer disposition and integration.** Blank-shell routing now fails unless a reachable point belongs to the exact interactive canvas of the exact owning editor, is free of interactive and scene-element blockers, receives browser-trusted physical input, and produces a correlated receipt from that editor's `ExcalidrawImperativeAPI.onPointerDown` emitter. The runner records the complete routing and cleanup evidence before any scenario actions.

This report does not claim that the retained scenarios are wholly green. Their result status remains `fail` because of existing pixel drift and adjacency issues, and all four retained product screenshots visibly contain the red checker badge even though the current detector metadata says zero. `VHR-R1-001` remains **OPEN** until the original reviewer independently repeats the delta review and integration resolves the checker/detector mismatch and the other open findings.

## Provenance and independent retained-line audit

The atomic source seam is:

1. `scripts/visual-regression/actions.ts`
   - searches 49 physical points inside the intersection of the exact canvas, its owner, and the viewport;
   - requires `elementFromPoint()` to return that canvas exactly, rejects interactive blockers, and rejects a point occupied by a scene element;
   - binds temporary target/owner markers to exactly one canvas and one owner and verifies that `window.h.app.api.id` and `interactiveCanvas` match the declared editor instance;
   - prepares fresh page and editor receipt sequences at zero, activates the exact browser target, dispatches a real coordinate click, and accepts only the exact `0 -> 1` page/editor sequences with `isTrusted: true`;
   - correlates token, pointer id/type, client coordinates, target/owner ownership, exact editor instance id, emitter identity, active tool, and finite editor scene point;
   - restores selection/group state, open surfaces, pointer state, prior focus, and both temporary markers, then re-queries all seven cleanup gates.
2. `scripts/visual-regression/proxy.ts`
   - exact target activation combines `Page.bringToFront` with the existing exact-title Windows window lookup;
   - `ShowWindowAsync(..., 9)` restores a minimized Chrome window before foreground/focus verification;
   - the temporary title is restored in `finally`.
3. `scripts/visual-regression/runner.ts`
   - executes blank-canvas routing after input/readiness acceptance and before any scenario action;
   - writes the complete `blankRouting` payload to the result JSON and exposes the applicable/canvas facts in the result environment.
4. `scripts/visual-regression/visual.unit.test.ts`
   - covers unreachable canvas points, explicit recovery/modal exclusions, exact foreground activation, wrong owner and editor instance, untrusted page/editor receipts, absent editor consumption, unchanged receipt sequences, correlated positives, and exact cleanup rejection.

The explicit exclusions are narrow: application-owned top-level recovery, and a visible modal dialog that isolates the background after no physical blank canvas candidate can be reached. A missing canvas point without one of those exact exclusions is a hard failure.

During this resumption the fixer briefly attempted to create a nested helper. The LEAD immediately stopped it before any helper output or edit was read or adopted. Every retained source line in the atomic seam, every evidence statement below, and every final command result was independently re-read or re-run by this fixer. No nested conclusion contributes to this report.

## Focused automated and static checks

- `yarn test:visual:unit` — **PASS, 45/45** after the final formatting change.
- `.\node_modules\.bin\prettier.cmd --check scripts/visual-regression/actions.ts scripts/visual-regression/proxy.ts scripts/visual-regression/runner.ts scripts/visual-regression/visual.unit.test.ts` — **PASS**. Only `actions.ts` needed a final exact-file formatting pass.
- `.\node_modules\.bin\eslint.cmd scripts/visual-regression/actions.ts scripts/visual-regression/proxy.ts scripts/visual-regression/runner.ts scripts/visual-regression/visual.unit.test.ts` — **PASS, zero errors/warnings**.
- Strict UTF-8 decoding of the four source files — **PASS**; no BOM, `U+FFFD`, or known mojibake signature.
- The project build/type gate is not green for an unrelated current-tree reason: `yarn build:excalidraw` stops at `packages/excalidraw/components/LibraryMenuSection.tsx:70:27` (`LibraryItem` union member has no `name`). Per the repository's required ordering, `yarn test:typecheck` was not run after the failed build. A direct four-file `tsc` diagnostic is not a canonical project gate and also exposes pre-existing strict gaps in the shared unconfigured visual harness, including `performance.ts`, `proxy.ts`, `runner.ts`, and the unit test. This atomic report does not conceal or repair those cross-unit issues; integration must restore the build/type gate before closing the round.

## Targeted Chrome evidence

The existing sticky proxy on port 3456 was reused and never restarted. The three applicable retained runs have the same core receipt contract:

- physical target and owner counts are exactly one;
- the physical hit is the exact `CANVAS`;
- page and editor receipts both advance `0 -> 1`;
- both receipts are `pointerdown`, `isTrusted: true`, exact-target and owner-owned;
- pointer id/type and client coordinates correlate;
- the editor receipt names the exact instance and `ExcalidrawImperativeAPI.onPointerDown`;
- cleanup reports `selection`, `surfaces`, `pointerState`, `focus`, `targetMarker`, `ownerMarker`, and aggregate `restored` as true.

### Desktop collaboration

Run: `fixer-001-desktop-6`.

- 49 candidates searched; accepted point `(1232.64, 768.24)` in editor `8z3s3QXM1_etrNVbGIMZg`.
- Page/editor pointer id `1`, type `mouse`, coordinates `(1232.625, 768.234375)`, active tool `selection`.
- Blank routing, semantic assertions, and cleanup passed. The scenario result is still `fail`: 22,565 changed pixels and a visible red checker badge; semantic and cleanup failure arrays are empty.
- Disposable target `4CC7C13BCCAB69DA04AFC14761A694B2` is absent.

### Phone Library

Run: `fixer-001-phone-1`.

- Real coarse input acceptance is present before this gate; 49 candidates searched; accepted point `(316.74, 692.56)` in editor `e_0C9pGMgehSXPElamg9G`.
- Page/editor pointer id `1`, type `mouse`, coordinates `(316.734375, 692.546875)`, active tool `selection`.
- Blank routing, semantic assertions, and cleanup passed. The populated Library is visible, but the scenario remains `fail` with 33,540 changed pixels and the red checker badge; semantic and cleanup failure arrays are empty.
- Disposable target `03A566BD11F8EB19780EBC81902ED8A2` is absent.

### Large Help surface

Run: `fixer-001-large-1`.

- Routing passed before the Help-opening action: 49 candidates searched; accepted point `(594.56, 407.04)` in editor `qr6gkqesdFrRzbBYngflQ`.
- Page/editor pointer id `1`, type `mouse`, coordinates `(594.546875, 407.03125)`, active tool `selection`.
- The later Help surface is visible. The scenario remains `fail` only at the current comparison: 3,004 changed pixels, bounded to the lower-left checker region; semantic and cleanup failure arrays are empty.
- Disposable target `8AC3A1C4FEB78DAD20774D79AB3972C9` is absent.

### Recoverable error

Run: `fixer-001-recovery-2`.

- Routing is explicitly non-applicable with reason `modal isolation excludes background editor routing` after all 49 candidates are unavailable and the visible dialog owns the hit.
- No trusted background click is dispatched. This is not a pass inferred from missing evidence; it is the accepted isolating-modal branch.
- The error surface is visible and the scenario has empty semantic/cleanup failure arrays, but it remains `fail` at 3,006 changed pixels in the visible checker region.
- Disposable target `5E329E3F3CACD0263A53557BDF0B16F8` is absent.

### Multi-editor adjacency

The narrow diagnostic `fixer-001-multi-1` passed the blank-routing gate and then stopped at the independent `VHR-R1-003` update/unmount isolation finding. It emitted no retained run inventory or acceptance screenshot and is not represented as scenario success. The sticky proxy and owned-target query remained clean after that stop.

## Personal image inspection

The four retained evidence PNGs were opened at original resolution during this final pass:

| Run | Dimensions | Visible state | Disposition |
| --- | --: | --- | --- |
| `fixer-001-desktop-6` | 1440x900 | dark editor shell, collaboration avatar/state, bottom toolbar | routing evidence retained; red checker badge visible; not promotable |
| `fixer-001-phone-1` | 375x812 | populated phone Library surface and browse action | routing evidence retained; red checker badge visible; not promotable |
| `fixer-001-large-1` | 640x480 | dark RTL Help large surface | routing-before-action evidence retained; red checker badge visible; not promotable |
| `fixer-001-recovery-2` | 375x812 | isolated recoverable-error dialog | exclusion evidence retained; red checker badge visible; not promotable |

The metadata for these results says `checkerOverlays: 0`, which conflicts with the visible images. This atomic fix did not alter the checker detector, comparison policy, masks, candidates, or canonical baselines.

## Proxy lifecycle, fingerprints, and baseline governance

- Final proxy health: connected, `sessions=21`, `managedTabs=0`, Chrome port 9222.
- Fresh target enumeration contains zero visual-title/URL targets and zero DevTools targets; all four recorded disposable ids are absent.
- Canonical baseline directory hash over 40 files: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188` — unchanged.
- Atomic four-path fingerprint, sorted `path + NUL + bytes + NUL`: `8b89d612b49d08d759593380bf016103c79a2ecbb50c7d05de25e07bdaa02f06`.
- Full implementation-source fingerprint over the runner's 32 current allowed sources: `3832730b255164c86fcbd72982a0bde02321f0d646bfae59507287e05e782522`.
- No update mode, promotion, baseline write, tolerance/mask change, task/run-state edit, commit, push, archive, or spec sync occurred.

## Reviewer and integration remainder

The non-author reviewer must independently verify the atomic delta and repeat at least one normal desktop and one coarse phone route from a fresh target. The reviewer must require exact physical ownership, correlated page/editor receipts, exact cleanup, and no proxy growth from the observed starting count. The integration owner must separately resolve `VHR-R1-003`, the checker badge/detector mismatch, the current external build/type failure, and the remaining open findings before any whole-matrix green or baseline promotion claim.

## Durable findings

1. Blank-canvas evidence requires three correlated authorities: the physical hit target, the browser-trusted page receipt, and the exact editor instance's public pointer-down emitter receipt.
2. Exact target activation on Windows needs both CDP foregrounding and restoration/activation of the exact title-marked Chrome window; hidden or minimized delivery is not evidence.
3. A semantically clean scenario may still be visually contaminated; retained screenshots and comparison status must be inspected independently of checker detector metadata.

`VHR-R1-001` remains **OPEN pending original reviewer disposition and integration**.
