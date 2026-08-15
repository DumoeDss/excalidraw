# VHR-R1-008 fixer handoff

## State

DONE at the atomic fixer boundary; OPEN for non-author review/integration.

The runner now executes `restore -> fresh post-query -> close -> enumerate -> one guarded final report write`. Setup failures after cleanup registration still run post-restoration verification. There is no provisional result or cleanup-time overwrite: the sole scenario result operation is one `artifactWriter.writeStableJson("result", ...)` call in the terminal publish callback, with a second-publication guard.

`restorationVerified` requires all 21 fresh host facts, exact outer input capabilities, and a clean post-baseline console query. The host facts cover debugger live/state/storage/canvas, full storage, locale, safe area, control styles, focus/marker, transients, clock, scene/theme/app state, Library, Share, fixture roots, and document direction/language. Candidate eligibility and candidate metadata reject any result without final verified restoration.

The stable debugger canvas marker is `data-visual-debugger-canvas="true"`; the old position-style selector is gone. Development keeps the debugger wrapper mounted so restoration survives debugger disablement and parent rerenders. Full storage is restored again after bounded React/app commits to defeat delayed writes. Input provenance uses a fresh query after the emulation-command session detaches.

## Verification and provenance

- `yarn test:visual:unit`: 67/67 passed.
- Exact eight-file Prettier and ESLint with zero warnings: passed.
- Strict UTF-8, retained JSON parsing, one-result-per-run audit, and `git diff --check`: passed.
- Root typecheck has only the two known Library adjacency errors at `visualRegressionHost.tsx:1637` and `LibraryMenuSection.tsx:70`.
- Atomic fingerprint: `2eedf5848d02accb71bc0c8fe6cbcf11c4da83c5a4686fd8e9578360f4efa811` over eight sorted paths.
- Current full 43-source fingerprint: `00d9bea45543df9d4994e9c53e468296f84487fbb0be2f23909f3a8ec6a2a700`.
- Canonical 40-file hash unchanged: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`; no canonical candidate/temp exists.

Final-source browser run `fixer-008-restoration-4` has all fresh restoration facts true, exact `fine / hover / 10` outer input restoration, no semantic/cleanup/console failure, and successful close/enumeration. It remains red only for 3,006 pixels in `{ x:16, y:801, width:86, height:35 }`; inspected current/diff images isolate the visible change to the lower-left two-error checker badge. The detector still reports zero checker overlays, which remains integration adjacency.

The enabled-debugger probe target `AD9AB7B307D386F64C90D5B184964C1D` is closed and absent. Final sticky-proxy state was `sessions=21`, `managedTabs=0`; do not restart it.

## Reviewer action

The non-author reviewer should inspect the eight-path atomic fingerprint, rerun focused tests, and independently prove the exact order and fresh facts from a new disposable target. Do not accept pixels until the checker badge/detector mismatch is classified. Integration must also resolve the two Library type errors and recompute the shared implementation fingerprint.

Primary report: `rasen/changes/visual-regression-hardening/evidence/fix-round-1/atomic-008/fix-report.md`.
