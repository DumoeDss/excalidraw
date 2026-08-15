# Independent review report

Change: `responsive-editor-shell`

Role: independent reviewer, dispatched report-only

Branch: `feat/editor-ui-redesign`

Scoped base/head: `500c5762306548a3293f4e39acfe59d05d9e0025` (the implementation remains uncommitted on that base)

Base tree: `5c470369de26882ead1a4071686e463c650e9d43`

## Verdict

**FAIL — 4 Major findings.** The resolver and most policy migrations are well covered and the focused suites pass, but the first real positive measurement can leave desktop React DOM under a phone profile, two instance-RTL consumers still depend on the document root, and the existing public hook's declaration now exposes the private profile.

The finite finding list is `RES-R1-001` through `RES-R1-004`. All four are `ASK` for a non-author fixer; this report makes no product or test edits.

## Findings

### RES-R1-001 — Major — first positive measurement can update the profile without rendering its adapter

- Location: `packages/excalidraw/components/App.tsx:4275`, `packages/excalidraw/components/App.tsx:15175`.
- Contract: the first positive measurement must replace the deterministic initial desktop profile, and context consumers must render the current adapter; whole-editor horizontal scrolling is prohibited.
- Reproduction: create a fresh target, apply a 375×812 mobile viewport, hard-reload, wait for paint, and do not call the debug refresh/state helpers. Target `F68E569463907BC70A3D14C6245CDA74` reported profile `phone/phone`, root `375×812`, `data-responsive-adapter="phone"`, but `excalidraw--mobile=false`, `.layer-ui__wrapper=1`, `.mobile-menu=0`, and `scrollWidth=510 > clientWidth=375`.
- Evidence: `review-chrome/375x812-hard-reload-without-refresh.png` and `review-chrome/matrix.json`.
- Root cause: the sole `ResizeObserver` mutates `this.editorInterface` through `refreshEditorInterface(rect)` and then calls `updateDOMRect()`. If App state already contains the same measured width, height, and offsets, `updateDOMRect()` returns without `setState`; the provider therefore retains the initial desktop render even though the mutable interface and root data attributes already say phone.
- Required fix: make a changed responsive/editor-interface identity schedule a React render even when the DOM rect is unchanged. Add a regression that starts from the deterministic initial profile, supplies the first real positive phone rect equal to existing size state, and asserts current adapter DOM plus no root overflow.
- Classification: `ASK`.

### RES-R1-002 — Major — Sidebar placement still reads global direction instead of the editor instance

- Location: `packages/excalidraw/components/Sidebar/Sidebar.scss:33` and `:46`.
- Contract: requested-language direction is editor-local; two editors with different directions must remain isolated, and RTL placement must not depend on `document.documentElement.dir`.
- Reproduction: on fresh target `5B39EE8C92726010242CEB0B0C94029C`, use 1024×768, set only the App instance to RTL, refresh the profile, then open Library. The editor root and profile were RTL while the document root remained LTR. The sidebar stayed at physical right, `x=731..1024`, because both placement and border rules use `:root[dir="rtl"] &`.
- Evidence: `review-chrome/1024x768-dark-rtl-library.png` and `review-chrome/matrix.json`.
- Required fix: select the RTL branch from the editor-local `dir`/responsive attribute and add coverage for two simultaneous editors with opposite directions, including physical sidebar geometry and borders.
- Classification: `ASK`.

### RES-R1-003 — Major — the public hook declaration exposes the private responsive profile

- Location: `packages/excalidraw/components/App.tsx:610` and generated `packages/excalidraw/dist/types/excalidraw/components/App.d.ts:55`.
- Contract: the common/public `EditorInterface` contract must remain unchanged; the responsive projection is deep/internal and must not expand an existing public export.
- Evidence: the scoped base implemented `useEditorInterface` as `useContext<EditorInterface>(...)`. The current source infers `InternalEditorInterface`, and the package build emits `useEditorInterface: () => InternalEditorInterface`, importing the deep responsive declaration. `packages/excalidraw/index.tsx` continues to publicly export this hook, so consumers see the new `responsive` field even though no new barrel symbol was added.
- Required fix: retain an explicit public `EditorInterface` return type for `useEditorInterface`, while internal consumers obtain the private projection through a separate deep hook/context accessor. Rebuild and inspect the declaration output.
- Classification: `ASK`.

### RES-R1-004 — Major — editor-local RTL Help state creates whole-editor horizontal scrolling

- Location: `packages/excalidraw/components/welcome-screen/WelcomeScreen.scss:51`, with the same global selector pattern at `:63`, `:88`, and `:111`.
- Contract: fixed-size direction changes must refresh instance-local consumers, and no supported state may use whole-editor horizontal scrolling as a fit fallback.
- Reproduction: on fresh target `16DD4E275CF684AE87D4D72FC3315EF0`, use 1440×900, make only the editor instance RTL, and open Help. The Help surface remained bounded (`x=259.2..1180.8`), but the welcome Help hint was placed at `left=-45`; its SVG reached `left=-60.36`. The editor root became `scrollWidth=1500 > clientWidth=1440` while document root direction remained LTR.
- Evidence: `review-chrome/1440x900-dark-rtl-help.png` and `review-chrome/matrix.json`.
- Required fix: move all welcome-hint RTL branches to an editor-local selector/attribute and add a fixed-size instance-RTL Help regression asserting every descendant stays within the editor's horizontal scroll extent.
- Classification: `ASK`.

## Standards axis

- Result: **FAIL — 3 Major findings** (`RES-R1-001`, `RES-R1-002`, `RES-R1-004`).
- The resolver is pure and deterministic; normalization, signature identity, safe-area physical/logical projection, threshold neighbors, owner-window listeners, cleanup, reservation validation, and adapter-owned policy boundaries have focused coverage.
- The diff retains one App `ResizeObserver`, one existing editor-interface context/provider, no external responsive store, no generic rule compiler, no dependency addition, no new public barrel symbol, no `LayerUIProps` or memo-comparator expansion, and no final screenshot-regression infrastructure.
- Root/row/zone pointer authority remains neutral in the tested paths; floating and large policies remain editor-bounded; compact/touch target checks passed in the repeated matrix.
- Worst standards issue: the first valid phone measurement can leave the rendered adapter stale and horizontally overflowing despite a correct profile.

## Spec axis

- Result: **FAIL — 4 Major findings** (`RES-R1-001` through `RES-R1-004`).
- The implemented resolver schema and ownership table otherwise match the proposal/design, including tablet-through-desktop, stable signatures, canonical physical safe areas, logical RTL projection, and generalized named-reservation freshness.
- There is no observed scope creep in dependencies, protocols, persistence, domain state ownership, or public props. The public return-type expansion is itself a contract violation, not intentional scope.
- Worst spec issue: current runtime and declaration behavior violate the locked internal-only boundary and supported RTL/phone acceptance requirements.

## Coverage diagram

```text
App container lifecycle
  deterministic desktop initial profile
  ├─ zero/detached bounds -> retain prior profile                         [unit ✓]
  └─ first positive ResizeObserver measurement
     ├─ state geometry differs -> setState -> provider + adapter refresh [unit ✓]
     └─ state geometry already equal -> no setState -> stale DOM          [Chrome FAIL, test gap: RES-R1-001]

Semantic inputs at fixed size
  ├─ language direction -> editor dir/profile/signature                  [unit ✓]
  ├─ coarse query -> density                                              [unit ✓]
  ├─ pen/touch latch -> density + pen state                              [unit ✓]
  ├─ visualViewport/base safe area -> physical/logical projection        [unit + Chrome ✓]
  └─ instance RTL consumers
     ├─ JS floating/large policies                                       [unit + Chrome ✓]
     ├─ Sidebar CSS -> document-root selector                            [Chrome FAIL, isolation gap: RES-R1-002]
     └─ welcome hints -> document-root selector                          [Chrome FAIL, overflow gap: RES-R1-004]

Public/internal boundary
  existing public useEditorInterface
  ├─ source context has private responsive extension                     [intended]
  └─ inferred declaration returns InternalEditorInterface                [build artifact FAIL: RES-R1-003]

Viewport reservations and owned surfaces
  ├─ stylesPanel/sidebar cache key invalidation                          [unit ✓]
  ├─ phone fallback/no hidden desktop reservation                        [unit ✓]
  ├─ floating/large/AppContent canonical safe areas                      [unit + Chrome ✓]
  ├─ tablet compact property rail                                        [Chrome ✓]
  ├─ short/portrait phone target geometry and canvas hit                 [Chrome ✓ after explicit render refresh]
  └─ large content internal scroll                                       [Chrome ✓]
```

## Automated evidence

Reviewer-run commands against the unchanged scoped implementation:

```text
yarn test packages/excalidraw/components/responsiveEditorShell/responsiveEditorShell.test.ts packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx packages/excalidraw/tests/interactivity.test.tsx --run
```

PASS — 3 files, 125 tests.

```text
yarn test packages/excalidraw/components/CanvasUiLayout.test.tsx packages/excalidraw/components/LibraryMenuItems.test.tsx packages/excalidraw/components/Sidebar/Sidebar.test.tsx packages/excalidraw/components/appContent/AppContent.test.tsx packages/excalidraw/components/floatingSurface/policy.test.ts packages/excalidraw/components/largeSurface/policy.test.ts packages/excalidraw/components/adaptiveToolbar.test.tsx excalidraw-app/components/TopErrorBoundary.test.tsx --run
```

PASS — 8 files, 82 tests. Total reviewer run: 11 files, 207 tests. Existing non-failing output consisted of RTL property-test `act()` warnings and expected disabled-tool diagnostics.

Other gates:

- `git diff --check 500c5762306548a3293f4e39acfe59d05d9e0025 -- .` — PASS.
- `rasen validate responsive-editor-shell --strict --json` — PASS, one valid change, zero issues.
- Task audit before this report: 49 IDs, 49 unique.
- Greptile: zero line comments and zero top-level comments from the review bot.

## Independent Chrome matrix

Durable machine-readable observations and screenshot hashes are in `review-chrome/matrix.json`. Nine reviewer screenshots were captured in fresh disposable targets and personally inspected.

Passing observations include:

- 1440×900 light/LTR Library: desktop adapter, root 1440/1440, selected Draw and Library state.
- 768×1024 light/LTR: tablet/desktop adapter, compact property rail at physical right, root 768/768.
- 1180×700 light/LTR: bounded large content with reachable internal overflow, root 1180/1180.
- 812×375 dark/RTL and explicitly refreshed 375×812 light/LTR: phone profile, 44 px minimum tested controls, canvas hit beside chrome, no stale desktop wrapper, root widths equal scroll widths.
- 640×480 dark/RTL with asymmetric base safe areas: physical `7/19/23/11`, logical `7/11/23/19`, floating and large aliases identical, bounded/reachable Help, root 640/640.
- Final clean hard reload: checker messages 0, visible error overlays 0, error-level console entries 0.

The matrix deliberately separates those explicitly refreshed setup states from the fresh cold-start reproduction in `RES-R1-001`.

Target lifecycle:

- Matrix target: `953106115865073FC1FDCE3FF97D8C41`.
- Fresh RTL Sidebar target: `5B39EE8C92726010242CEB0B0C94029C`.
- Fresh phone cold-start target: `F68E569463907BC70A3D14C6245CDA74`.
- Fresh RTL Help target: `16DD4E275CF684AE87D4D72FC3315EF0`.
- All reviewer targets were closed and confirmed absent. Proxy health after close: connected, `managedTabs=0`, Chrome port 9222. The shared proxy was not stopped.

## Scope and fingerprint audit

The 28-file product/test manifest comprises the scoped tracked diff under `packages/excalidraw` plus `excalidraw-app/components/TopErrorBoundary.test.tsx` and the three new `responsiveEditorShell` files.

- SHA-256 of ordinal-sorted `path<TAB>git-hash-object` records joined with LF: `837668a092c52b99dbe567a925a676064039b7f38557c87963cd90758fd4dc7f`.
- Windows-stable ordinal-sorted `path<NUL>raw-bytes<NUL>` fingerprint: `4e9739a519a901ff2c82d80875ec7c626bcad62fa93a9c61a5964132a0117f62`.
- Implementer-recorded value: `f7b7eb9be98dab72a4579f358a6251881426cf4bc5fc9214c5509b8644272a54`.

The recorded value is not reproducible because its algorithm was not documented. Source mtimes predate reviewer activity and no reviewer product/test write occurred, so this is an evidence-integrity mismatch rather than a separate product finding. The fixer should record a fresh post-fix fingerprint with an explicit algorithm and manifest.

Scope checks found no scoped changes to `package.json`, `yarn.lock`, `packages/common/src/index.ts`, or `packages/excalidraw/index.tsx`; no dependency, new design token, new `!important`, generic compiler/store/provider/observer, editor-wide overflow fallback, target shrink, or screenshot test infrastructure was added. Strict UTF-8 decoding passed; `Română` is valid text and was the only match from a coarse mojibake pattern.
