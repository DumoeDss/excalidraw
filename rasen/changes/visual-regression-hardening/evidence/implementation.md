# Implementation evidence

Status: **implementer scope complete**. Tasks 1.1–8.6 are supported by the evidence below. Tasks 9.1–11.6 remain open for independent review, any required fix/delta-review cycle, final audits, and local-only delivery.

## Authoritative source state

- Implementation source fingerprint: `c78e6b921d570d448e881adb693bb12390368ad638d90609961bb5007588facb`.
- The fingerprint was recomputed from the 28 manifest-recorded implementation sources and matched the update run exactly.
- No task-outside tracked file entered the fingerprinted implementation set.
- Product-facing changes are limited to the development-only host entry, toolbar-owned overflow containment, and its focused regression. The visual harness, scenarios, baselines, candidates, results, and replay support remain internal/test-only.
- No runtime dependency, lockfile resolution, public package export, public host contract, or application domain interface was added.

## Browser matrix and baseline approval

Authoritative update run: `implementer-matrix-7`.

- Mode/owner: `update` / `implementer`.
- Scenarios: 20/20 passed.
- Candidate publication: one atomic complete batch containing 20 PNGs and 20 provenance sidecars under `scripts/visual-regression/candidates/implementer/implementer-matrix-7/`.
- Semantic failures: 0.
- Cleanup failures: 0.
- Unexpected error-level console events: 0.
- Visible checker/overlay failures: 0.
- Required performance failures or inconclusive metrics: 0.
- Target cleanup: all 20 disposable targets closed; the run recorded `targetsClean=true` and `proxyHealthy=true`.

Every candidate was opened and personally inspected. The complete inventory, dimensions, SHA-256 hashes, explicit classification, and at least three distinct visual observations per image are recorded in:

`evidence/implementation/inspection-implementer-matrix-7.json`

The inspection contains exactly the same 20 unique scenario ids as the update run. Promotion validated the complete candidate batch before writing any canonical file. The canonical directory now contains 20 PNGs and 20 metadata sidecars, all associated with the authoritative source fingerprint.

Authoritative read-only run: `implementer-verify-2`.

- Mode/owner: `verify` / `implementer`.
- Scenarios: 20/20 passed.
- Canonical directory hash before and after: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`.
- Canonical writes during verification: 0.
- Semantic, cleanup, performance, console, and checker failures: 0.
- Masks applied: 0 pixels.
- Target cleanup: all 20 disposable targets closed; the proxy ended with zero sessions and zero managed tabs.

The read-only run observed one tolerance-bounded spinner-edge pixel in the loading scenario (`1×1`, mismatch ratio `0.000003284072249589491`) and no semantic drift. Between the two final update batches, the Help image also changed at the encoded-byte level while decoding to zero differing pixels. These were classified as controlled encoding/antialias variance; no mask, selector weakening, tolerance increase, or product exception was introduced.

## Findings fixed at the owning seam

- Real keyboard focus is delivered to the exact proxy-managed Chrome target through OS input. Acceptance requires the page to observe the expected key with `KeyboardEvent.isTrusted === true`, visible document state, and real focus; a JavaScript focus substitute is not accepted.
- Toolbar final-row automation verifies left/center/right `elementFromPoint` samples, trusted clicks, touch sizing, adjacent-action shielding, Escape/outside close, reopen/restoration, and the restored row's marker and hit geometry.
- The hidden toolbar measurement rail keeps its full intrinsic candidate width. Overflow containment is applied to `.Island.adaptive-toolbar-shell`, the leaf that owns the rail; no candidate shrink, whole-editor horizontal fallback, or wrapper marker was added.
- The loading state was not being reset. The real loading presentation intentionally waits 250 ms while host readiness previously waited only two animation frames. The development-only host now waits for the visible real loading presentation and its descendant live region. The assertion accepts a real descendant live region while still requiring the visible `.LoadingMessage` container; the product delay, selector, semantic gate, masks, and tolerances were not weakened.

## Performance evidence

The budgeted short-landscape toolbar scenario used one warm-up plus three accepted target-activated samples. Final read-only medians were:

- post-settle CLS: `0`
- long-task duration: `0 ms`
- interaction duration: `42.5 ms`
- resource count: `250`
- transfer: `67,500 bytes`
- harness duration: `1673.6027 ms`

All declared budgets passed. No required unavailable metric was treated as zero or as a pass.

## Automated and build gates

- `yarn test:visual:unit` — 30/30 passed.
- `yarn test:visual:replay` — 1/1 passed.
- Focused toolbar, loading, responsive, and lifecycle suites — 57/57 passed.
- Scoped ESLint — passed with zero warnings.
- Scoped Prettier check — clean.
- `yarn build:excalidraw` — passed.
- `yarn test:typecheck --pretty false` — passed after the package build.

Build and typecheck ran against the same authoritative implementation fingerprint. No relevant implementation source or generated input changed afterward, so the accepted `implementer-verify-2` run remains current.

## Final implementer audits

- Strict UTF-8 audit: 34 source/config/document files decoded strictly with no BOM, replacement character, or known mojibake signature.
- Structured data: 24 authoritative JSON files parsed successfully.
- Images: all 20 canonical PNGs had valid PNG signatures and IHDR dimensions; filename, metadata, SHA-256, scenario id, and source fingerprint associations matched.
- Completeness: matrix, verification, inspection, and baseline sets contained the same 20 unique scenario ids.
- Governance: candidate and canonical roots are separate; verify-mode canonical hashes were unchanged; implementer evidence remains separate from later reviewer/fixer roots.
- Scope: no dependency/resolution change, public visual-harness export, new design token, new `!important`, document-root direction selector, whole-editor horizontal scrolling, wrapper viewport marker, debug statement, or unrelated broad snapshot update was introduced.
- Pointer claims: trusted browser clicks and exact-target trusted keyboard input are recorded as such; no simplified synthetic pointer probe is reported as browser success.
- Originality/source audit: no external source, selector set, icon, font, or asset was copied; the scoped implementation and evidence contained no restricted reference term or prohibited assessment filename.
- `git diff --check` passed on the completed implementation state.

## Provenance and boundaries

The predecessor disclosure remains authoritative: three unauthorized nested workers were interrupted, produced no adopted result, and had no observed attributable write. A predecessor also accidentally invoked a repository-wide formatter; the 76 unintended tracked edits were restored precisely. Some untracked evidence/run JSON and `.rasen` JSON were formatted at that time, but no intentional run-state semantic change was made by the implementer.

This implementation pass did not commit, push, mutate a PR, archive, sync specs, deploy, merge, or intentionally write `.rasen/**` run-state. It preserved the sticky Chrome proxy, the existing stash, `NUL`, and unrelated dirty/untracked worktree content.

## Independent next stage

A non-author reviewer must now execute tasks 9.1–9.5 using fresh targets and separate reviewer-owned output paths, retain and personally inspect one reviewer image for every one of the 20 scenarios, repeat the required semantics/interactions/performance/console/cleanup gates, and issue a severity-tagged report. Implementer captures and this report are context, not reviewer acceptance proof.
