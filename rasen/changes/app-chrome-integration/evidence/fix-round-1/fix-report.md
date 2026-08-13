# ACI-R1-001 Fix Report — Round 1

## Scope and baseline

- Finding: `ACI-R1-001`, narrow top-level recovery page horizontal overflow.
- Owned source/test paths only:
  - `packages/excalidraw/css/styles.scss`
  - `excalidraw-app/components/TopErrorBoundary.test.tsx`
- Pre-fix two-path Git delta fingerprint (`git diff --binary ... | git hash-object --stdin`): `c0c233d20404f45669f423a036c794f362682760`.
- Reviewer baseline: at 375×812 the actual React `TopErrorBoundary` rendered splash `right=407` and card `right=391` against a 375px viewport; both layers were `content-box`.
- Fresh fixer Chrome baseline on disposable target `DB5DCE9EAB70C45F80B82A06DC4D2745`: splash `0..407`, card `16..391`, content `45..362`, `cardBoxSizing=content-box`, 3 recovery actions present, recoverable scene data present.

## TDD red → green

Approved seam: rendered `TopErrorBoundary` / `ErrorSplash` public DOM at a 375px viewport, with geometry derived from the actual compiled recovery rules applied to the rendered splash and recovery card.

- RED command: `yarn vitest excalidraw-app/components/TopErrorBoundary.test.tsx --run --reporter=verbose`
- RED result: exit 1; 1 failed / 1 passed. The containment test failed on the actual defect: `expected 407 to be less than or equal to 375`.
- GREEN command: `yarn vitest excalidraw-app/components/TopErrorBoundary.test.tsx --run --reporter=verbose`
- GREEN result: exit 0; 1 file passed, 2 tests passed.

## Exact fix delta

- `.ErrorSplash.excalidraw`: added `box-sizing: border-box`, `inline-size: 100%`, and `max-inline-size: 100%` so its padding stays within the browser viewport.
- `.ErrorSplash-messageContainer`: added `box-sizing: border-box` and `max-inline-size: 100%`; converted the physical width to a bounded logical inline size. Its desktop cap includes the existing padding and border so the previous 44rem content width / 762px outer width remains unchanged.
- `TopErrorBoundary.test.tsx`: added one 375px regression that renders the actual error boundary, loads the compiled production recovery rules, measures the rendered splash/card inline bounds, and asserts both right edges are `<= 375`.
- No recovery callbacks, text, scrolling, scene details, dependency, export, token, or unrelated styling was changed.

Post-fix two-path raw-file manifest fingerprint (sorted normalized path + NUL + raw bytes + NUL, SHA-256): `96fff41ad069e5286056e9389d2b1f2ab8bc41310bc1252bf4ccf560ac8ecb6d`.

## Real Chrome verification

Disposable target: `DB5DCE9EAB70C45F80B82A06DC4D2745`, app `http://localhost:3001/`, CDP 9222 through shared proxy 3456.

- 375×812 dark actual `TopErrorBoundary`: splash `0..375`; card `16..359`; content `45..330`; splash/card `border-box`; document client/scroll width `375/375`.
- Recovery preservation: 3 actions remain rendered and textarea contains `{"scene":"recoverable"}`.
- Desktop 1440×900: splash `0..1440`; card `339..1101`, outer width `762`; content `418..1022`. This preserves the prior desktop card width while bounding phone geometry.
- Accepted phone capture: `.rasen/changes/app-chrome-integration/ephemera/fix-round-1/phone-dark-top-error-accepted.png`.
- The accepted capture was personally opened and inspected: no inline-end crop, content and textarea are complete, and no checker badge or overlay is visible.
- Accepted phone state: checker `0`, unexpected overlay `0`, error-level console events `0`.

## Verification and audits

- Focused Vitest: PASS, 1 file / 2 tests.
- Changed-test ESLint (`--max-warnings=0`): PASS.
- Prettier check for the owned test/SCSS: PASS.
- Sass compilation of `packages/excalidraw/css/styles.scss`: PASS (`37711` output bytes).
- `git diff --check` for tracked SCSS plus `git diff --no-index --check` for the untracked owned test: PASS.
- Strict UTF-8 decode: PASS for both paths; no BOM, U+FFFD, or common mojibake signatures.
- Added-line audit: no `!important`, debug logging, debugger, TODO/FIXME, or restricted-content marker.
- Scope audit: no other product/test path, task checkbox, run state, stash, commit, push, archive, spec, dependency, or public export was touched.

This fixer report does not declare the finding closed; closure remains with the original independent reviewer.
