// =============================================================================
// primitives/chrome-icons.tsx — Normalized high-frequency CHROME icon set.
//
// Each icon is re-authored through the <Icon> adapter (see Icon.tsx) with a
// SINGLE viewBox family (0 0 24 24) and a SINGLE stroke-weight tier ("medium" =
// 1.5), enforcing `currentColor`, `aria-hidden`, `focusable=false`, and opt-in
// RTL mirroring. The path GEOMETRY of every icon is preserved EXACTLY from its
// original definition in components/icons.tsx — only the rendering contract
// (viewBox, stroke-weight wrapper, color) is normalized. Per-element
// `strokeWidth` wrappers are dropped (the adapter owns weight); functional
// `stroke="none"`/`fill="none"` background hints are kept verbatim.
//
// Exports KEEP their original names so call sites swap only the import source
// (`../icons` → `../primitives/chrome-icons`), never the identifier. The legacy
// `createIcon` factory and the ~165 non-chrome icons in icons.tsx are untouched.
//
// Chosen set (15) — highest-frequency editor CHROME by prominence + import
// frequency, all native 24-unit stroke-icon geometry (viewBox 0 0 24 24):
//   • menu / navigation: HamburgerMenuIcon, sidebarRightIcon
//   • overflow / more:   DotsIcon (vertical), DotsHorizontalIcon
//   • disclosure:        chevronDownIcon, chevronRight, chevronLeftIcon
//   • add / clipboard:   PlusIcon, copyIcon, cutIcon
//   • canvas actions:    PinIcon, ZoomResetIcon
//   • help / settings:   HelpIcon, settingsIcon
//   • feedback:          messageCircleIcon
//
// RTL note: the adapter supports opt-in mirroring (`rtl` prop). These icons
// preserve each original's mirror setting (none had `mirror: true`), so the
// swap stays purely presentational; directional icons can opt into mirroring in
// a follow-up without touching geometry.
// =============================================================================

import { Icon } from "./Icon";

// All chrome icons share this single rendering configuration.
const CHROME = { viewBox: 24, size: "md", weight: "medium" } as const;

const BG = <path stroke="none" d="M0 0h24v24H0z" fill="none" />;

// --- menu / navigation -------------------------------------------------------

// main-menu trigger (hamburger).
export const HamburgerMenuIcon = (
  <Icon {...CHROME}>
    {BG}
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </Icon>
);

// sidebar (right) toggle.
export const sidebarRightIcon = (
  <Icon {...CHROME}>
    {BG}
    <path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
    <path d="M15 4l0 16" />
  </Icon>
);

// --- overflow / more ---------------------------------------------------------

// vertical "more" affordance.
export const DotsIcon = (
  <Icon {...CHROME}>
    {BG}
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
    <circle cx="12" cy="5" r="1" />
  </Icon>
);

// horizontal "more" affordance.
export const DotsHorizontalIcon = (
  <Icon {...CHROME}>
    {BG}
    <path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    <path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
  </Icon>
);

// --- disclosure (chevrons) ---------------------------------------------------

// chevron pointing down (dropdowns / expand).
export const chevronDownIcon = (
  <Icon {...CHROME}>
    {BG}
    <polyline points="6 9 12 15 18 9" />
  </Icon>
);

// chevron pointing right (forward / submenu).
export const chevronRight = (
  <Icon {...CHROME}>
    {BG}
    <polyline points="9 6 15 12 9 18" />
  </Icon>
);

// chevron pointing left (back).
export const chevronLeftIcon = (
  <Icon {...CHROME}>
    {BG}
    <path d="M11 7l-5 5l5 5" />
    <path d="M17 7l-5 5l5 5" />
  </Icon>
);

// --- add / clipboard ---------------------------------------------------------

// plus / add.
export const PlusIcon = (
  <Icon {...CHROME}>
    {BG}
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);

// copy.
export const copyIcon = (
  <Icon {...CHROME}>
    {BG}
    <path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" />
    <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
);

// cut.
export const cutIcon = (
  <Icon {...CHROME}>
    {BG}
    <path d="M7 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M17 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M9.15 14.85l8.85 -10.85" />
    <path d="M6 4l8.85 10.85" />
  </Icon>
);

// --- canvas actions ----------------------------------------------------------

// pin.
export const PinIcon = (
  <Icon {...CHROME}>
    {BG}
    <path d="M9 4v6l-2 4v2h10v-2l-2 -4v-6" />
    <line x1="12" y1="16" x2="12" y2="21" />
    <line x1="8" y1="4" x2="16" y2="4" />
  </Icon>
);

// zoom reset (magnifier + reset arrow).
export const ZoomResetIcon = (
  <Icon {...CHROME}>
    {BG}
    <path d="M21 21l-6 -6" />
    <path d="M3.268 12.043a7.017 7.017 0 0 0 6.634 4.957a7.012 7.012 0 0 0 7.043 -6.131a7 7 0 0 0 -5.314 -7.672a7.021 7.021 0 0 0 -8.241 4.403" />
    <path d="M3 4v4h4" />
  </Icon>
);

// --- help / settings ---------------------------------------------------------

// help (question in circle).
export const HelpIcon = (
  <Icon {...CHROME}>
    {BG}
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="17" x2="12" y2="17.01" />
    <path d="M12 13.5a1.5 1.5 0 0 1 1 -1.5a2.6 2.6 0 1 0 -3 -4" />
  </Icon>
);

// settings (adjustments-horizontal).
export const settingsIcon = (
  <Icon {...CHROME}>
    {BG}
    <path d="M14 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M4 6l8 0" />
    <path d="M16 6l4 0" />
    <path d="M8 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M4 12l2 0" />
    <path d="M10 12l10 0" />
    <path d="M17 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M4 18l11 0" />
    <path d="M19 18l1 0" />
  </Icon>
);

// --- feedback ----------------------------------------------------------------

// message / chat circle.
export const messageCircleIcon = (
  <Icon {...CHROME}>
    {BG}
    <path d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1" />
  </Icon>
);
