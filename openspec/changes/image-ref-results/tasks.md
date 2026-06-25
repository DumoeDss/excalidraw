## 1. Generator config: add the `result` URL field (@excalidraw/element)

- [x] 1.1 Add optional `result?: string | null` to `GeneratorConfig` in `packages/element/src/types.ts` (with a doc comment: image-result URL ref; bytes are not embedded)
- [x] 1.2 Set `result: null` in `newGeneratorConfig` (`packages/element/src/generator.ts`) so new nodes have an explicit idle result
- [x] 1.3 Add a `generatedImageCacheKey(url: string): FileId` helper (e.g. `genurl:`-prefixed) in `packages/element/src/image.ts` (or alongside the generator helpers), returning a stable cache key cast to `FileId`

## 2. Render generated images from a URL ref (@excalidraw/element)

- [x] 2.1 In `packages/element/src/renderElement.ts` `case "image"`: when `element.fileId == null` and the element is a generator image with `customData.generator.result`, resolve the drawn image from `renderConfig.imageCache.get(generatedImageCacheKey(result))` (fall back to placeholder if not yet cached); leave the existing `fileId`-backed path untouched
- [x] 2.2 Update `isPendingImageElement` (same file) so a generator image with a `result` URL whose cache entry is missing/loading is treated as pending (placeholder), consistent with the new render gate

## 3. Result wiring: image branch becomes byte-free (@excalidraw/excalidraw App.tsx)

- [x] 3.1 Rewrite the `element.type === "image"` branch of `applyGeneratorResult` in `packages/excalidraw/components/App.tsx`: remove `fetch`/`blob`/`getDataURL`/`addFiles`/`fileId`; instead `loadHTMLImageElement(url as DataURL)`, store it in `imageCache` under `generatedImageCacheKey(url)`, compute natural dimensions via `getImageNaturalDimensions`
- [x] 3.2 `mutateElement` the live image node with the new dimensions, `status: "saved"`, `fileId` left `null`, and `customData: withGeneratorConfig(liveEl, { ...config, result: url, state: { status: "done" } })`; keep the `CaptureUpdateAction.IMMEDIATELY` + `setState({})` discrete-undo behavior
- [x] 3.3 Preserve the error path: on image load failure set `state: { status: "error", message }` and write no bytes
- [x] 3.4 Re-prime the cache for already-`done` image generator nodes on scene load/mount (so a restored scene renders without re-fetching): on initial scene load, for each generator image with a `result`, load the URL into `imageCache` under `generatedImageCacheKey(result)` and trigger a scene update

## 4. Export path renders URL-ref images (@excalidraw/excalidraw scene/export.ts)

- [x] 4.1 In `packages/excalidraw/scene/export.ts` `exportToCanvas`, after the existing `updateImageCache(...)` call, prime the export cache for generator image nodes that have a `result` URL: load each via `loadHTMLImageElement` (set `crossOrigin = "anonymous"`) under `generatedImageCacheKey(result)` so `renderStaticScene` draws them
- [x] 4.2 Verify SVG export path (if applicable) either embeds the URL image or degrades gracefully (placeholder) without throwing — confirmed: `staticSvgScene.ts` `case "image"` only emits an `<image>` when `isInitializedImageElement && files[fileId]`; a generator image (`fileId === null`) is skipped with no throw (graceful degradation; no bytes/URL embedded in SVG)

## 5. Restore round-trip for `result` (@excalidraw/excalidraw data/restore.ts)

- [x] 5.1 In `normalizeGeneratorCustomData` (`packages/excalidraw/data/restore.ts`) ensure the normalized generator config preserves `result` (default `result ?? null`) so the URL ref survives save/load unchanged

## 6. Disable the audio generator creation entry point (@excalidraw/excalidraw Actions.tsx)

- [x] 6.1 Remove the audio-generator `ToolButton` block (`data-testid="toolbar-audio-generator"`, title `toolBar.audioGenerator`, `onClick={() => app.createGeneratorNode("audio")}`) from `packages/excalidraw/components/Actions.tsx`; keep the image and video generator buttons
- [x] 6.2 Remove the now-unused `AudioIcon` import from `Actions.tsx` ONLY if no other usage remains in that file (verify audio-upload tool usage first); leave `createGeneratorNode`'s `(kind: GeneratorKind)` signature unchanged — `AudioIcon` is STILL used by the audio-upload media tool (`Actions.tsx:1142`), so the import is intentionally KEPT; `createGeneratorNode(kind: GeneratorKind)` unchanged
- [x] 6.3 Confirm the audio player node, audio upload tool, and audio-as-reference (`addFileRefs` / `GeneratorRef`) are untouched

## 7. Export generator types from the package entry (@excalidraw/excalidraw index.tsx)

- [x] 7.1 Re-export `GeneratorKind`, `GeneratorRef`, `GeneratorConfig` from `packages/excalidraw/index.tsx` (from `@excalidraw/element/types`), alongside the already-exported `GeneratorParam`/`GeneratorModel`/`GeneratorRequest`/`GeneratorPoll`/`GeneratorPanelContext`

## 8. Tests

- [x] 8.1 Update/extend `packages/excalidraw/tests/generator.test.tsx`: image generation `done` sets `customData.generator.result`, leaves `fileId` null, and adds no `files` entry (mock `onGeneratorSubmit`/`onGeneratorPoll`)
- [x] 8.2 Add a save/restore round-trip test asserting `result` survives and the scene `files` map has no entry for the generated image
- [x] 8.3 Add/adjust a test asserting the audio generator creation entry point is gone (toolbar has image + video generator buttons, no `toolbar-audio-generator`)
- [x] 8.4 Run `yarn test:typecheck` and `yarn test:app --watch=false` (at least the generator suite); fix regressions — typecheck clean; generator (11), restore (45), export (8), image (6) suites all pass

## 9. Package build + local-consumption recipe

- [x] 9.1 Run `yarn build:packages` in the fork and confirm `common`, `math`, `fractional-indexing`, `element`, `excalidraw` all emit `dist/{dev,prod,types}` with no errors — all 5 packages built clean; each has `dist/{dev,prod,types}`
- [x] 9.2 Verify `@excalidraw/excalidraw` dist resolves its externalized `@excalidraw/*` workspace deps and that the entry exports the generator types from 7.1 (type-check a tiny throwaway import or rely on `gen:types` output) — built `dist/types/excalidraw/index.d.ts` re-exports `GeneratorKind, GeneratorRef, GeneratorConfig` from `@excalidraw/element/types`; `GeneratorConfig.result?: string|null` + `generatedImageCacheKey` present in built element types; `dist/prod/index.js` imports `@excalidraw/element` as an external
- [x] 9.3 Document the exact no-registry consumption recipe in the change (already captured in design.md D5): five `file:` deps (`@excalidraw/excalidraw`, `@excalidraw/common`, `@excalidraw/element`, `@excalidraw/math`, `@excalidraw/fractional-indexing`), the fonts copy step (`dist/prod/fonts`), and the `index.css` import; note the `yarn pack` tarball fallback — recipe verified against built output (see BUILD note appended to design.md)

## 10. Lint / format / final validation

- [x] 10.1 Run `yarn fix` (lint + format) and resolve issues in changed files — ran `eslint --fix` on the 10 changed source files (clean) + `prettier --write` on the change markdown
- [x] 10.2 Run `openspec validate image-ref-results --strict` from the fork dir and confirm it passes — "Change 'image-ref-results' is valid"
