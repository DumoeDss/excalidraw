# VHR-R1-009 atomic fix report

## Status

**IMPLEMENTED AND ATOMICALLY EVIDENCED — OPEN pending non-author reviewer disposition and baseline integration.** Both application scenarios now begin with their owned surface closed, activate real visible product controls through browser-level trusted coordinate clicks, prove that each control received an `isTrusted: true` click, and assert the resulting owned surface and app state. No direct state mutation or atom write performs either acceptance action.

The targeted verify command remains red because the current images differ from the old canonical pixels. Both scenarios have zero semantic failures and zero cleanup failures. This fixer did not change a baseline, tolerance, mask, promotion state, another finding, task state, or run state.

## Provenance and retained-delta audit

The shared untracked harness already contained an unreviewed `click-sequence` skeleton when this atomic pass began. It had replaced the review report's direct-open implementation, but it recorded only proxy click return values and a final surface query. It did not prove that each visible control was actionable before input or that the page received a trusted event. This fixer independently audited and retained only the valid direction, then completed the enforcement and evidence chain.

Setup remains prerequisite-only:

- AI setup leaves `openDialog` closed. The acceptance path opens the toolbar's visible extra-tools control and then the visible text-to-diagram menu item.
- Share setup writes `shareDialogStateAtom` only to reset the dialog to closed and registers restoration. The acceptance path opens the visible application share button; it does not write the atom.

Each declared control now has a stable evidence identity. Immediately before every accepted click, the runner requires a visible nonzero rectangle, `display`/`visibility` presence, a non-disabled state, pointer events, and center-point ownership through `elementFromPoint`. Only then is a capture listener installed and `clickAt` invoked. The page receipt must report `click`, `isTrusted: true`, and ownership by the declared control. The action finally requires a visible owned surface, focus inside it, and the declared app-state identity when applicable.

## Exact relevant paths

- `excalidraw-app/visualRegressionHost.tsx`
- `scripts/visual-regression/actions.ts`
- `scripts/visual-regression/visual.unit.test.ts`

The path-content fingerprint over those three UTF-8 files, using sorted `path + NUL + bytes + NUL`, is `657a2fe48f0bcbd924fc0bae80d7b78519d387a65865612d0a85df618a6fedfe`.

The full current implementation-source fingerprint over the runner's 32 allowed source paths is `e8b00741e37fb3737024241ed4d9adb290ffaea3960ab9249d67e35da182513d`. Concurrent atomic work can make this full-tree fingerprint stale; integration must recompute it.

## Focused automated and static checks

- `yarn test:visual:unit` — PASS, 34/34 after the final source edit.
- Positive coverage requires a closed initial owner, actionable visible control, trusted control receipt, visible resulting surface, owned focus, and matching dialog identity.
- Negative coverage rejects an already-open owner, a disabled/non-actionable control without calling `clickAt`, and an untrusted page receipt.
- `.\node_modules\.bin\prettier.cmd --check excalidraw-app/visualRegressionHost.tsx scripts/visual-regression/actions.ts scripts/visual-regression/visual.unit.test.ts` — PASS.
- `.\node_modules\.bin\eslint.cmd excalidraw-app/visualRegressionHost.tsx scripts/visual-regression/actions.ts scripts/visual-regression/visual.unit.test.ts` — 0 errors. Three retained warnings in the shared host predate or lie outside this atomic delta.
- `git diff --check -- excalidraw-app/visualRegressionHost.tsx scripts/visual-regression/actions.ts scripts/visual-regression/visual.unit.test.ts` — PASS.
- Strict UTF-8 decode, no BOM, no `U+FFFD`, and no known mojibake signatures — PASS for the three source paths and both durable artifacts.

## Targeted fixer Chrome evidence

- Authoritative run id: `fixer-009-actions-2`
- Role: `fixer`
- Scenario filter: `desktop-ai,desktop-share`
- Exact command: `$env:VISUAL_SCENARIOS='desktop-ai,desktop-share'; $env:VISUAL_ROLE='fixer'; $env:VISUAL_RUN_ID='fixer-009-actions-2'; yarn test:visual`

The command exits 1 because both current images differ from the existing canonical images. It completed both scenarios, emitted both result reports and the aggregate inventory, and did not fail an action, semantic assertion, cleanup gate, console gate, or target-cleanup gate.

Inventory: `rasen/changes/visual-regression-hardening/evidence/fixer/run-fixer-009-actions-2.json`.

### Desktop AI

Result: `scripts/visual-regression/results/fixer/fixer-009-actions-2/desktop-ai__1440x900__dpr1__dark__ltr__ai-dialog__fixer__fixer-009-actions-2__result.json`.

The recorded acceptance sequence is:

1. `editor toolbar extra-tools control`: visible and actionable; one candidate; 36×36 rectangle at `(884.5, 805)`; product test id `toolbar-extra-group`; accessible label `More tools`; center point reachable. Browser click receipt: `(902.5, 823)`, clicked `true`. Page receipt: `click`, `isTrusted: true`, `targetOwned: true`.
2. `editor toolbar text-to-diagram control`: visible and actionable; one candidate; 176×32 rectangle at `(813, 688)`; role `menuitem`; visible text `Text to diagram / AI`; center point reachable. Browser click receipt: `(901, 704)`, clicked `true`. Page receipt: `click`, `isTrusted: true`, `targetOwned: true`.
3. Result owner `editor text-to-diagram surface`: visible, focus inside, `openDialog.name=ttd`, `openDialog.tab=text-to-diagram`.

Semantic failures: 0. Cleanup failures: 0. Console errors: 0. Restoration verified. Current image hash: `1896a95712e8a8714dadd5db9c3fac30e4e7ef9df3744118b3f86a60fc4496f5`. Personal inspection: the 1440×900 dark image visibly contains the complete text-to-diagram surface, selected text-to-diagram tab, descriptive content, input region, and close control without clipping.

The scenario status is `fail` only at bounded pixel comparison: 3,006 changed pixels, ratio `0.0023194444444444443`, bounds `(16, 801, 86×35)`. The visible lower-left checker badge is inside that region.

Image: `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/desktop-ai__1440x900__dpr1__dark__ltr__ai-dialog__fixer__fixer-009-actions-2__evidence.png`.

### Desktop Share

Result: `scripts/visual-regression/results/fixer/fixer-009-actions-2/desktop-share__1440x900__dpr1__light__ltr__share-dialog__fixer__fixer-009-actions-2__result.json`.

The recorded acceptance sequence is:

1. `application share control`: visible and actionable; one candidate; approximately 51.95×40 rectangle at `(1260.046875, 16)`; visible text `Share`; center point reachable. Browser click receipt: `(1286.0234375, 36)`, clicked `true`. Page receipt: `click`, `isTrusted: true`, `targetOwned: true`.
2. Result owner `application share surface`: `.ShareDialog` visible and focus inside.

Semantic failures: 0. Cleanup failures: 0. Console errors: 0. Restoration verified. Current image hash: `66bf1aa5cbc0f89daf4d203532308a3a90980eef1ccfea71ee7195cf006e54e1`. Personal inspection: the 1440×900 light image visibly contains the centered collaboration dialog, isolated background, close control, and both principal actions without clipping.

The scenario status is `fail` only at bounded pixel comparison: 4,352 changed pixels, ratio `0.003358024691358025`, bounds `(16, 419, 958×417)`. The visible lower-left checker badge contributes to the difference; remaining old-baseline drift must be classified by integration rather than accepted here.

Image: `rasen/changes/visual-regression-hardening/evidence/fixer/screenshots/desktop-share__1440x900__dpr1__light__ltr__share-dialog__fixer__fixer-009-actions-2__evidence.png`.

## Baseline, checker, and cleanup disposition

Canonical directory hash before and after is unchanged: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`. No update mode or promotion ran.

Fresh disposable targets were `B2C7497990B6A536B64A76CB38B514A9` and `30C2831CE1FFD01AD86CE560C7E8090C`; both are absent after the run. Final proxy health is connected with `sessions=0` and `managedTabs=0`. The sticky proxy remained running.

Both inspected images visibly show the red checker badge while their result metadata says `checkerOverlays: 0`. This is a pre-existing cross-cutting detector/evidence mismatch and remains an explicit integration blocker. This atomic fixer did not change the detector or claim that adjacency resolved.

Two earlier diagnostic runs are not acceptance evidence: `fixer-009-20260814-1` exposed that the tunnel control lacks the assumed toolbar item test id and stopped before both scenarios; `fixer-009-20260814-2` proved the corrected selector but used the wrong role. A subsequent fixer-owned run preceded the final listener-cleanup edit. All diagnostic targets were closed, and only `fixer-009-actions-2` is authoritative for the final source.

## Durable findings

1. A browser-level click return is not enough to prove trusted receipt; the owning product control must observe the event and record `isTrusted` plus target ownership.
2. A visible-control workflow needs a pre-input actionable/center-hit gate and a post-input owned-state/focus gate; either half alone permits a false pass.
3. Tunnel-rendered controls may not inherit the surrounding inventory test id, so stable identity can require the owning tunnel container plus the control's semantic role and visible name.

`VHR-R1-009` remains **OPEN pending original reviewer disposition and later integration**.
