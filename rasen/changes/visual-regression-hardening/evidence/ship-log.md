# Ship Log: visual-regression-hardening

- **Date:** 2026-08-15T01:33:30.2204151+08:00
- **Mode:** local
- **Branch:** feat/editor-ui-redesign
- **Commit:** pending local child commit
- **Tree:** `7e5189cef18e20a774c69b0da67e91ec53961c5d` (prospective implementation and evidence tree before this self-referential log and task-finalization edit)
- **Implementation fingerprint:** `10aeb221ea7aebfe319738908d442ae0233020f716d8ad134d94ce2f4d4748f0` over 46 implementation source paths
- **Status:** Committed locally; delivery deferred to the portfolio level

## Pre-Flight Results

- Verification: pass — `evidence/review-cycle-report.md` is CLEAN at round 2/3 with all 9 findings resolved and no accepted-known finding.
- Reviewer browser gate: pass — `reviewer-r2-full20-20260815` completed 20/20 scenarios with reviewer-owned output and inspection; isolated multi-editor repeats and adjacency runs also passed.
- Tasks: 77/77 complete at local-delivery finalization.
- Canonical baseline hash: `311666a303148a5f3ccb1327c3fb56f4fc3f1ddf0aaf8b7af927fa12772d5830`, unchanged by update verification, reviewer verification, build, typecheck, and final audits.
- Browser proxy: healthy at Chrome port 9222; final shared state `sessions=21`, `managedTabs=0`.

## Test Gate

Required scope: the internal visual harness and replay contract, directly affected toolbar/Library/API lifecycle seams, all implementation-source formatting and lint, package build before root typecheck, whitespace, and the independent reviewer browser/performance gate.

Rationale: the delivered risk is bounded to the visual runner, its development-only host, canonical test assets, toolbar close/shielding behavior, fixed Library identity, and cached API lifecycle. The fresh reviewer matrix covers browser integration and performance at the exact implementation fingerprint. The directly affected suites cover the owning product seams, so a full repository suite was neither required nor silently substituted for focused verification.

Fresh commands run by this shipper:

- `yarn test:visual:unit` — pass, 80/80.
- `yarn test:visual:replay` — pass, 1/1.
- `yarn test:app --run --minWorkers=1 --maxWorkers=1 packages/excalidraw/components/adaptiveToolbar.test.tsx` — pass, 7/7.
- `yarn test:app --run --minWorkers=1 --maxWorkers=1 packages/excalidraw/components/LibraryUnit.test.tsx` — pass, 2/2.
- `yarn test:app --run --minWorkers=1 --maxWorkers=1 packages/excalidraw/tests/packages/events.test.tsx` — pass, 6/6.
- `yarn test:app --run --minWorkers=1 --maxWorkers=1 packages/excalidraw/tests/interactivity.test.tsx -t "adaptive toolbar live behavior"` — pass, 9/9 selected; 74 unrelated tests skipped by the explicit filter.
- `node node_modules/prettier/bin-prettier.js --check <46 implementation source paths>` — pass.
- `node node_modules/eslint/bin/eslint.js --max-warnings 0 <43 TypeScript implementation source paths>` — pass with zero warnings.
- `yarn build:excalidraw` — pass.
- `yarn test:typecheck` — pass after the package build.
- `git diff --check HEAD --` — pass.

The build and typecheck used the same implementation fingerprint shown above. Recalculation after both commands was exact.

Reused exact-fingerprint evidence:

- `evidence/fix-round-2/re-review-round-2.md` and `evidence/review-cycle-report.md` — CLEAN; fresh reviewer full matrix 20/20, all semantic, cleanup, performance, console, checker, restoration, input-restoration, target-close, and target-absence gates passed.
- The matrix retained the unchanged loading tolerance; `narrow-loading` had 122 bounded spinner-edge mismatches at ratio `0.0004006568144499179`, below `0.0005`.
- The reviewer personally inspected 20 primary images plus 6 restoration, isolated-repeat, and adjacency companions at original resolution.

## Final Audits

- Strict UTF-8 decoding, no BOM, no U+FFFD, and no known mojibake signature passed for all included source, config, documentation, JSON, YAML, and delivery text.
- All included JSON parsed; the change YAML parsed. PNG signatures passed for canonical, current, diff, candidate, and role evidence artifacts.
- Twenty canonical PNGs have matching metadata, dimensions, and hashes. Current/diff result hashes matched their files. All 439 committed evidence PNGs now have self-contained hash and dimension associations; metadata-only retained associations do not replace role-owned inspection inventories.
- Twenty scenario ids and stems and all 77 task ids are unique. The manifest and 20 canonical baseline pairs are complete in both directions, with deterministic canonical naming and no role suffix.
- Canonical, candidate, result, implementer, reviewer, and fixer roots remain separate. Verify-mode canonical hashes are immutable. Final role-owned inspection inventories are complete and hash-valid.
- No dependency or lockfile delta, runtime dependency, added browser framework, license expansion, public package export, public API widening, new design token, new `!important`, document-root directional CSS, wrapper viewport marker, whole-editor horizontal fallback, unsupported synthetic pointer claim, debug statement, or unrelated snapshot update was found.
- The document-root and viewport reads that remain are confined to the development/test-only host and browser harness for target preparation, exact restoration, and geometry assertions; product directional authority remains editor-root-local.
- Originality and restricted-reference audits passed: no external source, selector set, icon, font, asset, or unrelated product/test change was introduced.
- Cached-name audit: 633 paths, zero scope violations. It contains only the child product/test/config delta, top-level visual-regression sources/tests, canonical baselines/metadata, and `rasen/changes/visual-regression-hardening/**`. It excludes `.rasen/**`, `NUL`, candidate/results trees, other change directories, and unrelated untracked files.

## Delivery

Local child delivery only. Portfolio-level push and existing pull-request update are deferred until every child is complete. No push, pull-request mutation, archive, retention, spec sync, deployment, merge, run-state write, or shared proxy lifecycle action was performed here. Archive timing remains on-merge.
