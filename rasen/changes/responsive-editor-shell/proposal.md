## Why

The redesigned editor now has coherent primitives, surfaces, application chrome, and real desktop/phone adapters, but responsive decisions are still split across container breakpoints, direction reads, input latches, safe-area variables, and viewport reservations. A single internal semantic shell contract is needed now so the remaining portfolio children can compose against container-local, fresh, deterministic behavior without duplicating policy or changing domain ownership.

## What Changes

- Introduce one immutable semantic responsive profile derived from editor-container bounds, host form-factor policy, orientation/short-block conditions, direction, input capability, and safe areas.
- Deepen the existing editor-interface context so memoized consumers receive one common profile while the existing editor-container observer remains the sole resize authority.
- Preserve the real desktop and phone adapters, with tablet continuing through the desktop adapter, and make adapter/density changes preserve toolbar, property, sidebar, surface, collaboration, and host-owned state and actions.
- Canonicalize physical safe-area inputs and expose logical projections without letting direction flip physical insets; keep floating, large, and application surfaces bounded to the editor container.
- Make named viewport reservations reject stale measurements when physical docking or the semantic profile changes, including the sidebar path.
- Define deterministic overflow, accessibility, keyboard, touch/pen, RTL, detach/zero-size, and multi-editor behavior without shrinking interaction targets or introducing whole-editor horizontal scrolling.
- Add focused resolver/integration coverage plus separate implementation and independent-review real-Chrome matrices across representative desktop, tablet, phone, embedded, theme, direction, input, safe-area, and surface states.
- Retain the narrow `TopErrorBoundary` recovery overflow fix while preserving its desktop 762px card width.

## Capabilities

### New Capabilities

- `responsive-editor-shell`: Container-local semantic responsiveness, adapter selection, density/orientation policy, canonical safe-area projections, and fresh named viewport reservations for the editor shell.

### Modified Capabilities

<!-- None. The existing generator-nodes capability is not changed. -->

## Impact

- Primary impact is internal to `packages/excalidraw`, especially the existing editor-interface model/context, `App` container measurement, LayerUI adapter routing, canvas UI layout, surface safe-area CSS, and viewport reservation validation.
- AppContent remains deep/internal and absent from the public package entry.
- Adapter-owned state, actions, host preference, multi-editor isolation, collaboration timing, and container bounds remain preserved.
- Public props/exports, host form-factor overrides, shortcuts, action protocols, collaboration protocols, and domain state ownership remain unchanged.
- No dependency, public export, generic capability-rule compiler, external store, copied source/CSS/selector/icon/font/asset, new design token, or new `!important` override is introduced.
