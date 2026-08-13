# Implementation evidence

Change: `responsive-editor-shell`

Role: implementer

Scope: tasks 1.1–7.4 only

Branch: `feat/editor-ui-redesign`

## Result

The internal responsive editor shell is implemented without changing the public `EditorInterface`, public barrels, `LayerUIProps`, or the `LayerUI` comparator. App retains the existing single container `ResizeObserver` and existing context/provider. The profile owns semantic tier/adapter/orientation/block size/density/presentation/direction/safe-area facts; domain modules retain inventory, actions, selection/open state, focus, scrolling, and lifecycle.

A Chrome-found portrait-phone overflow was fixed at its owner: the adaptive toolbar's intrinsic measurement rail remains measurable while its bottom Island clips measurement-only overflow. The final 375×812 editor reports `clientWidth=375` and `scrollWidth=375`; the hidden measurement rail remains 476px and toolbar targets remain 44px.

## Focused automated gate

Command:

```text
yarn test packages/excalidraw/components/responsiveEditorShell/responsiveEditorShell.test.ts packages/excalidraw/components/responsiveEditorShell/App.lifecycle.test.tsx packages/excalidraw/tests/interactivity.test.tsx packages/excalidraw/components/CanvasUiLayout.test.tsx packages/excalidraw/components/LibraryMenuItems.test.tsx packages/excalidraw/components/Sidebar/Sidebar.test.tsx packages/excalidraw/components/appContent/AppContent.test.tsx packages/excalidraw/components/floatingSurface/policy.test.ts packages/excalidraw/components/largeSurface/policy.test.ts packages/excalidraw/components/adaptiveToolbar.test.tsx excalidraw-app/components/TopErrorBoundary.test.tsx --run
```

Result: PASS — 11 files, 207 tests. The output contained existing informational warnings from one RTL property test's `act()` discipline and expected non-interactive tool refusals; no test failed.

## Formatting, lint, encoding, and diff

- Explicit-file Prettier check: PASS — 32 task files.
- Explicit-file ESLint with `--max-warnings=0`: PASS.
- Strict UTF-8 decode, no BOM, no U+FFFD, and selected mojibake signatures: PASS — 32 task files.
- `git diff --check`: PASS.
- `matrix.json` JSON parse: PASS.
- The first attempted root `yarn prettier --check` invocation was invalid for focused verification because the root script prepended an all-repo glob and PowerShell passed the explicit list as one argument. It scanned unrelated Chrome profile data and was replaced by direct `node_modules/.bin/prettier.cmd --check <explicit files>`.
- Two invalid Vitest invocations were corrected: `--runInBand` is unsupported, and omitting `--run` entered watch mode. The accepted command uses `--run`.

## Build and types — required order

1. `yarn build:excalidraw` — PASS, 17.72s.
2. `yarn test:typecheck` — PASS, 19.88s.

The commands ran sequentially, never concurrently.

## Strict change validation

Command:

```text
rasen validate responsive-editor-shell --strict --json
```

Result: PASS — 1/1 valid, zero issues, version 1.0.

Task audit before checkbox update: 49 task IDs, zero duplicates. Tasks 1–36 are the implementation range; tasks 37–49 remain for independent review/fix/final delivery.

## Real Chrome acceptance

Durable machine notes: [matrix.json](implementation-chrome/matrix.json)

Eight screenshots were saved and personally inspected:

- 1440×900 light/LTR with selected Draw and open Library.
- 1440×900 dark/RTL with open Help and focus-visible Documentation.
- 1024×768 dark/RTL with Library physically docked right.
- 768×1024 light/LTR with compact property rail.
- 1180×700 light/LTR with bounded Mermaid large content and reachable internal scrolling.
- 812×375 dark/RTL phone with Library, short-block bottom stack, touch density, and 44px toolbar targets.
- 375×812 light/LTR phone with Library; final root geometry is 375/375 horizontally.
- 640×480 dark/RTL phone embed with asymmetric safe areas and bounded Help.

Asymmetric safe-area evidence:

```text
physical top/right/bottom/left = 7/19/23/11
logical blockStart/inlineEnd/blockEnd/inlineStart = 7/11/23/19
floating aliases = 7/19/23/11
large aliases = 7/19/23/11
```

Physical values never mirrored; only logical inline projections changed.

Pointer evidence is intentionally classified as a documented test-harness latch. A simplified DOM PointerEvent lacked the full React/editor event shape, produced two probe-only exceptions, and did not latch `isTouchScreen`; it is not claimed as successful pen evidence. The focused App lifecycle suite covers the first pen/touch latch, immediate profile density refresh, and separate pen state. The phone Chrome states independently prove touch density, 44px toolbar targets, focus/ARIA, bounded chrome, and canvas reachability.

After a final hard reload and valid-size profile refresh:

```json
{
  "profile": {
    "tier": "phone",
    "adapter": "phone",
    "orientation": "portrait",
    "blockSize": "regular",
    "density": "touch",
    "presentation": "mobile",
    "direction": "ltr"
  },
  "root": {
    "clientWidth": 375,
    "scrollWidth": 375,
    "clientHeight": 812,
    "scrollHeight": 812
  },
  "checkerMessages": 0,
  "visibleErrorOverlays": 0,
  "errorConsoleEntries": 0
}
```

Both disposable targets were closed and confirmed absent. The shared proxy remained healthy at port 3456 with Chrome port 9222 and zero managed tabs. The pre-existing local `excalidraw-debug={"enabled":true}` setting was restored after final product-width evidence.

Screenshot aggregate SHA-256: `df5e64c27de97d316b052bbbe805343f08e02792c6d0ab95357e4277d6335617`.

## Source and test fingerprint

The source/test fingerprint covers 28 modified or newly added product/test files under `packages/excalidraw` and the focused recovery test.

Aggregate SHA-256:

```text
f7b7eb9be98dab72a4579f358a6251881426cf4bc5fc9214c5509b8644272a54
```

This fingerprint was recorded after formatting/lint fixes, focused tests, build, and typecheck. It excludes task/evidence artifacts and unrelated pre-existing worktree files.

## Scope audit

Confirmed for the implementation diff:

- no dependency or public export addition;
- no new design token or `!important`;
- no second responsive provider/store/container observer;
- no `LayerUIProps` or memo-comparator expansion;
- no generic responsive rule compiler;
- no whole-editor horizontal-scroll fallback or target shrinkage;
- no final screenshot-regression infrastructure;
- no copied external source, CSS, selectors, icons, fonts, or assets;
- no restricted reference additions in code or artifacts.

The single existing App observer and existing EditorInterface context/provider are deliberately deepened, not duplicated.
