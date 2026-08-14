# VHR-R1-002 atomic fix report

## Status

**IMPLEMENTED AND ATOMICALLY EVIDENCED — OPEN pending non-author reviewer disposition and integration.** The short-phone toolbar path now trusted-clicks the complete final row at three physical coordinates, proves exact row activation with zero sibling/adjacent activation, isolates the adjacent phone action row, closes through trusted Escape and trusted outside canvas input with distinct focus behavior, restores the visible toolbar state, and exercises trusted unmount/recreate cleanup through a second real editor.

This report does not close `VHR-R1-002`. The retained phone and desktop scenarios have empty semantic and cleanup failure arrays and no performance failures, but both remain `fail` because their current images differ from canonical baselines. The visible red checker badge is also present in all three personally inspected captures. No baseline, candidate, tolerance, mask, task, run-state, or review disposition was changed.

## Atomic implementation

The retained 002 source seam is 13 paths:

1. `scripts/visual-regression/actions.ts`
   - opens the currently visible toolbar trigger through a browser-trusted coordinate receipt and correlates the physical point back to its current trigger identity;
   - samples the complete final menu row at inline ratios `0.15`, `0.50`, and `0.85` and records the exact row identity, action identity, bounding rectangle, trusted point receipt, active-tool transition, row click count, sibling click count, and adjacent click count;
   - asserts adjacent phone actions are hidden, inert, transparent, and pointer-disabled while the menu owns the foreground, then exactly restored after close;
   - closes through target-scoped trusted Escape and through the existing exact blank-canvas authority, requiring Escape to focus the trigger and outside close not to do so;
   - installs a second real editor, opens its menu, trusted-clicks unmount and recreate controls, proves the old editor/root/trigger/surface/adjacent nodes detached, proves the main editor survived untouched, records two distinct editor generations, and rejects any remaining fixture, coordinate, or receipt helper;
   - mirrors short-lived trusted-receipt state to token-scoped `documentElement` attributes so proxy evaluation can retrieve it even across lifecycle transitions, and removes those attributes in cleanup.
2. `scripts/visual-regression/proxy.ts`
   - replaces the ineffective Windows `keybd_event` path with target-scoped CDP `Input.dispatchKeyEvent` keyDown/keyUp commands for Escape, ArrowLeft, and Tab;
   - activates the exact target first and accepts the key only when the page receives a visible, focused, `isTrusted: true` event with the exact key/code;
   - returns `source: "browser-cdp"` and preserves exact target identity in the receipt.
3. `packages/excalidraw/components/AdaptiveEditorToolbar.tsx`, `ToolGroupDropdown.tsx`, and `dropdownMenu/DropdownMenuContent.tsx`
   - thread an explicit Escape-close signal from Radix content to the adaptive toolbar;
   - request trigger focus only for Escape, while pointer-outside close deliberately prevents automatic trigger focus;
   - shield the adjacent phone action row while a toolbar menu is open and restore its prior `aria-hidden`, inert, opacity, transition, and per-control pointer state on close or unmount.
4. `packages/excalidraw/components/floatingSurface/owner.ts` and `AdaptiveEditorToolbar.scss`
   - expose exact owner cleanup evidence and the phone shielding/restoration presentation used by the browser gate.
5. `excalidraw-app/visualRegressionHost.tsx`
   - owns the deterministic two-generation lifecycle fixture and records mount, unmount, and trusted control receipts without replacing the main editor.
6. `scripts/visual-regression/runner.ts`, `scenarios.ts`, and `performance.ts`
   - retain the complete `final-row-routing` evidence beside the declarative no-op action;
   - capture a separate restored screenshot;
   - use `open-toolbar-overflow` as the performance action for a scenario whose only declarative action is the final-row exercise, avoiding the phone-incompatible `toolbar-lock` path.
7. `scripts/visual-regression/visual.unit.test.ts` and `packages/excalidraw/components/adaptiveToolbar.test.tsx`
   - cover CDP key mappings, source fingerprint behavior, performance action selection, and the adaptive toolbar state changes supporting the browser proof.

## Root cause and eliminated hypotheses

- The original Escape failure was not loss of Chrome foreground activation. The OS helper foregrounded the exact Chrome window, but `keybd_event` produced no page key receipt. Target-scoped CDP keyboard delivery produced a visible, focused, trusted Escape receipt and closed the menu.
- Once trusted Escape delivery worked, it exposed a real product defect: the group and secondary menus did not reliably return focus to their trigger. Explicit Escape intent threading fixed that behavior; outside-pointer close remains intentionally non-restoring.
- The lifecycle failure was not a proxy request-body limit. Diagnostic expressions from roughly 1 KB through 8 KB completed successfully.
- The lifecycle failure was not general loss of `window` globals or JSON serialization after mounting a second editor.
- The shared `/eval` response path can mask a thrown page `Error` as `{}` because it returns `result.value` before `exceptionDetails`. Probe validation therefore serializes `__visualError` details through `evaluateJson` instead of inferring success from an empty object.
- The actual lifecycle trigger failure was stale node/point identity. Adaptive measurement can replace or alternate overflow and shapes trigger nodes during initial activation. Activating the exact tab before resolving the point, then correlating the physical point to the currently visible trigger inside the unique owner, removed the stale-identity race.

## Focused verification

- `yarn test:visual:unit` — **PASS, 54/54**.
- Focused mounted-editor and toolbar product command — **PASS, 5/5**. It covered both desktop and phone mounted-input authority plus Escape focus return, adjacent phone-row shielding/restoration, and unmount cleanup.
- Exact 13-file Prettier check using `node_modules/.bin/prettier.cmd --check` — **PASS**.
- Exact 12-file TypeScript/TSX ESLint check with `--max-warnings=0` — **PASS, zero errors/warnings**.
- Root `yarn test:typecheck` — **not green for two disclosed current-tree errors outside the 002 fix logic**:
  - `excalidraw-app/visualRegressionHost.tsx:724:40`: a Library fixture widens `status` to `string` instead of the `"published" | "unpublished"` literal union;
  - `packages/excalidraw/components/LibraryMenuSection.tsx:70:27`: one union member has no `name` property.
- Strict UTF-8 decoding, BOM/replacement/mojibake scan, and whitespace review of the 13 source paths plus both durable reports — **PASS**.

## Phone browser evidence

Retained run: `fixer-002-phone-12`.

- Result: `fail` only at current-vs-canonical comparison; `semanticFailures=[]`, `cleanupFailures=[]`, performance `failures=[]`, `targetsClean=true`, and `proxyHealthy=true`.
- Baseline hash before/after: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`.
- Mounted-input receipt: full mounted editor, passed, source fingerprint `e164bfa62352cc21bbae038b193d991f9da955719e83c5f2fa25a3d494c1086e`.
- Each of eight normal openings resolved the physical point `(505, 326)` to `toolbar-shapes-group`, with trigger controls, surface id, root owner, and owner claim all equal to `:r13:-shapes-menu`. The surface belonged to the same editor. The adjacent row was `aria-hidden`, inert, opacity `0`, and pointer-disabled while open.
- The final row was `:r13:-shapes-menu|toolbar-line|menuitemradio|خط`, action `toolbar-line`, rectangle `{ left: 418, top: 239, width: 178, height: 44 }`:

| Ratio | Requested point | Physical receipt | Transition | Row / sibling / adjacent clicks |
| --: | --- | --- | --- | --- |
| `0.15` | `(444.7, 261)` | `(444.6875, 261)`, trusted, target-owned | `rectangle -> line` | `1 / 0 / 0` |
| `0.50` | `(507, 261)` | `(507, 261)`, trusted, target-owned | `rectangle -> line` | `1 / 0 / 0` |
| `0.85` | `(569.3, 261)` | `(569.296875, 261)`, trusted, target-owned | `rectangle -> line` | `1 / 0 / 0` |

- Escape receipt: key/code `Escape`, `isTrusted: true`, source `browser-cdp`, exact target `96D22E1CD0A5A569833A7B07D87F649D`, document visible and focused. After two animation frames the surface count was zero, owner markers were absent, adjacent actions were fully restored, and the trigger was focused.
- Outside receipt: exact canvas point `(692.56, 316.74)` in editor `HsNygaJHZ4pNtWaJi8GtT`; both page and `ExcalidrawImperativeAPI.onPointerDown` receipts were trusted, exact-target and owner-owned. The menu closed, all blank-route cleanup gates restored, and the trigger correctly remained unfocused.
- Lifecycle fixture: opened owner `:r46:-shapes-menu`; trusted unmount at `(530.1875, 31)` detached the old editor/root/trigger/surface/adjacent nodes, released ownership, and left the main editor connected with zero toolbar markers/surfaces. Trusted recreate at `(689.796875, 31)` produced generation `2`. Mount/unmount identities matched exactly for generation 1 `oLvSOUUrqLB-HaIqscDVg` and generation 2 `U7p6vFu7R88ri-rwbKEt_`; both controls recorded `isTrusted: true`; final helper count was `0`.
- The final normal open returned to owner `:r13:-shapes-menu`; input restored exactly to `fine / hover / 10`.
- Accepted performance medians: CLS `0`, long-task duration `0 ms`, interaction duration `53.40000003576279 ms`, resource count `250`, transfer bytes `68,400`, harness duration `1266.8666999999987 ms`.
- Pixel comparison: 4,436 pixels, ratio `0.014568144499178983`, bounds `{ x: 16, y: 71, width: 678, height: 247 }`; expected/current/diff hashes `cc0fcfdf…`, `4ac5a2c4…`, and `19a72e0a…`.

Authoritative artifacts:

- `rasen/changes/visual-regression-hardening/evidence/fixer/run-fixer-002-phone-12.json`
- `scripts/visual-regression/results/fixer/fixer-002-phone-12/phone-dark-landscape__812x375__dpr1__dark__rtl__short-toolbar-overflow__fixer__fixer-002-phone-12__result.json`
- `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/phone-dark-landscape__812x375__dpr1__dark__rtl__short-toolbar-overflow__fixer__fixer-002-phone-12__evidence.png`
- `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/phone-dark-landscape__812x375__dpr1__dark__rtl__toolbar-restored__fixer__fixer-002-phone-12__evidence.png`

## Desktop adjacency coverage

Retained run: `fixer-002-desktop-1` against `desktop-toolbar-group`.

- The trusted action opened the current toolbar trigger at `(660.5, 831)`; the resulting menu was visible at `{ x: 561, y: 623, width: 200, height: 178 }`, inside the same 1440x900 editor and without crop/overflow failures.
- Exact blank-canvas routing also remained trusted and clean at requested point `(1232.64, 768.24)` in editor `HeJO4ot6t7EAONM_AuVlI`, with correlated page/editor receipts and exact restoration.
- `semanticFailures=[]`, `cleanupFailures=[]`, performance `failures=[]`, `targetsClean=true`, `proxyHealthy=true`, and input restored exactly to `fine / hover / 10`.
- The run remains `fail` only at image comparison: 22,880 pixels, ratio `0.01765432098765432`, bounds `{ x: 15, y: 16, width: 1410, height: 869 }`; expected/current/diff hashes `b38f543b…`, `6d8903af…`, and `06839f86…`.
- Baseline hash before/after remained `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`.

Authoritative artifacts:

- `rasen/changes/visual-regression-hardening/evidence/fixer/run-fixer-002-desktop-1.json`
- `scripts/visual-regression/results/fixer/fixer-002-desktop-1/desktop-toolbar-group__1440x900__dpr1__light__ltr__toolbar-group-open__fixer__fixer-002-desktop-1__result.json`
- `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/desktop-toolbar-group__1440x900__dpr1__light__ltr__toolbar-group-open__fixer__fixer-002-desktop-1__evidence.png`

## Personal image inspection

All retained open/restored images were opened at original resolution during the final pass:

| Capture | Visible state | Disposition |
| --- | --- | --- |
| phone open | five-row dark Shapes menu is fully visible above the phone toolbar; Line is selected; no row is clipped | interaction geometry is visually credible; red checker badge remains; not promotable |
| phone restored | menu is absent; command rail and bottom toolbar are restored; Line remains selected | restoration is visually clean; red checker badge remains; not promotable |
| desktop open | five-row light Shapes menu is complete and anchored above the centered desktop toolbar | no menu crop or stray shield is visible; red checker badge remains; not promotable |

The clean semantic/cleanup receipts do not override these canonical mismatches or the visible checker contamination.

## Proxy, fingerprints, and governance

- The existing sticky proxy was reused and never restarted.
- Final health: connected, `sessions=21`, `managedTabs=0`, Chrome port 9222.
- Phone target `96D22E1CD0A5A569833A7B07D87F649D` and desktop target `3C75F86A935C262103789F66155D353E` are both absent; no owned/helper target remains.
- Canonical baseline directory fingerprint: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`.
- Atomic 13-path fingerprint, sorted `path + NUL + bytes + NUL`: `aa0fa170db27ee60d1da569e6db9a3069d55deff2eedc3c477312e747a60f303`.
- Full runner implementation fingerprint over 36 current allowed sources: `e164bfa62352cc21bbae038b193d991f9da955719e83c5f2fa25a3d494c1086e`.
- No diagnostic source file or temporary DOM helper remains.
- No update mode, promotion, baseline write, mask/tolerance edit, task/run-state edit, review-report edit, commit, push, archive, or spec sync occurred.

## Reviewer remainder

A fresh non-author reviewer must review the 13-path atomic delta and repeat at least the coarse short-phone path plus `desktop-toolbar-group`. Closure requires independently observed left/center/right trusted row receipts, zero sibling/adjacent activation, distinct Escape/outside focus behavior, exact unmount/recreate identities, helper count zero, unchanged baseline hash, and no proxy target growth. The reviewer must separately disposition the canonical mismatch/checker contamination and the two external type errors; this fixer makes no whole-matrix or baseline-promotion claim.

## Durable findings

1. Exact foreground activation is necessary but not sufficient keyboard evidence: target-scoped delivery must be paired with a visible, focused, `isTrusted` page receipt, and it can expose product focus defects hidden by a non-delivering OS helper.
2. In adaptive UI, a node or point captured before activation can become stale during measurement. Resolve identity at the final physical point inside the unique owner and correlate that receipt to the current control.
3. Interaction correctness, cleanup correctness, and image comparison are independent gates. A semantically clean trusted sequence must not erase a canonical mismatch or visible checker contamination.

`VHR-R1-002` remains **OPEN pending original reviewer disposition and integration**.
