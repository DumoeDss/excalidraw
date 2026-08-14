# VHR-R1-003 atomic fix report

## Status

**IMPLEMENTED AND ATOMICALLY EVIDENCED — OPEN pending non-author reviewer disposition and integration.** The multi-editor scenario now performs visible, browser-trusted UPDATE, UNMOUNT, and RECREATE actions. It proves exact editor-root and imperative-API identities, exact responsive/theme/direction changes, survivor isolation, cached-API destruction, portal/claim cleanup, and fresh recreation rather than accepting a static initial frame.

This report does not close `VHR-R1-003`. Both final fixer runs have empty semantic and cleanup failure arrays, zero console events, and clean targets, but remain `fail` because the lifecycle-final image differs from the old static canonical baseline. The personally inspected captures also contain the known red checker badge even though the checker detector reports zero overlays. No baseline, candidate, tolerance, mask, task, run-state, or review disposition was changed.

## Atomic implementation

The retained 003 source seam is seven paths:

1. `excalidraw-app/visualRegressionHost.tsx`
   - records immutable root, API object, public API id, responsive signature, theme, direction, geometry, focus owner, association node, portal node, and floating-owner claim identities for both initial editors;
   - renders visible UPDATE, UNMOUNT, and RECREATE buttons and records paired trusted pointer/click receipts with exact coordinates and target ownership;
   - provides one independently claimed `multi-editor-fixture` React portal per editor, with visible `aria-controls` triggers and editor-local direction;
   - updates the same right root/API from dark/RTL/tablet-desktop-compact to light/LTR/phone-phone-touch-mobile;
   - unmounts only the right editor while preserving its 360px layout slot, the left editor's exact geometry, focus, association, direction, profile, and identities;
   - proves the old right root, trigger, surface, control id, owner claim, and API are disconnected/destroyed before recreation;
   - recreates a fresh right root/API/claim generation with the initial dark/RTL/tablet semantics and restores the pre-fixture document direction/language plus left focus;
   - removes the rejected product-main-menu seed so a global menu owner cannot steal focus or masquerade as two simultaneous instance-local surfaces.
2. `scripts/visual-regression/actions.ts`
   - defines the full lifecycle evidence contract and rejects phase-only or count-only acceptance;
   - activates the exact target, resolves each visible control at click time, dispatches trusted `clickAt` input, and correlates driver coordinates to the page receipts;
   - waits for two identical stable animation-frame snapshots per phase;
   - requires exact initial/update/unmount/recreate facts, unchanged left root/API/profile/geometry/focus, old-right destruction and portal cleanup, fresh-right identities, zero stale markers, and restored document direction.
3. `scripts/visual-regression/scenarios.ts`
   - makes `exercise-multi-editor-lifecycle` mandatory for `multi-editor-isolation` and asserts the final restored light/dark, LTR/RTL pair.
4. `scripts/visual-regression/runner.ts`
   - includes the product lifecycle source and focused product regression in the implementation-source allowlist.
5. `scripts/visual-regression/visual.unit.test.ts`
   - covers the accepted exact lifecycle and negative cases for stale updated state, root/API drift, undestroyed API, control/surface/claim residue, survivor focus/geometry/document-direction leakage, and invalid recreation.
6. `packages/excalidraw/components/App.tsx`
   - invalidates the existing public imperative API object in place before replacing its callable methods, so a consumer-cached object observes `isDestroyed=true` after unmount.
7. `packages/excalidraw/tests/packages/events.test.tsx`
   - retains the focused cached-API unmount regression and proves post-destruction calls reject use.

## Root causes and eliminated hypotheses

- The original scenario was a harness false-pass: it had no lifecycle action and accepted only initial count/theme/direction/bounds.
- The product lifecycle defect was object identity, not merely an internal App flag. `App.componentWillUnmount()` replaced only its own API reference, leaving consumer-cached API objects with `isDestroyed=false`. In-place invalidation fixes the public cached reference.
- Hidden controls and JavaScript `.click()` were rejected. Final acceptance uses visible controls plus target-activated physical `clickAt` receipts whose page pointer and click events are trusted and target-owned.
- Two product main menus cannot prove simultaneous instance-local surface ownership because their state/owner behavior is cross-instance enough for one menu to supersede the other. The fixture now uses the existing `useFloatingSurfaceOwner` lifecycle protocol with independently claimed React portals.
- Phone versus tablet alone did not cause the earlier missing-surface failure. The old product menu seed was the interfering owner and also caused delayed focus theft after recreation; it was removed rather than hidden behind a wait.
- Removing the entire right column made the survivor expand and changed its responsive signature. A non-editor placeholder keeps the layout slot while still requiring editor count one and complete right owner/API cleanup.
- The exact updated profile is `phone / phone / touch / mobile`; copying tablet `compact` density into the expected signature was incorrect and was fixed without weakening equality.

## Focused verification

- `yarn test:visual:unit` — **PASS, 60/60** after the final source change.
- `yarn test:app --run packages/excalidraw/tests/packages/events.test.tsx -t "marks a cached imperative API as destroyed on unmount"` — **PASS, 1/1; 5 skipped**.
- Exact seven-file Prettier check — **PASS**.
- Exact seven-file ESLint check with `--max-warnings=0` — **PASS, zero errors/warnings**.
- `git diff --check` — **PASS**.
- Strict UTF-8 fatal decoding, no BOM, no replacement character, and known-mojibake scan over all seven source paths — **PASS**.
- Current-fingerprint build/type sequence:
  - `yarn build:excalidraw` ran first and stopped at the disclosed external `packages/excalidraw/components/LibraryMenuSection.tsx:70:27` union member without `name`;
  - `yarn test:typecheck` then reported only that same external error plus the pre-existing Library fixture `status` widening at `excalidraw-app/visualRegressionHost.tsx:1463:40`;
  - the 003 `getFormFactor` literal widening discovered during the first typecheck was fixed; no 003 lifecycle error remains.

## Final Chrome lifecycle evidence

Primary retained run: `fixer-003-multi-13`, target `7B16BEE2A8C45C9F66947992FA3556A4`.

### Initial immutable state

- Left: `left-root-1 / left-api-2 / vJqqJjtobMj5DUWmkyT7r`, light/LTR, profile `[1,"desktop","desktop","landscape","regular","compact","compact","ltr",false,0,0,0,0,0,0,0,0]`.
- Right: `right-root-3 / right-api-4 / hlbWaH77VHkpRfifzpoY8`, dark/RTL, profile `[1,"tablet","desktop","portrait","regular","compact","compact","rtl",false,0,0,0,0,0,0,0,0]`.
- The two roots, API objects, and public API ids are distinct. Both `aria-controls` associations resolve to connected portal nodes with matching direction and live `multi-editor-fixture` owner claims. The left association is the connected active focus owner.

### Trusted UPDATE

- Driver receipt: visible `Update right editor` button at `(575.21875, 29.5)`, clicked `true`.
- Page receipt: pointer and click both trusted, pointer type `mouse`, target-owned, recorded at `(575, 29)`.
- Right retained the exact initial root/API/public id but changed exactly to light/LTR and profile `[1,"phone","phone","portrait","regular","touch","mobile","ltr",false,0,0,0,0,0,0,0,0]`.
- Left root/API/profile/rectangle/association/focus remained exact.

### Trusted UNMOUNT

- Driver receipt: visible `Unmount right editor` button at `(714.4453125, 29.5)`, clicked `true`.
- Page receipt: pointer and click both trusted, mouse, target-owned, recorded at `(714, 29)`.
- Editor count became one. The old right root was disconnected; the cached API reported destroyed; it was no longer current.
- Connected old controls `0`, connected old surfaces `0`, present old control ids `0`, old owner claim `false`, portal residue `0`.
- Left remained `left-root-1 / left-api-2` at `{ x:24, y:68, width:1008, height:808, right:1032, bottom:876 }`, with the initial profile, direction, association, claim, and active focus.

### Trusted RECREATE

- Driver receipt: visible `Recreate right editor` button at `(859.2265625, 29.5)`, clicked `true`.
- Page receipt: pointer and click both trusted, mouse, target-owned, recorded at `(859, 29)`.
- New right: `right-root-9 / right-api-10 / ZT6AozrV_w_C-QYMQAopL`; every identity differs from generation one.
- New right exactly restored dark/RTL/tablet-desktop-compact semantics and the original rectangle. Its new trigger/surface/claim is connected, direction-matched, and distinct from the initial association.
- The old right API remains destroyed with no old portal/claim residue. Mount counts are left `1`, right `2`; unmount counts are left `0`, right `1`; stale helper markers `0`; left focus and document direction are restored.

### Companion gates and pixel status

- Blank canvas adjacency also remained exact and trusted: canvas hit, target/editor page receipts trusted, exact editor ownership, cleanup restored.
- `semanticFailures=[]`, `cleanupFailures=[]`, `consoleEvents=[]`, checker detector `{ overlays:0, dialogs:0 }`, `targetsClean=true`, `proxyHealthy=true`, debugger and input restoration exact.
- Scenario status remains `fail` only at old canonical comparison: 624,725 pixels, ratio `0.48204089506172837`, bounds `{ x:10, y:11, width:1420, height:879 }`, masks `0`.
- Expected/current/diff hashes: `8a91f86a3e99e5b2d3ef8045057a03e51c6b2365f1a79bd20b8153f9d074b42a`, `f72d663feb91dddbd5a72f4b5a61da2b374f38a18ac20e0c6ae2c35c18b63960`, `6dc7befd4581ae674a12b641eea7c1a7464f9470afbe5342c5c6fccf59980a49`.

Repeat retained run `fixer-003-multi-12` produced the same semantic/cleanup/console result, the same mismatch count/ratio/bounds, and the same diff hash. Its current hash was `d17d658d3028f73dc6309451487a8e4295f6f3e3c029e8df8f3169f8f26f9042`. Direct decoded comparison between runs found only 37 changed pixels in an `8x9` rectangle at `(47,816)`, inside the visible red checker badge number. This is a disclosed checker contamination, not accepted deterministic lifecycle pixels.

Authoritative artifacts:

- `rasen/changes/visual-regression-hardening/evidence/fixer/run-fixer-003-multi-13.json`
- `scripts/visual-regression/results/fixer/fixer-003-multi-13/multi-editor-isolation__1440x900__dpr1__light__ltr__multi-editor__fixer__fixer-003-multi-13__result.json`
- `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/multi-editor-isolation__1440x900__dpr1__light__ltr__multi-editor__fixer__fixer-003-multi-13__evidence.png`
- Corresponding `fixer-003-multi-12` inventory, result, current/diff/viewport, and evidence files.

## Personal image inspection

All eight retained PNGs from the two final runs were opened at original resolution. Every file is 1440x900.

| Run/capture | SHA-256 | Visible state and disposition |
| --- | --- | --- |
| `multi-12` viewport | `4f17c5a30180d5abfb64171162f7557edc6a8d6d8cb9eedc0d0c2a27aa7027bd` | final left light desktop and right dark tablet, disabled lifecycle rail, left focus outline, two corner owner surfaces; red checker badge; diagnostic only |
| `multi-12` current/evidence | `d17d658d3028f73dc6309451487a8e4295f6f3e3c029e8df8f3169f8f26f9042` | same final restored composition, bounded and non-overlapping; not promotable |
| `multi-12` diff | `6dc7befd4581ae674a12b641eea7c1a7464f9470afbe5342c5c6fccf59980a49` | broad magenta regions show the expected old-static-baseline mismatch |
| `multi-13` viewport | `3d0694ea0a6e113b5d637249282a8af8cb44e32008dfe546a6374b7f06f8cd5d` | same final hierarchy, direction split, focus, surfaces, and visible checker contamination |
| `multi-13` current/evidence | `f72d663feb91dddbd5a72f4b5a61da2b374f38a18ac20e0c6ae2c35c18b63960` | same final restored composition; no editor clipping or cross-instance overlap observed; not promotable |
| `multi-13` diff | `6dc7befd4581ae674a12b641eea7c1a7464f9470afbe5342c5c6fccf59980a49` | byte-identical diff to `multi-12`; broad old-baseline drift remains |

The runner emitted only final/viewport/current/diff/evidence images, not per-phase images. Initial, updated, and unmounted facts are therefore accepted from the exact trusted machine receipts, while visual inspection is explicitly limited to the retained final state.

## Proxy, fingerprints, and governance

- The existing sticky proxy on port 3456 and app on port 3001 were reused and never restarted or stopped.
- Starting and final health: connected, `sessions=21`, `managedTabs=0`, Chrome port 9222.
- Final targets `87F2F6EFBF64A9286FBC3629A63DD451` and `7B16BEE2A8C45C9F66947992FA3556A4` are absent; no 003-owned/helper target remains.
- Canonical baseline directory hash before/after: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`.
- Atomic seven-path fingerprint, sorted `path + NUL + bytes + NUL`: `84088f5e49f91dc06c360e00ae78676692e8d45db9a3ba8c7e5df4a1c47f913e`.
- Full runner implementation fingerprint over 38 current allowed sources: `1205e8283d420c336617da7976a8b9e9add9c5b9268ee274829e05ed55dbf052`.
- No update mode, promotion, canonical write, tolerance/mask change, task/run-state/review-report edit, commit, push, archive, or spec sync occurred.

## Reviewer and integration remainder

A fresh non-author reviewer must inspect the seven-path atomic delta and repeat `multi-editor-isolation` from a fresh reviewer-owned target. Closure requires independently observed exact initial identities, trusted UPDATE/UNMOUNT/RECREATE coordinates and page receipts, exact right profile update, unchanged left identities/geometry/focus/claim, destroyed cached old API, zero old portal/control/claim residue, fresh recreated identities, exact final restoration, unchanged canonical hash, and no proxy growth.

Integration must separately classify the obsolete canonical image, resolve the checker badge/detector mismatch before any promotion, and resolve the two disclosed Library build/type errors. This fixer makes no baseline-promotion, whole-matrix-green, or finding-closure claim.

## Durable findings

1. An imperative API lifecycle guarantee must invalidate the object consumers actually cache; replacing only an internal reference leaves stale public objects looking live.
2. Simultaneous multi-editor surface ownership cannot be proved with a cross-instance product menu. Each instance needs a distinct connected trigger, portal, owner identity, and claim with React unmount cleanup.
3. Survivor isolation includes stable geometry and focus across trusted control actions and asynchronous recreation, not only root count and theme attributes.

`VHR-R1-003` remains **OPEN pending original reviewer disposition and integration**.
