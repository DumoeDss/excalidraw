## Why

This fork's generator nodes are being integrated into the ACE Playground product, whose canvas is persisted as JSON to a backend (`/api/canvas`). Today an image generation result is **fetched and ingested as base64 into the binary `files` store** and the element gets a `fileId` — so every generated image bakes its full bytes into the persisted scene, ballooning the scene JSON and breaking that persistence. The product also has **no audio-generation backend** (only image + video), yet the toolbar still offers an "Audio generator" entry point. Finally, the consuming repo (a sibling on the same machine, no npm/GitHub registry) needs `@excalidraw/excalidraw` to **build cleanly and be installable locally**. This change makes image results render from a backend **URL reference** instead of embedded bytes, removes the audio-generation entry point (keeping the audio player + audio-as-reference), and locks down the local-consumption recipe.

## What Changes

- **Image results render from a URL reference, not embedded bytes.** Stop fetching the result into a `blob`/base64 `dataURL` and stop adding it to the `files` store. Instead persist only the result **URL** on the node (in `customData.generator`), and render it by priming the image cache directly from that URL. The persisted scene/`files` store therefore carries **no image bytes** — only a URL string. This mirrors the existing video/audio `src` URL-reference path.
  - Add a small **image-by-url render path**: the image render gate and the cache-priming in App + export resolve a generated image from its URL ref instead of requiring a `files`-backed `fileId`.
  - Restore re-primes the cache from the persisted URL so reloads render without re-fetching bytes into the store.
- **Disable the AUDIO generator creation entry point** (decision #1). Remove the toolbar "Audio generator" tool button so users can only create **image** and **video** generator nodes. **KEEP** the audio **player** node, audio **upload**, and audio **as a reference input** — only audio _generation node creation_ goes away. (No backend change; the host simply never creates an audio generator node.)
- **Package build + local-consumption recipe.** Ensure `yarn build:packages` produces clean, consumable dist output for `@excalidraw/excalidraw` and its workspace siblings, and document the exact no-registry recipe a sibling repo uses (the package is **not** self-contained — its `@excalidraw/*` workspace deps are externalized, so the recipe must cover all of them plus the fonts asset). Re-export the generator config/kind/ref types from the package entry so consumers get a single import surface.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `generator-nodes`: The **Result wiring into existing rendering** requirement changes for the `image` kind — results now render from a persisted **URL reference** (no bytes in the scene/`files` store) instead of being ingested into the files store with a `fileId`. The **Creating generator nodes** requirement changes — only `image` and `video` generator nodes can be created from the editor; the `audio` creation entry point is removed (audio player + audio reference inputs are unchanged). A new requirement covers **packaging / exported host-hook surface** so the package is consumable locally and exports the generator types.

## Impact

- **`@excalidraw/element`**: `src/types.ts` (add an optional persisted `result` URL field to `GeneratorConfig`); `src/image.ts` already accepts a URL `src` in `loadHTMLImageElement` (no change needed, but it is the linchpin); possibly `src/renderElement.ts` (image render gate to draw a URL-backed generated image).
- **`@excalidraw/excalidraw`**: `components/App.tsx` (`applyGeneratorResult` image branch → store URL ref + prime cache from URL instead of fetch/blob/`addFiles`; cache re-priming on restore/mount), `components/Actions.tsx` (remove the audio-generator `ToolButton`), `scene/export.ts` (prime export image cache from generated-image URL refs), `index.tsx` (re-export `GeneratorKind`, `GeneratorRef`, `GeneratorConfig`).
- **Persistence/restore**: `data/restore.ts` (`normalizeGeneratorCustomData` already round-trips `customData.generator`; ensure the new `result` URL field survives).
- **Build/packaging**: root `build:packages` script + `packages/excalidraw/package.json` exports; documented local `file:`/tarball consumption recipe (covers `@excalidraw/excalidraw` + `@excalidraw/common` + `@excalidraw/element` + `@excalidraw/math` + `@excalidraw/fractional-indexing`, plus copying `dist/prod/fonts`).
- **No breaking changes** to existing public props; video/audio player nodes, the image/video generator panel, audio upload, and audio-as-reference are unaffected. The image-result change is behavioral (URL ref vs. embedded bytes) and additive at the type level.
