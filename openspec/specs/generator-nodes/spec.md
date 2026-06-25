# generator-nodes Specification

## Purpose
TBD - created by archiving change generator-nodes. Update Purpose after archive.
## Requirements
### Requirement: Generator configuration on a node
A generator node SHALL be an existing `image`, `video`, or `audio` element that carries a typed generator configuration under `customData.generator` containing its `kind`, `prompt`, `model`, `params`, `refs`, and async `state`. The configuration SHALL be serialized with the scene and restored on load. The system SHALL expose an `isGeneratorElement` check and helpers to read/update the configuration.

#### Scenario: Configuration persists across save and load
- **WHEN** a scene containing a generator node is serialized and restored
- **THEN** the node's `customData.generator` (prompt, model, params, refs, state) is preserved unchanged

#### Scenario: Identifying a generator node
- **WHEN** `isGeneratorElement` is called on an image/video/audio element that has `customData.generator`
- **THEN** it returns true, and false for any element lacking a generator config

### Requirement: Selection-anchored generation panel via render hook
WHEN a single generator node is selected, the editor SHALL render a floating panel anchored to that node's on-canvas position (tracking zoom, pan, and scroll) and SHALL populate it by calling the host-provided `renderGeneratorPanel` hook with a context exposing the node, its config, the available models, and callbacks to update config, manage references, generate, and cancel. WHEN the node is not selected, the editor SHALL NOT render the panel and SHALL show only the generated media/image (or its placeholder).

#### Scenario: Panel shown on selection
- **WHEN** a generator node becomes the sole selected element and `renderGeneratorPanel` is provided
- **THEN** the host panel is rendered anchored at the node and moves with the node under zoom/pan

#### Scenario: Panel hidden when not selected
- **WHEN** the generator node is deselected
- **THEN** the panel is removed and only the node's result/placeholder remains visible

#### Scenario: No render hook provided
- **WHEN** `renderGeneratorPanel` is not provided
- **THEN** the generator node still renders as a normal media/image node and no panel is shown

### Requirement: Dynamic model listing
The editor SHALL obtain the list of available models and their parameter schema by calling the host-provided `onListGeneratorModels(kind)` callback, fetching lazily when a panel for that kind first opens and caching the result per kind. The fetched models SHALL be passed to the render hook context.

#### Scenario: Models fetched on first panel open
- **WHEN** a generator panel of a given kind opens for the first time and `onListGeneratorModels` is provided
- **THEN** the editor calls `onListGeneratorModels(kind)` once, and provides the resolved models to the panel; a second open of the same kind reuses the cached list

#### Scenario: Model listing unavailable
- **WHEN** `onListGeneratorModels` is absent or rejects
- **THEN** the panel context reports models as empty/error and generation requiring a model is prevented

### Requirement: Asynchronous generation lifecycle
WHEN generation is started, the editor SHALL call `onGeneratorSubmit(request)` to create a job, then poll `onGeneratorPoll(jobId)` at an interval until it returns `done` or `error`, updating the node's `generator.state` to `pending` (with optional progress), then `done` or `error`. The poll loop SHALL be abortable and SHALL stop if the node is deleted or generation is cancelled. The editor SHALL ignore results for elements that no longer exist.

#### Scenario: Successful generation
- **WHEN** a user starts generation and the backend job completes
- **THEN** the node transitions `idle` → `pending` → `done`, and the result is applied to the node

#### Scenario: Cancel an in-flight job
- **WHEN** the user cancels generation while a job is pending
- **THEN** polling stops, the in-flight request is aborted, and the node's state returns to `idle` (or its prior committed state)

#### Scenario: Generation error
- **WHEN** the backend job fails or polling returns an error
- **THEN** the node's state becomes `error` with a message and the existing result (if any) is left intact

#### Scenario: Node deleted during generation
- **WHEN** a generator node is deleted while its job is pending
- **THEN** its poll loop is aborted and no result is written back

### Requirement: Result wiring into existing rendering

WHEN a generation completes with a result URL, the editor SHALL apply it according to the node kind so the result renders through existing paths: for `video`/`audio`, set the element `src` and saved status (media overlay); for `image`, the editor SHALL persist the result as a **URL reference** on the node's generator config (`customData.generator.result`) and render it from that URL, and SHALL NOT embed the image bytes into the binary `files` store or set a `fileId`. The image SHALL be loaded from the URL into the in-memory image cache (keyed by a stable, content-addressed key derived from the URL) so it draws through the existing image render path, and the node SHALL be resized to the result's natural aspect ratio. The visible generation state SHALL drive a placeholder badge (pending spinner, error glyph) over the node.

#### Scenario: Video/audio result

- **WHEN** a video or audio generation completes with a URL
- **THEN** the node plays that media via the existing overlay and is marked saved

#### Scenario: Image result is a URL reference, not embedded bytes

- **WHEN** an image generation completes with a URL
- **THEN** the URL is stored on the node's `customData.generator.result`, the node's `fileId` remains `null`, no entry is added to the `files` store, and the node renders the image loaded from that URL

#### Scenario: Image result persists without bloating the scene

- **WHEN** a scene containing a completed image generator node is serialized and restored
- **THEN** the serialized scene and `files` store contain no image bytes for that node (only the result URL on `customData.generator`), and on restore the node re-renders the image from that URL without re-ingesting bytes

#### Scenario: Image result load failure

- **WHEN** an image generation completes with a URL that fails to load
- **THEN** the node's state becomes `error` with a message and no bytes are written to the scene

### Requirement: Reference inputs from files and canvas selection
The generation request SHALL support reference inputs. The panel context SHALL let the host add references by uploading files (stored as persistent-URL file refs via the existing upload contract) and by adding the currently selected canvas elements (stored as element refs, excluding the generator node itself), and SHALL let the host remove references. Element references SHALL be resolved to image/media data at submit time.

#### Scenario: Add an uploaded file reference
- **WHEN** the host calls `addFileRefs` and the user picks a file
- **THEN** the file is uploaded and appended to the config as a file reference

#### Scenario: Add selected elements as references
- **WHEN** the host calls `addSelectionRefs` while other elements are selected
- **THEN** those elements (excluding the generator node) are appended as element references

### Requirement: Creating generator nodes

The editor SHALL provide entry points to create an idle generator node for the `image` and `video` kinds. The editor SHALL NOT provide a creation entry point for the `audio` kind (no audio generation). A newly created generator node SHALL have an `idle` generation state, an empty prompt, no model, no result, and SHALL be selected on creation so its panel opens. The audio **player** node, audio **upload**, and audio **as a reference input** SHALL remain available and unchanged.

#### Scenario: Create an image generator

- **WHEN** the user chooses "Image generator" from the tools
- **THEN** an idle image generator node is placed on the canvas, selected, and its panel opens

#### Scenario: Create a video generator

- **WHEN** the user chooses "Video generator" from the tools
- **THEN** an idle video generator node is placed on the canvas, selected, and its panel opens

#### Scenario: No audio generator entry point

- **WHEN** the generator tools are shown (because `renderGeneratorPanel` is provided)
- **THEN** no "Audio generator" tool/button is offered, and the user cannot create an audio generator node from the editor UI

#### Scenario: Audio player and reference inputs unaffected

- **WHEN** the user uploads an audio file or adds an audio element as a generation reference
- **THEN** the audio player node and audio-as-reference behavior work exactly as before, unaffected by the removal of audio generation

### Requirement: Package builds and is consumable locally without a registry

The `@excalidraw/excalidraw` package and its workspace dependencies SHALL build cleanly via the repository's package build, producing distributable output, and SHALL be consumable by a sibling repository on the same machine without any npm/GitHub registry. Because the package externalizes its `@excalidraw/*` workspace dependencies (they are not bundled into its dist), the consumption contract SHALL cover the full set of required workspace packages, not only `@excalidraw/excalidraw`. The package entry SHALL export the generator host-hook types needed by a consumer.

#### Scenario: Packages build cleanly

- **WHEN** `yarn build:packages` is run in the fork
- **THEN** `@excalidraw/common`, `@excalidraw/math`, `@excalidraw/fractional-indexing`, `@excalidraw/element`, and `@excalidraw/excalidraw` each produce their `dist` output (ESM + type declarations) without errors

#### Scenario: Local consumption without a registry

- **WHEN** a sibling repository declares local `file:` dependencies on the built `@excalidraw/excalidraw` package and its required workspace siblings (`@excalidraw/common`, `@excalidraw/element`, `@excalidraw/math`, `@excalidraw/fractional-indexing`) and installs
- **THEN** the package and its workspace dependencies resolve from the local built output (no registry access), and the editor's runtime assets (e.g. fonts under `dist/prod/fonts`, the `index.css` stylesheet) are available to the consumer

#### Scenario: Generator types are exported from the package entry

- **WHEN** a consumer imports from `@excalidraw/excalidraw`
- **THEN** the generator host-hook types `GeneratorModel`, `GeneratorRequest`, `GeneratorPoll`, `GeneratorPanelContext`, `GeneratorKind`, `GeneratorRef`, and `GeneratorConfig` are all available from the package entry

