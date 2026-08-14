# Handoff: visual-regression-hardening — implementer #3

## Original intent

The user asked the autonomous editor UI redesign run to continue all work, explicitly confirmed that the real Chrome path and image inspection are available, and wants the integrated editor driven toward the target visual language through durable browser evidence. This child owns deterministic visual-regression implementation and implementer evidence only. It must not commit, push, mutate a PR, archive, sync specs, deploy, merge, or edit `.rasen/**` run-state from the implementer role.

## Position

Pipeline: `small-feature`. Completed stages: `propose`; implementer portion of `apply` is complete. Current frontier: independent review. Tasks 1.1–8.6 are complete and evidence-backed; tasks 9.1–11.6 remain open for reviewer, fixer/delta-review if needed, final audit, and local-only delivery roles.

## Done / Remaining

Done:

- Completed and stabilized the internal typed manifest, deterministic fixtures, proxy adapter, semantic/geometry/pointer/performance gates, comparator, baseline governance, replay checklist, development-only scenario host, and 20-scenario representative matrix.
- Fixed exact-target trusted keyboard delivery, toolbar final-row lifecycle/routing coverage, toolbar-Island measurement overflow containment, and delayed real loading readiness/live-region discovery at their owning seams.
- Ran update batch `implementer-matrix-7`: 20/20 pass, atomic 20-PNG/20-sidecar candidate publication, zero semantic/cleanup/performance/console/checker failures.
- Personally opened all 20 candidates and recorded dimensions, hashes, classification, and at least three distinct observations each in `evidence/implementation/inspection-implementer-matrix-7.json`.
- Promoted the complete inspected batch and ran read-only `implementer-verify-2`: 20/20 pass; canonical hash unchanged at `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`.
- Passed 30/30 visual unit tests, 1/1 replay test, 57/57 focused lifecycle/responsive/toolbar/loading tests, scoped lint/format checks, package build, and root typecheck in the required order.
- Completed UTF-8, JSON, PNG/hash/metadata, scenario-set, scope, export, dependency, design-rule, pointer-claim, originality, restricted-term, and diff-whitespace audits.
- Replaced the partial implementation checkpoint with the complete report in `evidence/implementation.md`.

Remaining:

- 9.1–9.5: independent reviewer-owned 20-scenario browser matrix, image inspection, and severity-tagged report.
- 10.1–10.4: only if review finds issues, non-reviewer fixes plus non-author delta re-review.
- 11.1–11.6: final cross-role audits, review-cycle closure, one local child commit, and ship log. Portfolio delivery operations remain out of scope.

## Key decisions (and why)

- `implementer-matrix-7` is the sole authoritative update batch. Older probes and partial matrices remain diagnostic only and cannot satisfy final acceptance.
- `implementer-verify-2` is the authoritative read-only verification. Its before/after canonical hash is identical, so baseline verification proved no write path was taken.
- The manifest contains 20 scenarios. Earlier handoffs' 19-scenario count is stale because the final matrix includes all current manifest identities.
- The loading defect was readiness timing, not an `isLoading` reset: the real component waits 250 ms and the old host readiness returned after only two frames. Waiting for the visible real component and its descendant live region preserves product behavior and semantic strength.
- The live-region check accepts the selected loading node, its ancestors, or its descendant real live region while still requiring `.LoadingMessage` to be visible. Do not remove that container gate.
- The toolbar measurement rail retains full intrinsic width; overflow stays isolated on its owning `.Island.adaptive-toolbar-shell`. Do not shrink candidates, move the marker, or introduce editor-wide horizontal scrolling.
- One loading spinner-edge pixel in verify and a byte-only Help encoding difference between final update batches are controlled raster variance. They do not justify a mask or tolerance increase.
- Reviewer evidence must be newly captured in separate reviewer paths. Implementer images, results, and inspections may inform review but cannot count as reviewer-owned proof.

## Dead ends & gotchas

- Do not re-investigate `isLoading` normalization unless new evidence contradicts the recorded state: immediately after host preparation it was true, and waiting through the real 250 ms presentation resolved the failure.
- A trusted mouse click does not create keyboard-visible focus. Keyboard acceptance depends on the exact-target OS input route and page-observed `isTrusted` event.
- A simplified DOM pointer event does not establish the editor's full pen/touch contract. Keep the mounted-harness or proven real-browser boundary.
- Verify reports have `sourceFingerprint: null` by design because verify mode does not enter the update-only source-write preflight. Canonical metadata and the update/inspection records carry the authoritative fingerprint.
- The candidate and canonical roots are deliberately separate. Never copy older evidence or reviewer output into either approval path.
- Preserve the sticky proxy, `stash@{0}`, `NUL`, unrelated untracked files, and `.rasen/**` run-state. Do not clean or migrate them.
- `yarn prettier <file> --check` expands through the repository wrapper; use the scoped Prettier binary invocation for later targeted checks.

## Eliminated hypotheses (MANDATORY for fixer/debugger roles)

- “The loading state is reset before render” — ruled out by observing `h.state.isLoading === true` immediately after preparation and by the successful visible presentation after waiting through the component's real delay.
- “The live region must be an ancestor of `.LoadingMessage`” — ruled out by the real component structure, where the `role="status"` node is a descendant.
- “The loading surface is clipped or low contrast” — ruled out by the prior retained image and the successful targeted run after readiness repair without appearance changes.
- “A trusted click is sufficient for `:focus-visible`” — ruled out by the first matrix's focus assertion.
- “The toolbar final row does not route physically” — ruled out by initial and restored three-point `elementFromPoint` samples plus trusted clicks.
- Current best hypothesis if future raster-only failures recur: inspect bounded encoding/antialias variance first, then deterministic environment/readiness drift; do not weaken semantics, masks, or tolerance preemptively.

## Working set

Authoritative implementation fingerprint:

`c78e6b921d570d448e881adb693bb12390368ad638d90609961bb5007588facb`

Primary implementation paths:

- `package.json`
- `vitest.visual.config.mts`
- `excalidraw-app/index.tsx`
- `excalidraw-app/visualRegressionHost.tsx`
- `packages/excalidraw/components/AdaptiveEditorToolbar.scss`
- `packages/excalidraw/components/adaptiveToolbar.test.tsx`
- `scripts/visual-regression/*.ts`
- `scripts/visual-regression/baselines/*`

Authoritative evidence:

- `evidence/implementer/run-implementer-matrix-7.json`
- `evidence/implementation/inspection-implementer-matrix-7.json`
- `evidence/implementer/run-implementer-verify-2.json`
- `evidence/implementation.md`

Proxy health at handoff: connected to Chrome port 9222 with `sessions=0` and `managedTabs=0`. No target was created during final documentation/audit closure.

## Next action

Dispatch a non-author reviewer for tasks 9.1–9.5. The reviewer should first read the proposal, design, spec, tasks, `evidence/implementation.md`, `implementer-3.md`, manifest, canonical metadata, and implementation diff; then run the complete 20-scenario manifest in fresh targets with a distinct reviewer run id/output root, personally inspect all 20 reviewer-owned captures, verify the canonical directory remains unchanged, and write the severity-tagged review report without editing product code during the review pass.
