## Context

The `generator-nodes` capability (already shipped in this fork) lets a single `image | video | audio` element carry a `customData.generator` config and run an async submit→poll job. When a job completes, `App.applyGeneratorResult(element, url)` (in `packages/excalidraw/components/App.tsx`) wires the result back:

- **video / audio** — set `element.src = url` + `status: "saved"`. The result is a **URL reference**; the bytes live at the backend. This is exactly the pattern we want for images.
- **image** — `fetch(url)` → `blob` → `getDataURL` (base64) → `addFiles([{ id: fileId, dataURL, ... }])` → set `element.fileId`. This **embeds the full image bytes** (base64) into the binary `files` store, which is serialized with the scene (`filterOutDeletedFiles` in `data/json.ts` keeps `files[fileId]` for every live `fileId`-bearing image). For ACE Playground's `/api/canvas` persistence this is fatal: the scene JSON balloons with base64.

How an image renders on canvas (`packages/element/src/renderElement.ts`, `case "image"`):

- The element draws only when `isInitializedImageElement(element)` (i.e. `fileId != null`) **and** `renderConfig.imageCache.get(element.fileId)` returns a loaded `HTMLImageElement`; otherwise it draws a placeholder. `isPendingImageElement` keys the same way.
- The cache is `imageCache: Map<FileId, { image, mimeType }>`. It is populated by `updateImageCache(...)` (`packages/element/src/image.ts`), which reads `files[fileId].dataURL` and calls `loadHTMLImageElement(dataURL)`.
- **Key fact:** `loadHTMLImageElement` does `image.src = dataURL` — the browser accepts **any** src string, including an `https://…` URL. The "dataURL" name is incidental; an HTTP URL loads fine. `DataURL` is a branded `string`, so a URL can be cast to it.
- Export (`packages/excalidraw/scene/export.ts`) builds its own fresh cache the same way: `updateImageCache({ imageCache: new Map(), fileIds: getInitializedImageElements(elements).map(e => e.fileId), files })`.

Confirmed exported host-hook surface (verbatim — change #3 in `../ace-playground` depends on these):

```ts
// packages/excalidraw/types.ts — ExcalidrawProps (all optional)
onListGeneratorModels?: (
  kind: GeneratorKind,
  opts: { signal: AbortSignal },
) => Promise<GeneratorModel[]>;
onGeneratorSubmit?: (
  req: GeneratorRequest,
  opts: { signal: AbortSignal },
) => Promise<{ jobId: string }>;
onGeneratorPoll?: (
  jobId: string,
  opts: { signal: AbortSignal },
) => Promise<GeneratorPoll>;
renderGeneratorPanel?: (ctx: GeneratorPanelContext) => JSX.Element | null;

// Types (packages/excalidraw/types.ts)
type GeneratorParam =
  | { type: "number"; key: string; label: string; min?: number; max?: number; step?: number; default?: number }
  | { type: "boolean"; key: string; label: string; default?: boolean }
  | { type: "string"; key: string; label: string; default?: string };
type GeneratorModel = { id: string; label: string; kind: GeneratorKind; params?: GeneratorParam[] };
type GeneratorRequest = { kind: GeneratorKind; prompt: string; model: string; params: Record<string, string | number | boolean>; refs: GeneratorRef[] };
type GeneratorPoll =
  | { status: "pending"; progress?: number }
  | { status: "done"; url: string }
  | { status: "error"; message?: string };
type GeneratorPanelContext = {
  element: NonDeletedExcalidrawElement;
  config: GeneratorConfig;
  models: GeneratorModel[] | "loading" | "error";
  setConfig: (patch: Partial<Pick<GeneratorConfig, "prompt" | "model" | "params" | "refs">>) => void;
  addFileRefs: () => Promise<void>;
  addSelectionRefs: () => void;
  removeRef: (index: number) => void;
  generate: () => void;
  cancel: () => void;
};

// packages/element/src/types.ts (re-exported via @excalidraw/excalidraw/element/types today)
type GeneratorKind = "image" | "audio" | "video";
type GeneratorRef = { type: "url"; url: string } | { type: "file"; url: string } | { type: "element"; elementId: string };
type GeneratorConfig = { kind: GeneratorKind; prompt: string; model: string | null; params: Record<string, string | number | boolean>; refs: GeneratorRef[]; state: GeneratorState };
```

Export surface today: `GeneratorParam`, `GeneratorModel`, `GeneratorRequest`, `GeneratorPoll`, `GeneratorPanelContext` are re-exported from `packages/excalidraw/index.tsx`. **`GeneratorKind`, `GeneratorRef`, `GeneratorConfig` are NOT re-exported from the package entry** — they live in `@excalidraw/element/types` (reachable type-only via `@excalidraw/excalidraw/element/types`). Change #3 needs `GeneratorKind` + `GeneratorConfig`, so we re-export them from the entry.

## Goals / Non-Goals

**Goals:**

- An image generation result renders from a backend **URL reference** with **zero image bytes** persisted into the scene/`files` store; the persisted node carries only a URL string.
- Reuse the existing image render + export pipeline as much as possible; the change must be minimal and not regress export, persistence/restore, or the media player nodes.
- Remove the **audio generator creation** entry point while keeping the audio player node, audio upload, and audio-as-reference.
- `@excalidraw/excalidraw` (and its `@excalidraw/*` workspace deps) build cleanly via `yarn build:packages`, with a documented no-registry local-consumption recipe and the generator types exported from the entry.

**Non-Goals:**

- Any `../ace-playground` change, the async-image backend work, or registry publishing.
- A new element type, or changing the video/audio result path.
- Offline/persistent caching of the generated image bytes (the URL is the source of truth; if the backend URL dies, the node shows a placeholder — acceptable, same as a dead video `src`).
- Guaranteeing pixel-perfect PNG export of a cross-origin generated image when the host's export canvas would be tainted (see Risks; the on-canvas render still works).

## Decisions

### D1 — Persist the result URL on `customData.generator.result`, never in the `files` store

Add an optional field to `GeneratorConfig`:

```ts
export type GeneratorConfig = {
  kind: GeneratorKind;
  prompt: string;
  model: string | null;
  params: Record<string, string | number | boolean>;
  refs: GeneratorRef[];
  state: GeneratorState;
  /** For image results: the backend URL the result renders from (ref-only;
      bytes are NOT embedded in the scene/files store). video/audio use `src`. */
  result?: string | null;
};
```

`customData.generator` already serializes with the scene and round-trips through `normalizeGeneratorCustomData` in `data/restore.ts`. A spread-based normalizer (`{ ...generator, state: ... }`) preserves unknown/extra fields, so `result` survives save/load with no schema bump — but we will set it explicitly in the normalizer's default shape for clarity and to keep `newGeneratorConfig` consistent (`result: null`).

**Why here, not in `files`:** the `files` store is the one place that bakes bytes into the scene. Keeping the URL in `customData.generator` (already part of the element) means the persisted scene contains only a URL string and the `files` map gets no entry for generated images at all.

_Alternative considered — URL-valued `files` entry (`files[fileId].dataURL = url`, keep `fileId`):_ least code (only `applyGeneratorResult` changes, render/export untouched since the cache loader accepts URLs). **Rejected as the primary persisted form** because it still emits a `files[fileId]` entry that `filterOutDeletedFiles` serializes with the scene, and it couples the ref to the binary-files contract the product is trying to avoid. We instead keep the URL on the generator config (D1) and use the cache purely as an in-memory render aid (D2).

### D2 — Render generated images from the URL via a synthetic, content-addressed cache key; `fileId` stays `null`

The element keeps `fileId: null` for a generated image (no `files` entry). To render, extend the image path to resolve a **generated-image URL** into the cache:

- Add a helper `generatedImageCacheKey(url)` that returns a stable `FileId`-typed key derived from the URL (e.g. a `genurl:` prefix + the URL). The `imageCache` Map is keyed by `FileId` (a branded string); a synthetic key is type-compatible after a cast, and the key never collides with real file digests because of the prefix.
- **Render gate** (`packages/element/src/renderElement.ts`, `case "image"` + `isPendingImageElement`): when `element.fileId == null` but the element is a generator image with a `result` URL (read via the existing generator helper / `customData.generator.result`), resolve `img`/pending from `renderConfig.imageCache.get(generatedImageCacheKey(url))` instead of returning the placeholder. Existing `fileId`-backed images are unchanged.
- **Cache priming (live editor)** — in `App.applyGeneratorResult` image branch and on restore/mount: call `loadHTMLImageElement(url as DataURL)`, store it under `generatedImageCacheKey(url)`, then `scene.triggerUpdate()`/`setState({})`. We read the loaded element's natural size to resize the idle square placeholder (same `getImageNaturalDimensions` flow as today). No `fetch`/`blob`/`getDataURL`/`addFiles` — those are removed from the image branch.
- **Cache priming (export)** — in `scene/export.ts`, after the existing `updateImageCache` call, also prime the export cache for each generated image element: load its `result` URL under `generatedImageCacheKey(url)` so `renderStaticScene` draws it. Use `crossOrigin = "anonymous"` when loading for export so the export canvas is not tainted if the backend sends CORS headers (best-effort; see Risks).

This keeps the diff small (one render-gate branch, one helper, the App branch rewrite, one export prime) and faithful to decision #2 (no bytes, no `files` entry).

_Alternative considered — change the render gate to accept a `src`/`url` on the image element itself (mirror media `src`):_ cleaner conceptually but touches the `ExcalidrawImageElement` type, restore, type guards, and more render code; larger blast radius. The generator already owns the result lifecycle, so storing the URL on `customData.generator` (D1) and resolving it in the render gate (D2) is more contained.

### D3 — `applyGeneratorResult` image branch becomes byte-free

New image branch (sketch):

1. `loadHTMLImageElement(url as DataURL)` → `HTMLImageElement` (URL load, no fetch/blob).
2. `imageCache.set(generatedImageCacheKey(url), { image, mimeType: MIME_TYPES.png })`.
3. Compute `getImageNaturalDimensions(el, image)` to resize the placeholder.
4. `scene.mutateElement(liveEl, { ...dimensions, status: "saved", customData: withGeneratorConfig(liveEl, { ...config, result: url, state: { status: "done" } }) })` — **`fileId` stays `null`**.
5. `store.scheduleAction(CaptureUpdateAction.IMMEDIATELY)` + `setState({})` (discrete, undoable — unchanged).
6. On load error → `state: { status: "error", message }` (unchanged behavior).

`status` stays a valid `ExcalidrawImageElement["status"]`; `"saved"` simply means "ready", consistent with media.

### D4 — Disable the AUDIO generator creation entry point (single location)

There is exactly **one** creation entry point per kind, in `packages/excalidraw/components/Actions.tsx` (lines ~1280–1311), gated by `app.props.renderGeneratorPanel`. Three `ToolButton`s call `app.createGeneratorNode("image" | "audio" | "video")`. **Remove the `"audio"` `ToolButton`** (the block with `data-testid="toolbar-audio-generator"`, icon `<GeneratorToolIcon base={AudioIcon} />`, title `toolBar.audioGenerator`). Image + video buttons remain.

- `App.createGeneratorNode` keeps its `(kind: GeneratorKind)` signature (still supports `"audio"` programmatically — harmless and keeps the imperative API stable; the LEAD's decision is specifically about the _creation entry point_ / tool). We do **not** narrow the type.
- Keep `AudioIcon`/`toolBar.audioGenerator` locale string if still referenced elsewhere; otherwise leaving the unused import would fail lint, so remove the now-unused `AudioIcon` import from Actions.tsx only if nothing else there uses it (the audio _upload_ tool lives in the media tool group and is a separate icon usage — verify before removing).
- **Unaffected:** audio _player_ node rendering, audio _upload_ tool, and audio _as a reference_ (`addFileRefs` accepts audio; `GeneratorRef` `file`/`element` refs are unchanged).

_Alternative considered — feature-flag prop (`disableGeneratorKinds?`):_ over-engineered for a single product with a fixed answer (no audio gen). A plain removal of the button is simplest and the panel hook still gates the whole generator UI. (If a flag is later wanted, it is additive.)

### D5 — Packaging: build all workspace packages + re-export generator types; document a no-registry recipe

**Build:** `yarn build:packages` (root) runs, in order: `build:common`, `build:fractional-indexing`, `build:math`, `build:element`, `build:excalidraw`. Each package's `build:esm` emits `dist/dev`, `dist/prod`, and `dist/types`. The package build (`scripts/buildPackage.js`) marks `@excalidraw/common`, `@excalidraw/element`, `@excalidraw/math`, `@excalidraw/fractional-indexing` as **`external`** — so `@excalidraw/excalidraw/dist` is **NOT self-contained**; it imports its siblings as separate packages at runtime. Therefore the consumption recipe must provide **all** of these packages, not just `@excalidraw/excalidraw`.

Runtime dependency closure the consumer needs:

- `@excalidraw/excalidraw` → workspace: `@excalidraw/common`, `@excalidraw/element`, `@excalidraw/math`; registry (resolve normally): `@excalidraw/laser-pointer`, `@excalidraw/mermaid-to-excalidraw`, `@excalidraw/random-username`, plus the other npm deps in its `package.json`.
- `@excalidraw/element` → workspace: `@excalidraw/common`, `@excalidraw/math`, `@excalidraw/fractional-indexing`.
- So the four workspace packages to ship locally are: **common, math, fractional-indexing, element, excalidraw** (5 total).

**Recommended local-consumption recipe (no registry):** `file:` dependencies pointing at each built package directory. In the sibling repo's `package.json`:

```jsonc
"dependencies": {
  "@excalidraw/excalidraw": "file:../excalidraw/packages/excalidraw",
  "@excalidraw/common":     "file:../excalidraw/packages/common",
  "@excalidraw/element":    "file:../excalidraw/packages/element",
  "@excalidraw/math":       "file:../excalidraw/packages/math",
  "@excalidraw/fractional-indexing": "file:../excalidraw/packages/fractional-indexing"
}
```

Then in the fork run `yarn build:packages` first (so every `dist/` exists), and in the sibling run `yarn install`. The `package.json` `"files": ["dist/*"]` + `exports` map resolve the built ESM + `.d.ts`. Also copy the fonts asset the editor needs at runtime (the in-repo Next example does `cp -r ../../packages/excalidraw/dist/prod/fonts ./public`) — the sibling must serve `@excalidraw/excalidraw/dist/prod/fonts` (copy into its public/static dir, mirroring the example). Import the stylesheet via `@excalidraw/excalidraw/index.css`.

_Alternative — `yarn pack` tarballs:_ `yarn workspace @excalidraw/excalidraw pack` (+ one per sibling) produces `.tgz` files the consumer references as `file:…/package.tgz`. Works, but you must pack and wire **all five** packages and re-pack on every change; `file:` to the built dirs is lower-friction for same-machine sibling dev. Document the tarball path as the fallback.

**Type export:** add `GeneratorKind`, `GeneratorRef`, `GeneratorConfig` to the `export type { … } from "@excalidraw/element/types"` (or a dedicated re-export) in `packages/excalidraw/index.tsx`, alongside the already-exported `GeneratorParam`/`GeneratorModel`/`GeneratorRequest`/`GeneratorPoll`/`GeneratorPanelContext`, so #3 imports everything from `@excalidraw/excalidraw`.

## Risks / Trade-offs

- **Export of a cross-origin generated image taints the canvas** → If the backend doesn't send permissive CORS headers, `canvas.toBlob()`/`toDataURL()` on export throws a security error. Mitigation: load export images with `crossOrigin = "anonymous"` (works when the backend sends `Access-Control-Allow-Origin`); ace-playground serves results from its own origin/`/api/materials/<key>`, so same-origin export should be clean. On-canvas rendering is unaffected (tainting only blocks read-back, not drawing). Out-of-scope to fully solve here; documented for #3.
- **Backend URL expiry / network failure** → a `result` URL that 404s renders the placeholder (same failure mode as a dead media `src`). Acceptable; the node still carries prompt/model to regenerate.
- **Cache memory** → generated images stay in the in-memory `imageCache` under `genurl:` keys for the session; bounded by the number of generated images, same order as before (we previously cached by `fileId`). No persistence growth.
- **`result` field round-trip** → if `normalizeGeneratorCustomData` ever stops spreading unknown fields, `result` would drop on restore. Mitigation: set `result` explicitly in the normalizer default shape and in `newGeneratorConfig`, and add a restore round-trip test.
- **Removing `AudioIcon` import** → if `AudioIcon` is unused after removing the button, leaving it trips lint; if it's still used by the audio-upload tool, removing it breaks the build. Mitigation: verify usages before deleting the import.
- **Non-self-contained package** → consumers who only install `@excalidraw/excalidraw` get unresolved `@excalidraw/element` etc. Mitigation: the recipe explicitly lists all five `file:` deps and is the documented contract for #3.

## BUILD note (apply stage — verified against built output)

`yarn build:packages` was run in the fork and completed clean. Every workspace package emitted `dist/dev`, `dist/prod`, and `dist/types`:

- `packages/common/dist/{dev,prod,types}`
- `packages/fractional-indexing/dist/{dev,prod,types}`
- `packages/math/dist/{dev,prod,types}`
- `packages/element/dist/{dev,prod,types}`
- `packages/excalidraw/dist/{dev,prod,types}`

Verified in the built output:

- `packages/excalidraw/dist/types/excalidraw/index.d.ts` re-exports `GeneratorKind, GeneratorRef, GeneratorConfig` from `@excalidraw/element/types` (the #7 export gap is closed).
- `packages/excalidraw/dist/types/element/src/types.d.ts` carries `GeneratorConfig.result?: string | null`.
- `packages/excalidraw/dist/types/element/src/image.d.ts` declares `generatedImageCacheKey: (url: string) => FileId`.
- `packages/excalidraw/dist/prod/index.js` imports `@excalidraw/element` as an external module (confirms the package is NOT self-contained → consumer needs all five workspace packages).
- `packages/excalidraw/dist/prod/index.css` and `packages/excalidraw/dist/prod/fonts/` exist (stylesheet + fonts assets the consumer must serve).

### Exact no-registry local-consumption recipe (paths change #3 uses)

In `../ace-playground/package.json` add these five `file:` deps (sibling repos, same machine, no registry/auth):

```jsonc
"dependencies": {
  "@excalidraw/excalidraw":          "file:../excalidraw/packages/excalidraw",
  "@excalidraw/common":              "file:../excalidraw/packages/common",
  "@excalidraw/element":             "file:../excalidraw/packages/element",
  "@excalidraw/math":                "file:../excalidraw/packages/math",
  "@excalidraw/fractional-indexing": "file:../excalidraw/packages/fractional-indexing"
}
```

Steps:

1. In the fork: `yarn build:packages` (so every `dist/` exists). Re-run after any fork change.
2. In `../ace-playground`: `yarn install` (each package's `"files": ["dist/*"]` + `exports` map resolve the built ESM + `.d.ts`).
3. Copy fonts into the sibling's static/public dir so the editor serves them at runtime: `cp -r ../excalidraw/packages/excalidraw/dist/prod/fonts <sibling>/public/` (mirrors the in-repo Next example).
4. Import styles once: `import "@excalidraw/excalidraw/index.css";`.

Fallback (registry-free tarballs): `yarn workspace @excalidraw/<pkg> pack` for each of the five packages → `.tgz` files referenced as `file:…/package.tgz`. Works but you must pack + rewire all five and re-pack on every change; `file:` to the built dirs is lower friction for same-machine dev.
