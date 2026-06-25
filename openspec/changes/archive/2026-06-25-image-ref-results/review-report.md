# Review Report — image-ref-results (verify stage)

Reviewer: independent verifier (author ≠ verifier). Repo: `DumoeDss/excalidraw` (fork), branch `feat/image-ref-results`.
Scope: uncommitted working-tree diff (10 source files) against the change contract.

## Verdict: NEEDS-FIXES (1 Major) — all gates green

The implementation is faithful to D1–D5, the byte-free goal is met, the audio-gen entry point is removed
correctly, the type re-exports land, and every automated gate passes. One real gap: the **public `updateScene`
API does not re-prime the generated-image cache**, so a host that loads a persisted scene via `updateScene`
(rather than `initialData`) renders done image-generator nodes as placeholders. The focus brief explicitly named
this path. Everything else is clean.

## Counts by severity

- Blocker: 0
- Major: 1
- Minor: 2
- Trivial: 1

## Gate results (re-run by the reviewer, not trusted from self-report)

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `yarn test:typecheck` | PASS — `tsc` clean, 0 errors (Done in 19.99s) |
| Generator suite | `yarn test:app --watch=false generator.test` | PASS — 11/11 |
| Restore/export/image suites | `yarn test:app --watch=false restore.test export.test image.test` | PASS — 83 passed, 1 skipped (restore 45, image 6, export.test.tsx 8, scene/export.ts 16) |
| Lint | `eslint` on the 10 changed files | PASS — 0 errors |
| Build | `yarn build:packages` | PASS — all 5 packages emit `dist/{dev,prod,types}` (Done in 51.17s) |

Build-output verification (dist reflects the changes):
- `dist/types/excalidraw/index.d.ts:51` re-exports `GeneratorKind, GeneratorRef, GeneratorConfig` from `@excalidraw/element/types`. ✓
- `dist/types/element/src/types.d.ts:201` carries `result?: string | null`. ✓
- `dist/types/element/src/image.d.ts:12` declares `generatedImageCacheKey: (url: string) => FileId`. ✓
- `dist/prod/index.js` imports `@excalidraw/element` as an external (11 refs) → package is NOT self-contained, recipe's 5 `file:` deps are correct. ✓
- `dist/prod/index.css` and `dist/prod/fonts/` present. ✓

Note: the generator video test emits a benign `HTMLMediaElement.prototype.pause not implemented` stderr from jsdom
on unmount — pre-existing jsdom limitation, unrelated to this change; the test still passes.

---

## MAJOR

### M1 — Public `updateScene` API does not re-prime the generated-image cache

**File:** `packages/excalidraw/components/App.tsx:5053-5101` (public `updateScene`), vs. the two priming call
sites at `:3209` (`syncActionResult`) and `:3436` (mount/`componentDidMount`).

**What's wrong:** `primeGeneratedImageCache` is only invoked from `syncActionResult` and `componentDidMount`. The
public `updateScene` imperative API (`App.tsx:5053`) calls `this.scene.replaceAllElements(elements)` directly at
`:5094` and does NOT call `primeGeneratedImageCache`. `Scene.replaceAllElements` (in `@excalidraw/element/Scene.ts`)
is a low-level method with no access to the App-owned `imageCache`, so it cannot prime either. There is also no
priming in `componentDidUpdate` (confirmed: `:3843`, no image-priming).

**Why it matters:** For normal `fileId`-backed images, cache priming is triggered by `actionResult.files`
(`syncActionResult` `:3212-3214` → `addNewImagesToImageCache`) or by the separate `addFiles` API
(`:5003-5012`). Generator URL-ref images have **no files**, so `addFiles` is never called for them — `updateScene`
is the only entry. A host (the ace-playground #3 integration is the consumer of this exact API surface) that loads
a saved canvas via `updateScene({ elements })` instead of mounting with `initialData` will show every completed
image-generator node as a placeholder until some other action happens to flow through `syncActionResult`. This
directly undercuts the spec scenario "on restore the node re-renders the image from that URL" for the public update
path the focus brief called out.

**Fix:** Add a prime call inside the public `updateScene` where elements are replaced — e.g. at `App.tsx:5093-5095`:

```ts
if (elements) {
  this.scene.replaceAllElements(elements);
  this.primeGeneratedImageCache(elements);
}
```

`primeGeneratedImageCache` already guards with `!this.imageCache.has(...)`, so this is idempotent and cheap (no-op
when nothing new). Add/extend a test that calls the public `updateScene` with a done image-generator element and
asserts the cache is primed (or, at minimum, that the prime path runs).

---

## MINOR

### m1 — `updateScene`/restore double-prime is harmless but undocumented

**File:** `App.tsx:3209` (`syncActionResult`) and `:3436` (mount). At mount, `syncActionResult` runs first (priming
once via `:3209`), then `componentDidMount` calls `primeGeneratedImageCache(restoredElements)` again at `:3436`.
The `!this.imageCache.has(...)` filter makes the second call a no-op, so this is correct — but a one-line note that
the mount-path prime is a deliberate belt-and-suspenders (in case `syncActionResult`'s `actionResult.elements` ever
differs from `restoredElements`) would prevent a future reader from "deduping" it incorrectly. Not a defect; doc nit.

### m2 — `primeGeneratedImageCache` calls `getGeneratorConfig` up to 4× per element in the filter

**File:** `App.tsx:12442-12448`. The `.filter` predicate calls `getGeneratorConfig(element)` twice in the boolean
expression and twice more inside `generatedImageCacheKey(getGeneratorConfig(element)!.result!)`. `getGeneratorConfig`
is a cheap property read, so this is not a correctness or perf problem, but hoisting it to a single
`const cfg = getGeneratorConfig(element)` would read cleaner and removes the `!` non-null assertions. Quality only.

---

## TRIVIAL

### t1 — Orphaned locale string `toolBar.audioGenerator`

The `toolBar.audioGenerator` i18n key is no longer referenced from `Actions.tsx` after the audio-generator button
removal (verified: only `toolBar.imageGenerator`/`videoGenerator` remain wired). The unused locale entry is harmless
(it does not break the build or lint) and removing it is out of scope/risky for translations, but worth noting for a
future cleanup. Leave as-is.

---

## Focus-item verification (code-level; runtime browser checks are human-pending)

- **Image-ref render path** — CORRECT.
  - (a) Normal `fileId`-backed path untouched: `renderElement.ts:512-521` falls through to the original
    `element.fileId !== null ? imageCache.get(fileId)` branch when `getGeneratedImageCacheKey` returns null
    (which it does for any image with `fileId != null` or no `result`). `getGeneratedImageCacheKey`
    (`renderElement.ts:91-99`) guards `!isImageElement || fileId != null` → null.
  - (b) No synthetic-key collision: `generatedImageCacheKey` (`image.ts:30-31`) prefixes `genurl:`; real keys are
    content-hash hex digests. Cannot collide.
  - (c) Placeholder gate: `isPendingImageElement` (`renderElement.ts:101-116`) treats a generator image as pending
    when its cache entry is `null` or a `Promise`; `drawElementOnCanvas` (`renderElement.ts:615-616`) draws
    `drawImagePlaceholder` when `img` is undefined/Promise. The generator prime paths store a resolved
    `HTMLImageElement` (never a Promise), so a not-yet-loaded URL = cache miss = placeholder. Correct.
  - (d) Dead/failed URL: `applyGeneratorResult` catch (`App.tsx:13058-13068`) and `primeGeneratedImageCache`
    per-element `catch {}` (`App.tsx:12468-12471`) swallow load errors and never set the cache entry → placeholder,
    no throw. Export `catch {}` (`export.ts`) likewise degrades to placeholder.

- **No bytes in scene** — CONFIRMED. `applyGeneratorResult` image branch (`App.tsx:13018-13057`) removed
  `fetch`/`blob`/`getDataURL`/`addFiles`/`fileId`; it `loadHTMLImageElement(url)`, sets the in-memory cache under
  the synthetic key, and `mutateElement` leaves `fileId` null and persists `result: url` on `customData.generator`.
  No `files` entry. Test `generator.test.tsx` asserts `fileId === null` and `Object.keys(h.app.files).length === 0`.

- **Restore + cache re-priming** — `normalizeGeneratorCustomData` (`restore.ts:434-444`) preserves
  `result: generator.result ?? null` and only resets a stale `pending` state to idle (a `done` result survives).
  Re-prime is wired on mount (`:3436`) and `syncActionResult` (`:3209`). No race with `clearImageShapeCache`:
  that method (`App.tsx:3513-3521`) only evicts entries where `isInitializedImageElement(element) && files[fileId]`
  — generator images have `fileId === null`, so they are never evicted by it. No leak beyond the documented bounded
  in-memory cache (same order as the prior fileId-keyed cache). **Gap: the public `updateScene` path is not primed —
  see M1.**

- **Export** — PNG: `export.ts:248-280` primes the export cache for `fileId==null` generator images with a `result`,
  loading via `new Image()` + `crossOrigin = "anonymous"`, keyed by `generatedImageCacheKey`, guarded by
  `imageCache.has(key)`; failures `catch {}` → placeholder. SVG: `staticSvgScene.ts:480-485` only emits `<image>`
  when `isInitializedImageElement && files[fileId]`; a generator image (`fileId === null`) is skipped, no throw —
  graceful degradation, nothing embedded. The cross-origin-taint caveat is documented in design.md Risks (acceptable
  for same-origin `/api/materials/<key>`; on-canvas render unaffected). Confirmed.

- **Audio gen disabled** — `Actions.tsx`: the `toolbar-audio-generator` `ToolButton` is removed (replaced by a
  comment); image + video buttons remain (`:1289`, `:1302`). `AudioIcon` import KEPT and still used by the audio
  **upload** media tool (`Actions.tsx:1142`) — not a dead import. `app.createGeneratorNode("audio")` signature
  unchanged (still callable programmatically). Audio player node and audio-as-reference (`addGeneratorFileRefs`
  accepts `audio/*`, `App.tsx:13080`) untouched. Confirmed; test `generator.test.tsx` asserts the toolbar has
  image+video and NOT audio.

- **Type re-exports** — `index.tsx:415-419` re-exports `GeneratorKind, GeneratorRef, GeneratorConfig` from
  `@excalidraw/element/types`; present in built `dist/types/excalidraw/index.d.ts:51`. Confirmed.

- **No regression** — video/audio result path unchanged; persistence/restore preserved (45 restore tests green);
  export green (24 tests across both export suites); media player nodes untouched. Confirmed at code + test level.

## Notes for the LEAD

- The single Major (M1) is the one substantive gap and it sits on the exact API surface the downstream
  ace-playground integration (#3) consumes. It is a small, low-risk fix (one prime call in `updateScene` + a test).
  Recommend fixing before this change is relied on by #3.
- Runtime browser behavior (image actually painting from a live URL, reload re-render, real PNG/SVG export of a
  cross-origin result) is human-pending per the brief; the code paths are correct and the caveats documented.

---

# Re-review (round 1)

Re-reviewed ONLY the delta the implementer applied for M1 / m2 / m1. Non-author confirmer.

## Verdict: CLEAN — M1 and m2 RESOLVED, no regression, no new findings.

### M1 — RESOLVED

`App.tsx:5097-5105` — inside `updateScene`'s `if (elements)` block, `this.primeGeneratedImageCache(elements)` is
now called immediately after `this.scene.replaceAllElements(elements)`, with a comment explaining it covers the
host load path that carries no `files`. Verified:
- **Fires on the public path** — the call sits in the public `updateScene` imperative API itself (not gated behind
  `syncActionResult`/`initialData`), so the ace-playground `updateScene({ elements })` load path now primes. The
  new test proves this with a before(`false`)/after(`true`) cache-key assertion.
- **Idempotent / no-op when nothing new** — `primeGeneratedImageCache` short-circuits via the per-element
  `!this.imageCache.has(generatedImageCacheKey(result))` guard and the early `if (!pending.length) return;`, so a
  repeat `updateScene` with already-primed (or non-generator) elements does zero loads and zero `triggerUpdate`.
- **No loop / re-entrancy** — on success it calls `this.scene.triggerUpdate()` (a render notification), NOT
  `updateScene`/`replaceAllElements`. `triggerUpdate` does not re-enter `primeGeneratedImageCache`; even if a
  re-render did, the `has(...)` guard yields `pending.length === 0` and returns before any load/trigger. No
  infinite loop, no perf regression (bounded by the number of not-yet-cached generator images).

### m2 — RESOLVED

`App.tsx:12447-12490` — `primeGeneratedImageCache` rewritten from the 4×-`getGeneratorConfig` filter to a single
`for` loop that computes `getGeneratorConfig(element)?.result` once per element and pushes `{ element, url }` pairs.
Verified behavior identical to the prior version:
- Same selection predicate: `isImageElement && fileId == null && !isDeleted && truthy result && !imageCache.has(key)`.
- No non-null-assertion hazards — `result` is captured as a checked local (`if (result && ...)`) and the load loop
  consumes the captured `url`; the previous `getGeneratorConfig(element)!.result!` `!`-assertions are gone.
- Error path unchanged (`catch {}` → placeholder, no bytes), and `triggerUpdate()` still gated on `didLoad`.

### m1 — RESOLVED (doc)

`App.tsx:3434-3440` — comment added at the mount-path prime stating the second prime is a deliberate
belt-and-suspenders against `actionResult.elements` vs `restoredElements` diverging and is a cheap no-op via the
`has(...)` guard ("do not dedupe it away"). Accurate.

### New test — confirmed genuine

`generator.test.tsx:187-226` "public updateScene primes the cache for a done URL-ref image generator":
- Renders `<Excalidraw renderGeneratorPanel={() => null} />` with **no `initialData`**, builds a persisted done
  image-generator element (URL ref, `fileId` null, no files), asserts `imageCache.has(key) === false` BEFORE.
- Loads it via the public `h.app.updateScene({ elements: [el] })` — explicitly NOT `initialData` and NOT `addFiles`
  (comment says so, and there is no `addFiles`/`initialData` call) — then awaits microtasks for the async prime.
- Asserts `imageCache.has(key) === true` AFTER, `Object.keys(h.app.files).length === 0`, and `fileId === null`.
  Real before/after assertion that exercises exactly the path M1 fixed and re-confirms the byte-free invariant.

## Gate results (re-run by the confirmer in the fork)

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `yarn test:typecheck` | PASS — `tsc` clean (Done in 19.56s) |
| Generator suite | included below | PASS — **12/12** (was 11; +1 new `updateScene` test) |
| Restore/export/image | `yarn test:app --watch=false generator.test restore.test export.test image.test` | PASS — 95 passed, 1 skipped (generator 12, restore 45, image 6, export.test.tsx 8, scene/export.ts 16) |
| Lint | `eslint App.tsx generator.test.tsx` (delta files) | PASS — 0 errors |
| Build | `yarn build:packages` | PASS — all 5 packages emit `dist/{dev,prod,types}`, 0 errors (Done in 50.90s); dist still re-exports `GeneratorKind/GeneratorRef/GeneratorConfig`, carries `result?: string \| null` + `generatedImageCacheKey` |

The benign `HTMLMediaElement.prototype.pause` jsdom-unmount stderr persists in the video test — pre-existing,
unrelated to this change, test still passes.

## No regression

The delta touches only `updateScene` (one added prime call), the `primeGeneratedImageCache` internals (behavior
preserved), one comment, and one new test. Render gate, byte-free result wiring, restore round-trip, export
(PNG prime + SVG skip), audio-gen removal, and type re-exports are all unchanged and remain green. Runtime browser
checks remain human-pending (not Blockers).

## Final verdict: CLEAN — no further round needed.
