# VHR-R1-009 fixer handoff

## State

The atomic harness fix is implemented and fully evidenced against final source, but the finding remains OPEN for the original reviewer.

- AI acceptance now trusted-clicks the visible toolbar extra-tools control and its visible text-to-diagram menu item.
- Share acceptance now trusted-clicks the visible application share control.
- Every step records stable identity, visible/actionable geometry, center-point reachability, browser click coordinates, page `isTrusted: true` receipt, and target ownership.
- The resulting owned surface must be visible and own focus; AI additionally requires the exact dialog name and tab.
- Focused unit coverage passes 34/34, including blocked-control and untrusted-receipt negatives.
- Final authoritative run: `fixer-009-actions-2`; both semantic paths completed with zero semantic and cleanup failures.
- Both scenario statuses remain red only for existing canonical pixel differences. No baseline was updated or promoted.
- Both final images were personally inspected and visibly contain the intended surfaces. Both also visibly contain the known red checker badge despite metadata reporting zero checker overlays.
- Canonical directory hash is unchanged at `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188`.
- Final proxy health: connected, `sessions=0`, `managedTabs=0`; both fresh targets are closed.

Primary report: `rasen/changes/visual-regression-hardening/evidence/fix-round-1/atomic-009/fix-report.md`.

## Eliminated hypotheses

- Direct `openDialog` state or share-atom mutation is not an acceptable action. Atom access is retained only to reset and restore the Share prerequisite; acceptance is physical input through the visible product control.
- The text-to-diagram tunnel item does not inherit `toolbar-text-to-diagram`; the exact owning tunnel container plus `menuitem` role and visible name identifies the real rendered control.
- A successful CDP `clickAt` response alone does not prove trusted product receipt. The page-side capture receipt is mandatory.
- Matching pixels cannot substitute for action evidence, and action evidence cannot authorize baseline promotion. The existing pixel drift and visible checker badge remain integration work.

## Next integration and review actions

1. Preserve the `click-sequence` control identities and strict actionable/trusted/owner assertions.
2. Resolve the visible checker-badge versus `checkerOverlays: 0` mismatch in the shared integration pass.
3. Rerun `desktop-ai,desktop-share` in fresh integration-owned targets, classify all pixel differences, and use the established inspected-candidate path if a baseline change is legitimate.
4. Have the original non-author reviewer run fresh reviewer-owned captures and issue an explicit `VHR-R1-009` disposition. Fixer evidence cannot close the finding.

Do not weaken the action gates, tolerance, or masks. Do not treat the current red pixel status as an action-path failure or silently accept it as a new baseline.
