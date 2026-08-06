// primitives/index.ts — INTERNAL UI primitive barrel for the editor redesign.
//
// Re-exports the unified primitives introduced by the redesign. These are NOT
// re-exported from the package's public entry (packages/excalidraw/index.tsx):
// the layer is internal, consumed only within @excalidraw/excalidraw, and
// adopted gradually surface-by-surface. See ./README.md for the conventions
// (state model, focus-visible, token consumption, internal-only boundary).

export { UiButton } from "./UiButton";
export type { UiButtonProps, UiButtonVariant, UiButtonSize } from "./UiButton";

export { Icon } from "./Icon";
export type { IconProps, IconSize, IconWeight } from "./Icon";

export * from "./chrome-icons";
