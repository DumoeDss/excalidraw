## ADDED Requirements

### Requirement: One deterministic semantic responsive profile

The editor SHALL resolve one immutable internal `ResponsiveEditorShellProfile` from normalized editor-container dimensions, the host-resolved form factor and sidebar policy, desktop UI preference, language direction, touch/coarse input capability, and physical safe-area insets. The profile SHALL expose schema version, semantic tier, real adapter, orientation, short/regular block state, compact/touch density, mobile/compact/full presentation, direction, sidebar fit, physical and logical safe-area projections, and a stable signature to internal consumers through a private extension of the existing editor-interface context, without changing the common/public `EditorInterface` contract.

#### Scenario: Default container tiers select real adapters

- **WHEN** default form-factor policy resolves representative 1440×900 desktop, 1180×700 or 768×1024 tablet, and 375×812 or 812×375 phone containers
- **THEN** desktop and tablet tiers SHALL select the existing desktop adapter, only phone SHALL select the existing phone adapter, and presentation SHALL resolve respectively from desktop preference, compact, and mobile

#### Scenario: Existing threshold semantics remain exact

- **WHEN** dimensions are evaluated immediately below, at, and immediately above the phone-width, mobile-landscape width/height, tablet min/max, 520px short-block, sidebar-fit, or orientation-equality boundaries
- **THEN** the profile SHALL follow the existing strict form-factor and sidebar comparisons plus the documented profile comparisons without a CSS-only or window-width reinterpretation

#### Scenario: Host policies remain authoritative

- **WHEN** `UIOptions.getFormFactor` or `UIOptions.dockedSidebarBreakpoint` supplies a host policy for a positive container measurement
- **THEN** the profile SHALL use the host-resolved tier and sidebar fit, including selecting the phone adapter only when the host result is phone

#### Scenario: Invalid numeric inputs normalize deterministically

- **WHEN** resolver dimensions or safe-area inputs are negative, non-finite, negative zero, or differ only beyond the documented signature precision
- **THEN** the resolver SHALL produce finite nonnegative canonical values, fixed physical/logical field order, and the same signature for semantically equal input

#### Scenario: Semantic equality preserves profile identity

- **WHEN** observer or lifecycle events resolve to the same semantic signature as the current profile
- **THEN** App SHALL reuse the current immutable profile object and SHALL NOT create context churn from incidental input or object identity

### Requirement: Existing context and sole container observer remain the authority

The responsive capability SHALL deepen the existing `EditorInterfaceContext` and App refresh path. App's existing editor-container `ResizeObserver` SHALL remain the sole container-size observer, and no second responsive provider, external store, global mutable profile, or `LayerUI` prop SHALL be introduced.

#### Scenario: Container changes without a window resize

- **WHEN** an embedded editor container changes size while the browser viewport is unchanged
- **THEN** the existing observer SHALL refresh the semantic profile and matching adapter/presentation from the new container bounds

#### Scenario: Fixed-size direction change remains fresh

- **WHEN** an App instance's requested language changes between LTR and RTL while container dimensions remain fixed
- **THEN** the existing language update path SHALL record and project that instance direction on its editor root and refresh logical safe areas, surface policy consumers, and reservation freshness before rendering the new language
- **AND** responsive policy SHALL NOT retain `document.documentElement.dir` as its direction authority

#### Scenario: Fixed-size input capability change remains fresh

- **WHEN** the primary-pointer coarse media query changes or the first real canvas pen/touch pointer is received at a fixed container size
- **THEN** density SHALL refresh to touch through the existing context while the separate touch latch, pen-mode behavior, pointer actions, and collaboration timing remain preserved

#### Scenario: Fixed-size safe-area change remains fresh

- **WHEN** owner-window or visual-viewport resize reports new canonical physical safe-area values without changing the editor container size
- **THEN** the profile and JavaScript surface policies SHALL use the new values and CSS consumers SHALL agree through the canonical aliases

#### Scenario: Detached or transient zero-sized container

- **WHEN** a previously measured editor detaches or temporarily reports zero width or height
- **THEN** it SHALL retain its last valid size-derived tier, adapter, orientation, and block state rather than swapping adapters, while fixed-size direction, input, and safe-area facts may still refresh
- **AND** a later positive measurement SHALL resume normal resolution

#### Scenario: First valid measurement replaces the initial profile

- **WHEN** an editor starts without a positive container measurement and later receives one
- **THEN** it SHALL use the deterministic existing desktop initial profile until the first valid measurement and then replace it with the resolved container-local profile

#### Scenario: Listeners and observers clean up per editor

- **WHEN** an editor unmounts with container observation, media-query, window, or visual-viewport listeners active
- **THEN** all instance-owned subscriptions SHALL be removed and no later profile update SHALL occur

### Requirement: Physical safe areas are canonical and logical projections are direction-aware

The editor SHALL treat the root `--sat`, `--sar`, `--sab`, and `--sal` values as the single physical safe-area authority. Floating-surface, large-surface, AppContent, layout, and JavaScript geometry SHALL consume those canonical values directly or through compatibility aliases, and SHALL NOT independently read a second set of environment insets.

#### Scenario: LTR projection preserves physical values

- **WHEN** asymmetric top/right/bottom/left safe areas are resolved in LTR
- **THEN** physical values SHALL remain top/right/bottom/left and logical block-start/inline-end/block-end/inline-start SHALL map to top/right/bottom/left

#### Scenario: RTL changes logical edges only

- **WHEN** the same asymmetric physical safe areas are resolved in RTL
- **THEN** physical top/right/bottom/left SHALL remain unchanged while logical inline-start and inline-end SHALL map to physical right and left respectively

#### Scenario: Surface families share one update

- **WHEN** a canonical base safe-area value changes
- **THEN** canvas layout, floating surfaces, large surfaces, AppContent, toasts/status chrome, and JavaScript collision policy SHALL observe the same physical value without requiring independent variable mutation

#### Scenario: Editor-local bounds remain authoritative

- **WHEN** a constrained or embedded editor has nonzero safe areas
- **THEN** responsive shell and surface geometry SHALL remain inside that editor's container and SHALL NOT substitute browser-viewport dimensions

### Requirement: Named viewport reservations reject stale semantic measurements

Every cached named viewport reservation SHALL record its physical dock, normalized nonnegative offset, adapter, direction, presentation, and complete profile signature. Styles-panel, sidebar, and future named reservation paths SHALL use one shared creation/validation contract; invalid cached entries SHALL be deleted before deterministic fallback is applied.

#### Scenario: Rendered leaf refreshes its named reservation

- **WHEN** a measured `data-viewport-ui-name` leaf is rendered on a physical side with a positive offset
- **THEN** the cache SHALL store normalized geometry with the current semantic key while layout roots, rows, and zones remain unmarked

#### Scenario: Direction or dock changes invalidate cached geometry

- **WHEN** a hidden styles panel or sidebar is reserved after direction or its expected physical dock changes
- **THEN** a cache entry from the previous physical dock or direction SHALL be discarded and the current deterministic fallback SHALL be used

#### Scenario: Adapter or presentation changes invalidate cached geometry

- **WHEN** adapter, presentation, or any profile-signature field changes while a named surface is hidden
- **THEN** an entry measured under the previous profile SHALL be discarded even if its physical side happens to match

#### Scenario: Sidebar and styles panel follow the same validation

- **WHEN** hidden reservation is requested for either sidebar or styles panel in a non-phone profile
- **THEN** both names SHALL apply the same semantic freshness validation rather than leaving sidebar direction/profile state unchecked

#### Scenario: Phone does not reserve hidden desktop side surfaces

- **WHEN** the active profile selects the phone adapter
- **THEN** hidden desktop styles-panel and sidebar footprints SHALL NOT be reserved in the usable canvas viewport

### Requirement: Adapter transitions preserve domain ownership and state

The responsive shell SHALL route only presentation facts. Toolbar, property, CanvasUiLayout, sidebar, floating/large surface, AppContent, host, and collaboration adapters SHALL retain their existing inventory, actions, state, lifecycle, scroll, persistence, and timing ownership across profile and adapter changes.

#### Scenario: Tablet remains on the desktop adapter

- **WHEN** a container moves between desktop and tablet tiers without entering phone
- **THEN** the desktop adapter SHALL remain mounted as the real render path while presentation and compact/full policy update as specified

#### Scenario: Desktop and phone swap without stale DOM

- **WHEN** a positive container resize changes the resolved adapter between desktop and phone
- **THEN** stale controls from the previous adapter SHALL be removed and the current adapter SHALL render without duplicating actions, tunnels, sidebars, or viewport markers

#### Scenario: Domain state survives adapter changes

- **WHEN** an adapter transition occurs with a selected tool, property state, host preference, open domain surface, collaboration state, or active action
- **THEN** the continuing domain owner SHALL retain the valid state/action semantics and the responsive resolver SHALL NOT reset, copy, or take ownership of it

#### Scenario: AppContent remains internal

- **WHEN** the package public entry and responsive implementation are inspected
- **THEN** AppContent and the responsive shell module/profile/hook SHALL remain absent from the common and Excalidraw public barrels and SHALL NOT become public SDK or common-package exports
- **AND** the existing common `EditorInterface` and public `getEditorInterface` return contract SHALL remain unchanged

### Requirement: Memoized consumers receive fresh semantic context

Components that consume the responsive profile SHALL update through the existing context even when their explicit props are unchanged. The integration SHALL preserve `LayerUI`'s custom `React.memo` correctness without widening its props or comparator.

#### Scenario: Context bypasses unchanged LayerUI props

- **WHEN** direction, density, safe area, tier, adapter, presentation, orientation, or block state changes while compared `LayerUI` props remain referentially equal
- **THEN** profile-consuming content SHALL render the new semantic state through context

#### Scenario: Large and floating policies do not retain ad hoc direction

- **WHEN** direction changes at a fixed container size while a memoized surface policy is active
- **THEN** the policy SHALL recompute from the responsive profile and SHALL NOT retain a stale `document.documentElement.dir` read

#### Scenario: No shallow memo trap is added

- **WHEN** the integration is inspected
- **THEN** it SHALL add no caller-built profile object, hidden `LayerUIProps` field, or identity requirement that the custom comparator must know about

### Requirement: Responsive fallback preserves access and canvas interaction

At every supported container size, direction, density, and safe area, the shell SHALL keep all valid actions reachable through their owning adapter's overflow, wrap, scroll, overlay, sheet, or fullscreen behavior. It SHALL NOT enable whole-editor horizontal scrolling, reduce established touch/keyboard targets, or attach pointer/viewport authority to layout wrappers.

#### Scenario: Narrow editor has no whole-editor horizontal fallback

- **WHEN** a phone or constrained embed cannot display every surface or control inline
- **THEN** the owning adapter SHALL provide bounded internal overflow/presentation and editor root `scrollWidth` SHALL NOT exceed its client width because of shell chrome

#### Scenario: Touch and keyboard targets remain operable

- **WHEN** density changes between compact and touch
- **THEN** accessible names, roles, focus visibility, activation shortcuts, selected/expanded state, focus return, and at least the existing touch-target size SHALL remain available

#### Scenario: RTL preserves logical interaction order

- **WHEN** direction changes between LTR and RTL
- **THEN** start/end placement and logical navigation SHALL update without swapping physical safe-area inputs or making an action unreachable

#### Scenario: Empty canvas zones remain drawable

- **WHEN** a pointer gesture crosses an empty canvas-layout root, row, or zone area after a profile change
- **THEN** the canvas SHALL receive the gesture while real controls continue to honor `--ui-pointerEvents`

#### Scenario: Viewport measurement remains leaf-only

- **WHEN** responsive layout and reservation hooks are inspected
- **THEN** only actual occluding leaves SHALL carry `data-viewport-ui` or `data-viewport-ui-name`, and root, row, zone, and semantic-profile wrappers SHALL remain marker-neutral

#### Scenario: Adapter swap does not strand focus

- **WHEN** a resize removes the currently focused adapter DOM
- **THEN** the editor SHALL follow its existing focus lifecycle without synthesizing focus into an unrelated control or leaving a hidden focused element

### Requirement: Responsive state is isolated across multiple editors

Each App instance SHALL own its current profile, listener cleanup, container measurement, CSS safe-area read, and named-reservation cache. No responsive fact or cache entry SHALL leak through a module singleton or browser viewport assumption.

#### Scenario: Editors resolve different profiles concurrently

- **WHEN** two editors share a page with different container bounds, requested-language directions, safe areas, pointer latches, host form-factor policies, or dock breakpoints
- **THEN** each editor SHALL render and reserve geometry from only its own profile and container

#### Scenario: One editor unmounts while another remains

- **WHEN** one of multiple editors unmounts
- **THEN** its responsive listeners and cache SHALL be released without stopping observation or profile updates for the remaining editor

### Requirement: Narrow recovery fallback remains bounded

The `TopErrorBoundary` recovery surface SHALL remain usable in a narrow editor without changing its desktop 762px card width.

#### Scenario: Desktop recovery width is retained

- **WHEN** the recovery surface renders in a desktop container with sufficient space
- **THEN** its card SHALL retain the existing 762px desktop width

#### Scenario: Narrow recovery content remains reachable

- **WHEN** the same recovery surface renders in a container narrower than its desktop card
- **THEN** its frame and internal overflow SHALL remain container-bounded and all recovery content/actions SHALL remain reachable without whole-editor horizontal scrolling

### Requirement: Focused automated verification covers semantic boundaries

The change SHALL include focused tests for the pure resolver and live integrations. Tests SHALL exercise threshold neighbors, host overrides, invalid/zero/detached dimensions, container-only resize, fixed-size direction/input/safe-area refresh, profile identity, `LayerUI` context freshness, marker/pointer neutrality, named-reservation invalidation, adapter state preservation, listener cleanup, and multi-editor isolation.

#### Scenario: Pure resolver suite passes

- **WHEN** the focused resolver tests run
- **THEN** all profile fields, strict threshold neighbors, deterministic normalization, physical/logical projections, and signature/identity semantics SHALL match the specified contract

#### Scenario: Live integration suite passes

- **WHEN** the focused App, LayerUI, viewport, layout, and surface integration tests run
- **THEN** observer freshness, adapter routing, context updates, safe-area agreement, cache invalidation, pointer/marker neutrality, state ownership, cleanup, and multi-editor cases SHALL pass without changing public exports

#### Scenario: Build and type verification pass in repository order

- **WHEN** implementation verification is complete
- **THEN** the package build SHALL run before and pass ahead of root typecheck, and focused lint/format/UTF-8 checks SHALL report no new errors

### Requirement: Implementation and reviewer complete independent Chrome matrices

The implementer and a different reviewer SHALL each exercise the running editor through disposable real-Chrome targets using the same desktop, tablet, phone, and embedded acceptance matrix. Each SHALL record screenshots plus DOM, profile, safe-area, geometry, accessibility, pointer, scroll, reservation, overlay, and console evidence under the change evidence locations.

#### Scenario: Desktop and tablet matrix is clean

- **WHEN** each role inspects 1440×900 light/LTR and dark/RTL plus 1024×768, 768×1024, and 1180×700 representative states
- **THEN** adapter/profile hooks, selected tool/property UI, RTL Library/sidebar, compact property rail, AI/large surface, bounds, focus/ARIA, leaf reservations, and horizontal-scroll metrics SHALL match the contract

#### Scenario: Phone and embedded matrix is clean

- **WHEN** each role inspects 812×375 and 375×812 phone states plus a 640×480 dark RTL embed with asymmetric safe areas and open large content
- **THEN** phone/short-block routing, touch-latched or coarse density where supported, Library/Help content, canvas hit point, safe-area agreement, target size, bounded overflow, and scroll metrics SHALL match the contract

#### Scenario: Final reload and target cleanup are clean

- **WHEN** each role completes a hard reload of its final state
- **THEN** checker messages, visible error overlays, and error-level console entries SHALL each be zero
- **AND** the disposable target SHALL be closed and confirmed absent without stopping the shared proxy

### Requirement: Implementation stays internal, original, and scope-bounded

The change SHALL use project-authored code, tests, styles, and artifacts and SHALL remain limited to responsive-shell policy, its consumers, the narrow recovery overflow, and focused verification. It SHALL introduce no dependency, public export, generic capability-rule compiler, external store, second container observer/provider, new design token, new `!important`, copied source/selector/icon/font/asset, forbidden reference term, or final screenshot-regression infrastructure.

#### Scenario: Final scope audit is clean

- **WHEN** artifacts and the final implementation diff are audited before local delivery
- **THEN** restricted-content, originality, dependency, public-export, new-token, `!important`, whole-editor-scroll, target-shrinkage, and screenshot-infrastructure checks SHALL report zero prohibited additions
