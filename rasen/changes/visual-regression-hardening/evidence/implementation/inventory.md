# Visual verification inventory

Recorded before product-code edits on 2026-08-13.

## Existing capabilities

- The root `vitest.config.mts` runs the established suite in JSDOM through `setupTests.ts`; the new runner therefore uses a separate Node configuration and does not alter that environment.
- The mounted-editor harness lives under `packages/excalidraw/tests/`, with `render()` waiting for both canvases and the editor loading state. The complete harness remains the authority for pointer-capability regressions.
- Development builds expose the existing `window.h` editor hook from `packages/excalidraw/components/App.tsx`. The visual host will wrap only that already-development-only seam and will not add a public package export or imperative production API.
- The shared Chrome proxy on `http://localhost:3456` supports health/target enumeration, fresh target creation, viewport emulation, navigation, activation through evaluation/performance calls, semantic snapshots, screenshots, coordinate clicks, keyboard input, console capture, performance metrics, and target close. It remains shared and is never started, stopped, or replaced by the runner.
- The repository has PNG metadata-chunk utilities but no pixel decoder/comparator. A narrow internal PNG codec will use Node `zlib` for 8-bit RGBA Chrome screenshots, so no dependency or license surface is added.
- Earlier change evidence is intentionally outside this child's canonical and role-owned roots and is never eligible for promotion.

## Selected paths

- Internal module: `scripts/visual-regression/`
- Node Vitest config: `vitest.visual.config.mts`
- Development-only host adapter: `excalidraw-app/visualRegressionHost.ts`
- Scenario manifest: `scripts/visual-regression/scenarios.ts`
- Canonical baselines: `scripts/visual-regression/baselines/`
- Update candidates: `scripts/visual-regression/candidates/`
- Noncanonical run results: `scripts/visual-regression/results/`
- Implementer evidence: `rasen/changes/visual-regression-hardening/evidence/implementation/`
- Implementer screenshots: `rasen/changes/visual-regression-hardening/evidence/implementation/screenshots/`

## Boundary decisions

- `yarn test:visual` is verify-only and has no canonical write branch.
- `yarn test:visual:update` writes candidates only; promotion is a separate explicit inspected operation.
- One typed manifest drives both the automated runner and generated human replay checklist.
- Browser setup uses fresh target ids and closes only those ids. The shared proxy process is outside runner lifecycle ownership.
- Product geometry is read only after the development visual debugger is disabled and its persisted/live state is scheduled for exact restoration.
