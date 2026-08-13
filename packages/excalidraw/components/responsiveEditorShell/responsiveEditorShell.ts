import type { EditorInterface } from "@excalidraw/common";

export type PhysicalSafeAreaInsets = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

export type ResponsiveEditorShellInput = Readonly<{
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

export type ResponsiveEditorShellProfile = Readonly<{
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

const SIGNATURE_PRECISION = 3;

const normalizeDimension = (value: number) =>
  Number.isFinite(value) && value > 0 ? value : 0;

// Browser-computed safe areas are pixel values. Canonicalizing to 1/1000px
// makes signatures stable across insignificant layout-engine float noise.
const normalizeInset = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Number(value.toFixed(SIGNATURE_PRECISION));
};

const readInset = (styles: CSSStyleDeclaration, property: string) =>
  normalizeInset(Number.parseFloat(styles.getPropertyValue(property)));

export const readResponsiveEditorSafeArea = (
  editor: Element | null,
): PhysicalSafeAreaInsets => {
  if (!editor || typeof getComputedStyle === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const styles = getComputedStyle(editor);
  return {
    top: readInset(styles, "--sat"),
    right: readInset(styles, "--sar"),
    bottom: readInset(styles, "--sab"),
    left: readInset(styles, "--sal"),
  };
};

export const resolveResponsiveEditorShell = (
  input: ResponsiveEditorShellInput,
): ResponsiveEditorShellProfile => {
  const width = normalizeDimension(input.width);
  const height = normalizeDimension(input.height);
  const tier = input.formFactor;
  const adapter = tier === "phone" ? "phone" : "desktop";
  const orientation = width > height ? "landscape" : "portrait";
  const blockSize = height < 520 ? "short" : "regular";
  const density =
    tier === "phone" || input.isTouchScreen || input.hasCoarsePointer
      ? "touch"
      : "compact";
  const presentation =
    tier === "phone"
      ? "mobile"
      : tier === "tablet"
      ? "compact"
      : input.desktopUIMode;
  const direction = input.direction;
  const canFitSidebar = input.canFitSidebar;
  const physical = Object.freeze({
    top: normalizeInset(input.safeArea.top),
    right: normalizeInset(input.safeArea.right),
    bottom: normalizeInset(input.safeArea.bottom),
    left: normalizeInset(input.safeArea.left),
  });
  const logical = Object.freeze({
    blockStart: physical.top,
    inlineEnd: direction === "rtl" ? physical.left : physical.right,
    blockEnd: physical.bottom,
    inlineStart: direction === "rtl" ? physical.right : physical.left,
  });
  const safeArea = Object.freeze({ physical, logical });
  const signature = JSON.stringify([
    1,
    tier,
    adapter,
    orientation,
    blockSize,
    density,
    presentation,
    direction,
    canFitSidebar,
    physical.top,
    physical.right,
    physical.bottom,
    physical.left,
    logical.blockStart,
    logical.inlineEnd,
    logical.blockEnd,
    logical.inlineStart,
  ]);

  return Object.freeze({
    schemaVersion: 1,
    tier,
    adapter,
    orientation,
    blockSize,
    density,
    presentation,
    direction,
    canFitSidebar,
    safeArea,
    signature,
  });
};
