# VHR-R1-007 atomic fix report

## Status

**IMPLEMENTED AND ATOMICALLY EVIDENCED — OPEN pending non-author reviewer disposition and inspected baseline integration.** The recovery heading is visibly readable, names its top-level owner through an exact `aria-labelledby` relationship, and passes a computed 4.5:1 contrast gate. The targeted verify run correctly remains red only because the canonical image still encodes the invisible heading. This fixer did not update or promote a baseline.

## Provenance and retained-delta audit

This fixer independently audited the review report, proposal/design/spec, recovery fixture, manifest, semantic evaluator, focused tests, current shared-tree delta, old canonical image, and fresh browser output. No prior image or self-report was accepted as evidence for this finding.

The shared tree already retained an unreviewed partial fix before this atomic pass: the fixture card and heading explicitly used `#1b1b1f` on `#fff`, while the manifest contained heading role/name and contrast assertions. This pass verified that retained foreground/background fix against computed browser values, then completed the missing enforcement chain:

- the semantic host resolves the target's `aria-labelledby` ids to an accessible name and records the relationship;
- the semantic evaluator fails an incorrect or missing `aria-labelledby` relationship;
- the top-level `main` must have role `main`, exact name `The editor can be reopened`, exact relationship `visual-recovery-heading`, visibility, and ownership outside the editor;
- the `h1` must be visible with role `heading` and the exact name;
- the heading's computed foreground/background ratio must be at least 4.5.

Top-level ownership was preserved. The fixture remains a dedicated application-owned root outside `.excalidraw-container`; no editor context, public API, or product runtime contract was added.

## Exact relevant paths

- `excalidraw-app/visualRegressionHost.tsx`
- `scripts/visual-regression/runner.ts`
- `scripts/visual-regression/scenarios.ts`
- `scripts/visual-regression/visual.unit.test.ts`

The path-content delta fingerprint over those four UTF-8 files, using sorted `path + NUL + bytes + NUL`, is `d78007ac940194db947c512df7231f775674a933f7fda7d32b59cd2fd82efa85`. Because these harness files are shared untracked work product, this fingerprint intentionally covers the complete current file contents, including the independently audited retained partial fix; it does not claim unrelated concurrent hunks as this fixer's authorship.

The full implementation source fingerprint supplied to the authoritative browser command was `167155d17403a7a19e004ac22da6928fa1759be60c16d0be70e9c08d33aaea05` over 32 allowed current implementation sources.

## Focused tests and static checks

- `yarn test:visual:unit` — PASS, 34/34.
- Positive coverage retains exact relationship/name/role and a passing computed contrast contract.
- Negative coverage proves the semantic gate fails when `aria-labelledby` is missing, the heading is missing, the role is missing, the accessible name is missing or wrong, or the computed ratio is 1:1.
- Focused Prettier check over the four paths — PASS.
- Focused ESLint — 0 errors; five retained warnings are outside this atomic delta or pre-existing in the shared harness files.
- `git diff --check` — PASS.
- Strict UTF-8 decode — PASS for all four paths; no BOM or replacement character.

The repository-wide `yarn prettier --check ...` wrapper was not used as a focused verdict because its package script expands the entire repository and encounters an unrelated Chrome profile JSON-lines file. Direct Prettier over the exact four paths passed.

## Targeted fixer Chrome evidence

- Authoritative run id: `fixer-007-recovery-1`
- Role: `fixer`
- Scenario filter: `top-level-recovery`
- PowerShell command: `$env:VISUAL_SCENARIOS='top-level-recovery'; $env:VISUAL_ROLE='fixer'; $env:VISUAL_RUN_ID='fixer-007-recovery-1'; $env:VISUAL_SOURCE_FINGERPRINT='167155d17403a7a19e004ac22da6928fa1759be60c16d0be70e9c08d33aaea05'; yarn test:visual`

One preliminary duplicate invocation of the same single scenario occurred while establishing provenance. It used fresh target `9A3E8ECFCA17C91F1D1C5A1CBEDFCADC`, no source-fingerprint environment value, and therefore produced a verify inventory with `sourceFingerprint: null`. It changed no baseline and its result, inventory, and image were removed after the authoritative run. It is not acceptance evidence. This report retains exactly one authoritative fixer run and discloses the preliminary target rather than hiding tool churn.

Fresh disposable target: `A42735CB8F25B02146249EE4F51C1986`. It was absent after the run. Final proxy health: connected, `sessions=0`, `managedTabs=0`; the sticky proxy remained running.

Authoritative artifacts:

- Result: `scripts/visual-regression/results/fixer/fixer-007-recovery-1/top-level-recovery__640x480__dpr1__light__ltr__top-level-recovery__fixer__fixer-007-recovery-1__result.json`
- Inventory: `rasen/changes/visual-regression-hardening/evidence/fixer/run-fixer-007-recovery-1.json`
- Inspected image: `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/top-level-recovery__640x480__dpr1__light__ltr__top-level-recovery__fixer__fixer-007-recovery-1__evidence.png`
- Current image hash: `5a391efc6c5f40120182cb00960aa751383a196c0218505b3876e8d1f562e4e8`
- Old canonical hash: `8c8f09a5949c5b94f4dd4519d626176cabfe34b32e656589d1e64e3290d1b6cf`
- Diff hash: `efd3b124c0fc4dca332c85a02a13602b8f134d54132b1962b93982fc70fb34d7`
- Expected mismatch: 8,118 pixels, ratio `0.02642578125`, bounds `x=16, y=140, width=365, height=276`.
- Canonical directory hash before/after: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188` — unchanged.

Semantic observations:

- owner: visible; role `main`; exact name `The editor can be reopened`; `aria-labelledby=visual-recovery-heading`; `independentOfEditor=true`;
- heading: visible; role `heading`; exact name `The editor can be reopened`;
- heading computed colors: `rgb(27, 27, 31)` on `rgb(255, 255, 255)`;
- heading computed contrast: `17.1686267287442:1`, above 4.5;
- semantic failures: none;
- cleanup failures: none; restoration verified; debugger restored; console errors 0; checker overlays 0.

Personal inspection: the fresh 640×480 image visibly shows the complete two-line heading in a strong dark foreground above readable recovery copy, the details link, and the focused primary action. The card is fully bounded. The old canonical image was also personally inspected and visibly omits the heading, confirming that the mismatch is the intended repair rather than nondeterministic drift.

## Blank-canvas applicability and integration remainder

`blankCanvasRoutingApplicable` is explicitly `false` for this scenario because the application-owned top-level recovery root deliberately replaces the editor and contains zero editor instances. This is honest applicability, not a pass for editor blank-canvas routing. `VHR-R1-001` remains outside this atomic fix and was not changed.

The authoritative scenario status is `fail` solely because the old canonical pixels differ; all four recovery semantic assertions pass. The integration fixer/reviewer must use the existing inspected-candidate promotion path after the original reviewer accepts the semantic and visual delta. No canonical PNG/metadata, tolerance, mask, tasks file, promotion state, commit, auto-run state, or other finding was changed here.

## Durable findings

1. A visible heading contract needs both the heading's own role/name and the owning region's exact `aria-labelledby` relationship; either assertion alone permits a disconnected label.
2. Readability evidence must record computed foreground, resolved opaque background, and the ratio, not merely an authored color literal.
3. Application-owned recovery can honestly exclude editor blank-canvas routing only when the evidence also proves it is outside the editor tree and reports applicability as false.

`VHR-R1-007` remains **OPEN pending original reviewer disposition and baseline integration**.
