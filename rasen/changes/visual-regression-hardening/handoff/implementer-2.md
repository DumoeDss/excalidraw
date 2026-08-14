# Handoff: visual-regression-hardening — implementer #2

## Original intent

The user asked the `rasen-auto auto-decompose` run to continue all editor UI redesign work, explicitly confirmed that Chrome-use works and that agents can inspect images, and wants the integrated UI driven through browser evidence to a much more polished drawing-editor result. This child owns deterministic visual-regression implementation and implementer evidence only. Do not commit, push, mutate a PR, archive, sync specs, deploy, merge, or edit `.rasen/**` run-state from this role.

## Position

Pipeline: `small-feature`. Completed stages: `propose`. Current stage: `apply` (tasks 1.1-8.6 only). The trusted-keyboard and toolbar final-row blockers are resolved. Full matrix `implementer-matrix-5` reached 18/19 executed scenarios, with 17 pass and one `narrow-loading` semantic failure; the final scenario was not run after update-mode refusal. Tasks remain 0/77 checked because the full batch, inspection, promotion, read-only verify, and ordered gates are not yet complete.

## Done / Remaining

Done in code/evidence but not yet task-certified:

- Exact-target real Windows input in `proxy.ts`: unique target title marker, exact Chrome-window enumeration/foreground activation, `SendInput`, and in-page acceptance only for the expected `KeyboardEvent.isTrusted === true`.
- `desktop-welcome` trusted Tab, real active element, `:focus-visible`, console, checker, and cleanup pass.
- Toolbar owning-Island overflow containment and focused 7/7 regression.
- Deterministic `activeTool`/welcome preparation and restoration.
- `exerciseFinalToolbarRow()` verifies initial and restored final rows, marker, 40x40-or-larger touch size, and three physical hit samples.
- `final-row-lifecycle-probe-1` passed completely with fingerprint `455cf3e2e5b99953f8562cb07e32cd4e9d97ebbe740e17f609c60c7f06f98b44`.
- `implementer-matrix-5`: 17 passes; the retained result set and 18 implementer-owned screenshots are durable. Every executed scenario recorded zero cleanup failures, console errors, and checker overlays. Sticky proxy ended healthy at `sessions=0`, `managedTabs=0`, `chromePort=9222`.

Remaining:

- Fix the single `narrow-loading` host/state-rendering defect without weakening semantic assertions, then run that one scenario and the full 19-scenario update batch with a newly recomputed fingerprint.
- Personally open all 19 complete-batch candidate images, record dimensions, hashes, classification, and at least three distinct observations per image, then promote only that complete inspected batch.
- Run read-only visual verify; then focused tests, `yarn build:excalidraw` before `yarn test:typecheck --pretty false`, scoped lint, UTF-8/JSON/PNG/hash, public-export, restricted-term, and diff audits.
- Replace partial implementation evidence and mark only tasks 1.1-8.6 that are supported by fresh authoritative evidence. Leave 9.x-11.x untouched for the non-author reviewer/fixer/final roles.

## Key decisions (and why)

- Trusted keyboard acceptance is page-observed real OS input, not a simplified DOM event or JavaScript focus substitute. The target must report the expected key, `isTrusted=true`, visible document state, and focus.
- Candidate publication remains all-or-nothing. A single semantic or cleanup failure leaves the full run's candidate directory empty; failed/current artifacts are diagnostic evidence only.
- The final-row menu must be reopened for the final captured/asserted state. Because reopen creates a new DOM row, evidence marking and three-point/touch verification must be repeated on that new row.
- The loading failure must be fixed at its owning scenario-host/state seam. Do not change the `.LoadingMessage` selector, remove the live-region gate, widen masks/tolerances, or substitute a decorative loading fixture merely to obtain pixels.
- Build must precede root typecheck because generated type inputs make the reverse/concurrent order flaky in this worktree.
- No canonical baseline currently exists. Earlier probes and matrix current images are noncanonical and cannot be promoted or reused as reviewer proof.

## Dead ends & gotchas

- `yarn prettier <file> --check` invokes the repository wrapper and expands to a broad CSS/SCSS/JSON/Markdown glob. It produced only read-only warnings this time, but use `node node_modules/prettier/bin-prettier.js <file>` for scoped formatting. A predecessor's earlier accidental repository-wide write was restored; keep that provenance visible.
- `implementer-matrix-4`'s phone failure was not bad product routing: initial final-row facts had three correct hits and a trusted click, and close/reopen both succeeded. The rebuilt row simply lacked the transient marker.
- `implementer-matrix-5` has 18 result JSONs and 18 evidence images, not a complete batch. It reports 17 pass + 1 fail; do not call it 18/19 passed.
- The `narrow-loading` image visibly shows the standard phone editor shell and blank canvas. This rules out a merely clipped, transparent, or low-contrast `.LoadingMessage`; the loading render is absent.
- The host does set `isLoading: request.setup === "loading"` in its `updateScene` request. The next investigation must trace whether a later app-state update or editor behavior immediately resets it.
- Preserve `stash@{0}`, `NUL`, unrelated untracked files, the sticky proxy, and all `.rasen/**` run-state. Do not clean or migrate them.

## Eliminated hypotheses (MANDATORY for fixer/debugger roles)

- "A trusted mouse click creates keyboard-visible focus" — ruled out by the first matrix's missing focus-visible state.
- "A second guessed/direct CDP WebSocket can send keys" — ruled out by rejected or timed-out second connections while the sticky authorized proxy owns CDP.
- "AppActivate/Windows Forms SendKeys can target the managed tab" — ruled out by failed activation and input not reaching the exact tab.
- "The phone final row does not physically route" — ruled out by initial and restored left/center/right `elementFromPoint` samples plus trusted clicks.
- "The loading element is present but visually clipped or low contrast" — ruled out by the retained full editor-root image and semantic count zero. Current best hypothesis: `isLoading` is overwritten or normalized after the scenario host's `updateScene`, before readiness/assertion.

## Working set

Primary implementation files remain those listed in `implementer-1.md`, with the latest direct change in `scripts/visual-regression/actions.ts`. Key evidence:

- `scripts/visual-regression/results/implementer/final-row-lifecycle-probe-1/`
- `rasen/changes/visual-regression-hardening/evidence/implementer/run-final-row-lifecycle-probe-1.json`
- `scripts/visual-regression/results/implementer/implementer-matrix-5/`
- `rasen/changes/visual-regression-hardening/evidence/implementer/screenshots/*__implementer-matrix-5__evidence.png`
- `rasen/changes/visual-regression-hardening/evidence/implementation.md`

Current supported source fingerprint is `455cf3e2e5b99953f8562cb07e32cd4e9d97ebbe740e17f609c60c7f06f98b44`, but any source edit invalidates it and requires recomputation. At handoff there are zero full-batch candidate PNGs and no canonical baseline set.

## Next action

Run only `narrow-loading` while tracing `h.state.isLoading` immediately before and after `visualRegressionHost.tsx`'s scenario `updateScene` and after the first stable render. Identify and fix the later reset/normalization at its owning seam; keep `.LoadingMessage` and live-region assertions unchanged. Then recompute the exact source fingerprint and rerun `narrow-loading` before the full 19-scenario matrix.
