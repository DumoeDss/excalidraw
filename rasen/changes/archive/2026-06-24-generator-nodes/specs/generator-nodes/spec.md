## ADDED Requirements

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
WHEN a generation completes with a result URL, the editor SHALL apply it according to the node kind so the result renders through existing paths: for `video`/`audio`, set the element `src` and saved status (media overlay); for `image`, ingest the URL into the file store and set the element `fileId` so the result is a real, exportable image. The visible generation state SHALL drive a placeholder badge (pending spinner, error glyph) over the node.

#### Scenario: Video/audio result
- **WHEN** a video or audio generation completes with a URL
- **THEN** the node plays that media via the existing overlay and is marked saved

#### Scenario: Image result
- **WHEN** an image generation completes with a URL
- **THEN** the URL is ingested into the files store and the node renders as a normal image element

### Requirement: Reference inputs from files and canvas selection
The generation request SHALL support reference inputs. The panel context SHALL let the host add references by uploading files (stored as persistent-URL file refs via the existing upload contract) and by adding the currently selected canvas elements (stored as element refs, excluding the generator node itself), and SHALL let the host remove references. Element references SHALL be resolved to image/media data at submit time.

#### Scenario: Add an uploaded file reference
- **WHEN** the host calls `addFileRefs` and the user picks a file
- **THEN** the file is uploaded and appended to the config as a file reference

#### Scenario: Add selected elements as references
- **WHEN** the host calls `addSelectionRefs` while other elements are selected
- **THEN** those elements (excluding the generator node) are appended as element references

### Requirement: Creating generator nodes
The editor SHALL provide entry points to create an idle generator node for each kind (image, audio, video). A newly created generator node SHALL have an `idle` generation state, an empty prompt, no model, no result, and SHALL be selected on creation so its panel opens.

#### Scenario: Create an image generator
- **WHEN** the user chooses "Image generator" from the tools
- **THEN** an idle image generator node is placed on the canvas, selected, and its panel opens
