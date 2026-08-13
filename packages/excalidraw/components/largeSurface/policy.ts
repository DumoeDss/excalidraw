import type { EditorInterface } from "@excalidraw/common";

export type LargeSurfaceKind = "dialog" | "sheet" | "sidebar";
export type LargeSurfacePresentation =
  | "centered"
  | "fullscreen"
  | "sheet"
  | "docked"
  | "overlay";
export type LargeSurfaceSize = "small" | "regular" | "wide";
export type LargeSurfaceDirection = "ltr" | "rtl";

export type PhysicalSafeAreaInsets = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

export const EMPTY_LARGE_SURFACE_SAFE_AREA: PhysicalSafeAreaInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export type LargeSurfacePolicy = Readonly<{
  kind: LargeSurfaceKind;
  presentation: LargeSurfacePresentation;
  density: "compact" | "touch";
  inlineSize: number;
  maxInlineSize: number;
  maxBlockSize: number;
  inset: PhysicalSafeAreaInsets;
  logicalSide: "start" | "end" | "center";
  physicalSide: "left" | "right" | "center";
  scrollMode: "content";
  hasScrim: boolean;
  elevation: "flat" | "raised" | "modal";
}>;

const SIZE_WIDTH: Record<LargeSurfaceSize, number> = {
  small: 550,
  regular: 800,
  wide: 1024,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const resolveLargeSurfacePolicy = ({
  kind,
  presentation,
  size,
  requestedInlineSize,
  container,
  safeArea = EMPTY_LARGE_SURFACE_SAFE_AREA,
  formFactor,
  direction,
  coarsePointer,
  collisionPadding = 20,
}: {
  kind: LargeSurfaceKind;
  presentation: LargeSurfacePresentation;
  size: LargeSurfaceSize;
  requestedInlineSize?: number;
  container: Readonly<{ width: number; height: number }>;
  safeArea?: PhysicalSafeAreaInsets;
  formFactor: EditorInterface["formFactor"];
  direction: LargeSurfaceDirection;
  coarsePointer: boolean;
  collisionPadding?: number;
}): LargeSurfacePolicy => {
  const isPhone = formFactor === "phone";
  const isShort = container.height < 520;
  const resolvedPresentation =
    kind === "dialog" && isPhone
      ? "fullscreen"
      : kind === "dialog" &&
        presentation === "centered" &&
        (formFactor === "tablet" || isShort)
      ? "sheet"
      : presentation;
  const edgePresentation =
    resolvedPresentation === "fullscreen" ||
    resolvedPresentation === "docked" ||
    resolvedPresentation === "overlay";
  const inlinePadding = edgePresentation ? 0 : collisionPadding * 2;
  const blockPadding = edgePresentation ? 0 : collisionPadding * 2;
  const maxInlineSize = Math.max(
    0,
    container.width - safeArea.left - safeArea.right - inlinePadding,
  );
  const availableBlockSize = Math.max(
    0,
    container.height - safeArea.top - safeArea.bottom - blockPadding,
  );
  const maxBlockSize =
    resolvedPresentation === "centered"
      ? Math.min(760, availableBlockSize)
      : availableBlockSize;
  const targetInlineSize = requestedInlineSize ?? SIZE_WIDTH[size];
  const sidebarInlineSize = clamp(
    targetInlineSize,
    Math.min(240, maxInlineSize),
    Math.min(480, maxInlineSize),
  );
  const inlineSize =
    resolvedPresentation === "fullscreen"
      ? maxInlineSize
      : resolvedPresentation === "docked" || resolvedPresentation === "overlay"
      ? sidebarInlineSize
      : Math.min(targetInlineSize, maxInlineSize);
  const logicalSide =
    resolvedPresentation === "docked" || resolvedPresentation === "overlay"
      ? "end"
      : "center";

  return {
    kind,
    presentation: resolvedPresentation,
    density: isPhone || coarsePointer ? "touch" : "compact",
    inlineSize,
    maxInlineSize,
    maxBlockSize,
    inset: safeArea,
    logicalSide,
    physicalSide:
      logicalSide === "center"
        ? "center"
        : direction === "rtl"
        ? "left"
        : "right",
    scrollMode: "content",
    hasScrim: kind === "dialog",
    elevation:
      kind === "dialog"
        ? "modal"
        : resolvedPresentation === "docked"
        ? "flat"
        : "raised",
  };
};

const parseInset = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export const readLargeSurfaceSafeAreaInsets = (
  editor: Element | null,
): PhysicalSafeAreaInsets => {
  if (!editor || typeof getComputedStyle === "undefined") {
    return EMPTY_LARGE_SURFACE_SAFE_AREA;
  }
  const styles = getComputedStyle(editor);
  return {
    top: parseInset(styles.getPropertyValue("--sat")),
    right: parseInset(styles.getPropertyValue("--sar")),
    bottom: parseInset(styles.getPropertyValue("--sab")),
    left: parseInset(styles.getPropertyValue("--sal")),
  };
};
