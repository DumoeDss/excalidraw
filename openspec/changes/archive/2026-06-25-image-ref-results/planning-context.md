# Planning Context — image-ref-results (seeded by LEAD)

## Where this fits

This is change #1 of a 3-change cross-repo portfolio (`excalidraw-canvas-integration`) that integrates THIS Excalidraw fork's generator/media nodes into the ACE Playground product (a sibling repo at `../ace-playground`, a Cloudflare Worker backend + React frontend that does Seedance video + WaveSpeed image generation). This change is in the FORK repo only. It must land before the frontend integration (#3).

## User intent for THIS change (two locked decisions + packaging)

1. **Decision #2 — results are URL references, not embedded bytes.** The generator result-wiring currently ingests an image result URL into Excalidraw's binary `files` store and sets `fileId` (so the image becomes a normal exportable image element). For our system the canvas/scene must store **only references (a backend URL/key), never blobs** — otherwise the scene JSON balloons and our `/api/canvas` persistence breaks. So: **make image generator results render from a URL reference (like the video/audio `src` path) WITHOUT putting the image bytes into the persisted scene.** Investigate the result-wiring code (the "Result wiring into existing rendering" requirement) + how image elements render (`fileId`/files store vs a URL) and choose the least-invasive change that (a) renders the image result, (b) persists only a URL/ref, (c) keeps export working as well as possible. If a small new "image-by-url" rendering path is needed, add it.
2. **Decision #1 — no audio generation.** Our backend cannot generate audio (only image + video). So **disable / hide the AUDIO generator** entry point (the "Audio generator" tool/creation). KEEP the audio **player** node and audio as a **reference input** (those are unaffected — audio upload/playback stays). Only the audio-_generation_ node creation should go away (or be feature-flagged off).
3. **Packaging for local consumption (no publish).** Change #3 (in ../ace-playground) will consume this fork's `@excalidraw/excalidraw` package via a **local tarball / file dependency** (sibling repos, same machine — NO npm/GitHub registry, NO auth). So this change must ensure the package **builds cleanly** (`yarn build:packages` / the package's `build:esm`) and document the exact consumption recipe (e.g. `yarn workspace @excalidraw/excalidraw pack` → a `.tgz` path, or a `file:` reference to the built `dist`). Confirm the built package EXPORTS the generator host-hook types/props that #3 needs: `renderGeneratorPanel`, `onListGeneratorModels`, `onGeneratorSubmit`, `onGeneratorPoll`, and the types `GeneratorModel`, `GeneratorRequest`, `GeneratorPoll`, `GeneratorConfig`, `GeneratorKind` (verify their exact names/signatures from `packages/excalidraw/index.tsx` + `types.ts`).

## What this fork already has (built by prior commits — read these)

- `openspec/specs/generator-nodes/spec.md` — the canonical contract (generator config in `customData.generator`; selection-anchored `renderGeneratorPanel`; `onListGeneratorModels`/`onGeneratorSubmit`/`onGeneratorPoll`; result wiring per kind; refs from files + selection).
- `packages/element/src/generator.ts` — `getGeneratorConfig`/`newGeneratorConfig`/`withGeneratorConfig`; `GeneratorConfig = { kind, prompt, model, params, refs, state }`.
- `packages/element/src/types.ts` — `GeneratorKind`, `GeneratorConfig`, element type additions.
- `packages/excalidraw/types.ts` + `index.tsx` — the host-hook props/types exported from the package.
- `packages/excalidraw/components/App.tsx` — the generation lifecycle (submit→poll), selection-anchored panel, result wiring (THIS is where image-result→files-store likely lives; the target of decision #2).
- `packages/excalidraw/components/MediaViewer.tsx` + `packages/element/src/renderElement.ts` — media (video/audio) rendering via `src` (the URL-ref pattern image should mirror).
- `excalidraw-app/data/generators.ts` — the MOCK backend (not part of this change; #3 replaces it).
- `excalidraw-app/components/GeneratorPanel.tsx` — the example panel (host-owned; #3 ports it).
- Creation entry points for the 3 generator kinds (the "Creating generator nodes" requirement) — find where the audio generator tool/action is registered (Actions.tsx / App.tsx / icons) to disable it (decision #1).

## Scope (this change ONLY)

IN: (a) image-result-as-URL-ref rendering + ref-only persistence; (b) disable audio generator creation (keep audio player + audio refs); (c) ensure package builds + document the local-consumption recipe + confirm exported hook types. OUT: any backend work; the ace-playground frontend integration (#3); the async-image backend (#2); publishing to a registry. Do NOT break the existing video/audio player nodes or the image/video generator panel.

## Quality bar

- Keep the change minimal + within the fork's conventions (TypeScript strict; run `yarn test:typecheck` and the existing tests; `yarn fix` for lint/format).
- Don't regress export, persistence/restore, or the media player nodes.
- Update the `generator-nodes` spec (or add a delta) for the image-ref + no-audio-gen behavior changes.
- The package must build so #3 can install it locally.

## Reference

Full portfolio + decisions: `../ace-playground/openspec/changes/excalidraw-canvas-integration/portfolio-run.json`. Integration contract recap: image/video generation are async submit/poll; results are backend URLs at `/api/materials/<key>`; audio is upload+player+reference only (no generation).

---

## PLANNER findings (propose stage — durable, verbatim where noted)

### Image result-wiring location (target of decision #2)

`packages/excalidraw/components/App.tsx` → `private applyGeneratorResult(element, url)` (~L12930). The `element.type === "image"` branch (~L12959–13033) is the offender: it `fetch(url)` → `blob` → `getDataURL` (base64) → `addFiles([{ id: fileId, dataURL, ... }])` → `mutateElement({ fileId, status: "saved" })`. That base64 lands in the binary `files` store which `data/json.ts` `filterOutDeletedFiles` serializes with the scene → scene JSON balloons. The video/audio branch (~L12940) is the model to follow: it just sets `src` + `status: "saved"` (URL ref, bytes stay at backend).

### How images render (why the ref approach works)

- `packages/element/src/renderElement.ts` `case "image"` (~L482) draws only when `isInitializedImageElement` (= `fileId != null`, see `typeChecks.ts` L37-41) AND `renderConfig.imageCache.get(fileId)` is a loaded `HTMLImageElement`; else placeholder. `isPendingImageElement` (~L86) keys the same way.
- `imageCache: Map<FileId, {image, mimeType}>` is populated by `updateImageCache` in `packages/element/src/image.ts` (L36), which reads `files[fileId].dataURL` and calls `loadHTMLImageElement(dataURL)` (L21). **LINCHPIN:** that helper does `image.src = dataURL` — the browser accepts any src string incl. an `https://…` URL. `DataURL` is a branded `string` (castable). So an image can render straight from a URL with no bytes in the store.
- Export (`packages/excalidraw/scene/export.ts` `exportToCanvas` ~L237) builds a fresh cache the same way: `updateImageCache({ imageCache: new Map(), fileIds: getInitializedImageElements(elements).map(e=>e.fileId), files })`.

### Chosen ref approach (design D1–D3)

Persist the result **URL on `customData.generator.result`** (new optional field on `GeneratorConfig`); keep `fileId: null`; render via a synthetic, content-addressed cache key `generatedImageCacheKey(url)` (`genurl:`-prefixed, cast to `FileId`). `applyGeneratorResult` image branch becomes byte-free (loadHTMLImageElement(url) → cache.set → resize via getImageNaturalDimensions → mutate with `result: url`, no fetch/blob/addFiles/fileId). Render gate + `isPendingImageElement` extended to resolve a `fileId==null` generator image with a `result` URL from the cache. Export + initial-scene-load re-prime the cache from `result` URLs (export uses `crossOrigin="anonymous"`). `customData.generator` already serializes + round-trips via `normalizeGeneratorCustomData` (restore.ts L419-442, spread-based so extra fields survive) → no schema bump; persisted scene/files carry ONLY a URL string. Rejected alt: URL-valued `files[fileId].dataURL` entry (least code, render/export untouched) — but still emits a serialized `files` entry, so it does not fully satisfy "scene stores only refs".

### Disable-audio location (decision #1)

EXACTLY ONE creation entry point per kind: `packages/excalidraw/components/Actions.tsx` lines ~1280–1311, gated by `!!app.props.renderGeneratorPanel`. Three `ToolButton`s call `app.createGeneratorNode("image"|"audio"|"video")`. Remove the `"audio"` button (`data-testid="toolbar-audio-generator"`, `<GeneratorToolIcon base={AudioIcon} />`, `title={t("toolBar.audioGenerator")}`). Leave `App.createGeneratorNode(kind: GeneratorKind)` (~App.tsx L13100) signature unchanged (still supports audio programmatically — harmless). Remove the now-unused `AudioIcon` import ONLY if nothing else in Actions.tsx uses it. UNAFFECTED: audio player node, audio upload tool, audio-as-reference.

### CONFIRMED exported host hooks + types (verbatim — #3 needs these)

From `packages/excalidraw/types.ts` `ExcalidrawProps` (all optional):

```
onListGeneratorModels?: (kind: GeneratorKind, opts: { signal: AbortSignal }) => Promise<GeneratorModel[]>;
onGeneratorSubmit?:     (req: GeneratorRequest, opts: { signal: AbortSignal }) => Promise<{ jobId: string }>;
onGeneratorPoll?:       (jobId: string, opts: { signal: AbortSignal }) => Promise<GeneratorPoll>;
renderGeneratorPanel?:  (ctx: GeneratorPanelContext) => JSX.Element | null;
```

Types: `GeneratorModel = { id, label, kind: GeneratorKind, params?: GeneratorParam[] }`; `GeneratorRequest = { kind, prompt, model: string, params: Record<string,string|number|boolean>, refs: GeneratorRef[] }`; `GeneratorPoll = {status:"pending";progress?:number} | {status:"done";url:string} | {status:"error";message?:string}`; `GeneratorPanelContext = { element, config, models, setConfig(patch), addFileRefs(), addSelectionRefs(), removeRef(i), generate(), cancel() }`; `GeneratorParam` = number|boolean|string variants with {type,key,label,...}. From `@excalidraw/element/types`: `GeneratorKind = "image"|"audio"|"video"`; `GeneratorRef = {type:"url";url} | {type:"file";url} | {type:"element";elementId}`; `GeneratorConfig = { kind, prompt, model: string|null, params, refs: GeneratorRef[], state }` (+ this change adds `result?: string|null`).

**EXPORT GAP (action in #7):** `index.tsx` re-exports `GeneratorParam, GeneratorModel, GeneratorRequest, GeneratorPoll, GeneratorPanelContext` from `./types` (L406-412). It does NOT re-export `GeneratorKind`, `GeneratorRef`, `GeneratorConfig` (those are only in `@excalidraw/element/types`, reachable via `@excalidraw/excalidraw/element/types`). #3 needs `GeneratorKind`+`GeneratorConfig` → this change re-exports them from the entry.

### Package build + local-consumption recipe (design D5)

- `yarn build:packages` (root) = `build:common && build:fractional-indexing && build:math && build:element && build:excalidraw`. Each `build:esm` emits `dist/{dev,prod,types}`. Test cmds: `yarn test:typecheck` (=tsc), `yarn test:app` (=vitest), `yarn fix`.
- **NOT self-contained:** `scripts/buildPackage.js` marks `@excalidraw/common`, `@excalidraw/element`, `@excalidraw/math`, `@excalidraw/fractional-indexing` as `external` — excalidraw's dist imports them as separate packages. So the consumer needs ALL FIVE workspace packages locally.
- Dependency closure: excalidraw→(common, element, math)+registry(laser-pointer 1.3.1, mermaid-to-excalidraw, random-username, …); element→(common, math, fractional-indexing 3.3.0). All workspace pkgs are version 0.18.0 except fractional-indexing 3.3.0.
- **Recommended recipe (no registry):** five `file:` deps in the sibling's package.json pointing at the built package dirs: `@excalidraw/excalidraw` → `file:../excalidraw/packages/excalidraw`, plus `@excalidraw/common`, `@excalidraw/element`, `@excalidraw/math`, `@excalidraw/fractional-indexing` → `file:../excalidraw/packages/<pkg>`. Run `yarn build:packages` in the fork first, then `yarn install` in the sibling. The pkg `"files":["dist/*"]` + `exports` map resolve built ESM + `.d.ts`. Copy fonts: `cp -r ../excalidraw/packages/excalidraw/dist/prod/fonts` into the sibling's public/static dir (the in-repo Next example does exactly this). Import styles via `@excalidraw/excalidraw/index.css`.
- **Fallback:** `yarn workspace @excalidraw/excalidraw pack` (+ one per sibling pkg) → `.tgz` files referenced as `file:…/package.tgz`. Works but must pack+rewire all 5 and re-pack on every change; `file:` to dirs is lower friction for same-machine dev.

### Artifacts produced (all validated `--strict`)

`proposal.md`, `design.md`, `specs/generator-nodes/spec.md` (MODIFIED: Result wiring + Creating generator nodes; ADDED: packaging/exports requirement), `tasks.md` (10 groups, 27 tasks). `openspec validate image-ref-results --strict` → valid; status 4/4 artifacts complete.
