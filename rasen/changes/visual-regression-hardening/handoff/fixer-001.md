# Fixer 001 handoff

## Original intent

Repair `VHR-R1-001`, the blank-canvas routing false-pass. A scenario must fail unless a real reachable point belongs to the exact owning editor canvas, the browser delivers trusted physical input there, the exact editor consumes the same pointer-down through its public emitter, and all temporary state restores exactly. Keep the atomic finding open for independent reviewer disposition and do not promote contaminated images.

## Position

Atomic implementation, focused verification, Chrome evidence review, fingerprints, and the durable report are complete. `VHR-R1-001` is **IMPLEMENTED-OPEN** pending non-author review and integration.

Authoritative report:

`rasen/changes/visual-regression-hardening/evidence/fix-round-1/atomic-001/fix-report.md`

## Done / Remaining

Done:

- audited every retained line in the atomic seams of `actions.ts`, `proxy.ts`, `runner.ts`, and `visual.unit.test.ts`;
- corrected the final `actions.ts` Prettier drift without formatting unrelated files;
- passed 45/45 visual unit tests and exact four-file Prettier/ESLint;
- re-read the exact desktop, phone, large-surface, and recovery routing receipts;
- personally reopened all four retained evidence PNGs;
- confirmed proxy health `21 / 0`, zero visual/DevTools targets, and absence of all four recorded disposable targets;
- recomputed canonical, atomic, and full-source fingerprints;
- wrote the atomic report with explicit provenance and adjacency disclosures.

Remaining:

- original reviewer must re-review and may close only after independent reproduction;
- integration must resolve the red checker badge/detector mismatch and other findings, including `VHR-R1-003`;
- the current project build/type gate must be restored; it presently fails outside this atomic delta at `LibraryMenuSection.tsx:70`.

## Key decisions

- The accepted editor-consumption authority is `ExcalidrawImperativeAPI.onPointerDown`, correlated to the trusted page event by token, pointer id/type, coordinates, target ownership, and exact instance id.
- Receipt sequences are new probe-local counters and must advance exactly `0 -> 1`; static editor fields are not consumption evidence.
- Normal and phone scenarios require an exact canvas hit with no interactive or scene-element blocker. Only application recovery and a fully isolating modal can make routing non-applicable.
- All screenshots remain diagnostic because the red checker badge is visible while metadata says zero; none may be promoted.
- The full build failure and standalone harness type gaps are reported, not repaired across atomic ownership boundaries.

## Dead ends and gotchas

- A fixed-position click marker is rejected by the proxy because it has a null `offsetParent`.
- An absolute body marker is unsafe because the proxy calls `scrollIntoView`, which can move the intended coordinate.
- CDP delivery while Chrome is hidden/minimized produced no trustworthy events; `Page.bringToFront` alone was insufficient until the exact window was restored.
- `cursorButton` and `lastPointerDownWith` are cleanup state, not proof that the editor consumed the physical pointer-down.
- `fixer-001-multi-1` is not missing success evidence: it intentionally stopped at independent finding `VHR-R1-003` and emitted no acceptance inventory.
- A direct source-file `tsc` invocation is not the repository's canonical gate and exposes shared pre-existing harness strictness gaps. The ordered project gate is currently blocked earlier by another changed file.

## Eliminated hypotheses

- `elementFromPoint()` alone was sufficient — rejected because it proves geometry but not trusted delivery or editor consumption.
- A page-level trusted receipt was sufficient — rejected because the wrong editor instance could still own or consume the event.
- A non-default `cursorButton`/`lastPointerDownWith` transition proved consumption — rejected because those are mutable state fields rather than the exact public-emitter receipt.
- Top-level recovery or an isolating modal should be force-clicked through — rejected because those surfaces intentionally isolate or replace the background editor.
- Result status `fail` invalidated the routing evidence — rejected because the retained runs have empty semantic/cleanup failure arrays and fail later at pixel comparison; the visual contamination is separately disclosed.

## Working set

- `scripts/visual-regression/actions.ts`
- `scripts/visual-regression/proxy.ts`
- `scripts/visual-regression/runner.ts`
- `scripts/visual-regression/visual.unit.test.ts`
- `rasen/changes/visual-regression-hardening/evidence/fixer/run-fixer-001-{desktop-6,phone-1,large-1,recovery-2}.json`
- `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/*fixer-001*__evidence.png`
- `rasen/changes/visual-regression-hardening/evidence/fix-round-1/atomic-001/fix-report.md`

## Verification and fingerprints

- visual unit: 45/45 pass;
- four-file Prettier: pass;
- four-file ESLint: pass;
- strict UTF-8/no BOM/no replacement character/known mojibake: pass;
- proxy: connected, `sessions=21`, `managedTabs=0`, no owned helper targets;
- canonical baseline: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`;
- atomic four-path: `8b89d612b49d08d759593380bf016103c79a2ecbb50c7d05de25e07bdaa02f06`;
- full 32-source implementation: `3832730b255164c86fcbd72982a0bde02321f0d646bfae59507287e05e782522`.

## Process provenance

This resumed fixer briefly attempted to create a nested helper. The LEAD stopped it immediately, before helper output or edits were read or adopted. The final retained-line audit, commands, evidence inspection, hashes, and both durable documents are this fixer's independent work.

## Next action

Dispatch a fresh non-author reviewer against the atomic report and current four-path fingerprint. Require the reviewer to repeat an exact desktop and coarse-phone route, observe no proxy growth from its own starting count, and keep the finding open if any physical/page/editor/cleanup correlation is absent. Do not promote any current image while the visible checker badge remains unexplained.
