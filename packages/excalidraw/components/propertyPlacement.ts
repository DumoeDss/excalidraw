export type PropertyDirection = "ltr" | "rtl";
export type PropertySurface = "full" | "compact" | "phone";
export type PropertyDock = "left" | "right" | "bottom";

export const resolvePropertyPlacement = ({
  formFactor,
  direction,
  surface,
  collisionBoundary,
}: {
  formFactor: "desktop" | "phone";
  isLandscape: boolean;
  direction: PropertyDirection;
  surface: PropertySurface;
  collisionBoundary: HTMLDivElement | null;
}) => {
  if (formFactor === "phone" || surface === "phone") {
    return {
      dock: "bottom" as const,
      popoverSide: "top" as const,
      popoverAlign: "center" as const,
      collisionBoundary,
      collisionPadding: 12,
    };
  }

  const dock = direction === "rtl" ? ("left" as const) : ("right" as const);
  return {
    dock,
    popoverSide: dock === "right" ? ("left" as const) : ("right" as const),
    popoverAlign: "start" as const,
    collisionBoundary,
    collisionPadding: 12,
  };
};

export const isPropertyMeasurementValid = (
  measuredSide: "left" | "right",
  currentDock: PropertyDock,
) => measuredSide === currentDock;

export const getStylesPanelFallback = (
  mode: "full" | "compact" | "mobile",
  direction: PropertyDirection,
) => ({
  side: direction === "rtl" ? ("left" as const) : ("right" as const),
  offset: mode === "full" ? 256 : 76,
});
