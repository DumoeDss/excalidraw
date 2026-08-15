# VHR-R1-006 fixer handoff

## State

DONE at the atomic fixer boundary; OPEN for non-author review/integration.

One `GuardedArtifactWriter.writeThrough()` seam now couples authorization to every retained runtime operation, including proxy screenshots, evidence/current/diff PNGs, both current report writes, inventory, candidate/metadata, canonical temp plus rename, canonical metadata, and manual replay evidence. Strict role parsing happens before proxy preflight or target creation.

Reviewer acceptance uses `yarn test:visual:reviewer`, whose code hard-codes reviewer verify. Generic worker entries reject reviewer selection. Reviewer write capability is limited to reviewer result/evidence roots; update, promotion, candidate, canonical, and other-role roots are rejected. Implementer/fixer capabilities remain available.

Focused runtime evidence passed 4/4 and full visual unit passed 64/64. Exact Prettier and ESLint passed. Root typecheck has only the two pre-declared Library adjacency errors. Canonical hash remains `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`. Proxy remained connected at 21 sessions/0 managed tabs; no browser target was created.

## Integration/reviewer action

The non-author reviewer should inspect the 12-path atomic fingerprint `3d6d466d63a9132d3bd62aa4ff280f1beb0151c3cf8a44d5973878d983d6dd52`, rerun the focused writer tests, and use only the hard-coded reviewer entry for any acceptance capture. VHR-R1-008 may consolidate the two scenario report writes, but should retain `artifactWriter.writeStableJson()` as its single final report operation.

Residual boundary: Node/Windows lacks a race-free `openat`/no-follow directory-chain API, so a concurrently hostile local filesystem writer could race the last validation and open. Lexical, nearest-existing-parent, junction, symlink, hard-link, temp, and post-write containment are enforced within available APIs.

Primary report: `rasen/changes/visual-regression-hardening/evidence/fix-round-1/atomic-006/fix-report.md`.
