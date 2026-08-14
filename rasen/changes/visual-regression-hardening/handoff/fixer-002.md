# Fixer 002 handoff

## Original intent

Repair `VHR-R1-002`, the unsupported short-phone toolbar interaction pass. The browser path must trusted-click left/center/right points on the complete final row, prove no sibling or adjacent activation, shield and restore adjacent phone actions, close through trusted Escape and trusted outside input with correct focus behavior, and prove unmount/recreate cleanup in a real second editor.

## Position

Atomic implementation, focused verification, phone and desktop Chrome evidence, personal image inspection, fingerprints, and the durable report are complete. `VHR-R1-002` is **IMPLEMENTED-OPEN** pending non-author review and integration.

Authoritative report:

`rasen/changes/visual-regression-hardening/evidence/fix-round-1/atomic-002/fix-report.md`

## Done / Remaining

Done:

- replaced non-delivering Windows keyboard injection with exact-target CDP trusted key delivery;
- fixed real Escape trigger-focus restoration while preserving no-focus outside close;
- made final-row coordinate receipts robust to adaptive trigger replacement;
- proved three distinct physical points all activate `toolbar-line` once and activate siblings/adjacent controls zero times;
- proved adjacent phone actions are shielded while open and exactly restored after row selection, Escape, outside close, and unmount;
- proved trusted lifecycle unmount/recreate with two distinct editor identities, main-editor survival, owner release, and helper count zero;
- retained and personally inspected phone open/restored and desktop open screenshots;
- passed 54/54 visual unit tests, 5/5 focused product tests, exact-file Prettier, and exact-file ESLint;
- recomputed baseline, atomic, and full implementation fingerprints;
- confirmed final proxy health `21 / 0` and absence of both retained disposable targets.

Remaining:

- a fresh non-author reviewer must independently repeat and disposition the atomic finding;
- both retained scenarios still differ from canonical images and all inspected captures visibly contain the red checker badge; none may be promoted from this evidence;
- integration must resolve the two existing root typecheck errors in the Library fixture/type seam.

## Key decisions

- Trusted keyboard authority is target-scoped CDP keyDown/keyUp plus an exact visible/focused `isTrusted` page receipt; window foregrounding alone is not acceptance evidence.
- Escape intent is explicit through DropdownMenu content to the adaptive toolbar. Escape requests trigger focus; pointer-outside close explicitly does not.
- The active toolbar trigger is resolved after exact-target activation at the physical point inside the unique owner because measurement can replace overflow/shapes trigger nodes.
- Final-row acceptance correlates row identity, target-owned trusted pointerdown, active-tool transition, one row click, zero sibling clicks, and zero adjacent clicks at each sampled ratio.
- The second-editor fixture is removed in `finally`, and acceptance requires old-node detachment, owner release, main-editor survival, fresh generation identity, matching mount/unmount pairs, and zero DOM helpers.
- Performance sampling for the final-row-only scenario uses `open-toolbar-overflow`, not the phone-incompatible primary-action path.

## Eliminated hypotheses and gotchas

- Chrome was not simply unfocused: the OS path foregrounded it but emitted no page key receipt.
- CDP Escape delivery worked and exposed a genuine missing trigger-focus restoration bug.
- Lifecycle evaluation was not limited by request body size; roughly 1–8 KB expressions succeeded.
- Mounting the second editor did not generally destroy globals or JSON serialization.
- Shared `/eval` can return `{}` for a thrown page error because `result.value` is considered before `exceptionDetails`; serialize `__visualError` through `evaluateJson` for diagnostic gates.
- The decisive lifecycle bug was stale node/point identity while adaptive measurement alternated the overflow/shapes trigger.
- The custom receipt is the `final-row-routing` companion entry in the phone result JSON; the declarative `exercise-toolbar-final-row` entry remains `type: "none"` by design.

## Browser evidence

### Phone `fixer-002-phone-12`

- Row rectangle: `{ left: 418, top: 239, width: 178, height: 44 }`.
- Ratio/point receipts: `0.15 -> (444.6875,261)`, `0.50 -> (507,261)`, `0.85 -> (569.296875,261)`.
- Every receipt: trusted and target-owned, `rectangle -> line`, row/sibling/adjacent clicks `1/0/0`.
- Escape: `browser-cdp`, trusted, visible/focused, trigger focused after close.
- Outside canvas: trusted page and exact editor receipt, trigger not focused after close.
- Lifecycle identities: generation 1 `oLvSOUUrqLB-HaIqscDVg`, generation 2 `U7p6vFu7R88ri-rwbKEt_`; matching mount/unmount receipts; helper count `0`.
- Semantic/cleanup/performance failure arrays are empty. Status remains `fail` at 4,436 changed pixels (`1.4568144499178983%`).

### Desktop `fixer-002-desktop-1`

- `desktop-toolbar-group` opened through a trusted click at `(660.5,831)` and rendered the complete menu at `{ x:561, y:623, width:200, height:178 }`.
- Semantic/cleanup/performance failure arrays are empty. Status remains `fail` at 22,880 changed pixels (`1.765432098765432%`).

## Verification and fingerprints

- visual unit: 54/54 pass;
- focused mounted-input/Escape/shield/unmount product tests: 5/5 pass;
- exact 13-file Prettier: pass;
- exact 12-file ESLint with zero warnings: pass;
- strict UTF-8/no BOM/no replacement character/known mojibake and whitespace checks: pass;
- root typecheck: only the disclosed `visualRegressionHost.tsx:724` status-literal and `LibraryMenuSection.tsx:70` missing-`name` errors;
- proxy: connected, `sessions=21`, `managedTabs=0`, no owned/helper targets;
- canonical baseline: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`;
- atomic 13-path: `aa0fa170db27ee60d1da569e6db9a3069d55deff2eedc3c477312e747a60f303`;
- full 36-source implementation: `e164bfa62352cc21bbae038b193d991f9da955719e83c5f2fa25a3d494c1086e`.

## Working set

- `scripts/visual-regression/{actions,performance,proxy,runner,scenarios,visual.unit.test}.ts`
- `excalidraw-app/visualRegressionHost.tsx`
- `packages/excalidraw/components/{AdaptiveEditorToolbar.tsx,AdaptiveEditorToolbar.scss,ToolGroupDropdown.tsx,adaptiveToolbar.test.tsx}`
- `packages/excalidraw/components/dropdownMenu/DropdownMenuContent.tsx`
- `packages/excalidraw/components/floatingSurface/owner.ts`
- `rasen/changes/visual-regression-hardening/evidence/fixer/run-fixer-002-{phone-12,desktop-1}.json`
- `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/*fixer-002-{phone-12,desktop-1}*__evidence.png`
- `rasen/changes/visual-regression-hardening/evidence/fix-round-1/atomic-002/fix-report.md`

## Next action

Dispatch a fresh non-author reviewer against the atomic report and fingerprint. Require independent coarse-phone and desktop reproduction, exact trusted row/keyboard/outside/lifecycle receipts, zero helper/target growth, and explicit visual mismatch disposition. Keep the finding open if any authority or cleanup correlation is absent, and do not promote the current checker-contaminated images.
