import clsx from "clsx";
import React from "react";

/**
 * Canonical size axis for the {@link Icon} adapter. Px values map to the
 * editor's icon sizing (a 1rem icon slot is `sm`); consumers pick a tier rather
 * than passing arbitrary numbers, so rendered icon sizes stay consistent.
 */
export type IconSize = "sm" | "md" | "lg";
/**
 * Canonical stroke-weight axis. The chrome set normalizes onto a single tier
 * (`medium`); the axis is exposed so later icons can opt into a lighter/heavier
 * weight without reintroducing per-icon ad-hoc values.
 */
export type IconWeight = "light" | "regular" | "medium" | "bold";

const ICON_SIZE_PX: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

const ICON_WEIGHT: Record<IconWeight, number> = {
  light: 1,
  regular: 1.25,
  medium: 1.5,
  bold: 2,
};

export interface IconProps {
  /** SVG path geometry. Rendering attributes (color/weight/viewBox) come from the adapter. */
  children: React.ReactNode;
  /** Native square coordinate space of the geometry. Defaults to 24 (the chrome family). */
  viewBox?: number;
  /** Rendered size tier. @default "md" */
  size?: IconSize;
  /** Stroke-weight tier. @default "medium" */
  weight?: IconWeight;
  /** Opt-in RTL mirroring (composes the existing `.rtl-mirror` rule under `.excalidraw`). */
  rtl?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Internal icon adapter that enforces a standardized rendering contract for the
 * redesign's chrome icons: `stroke="currentColor"` + `fill="none"` (outline
 * family), `aria-hidden="true"`, `focusable="false"`, a single canonical size
 * axis, a single canonical stroke-weight axis, a consistent square viewBox, and
 * opt-in RTL mirroring. Consumers pass only path geometry; the adapter owns
 * every rendering attribute so chrome icons read at a consistent weight/size.
 *
 * INTERNAL — does not mutate the legacy `createIcon` factory in `icons.tsx`;
 * the ~165 non-chrome icons continue to render through `createIcon` as before.
 */
export const Icon = ({
  children,
  viewBox = 24,
  size = "md",
  weight = "medium",
  rtl = false,
  className,
  style,
}: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={ICON_SIZE_PX[size]}
      height={ICON_SIZE_PX[size]}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_WEIGHT[weight]}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={clsx({ "rtl-mirror": rtl }, className)}
      style={style}
    >
      {children}
    </svg>
  );
};
