## Context

The editor already has real desktop and phone render trees, a six-zone `CanvasUiLayout`, semantic floating/large/application surfaces, and one `EditorInterfaceContext`. `App` already measures its own container through a single `ResizeObserver`, respects `UIOptions.getFormFactor` and `dockedSidebarBreakpoint`, and supplies the context around `LayerUI`. Tablet currently and intentionally uses the desktop adapter.

Responsive policy is nevertheless distributed. `EditorInterface` exposes raw form factor, desktop mode, touch latch, sidebar fit, and landscape state; consumers derive presentation separately. Direction is read ad hoc from `document.documentElement.dir`, including a memoized Modal calculation that cannot refresh on a fixed-size direction change. Physical safe-area authority is repeated in `--sat`/`--sar`/`--sab`/`--sal`, floating-surface variables, large-surface variables, and direct `env()` reads in AppContent. `AppViewport` remembers named surface geometry by name and side only: the styles-panel path rejects one stale side, while the sidebar path has no direction/profile freshness check.

Real-Chrome reconnaissance confirms the current adapter boundary and the need for semantic rather than viewport-only policy: desktop at 1440×900; tablet/desktop at 1024×768, 768×1024, and 1180×700; phone at 375×812, 812×375, and the short 640×480 embed. The six zone wrappers are pointer-neutral, phone and desktop leaf reservations have no horizontal editor scroll, RTL changes physical placement, and large/floating content stays container-bounded. It also confirms that changing the base safe-area variables does not update the independently declared floating/large variables.

This change is the integration boundary after the delivered layout, toolbar, property, surface, and app-chrome children. It must centralize shell facts without absorbing the state, actions, inventory, or lifecycle those modules already own.

## Goals / Non-Goals

**Goals:**

- Provide one pure, deterministic resolver for semantic tier, real adapter, orientation, short-block state, density, presentation, direction, physical/logical safe areas, sidebar fit, and a stable profile signature.
- Deepen the existing editor-interface context and reuse App's sole container observer so common callers and memoized consumers receive fresh, deduplicated profile identity.
- Keep desktop and phone as real adapters, keep tablet on desktop, and preserve adapter/domain state through profile changes.
- Establish one physical safe-area authority with logical projections and make floating, large, app-content, layout, and viewport consumers agree.
- Make all named viewport reservations validate cached geometry against physical docking and the semantic profile.
- Specify deterministic accessibility, pointer, overflow, RTL, detach/zero-size, cleanup, and multi-editor behavior and verify it with focused tests and independent browser evidence.

**Non-Goals:**

- Replacing the desktop and phone render trees with a universal renderer, moving current zone contents, or changing toolbar/property/sidebar/application information architecture.
- Creating a generic capability-rule compiler, a responsive rule registry, an external store, a second context/provider, a second container `ResizeObserver`, or a public SDK API.
- Changing host form-factor or dock-breakpoint authority, public props, actions, shortcuts, collaboration protocols, persistence, or application data flows.
- Adding final screenshot-regression infrastructure, new dependencies, design tokens, copied assets/source, or `!important` overrides.
- Using whole-editor horizontal scrolling, smaller interaction targets, or clipped unreachable controls as responsive fallbacks.

## Decisions

### 1. Deepen `EditorInterface` with one exact semantic profile

Add one deep internal module under `packages/excalidraw/components/responsiveEditorShell/` with these types and resolver (names and field values are contractual for this change):

```ts
type PhysicalSafeAreaInsets = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

type ResponsiveEditorShellInput = Readonly<{
  width: number;
  height: number;
  formFactor: EditorInterface["formFactor"];
  desktopUIMode: EditorInterface["desktopUIMode"];
  canFitSidebar: boolean;
  direction: "ltr" | "rtl";
  isTouchScreen: boolean;
  hasCoarsePointer: boolean;
  safeArea: PhysicalSafeAreaInsets;
}>;

type ResponsiveEditorShellProfile = Readonly<{
  schemaVersion: 1;
  tier: "phone" | "tablet" | "desktop";
  adapter: "phone" | "desktop";
  orientation: "portrait" | "landscape";
  blockSize: "short" | "regular";
  density: "compact" | "touch";
  presentation: "mobile" | "compact" | "full";
  direction: "ltr" | "rtl";
  canFitSidebar: boolean;
  safeArea: Readonly<{
    physical: PhysicalSafeAreaInsets;
    logical: Readonly<{
      blockStart: number;
      inlineEnd: number;
      blockEnd: number;
      inlineStart: number;
    }>;
  }>;
  signature: string;
}>;

declare const resolveResponsiveEditorShell: (
  input: ResponsiveEditorShellInput,
) => ResponsiveEditorShellProfile;
```

App defines a private context value equivalent to `EditorInterface & Readonly<{ responsive: ResponsiveEditorShellProfile }>` and types its existing context/App field with that intersection. The common-package `EditorInterface`, common barrel, SDK types, and public `getEditorInterface` return contract remain unchanged; existing top-level fields stay compatibility projections and must agree with the resolver input/result. App exposes the deep internal `useResponsiveEditorShell()` as `useEditorInterface().responsive`; it adds no provider and no `LayerUI` prop. The internal module/hook remains absent from `packages/common/src/index.ts` and `packages/excalidraw/index.tsx`.

The resolver normalizes non-finite/negative dimensions and safe-area values to zero, removes negative zero, uses one documented numeric precision for safe-area signatures, and returns readonly nested values in a fixed field order. `tier` equals the already host-resolved form factor. Only phone selects the phone adapter. `orientation` is landscape only when width is greater than height. `blockSize` is short below the existing large-surface 520px block threshold. `density` is touch for phone, a latched touch/pen input, or a coarse primary pointer; otherwise it is compact. `presentation` is mobile for phone, compact for tablet, otherwise the existing desktop mode. Logical block edges always map top/bottom; inline start/end map left/right by direction. The signature includes schema version and every semantic result, including normalized physical safe areas, but not incidental object identity.

App reuses the previous profile object when the signature is unchanged. This gives context consumers immutable semantic identity without rerendering on raw observer noise. Threshold-neighbor tests lock strict comparisons for mobile landscape, phone width, tablet bounds, 520px short block, sidebar fit, and orientation equality.

**Deletion test:** deleting this deepened module would force tier, adapter, orientation, short-block, density, safe-area projection, logical routing, signature, and cache-normalization policy to be recreated across App, layout, surfaces, and viewport measurement. It is therefore a real boundary, not a renamed bag of flags.

Alternatives considered:

- **A standalone external responsive store:** rejected because App already owns the necessary container lifecycle and context. A second subscription graph would complicate multi-editor isolation and memo freshness.
- **A generic capability-rule compiler with caller-authored predicates:** rejected because it would turn domain-specific responsive facts into an untyped dumping ground and obscure ownership. The current problem has a small stable vocabulary and two real adapters.
- **More individual booleans on `LayerUIProps`:** rejected because it widens the custom memo comparator and distributes combination policy among renderers.

### 2. Keep one measurement authority and add explicit freshness triggers

App's existing editor-container `ResizeObserver` remains the sole container-size observer. Its callback reads one rect, resolves the host form factor, dock breakpoint, this App instance's requested language direction, coarse-pointer media query, touch latch, and canonical safe-area values, then runs the resolver and reconciles compatibility fields/styles-panel mode. Instance direction comes from the language metadata selected by that App's `langCode` and is projected onto/read from that editor root; responsive policy does not use `document.documentElement.dir` as its source of truth. A container-only resize must update the profile even when `window` does not resize.

Non-size semantic inputs refresh through their existing owners rather than a generic DOM observer:

- `updateLanguage()` resolves and records that App instance's requested language direction, updates the editor root direction, and refreshes the interface after `setLanguage()`, before the empty state update that renders consumers. This does not attempt to redesign the existing global translation catalog, but keeps responsive direction and geometry instance-local.
- The first canvas pen/touch pointer latches `isTouchScreen`, refreshes the profile immediately, and preserves the separate pen-mode behavior.
- App subscribes to the existing `(pointer: coarse)` `MediaQueryList` change event and cleans it up through the current removal emitter.
- Existing window resize plus an owner-window `visualViewport.resize` listener refresh safe areas even when the editor container size is fixed; the latter is registered only when available and is cleaned up with App.
- Canonical CSS safe-area aliases update CSS consumers directly; JavaScript policy consumers use the current profile values on the refresh/render path.

Detached or transient zero-sized containers do not force an adapter swap. App keeps the last valid positive container size/profile while still accepting direction, input, and safe-area changes. Before the first valid measurement, the existing deterministic desktop initial profile remains; the first positive measurement replaces it. Reattachment resumes through the same observer. There is no second observer, provider, global singleton, timer loop, or cross-editor cache.

### 3. Canonicalize physical safe areas, then project logical edges

The editor root's `--sat`, `--sar`, `--sab`, and `--sal` values are the only CSS/environment inputs. The profile reads these physical top/right/bottom/left values after deterministic pixel parsing. Floating and large surface variables become aliases of the base variables, and AppContent uses the same aliases instead of direct `env()` declarations. Existing variable names may remain as compatibility aliases, but they cannot independently read the environment.

Physical insets never mirror in RTL. Only the profile's `inlineStart` and `inlineEnd` projections swap. Surface placement may consume logical edges; actual collision/bounds math continues to receive physical top/right/bottom/left. Every surface stays inside the editor container, not the browser viewport.

| Direction | Physical left/right | Logical inline start/end | Expected placement effect |
| --- | --- | --- | --- |
| LTR | unchanged | left/right | start-owned UI docks physically left |
| RTL | unchanged | right/left | start-owned UI docks physically right |
| LTR → RTL at fixed size | unchanged | recomputed | logical routing and cache signature refresh; no inset swap |

### 4. Generalize named-reservation freshness

`AppViewport.uiLastMeasured` stores a normalized entry rather than `{ side, offset }` alone:

```ts
type NamedUIReservation = Readonly<{
  physicalDock: "left" | "right";
  offset: number;
  adapter: "phone" | "desktop";
  direction: "ltr" | "rtl";
  presentation: "mobile" | "compact" | "full";
  profileSignature: string;
}>;
```

One helper creates entries and one helper validates them for every `ViewportUIName`. Offsets normalize to finite nonnegative values at the same precision used by measurement. A cache hit is valid only when the expected physical dock and all semantic key fields match the current profile. Invalid entries are deleted before fallback selection. Styles panel and sidebar both use this path; adding a future named reservation requires the same key rather than bespoke validation. Phone still does not reserve hidden desktop side surfaces.

This deliberately keys physical dock separately from direction: direction can alter expected docking, but it never renames a measured physical side. Adapter/presentation/signature changes invalidate stale footprints even if the side happens to match. Rendered leaf measurements remain authoritative; layout rows/zones remain marker-neutral.

### 5. Preserve real adapters and domain ownership

`LayerUI` chooses its existing phone or desktop subtree from `profile.adapter`; tablet remains desktop. Adapter swaps remount only adapter presentation where already required and do not move domain state into the resolver. Context changes bypass the custom `React.memo` prop comparator as normal React context updates, so no new `LayerUIProps` field or comparator clause is needed.

| Concern | Continuing owner | Shell may provide | Shell must not own |
| --- | --- | --- | --- |
| Tool inventory and overflow | adaptive toolbar | adapter/density/bounds facts | item order, action effects, selected tool |
| Property controls | full/compact/mobile property adapters | presentation, direction, density | actions, picker state, open state |
| Canvas slots/pointer routing | `CanvasUiLayout` | adapter and safe-area projections | zone inventory or leaf markers |
| Sidebar | sidebar/large-surface adapters | fit, presentation, direction, safe area | lifecycle, docking preference, content |
| Floating/large surfaces | their policy/adapters | canonical profile facts | focus, modal claims, placement lifecycle, scroll |
| Application content | AppContent and domain adapters | density and safe-area inputs | data, actions, labels, async state |
| Viewport reservations | `AppViewport` | normalized semantic cache key | surface DOM ownership |
| Host/collaboration | existing App props/actions | fresh profile context | preference, timing, state, protocols |

AppContent remains deep/internal and absent from the public package entry.

Adapter-owned state, actions, host preference, multi-editor isolation, collaboration timing, and container bounds remain preserved.

### 6. Define deterministic boundary and overflow behavior

The expected default boundary matrix is:

| Container | Default tier / adapter | Presentation | Orientation / block | Notes |
| --- | --- | --- | --- | --- |
| 1440×900 | desktop / desktop | stored desktop mode | landscape / regular | full-width desktop baseline |
| 1180×700 | tablet / desktop | compact | landscape / regular | large surfaces may use sheet policy |
| 1024×768 | tablet / desktop | compact | landscape / regular | RTL sidebar can overlay physical left |
| 768×1024 | tablet / desktop | compact | portrait / regular | compact property rail remains adapter-owned |
| 812×375 | phone / phone | mobile | landscape / short | centered phone bottom stack remains bounded |
| 640×480 | phone / phone | mobile | landscape / short | constrained embed, safe areas remain local |
| 375×812 | phone / phone | mobile | portrait / regular | phone sidebar overlay may leave a canvas strip |
| detached or 0×0 after validity | retain prior | retain prior | retain prior size facts | semantic non-size inputs may still refresh |

`UIOptions.getFormFactor` may override the default tier at every positive size; only an explicit phone result chooses the phone adapter. `dockedSidebarBreakpoint` remains the authority for `canFitSidebar`. Width equality and threshold equality follow the existing strict breakpoint functions and receive neighbor tests rather than reinterpretation in CSS.

Input and overflow contracts are:

| Change at fixed container size | Required profile/result |
| --- | --- |
| fine pointer → coarse pointer | density becomes touch; interaction targets do not shrink |
| first pen/touch canvas input | touch latch becomes true; pen semantics remain separately owned |
| LTR ↔ RTL | logical edges, presentation consumers, and reservation keys refresh |
| base safe-area change | all surface families use the same new physical values |
| desktop ↔ phone adapter | domain state/actions remain; stale adapter DOM is removed |

When content cannot fit, the owning toolbar/surface/sidebar adapter uses its existing internal overflow, wrapping, scrolling, sheet, overlay, or fullscreen behavior. The shell never solves fit by enabling whole-editor horizontal scrolling, clipping the only route to an action, or reducing established keyboard/touch target sizes. Root/row/zone pointer neutrality and leaf-only `data-viewport-ui` markers remain unchanged.

### 7. Preserve accessibility and interaction contracts

Profile changes must not disturb focus, accessible names, roles, keyboard order, shortcuts, selected/expanded state, or focus return. A form-factor/adapter swap caused by container resize must place any newly rendered control into the existing logical order; it must not synthesize focus or strand focus in removed DOM. Open domain surfaces follow their current adapter lifecycle rather than being forcibly closed by the resolver.

RTL affects logical order/placement without changing physical safe-area values. Pointer-neutral canvas zones remain drawable; real controls continue to honor `--ui-pointerEvents`. Coarse/touch density keeps at least the existing touch target contract, while keyboard activation and focus visibility remain available in every tier. Multi-editor tests use different bounds, directions, input latches, and safe areas to prove no profile, observer, CSS read, or reservation cache leaks between instances.

The narrow TopErrorBoundary recovery overflow is fixed while retaining the desktop 762px card width.

### 8. Treat automated and independent Chrome evidence as gates

Resolver tests cover normalization and every threshold neighbor. App/integration tests cover host overrides, detach/zero/reattach, container resize without window resize, fixed-size language/direction, coarse/touch latch, visual-viewport/safe-area refresh, profile identity deduplication, LayerUI context freshness, adapter swaps, marker/pointer neutrality, named-reservation invalidation, and multi-editor cleanup/isolation. Existing surface policy tests are updated to accept the profile without losing their geometry cases.

The implementer and a different reviewer each use disposable real-Chrome targets through the existing local proxy. Each repeats the same acceptance matrix rather than reviewing screenshots only:

- 1440×900 desktop light/LTR and dark/RTL, including selected tool/property controls and one open surface.
- 1024×768 and 768×1024 tablet/desktop, including RTL Library/sidebar and compact property rail.
- 812×375 and 375×812 phone, including dark RTL, light LTR, open Library, and a real touch/pen or test-harness latch where supported.
- 640×480 dark RTL embed with nonzero asymmetric safe areas and Help/large content.
- 1180×700 light LTR embed with AI/large sheet content.

For every state, record adapter/profile hooks, physical/logical safe areas, relevant surface bounds, horizontal-scroll metrics, active-element/ARIA state, leaf reservation markers, one empty-canvas hit point, error overlays, and error-level console output. A final clean hard reload must have zero checker messages, visible error overlays, and error console entries. Tabs are closed and absence is confirmed; the shared proxy is not stopped.

## Risks / Trade-offs

- **[The semantic profile becomes another mutable flag bag]** → Keep the exact closed vocabulary, one pure resolver, readonly nested values, signature deduplication, and the deletion test; reject caller-authored rules.
- **[Transient zero sizes select phone and remount the adapter]** → Retain the last valid size-derived profile until a positive measurement, while allowing explicit non-size freshness.
- **[Context changes are missed behind `LayerUI` memoization]** → Consume the profile through the existing context and add a fixed-size context freshness regression; do not add a hidden prop.
- **[Safe-area aliases or parsing diverge]** → Read only base physical variables, share one normalizer, assert asymmetric values in LTR/RTL, and remove direct independent environment reads.
- **[Coarse-pointer subscription duplicates touch ownership]** → Treat coarse capability and the first actual touch/pen as OR inputs to density; preserve the existing touch latch and pen-mode state/actions.
- **[A cached sidebar/property offset survives a semantic transition]** → Validate every named entry by physical dock, adapter, direction, presentation, and profile signature and delete invalid entries before fallback.
- **[Frequent safe-area/profile reads cause render churn]** → Refresh only on existing explicit lifecycle events and reuse the prior profile object when its signature is unchanged.
- **[Multi-editor hosts receive cross-instance direction or geometry]** → Store profile and reservation caches on each App instance, read that instance's container styles, and clean per-instance listeners/observer work.
- **[An adapter swap closes or resets domain UI]** → Leave actions/open state with existing adapters, test representative selected tool/property/sidebar/modal/collaboration state across transitions, and fix only presentation wiring.
- **[Narrow content becomes unreachable]** → Require owner-level overflow/scroll/sheet/fullscreen behavior and browser-check scrollability, focus order, and target size; prohibit editor-wide horizontal scroll and target shrinkage.

## Migration Plan

1. Add the resolver, types, normalization, signature, and pure tests without changing consumers. **Cut line:** removable with no runtime effect.
2. Add `responsive` to the existing context value, initial profile, App refresh path, explicit non-size refresh/listener cleanup, and `useResponsiveEditorShell`; keep compatibility fields synchronized. **Cut line:** callers may still use the old projections while profile freshness is verified.
3. Switch adapter/presentation/common callers to the profile, update fixed-size direction/input behavior, and prove `LayerUI` context freshness without changing props. **Cut line:** each caller can temporarily revert to a synchronized compatibility projection.
4. Make base safe areas canonical, route floating/large/AppContent/layout consumers through physical or logical projections, and update policy tests. **Cut line:** compatibility alias names remain so CSS consumers can be rolled back independently.
5. Generalize named-reservation entries and migrate styles panel and sidebar together; add cache normalization/invalidation tests before removing bespoke validation. **Cut line:** the cache can fall back to current deterministic widths if remembered entries are disabled.
6. Apply the narrow TopErrorBoundary overflow correction, run focused tests, build/typecheck, and complete separate implementation/reviewer Chrome matrices and final audits.

Rollback is a normal revert of this child. There is no data, persisted-state, public API, or protocol migration. If a post-integration issue is isolated, reverse from step 5 toward step 2 at the cut lines while retaining the resolver/tests; do not introduce a second observer/store as a hotfix.

## Open Questions

- None blocking. Exact private helper filenames and test-file placement may follow neighboring conventions, but the resolver interface, profile vocabulary, single-observer/context architecture, cache key, ownership boundaries, matrices, and acceptance gates above are fixed.
