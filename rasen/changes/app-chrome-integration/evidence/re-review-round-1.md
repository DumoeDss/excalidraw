# App Chrome Integration — Delta Re-review Round 1

## Verdict

**CLEAN — ACI-R1-001 resolved; no new findings.**

The original independent reviewer inspected only the fixer-owned two-file delta, independently reran the focused regression and Sass/diff checks, and triggered the real `TopErrorBoundary` in two new disposable Chrome targets. The 375 px overflow is closed without a desktop-width, recovery-content, pointer-routing, or scrolling regression.

This re-review is report-only. No product, test, task, or run-state file was edited by the reviewer.

## Reviewed delta

- Fixer: `/root/app_chrome_fixer`.
- Reviewer: `/root/app_chrome_reviewer`.
- Owned paths: `packages/excalidraw/css/styles.scss` and `excalidraw-app/components/TopErrorBoundary.test.tsx` only.
- Two-path normalized-path/raw-byte SHA-256: `96fff41ad069e5286056e9389d2b1f2ab8bc41310bc1252bf4ccf560ac8ecb6d` (independently reproduced).
- Source anchor: HEAD `4b512e0835e014e6f994f319ae65c147126515b1`, tree `abd706c122f706defde8bc239907fb3dc7ef4119`.
- Full prospective 35-path source/test fingerprint after the fix: `4c32623cee808758c9ede0db248fa88554d8e59da5bdeade3e701daf8ed9add6`.
- No file outside the claimed two-path source/test delta changed as part of this fix.

## ACI-R1-001 disposition

**RESOLVED.**

- `.ErrorSplash.excalidraw` now uses border-box sizing and a 100% bounded logical inline size, keeping its padding inside the viewport.
- `.ErrorSplash-messageContainer` now uses border-box sizing and `max-inline-size: 100%`. Its desktop cap is `44rem + 2 × 1.75rem + 2px = 762px`, preserving the prior desktop outer width while allowing the card to shrink inside the phone content box.
- The new 375 px test measures the rendered recovery splash/card using the compiled production recovery rules. With the pre-fix rules, the same model produces splash right `407` and card right `391`, so the first `<= 375` containment assertion fails. Current code passes both containment assertions.
- No recovery callback, copy, scene-data path, shared-content pointer policy, or internal overflow rule changed.

## Independent automated verification

- `yarn vitest excalidraw-app/components/TopErrorBoundary.test.tsx --run --reporter=verbose`: **PASS**, 1 file / 2 tests, 3.51 s wall time.
- `node_modules\.bin\sass.cmd packages\excalidraw\css\styles.scss <ephemera-output> --no-source-map`: **PASS**, 37,716 output bytes.
- `git diff --check -- packages/excalidraw/css/styles.scss`: **PASS**.
- `git diff --no-index --check -- <empty-file> excalidraw-app/components/TopErrorBoundary.test.tsx`: **PASS**.
- Strict UTF-8 validation of both owned files: **PASS**; no BOM, U+FFFD, or mojibake signature.
- Logs and raw output: `.rasen/changes/app-chrome-integration/ephemera/re-review-round-1/`.

## Independent Chrome verification

The reviewer used separate new targets to prevent phone emulation/root state from contaminating desktop evidence:

- Phone target `439380DE975B1F7198456F546528E49F`, 375×812 dark.
- Desktop target `8AE4E97D7408922BAFDA8434A197B6EE`, 1440×900 light.

Both targets rendered the actual React `TopErrorBoundary` with reviewer-owned recoverable scene data.

| State | Splash bounds | Card bounds | Horizontal scroll | Recovery | Diagnostics |
| --- | --- | --- | ---: | --- | --- |
| 375×812 dark | `0..375`, 375×812 | `16..359`, 343 px wide | 0 px | 3 actions + scene textarea | checker 0, overlay 0, console errors 0 |
| 1440×900 light | `0..1440`, 1440×900 | `339..1101`, 762 px wide | 0 px | 3 actions + scene textarea | checker 0, overlay 0, console errors 0 |

- Splash and card use `box-sizing: border-box`; the card has `max-inline-size: 100%` in both states.
- Center-point `elementFromPoint` probes resolved to all three recovery buttons and the scene textarea in both viewports. The existing `pointer-events: none` card wrapper therefore does not block its interactive leaves.
- Both screenshots were personally opened and inspected. The phone card has no inline-end crop; the desktop card retains the intended centered width and visual hierarchy.
- Reviewer-owned screenshots: `re-review-chrome/phone-dark-top-error.png` and `re-review-chrome/desktop-light-top-error.png`.
- Raw geometry, hit probes, and console results: `.rasen/changes/app-chrome-integration/ephemera/re-review-round-1/`.
- Both reviewer targets were closed after evidence capture and confirmed absent from the proxy target list.

## Final disposition

- Resolved findings: `ACI-R1-001` (Minor), 1/1.
- New findings: none.
- Round result: **CLEAN**.
