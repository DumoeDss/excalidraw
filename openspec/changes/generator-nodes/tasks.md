## 1. Element model & helpers (@excalidraw/element)

- [x] 1.1 Add `GeneratorKind`, `GeneratorRef`, `GeneratorState`, `GeneratorConfig` types to `packages/element/src/types.ts`
- [x] 1.2 Add `isGeneratorElement(el)` guard to `packages/element/src/typeChecks.ts` (image/video/audio with `customData.generator`)
- [x] 1.3 Add `getGeneratorConfig(el)` / `newGeneratorConfig(kind)` helpers (centralized typed access to `customData.generator`)

## 2. Public API types (@excalidraw/excalidraw)

- [x] 2.1 Add `GeneratorRequest`, `GeneratorPoll`, `GeneratorParam`, `GeneratorModel`, `GeneratorPanelContext` types to `packages/excalidraw/types.ts`
- [x] 2.2 Add optional `onListGeneratorModels`, `onGeneratorSubmit`, `onGeneratorPoll`, `renderGeneratorPanel` to `ExcalidrawProps`
- [x] 2.3 Re-export new public types from `packages/excalidraw/index.tsx`

## 3. Job orchestration & generation state (App.tsx)

- [x] 3.1 Add an in-memory `Map<elementId, AbortController>` for in-flight jobs and a per-kind model cache
- [x] 3.2 Implement `startGeneration(element)`: call `onGeneratorSubmit` → set state `pending` → poll `onGeneratorPoll` on an interval (capped, abortable)
- [x] 3.3 Implement `cancelGeneration(element)`: abort the job, restore prior state
- [x] 3.4 Abort + ignore writes when the node is deleted or the editor unmounts; never write back to a missing element
- [x] 3.5 Implement `loadGeneratorModels(kind)`: lazy fetch + cache; expose loading/error to the panel

## 4. Result wiring (App.tsx)

- [x] 4.1 On `done` for video/audio: set `src` + saved status (reuse media overlay), mark `state.done`
- [x] 4.2 On `done` for image: ingest result URL into the file store (`generateIdFromFile`/`addFiles`/`fileId`), mark `state.done`
- [x] 4.3 On `error`: set `state.error` with message, leave any existing result intact

## 5. Selection-anchored panel + render hook

- [x] 5.1 Add a `GeneratorPanel` container component that anchors to an element via `sceneCoordsToViewportCoords` (zoom/pan aware)
- [x] 5.2 Render the panel only when a single generator node is selected and `renderGeneratorPanel` is provided
- [x] 5.3 Build the `GeneratorPanelContext` (config, models, `setConfig`, `addFileRefs`, `addSelectionRefs`, `removeRef`, `generate`, `cancel`) and pass it to the hook
- [x] 5.4 `setConfig` updates `customData.generator` via the scene (EVENTUALLY-captured / coalesced for undo; committed results captured IMMEDIATELY)

## 6. References (files + canvas selection)

- [x] 6.1 `addFileRefs`: open a picker, upload via `onMediaUpload`, append `{type:"file", url}` refs
- [x] 6.2 `addSelectionRefs`: append currently-selected elements (excluding the generator node) as `{type:"element", elementId}` refs
- [x] 6.3 Resolve element refs at submit time (media/image → src/dataURL; others → best-effort export or skip with warning)

## 7. Creation entry points

- [x] 7.1 Add "Image / Audio / Video generator" items to the More-tools dropdown (`components/Actions.tsx`)
- [x] 7.2 Implement creation: drop an idle generator node of the matching kind at viewport center, select it
- [x] 7.3 Add `locales/en.json` labels for the new tools

## 8. Serialization / restore

- [x] 8.1 Normalize `customData.generator` on restore (`data/restore.ts`): default missing fields, coerce a stale `pending` state to `idle` (jobs don't survive reload in v1)

## 9. App wiring (excalidraw-app)

- [x] 9.1 Add `excalidraw-app/data/generators.ts`: mock/example implementations of list-models, submit (create job), poll (returns done after N polls)
- [x] 9.2 Wire the four callbacks on `<Excalidraw>` in `excalidraw-app/App.tsx`
- [x] 9.3 Provide a minimal example `renderGeneratorPanel` in the app (prompt + model select + generate/cancel + refs) to exercise the hook

## 10. Tests

- [x] 10.1 Unit: `isGeneratorElement`, config helpers, restore normalization
- [x] 10.2 Unit/integration: generation lifecycle state transitions (idle→pending→done / →error / cancel / delete-mid-job)

## 11. Verification

- [x] 11.1 `yarn test:typecheck` clean
- [x] 11.2 ESLint clean on changed files; prettier clean
- [x] 11.3 `yarn test:app --watch=false` green (full suite, no regressions)
