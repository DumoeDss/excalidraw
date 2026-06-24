# Generator Nodes — Independent Code Review

---

## Re-review (verification pass, against CURRENT code)

Verified each fix against the working tree, not the fixer's summary. **One Major is NOT genuinely resolved.**

| Finding | Verdict | Notes |
|---|---|---|
| **B1** deleted-node write-back | ✅ **Resolved** | `pollGeneration.tick` now uses `getNonDeletedElement` for the initial element, the post-poll `el`, and the catch branch (`App.tsx:12680,12701,12729`); on null → `delete(job)` + `controller.abort()` + return. `startGeneration` post-submit check uses `getNonDeletedElement` (12638). `applyGeneratorResult` re-fetches via `getNonDeletedElement` for video/audio (12773) and re-checks liveness **twice** in the image branch — after `addFiles` (12811) and after the image-load await (12832). No path writes to a soft-deleted element. New regression test `deletes mid-job…` asserts poll never ran / `src` null / state ≠ done. **No remaining write-to-deleted path.** |
| **M1** generated image not resized | ❌ **NOT resolved** | New code reads `this.imageCache.get(fileId)?.image` (12825) — but at that point the file was just added via `addFiles` while the element still has **no `fileId`**, so `addNewImagesToImageCache` (which filters on `isInitializedImageElement`, i.e. requires `fileId`) **never loads this file into `imageCache`**. So `cached`/`imageHTML` is `undefined`, `dimensions` stays `null`, and the element is still committed at the **square placeholder** size. The resize is effectively dead code. See M1-bis below. |
| **M2** no unmount cleanup | ✅ **Resolved** | `componentWillUnmount` (3467-3472) aborts+clears `generatorJobs` and `generatorModelControllers`, clears `generatorProgress`/`generatorPriorState`. `loadGeneratorModels` registers its controller in `generatorModelControllers` and guards both `.then`/`.catch` `setState` with `if (this.unmounted) return;`. Post-unmount `tick` returns at the `signal.aborted` guard. Truly aborts everything. |
| **M3** capture/churn | ✅ **Resolved** | `updateGeneratorConfig` takes `captureUpdate` defaulting to `EVENTUALLY` and calls `this.store.scheduleAction(...)`; `applyGeneratorResult` schedules `IMMEDIATELY` for committed results (12786, 12845). Wording reconciled. |
| m1 dup refs | ✅ Resolved | `addGeneratorSelectionRefs` dedupes against existing element refs (12900-12911). |
| m2 restore defaults | ✅ Resolved | `normalizeGeneratorCustomData` merges over `newGeneratorConfig(kind)` and coerces missing/pending state→idle (restore.ts:433-442); `newGeneratorConfig` imported. |
| m3 load-in-render | ✅ Resolved | `loadGeneratorModels` removed from `renderGeneratorLayer`; now in `componentDidUpdate` guarded on `selectedElementIds` change + single generator selection + `renderGeneratorPanel` (3691-3700). |
| m5 cancel loses prior done | ✅ Resolved | `startGeneration` snapshots `generatorPriorState`; `cancelGeneration` restores it then clears; `applyGeneratorResult` clears it. |
| m6 MAX_POLLS off-by-one | ✅ Resolved | `polls++ >= MAX_POLLS` (12687). |
| t1 dead progress field | ✅ Resolved | `progress` removed from `GeneratorState.pending` (types.ts:206). |

### M1-bis — (Major, still open) image resize is dead code; generated images render at placeholder square size

**Where:** `App.tsx` `applyGeneratorResult` image branch, lines 12801-12829.

**Problem:** The fix assumes the new file is in `this.imageCache` right after `this.addFiles([...])`. It is not. `addFiles` → `addNewImagesToImageCache()` is called with no args, defaulting to `getInitializedImageElements(scene)`, which filters by `isInitializedImageElement` = `type==="image" && !!fileId`. At this moment the generator element's `fileId` is **still unset** (it's assigned later at 12836), so no scene element references the new file and the cache load is skipped entirely. Therefore `this.imageCache.get(fileId)?.image` (12825) is `undefined`, `imageHTML` is `undefined`, `dimensions` stays `null`, and the committed element keeps the square placeholder `width===height`. Net: M1's original symptom (non-square images squished) persists. The image still *renders* (a later cache refresh fires once `fileId` is set), but at wrong dimensions. Untested — no test asserts the resulting element width/height.

**Fix:** Mirror the working path at lines 12060-12089: construct `const initialized = newElementWith(el, { fileId })`, then `await this.updateImageCache([initialized])` (force-loads by fileId), then `const imageHTML = await this.imageCache.get(fileId)?.image`, then `getImageNaturalDimensions(initialized, imageHTML)` — and only then `mutateElement` with `fileId` + dimensions. Re-check `getNonDeletedElement` liveness after the await as already done. Add a test asserting a non-square mock result resizes the node (mock currently returns a 512×512 SVG; assert width≈height for square, or switch the mock to a non-square image and assert aspect ratio).

### Re-review summary
**B1 + M2 + M3 genuinely resolved; all Minor/Trivial resolved. M1 is NOT resolved** — the resize logic is present but never executes because the image is never in `imageCache` at read time. This is a Major (UX correctness) still open. No newly-introduced Blocker/Major found.

**M1 follow-up (verified):** ✅ **Now resolved.** Image branch (App.tsx:12819-12835) constructs `newElementWith(el, { fileId })` and `await this.updateImageCache([initialized])` — which loads by `fileId` (keyed off `elements.map(e=>e.fileId)`, independent of scene membership), so `await this.imageCache.get(fileId)?.image` resolves a real `HTMLImageElement`, `getImageNaturalDimensions` runs, and dimensions are applied in the committed `mutateElement`. Mirrors the working insert path (12060-12089); liveness re-checked after awaits. No resize unit test (jsdom doesn't decode images), but the logic is now correct. **No Blocker/Major remain across the change.**

---

# (Original review below)

**Verdict:** Solid architecture and contract fidelity, but there is **one correctness Blocker** (deleted-node write-back) and a **Major UX bug** (generated image not resized) plus several lifecycle/robustness gaps. The transient-progress design (the thing most likely to cause churn) is actually done *right*.

**Findings by severity:**
- Blocker: 1
- Major: 3
- Minor: 6
- Trivial: 3

> Reviewer note: the new files (`packages/element/src/generator.ts`, `packages/excalidraw/tests/generator.test.tsx`, `excalidraw-app/data/generators.ts`, `excalidraw-app/components/GeneratorPanel.tsx`) are **untracked**, so `git diff HEAD` does **not** show them. Review was done against the working tree, not the diff alone.

---

## Blocker

### B1 — Poll loop writes results back to *deleted* generator nodes (spec violation)
**Where:** `App.tsx` `pollGeneration` (the `if (!element)` / `if (!el)` guards) and `applyGeneratorResult`.

**Problem:** Deletion in Excalidraw is a **soft delete** — `actionDeleteSelected` does `newElementWith(el, { isDeleted: true })` and the element **stays in `scene.elementsMap`**. `this.scene.getElement(id)` reads `elementsMap` (which includes deleted elements — see `Scene.ts:228`), so it returns a **non-null deleted element**. The poll loop's only deletion guard is `if (!element) { abort }`, which is **never true for a soft-deleted node**. Consequently:
- The poll loop keeps running after the node is deleted.
- On `done`, `applyGeneratorResult` calls `this.scene.mutateElement(el, { src/fileId, status:"saved", customData:{...state:"done"} })` on the **deleted** element, i.e. it **writes the result back to a deleted node** and flips its generator state to `done`. If the user later undoes the delete, the node silently carries a generated result.

This directly violates the spec:
> *Scenario: Node deleted during generation — its poll loop is aborted and no result is written back.*

and the design's "ignore results for deleted elements" mitigation.

**Why it slipped through:** task 10.2 claims a "delete-mid-job" test, but **no such test exists** in `generator.test.tsx` (the 7 tests cover defaults/guard/restore/done/error/cancel only). The path is untested.

**Fix:** Use a *non-deleted* lookup everywhere the loop re-checks liveness, e.g. `this.scene.getNonDeletedElement(elementId)` (returns null for `isDeleted` elements — `Scene.ts:232`). Apply in `pollGeneration` (`tick`'s `element`/`el` fetches), in `applyGeneratorResult` (re-fetch + the post-fetch image re-fetch), and in `startGeneration`'s post-submit `this.scene.getElement(...)` check. When null → `controller.abort()`, `generatorJobs.delete(id)`, return without writing. Add a regression test that deletes the node mid-poll and asserts state never becomes `done`/`error` and `src`/`fileId` stay unset.

---

## Major

### M1 — Generated image is not resized to its natural aspect ratio (squished into placeholder)
**Where:** `App.tsx` `applyGeneratorResult`, `image` branch.

**Problem:** The idle image node is created as a fixed **square** placeholder (`newImagePlaceholder` → `placeholderSize = 100/zoom`, equal width/height). The normal image-insert flow recomputes element dimensions from the loaded image via `getImageNaturalDimensions` (`App.tsx:12133`) so a 512×512 or 16:9 image renders correctly. The generator path only sets `fileId` + `status:"saved"` and **never updates `width`/`height`/`x`/`y`**, so every generated image is stretched into the placeholder square regardless of the real aspect ratio. (Note: the image *cache*/SVG-normalization concern is NOT a bug — `this.addFiles` already calls `addNewImagesToImageCache` and normalizes SVG internally, so rendering of the bitmap itself works.)

**Fix:** After `addFiles`, load the image (`HTMLImageElement` / reuse `updateImageCache` result) and apply `getImageNaturalDimensions(el, imgEl)` (x/y/width/height/crop) in the same `mutateElement` that sets `fileId`/`status`, mirroring `insertImageElement`.

### M2 — No unmount cleanup: in-flight jobs are never aborted on `componentWillUnmount`
**Where:** `App.tsx` `componentWillUnmount` (line 3459) — it tears down many things but never touches `generatorJobs`. Also `loadGeneratorModels` discards its `AbortController` entirely (stored only in a local `const`).

**Problem:** The design's risk mitigation explicitly says "abort on delete/**unmount**". Submit/poll/list-models requests are not aborted on unmount, and their `.then`/`.catch` do `this.setState({})` / `this.addFiles(...)` on the destroyed component (React "setState on unmounted" warning; writes into the freshly-reset `this.files`/empty `this.scene`). It largely self-heals (a post-unmount `tick` finds an empty scene and aborts), but a `done` result arriving in the ~1.5 s window runs `applyGeneratorResult` against the destroyed app. Other code in this file already guards with `this.unmounted`.

**Fix:** In `componentWillUnmount`, iterate `this.generatorJobs.values()` → `abort()`, then `this.generatorJobs.clear()` and `this.generatorProgress.clear()`. Also store the `loadGeneratorModels` controller (e.g. keyed by kind) and abort it too, and/or guard the `.then`/`.catch` `setState` with `if (this.unmounted) return;`.

### M3 — `setConfig` is not "history-captured" as task 5.4 claims; every prompt keystroke broadcasts via `onChange`/collab
**Where:** `App.tsx` `updateGeneratorConfig` → `this.scene.mutateElement(...)` with no `this.store.scheduleAction(...)`.

**Problem:** Task 5.4 says setConfig updates are "history-captured". In practice an unscheduled `scene.mutateElement` falls through to the store's default `EVENTUALLY` action (`store.ts:402`), which is **not discretely undoable** — so the claim is inaccurate (the change is coalesced, not captured). More importantly, `mutateElement` → `triggerUpdate()` fires `onChange` on **every keystroke** in the host's prompt `<textarea>`, so prompt text is persisted/collab-broadcast on every character. Per design D this is "treated as local" and tolerable, but it is real churn and the undo behavior contradicts the task. Decide and document the intended capture semantics (likely `CaptureUpdateAction.EVENTUALLY` is correct; if so, fix task 5.4's wording).

**Fix:** Either explicitly `this.store.scheduleAction(CaptureUpdateAction.EVENTUALLY)` around config edits and correct the task text, or debounce the customData write for free-text fields. Progress already (correctly) avoids this via the transient map — see "Looks good".

---

## Minor

### m1 — `addSelectionRefs` / `addFileRefs` produce duplicate, unbounded refs
**Where:** `App.tsx` `addGeneratorSelectionRefs`, `addGeneratorFileRefs`, `resolveGeneratorRefs`.
**Problem:** Refs are appended with no dedup. Clicking "+ Selection ref" twice with the same selection appends the same `{type:"element", elementId}` again; same for file refs. `resolveGeneratorRefs` also doesn't dedup, so a backend can receive the same URL multiple times. Unbounded over repeated clicks.
**Fix:** Dedup `addSelectionRefs` against existing element-ref ids before appending; optionally cap total refs and/or dedup resolved URLs.

### m2 — Restore does not "default missing fields" (task 8.1 only half-implemented)
**Where:** `data/restore.ts` `normalizeGeneratorCustomData`.
**Problem:** Task 8.1 says "default missing fields, coerce a stale pending state to idle". Only the pending→idle coercion exists. A persisted/older `generator` payload missing `refs`/`params`/etc. is passed through untouched, so later `[...config.refs, ...]` / `config.refs.filter(...)` / `config.params` access can throw or render undefined.
**Fix:** Merge the restored generator over `newGeneratorConfig(generator.kind ?? "image")` defaults (preserving present fields) before returning.

### m3 — `loadGeneratorModels` is invoked from inside `render()`
**Where:** `App.tsx` `renderGeneratorLayer` → `this.loadGeneratorModels(config.kind)`.
**Problem:** Side-effect during render. It's guarded by `if (this.generatorModels.has(kind)) return;` so it won't loop, and the `setState` happens only later in the async `.then/.catch`, so it's *safe* — but it's a code smell and means a model fetch is triggered as a render side-effect. If `onListGeneratorModels` is absent it synchronously mutates the map to `"error"` during render.
**Fix:** Trigger the lazy load from a lifecycle/effect (e.g. when selection changes to a generator node) rather than from render.

### m4 — `onMediaUpload` forwarding was previously missing; this change silently fixes it
**Where:** `index.tsx:108,232` (added by this change).
**Observation:** Before this diff, `onMediaUpload` was neither destructured nor forwarded to `<App>` in `index.tsx` (confirmed via `git show HEAD:...`), yet `App` already reads `this.props.onMediaUpload` for media insertion (`App.tsx:12424`). So media-node uploads via the library prop were effectively non-functional before, and this generator change repairs that path as a side effect. Worth calling out so it's tested/owned, not an accidental coupling.

### m5 — `cancelGeneration` only restores `idle`, never the "prior committed state"
**Where:** `App.tsx` `cancelGeneration`.
**Problem:** Spec says cancel returns to "idle (**or its prior committed state**)". If a node was previously `done` and the user regenerates then cancels, state is forced to `idle`, losing the `done` marker (the actual `src`/`fileId` remain, so the media still shows, but `generator.state` is now inconsistent with the visible result).
**Fix:** Snapshot the pre-generation `state` in `startGeneration` and restore it on cancel, or set `done` when a committed result (`src`/`fileId`) exists.

### m6 — Poll timeouts are untracked (minor leak window) and `MAX_POLLS` off-by-one
**Where:** `App.tsx` `pollGeneration`.
**Problem:** Recursive `window.setTimeout(tick, …)` ids are never stored, so cancellation/abort relies on each `tick` re-checking `controller.signal.aborted`; one already-scheduled timeout still fires after cancel (harmless, returns early). Also `if (polls++ > MAX_POLLS)` lets it run `MAX_POLLS+1` times (cosmetic).
**Fix:** Optional — store the timeout id per element and `clearTimeout` on abort/cancel for promptness; use `>=` for the cap.

---

## Trivial

### t1 — `GeneratorState.pending.progress` field is dead
`state.progress` is in the type but never written (progress lives in the transient `generatorProgress` map — which is the right call). Either drop the field from the type or note it's reserved.

### t2 — App wrappers drop the `signal` from the host callbacks
`excalidraw-app/App.tsx` wires `(kind) => listGeneratorModels(kind)` etc., discarding `opts.signal`. Fine for the mock, but the example never demonstrates abort propagation to a real backend; consider threading `signal` through for fidelity.

### t3 — `getGeneratorConfig` is type-agnostic (returns config for non-media types)
`getGeneratorConfig` returns the config for *any* element with `customData.generator` (the test even asserts this for a rectangle). Only `isGeneratorElement` enforces the image/video/audio constraint. Benign given all writers go through `createGeneratorNode`, but a stray `customData.generator` on a non-media element would be read by the helper. Acceptable; documented here for awareness.

---

## Looks good (verified, not issues)

- **State machine** idle→pending→done/error and cancel→idle are consistent; the submit-in-flight cancel race and the double-`generate()` race are correctly handled via the per-element `AbortController` + post-await `signal.aborted` / element-existence re-checks.
- **Progress does not churn `customData`** — it uses the transient `generatorProgress` map + `setState({})`, exactly as the design intended; no per-tick persist/collab churn from progress. (This was the biggest churn risk and it's handled.)
- **Video/audio result wiring** (`src` + `status:"saved"` + `state:"done"`) is correct and reuses the media overlay.
- **Image cache + SVG normalization** are handled because `this.addFiles` calls `addNewImagesToImageCache` and normalizes SVG internally (so the earlier-feared cache/SVG gap is a non-issue; the *dimension* gap M1 remains).
- **`resolveGeneratorRefs`** correctly resolves media `src` / initialized-image `dataURL` and skips non-media with a `console.warn`, per design D5 v1 scope.
- **Restore**: `normalizeGeneratorCustomData` correctly coerces only `pending`→`idle`, preserves `done`/`error`/`idle`, and is wired for image/video/audio; the `extra.customData` override path in `restoreElementWithProperties` (line 394-406) applies it cleanly.
- **Graceful degradation**: missing callbacks → node still renders as normal media/image; panel/menu gated on `renderGeneratorPanel`; `startGeneration` surfaces "not configured"/"no model" errors. Public props are optional & additive; types re-exported from `index.tsx`.
- **Restore test** correctly proves config (prompt/model) survives the pending→idle coercion.
