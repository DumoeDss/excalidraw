## 1. Element model & helpers (@excalidraw/element)

- [ ] 1.1 Add `GeneratorKind`, `GeneratorRef`, `GeneratorState`, `GeneratorConfig` types to `packages/element/src/types.ts`
- [ ] 1.2 Add `isGeneratorElement(el)` guard to `packages/element/src/typeChecks.ts` (image/video/audio with `customData.generator`)
- [ ] 1.3 Add `getGeneratorConfig(el)` / `newGeneratorConfig(kind)` helpers (centralized typed access to `customData.generator`)

## 2. Public API types (@excalidraw/excalidraw)

- [ ] 2.1 Add `GeneratorRequest`, `GeneratorPoll`, `GeneratorParam`, `GeneratorModel`, `GeneratorPanelContext` types to `packages/excalidraw/types.ts`
- [ ] 2.2 Add optional `onListGeneratorModels`, `onGeneratorSubmit`, `onGeneratorPoll`, `renderGeneratorPanel` to `ExcalidrawProps`
- [ ] 2.3 Re-export new public types from `packages/excalidraw/index.tsx`

## 3. Job orchestration & generation state (App.tsx)

- [ ] 3.1 Add an in-memory `Map<elementId, AbortController>` for in-flight jobs and a per-kind model cache
- [ ] 3.2 Implement `startGeneration(element)`: call `onGeneratorSubmit` → set state `pending` → poll `onGeneratorPoll` on an interval (capped, abortable)
- [ ] 3.3 Implement `cancelGeneration(element)`: abort the job, restore prior state
- [ ] 3.4 Abort + ignore writes when the node is deleted or the editor unmounts; never write back to a missing element
- [ ] 3.5 Implement `loadGeneratorModels(kind)`: lazy fetch + cache; expose loading/error to the panel

## 4. Result wiring (App.tsx)

- [ ] 4.1 On `done` for video/audio: set `src` + saved status (reuse media overlay), mark `state.done`
- [ ] 4.2 On `done` for image: ingest result URL into the file store (`generateIdFromFile`/`addFiles`/`fileId`), mark `state.done`
- [ ] 4.3 On `error`: set `state.error` with message, leave any existing result intact

## 5. Selection-anchored panel + render hook

- [ ] 5.1 Add a `GeneratorPanel` container component that anchors to an element via `sceneCoordsToViewportCoords` (zoom/pan aware)
- [ ] 5.2 Render the panel only when a single generator node is selected and `renderGeneratorPanel` is provided
- [ ] 5.3 Build the `GeneratorPanelContext` (config, models, `setConfig`, `addFileRefs`, `addSelectionRefs`, `removeRef`, `generate`, `cancel`) and pass it to the hook
- [ ] 5.4 `setConfig` updates `customData.generator` via the scene (history-captured)

## 6. References (files + canvas selection)

- [ ] 6.1 `addFileRefs`: open a picker, upload via `onMediaUpload`, append `{type:"file", url}` refs
- [ ] 6.2 `addSelectionRefs`: append currently-selected elements (excluding the generator node) as `{type:"element", elementId}` refs
- [ ] 6.3 Resolve element refs at submit time (media/image → src/dataURL; others → best-effort export or skip with warning)

## 7. Creation entry points

- [ ] 7.1 Add "Image / Audio / Video generator" items to the More-tools dropdown (`components/Actions.tsx`)
- [ ] 7.2 Implement creation: drop an idle generator node of the matching kind at viewport center, select it
- [ ] 7.3 Add `locales/en.json` labels for the new tools

## 8. Serialization / restore

- [ ] 8.1 Normalize `customData.generator` on restore (`data/restore.ts`): default missing fields, coerce a stale `pending` state to `idle` (jobs don't survive reload in v1)

## 9. App wiring (excalidraw-app)

- [ ] 9.1 Add `excalidraw-app/data/generators.ts`: mock/example implementations of list-models, submit (create job), poll (returns done after N polls)
- [ ] 9.2 Wire the four callbacks on `<Excalidraw>` in `excalidraw-app/App.tsx`
- [ ] 9.3 Provide a minimal example `renderGeneratorPanel` in the app (prompt + model select + generate/cancel + refs) to exercise the hook

## 10. Tests

- [ ] 10.1 Unit: `isGeneratorElement`, config helpers, restore normalization
- [ ] 10.2 Unit/integration: generation lifecycle state transitions (idle→pending→done / →error / cancel / delete-mid-job)

## 11. Verification

- [ ] 11.1 `yarn test:typecheck` clean
- [ ] 11.2 ESLint clean on changed files; prettier clean
- [ ] 11.3 `yarn test:app --watch=false` green (full suite, no regressions)
