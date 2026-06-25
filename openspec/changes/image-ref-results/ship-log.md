# Ship Log — image-ref-results (fork repo)

## Disposition: COMMITTED LOCALLY on fork branch `feat/image-ref-results` (DumoeDss/excalidraw)

Portfolio child #1 of 3 (`excalidraw-canvas-integration`). No push/deploy (the package is consumed locally by #3).

## What shipped
- **Image generator results → URL reference (byte-free)**: result URL stored on `customData.generator.result`,
  `fileId` stays null, rendered via a synthetic content-addressed cache key `generatedImageCacheKey(url)`
  (`loadHTMLImageElement` accepts the URL). NO image bytes enter the scene/`files` store → `/api/canvas`-safe.
  Render gate + `isPendingImageElement` resolve fileId-null generator images; restore preserves `result`; cache
  re-primed on mount AND on the public `updateScene` path (M1 fix — the path #3 uses to load a saved canvas);
  PNG export primes with `crossOrigin="anonymous"`; SVG export skips byte-free generator images gracefully.
- **Audio generation disabled** (decision #1): removed the audio generator toolbar button; audio upload tool +
  audio player node + audio-as-reference all retained.
- **Type re-exports** for #3: `GeneratorKind`, `GeneratorRef`, `GeneratorConfig` from the package entry.
- **Package builds** (`yarn build:packages`, all 5 packages) for local consumption by #3.

## Review outcome
- verify: NEEDS-FIXES — 1 Major (M1: updateScene didn't re-prime the cache — the exact #3 load path), 2 Minor, 1 Trivial.
- review-loop round 1: M1 + m2 fixed, m1 documented, t1 accepted-known. Non-author re-confirmed CLEAN.
- Gates: typecheck clean; generator 12/12 (+1 new updateScene test), restore/image/export green; `yarn build:packages` succeeds.

## Local-consumption recipe (for change #3)
In `../ace-playground/package.json`, five `file:` deps → `@excalidraw/{excalidraw,common,element,math,fractional-indexing}`
at `file:../excalidraw/packages/<pkg>`. Run `yarn build:packages` in the fork, then install in ace-playground;
copy `dist/prod/fonts` into ace-playground's `public/`; `import "@excalidraw/excalidraw/index.css"`. (Tarball `yarn pack` fallback.)

## Confirmed exported host-hook surface (for #3)
Props: `onListGeneratorModels`, `onGeneratorSubmit`, `onGeneratorPoll`, `renderGeneratorPanel`.
Types: `GeneratorParam`, `GeneratorModel`, `GeneratorRequest`, `GeneratorPoll`, `GeneratorPanelContext`, `GeneratorKind`, `GeneratorRef`, `GeneratorConfig`.

## ⚠️ Human browser pass (logic/types/build confirmed; runtime not headless-testable)
Generated image actually painting from a backend URL; reloaded scene re-rendering generated images; PNG export of a same-origin generated image.
