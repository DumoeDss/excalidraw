# Fix round 1 report

Change: `responsive-editor-shell`

Role: fresh non-reviewer fixer

Round: 1

Scoped base: `500c5762306548a3293f4e39acfe59d05d9e0025`

This report records the authored fixer delta and targeted/full verification. It does not declare any finding closed; the original independent reviewer must delta re-review it.

## Finding-to-fix mapping

### RES-R1-001 — first valid phone measurement did not render the phone adapter

Root cause: the sole container `ResizeObserver` updated the mutable internal interface and root data attributes, then `updateDOMRect()` returned early when width, height, and offsets already matched App state. The provider therefore kept the initial desktop render.

Fix:

- `App.refreshEditorInterface()` now returns whether the internal editor-interface identity changed.
- The existing and only `ResizeObserver` passes that fact into `updateDOMRect()`.
- `updateDOMRect()` schedules one empty React state update only when geometry is unchanged but the interface identity changed; it keeps the existing early return for semantically identical measurements.
- Internal identity comparison checks user-agent fields rather than accepting a newly allocated but semantically equal descriptor as churn.

Regression: `App.lifecycle.test.tsx` starts from a deterministic desktop profile while App state is already `375×812`, invokes the first observer measurement, and requires mobile class, phone layout, no desktop wrapper, and current phone profile/DOM. RED failed because `.excalidraw--mobile` was absent after the profile changed; GREEN passes.

Fresh Chrome at 375×812 was a cold hard reload with the mobile viewport applied before navigation and no debug refresh/state helper. The first visible state was `phone/phone`, mobile class true, zero desktop wrappers, one phone layout, root `clientWidth/scrollWidth=375/375`, and an open Library bounded to `82..375`.

### RES-R1-002 — Sidebar RTL placement depended on the document root

Root cause: Sidebar physical placement and border overrides used `:root[dir="rtl"]`, so an RTL editor nested in an LTR document stayed on physical right and received the wrong border.

Fix: `Sidebar.scss` now scopes the physical left/right placement and border override to `.excalidraw[dir="rtl"] .sidebar`. Physical safe-area values and logical projections are unchanged.

Regression: the App lifecycle suite renders simultaneous LTR and RTL editors, associates each Sidebar with its own instance root, and statically locks the instance-local selector plus physical placement/border rules while rejecting the document-root selector. In the RED run this failed on the missing instance selector.

Fresh Chrome at 1024×768 used an RTL App while the document root was explicitly LTR. A trusted click selected Library. The Sidebar was physical left at `0..293`, `border-left=0px`, `border-right=1px`, root `1024/1024`, the Library tab was active, and the close control retained its Arabic accessible name.

### RES-R1-003 — the public hook declaration exposed the private profile

Root cause: `useEditorInterface()` inferred the internal context intersection, and the package build emitted `() => InternalEditorInterface` through the existing public export.

Fix:

- The public `useEditorInterface()` has an explicit unchanged `EditorInterface` return type.
- A deep unexported `useInternalEditorInterface()` reads the internal context.
- The deep internal `useResponsiveEditorShell()` projects the private profile directly from that accessor.
- `LayerUI` obtains adapter policy through the deep internal hook instead of reading `.responsive` from the public hook.
- No common/public barrel, public symbol list, public prop, `LayerUI` comparator, provider, store, or observer changed.

Regression: `expectTypeOf(useEditorInterface).returns.toEqualTypeOf<EditorInterface>()` locks the exact public return contract. The first build after narrowing found two remaining `LayerUI` internal reads; those were migrated to the deep hook. The rebuilt declaration now emits exactly `useEditorInterface: () => EditorInterface`; `useResponsiveEditorShell` and responsive profile names remain absent from `packages/excalidraw/index.tsx`, `packages/common/src/index.ts`, and the generated public index declaration.

### RES-R1-004 — instance RTL welcome Help hint caused root horizontal overflow

Root cause: all welcome-hint RTL transforms/placement used the document root selector. With an RTL editor under an LTR document, Help used the wrong physical branch and a descendant extended beyond the editor's horizontal scroll origin.

Fix: `WelcomeScreen.scss` now scopes Help placement/arrow transform and Toolbar/Menu mirroring under `.excalidraw[dir="rtl"]`. It adds no root overflow fallback and does not clip or hide the hint.

Regression: the App lifecycle suite renders a real RTL editor and Welcome Help tunnel under an LTR document, proves the hint belongs to the RTL editor, locks instance-local Help/arrow rules, and rejects every document-root RTL selector. In the RED run the instance-local branch was absent.

Fresh Chrome at 1440×900 used an RTL App with document root LTR and opened Help by trusted click. Root `clientWidth/scrollWidth=1440/1440`; the hint was `318..475.203125`, its SVG was `306.73883056640625..386.62054443359375`, and all descendants stayed within the editor horizontal extent. The focused Help link retained focus/accessible text.

## Safe-area smoke

Fresh 640×480 RTL Help used asymmetric base physical values `top/right/bottom/left=7/19/23/11`. The live profile signature recorded unchanged physical values and logical `blockStart/inlineEnd/blockEnd/inlineStart=7/11/23/19`. Root was `640/640`; the Help surface was editor-bounded at `0..640`; the focused link remained visible. This confirms the Sidebar/welcome selector fixes did not redefine safe-area authority.

## TDD evidence

Approved seams were the task-specified App lifecycle render boundary, simultaneous editor instance roots plus owned CSS, the existing public declaration contract, and the real editor/root geometry in Chrome.

- RED: `yarn test packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx --run` — 3 focused regressions failed: stale phone render, missing instance-local Sidebar rule, and missing instance-local welcome branch.
- GREEN: the same command — 10/10 passed after the minimal implementation.
- Final after exact public type regression: the same command — 11/11 passed.

## Automated verification

- `yarn test packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx packages/excalidraw/components/Sidebar/Sidebar.test.tsx packages/excalidraw/tests/interactivity.test.tsx --run` — PASS, 3 files / 107 tests before the final exact-type assertion.
- Final section 7 command:

  `yarn test packages/excalidraw/components/responsiveEditorShell/responsiveEditorShell.test.ts packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx packages/excalidraw/tests/interactivity.test.tsx packages/excalidraw/components/CanvasUiLayout.test.tsx packages/excalidraw/components/LibraryMenuItems.test.tsx packages/excalidraw/components/Sidebar/Sidebar.test.tsx packages/excalidraw/components/appContent/AppContent.test.tsx packages/excalidraw/components/floatingSurface/policy.test.ts packages/excalidraw/components/largeSurface/policy.test.ts packages/excalidraw/components/adaptiveToolbar.test.tsx excalidraw-app/components/TopErrorBoundary.test.tsx --run`

  PASS — 11 files / 211 tests. Existing RTL property-test `act()` warnings and expected disabled-tool diagnostics were unchanged.

- Required order after final formatting: `yarn build:excalidraw` — PASS, then `yarn test:typecheck` — PASS.
- Generated declaration check — PASS: `useEditorInterface: () => EditorInterface`; no responsive profile/hook in public index declarations/barrels.
- Focused ESLint with `--max-warnings=0` — PASS.
- Focused Prettier check — PASS.
- Direct Sass compilation of Sidebar and Welcome Screen entries — PASS (`5970` and `5386` compressed CSS characters).
- `rasen validate responsive-editor-shell --strict --json` — PASS, 1/1 valid with zero issues.
- `git diff --check 500c5762306548a3293f4e39acfe59d05d9e0025 -- .` — PASS.
- Strict UTF-8/no-BOM/U+FFFD/mojibake audit is recorded below and passed.
- Added-line scope audit: zero new dependency/public export/design token/`!important`/provider/store/observer/whole-editor horizontal scroll/target shrink/final screenshot infrastructure/debug/TODO additions.

## Chrome evidence and target lifecycle

Machine-readable observations: `matrix.json`. Screenshots were opened and personally inspected:

- `375x812-cold-phone-library.png`
- `1024x768-instance-rtl-library-doc-ltr.png`
- `1440x900-instance-rtl-help-doc-ltr.png`
- `640x480-rtl-asymmetric-safe-help.png`

Screenshot aggregate SHA-256 is `99545c92027abf2fbf9090a7eff33a0cdd9d95a7d48bd02da942477c6f7f38d0`, over ordinal-sorted `filename<TAB>file-sha256` records joined with LF. All accepted states had zero error-level console entries, zero checker messages, and zero visible unexpected error overlays.

Disposable targets:

- `1517F63CA40492E84B3CC6F95F94181B`
- `2A4C3BBE8ACBE2BFBA8D57DA207B08A5`
- `3EE215D394B01CF37A21F7DC488D1805`
- `25FCD61890E373E6C27C3506C6A898AD`

All targets were distinct from implementation/reviewer targets and are closed/confirmed absent in the final cleanup. The shared proxy on 3456 remained running and connected to Chrome 9222.

## Reproducible source/test fingerprints

The canonical post-fix scope is the changed/untracked product/test manifest relative to scoped base `500c5762306548a3293f4e39acfe59d05d9e0025`, limited to TypeScript, TSX, and SCSS under `packages/excalidraw` plus the focused recovery test.

Algorithm: SHA-256 over ordinal-sorted UTF-8 records `path<TAB>git-hash-object`, joined with LF and no terminal newline.

- `source-manifest.tsv`: 30 records, aggregate `1df2728231959da528ba2c2ffcf818c952148c547d1494050a6fca9e83a0e503`.
- `fixer-delta-manifest.tsv`: 5 authored source/test records, aggregate `ca425a2c4b9aa142fac9a8b8a3e32b50d7c594896735ed6954a075da316b3c7c`.

The historical implementer value is not claimed as reproduced because its algorithm was undocumented. The explicit manifest/algorithm above supersedes that mismatch for post-fix evidence.

## Exact fixer source/test paths

- `packages/excalidraw/components/App.tsx`
- `packages/excalidraw/components/LayerUI.tsx`
- `packages/excalidraw/components/Sidebar/Sidebar.scss`
- `packages/excalidraw/components/welcome-screen/WelcomeScreen.scss`
- `packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx`

## Eliminated hypotheses

- Changing only root data attributes cannot update context consumers: the provider needs a React render when the first semantic identity differs even if geometry state is equal.
- Always calling `setState({})` on observer delivery is unnecessary churn; the identity boolean preserves deduplication for semantically equal observations.
- Widening or casting the public hook is not acceptable: the emitted declaration follows the exported function signature, so the public hook must explicitly return the common type and internal consumers must use a deep accessor.
- Logical CSS alone is not a safe replacement for Sidebar's locked physical dock contract; instance-local direction should select the existing physical left/right and border rules.
- Document-root RTL selectors cannot support simultaneous opposite-direction editors; ownership must be the nearest `.excalidraw[dir]` root.
- Whole-editor overflow clipping or horizontal scrolling would only hide the welcome defect and violates the shell contract; fixing the owner selector keeps the hint fully visible and bounded.

## Durable findings

1. Mutable context payloads need an explicit React-render signal when semantic identity changes independently of state geometry; root attributes are not a substitute for provider freshness.
2. Existing public hooks that read a deepened private context must state their legacy return type explicitly, while internal consumers use a separate non-barrel accessor.
3. Directional CSS for multi-editor pages must anchor to the editor instance root; document-root selectors silently couple otherwise isolated editors.
