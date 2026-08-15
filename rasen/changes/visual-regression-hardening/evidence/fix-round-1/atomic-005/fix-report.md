# VHR-R1-005 atomic fix report

## Status

**PARTIAL — the Library fixture defect is implemented and evidenced, but the finding remains OPEN pending the original reviewer.** The three requested Library scenarios reached the exact item assertion and produced fixer-owned images. The phone scenario then stopped at the separate blank-canvas routing gate, so this atomic pass cannot claim a complete three-result runner inventory. No canonical baseline was written or promoted.

## Provenance and owning seam

The sole application-fixture source remains `createApplicationFixtures()` in `scripts/visual-regression/fixtures.ts`. Its authoritative Library record is:

- id: `visual-library-01`
- name: `Reusable card`
- scene: `selected-rectangle`
- fixed status and creation time from the fixture module

The test-only host converts that named fixture into a real `LibraryItem`, installs it with `h.app.library.setLibrary()`, reads it back from `getLatestLibrary()`, and rejects an absent item, wrong name, or empty elements before declaring preparation ready. The existing editor Library owner and listener path therefore remain authoritative; no runtime domain or public API was added.

The real Library sidebar is opened through its existing app-state owner with `DEFAULT_SIDEBAR` and `LIBRARY_SIDEBAR_TAB`. `LibraryMenuSection` passes the item name to `LibraryUnit`, whose real DOM exposes the stable item id and standard accessible name. All three manifest scenarios select that exact id and require the exact name.

## Exact delta paths

- `excalidraw-app/visualRegressionHost.tsx`
- `packages/excalidraw/components/LibraryMenuSection.tsx`
- `packages/excalidraw/components/LibraryUnit.tsx`
- `packages/excalidraw/components/LibraryUnit.test.tsx`
- `scripts/visual-regression/runner.ts`
- `scripts/visual-regression/scenarios.ts`
- `scripts/visual-regression/visual.unit.test.ts`

The fixture source in `scripts/visual-regression/fixtures.ts` was audited and consumed without changing its authoritative values.

## Focused tests

- `yarn test:visual:unit` — PASS, 33/33.
- `yarn vitest --run packages/excalidraw/components/LibraryUnit.test.tsx packages/excalidraw/components/LibraryMenuItems.test.tsx` — PASS, 5/5.
- Positive coverage proves one DOM item has id `visual-library-01` and accessible name `Reusable card`.
- Negative coverage proves a wrong name, wrong id lookup, or empty unit cannot satisfy the fixture contract.
- Manifest/semantic negative coverage proves wrong and empty observed names fail strict equality and visibility checks.
- Focused ESLint — 0 errors; five retained warnings are outside this atomic delta or pre-existing in shared untracked harness code.
- Focused `git diff --check` — PASS.

## Targeted Chrome evidence

- Run id: `fixer-005-library-1`
- Role: `fixer`
- Filter: `desktop-library,tablet-dark-library,phone-light-library`
- Targets: fresh disposable targets; final proxy health `sessions=0`, `managedTabs=0`; sticky proxy remained running.

### Desktop Library

- Exact item observation: visible `true`, count `1`, name `Reusable card`.
- Semantic failures: none.
- Runner status: `fail` only because the old empty-Library baseline differs.
- Mismatch: 38,000 pixels, ratio `0.029320987654320986`.
- Result: `scripts/visual-regression/results/fixer/fixer-005-library-1/desktop-library__1440x900__dpr1__light__ltr__library-content__fixer__fixer-005-library-1__result.json`.
- Image: `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/desktop-library__1440x900__dpr1__light__ltr__library-content__fixer__fixer-005-library-1__evidence.png`.
- Image facts: 1440×900; SHA-256 `3b008d125b35059d794895de85599e814ad39edd620fd4a180c445b71e02c52c`.
- Personal inspection: the right Library sidebar is open, the empty-library-only view is gone, and the fixed purple rectangle preview is visible under the Library content section without clipping.

### Tablet dark RTL Library

- Exact item observation: visible `true`, count `1`, name `Reusable card`.
- Library-item semantic failures: none.
- Runner status: `fail` from the expected old-baseline pixel change plus the separate existing responsive-tier finding (`desktop` observed where the manifest expects `tablet`).
- Mismatch: 32,258 pixels, ratio `0.041018168131510414`.
- Result: `scripts/visual-regression/results/fixer/fixer-005-library-1/tablet-dark-library__1024x768__dpr1__dark__rtl__tablet-library-sidebar__fixer__fixer-005-library-1__result.json`.
- Image: `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/tablet-dark-library__1024x768__dpr1__dark__rtl__tablet-library-sidebar__fixer__fixer-005-library-1__evidence.png`.
- Image facts: 1024×768; SHA-256 `11ce6607e55e5869363bad78f706e856f0b28f5a907d7a2145ec629f60b63fe9`.
- Personal inspection: the dark RTL sidebar opens on the physical left, contains the fixed purple rectangle preview, and is no longer empty; content is bounded inside the capture.

### Phone light Library

- The runner completed `assert:phone-library-item` and the screenshot stage after opening the real populated Library.
- Image: `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/phone-light-library__375x812__dpr1__light__ltr__phone-library__fixer__fixer-005-library-1__evidence.png`.
- Image facts: 375×812; SHA-256 `28e9aee538890a66bf08741fcca8fdb9b2c5da5f49261ff6e1cbba232c06d813`.
- Personal inspection: the overlay Library is open, bounded, and visibly contains the fixed purple rectangle preview instead of an empty-only state.
- Current and diff PNGs were emitted under `scripts/visual-regression/results/fixer/fixer-005-library-1/`.
- The run stopped afterward at the separate blank-canvas trusted-key/routing gate, before the phone result JSON and aggregate inventory could be written. This atomic fixer did not change that gate.

Desktop and tablet recorded zero console errors, zero checker overlays, verified restoration, and no cleanup failures. The phone target also closed through lifecycle cleanup; final proxy health was 0/0.

## Baseline and integration disposition

The populated Library is an intentional expected pixel change relative to canonical images that encoded the empty state. No update mode, candidate promotion, canonical write, tolerance change, or mask change occurred. The integration fixer must rerun these three scenarios after the other atomic findings are integrated, personally inspect candidates, and promote the populated baselines only through the existing approval path.

Delta fingerprint over the seven exact delta paths above: `80ec3369ecf5e08973ed900a231e9e78a2261862dad52679781d991c29b6a7de`. The integration fingerprint must be recomputed from the merged tree.

## Durable findings

1. A deterministic application fixture is not evidence until the real owner state accepts it and the rendered owner DOM exposes the same identity.
2. Preview-only content needs a stable item selector plus a standard accessible name; either fact alone permits empty or wrong-item false passes.
3. A scenario may prove its atomic semantic subject before a later cross-cutting gate fails, but only a complete rerun may produce the final acceptance inventory.

`VHR-R1-005` remains **OPEN pending original reviewer disposition**.
