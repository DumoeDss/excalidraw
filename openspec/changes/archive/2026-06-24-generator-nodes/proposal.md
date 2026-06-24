## Why

Users want to generate images, audio, and video directly on the canvas from a prompt + model + parameters, then keep tweaking the inputs in place. The editor already has media (audio/video) and image nodes to display results; what's missing is a backend-agnostic way to drive AI generation and a per-node UI to author the generation inputs. We keep the library decoupled from any specific AI provider — exactly like the `onMediaUpload` contract added for media nodes.

## What Changes

- Add a **generator** capability layered onto the existing `image` / `video` / `audio` elements via a typed `customData.generator` payload (config + async job state). No new element type — a generator node *is* a media/image node that also remembers how it was generated.
- Add a backend-agnostic **props contract** the host implements:
  - `onListGeneratorModels(kind?)` — **dynamically fetch** available models + their parameter schema.
  - `onGeneratorSubmit(req)` → `{ jobId }` and `onGeneratorPoll(jobId)` → status — **async create-task + poll** lifecycle.
  - `renderGeneratorPanel(ctx)` — **render hook**: the host renders the entire prompt/model/params panel; the library only anchors it to the node, runs the job, and wires the result.
- When a generator node is **selected**, the library anchors a floating panel at the node (tracking zoom/pan) and renders the host panel; when **not selected** it shows just the generated media/image.
- **References**: a generator's inputs may include reference media — both **uploaded files** and **other elements selected on the canvas**. Refs are stored on the config and surfaced to the host panel.
- Library owns the job lifecycle: submit → poll until done/error → write the result URL into the node (video/audio → `src`; image → fetched into the files store), updating a visible `generation` state (idle / pending / done / error) for placeholder rendering.
- Creation entry points to drop an idle generator node of each kind.

Non-goals: shipping a built-in default panel UI (host-provided via the render hook), bundling a specific AI backend, streaming token-level previews.

## Capabilities

### New Capabilities
- `generator-nodes`: per-node AI generation for image/audio/video — the typed config/state model, the backend-agnostic host contract (list-models / submit / poll / render-panel), the selection-anchored panel, reference inputs (files + canvas elements), and result wiring into existing media/image rendering.

### Modified Capabilities
<!-- none: no existing openspec specs define requirements that change -->

## Impact

- **`@excalidraw/element`**: `types.ts` (typed `GeneratorConfig`/`GeneratorState` on `customData`), `typeChecks.ts` (`isGeneratorElement`).
- **`@excalidraw/excalidraw`**: `types.ts` (new `ExcalidrawProps` callbacks + `ExcalidrawImperativeAPI` additions), `components/App.tsx` (panel anchoring, job orchestration, result wiring, ref-from-selection, creation), a new generator panel container component, `data/restore.ts` (config/state normalization), `locales/en.json`.
- **`excalidraw-app`**: wires the four callbacks to a mock/example backend (job + poll), following the `media.ts` precedent.
- Builds on the just-added media nodes (reuses `<video>/<audio>` overlay and the image pipeline for results). No breaking changes to existing public API (all new props are optional).
