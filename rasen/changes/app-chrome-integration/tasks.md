## 1. Lock the deep app-content interface

- [x] 1.1 Add failing direct tests for the internal app-content interface: bounded frame, section/header/body/footer hierarchy, action groups, `loading`/`empty`/`error`/`fallback` presentation, density, accessible labeling, semantic-token consumption, and neutral pointer/viewport-marker behavior.
- [x] 1.2 Implement the internal app-content module with the smallest semantic interface that satisfies those tests; do not public-export it, accept raw coordinates/internal class overrides, create domain state, define new tokens, add a dependency, or add `!important`.
- [x] 1.3 Document the interface invariants and adapters in the module: domain owners supply state/content/actions; `floatingSurface`/`largeSurface` retain frame and lifecycle ownership; container plus physical safe areas bound content; the deletion test must scatter real presentation policy across multiple callers.
- [x] 1.4 Add a scope test or static assertion that the module is absent from `packages/excalidraw/index.tsx` and that existing public render props, compound exports, tunnel identities, and surface interfaces are unchanged.

## 2. Integrate generic states and welcome content

- [x] 2.1 Adapt delayed editor loading, empty/fallback, and recoverable editor error presentation to the semantic state vocabulary while preserving the 250ms delay, copy, dismissal/recovery, default-UI gating, cleanup, and existing `appState` ownership.
- [x] 2.2 Adapt `AppWelcomeScreen`/welcome-center content and its action group to the new hierarchy while preserving `WelcomeScreenCenterTunnel`, canvas-centered composition, open/help/collaboration/sign-up actions, labels, focus behavior, and phone reachability.
- [x] 2.3 Add focused tests for loading absence/presence across the delay, cleanup on state change/unmount, recoverable error actions, welcome tunnel composition, all existing welcome actions, and desktop/phone host behavior.
- [x] 2.4 Keep transient placement and delayed work editor-scoped: private reservations stay on actual leaves without viewport markers, and delayed DOM/timer work captures and cleans up against the editor that scheduled it.

## 3. Integrate sharing and collaboration content

- [x] 3.1 Adapt ShareDialog's share and collaboration-only interiors to app-content sections/action groups inside the existing large-surface frame; preserve tabs/variants, roles, labels, export/share actions, close behavior, and collaboration session flow.
- [x] 3.2 Adapt desktop live-collaboration trigger, collaborator/error indicator content, offline warning, and application error surfaces without changing `renderTopRightUI` arguments, the phone null-return policy, collaboration reachability, atom/Collab ownership, or alert semantics.
- [x] 3.3 Add focused desktop/phone tests proving every current share/collaboration entry path, collaboration-only vs share presentation, current actions/roles, error and warning behavior, and app-owned callback identity remain unchanged.
- [x] 3.4 Preserve same-turn compatibility event capture at the owning App; do not replace synchronous capture with reconstruction from committed scalar state or a shared effect.

## 4. Integrate Library and application promo islands

- [x] 4.1 Adapt `DefaultSidebar` Library content to app-content sections and semantic loading/empty/error/action presentation while preserving Library/search tabs, atoms/cache status, selection/insertion, install/load/import/browse actions, return URL, and existing sidebar overlay/docked behavior.
- [x] 4.2 Adapt `AppSidebar` comments/presentation promo islands and applicable application-link/command content to the shared hierarchy and action grouping while retaining artwork ownership, outbound destinations, copy, tabs, theme variants, and deliberate brand/promo treatment.
- [x] 4.3 Keep sidebar shells, marker leaves, overlay canvas reachability, and physical safe-area handling under the established large-surface/sidebar seam; neutral app-content wrappers receive no viewport markers.
- [x] 4.4 Add focused tests for Library loading/empty/populated/search/install/load/import/error behavior, phone overlay reachability, promo tab/action behavior, and absence of transferred async or routing ownership.

## 5. Integrate AI and host-provided application content

- [x] 5.1 Adapt host-provided `AIComponents`/`TTDDialog` content to app-content sections inside the existing dialog seam while preserving trigger/fallback preference, modes/tabs, input, submission/polling, callbacks, persistence, output, error, keyboard, and close behavior.
- [x] 5.2 Replace migrated AI browser-viewport sizing assumptions with editor-container and physical-safe-area bounds plus reachable internal scrolling; do not introduce final container tiers or new high-specificity overrides.
- [x] 5.3 Provide composition for host-rendered application leaves through existing children/tunnels/render callbacks without wrapping them in a universal renderer; preserve interactive-leaf pointer handling and marker neutrality.
- [x] 5.4 Add focused tests for AI callback/state ownership and persistence, container-bounded desktop/narrow geometry, `withInternalFallback` host preference, two-editor isolation/cleanup, LayerUI host callback/children freshness, and phone top-right fallback behavior.

## 6. Preserve browser recovery and custom application islands

- [x] 6.1 Give `TopErrorBoundary` coherent app-content/token presentation without making it depend on editor context, tunnels, modal ownership, or editor APIs; preserve reload, clear-state caveat, reporting, and recoverable scene-detail behavior.
- [x] 6.2 Adapt `CustomStats` and other in-scope app-supplied islands only where they use the shared section hierarchy; retain debounce/storage ownership, copy action, order, host render callback, and existing stats visibility semantics.
- [x] 6.3 Add focused tests that simulate top-level fallback independently of the editor tree and verify recovery actions/details, plus CustomStats callback/debounce cleanup and host rendering behavior.
- [x] 6.4 Remove only presentation rules and snapshots superseded by the migrated adapters; do not update unrelated snapshots, especially the two pre-existing unrelated `floatingSurface` differences.

## 7. Implementation real-Chrome evidence

- [x] 7.1 Run the chrome-use dependency check, open implementation-owned disposable targets, and inspect 1440×900 light and dark states for welcome, share/collaboration, Library empty/loading, AI, promo/application islands, generic loading/recoverable error, CustomStats/host leaves, and browser fallback where safely reproducible.
- [x] 7.2 Inspect the corresponding 375×812 light and dark states, including collaboration-only phone presentation, Library overlay/canvas strip, AI tabs/input/scroll, delayed loading, promo/host content, safe-area bounds, and action reachability.
- [x] 7.3 For each representative state, record editor/surface/scroll rectangles, accessible names/roles, real `elementFromPoint` or click targets, leaf marker and neutral-wrapper attributes, and container overflow; verify all content is visible or scroll-reachable.
- [x] 7.4 Clear the accepted target console, hard-reload/reset to a clean state, then record zero checker messages, zero visible error overlays, and zero change-related error-level console events; save concise notes/screenshots under the resolved evidence/ephemera locations, personally inspect each accepted screenshot, and close every disposable target.

## 8. Automated verification and implementation handoff

- [x] 8.1 Run the direct module tests and focused welcome, LayerUI/host fallback, share/collaboration, Library/sidebar, AI/TTD, loading/error, TopErrorBoundary, CustomStats, viewport, and interactivity suites; update only snapshots directly owned by intentional adapter presentation changes.
- [x] 8.2 Run `yarn build:excalidraw` successfully before `yarn test:typecheck`, then run focused lint/format/style validation over changed source, tests, and artifacts; fix every change-related failure at its cause.
- [x] 8.3 Run `git diff --check`, strict UTF-8/no-BOM/U+FFFD/mojibake checks, stylesheet/JSON syntax checks where applicable, dependency/public-export/new-token/`!important` audits, and originality/restricted-content audits over source, tests, artifacts, evidence notes, and prospective delivery text.
- [x] 8.4 Prepare an implementation handoff with exact focused commands, current tree fingerprint, accepted Chrome matrix and paths, known environment facts, and explicit contracts for host/fallback ordering, multi-editor isolation, container bounds, marker neutrality, and downstream scope.

## 9. Independent review only

- [x] 9.1 Assign review to an independent reviewer who did not author the implementation; the reviewer SHALL inspect the full diff and module interface against the deletion test, state/action ownership, surface seam boundaries, public contracts, synchronous-event ownership, editor-scoped delayed work, and downstream exclusions without editing product code in this stage.
- [x] 9.2 The independent reviewer SHALL run the relevant focused tests and repeat their own real-Chrome 1440×900 and 375×812 light/dark interactions for representative welcome, share/collaboration, Library, AI, loading/error/fallback, promo, and host states; implementation screenshots do not satisfy this task.
- [x] 9.3 The independent reviewer SHALL capture their own screenshots/DOM/geometry/pointer/marker/console evidence, personally inspect it, and produce a severity-tagged report with exact file/state evidence, including explicit zero-finding statements for contracts that pass.

## 10. Fix and delta re-review only

- [x] 10.1 If review finds issues, a fixer distinct from the reviewer SHALL change only the reported defects, add or tighten focused regressions, and record the delta and commands; no unrelated cleanup or scope expansion is allowed.
- [x] 10.2 The original independent reviewer SHALL re-review only the fix delta, rerun affected tests and runtime states, and confirm every finding closed or explicitly escalate a remaining blocker; repeat within the review-cycle cap until clean.
- [x] 10.3 Record the final review-cycle result and preserve author-versus-verifier separation for every accepted fix; do not mark independent review complete from implementer self-report.

## 11. Final audits and local ship

- [x] 11.1 Re-run the minimal affected suites, then `yarn build:excalidraw` before `yarn test:typecheck` only if the review delta can affect those results; record final passing evidence against the exact prospective tree.
- [x] 11.2 Run final strict artifact validation, task reconciliation, UTF-8/BOM/mojibake, diff, dependency, public-interface, new-token, `!important`, originality, restricted-content, viewport-marker, and downstream-scope audits; confirm all disposable Chrome targets are closed.
- [x] 11.3 Use the portfolio's local delivery mode to commit only the accepted application-integration implementation, focused tests, child artifacts, review evidence, and approved parent planning-context update with neutral commit text; do not push, archive, sync specs, or modify portfolio run-state in this child.
- [x] 11.4 Save the ship log under the child evidence directory and hand the completed child back to the portfolio so `responsive-editor-shell` can begin only after implementation and independent review are both clean.
