## MODIFIED Requirements

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

## ADDED Requirements

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
