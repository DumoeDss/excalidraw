# App Chrome Integration — Independent Review Report

## Verdict

**CLEAN after review-cycle round 1 — 1/1 findings resolved; 0 open findings.**

The prospective 35-file source/test delta satisfies the application-content integration contracts and passes the independent focused verification. The initial review found one Minor narrow-screen geometry defect in the top-level recovery page. A non-author fixer corrected it, and the original independent reviewer confirmed the fix at 375×812 and 1440×900 with no new findings.

This review is report-only. No product or test source was edited.

## Scope check

- **Intent:** introduce one deep internal `AppContent` hierarchy/state/action/bounds seam and migrate the named app-chrome adapters without taking ownership from their existing surfaces, hosts, or editor instances.
- **Delivered:** the internal module plus explicit welcome, share/collaboration, Library, AI/TTD, promo, loading/error, Stats/host, and top-level fallback adapters, with focused unit and integration coverage.
- **Result:** **CLEAN.** No unrelated dependency, public-entry, responsive-policy, token-system, or screenshot-infrastructure expansion was found. The TTD chat/input edits are part of the named AI container-bound migration.
- **Review branch:** `feat/editor-ui-redesign`.
- **Review anchor:** HEAD `4b512e0835e014e6f994f319ae65c147126515b1`; tree `abd706c122f706defde8bc239907fb3dc7ef4119`.
- **Reviewed prospective delta:** 23 tracked modified files plus 12 untracked source/test files, 35 paths total.
- **Reviewer mode:** independent, report-only; no implementation claim was accepted solely from the implementer handoff.

## Finding history

### [Minor — RESOLVED in round 1] ACI-R1-001 — The narrow top-level recovery page overflowed horizontally

- **Location:** `packages/excalidraw/css/styles.scss:789-817`, especially `.ErrorSplash.excalidraw` and `.ErrorSplash-messageContainer`.
- **Problem:** both layers use content-box sizing. The splash has `min-height: 100%` plus 16 px padding on each side, and the card has `width: min(44rem, 100%)` plus 28 px padding on each side. At 375×812 this makes the outer splash 407×844 and the card 375 px wide starting at x=16, with its right edge at x=391.
- **Real-browser evidence:** the actual React `TopErrorBoundary` was triggered in the reviewer target. `phone-dark-top-error-fallback.json` records viewport `375×812`, splash `407×844`, card `x=16..391`, content `x=45..362`, card `box-sizing: content-box`, and horizontal overflow. The personally inspected screenshot is `review-chrome/phone-dark-top-error-fallback.png`.
- **Impact:** the card is visibly cropped at the inline end. Its recovery actions and scene data remain reachable by horizontal scrolling, so the defect does not remove recovery or lose data.
- **Required fix:** apply `box-sizing: border-box` and a bounded logical inline size such as `max-inline-size: 100%` to both the splash and card as appropriate. Add a 375 px geometry regression to `excalidraw-app/components/TopErrorBoundary.test.tsx` asserting that both right edges remain within the viewport.
- **Resolution:** `/root/app_chrome_fixer` applied the two-file CSS/test delta. `/root/app_chrome_reviewer` independently reproduced its fingerprint, ran the focused regression and Sass/diff checks, and verified the actual React boundary in new phone and desktop targets. Phone now renders splash `0..375` and card `16..359` with zero horizontal scroll; desktop retains a 762 px card. See `re-review-round-1.md`.

## Standards axis

**PASS.** The sole Minor frontend-completeness finding was resolved in review-cycle round 1.

- No data-safety, security, trust-boundary, enum/value-completeness, race, or significant performance issue was found.
- No dependency or lockfile change and no public package-entry change exists in the scoped delta.
- `AppContent` remains a deep internal module. Adapters import it explicitly; it is not exposed through a public package barrel.
- No added token definition, `!important`, viewport unit, responsive tier, tablet/landscape/RTL policy, or visual-regression infrastructure was found.
- State and actions remain adapter-owned. The shared module provides hierarchy, state presentation, action grouping, and container bounds; it does not absorb host behavior, callbacks, or surface lifecycle.
- No dead debug path, restricted-content issue, or evidence/source encoding defect was found.

## Spec and contract axis

**PASS.** The following required contracts have zero open findings:

- **Deletion test and ownership:** removing the internal module would remove shared presentation structure only; domain actions, state transitions, and surface ownership remain at their prior adapters.
- **Surface seams:** modal and floating frames retain focus, settlement, modal/floating lifecycle, and sidebar policy. `AppContent` owns only interior hierarchy/state/actions/bounds.
- **Host before fallback:** host children remain mounted before internal fallbacks. Existing `defaultUIEnabled` behavior and callback arguments are preserved.
- **Freshness:** LayerUI-hosted children and callbacks refresh after rerender; the focused integration test covers current host callbacks and child replacement.
- **Collaboration timing:** same-turn collaboration compatibility events are captured synchronously by the owning application path; delayed DOM/loading work stays editor-scoped and cleans up at its owner.
- **Multi-editor isolation:** fallback registration and cleanup remain per editor; no global winner or cross-editor teardown was introduced.
- **Bounds and scrolling:** migrated content is bounded by its editor container and physical safe areas, with internal overflow. The AI/TTD migration adds no viewport-unit sizing.
- **Pointer and marker neutrality:** neutral wrappers are pointer-pass-through, interactive leaves remain reachable, and the shared content module adds no viewport marker.
- **Adapter coverage:** welcome, share/collaboration, Library, AI/TTD, promo, loading/recoverable error, Stats/host content, and the browser-level fallback all use explicit adapters.
- **Downstream exclusions:** responsive-tier, tablet/landscape, RTL-policy, and screenshot-regression work remains downstream as designed.

## Coverage map

```text
APP CONTENT CONTRACT COVERAGE
=============================
[+] internal hierarchy / state / actions / bounds
    ├── [★★★ TESTED] variants, sections, actions, overflow, pointer policy
    └── [STATIC PASS] deep import only; no public entry or domain ownership
[+] application adapters
    ├── welcome ─ share/collaboration ─ Library ─ AI/TTD
    └── promo ─ loading/error ─ Stats/host ─ top-level fallback
[+] host and lifecycle contracts
    ├── [★★★ TESTED] host-before-fallback, callback/child freshness
    ├── [★★★ TESTED] per-editor fallback cleanup and multi-editor isolation
    └── [★★★ TESTED] synchronous collaboration capture
[+] container and interaction contracts
    ├── [BROWSER PASS] desktop/phone light/dark representative states
    ├── [BROWSER PASS] neutral-wrapper hit routing; zero shared markers
    └── [★★★ FIXED/VERIFIED] 375 px top-level recovery containment (ACI-R1-001)
```

## Independent Chrome evidence

The reviewer used disposable target `07E94627666A2A9C1F72E5BC59705795` at `http://localhost:3001/`. Sixteen accepted screenshots under `evidence/review-chrome/` were personally opened and inspected.

| Viewport / theme | Accepted representative states | Result |
| --- | --- | --- |
| 1440×900 light | welcome, share, promo, Stats/host leaf | Pass |
| 1440×900 dark | Library, AI, loading | Pass |
| 375×812 light | welcome, hard-reload baseline, share/collaboration, promo, recoverable error | Pass |
| 375×812 dark | Library, AI, Stats/host leaf | Pass |
| 375×812 dark | real top-level React error boundary | Initial Minor overflow, ACI-R1-001; resolved and independently verified in round 1 |

- The fresh 375×812 light hard reload retained an exact `375×812` editor and document viewport. The welcome surface was `343×748` at x/y=16.
- The phone bottom bar occupied y=`678..790`; the toolbar occupied y=`736..790` and remained nested within that bar. The personally inspected capture shows no footer/background collision.
- Neutral `AppContent` hit probes resolved through to the canvas; probes on interactive rows/buttons resolved to their intended real leaves.
- Every accepted representative state recorded shared marker count `0`, yellow bottom-left candidates `0`, and unexpected visible overlays `0`.
- The clean hard reload recorded `0` error-level console events. The checker host existed but had no badge or messages.
- `desktop-dark-top-error-fallback.png` and its JSON are explicitly excluded: only the CDP viewport had been changed while phone inline root dimensions persisted, so it is not valid desktop evidence.
- Round 1 added two reviewer-owned, separately targeted captures under `evidence/re-review-chrome/`: 375×812 splash/card right edges `375/359`, and 1440×900 right edges `1440/1101`; both had zero horizontal scroll, checker badges, unexpected overlays, and error-level console events.

## Automated verification

- Independent focused suite: **PASS**, 20 files / 231 tests, 71.88 s wall time. Logs: `.rasen/changes/app-chrome-integration/ephemera/independent-review/focused-tests.stdout.log` and `.stderr.log`.
- The non-failing stderr output is limited to existing React update/`act()` warnings, disabled-tool diagnostics, and undefined test Firebase configuration; no test failed.
- `git diff --check` over the scoped app/package delta: **PASS**.
- Strict UTF-8 validation of all 35 source/test paths: **PASS**; no decode failure, BOM, U+FFFD, or mojibake signature.
- Added-line/static audits: **PASS** for dependency/public-entry changes, token definitions, `!important`, viewport units, responsive tiers, visual-regression infrastructure, and restricted-content patterns.
- The implementation handoff additionally records a passing package build before root typecheck, changed-file ESLint/Prettier, SCSS compilation, and a final affected 6-file / 59-test rerun. Because this reviewer changed no source, those expensive gates were not repeated.
- Review-cycle round 1: **PASS**, `TopErrorBoundary.test.tsx` 1 file / 2 tests; independent Sass compilation and path-scoped diff/encoding checks passed. New phone and desktop real-boundary captures have zero horizontal scroll, checker messages, unexpected overlays, or error-level console events.

## Prospective source fingerprint

- Manifest: the 35 current app/package source/test paths, Windows-stable ordinal-ignore-case sorted by repo-relative forward-slash path.
- Hash input per path: UTF-8 path bytes, NUL, raw file bytes, NUL.
- Initial-review SHA-256: `c2bdb44921fb593314cbfe29855a15e2b8d49a4782972fe5b2eaf1fdb9c344f1`.
- Post-fix SHA-256: `4c32623cee808758c9ede0db248fa88554d8e59da5bdeade3e701daf8ed9add6`.
- The post-fix fingerprint was recomputed after delta verification; reports and browser evidence are intentionally outside the source/test manifest.

## Evidence hygiene and out-of-scope classification

- The untracked literal `NUL` path is pre-existing, 2,506 bytes, and has SHA-256 `a879efec57ff6125a42302a74ab143ceffd5230aac4a76d82a49005b40658d60`. It is a compressed Sass compilation artifact outside the 35-path prospective source/test scope. It was neither modified nor treated as a product finding.
- `handoff/implementation-final.md` is strict UTF-8 without BOM, begins with the expected Markdown heading, and contains no `encodedCommand` or base64 payload line. The alleged handoff contamination is not reproducible in the current tree, so there is no evidence-hygiene finding.
- Raw reviewer scripts and JSON remain under `.rasen/.../ephemera/independent-review/`; accepted screenshots remain under `evidence/review-chrome/`.

## Review-cycle disposition

Round 1 is complete: the non-author fixer addressed ACI-R1-001 and the original independent reviewer confirmed 1/1 findings resolved with no new findings. Final verdict: **CLEAN**. See `review-cycle-report.md` and `re-review-round-1.md`.
