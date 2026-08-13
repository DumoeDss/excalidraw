# Independent delta re-review — round 1

Change: `responsive-editor-shell`

Role: original independent reviewer, dispatched report-only

Fixer: `/root/responsive_shell_fixer_r1`

Reviewer: `/root/responsive_editor_shell_review`

Scoped base: `500c5762306548a3293f4e39acfe59d05d9e0025`

Quoted `git rev-parse 'HEAD^{tree}'`: `5c470369de26882ead1a4071686e463c650e9d43`

## Verdict

**CLEAN/PASS — 4/4 original Major findings CLOSED; 0 remaining findings.**

This was a delta-only re-review of the five fixer-authored source/test paths and the four affected browser states. The reviewer did not edit product or test code. The fixer and reviewer identities are distinct, so author and verifier are not the same worker.

## Finding closure

### RES-R1-001 — Major — CLOSED

- Source: `packages/excalidraw/components/App.tsx:4107-4186`, `:4292-4296`, and `:15192-15219`.
- Regression: `packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx:136` starts with App state already at `375×812`, proves the deterministic desktop profile/DOM is initially present, delivers the first positive container measurement, and requires the phone profile, mobile class, phone layout, and removal of the desktop wrapper.
- Review: `refreshEditorInterface()` returns semantic interface identity change after comparing all legacy fields, user-agent fields, and the reused responsive object. The sole App container observer passes that boolean to `updateDOMRect()`. Equal geometry now schedules one empty React update only for a changed interface; semantically identical measurements retain the early return. The existing observer disconnect remains at `App.tsx:4380`.
- Targeted test: `App.lifecycle.test.tsx` passed, including equal-signature object reuse and observer/listener cleanup.
- Browser: fresh reviewer target `76EEF034E13FE68C325436F12C0ED3A4`, viewport applied before navigation, hard reload, no debug refresh/state helper. A real screenshot paint allowed native observer delivery, after which the root was `phone/phone`, mobile class true, desktop wrappers 0, phone layouts 1, and `clientWidth/scrollWidth=375/375`. Library opened by trusted click and remained bounded at `82..375`.
- Evidence: `re-review-round-1-chrome/375x812-cold-phone-library.png` and `re-review-round-1-chrome/matrix.json`.

### RES-R1-002 — Major — CLOSED

- Source: `packages/excalidraw/components/Sidebar/Sidebar.scss:78-83`.
- Regression: `packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx:322` renders simultaneous LTR and RTL editors, proves each Sidebar belongs to its own root, locks the instance selector and physical placement/border rules, and rejects the document-root RTL selector.
- Review: `.excalidraw[dir="rtl"] .sidebar` selects the existing physical left dock and preserves canonical safe-area variables, dock/overlay classes, width, max-width, and resize-handle ownership. No document-root RTL selector remains in the file.
- Targeted tests: `App.lifecycle.test.tsx` and `Sidebar.test.tsx` passed, 2 files / 26 tests.
- Browser: fresh reviewer target `0636F6C5122E0FA64D5FDA1A7601CA3E`, `1024×768`, editor RTL under document LTR. Trusted Library click produced physical left `0..293`, `border-left=0px`, `border-right=1px`, one active tab, and root `1024/1024`.
- Evidence: `re-review-round-1-chrome/1024x768-instance-rtl-library-doc-ltr.png` and `re-review-round-1-chrome/matrix.json`.

### RES-R1-003 — Major — CLOSED

- Source: `packages/excalidraw/components/App.tsx:610-614` and `packages/excalidraw/components/LayerUI.tsx:174-175`.
- Regression: `packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx:98` requires the public hook's exact return type to equal the common `EditorInterface`.
- Review: `useEditorInterface()` explicitly returns `EditorInterface`; internal consumers read the private responsive projection through `useResponsiveEditorShell()`. `LayerUI` no longer reads `.responsive` through the public hook. The deep hook/profile are absent from `packages/excalidraw/index.tsx`, `packages/common/src/index.ts`, and the generated public index declaration.
- Build evidence: reviewer ran `yarn build:excalidraw`; generated `packages/excalidraw/dist/types/excalidraw/components/App.d.ts:55` is exactly `useEditorInterface: () => EditorInterface`. Reviewer then ran `yarn test:typecheck`; it passed.

### RES-R1-004 — Major — CLOSED

- Source: `packages/excalidraw/components/welcome-screen/WelcomeScreen.scss:107-121`.
- Regression: `packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx:369` proves the Help hint belongs to the RTL editor under an LTR document, locks the instance branch for Help/arrow placement, and rejects the document-root selector.
- Review: all relevant Help, toolbar, and menu mirroring branches use the editor instance direction. No root overflow fallback, clipping workaround, target shrink, or document-root RTL selector was introduced.
- Browser: fresh reviewer target `DCB4929203EEA6F9E21AF3B31C150600`, `1440×900`, editor RTL under document LTR. Help opened by trusted click. Root was `1440/1440`; Help hint descendants ranged from `4.738837242126465` to `173.203125`, fully inside the editor horizontal scroll extent, and the focused documentation link remained reachable.
- Evidence: `re-review-round-1-chrome/1440x900-instance-rtl-help-doc-ltr.png` and `re-review-round-1-chrome/matrix.json`.

## Safe-area smoke

Fresh reviewer target `66B8DE9F0FCE49811E81F52D89DE27AB` used `640×480`, editor RTL under document LTR, and canonical physical values `top/right/bottom/left=7/19/23/11`. Real viewport changes refreshed the profile to signature `[1,"phone","phone","landscape","short","touch","mobile","rtl",false,7,19,23,11,7,11,23,19]`, preserving logical `blockStart/inlineEnd/blockEnd/inlineStart=7/11/23/19`. Trusted mouse clicks opened the main menu and Help. The fullscreen Help surface was bounded at `0..640`, root width stayed `640/640`, and the focused documentation link was reachable.

Evidence: `re-review-round-1-chrome/640x480-rtl-asymmetric-safe-help.png` and `re-review-round-1-chrome/matrix.json`.

## Reviewer-run commands

```text
yarn test packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx packages/excalidraw/components/Sidebar/Sidebar.test.tsx --run
```

PASS — 2 files / 26 tests.

```text
yarn test packages/excalidraw/tests/interactivity.test.tsx --run
```

PASS — 1 file / 82 tests. Existing non-failing RTL `act()` warnings and expected disabled-tool diagnostics were unchanged.

```text
yarn build:excalidraw
yarn test:typecheck
```

PASS in the required build-then-typecheck order.

Final artifact checks recorded below also passed:

```text
rasen validate responsive-editor-shell --strict --json
git diff --check 500c5762306548a3293f4e39acfe59d05d9e0025 -- .
```

## Scope and fingerprint audit

The current product/test scope is the 30-record `fix-round-1/source-manifest.tsv`. The reviewer independently recomputed SHA-256 over ordinal-sorted UTF-8 `path<TAB>git-hash-object` records joined with LF and no terminal newline:

- Full 30-file scope: `1df2728231959da528ba2c2ffcf818c952148c547d1494050a6fca9e83a0e503`.
- Exact five-file fixer delta: `ca425a2c4b9aa142fac9a8b8a3e32b50d7c594896735ed6954a075da316b3c7c`.
- The full manifest contents match the recomputed records exactly.

The five fixer source/test paths are:

- `packages/excalidraw/components/App.tsx`
- `packages/excalidraw/components/LayerUI.tsx`
- `packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx`
- `packages/excalidraw/components/Sidebar/Sidebar.scss`
- `packages/excalidraw/components/welcome-screen/WelcomeScreen.scss`

No extra product/test delta appeared after the fixer report. Reviewer test/build commands did not change this fingerprint.

## Chrome lifecycle and final clean state

Accepted reviewer screenshots were personally inspected. Their ordinal filename/hash aggregate is `f66862f5a3ffe94a135f3da7e32b8124cdd3361d8c1ad63ec35d0d21bdeb90b9`; per-file hashes and exact geometry are in `re-review-round-1-chrome/matrix.json`.

The final hard reload recorded:

- checker messages: 0;
- visible error overlays: 0;
- error-level console entries: 0;
- root `clientWidth/scrollWidth=640/640`.

All reviewer disposable targets listed in the matrix were closed and confirmed absent. Proxy `http://localhost:3456` remained running and healthy: connected, sessions 0, managed tabs 0, Chrome port 9222.

## Durable findings

1. A mutable context value needs a React render signal when semantic identity changes while geometry is equal; a DOM attribute update alone cannot refresh consumers.
2. Public hooks over deepened private contexts must retain an explicit legacy return type, with internal projections kept out of package/common barrels.
3. Directional CSS for multi-editor pages must anchor to the owning editor root; document-root direction breaks instance isolation.
