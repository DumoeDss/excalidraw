## Context

The editor already renders `image`, `video`, and `audio` nodes. Media nodes were just added with a backend-agnostic upload contract (`onMediaUpload`) and an HTML-overlay player anchored to the canvas (`renderMediaPlayers`). Generator nodes extend this: a node remembers the prompt/model/params it was generated from, can (re)generate via a host-supplied backend, and shows the result like any media/image node.

Per the user's locked decisions:
1. Generation is **asynchronous**: create a job, then poll for the result.
2. Models + their parameter schema are **fetched dynamically** from the host.
3. The generation **panel UI is host-rendered** (render hook), not built into the library.
4. References support **uploaded files** and **elements selected on the canvas**.

All new public API is optional and additive — no breaking changes.

## Goals / Non-Goals

**Goals:**
- A typed, serializable generator payload layered onto existing image/video/audio elements.
- A small, backend-agnostic host contract: list-models, submit-job, poll-job, render-panel.
- Library owns: panel anchoring (zoom/pan aware), the submit→poll→apply-result lifecycle, generation state for placeholder rendering, and reference collection.
- Reuse existing rendering: video/audio results via the media overlay; image results via the existing image/file pipeline.

**Non-Goals:**
- A built-in default panel UI (host provides it via the render hook).
- Bundling any AI provider or model catalog.
- Token-level streaming previews (poll returns coarse progress only).
- A 4th element type — a generator node *is* an image/video/audio element.

## Decisions

### D1 — Layer on existing elements via `customData.generator` (no new element type)
`customData` already persists and round-trips. A generator node is an `image | video | audio` element carrying:

```ts
// @excalidraw/element types
export type GeneratorKind = "image" | "audio" | "video";

export type GeneratorRef =
  | { type: "url"; url: string }
  | { type: "file"; url: string }                 // uploaded reference (persistent URL)
  | { type: "element"; elementId: string };       // another canvas element used as input

export type GeneratorState =
  | { status: "idle" }
  | { status: "pending"; jobId: string; progress?: number }
  | { status: "done" }
  | { status: "error"; message?: string };

export type GeneratorConfig = {
  kind: GeneratorKind;
  prompt: string;
  model: string | null;                            // null until a model is chosen
  params: Record<string, string | number | boolean>;
  refs: GeneratorRef[];
  state: GeneratorState;
};

// stored as element.customData = { generator: GeneratorConfig }
```

`isGeneratorElement(el)` = media/image element whose `customData.generator` is present.

**Why over a new `generator` element type:** a new type means ~50 switch touchpoints (we just paid that for media). Layering on `customData` is additive, auto-persists, and lets the result render through the existing image/media paths untouched. **Alternative considered:** a dedicated `generator` type — rejected for cost and because the result genuinely *is* an image/media node.

### D2 — Async job + poll contract (decision #1)
```ts
// ExcalidrawProps
export type GeneratorRequest = {
  kind: GeneratorKind;
  prompt: string;
  model: string;
  params: Record<string, string | number | boolean>;
  refs: GeneratorRef[];
};
export type GeneratorPoll =
  | { status: "pending"; progress?: number }
  | { status: "done"; url: string }                // result media/image URL
  | { status: "error"; message?: string };

onGeneratorSubmit?: (req: GeneratorRequest, opts: { signal: AbortSignal })
  => Promise<{ jobId: string }>;
onGeneratorPoll?: (jobId: string, opts: { signal: AbortSignal })
  => Promise<GeneratorPoll>;
```
The library runs the poll loop (interval with backoff, capped, abortable), updating `state.progress`. **Why:** matches real image/video generation backends (long-running, queued). **Alternative:** a single `Promise<result>` — rejected: blocks for minutes, no progress, no cancel.

### D3 — Dynamic model fetch (decision #2)
```ts
export type GeneratorParam =
  | { type: "select"; key: string; label: string; options: { value: string; label: string }[]; default?: string }
  | { type: "number"; key: string; label: string; min?: number; max?: number; step?: number; default?: number }
  | { type: "boolean"; key: string; label: string; default?: boolean }
  | { type: "string"; key: string; label: string; default?: string };
export type GeneratorModel = { id: string; label: string; kind: GeneratorKind; params?: GeneratorParam[] };

onListGeneratorModels?: (kind: GeneratorKind, opts: { signal: AbortSignal })
  => Promise<GeneratorModel[]>;
```
The library fetches models lazily (when a generator panel first opens for a kind), caches per kind in editor state, and passes them to the render hook. The `GeneratorParam` schema is exposed so a host panel *can* render typed controls, but the library does not mandate it. **Alternative:** static `generatorModels` prop — rejected per decision #2 (host catalog is dynamic).

### D4 — Render hook for the panel (decision #3)
```ts
export type GeneratorPanelContext = {
  element: NonDeletedExcalidrawElement;
  config: GeneratorConfig;
  models: GeneratorModel[] | "loading" | "error";
  setConfig: (patch: Partial<Pick<GeneratorConfig, "prompt" | "model" | "params" | "refs">>) => void;
  addFileRefs: () => Promise<void>;          // opens a file picker, uploads via onMediaUpload, appends file refs
  addSelectionRefs: () => void;              // appends currently-selected elements as element refs
  removeRef: (index: number) => void;
  generate: () => void;                      // starts submit→poll
  cancel: () => void;                        // aborts an in-flight job
};
renderGeneratorPanel?: (ctx: GeneratorPanelContext) => JSX.Element | null;
```
The library renders a floating, zoom/pan-anchored container at the element (reusing `sceneCoordsToViewportCoords`, the embeddable/Hyperlink positioning pattern) whenever a generator node is the sole selection, and fills it with `renderGeneratorPanel(ctx)`. The host writes only the form. **Why:** decision #3 — maximal host flexibility; the library avoids owning form styling/validation. **Alternative:** library-rendered standard form from `GeneratorParam` — deferred (could be a later default panel; the schema is already exposed to enable it).

### D5 — Reference inputs (decision #4)
`addFileRefs()` opens a picker, uploads each file via the existing `onMediaUpload` (persistent URL), and appends `{type:"file", url}`. `addSelectionRefs()` reads `appState.selectedElementIds` (excluding the generator node itself) and appends `{type:"element", elementId}`. Element refs are resolved to data at submit time: image/media elements → their `src`/file dataURL; other elements → exported to an image (reuse `exportToBlob` on the single element) and uploaded. **Why:** both are natural "use this as input" gestures on a whiteboard. **Trade-off:** exporting arbitrary elements to an image at submit is best-effort; v1 may pass only media/image element refs and skip non-exportable ones with a warning.

### D6 — Result wiring
On `poll → done { url }`, by kind:
- `video` / `audio`: set `element.src = url`, `status = "saved"` (reuses the media overlay) and `generator.state = { status: "done" }`.
- `image`: fetch `url` → `File` → run the existing image init path (`generateIdFromFile` + `addFiles` + `fileId`) so the result is a real, exportable/croppable image; set `generator.state = done`.
Generation `state` also drives a placeholder badge (spinner on `pending`, error glyph on `error`) layered on the existing canvas placeholder.

### D7 — Creation
Add generator entry points in the "More tools" dropdown (alongside Video/Audio): "Image generator", "Audio generator", "Video generator". Each drops an **idle** node of the matching element type (`image`/`video`/`audio`, no `src`/`fileId` yet) with `customData.generator = { kind, prompt:"", model:null, params:{}, refs:[], state:{status:"idle"} }`, then selects it so the panel opens. No new `ToolType` is needed if creation places at viewport center on menu-select (mirrors how the image tool inserts).

## Risks / Trade-offs

- **No host callbacks provided** → generator nodes are inert. Mitigation: `isGeneratorElement` still renders as a normal media/image node; the panel shows a "generation not configured" state when `onGeneratorSubmit` is absent.
- **Poll loop lifecycle** (component unmount, element deletion, tab hidden mid-job) → leaked intervals / stale writes. Mitigation: keep an in-memory `Map<elementId, AbortController>`; abort on delete/unmount; ignore results for deleted elements; persist only `jobId` so a reload can resume polling.
- **Element refs at submit** for non-media elements require an export step. Mitigation: v1 resolves media/image element refs directly and exports others best-effort; document the limitation.
- **customData is `Record<string, any>`** (untyped at the element base) → no compile-time guarantee. Mitigation: centralize access behind `getGeneratorConfig(el)` / `setGeneratorConfig(el, patch)` helpers with the `GeneratorConfig` type.
- **Collaboration**: `state.pending` with a `jobId` is peer-specific; another client can't poll a job it didn't submit. Mitigation: treat in-flight generation as local; only the committed result (`src`/`fileId` + `state.done`) is meaningful cross-peer. Document.
- **Result URL durability/visibility** is the host's responsibility (same caveat as media URLs).
