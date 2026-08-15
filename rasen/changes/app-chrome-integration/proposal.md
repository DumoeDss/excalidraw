## Why

The editor surfaces are now visually coherent, but application-owned content still arrives through separate welcome, sharing, collaboration, AI, Library, promo, loading, error, and host paths with unrelated section hierarchy, action grouping, state presentation, and container assumptions. This dependent child integrates that application chrome with the delivered surface language before responsive-shell policy is hardened, while preserving every application workflow and host contract.

## What Changes

- Add one internal app-content section layer that owns reusable section hierarchy, spacing, action groups, empty/loading/error chrome, application-content density, bounded container framing, and a small semantic state vocabulary.
- Adapt welcome/hero actions, sharing and collaboration content, AI content, Library content, promo/application islands, generic loading and recoverable error states, and host-rendered content through explicit semantic adapters rather than a universal renderer.
- Bring application chrome onto the delivered `--ui-*`, button/icon, `floatingSurface`, and `largeSurface` seams while preserving current information architecture, labels, roles, actions, shortcuts, async ownership, and data flows.
- Make container bounds and physical safe areas authoritative for application-content geometry, including AI and other host-provided content that currently relies on browser-viewport units.
- Preserve all application and SDK integration contracts: `renderTopRightUI`, host children and tunnels, fallback preference, LayerUI freshness, Library install/load/search, sharing/collaboration reachability, AI callbacks and persistence, alerts, and recovery surfaces.
- Add focused automated coverage and separate implementation/reviewer real-Chrome evidence at desktop and narrow container sizes in light and dark themes.
- Leave portfolio-wide container tier policy to `responsive-editor-shell` and screenshot-regression infrastructure to `visual-regression-hardening`.

## Capabilities

### New Capabilities

- `app-chrome-integration`: Semantic app-content sections and behavior-preserving adapters for welcome, sharing/collaboration, AI, Library, promo, loading/error/fallback, and host-provided application chrome.

### Modified Capabilities

<!-- None. The existing generator-nodes capability is not changed. -->

## Impact

- Primary ownership is under `packages/excalidraw/components/` and `excalidraw-app/`, especially LayerUI/host fallback composition, welcome, ShareDialog/collaboration surfaces, TTD/AI content, DefaultSidebar/Library, application promo/sidebar content, loading and recoverable error presentation, and focused tests.
- The new deep module is internal and is not exported from `packages/excalidraw/index.tsx`; public render props, compound component APIs, tunnels, actions, shortcuts, persistence, and data protocols remain unchanged.
- Existing `floatingSurface` and `largeSurface` semantic seams remain authoritative for floating and large-surface framing. The new layer owns content sections inside or alongside those frames, not a third competing geometry system.
- No dependency, public API, copied source/CSS/selector/icon/font/asset, new design token, or new `!important` override is introduced.
- Runtime behavior is intentionally preserved; the visible change is coherent application-content presentation and container-bounded layout across the named surfaces.
