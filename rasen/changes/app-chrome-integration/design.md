## Context

The prerequisite children delivered the semantic token and primitive layers, the six-zone canvas shell, the adaptive toolbar, the relocated property surface, the `floatingSurface` seam for menus/popovers/pickers, and the `largeSurface` seam for dialogs/sidebars/tooltips/toasts. Application-owned content is the remaining visual seam before responsive hardening: the same product currently presents welcome actions, ShareDialog and collaboration state, AI/TTD content, Library content, promo tabs, loading/error states, and host content with unrelated internal section and state conventions.

Ownership is intentionally split. `excalidraw-app/App.tsx` composes `AppMainMenu`, `AppWelcomeScreen`, desktop `renderTopRightUI`, sharing/collaboration, `AIComponents`/`TTDDialog`, `AppSidebar`, `CustomStats`, alerts, error dialogs, and command-palette application entries. `LayerUI` mounts host children before internal fallbacks, keeps tunnel-scoped preference through `withInternalFallback`, and uses a custom memo comparator. Welcome enters through `WelcomeScreenCenterTunnel` and is canvas-centered host composition, Library owns search/install/load and async cache state inside `DefaultSidebar`, AI is host-provided and owns callbacks/persistence, and `TopErrorBoundary` is an application-owned browser fallback outside the editor tree.

Real-Chrome recon confirms the visible integration gap. At 1440×900 the welcome center is 1408×868 with four 300×46 actions, while the same fixed action width persists at 375×812. Share presentation changes from a 550×519 desktop picker to a 335×772 collaboration-only phone surface. Library uses an approximately 293px sidebar on desktop and a 293×812 overlay on phone. The current desktop AI dialog uses browser-viewport assumptions and measured about 1400×860 at `(20,-74)` inside a fixed 1440×900 editor, escaping its top boundary; phone stacks its tabs into a cramped 335×772 surface. The delayed editor loading state appears after 250ms and remains a full-editor presentation. The host top-right wrapper is pointer-neutral on phone; an injected leaf remains interactive and marker-free.

Constraints are behavior preservation, independent implementation, no public interface or dependency change, no new token or `!important`, and reuse of existing surface seams. Container plus physical safe areas are authoritative. Portal/layout wrappers stay pointer- and viewport-measurement-neutral; only actual persistent leaves may carry measurement markers. This child cannot take ownership of the next child's portfolio-wide container tiers or the final child's screenshot infrastructure.

## Goals / Non-Goals

### Goals

- Establish one deep internal app-content module that hides section hierarchy, spacing, action grouping, async state presentation, application density, container bounds, and semantic state vocabulary behind a small React interface.
- Adapt welcome, sharing/collaboration, AI, Library, promo/application islands, generic loading/error/fallback, and host-rendered content without transferring their state, data, actions, roles, or information architecture into that module.
- Make application-content geometry container-bounded and safe-area-aware while preserving the `floatingSurface` and `largeSurface` framing and lifecycle authorities.
- Preserve host children/tunnels/fallback preference, LayerUI memo freshness, phone reachability, Library install/load, AI callbacks/persistence, collaboration flows, alerts, recovery, shortcuts, and public interfaces.
- Make the module and adapter contracts directly testable and require separate implementation and independent-review runtime evidence.

### Non-Goals

- A universal renderer or schema for application pages, dialogs, sidebars, or arbitrary host applications.
- New portfolio-wide responsive tier selection, tablet/landscape policy, or broad breakpoint replacement; those belong to `responsive-editor-shell`.
- New screenshot comparison infrastructure or final accessibility/performance hardening; those belong to `visual-regression-hardening`.
- Redesigning information architecture, action labels, collaboration protocols, persistence, Library cache/search/install behavior, AI generation semantics, application routing, or public SDK hooks.
- Replacing `floatingSurface`, `largeSurface`, tunnels, `withInternalFallback`, or the browser-level `TopErrorBoundary`.

## Decisions

### Decision 1: A small semantic section module with explicit domain adapters

**Choice:** Add an internal module under the editor's component ownership that exposes a compact set of composable presentation primitives: a bounded app-content frame, section/header/body/footer, action group, and semantic state presentation (`loading`, `empty`, `error`, `fallback`). Callers provide semantic content and actions; they do not provide raw layout coordinates, arbitrary internal class names, state-machine commands, or escape-hatch styles.

Welcome, share/collaboration, AI, Library, promo/application islands, generic editor states, and host content each retain an explicit adapter at their current ownership site. The module remains internal and is not re-exported from the package entry.

**Design it twice:**

1. A single universal application renderer would accept page kind, sections, actions, async state, geometry, and host exceptions. It appears consistent but creates a shallow, widening interface that callers must configure with nearly all implementation facts; it also conflates dialog, sidebar, tunnel, and editor-state semantics.
2. Per-consumer restyling would preserve ownership but duplicate section hierarchy, async state chrome, action grouping, density, and bounds across at least seven surfaces.
3. The chosen hybrid centralizes only recurring presentation facts in a deep module and keeps domain adapters explicit. It has multiple real adapters without claiming their business semantics are interchangeable.

**Deletion test:** deleting this module must scatter content-section hierarchy, async-state presentation, action grouping, host-island framing, density, and container-bound rules back across welcome, share, AI, Library, promo, loading/error, and host consumers. If deletion only removes wrapper names, the implementation is too shallow and must be deepened.

### Decision 2: Presentation state is semantic; async and business state remain owned by adapters

**Choice:** The module can render a semantic state and its accessible copy/action slots, but it never fetches data, owns promises, chooses recovery actions, mutates editor state, or translates domain errors. Library retains its atom/cache/status and install/load/search actions; collaboration retains its dialog and indicator state; AI retains callbacks, polling/persistence, and output state; generic editor loading/error retains `appState`; the application retains alerts and browser recovery.

**Rationale and alternative:** Moving async ownership into the shared module would make state visuals easy to standardize but would couple unrelated data lifecycles and error semantics. Semantic presentation provides locality without creating a cross-domain state machine.

### Decision 3: Existing surface seams own frames and lifecycle; app content owns only the interior

**Choice:** Dialogs/sidebars continue through `largeSurface`; menu/popover/picker framing continues through `floatingSurface`. The app-content module may compose inside these surfaces or render standalone canvas-centered/application islands, but it must not duplicate modal focus, scrolling/settlement, floating collision, elevation, portal ownership, or sidebar mode policy.

**Rationale:** A third generalized surface system would reopen already-settled lifecycle and geometry contracts. Keeping framing and content as orthogonal seams lets share, AI, Library, and promo adopt common internal hierarchy without erasing their modality or anchoring semantics.

### Decision 4: Container geometry and physical safe areas bound app content

**Choice:** App-content frames derive available inline/block size from the owning editor container and the established physical safe-area readings. AI and other legacy content replace browser media and `vh` assumptions at the adapter boundary with container-relative constraints and bounded internal scrolling. The change uses current container facts and does not invent the next child's tier policy.

Portal hosts, canvas-layout zones, welcome-tunnel wrappers, and measurement rails remain neutral. Persistent reservation markers are allowed only on the actual visual leaf and only where existing viewport-offset behavior requires them.

**Rationale:** The app is embeddable and recon demonstrated browser-viewport sizing can escape a fixed editor. Reusing container facts fixes ownership without preempting tablet/landscape tier selection.

### Decision 5: Host composition and fallback preference are invariant contracts

**Choice:** Preserve the LayerUI order in which host children mount before fallbacks, every tunnel identity, the per-editor counter/preference behavior in `withInternalFallback`, and the custom memo comparator's freshness contract. Welcome remains a `WelcomeScreenCenterTunnel` composition rather than becoming a generic dialog. Host `renderTopRightUI` keeps desktop/phone callback semantics; phone may continue returning no app-provided top-right content while sharing/collaboration remain reachable through welcome and main-menu flows.

Host-provided leaves can opt into the new section vocabulary through existing composition, but neutral wrappers receive no pointer or viewport-marker authority. `children` identity and compared host callbacks must remain sufficient to refresh outlets.

**Rationale:** Replacing tunnel-scoped preference with a global registry or moving host content behind a memoized universal renderer risks cross-editor leakage and stale host UI. The existing seam already handles multiple editor instances correctly.

### Decision 6: Event and delayed-work ownership remain synchronous and editor-scoped

**Choice:** Preserve these implementation constraints across any adapter extraction:

“Same-turn compatibility events must be captured synchronously at the owning App; committed scalar state cannot reconstruct overwritten events.”

“Transient placement reservations that must not alter canvas offsets need private leaf markers rather than viewport markers or neutral wrappers.”

“Delayed canvas affordances must capture the owning editor at schedule time and keep DOM, timers, association, placement, and cleanup editor-scoped.”

**Rationale:** App-content integration touches fallback, loading, host, and delayed state surfaces where moving work into effects or shared globals could silently cross editor instances or lose same-turn intent. These are ownership rules, not optional optimization details.

### Decision 7: Top-level browser fallback stays application-owned and deliberately separate

**Choice:** `TopErrorBoundary` remains outside the editor tree with its current reload, clear-state, reporting, and recoverable scene-details semantics. It may adopt the same token vocabulary and app-content section visuals, but it cannot depend on editor context, tunnels, modal ownership, or editor APIs that may be unavailable after a top-level failure.

**Rationale:** Folding it into editor-owned error presentation would make the fallback fail with the tree it is meant to replace. A thin visual adapter preserves recovery independence.

### Decision 8: Tests cross the module interface and adapters, then real Chrome proves geometry

**Choice:** Add direct tests for the section interface, semantic states, action grouping, token use, accessibility, and neutral wrappers. Add focused adapter/integration tests for workflow preservation, host/fallback order and multi-editor isolation, LayerUI freshness, Library/AI ownership, loading delay, and top-level fallback independence. Replace obsolete presentation-only expectations when the new interface covers them; do not layer brittle snapshots over the same facts.

Real Chrome evidence is separate for implementation and independent review at 1440×900 and 375×812 in light/dark, covering welcome, sharing/collaboration, Library empty/loading, AI, promo/application islands, generic loading/error, and injected host leaves. Runtime acceptance records rectangles, overflow/scroll, pointer targets, marker neutrality, checker/overlay state, and error console counts.

## Risks / Trade-offs

- **[The shared interface grows into a page schema]** → Keep it limited to hierarchy, actions, state presentation, density, and bounds; reject consumer-specific branching and require the deletion test during review.
- **[Adapter extraction moves domain state or breaks actions]** → Keep state/data/action creation at existing owners and assert identity/callback behavior with focused tests for each domain.
- **[LayerUI host content becomes stale or cross-editor fallback preference leaks]** → Preserve child-first mounting, compared inputs, tunnel identities, and per-editor counters; add two-editor and host-refresh regressions.
- **[Container fixes preempt responsive policy]** → Use only measured bounds and current safe-area facts; defer tier selection and broader breakpoint behavior to the dependent child.
- **[AI or Library styling collides with legacy high-specificity CSS]** → Adopt semantic wrappers incrementally, remove only superseded local rules, and add no new `!important`; inspect both themes and narrow geometry in real Chrome.
- **[Loading/error evidence is timing-sensitive]** → Use the owned 250ms delay and deterministic adapter state in focused tests; record visible geometry only after the state is actually present.
- **[Existing unrelated snapshots change]** → Do not update snapshots unrelated to a changed adapter; in particular, do not casually accept the two pre-existing unrelated `floatingSurface` snapshot differences.

## Migration Plan

1. Add the internal app-content module and direct interface tests without changing public exports.
2. Migrate adapters in bounded groups: generic state presentation and welcome; sharing/collaboration; Library; AI; promo/host/fallback. Keep each domain owner and action flow intact.
3. Remove superseded presentation rules only after the relevant adapter passes focused tests and Chrome inspection.
4. Run focused suites, build the package before root typecheck, then run implementation browser acceptance and independent review/fix cycles.
5. Deliver locally through the portfolio's normal ship stage; no data or runtime migration is needed.

Rollback is a revert of the internal module and adapter styling changes. No storage schema, server protocol, dependency, or public interface migration needs reversal.

## Open Questions

- Final module name and exact primitive inventory, bounded by the small-interface rule and deletion test. The implementation should prefer fewer semantic entry points over aliases for each consumer.
- Whether the application-owned `TopErrorBoundary` shares React presentation primitives or only shared CSS/token vocabulary. It must remain renderable without editor context either way.
- Which existing presentational snapshots become obsolete after adapter-level behavioral tests. Only snapshots directly owned by migrated adapters may be updated.
