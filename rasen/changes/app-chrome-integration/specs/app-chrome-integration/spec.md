## ADDED Requirements

### Requirement: Internal app-content section module

The system SHALL provide one internal app-content section module that hides content hierarchy, spacing, action grouping, semantic loading/empty/error/fallback presentation, application density, bounded container framing, and token usage behind a small React interface. Callers SHALL provide semantic content and actions rather than raw coordinates, arbitrary internal selectors, state-machine commands, or layout escape hatches. The module SHALL NOT be exported from the package public entry.

#### Scenario: Multiple application adapters share one interface

- **WHEN** welcome, sharing/collaboration, AI, Library, promo, generic state, or host content renders through the module
- **THEN** each adapter SHALL use the same semantic section, action-group, state-presentation, and bound vocabulary without consumer-specific branches inside the module

#### Scenario: Module remains internal and deep

- **WHEN** the module interface and public package entry are inspected
- **THEN** the interface SHALL expose semantic presentation inputs only and SHALL NOT be publicly re-exported
- **AND** deleting the module would require its hierarchy, state chrome, action grouping, density, and bound rules to be reimplemented across multiple adapters

### Requirement: Domain state, data, actions, and information architecture remain owned by adapters

The app-content module SHALL NOT fetch data, own promises, translate domain errors, mutate editor state, choose recovery actions, or redefine roles and information architecture. Welcome, sharing/collaboration, AI, Library, promo, generic editor states, host content, and browser recovery SHALL retain their current state/data/action owners and behavior.

#### Scenario: Sharing and collaboration workflows remain reachable

- **WHEN** a desktop or phone user enters sharing or live collaboration through any currently supported welcome, main-menu, top-right, or dialog flow
- **THEN** the existing actions, labels, roles, collaboration-only/share variants, and session behavior SHALL remain available
- **AND** the phone path SHALL remain reachable even when the application `renderTopRightUI` callback returns no phone content

#### Scenario: Library retains its async and action ownership

- **WHEN** Library is empty, loading, populated, searched, installed, imported, or fails through an existing operation
- **THEN** its atom/cache status, search and tab behavior, install/load/import actions, selection, insertion, and error translation SHALL remain owned by the existing Library adapter
- **AND** only presentation hierarchy and semantic state chrome SHALL be shared

#### Scenario: AI retains host callbacks and persistence

- **WHEN** the host-provided AI/TTD flow opens, changes modes, submits, polls, persists input, reports an error, or returns output
- **THEN** its existing callbacks, state, persistence, labels, roles, and output behavior SHALL remain unchanged
- **AND** the shared module SHALL not become the AI state machine

### Requirement: Existing surface seams remain authoritative

Application content inside dialogs and sidebars SHALL continue to use the established `largeSurface` seam, and content inside menus/popovers/pickers SHALL continue to use the established `floatingSurface` seam. The app-content module SHALL NOT duplicate modal lifecycle, focus/scroll ownership, settlement, floating collision, portal ownership, elevation policy, or sidebar mode policy.

#### Scenario: Large application content composes inside large surfaces

- **WHEN** sharing, AI, Library, error, promo, or another application adapter renders inside a dialog or sidebar
- **THEN** the existing large-surface kind, presentation, density, focus, scroll, safe-area, and cleanup behavior SHALL remain authoritative

#### Scenario: Floating application content preserves floating semantics

- **WHEN** application content uses an existing menu, popover, picker, tooltip, or related floating surface
- **THEN** the current floating owner, collision, focus, Escape/outside interaction, and portal behavior SHALL remain unchanged

### Requirement: Application content is container-bounded and safe-area-aware

Application-content geometry SHALL use the owning editor container and physical safe-area insets as its available bounds. Legacy browser-viewport sizing in migrated adapters SHALL be replaced with container-relative sizing and bounded internal scrolling without introducing portfolio-wide responsive tier policy.

#### Scenario: Desktop AI stays inside a fixed editor container

- **WHEN** AI content opens inside a 1440×900 editor whose browser viewport is larger or differently positioned
- **THEN** its visible frame SHALL remain within the editor container and physical safe areas
- **AND** overflow SHALL remain reachable through bounded internal scrolling rather than escaping the editor top or bottom

#### Scenario: Narrow application content remains reachable

- **WHEN** welcome, share, Library, AI, promo, loading, or error content renders in a 375×812 editor container
- **THEN** its primary content and actions SHALL remain visible or scroll-reachable without relying solely on browser media queries or viewport units

#### Scenario: This change does not introduce final responsive tiers

- **WHEN** the implementation diff is inspected
- **THEN** it SHALL use measured container bounds and current safe-area facts only
- **AND** SHALL NOT introduce the portfolio-wide tablet, landscape, or tier-selection policy owned by `responsive-editor-shell`

### Requirement: Host composition, tunnels, fallback preference, and freshness are preserved

The integration SHALL preserve host children mounted before internal fallbacks, every existing tunnel identity, `withInternalFallback` per-editor preference and cleanup, `defaultUIEnabled` behavior, host callback arguments, and LayerUI's custom memo correctness. Welcome SHALL remain canvas-centered through `WelcomeScreenCenterTunnel` rather than becoming a generic dialog.

#### Scenario: Host content wins without cross-editor leakage

- **WHEN** two editor instances mount different host main-menu, sidebar-trigger, welcome, TTD, or overwrite-confirm sources
- **THEN** each instance SHALL prefer its own host source and fallback independently
- **AND** unmounting or replacing one instance SHALL NOT alter the other instance's preference

#### Scenario: Host inputs refresh through LayerUI memoization

- **WHEN** compared host callbacks, host children, application state, or form factor changes the content or visibility of an outlet
- **THEN** LayerUI SHALL render current content without a stale node, hidden identity requirement, or new memo trap

#### Scenario: Neutral host wrappers do not claim canvas reservation

- **WHEN** `renderTopRightUI`, a tunnel outlet, or another host composition wrapper renders application content
- **THEN** neutral wrappers SHALL remain pointer-pass-through where applicable and SHALL carry no viewport-measurement marker
- **AND** actual interactive host leaves SHALL remain operable

### Requirement: Loading, recoverable error, fallback, and alert presentation is coherent and independent

The system SHALL present generic loading, empty, recoverable error, fallback, collaboration indicator, warning, and danger states through the semantic application-content vocabulary where applicable while retaining their existing timing, action, accessibility, and ownership semantics. The top-level browser error fallback SHALL remain application-owned outside the editor tree and SHALL not depend on editor context.

#### Scenario: Delayed editor loading state preserves timing

- **WHEN** the editor `isLoading` state remains true
- **THEN** default loading presentation SHALL remain absent during its existing 250ms delay and become visible afterward with current accessible copy
- **AND** the delayed work SHALL clean up when the owning editor state changes or unmounts

#### Scenario: Recoverable editor error retains dismissal

- **WHEN** `appState.errorMessage` or an application-owned recoverable error is present
- **THEN** the current message and dismissal or recovery action SHALL remain available through the appropriate existing owner

#### Scenario: Browser fallback survives editor failure

- **WHEN** the top-level application error boundary catches an error before or outside editor recovery
- **THEN** reload, clear-state, reporting, and recoverable scene-detail behavior SHALL remain available without tunnels, editor context, or editor APIs

### Requirement: Same-turn events and editor-scoped delayed ownership are preserved

Compatibility events that can overwrite one another in the same turn SHALL be captured synchronously at their owning App. Transient placement reservations that must not change canvas offsets SHALL use private leaf markers rather than viewport markers or neutral wrappers. Delayed canvas affordances SHALL capture their owning editor at schedule time and keep DOM, timers, association, placement, and cleanup editor-scoped.

#### Scenario: Same-turn compatibility event is not reconstructed from committed state

- **WHEN** two compatibility events can occur before committed scalar state is observable
- **THEN** the owning App SHALL synchronously capture each required event
- **AND** the integration SHALL NOT attempt to reconstruct an overwritten event from later scalar state

#### Scenario: Transient reservation does not change offsets

- **WHEN** an application affordance needs a private transient placement reservation
- **THEN** it SHALL use a private marker on the actual leaf
- **AND** SHALL NOT add `data-viewport-ui` to a neutral wrapper or transient reservation

#### Scenario: Delayed affordance remains bound to its editor

- **WHEN** a delayed application or canvas affordance is scheduled and multiple editors mount, remount, or unmount
- **THEN** the scheduled work, DOM association, placement, and cleanup SHALL remain bound to the editor captured at schedule time

### Requirement: Application chrome uses delivered visual foundations without new override systems

Migrated application content SHALL consume the delivered `--ui-*` tokens, `UiButton`/`Icon` primitives where compatible, and established surface seams. It SHALL preserve deliberate brand treatments and SHALL NOT introduce a dependency, new CSS custom property, copied external source/selector/icon/font/asset, or new `!important` override.

#### Scenario: Light and dark application chrome is coherent

- **WHEN** welcome, share/collaboration, Library, AI, promo, loading/error, and host examples render in light and dark themes
- **THEN** section hierarchy, action groups, state chrome, density, surfaces, borders, typography, focus, and disabled states SHALL use the delivered visual foundations coherently

#### Scenario: Scope audit stays clean

- **WHEN** the final implementation and artifact diff is audited
- **THEN** it SHALL contain no public interface break, dependency addition, new design token, copied external material, new `!important`, forbidden reference term, or assessment filename

### Requirement: Focused automated and independent real-browser acceptance

The change SHALL include direct module tests, focused adapter/integration coverage, and separate real-Chrome evidence from the implementation pass and an independent review pass at 1440×900 and 375×812 in both light and dark themes.

#### Scenario: Automated coverage crosses the intended seams

- **WHEN** focused tests run
- **THEN** they SHALL cover the app-content interface and semantic states, adapter-owned action/data behavior, host/fallback order and multi-editor isolation, LayerUI freshness, Library and AI ownership, loading delay/cleanup, container bounds, marker neutrality, and browser-fallback independence

#### Scenario: Implementation browser matrix is complete

- **WHEN** the implementation pass inspects the running editor in real Chrome
- **THEN** it SHALL capture relevant welcome, share/collaboration, Library empty/loading, AI, promo/application island, loading/error/fallback, and injected host-leaf states at 1440×900 and 375×812 in light and dark
- **AND** SHALL record geometry, scrolling, pointer targets, marker neutrality, checker/overlay count, and zero change-related error-level console events

#### Scenario: Independent reviewer repeats runtime inspection

- **WHEN** the change enters independent review
- **THEN** a reviewer distinct from the implementer SHALL repeat the representative desktop/narrow light/dark interactions and inspect their own screenshots and DOM evidence
- **AND** implementation evidence alone SHALL NOT satisfy review acceptance

### Requirement: Downstream hardening remains out of scope

This child SHALL integrate application content only. It SHALL NOT implement the next child's comprehensive container tier, tablet, landscape, RTL, touch, safe-area, and overflow policy or the final child's screenshot-regression infrastructure and broad performance/accessibility sweep.

#### Scenario: Diff belongs to application integration

- **WHEN** the final diff and tasks are reviewed
- **THEN** changes SHALL be limited to the internal app-content module, named adapters, their presentation rules, focused tests, and evidence
- **AND** deferred responsive and visual-regression work SHALL remain assigned to their dependent children
