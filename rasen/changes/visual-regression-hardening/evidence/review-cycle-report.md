# Review cycle: visual-regression-hardening

- Rounds: **2/3**
- Tier: **A — distinct non-author reviewer and fixer roles**
- Status: **CLEAN — TERMINATION INVARIANT SATISFIED**

All nine original material findings are independently resolved. Round 2 repaired and verified the sole surviving Blocker, `VHR-R1-003`, without changing canonical assets, comparison policy, masks, or the loading budget. No new finding and no accepted-known Minor or Trivial finding remains.

## Provenance and role separation

The round-one provenance clarification remains unchanged: a mistakenly spawned nested read-only task was interrupted immediately, returned no output, and contributed no artifact, edit, conclusion, or inference. Round-one dispositions were based solely on the non-author reviewer's own evidence.

Round 2 also satisfies author != verifier. The non-reviewer fixer produced the rendered-readiness delta and left it IMPLEMENTED-OPEN. A separate fresh reviewer directly read the seam, created five reviewer-only browser runs, inspected its own images, and made the final disposition. Fixer screenshots and conclusions were used only to locate the intended delta, never as acceptance proof.

| Round | Findings at entry (B/Ma/Mi/T) | Fixed by | Confirmed by (non-author) | Disposition |
| --- | --- | --- | --- | --- |
| 1 | 6/3/0/0 | Round-one atomic fixer roles plus fixer integration | Reviewer run `reviewer-r1-delta-20260814-2319` | 8 RESOLVED; 1 Blocker OPEN |
| 2 | 1/0/0/0 | Round-two non-reviewer fixer | Isolated runs `reviewer-r2-multi-01-20260815` through `-03`, adjacency run `reviewer-r2-adjacency-20260815`, and full matrix `reviewer-r2-full20-20260815` | 1 RESOLVED; **CLEAN** |

## Final disposition ledger

| Finding | Entry severity | Owning seam | Independent final evidence | Final disposition |
| --- | --- | --- | --- | --- |
| `VHR-R1-001` blank-canvas trusted routing | Blocker | Physical canvas ownership, trusted page/editor receipts, result behavior, cleanup | Fresh reviewer matrices and trusted route receipts | **RESOLVED** |
| `VHR-R1-002` toolbar click/close/lifecycle sequence | Blocker | Three-point final-row input, shielding, Escape/outside behavior, restoration | Fresh short-landscape open/restored images and lifecycle receipts | **RESOLVED** |
| `VHR-R1-003` multi-editor lifecycle isolation | Blocker | Stable real-canvas paint signature through initial, UPDATE, UNMOUNT survivor, RECREATE, and final pre-capture readiness | Three consecutive isolated reviewer passes, adjacent fixture passes, fresh full matrix, and original-resolution bitmap inspection | **RESOLVED in Round 2** |
| `VHR-R1-004` real coarse/touch capability | Blocker | Target-scoped capability emulation/readback and mounted-editor receipt | Fresh portrait/landscape coarse results and focused mounted tests | **RESOLVED** |
| `VHR-R1-005` real Library fixture | Blocker | Fixed item through the real Library owner and visible DOM identity | Fresh desktop/tablet/phone reviewer results and images | **RESOLVED** |
| `VHR-R1-006` guarded writer and reviewer entry | Blocker | Write-through artifact guard and hard-coded reviewer verify entry | Reviewer-only runs and unchanged canonical hash | **RESOLVED** |
| `VHR-R1-007` recovery heading | Major | Owned foreground, heading relationship/name, contrast gate | Fresh recovery semantics and original-resolution reviewer image | **RESOLVED** |
| `VHR-R1-008` restoration and publication order | Major | Fresh post-restore query and one final post-close report publication | Exact final result counts plus restoration/input/close/absence facts | **RESOLVED** |
| `VHR-R1-009` visible trusted AI/Share actions | Major | Visible product controls and owned-state/focus assertions | Fresh trusted action receipts and personally inspected reviewer surfaces | **RESOLVED** |

## Round 2 closure evidence

The round-two reviewer independently recomputed the runner's 46-path implementation source fingerprint as:

`10aeb221ea7aebfe319738908d442ae0233020f716d8ad134d94ce2f4d4748f0`

Git base tree is `ff741af2b5aea30091c2cb154e1ff6abd3fe1c67` at `HEAD` `4d3ac154838ab910e1156022e4963395d21105a4`. Canonical directory hash before and after all reviewer work is unchanged:

`311666a303148a5f3ccb1327c3fb56f4fc3f1ddf0aaf8b7af927fa12772d5830`

### Browser runs

All runs used the hard-coded `yarn test:visual:reviewer` entry with a run id and, only for focused runs, an explicit scenario filter. No role override was set.

| Reviewer run | Scope | Result |
| --- | --- | --- |
| `reviewer-r2-multi-01-20260815` | isolated multi-editor | 1/1 pass, 0 mismatches |
| `reviewer-r2-multi-02-20260815` | isolated multi-editor | 1/1 pass, 0 mismatches |
| `reviewer-r2-multi-03-20260815` | isolated multi-editor | 1/1 pass, 0 mismatches |
| `reviewer-r2-adjacency-20260815` | selected rectangle then active text | 2/2 pass, 0 mismatches |
| `reviewer-r2-full20-20260815` | fresh unfiltered required matrix | 20/20 pass |

Every isolated and full-matrix multi-editor receipt records `visual-rectangle-01`, paint present, matching ratio `1`, signature `5a41e4c5`, stable left root/API, and geometry `24,68,1008,808` in all four lifecycle phases and at final pre-capture. The purple rectangle is visible in all four retained multi-editor images.

The full matrix contains exactly 20 final reviewer result files for 20 unique scenarios. Nineteen are pixel-exact. `narrow-loading` has 122 spinner-edge mismatches, ratio `0.0004006568144499179`, below the unchanged `0.0005` budget. All 20 pass semantic, cleanup, performance, console, checker, restoration, input restoration, target close, and target absence gates. The proxy remains connected to Chrome port 9222 and returns to `sessions=21`, `managedTabs=0`.

The reviewer opened 26 PNGs individually at original resolution: 20 full-matrix primary images, one toolbar-restored image, three isolated multi-editor repeats, and two adjacency images. The inspection inventory records dimensions, SHA-256, classification, and at least three observations for every image; all are accepted.

### Final-round test evidence

| Scope | Exact command | Result |
| --- | --- | --- |
| Visual unit | `yarn test:visual:unit` | 80/80 pass |
| Manual replay contract | `yarn test:visual:replay` | 1/1 pass |
| API lifecycle adjacency | `yarn test:app --run --minWorkers=1 --maxWorkers=1 packages/excalidraw/tests/packages/events.test.tsx` | 6/6 pass |
| Exact formatting | `node node_modules/prettier/bin-prettier.js --check excalidraw-app/visualRegressionHost.tsx scripts/visual-regression/actions.ts scripts/visual-regression/runner.ts scripts/visual-regression/visual.unit.test.ts` | pass |
| Exact lint | `node node_modules/eslint/bin/eslint.js excalidraw-app/visualRegressionHost.tsx scripts/visual-regression/actions.ts scripts/visual-regression/runner.ts scripts/visual-regression/visual.unit.test.ts` | pass, zero warnings |
| Whitespace | `git diff --check` | pass |

Strict UTF-8, JSON parse, PNG signature/hash/dimension, reviewer artifact scope, exact final-publication count, source fingerprint, canonical immutability, and proxy health audits pass. The canonical/candidate trees were not written by the reviewer.

## Durable artifacts

- Round-two fixer report: `evidence/fix-round-2/fix-report.md`
- Round-two non-author re-review: `evidence/fix-round-2/re-review-round-2.md`
- Full-matrix reviewer run: `evidence/reviewer/run-reviewer-r2-full20-20260815.json`
- Isolated reviewer runs: `evidence/reviewer/run-reviewer-r2-multi-01-20260815.json`, `run-reviewer-r2-multi-02-20260815.json`, and `run-reviewer-r2-multi-03-20260815.json`
- Adjacency reviewer run: `evidence/reviewer/run-reviewer-r2-adjacency-20260815.json`
- Personal inspection inventory: `evidence/reviewer/inspection-reviewer-r2-20260815.json`
- Fresh result root: `scripts/visual-regression/results/reviewer/reviewer-r2-full20-20260815/`
- Original review: `evidence/review-report.md`

## Loop decision

Round 2 satisfies the termination invariant: every material finding is RESOLVED or explicitly accepted-known, with the accepted-known set empty; the round-two author and verifier are distinct; affected, adjacent, and full-matrix reviewer evidence is fresh and green; and no new finding exists. The capped review cycle terminates **CLEAN** at round 2 of 3. Tasks 10.3 and 10.4 are complete. Final audit and local-only delivery work may proceed under the owning lead.
