# Fixer 003 handoff

## Original intent

Repair `VHR-R1-003`, the multi-editor harness false-pass. The scenario must visibly and trustfully update one editor, unmount it, prove survivor and old-owner/API cleanup, recreate a fresh editor, and restore the declared two-editor state without accepting phase/count markers alone.

## Position

Atomic implementation, focused tests, two final Chrome runs, personal inspection of all retained final images, fingerprints, and the durable report are complete. `VHR-R1-003` is **IMPLEMENTED-OPEN** pending non-author review and integration.

Authoritative report:

`rasen/changes/visual-regression-hardening/evidence/fix-round-1/atomic-003/fix-report.md`

## Done / Remaining

Done:

- replaced the static initial-frame pass with visible trusted UPDATE, UNMOUNT, and RECREATE controls;
- retained exact initial root/API/public-id references and asserted same-object update plus fresh-object recreation;
- fixed the product cached-API destruction defect by invalidating the public API object in place;
- added a focused cached-API unmount regression;
- provided two simultaneous independently claimed React-portaled fixture surfaces with real `aria-controls` associations;
- proved exact right dark/RTL/tablet to light/LTR/phone-touch update while left identities/profile/geometry/focus/association remain unchanged;
- proved old right root/API/control/surface/control-id/claim cleanup and zero portal residue;
- preserved the right layout slot during unmount and restored left focus after each trusted lifecycle control;
- proved fresh generation-two right identities and exact final dark/RTL/tablet restoration;
- passed 60/60 visual unit tests, the 1/1 cached-API product test, exact-file Prettier/ESLint, strict UTF-8, and diff whitespace checks;
- retained `fixer-003-multi-12` and `fixer-003-multi-13`, inspected all eight PNGs, preserved the canonical hash, and confirmed proxy `21 / 0` with both targets absent.

Remaining:

- a fresh non-author reviewer must independently repeat and disposition the seven-path atomic finding;
- final images differ from the obsolete static canonical baseline and must not be promoted from fixer evidence;
- the visible checker badge/detector-zero mismatch remains an integration issue and causes a localized 37-pixel difference between repeated final captures;
- integration owns the existing `LibraryMenuSection.tsx:70` missing-`name` build/type error and `visualRegressionHost.tsx:1463` Library `status` widening.

## Key decisions

- Trusted lifecycle input is exact-target activation plus visible-control `clickAt` and correlated trusted page pointer/click receipts.
- Immutable initial references are held in the host; phase labels and root attributes are observations, never identity proof.
- Fixture-owned surfaces use the product `useFloatingSurfaceOwner` protocol and React portals because the product main-menu owner cannot represent two simultaneous independent instances.
- A 360px non-editor placeholder preserves survivor geometry while editor count remains one and every right owner/API association is absent.
- Focus restoration is a bounded post-commit loop covering update, unmount, and asynchronous recreation; each phase wait requires the left owner to be active before snapshot acceptance.
- The exact updated right profile is `phone / phone / touch / mobile`; no signature field is ignored.
- The product API object is mutated to `isDestroyed=true` before its methods are replaced, preserving consumer-cached object identity.

## Eliminated hypotheses and gotchas

- Hidden fixture controls and JavaScript `.click()` are not trusted acceptance.
- Tablet versus phone geometry was not the missing-owner cause.
- Direct imperative `updateScene({ openMenu:"canvas" })` cannot keep two product menus independently owned; one supersedes the other.
- Retaining `openMenu:"canvas"` after moving to fixture portals caused delayed recreated-editor focus theft; remove the seed instead of extending sleeps.
- Removing the full right column changed left geometry/profile; preserve an empty slot, not an editor or owner.
- The phone resolver legitimately changes density from tablet `compact` to phone `touch`; copying the initial density made a false expected profile.
- The final checker detector reports zero while the red badge remains visibly present; DOM detector output does not overrule image inspection.

## Browser evidence

Primary run `fixer-003-multi-13`:

- target `7B16BEE2A8C45C9F66947992FA3556A4`, absent after cleanup;
- initial left `left-root-1 / left-api-2 / vJqqJjtobMj5DUWmkyT7r`, initial right `right-root-3 / right-api-4 / hlbWaH77VHkpRfifzpoY8`;
- trusted control points: update `(575.21875,29.5)`, unmount `(714.4453125,29.5)`, recreate `(859.2265625,29.5)`;
- updated right exact profile `[1,"phone","phone","portrait","regular","touch","mobile","ltr",false,0,0,0,0,0,0,0,0]`;
- unmounted old right: root disconnected, API destroyed, controls/surfaces/control ids/portal residue all `0`, owner claim `false`;
- left survivor remains at `{ x:24, y:68, width:1008, height:808, right:1032, bottom:876 }` with active focus and exact initial identities;
- recreated right `right-root-9 / right-api-10 / ZT6AozrV_w_C-QYMQAopL`, exact initial semantics, old API still destroyed, stale markers `0`;
- semantic/cleanup/console failure counts `0`; target cleanup and proxy health true;
- comparison-only failure: 624,725 pixels, ratio `0.48204089506172837`, current `f72d663f...`, diff `6dc7befd...`.

Repeat run `fixer-003-multi-12` has the same lifecycle result, mismatch count/bounds, and diff hash. The two decoded currents differ only by 37 pixels inside the visible checker badge number at `(47,816,8x9)`.

## Verification and fingerprints

- visual unit: 60/60 pass;
- cached API regression: 1/1 pass;
- exact seven-file Prettier and ESLint: pass;
- strict UTF-8/no BOM/no replacement/known mojibake: pass;
- `git diff --check`: pass;
- build before typecheck on the final source: only the two disclosed external Library errors remain;
- proxy: connected, `sessions=21`, `managedTabs=0`, no owned/helper targets;
- canonical baseline: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`;
- atomic seven-path: `84088f5e49f91dc06c360e00ae78676692e8d45db9a3ba8c7e5df4a1c47f913e`;
- full 38-source implementation: `1205e8283d420c336617da7976a8b9e9add9c5b9268ee274829e05ed55dbf052`.

## Working set

- `excalidraw-app/visualRegressionHost.tsx`
- `scripts/visual-regression/{actions,runner,scenarios,visual.unit.test}.ts`
- `packages/excalidraw/components/App.tsx`
- `packages/excalidraw/tests/packages/events.test.tsx`
- `rasen/changes/visual-regression-hardening/evidence/fixer/run-fixer-003-multi-{12,13}.json`
- `scripts/visual-regression/results/fixer/fixer-003-multi-{12,13}/`
- `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/*fixer-003-multi-{12,13}*`
- `rasen/changes/visual-regression-hardening/evidence/fix-round-1/atomic-003/fix-report.md`

## Next action

Dispatch a fresh non-author reviewer against the atomic report and seven-path fingerprint. Require an independent reviewer-owned target, exact trusted lifecycle/identity/cleanup receipts, unchanged canonical hash, personal inspection of the retained reviewer images, and zero proxy growth. Keep the finding open if any identity, survivor, old-API, association, or cleanup fact is absent; do not promote checker-contaminated images.
