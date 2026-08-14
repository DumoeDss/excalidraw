# Fixer 004 handoff — process retirement

## Original intent

Resolve `VHR-R1-004` by making the real-Chrome visual-regression runner apply and verify honest coarse/fine input capabilities, prove the mounted editor receives the intended adaptive projection, and restore the user's prior browser capabilities exactly.

## Position

Pipeline: `visual-regression-hardening` review/fix cycle. Current stage: fixer work for `VHR-R1-004`; implementation and direct evidence gathering are complete, but independent review and the authorized fix report are still pending. This worker was retired for a process violation and may not continue implementation.

## Status

- Finding `VHR-R1-004` remains **OPEN** pending independent review and the downstream scenario reruns listed below.
- This worker was retired before it was allowed to write `atomic-004`'s fix report or update tasks, baselines, promotion state, or run state.
- Source/test edits owned by this work item are currently present in:
  - `scripts/visual-regression/proxy.ts`
  - `scripts/visual-regression/browserScripts.ts`
  - `scripts/visual-regression/scenarios.ts`
  - `scripts/visual-regression/runner.ts`
  - `scripts/visual-regression/types.ts`
  - `scripts/visual-regression/visual.unit.test.ts`

## Key decisions (and why)

- A `chrome://inspect/#pages` target is used to create an internal DevTools target.
- DevTools discovery uses the before/after target-id difference plus the `devtools://devtools/` URL. It no longer depends on a title marker.
- After attach, target-scoped CDP is sent through the real `ProtocolClient.test.sendRawMessage` on the inspected session.
- The inspected session then verifies `document.title` against the exact marker. No JavaScript monkeypatch is used.
- The coarse profile requires exact `pointer=coarse`, `hover=false`, and `maxTouchPoints=1`.
- The fine profile sets pointer/hover exactly and uses `touchPoints: "preserve"`, retaining the real mixed-input device's physical touch-point value. This is necessary because CDP rejects `maxTouchPoints: 0`, while `enabled:false` honestly reports the machine's physical value (`10`).
- After navigation, the runner again compares the observed capabilities with the resolved expected capabilities.
- The mounted phone projection requires `tier=phone`, `adapter=phone`, `density=touch`, and a non-empty signature.
- Cleanup restores the prior input capabilities exactly.

## Real Chrome receipts

### `phone-light-library`

- Prior: `fine / true / 10`
- Requested: `coarse / false / 1`
- Actual immediately after apply: `coarse / false / 1`
- Actual after navigation: `coarse / false / 1`
- Mounted root: `phone / phone / touch`, with a non-empty signature
- `browserMatches=true`
- `mountedProjectionMatches=true`
- All host-restore observations were true
- Browser after cleanup: `fine / true / 10`
- `restoredExactly=true`

### `desktop-welcome`

- Prior: `fine / true / 10`
- Requested: `fine / true / preserve`
- Resolved expectation: `fine / true / 10`
- The post-navigation observation matched the resolved expectation exactly.
- Mounted root: `desktop / desktop / compact`
- All host-restore observations were true.
- Browser restoration was exact.

## Verification completed

- `yarn test:visual:unit`: **38/38 passed**.
- Targeted ESLint for the six related files: passed.
- Direct Prettier check for the six related files: passed.
- Mounted-editor targeted test: **2 passed / 81 skipped**.
- `yarn test:typecheck` still reports two independent pre-existing errors:
  - `excalidraw-app/visualRegressionHost.tsx:554`
  - `packages/excalidraw/components/LibraryMenuSection.tsx:70`

Full-run observations:

- `phone-light-library` passed all 004 input/profile/root/assertion gates, then failed in the separate `VHR-R1-001` trusted-key blank-canvas routing work.
- `phone-dark-landscape` passed 004 input acceptance, then failed in the separate `VHR-R1-002` toolbar-coordinate click work.
- `desktop-welcome` passed fine-input acceptance, then failed in the separate trusted-key action work.

The retained image under `scripts/visual-regression/results/fixer/fixer-004-input-3/...current.png` was visually inspected. It shows the Library content and phone layout, but also a checker badge in the lower-left corner. That image is contaminated and **must not be promoted**.

## Chrome cleanup

- During the original cleanup, every scenario target id owned by this worker was verified absent.
- The `chrome://inspect/#pages` helper, all `devtools://devtools/*` helpers, and all `visual-input-*` titled targets were verified absent.
- Retirement recheck on 2026-08-14 found a healthy sticky proxy, `managedTabs=0`, and zero matches among 40 targets for:
  - titles beginning `visual-input-`
  - URL `chrome://inspect/#pages`
  - URLs beginning `devtools://devtools/`
- The proxy reported `sessions=18`. It already reported `sessions=6` before this worker began. The session map therefore cannot be proven globally empty, and the proxy must not be restarted merely to clear shared/stale entries.
- No ordinary user tabs were closed.

## Eliminated approaches / hypotheses

- A second external CDP WebSocket is not viable.
- `/viewport?mobile=true` does not change input capabilities.
- JavaScript monkeypatching is prohibited and was not used.
- A DevTools title marker is not a reliable discovery mechanism.
- CDP rejects `maxTouchPoints: 0` on this path.

## Process deviations

1. This worker briefly misidentified itself as LEAD and spawned one read-only explorer. The explorer was immediately interrupted; none of its output was read or used.
2. This worker mistakenly ran `yarn prettier --write ...`. The package script expands to repository-wide Markdown/JSON globs. All newly introduced tracked formatting changes were reversed with exact patches, restoring the pre-command set of seven tracked modifications. Git cannot restore untracked files, so the possible untracked collateral is inventoried below and must be audited by a later fixer.

## Possible formatter collateral in untracked files

Timestamp window: `2026-08-14 09:47:00–09:48:30 +08:00`. These 32 files may have been touched; do not assume each timestamp proves a content change. In particular, `runner.ts` may reflect its legitimate source edit, while `proxy.ts` and `visual.unit.test.ts` were definitely formatted.

1. `scripts/visual-regression/runner.ts`
2. `.rasen/changes/visual-regression-hardening/ephemera/auto-run.json`
3. `rasen/changes/visual-regression-hardening/evidence/fixer/run-fixer-007-recovery-1.json`
4. `rasen/changes/visual-regression-hardening/evidence/fixer/run-fixer-009-actions-1.json`
5. `rasen/changes/visual-regression-hardening/evidence/fixer/run-fixer-009-actions-2.json`
6. `rasen/changes/visual-regression-hardening/evidence/implementer/manual-replay.md`
7. `rasen/changes/visual-regression-hardening/evidence/implementer/run-action-routing-probe-3.json`
8. `rasen/changes/visual-regression-hardening/evidence/implementer/run-final-row-lifecycle-probe-1.json`
9. `rasen/changes/visual-regression-hardening/evidence/implementer/run-fixer-009-20260814-2.json`
10. `rasen/changes/visual-regression-hardening/evidence/implementer/run-narrow-loading-pass-implementer-3.json`
11. `rasen/changes/visual-regression-hardening/evidence/implementer/run-trusted-focus-probe-2.json`
12. `rasen/changes/visual-regression-hardening/evidence/implementer/run-welcome-state-probe-1.json`
13. `rasen/changes/visual-regression-hardening/handoff/implementer-2.md`
14. `scripts/visual-regression/results/fixer/fixer-005-library-1/tablet-dark-library__1024x768__dpr1__dark__rtl__tablet-library-sidebar__fixer__fixer-005-library-1__result.json`
15. `scripts/visual-regression/results/fixer/fixer-r1c-library-desktop-probe-2/desktop-library__1440x900__dpr1__light__ltr__library-content__fixer__fixer-r1c-library-desktop-probe-2__result.json`
16. `scripts/visual-regression/results/implementer/action-routing-probe-1/desktop-toolbar-group__1440x900__dpr1__light__ltr__toolbar-group-open__implementer__action-routing-probe-1__result.json`
17. `scripts/visual-regression/results/implementer/action-routing-probe-2/desktop-toolbar-group__1440x900__dpr1__light__ltr__toolbar-group-open__implementer__action-routing-probe-2__result.json`
18. `scripts/visual-regression/results/implementer/implementer-matrix-1/desktop-welcome__1440x900__dpr1__light__ltr__welcome__implementer__implementer-matrix-1__result.json`
19. `scripts/visual-regression/results/implementer/implementer-matrix-3/desktop-welcome__1440x900__dpr1__light__ltr__welcome__implementer__implementer-matrix-3__result.json`
20. `scripts/visual-regression/results/implementer/implementer-matrix-4/phone-dark-landscape__812x375__dpr1__dark__rtl__short-toolbar-overflow__implementer__implementer-matrix-4__result.json`
21. `scripts/visual-regression/results/implementer/implementer-matrix-5/multi-editor-isolation__1440x900__dpr1__light__ltr__multi-editor__implementer__implementer-matrix-5__result.json`
22. `scripts/visual-regression/results/implementer/implementer-matrix-5/narrow-loading__375x812__dpr1__light__ltr__loading__implementer__implementer-matrix-5__result.json`
23. `scripts/visual-regression/results/implementer/implementer-matrix-6/multi-editor-isolation__1440x900__dpr1__light__ltr__multi-editor__implementer__implementer-matrix-6__result.json`
24. `scripts/visual-regression/results/implementer/implementer-matrix-7/multi-editor-isolation__1440x900__dpr1__light__ltr__multi-editor__implementer__implementer-matrix-7__result.json`
25. `scripts/visual-regression/results/implementer/implementer-verify-1/multi-editor-isolation__1440x900__dpr1__light__ltr__multi-editor__implementer__implementer-verify-1__result.json`
26. `scripts/visual-regression/results/implementer/implementer-verify-2/multi-editor-isolation__1440x900__dpr1__light__ltr__multi-editor__implementer__implementer-verify-2__result.json`
27. `scripts/visual-regression/results/implementer/narrow-loading-probe-implementer-3/narrow-loading__375x812__dpr1__light__ltr__loading__implementer__narrow-loading-probe-implementer-3__result.json`
28. `scripts/visual-regression/results/implementer/trusted-focus-probe-1/desktop-welcome__1440x900__dpr1__light__ltr__welcome__implementer__trusted-focus-probe-1__result.json`
29. `scripts/visual-regression/results/implementer/welcome-focus-probe-1/desktop-welcome__1440x900__dpr1__light__ltr__welcome__implementer__welcome-focus-probe-1__result.json`
30. `scripts/visual-regression/results/reviewer/reviewer-matrix-20260814-1/multi-editor-isolation__1440x900__dpr1__light__ltr__multi-editor__reviewer__reviewer-matrix-20260814-1__result.json`
31. `scripts/visual-regression/proxy.ts`
32. `scripts/visual-regression/visual.unit.test.ts`

## Remaining work

1. Assign an independent reviewer to review the 004 implementation and receipts.
2. After `VHR-R1-001` and `VHR-R1-002` are fixed, rerun the two phone scenarios through their complete flows.
3. Have a later fixer verify the possible formatter collateral above against authoritative prior content or semantic evidence; do not blindly rewrite those files.
4. Have an authorized worker write `atomic-004`'s fix report. This worker was explicitly forbidden to do so.
5. Keep the finding open until independent review and downstream reruns are complete.

## Next action

Assign an independent reviewer to inspect the six-file 004 implementation and the real-Chrome receipts before any finding closure or baseline promotion decision.
