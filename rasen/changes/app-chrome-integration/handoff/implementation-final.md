# App chrome integration final implementation handoff

## Boundary

- Tasks 1-32 are the implementation boundary. Tasks 33-42 remain untouched for independent review, fix/re-review, final audit, and local ship ownership.
- No commit, push, archive, spec sync, PR, retain, deploy, stash, or run-state change was performed.
- Fresh leaf verification followed two unauthorized nested-process attempts; no independent review cleanliness is claimed.

## Prospective tree fingerprint

- Branch: `feat/editor-ui-redesign`
- HEAD: `4b512e0835e014e6f994f319ae65c147126515b1`
- HEAD tree: `abd706c122f706defde8bc239907fb3dc7ef4119`
- Scoped current source/test content manifest: 35 ordinal-sorted repo-relative paths hashed as UTF-8 path, NUL, raw file bytes, NUL; SHA-256 `c2bdb44921fb593314cbfe29855a15e2b8d49a4782972fe5b2eaf1fdb9c344f1`.
- The worktree contains unrelated portfolio artifacts; preserve them and scope delivery explicitly.
- The pre-existing untracked literal `NUL` path is a 2,506-byte compressed Sass compilation artifact (SHA-256 `a879efec57ff6125a42302a74ab143ceffd5230aac4a76d82a49005b40658d60`), not source; it was inspected and deliberately left untouched rather than deleting prior work.

## Exact proof commands

1. Focused acceptance:

   `yarn test:app --watch=false packages/excalidraw/components/appContent/AppContent.test.tsx packages/excalidraw/components/LoadingMessage.test.tsx excalidraw-app/components/TopErrorBoundary.test.tsx excalidraw-app/CustomStats.test.tsx packages/excalidraw/components/hoc/withInternalFallback.test.tsx packages/excalidraw/tests/interactivity.test.tsx packages/excalidraw/tests/appChrome.integration.test.tsx excalidraw-app/components/AppWelcomeScreen.test.tsx excalidraw-app/share/ShareDialog.test.tsx packages/excalidraw/components/LibraryMenuItems.test.tsx excalidraw-app/components/AI.test.tsx excalidraw-app/components/AppSidebar.test.tsx packages/excalidraw/components/Stats/stats.test.tsx packages/excalidraw/components/DefaultSidebar.test.tsx packages/excalidraw/components/Sidebar/Sidebar.test.tsx packages/excalidraw/tests/library.test.tsx packages/excalidraw/components/TTDDialog/common.test.ts packages/excalidraw/components/TTDDialog/utils/TTDstreamFetch.test.ts excalidraw-app/tests/collab.test.tsx packages/excalidraw/tests/scrollConstraints.test.tsx`

   Result: 20 files, 231 tests passed. Existing non-failing test warnings were limited to known act/update warnings, disabled-tool messages, and undefined test Firebase config.

2. Final affected rerun after final source edits:

   `yarn test:app --watch=false excalidraw-app/components/TopErrorBoundary.test.tsx packages/excalidraw/components/appContent/AppContent.test.tsx packages/excalidraw/components/Stats/stats.test.tsx packages/excalidraw/tests/appChrome.integration.test.tsx packages/excalidraw/components/TTDDialog/common.test.ts packages/excalidraw/components/TTDDialog/utils/TTDstreamFetch.test.ts`

   Result: 6 files, 59 tests passed.

3. Required order:

   `yarn build:excalidraw`

   `yarn test:typecheck`

   Both passed. Run this pair once more if any product/test source changes after this handoff.

4. Changed TypeScript/TSX lint: `node_modules\.bin\eslint.cmd --max-warnings=0 <25 scoped TS/TSX paths>` passed.

5. Changed source/test/artifact formatting: `node_modules\.bin\prettier.cmd --check --ignore-path .eslintignore <39 scoped paths>` passed.

6. SCSS entry compilation passed for `packages/excalidraw/css/styles.scss`, `packages/excalidraw/css/app.scss`, and `excalidraw-app/index.scss`; only the repository's pre-existing Sass `@import` deprecation warning appeared.

## Durable contracts

- Host children remain mounted before internal fallbacks; tunnel identities, `withInternalFallback` per-editor cleanup, `defaultUIEnabled`, callback arguments, and LayerUI child/callback freshness remain owned at their current seams.
- Same-turn collaboration compatibility events remain synchronously captured at the owning App. Delayed loading and DOM work remain editor-scoped and clean up at the owner.
- `largeSurface` and `floatingSurface` retain frame, focus, settlement, modal/floating lifecycle, and sidebar policy. AppContent owns interior hierarchy/state/actions/bounds only.
- Editor container plus physical safe areas bound content. TTD/AI migrated viewport-unit sizing is absent; content uses bounded internal scrolling.
- Neutral wrappers stay pointer-pass-through and carry no viewport marker; real leaves remain interactive.
- The shared module is deep/internal and absent from the public entry; adapters remain explicit for welcome, share/collaboration, Library, AI, promo, loading/error, host, Stats, and browser fallback.
- No responsive-tier/tablet/landscape/RTL policy or screenshot-regression infrastructure was added; those remain downstream.

## Chrome evidence

- Canonical notes and screenshots: `rasen/changes/app-chrome-integration/evidence/implementation-final/`.
- Target `8E66ACC62CE92F045D7DD38AAB7C44A6` was closed after the final clean checks; the sticky proxy remains running and healthy.
- Clean reload recorded checker `0`, overlay `0`, console errors `0`.
