# VHR-R1-008 atomic fix report

## Status

**DONE at the atomic fixer boundary; OPEN pending non-author reviewer and integration disposition.** The runner now derives cleanup success from fresh post-restore observations, publishes exactly one guarded final scenario report only after restoration verification, target close, and target enumeration, and rejects candidate provenance unless that final restoration is verified.

No reviewer acceptance is self-certified here. No canonical baseline, candidate, tolerance, mask, task state, run state, review report, commit, push, archive, or spec was changed.

## Single final report and lifecycle order

`runWithLifecycleAndPublish()` now owns the complete terminal sequence:

1. setup and scenario execution;
2. LIFO restoration of every registered cleanup action;
3. fresh post-restoration verification when setup registered any cleanup, including when setup later throws;
4. exact target close;
5. enumeration proving that target absent;
6. one final publication callback.

`runner.ts` no longer writes a provisional result during scenario execution and no longer overwrites it during cleanup. The sole scenario-result publication is one `artifactWriter.writeStableJson("result", reportFile, finalReportPayload)` call inside the terminal publish callback. A `finalReportPublished` guard rejects any second publication attempt. Candidate, inventory, and promotion writes remain separate artifact kinds and do not create or overwrite a scenario result.

If setup or the run fails before a normal result exists, the final callback still emits one honest failure report after cleanup. It preserves the primary error, every cleanup failure, whether restoration verification was attempted, fresh restoration observations, close/enumeration facts, and the final restoration verdict. Unit coverage asserts that no report exists during restore, verification, close, or enumeration, and that the guarded writer is invoked once only after the exact order `restore -> post-query -> close -> enumerate -> publish`.

## Fresh restoration authority

`restorationVerified` is now derived rather than asserted. It requires every one of these fresh host facts to equal `true`:

- debugger live identity, structural state, persisted storage, and stable owned canvas;
- full web storage, locale, safe-area values, and injected control styles;
- focus, focus marker, transient markers, clock identity, and clock state;
- scene, theme, app state, Library state, Share atom, and fixture-root cleanup;
- document direction and document language.

It additionally requires an outer browser input-capability query to match the exact pre-run pointer/hover/touch values and a successful console query with no new error-level event after the recorded baseline sequence boundary. Any false or missing host fact, input mismatch, failed console query, or new console error makes restoration unverified, keeps the report failed, and prevents candidate provenance.

The outer input query is intentionally separate from the adapter's restoration-command session. Real Chrome can still report the previous coarse/hover override inside that attached session; after detachment, the fresh query observes the authoritative state. The retained final run records prior `fine / hover / 10`, an immediate command-session observation of `coarse / no-hover / 10`, and the authoritative outer post-query of `fine / hover / 10` with `restoredExactly: true`.

The host restoration seam now captures and restores complete global state. Storage is restored, bounded React/app commits are allowed to settle, and storage is restored exactly again so delayed application writes cannot win. The development `DebugCanvas` wrapper stays mounted in development so its restoration seam survives debugger disablement and locale-driven parent rerenders; its canvas has the stable owner marker `data-visual-debugger-canvas="true"`. Restoration no longer guesses ownership from a `position: fixed` style selector.

## Exact atomic paths and fingerprints

- `excalidraw-app/App.tsx`
- `excalidraw-app/components/DebugCanvas.tsx`
- `excalidraw-app/visualRegressionHost.tsx`
- `scripts/visual-regression/browserScripts.ts`
- `scripts/visual-regression/lifecycle.ts`
- `scripts/visual-regression/proxy.ts`
- `scripts/visual-regression/runner.ts`
- `scripts/visual-regression/visual.unit.test.ts`

Path-content fingerprint over those eight sorted paths using `path + NUL + bytes + NUL`: `2eedf5848d02accb71bc0c8fe6cbcf11c4da83c5a4686fd8e9578360f4efa811`.

Full implementation-source fingerprint over the runner's current 43 allowed paths: `00d9bea45543df9d4994e9c53e468296f84487fbb0be2f23909f3a8ec6a2a700`. Integration must recompute this shared-tree fingerprint after other atomic work changes.

## Focused verification

- `yarn test:visual:unit` — **PASS, 67/67**.
- Lifecycle coverage proves exact setup-failure ordering, report absence before final publication, and a single guarded writer call.
- Restoration coverage rejects every false or missing required host fact, a stale input post-query, and a dirty console boundary.
- Candidate and metadata coverage rejects unverified final restoration.
- Input coverage exercises non-default `fine / hover / 10` restoration commands and the separate outer post-query.
- Stable debugger ownership coverage requires the explicit canvas marker and rejects the prior position-style heuristic.
- Direct Prettier check over all eight atomic paths — **PASS**.
- Direct ESLint over all eight TypeScript/TSX paths with `--max-warnings=0` — **PASS, zero errors/warnings**.
- Strict UTF-8 decoding, no BOM, no `U+FFFD`, and no known mojibake signatures — **PASS** for the atomic sources and retained 008 JSON evidence.
- All four scenario result JSON files and all three completed run inventories parse successfully. Each 008 run directory contains exactly one scenario result report.
- `git diff --check` — **PASS**.
- Root `yarn test:typecheck` retains only two disclosed adjacent Library errors: `excalidraw-app/visualRegressionHost.tsx:1637` widens `LibraryItem.status` to `string`, and `packages/excalidraw/components/LibraryMenuSection.tsx:70` reads `name` from a placeholder union member that lacks it. No restoration lifecycle path produced a type error.

## Browser restoration evidence

A direct enabled-debugger probe used exact target `AD9AB7B307D386F64C90D5B184964C1D`.

- Before preparation: the seeded focus and focus marker existed; debugger frame/state was `7`; one owned debugger canvas existed; storage, transient, and fixture seeds existed; safe-area values were `13 / 17 / 19 / 23px`; document state was RTL/French.
- During preparation: debugger live state was false, the owned canvas count was zero, and exactly one visual control style was installed.
- After restoration and a fresh query: every required host fact was true; focus/marker, storage, debugger frame/canvas, safe areas, transient/fixture state, direction, and language matched exactly; unexpected stale markers were zero; control styles were zero; the outer input query was `fine / hover / 10`; and there were no new console error events.

The exact target was closed after the probe and is absent. The shared sticky proxy was not restarted and returned to `sessions=21`, `managedTabs=0`.

Four diagnostic/final fixer runs each retained exactly one final scenario report:

- `fixer-008-restoration-1` exposed why an immediate still-attached input observation is not authoritative. Its older cleanup record shows that observation as coarse while all host facts restored.
- `fixer-008-restoration-2` deliberately reached an unrelated exact-target trusted-key failure after observing `Alt`; despite the primary failure, the one final report records restoration verification, close, and enumeration success.
- `fixer-008-restoration-3` reached unrelated active-text semantic failures; final restoration, close, and enumeration still succeeded.
- `fixer-008-restoration-4` is the final-source browser run for `desktop-collaboration`. It has zero semantic failures, zero cleanup failures, zero console errors, complete fresh host facts, exact outer input restoration, close success, and enumeration success.

The final run remains `fail` only at existing pixel drift: 3,006 changed pixels, ratio `0.0023194444444444443`, bounds `{ x: 16, y: 801, width: 86, height: 35 }`. Expected/current/diff hashes are `10daed9dd586a2c3a66da3c7bebbcf7ee55c9bc49492970c92399af4f8521094`, `a8480a461b734f4a974240b211da2b6816542fbd4b46b3eac82f6d9d2d010211`, and `68c3dad410af88fce1585e3406bcdf266d10b508f5219da24937293d520d5c5f`. Personal inspection of the current and diff PNGs confines the visible change to the lower-left two-error checker badge; no debugger canvas, control style, fixture, marker, or other cleanup residue is visible. The result metadata still reports `checkerOverlays: 0`, so that badge/detector mismatch remains an integration adjacency rather than accepted pixels.

Canonical baseline hash before and after every completed inventory, and on final direct recomputation over 40 files, is unchanged: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`. No `.candidate` or temporary file exists under the canonical baseline directory.

## Reviewer and integration remainder

A fresh non-author reviewer should inspect the eight-path atomic fingerprint, rerun the focused lifecycle/restoration tests, and independently exercise an enabled-debugger scenario with non-default input and global state. Closure requires observing restoration before close, target absence before publication, exactly one final guarded result write, all required fresh facts, unchanged canonical hash, and no proxy growth.

Integration must separately resolve the visible checker badge/detector mismatch and the two Library type errors. This fixer does not claim a green pixel comparison, a green root typecheck, reviewer acceptance, or finding closure.

## Durable findings

1. A cleanup callback that does not throw proves only that commands ran; restoration requires a fresh observation from outside the mutation session.
2. Publication belongs after restoration, close, and absence enumeration. A provisional report plus overwrite creates both stale evidence and a check/write race.
3. Exact input restoration may become observable only after the CDP session that issued emulation commands detaches; command-session inspection is useful diagnostic data, not final provenance.
4. Debugger canvas ownership needs a stable semantic marker. Position-style heuristics fail when the owned canvas uses a different positioning mode.

`VHR-R1-008` remains **OPEN pending non-author reviewer and integration disposition**.
