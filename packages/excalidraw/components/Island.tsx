import React from "react";
import clsx from "clsx";

import "./Island.scss";

import type { ViewportUIDock, ViewportUIName } from "../types";

type IslandProps = {
  children: React.ReactNode;
  padding?: number;
  className?: string | boolean;
  style?: object;
  /** marks the island as a canvas-occluding UI surface measured by
   * `getViewportOffsets` (see {@link ViewportUIDock}) */
  "data-viewport-ui"?: ViewportUIDock;
  /** identifies the surface so `getViewportOffsets` can reserve space for
   * it while hidden (see {@link ViewportUIName}) */
  "data-viewport-ui-name"?: ViewportUIName;
  "data-large-surface"?: boolean;
  "data-large-surface-kind"?: "dialog" | "sheet" | "sidebar";
  "data-large-surface-presentation"?:
    | "centered"
    | "fullscreen"
    | "sheet"
    | "docked"
    | "overlay";
  "data-large-surface-density"?: "compact" | "touch";
  "data-large-surface-elevation"?: "flat" | "raised" | "modal";
};

export const Island = React.forwardRef<HTMLDivElement, IslandProps>(
  (
    {
      children,
      padding,
      className,
      style,
      "data-viewport-ui": viewportUI,
      "data-viewport-ui-name": viewportUIName,
      "data-large-surface": largeSurface,
      "data-large-surface-kind": largeSurfaceKind,
      "data-large-surface-presentation": largeSurfacePresentation,
      "data-large-surface-density": largeSurfaceDensity,
      "data-large-surface-elevation": largeSurfaceElevation,
    },
    ref,
  ) => (
    <div
      className={clsx("Island", className)}
      style={{ "--padding": padding, ...style }}
      data-viewport-ui={viewportUI}
      data-viewport-ui-name={viewportUIName}
      data-large-surface={largeSurface || undefined}
      data-large-surface-kind={largeSurfaceKind}
      data-large-surface-presentation={largeSurfacePresentation}
      data-large-surface-density={largeSurfaceDensity}
      data-large-surface-elevation={largeSurfaceElevation}
      ref={ref}
    >
      {children}
    </div>
  ),
);
