export type FloatingSurfaceKind =
  | "menu"
  | "main-menu"
  | "toolbar-menu"
  | "submenu"
  | "context-menu"
  | "property-popover"
  | "color-picker"
  | "font-picker"
  | "icon-picker";

export type FloatingSurfacePlacementIntent =
  | "main-menu-start-bottom"
  | "toolbar-up"
  | "property-canvas-inward"
  | "phone-up"
  | "pointer-anchor"
  | "nested-submenu-inline";

export type FloatingSurfaceDensity = "compact" | "touch";
export type FloatingSurfaceDirection = "ltr" | "rtl";
export type FloatingSurfaceSide = "top" | "right" | "bottom" | "left";
export type FloatingSurfaceAlign = "start" | "center" | "end";

export type PhysicalSafeAreaInsets = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

export const EMPTY_SAFE_AREA: PhysicalSafeAreaInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export type FloatingSurfacePolicy = Readonly<{
  kind: FloatingSurfaceKind;
  density: FloatingSurfaceDensity;
  side: FloatingSurfaceSide;
  align: FloatingSurfaceAlign;
  collisionPadding: PhysicalSafeAreaInsets;
  maxBlockSize: number;
  shouldScroll: boolean;
  chevronDirection: "inline-start" | "inline-end";
}>;

const resolveSideAndAlign = (
  intent: FloatingSurfacePlacementIntent,
  direction: FloatingSurfaceDirection,
): Pick<FloatingSurfacePolicy, "side" | "align"> => {
  switch (intent) {
    case "toolbar-up":
    case "phone-up":
      return { side: "top", align: "center" };
    case "property-canvas-inward":
      return {
        side: direction === "rtl" ? "right" : "left",
        align: "start",
      };
    case "nested-submenu-inline":
      return {
        side: direction === "rtl" ? "left" : "right",
        align: "start",
      };
    case "pointer-anchor":
    case "main-menu-start-bottom":
    default:
      return { side: "bottom", align: "start" };
  }
};

export const resolveFloatingSurfacePolicy = ({
  kind,
  intent,
  formFactor,
  direction,
  pointerDensity,
  collisionPadding = 8,
  safeArea = EMPTY_SAFE_AREA,
  availableBlockSize,
  measuredBlockSize = 0,
}: {
  kind: FloatingSurfaceKind;
  intent: FloatingSurfacePlacementIntent;
  formFactor: "desktop" | "phone";
  direction: FloatingSurfaceDirection;
  pointerDensity: "fine" | "coarse";
  collisionPadding?: number;
  safeArea?: PhysicalSafeAreaInsets;
  availableBlockSize: number;
  measuredBlockSize?: number;
}): FloatingSurfacePolicy => {
  const resolvedPadding = {
    top: collisionPadding + safeArea.top,
    right: collisionPadding + safeArea.right,
    bottom: collisionPadding + safeArea.bottom,
    left: collisionPadding + safeArea.left,
  };
  const maxBlockSize = Math.max(
    0,
    availableBlockSize - resolvedPadding.top - resolvedPadding.bottom,
  );

  return {
    kind,
    density:
      formFactor === "phone" || pointerDensity === "coarse"
        ? "touch"
        : "compact",
    ...resolveSideAndAlign(intent, direction),
    collisionPadding: resolvedPadding,
    maxBlockSize,
    shouldScroll: measuredBlockSize > maxBlockSize,
    chevronDirection:
      intent === "nested-submenu-inline" && direction === "rtl"
        ? "inline-start"
        : "inline-end",
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const resolveFloatingSurfaceInlineShift = ({
  boundary,
  surface,
  padding = EMPTY_SAFE_AREA,
}: {
  boundary: Readonly<{ left: number; right: number }>;
  surface: Readonly<{ left: number; width: number }>;
  padding?: Pick<PhysicalSafeAreaInsets, "left" | "right">;
}) => {
  const minLeft = boundary.left + padding.left;
  const maxRight = boundary.right - padding.right;
  const fittedWidth = Math.min(surface.width, Math.max(0, maxRight - minLeft));
  const fittedLeft = clamp(surface.left, minLeft, maxRight - fittedWidth);

  return fittedLeft - surface.left;
};

/**
 * Resolves the block-size that remains below an already-positioned surface.
 * A persistent bottom UI reservation, when present, becomes the effective
 * block end so transient surfaces preserve the editor controls and canvas
 * context beneath them.
 */
export const resolveFloatingSurfaceAvailableBlockSize = ({
  boundary,
  surfaceTop,
  bottomReservationTop,
  padding = EMPTY_SAFE_AREA,
}: {
  boundary: Readonly<{ top: number; bottom: number }>;
  surfaceTop: number;
  bottomReservationTop?: number;
  padding?: Pick<PhysicalSafeAreaInsets, "top" | "bottom">;
}) => {
  const blockStart = Math.max(surfaceTop, boundary.top + padding.top);
  const reservedBlockEnd =
    bottomReservationTop === undefined
      ? boundary.bottom
      : Math.min(boundary.bottom, bottomReservationTop);
  const blockEnd = reservedBlockEnd - padding.bottom;

  return Math.max(0, blockEnd - blockStart);
};

export type EditorLocalPointFit = Readonly<{
  left: number;
  top: number;
  maxInlineSize: number;
  maxBlockSize: number;
  overflowInline: boolean;
  overflowBlock: boolean;
}>;

/**
 * Fits a measured point-anchored surface in editor-local coordinates. The
 * caller remains responsible for action semantics and re-runs this function
 * when either the frame or owning editor container is resized.
 */
export const fitFloatingSurfacePoint = ({
  anchor,
  measuredSize,
  editorSize,
  direction,
  collisionPadding = 8,
  safeArea = EMPTY_SAFE_AREA,
}: {
  anchor: Readonly<{ x: number; y: number }>;
  measuredSize: Readonly<{ width: number; height: number }>;
  editorSize: Readonly<{ width: number; height: number }>;
  direction: FloatingSurfaceDirection;
  collisionPadding?: number;
  safeArea?: PhysicalSafeAreaInsets;
}): EditorLocalPointFit => {
  const minLeft = collisionPadding + safeArea.left;
  const minTop = collisionPadding + safeArea.top;
  const maxInlineSize = Math.max(
    0,
    editorSize.width - minLeft - collisionPadding - safeArea.right,
  );
  const maxBlockSize = Math.max(
    0,
    editorSize.height - minTop - collisionPadding - safeArea.bottom,
  );
  const width = Math.min(measuredSize.width, maxInlineSize);
  const height = Math.min(measuredSize.height, maxBlockSize);
  const preferredLeft =
    direction === "rtl" ? anchor.x - measuredSize.width : anchor.x;

  return {
    left: clamp(
      preferredLeft,
      minLeft,
      editorSize.width - collisionPadding - safeArea.right - width,
    ),
    top: clamp(
      anchor.y,
      minTop,
      editorSize.height - collisionPadding - safeArea.bottom - height,
    ),
    maxInlineSize,
    maxBlockSize,
    overflowInline: measuredSize.width > maxInlineSize,
    overflowBlock: measuredSize.height > maxBlockSize,
  };
};

const parseInset = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export const readEditorSafeAreaInsets = (
  editor: Element | null,
): PhysicalSafeAreaInsets => {
  if (!editor || typeof getComputedStyle === "undefined") {
    return EMPTY_SAFE_AREA;
  }
  const styles = getComputedStyle(editor);
  return {
    top: parseInset(styles.getPropertyValue("--floating-safe-area-top")),
    right: parseInset(styles.getPropertyValue("--floating-safe-area-right")),
    bottom: parseInset(styles.getPropertyValue("--floating-safe-area-bottom")),
    left: parseInset(styles.getPropertyValue("--floating-safe-area-left")),
  };
};
