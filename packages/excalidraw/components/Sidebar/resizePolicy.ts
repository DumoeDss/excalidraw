export const SIDEBAR_DEFAULT_INLINE_SIZE = 293;
export const SIDEBAR_MIN_INLINE_SIZE = 240;
export const SIDEBAR_MAX_INLINE_SIZE = 480;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const resolveSidebarResize = ({
  startInlineSize,
  startClientX,
  clientX,
  direction,
  availableInlineSize,
}: {
  startInlineSize: number;
  startClientX: number;
  clientX: number;
  direction: "ltr" | "rtl";
  availableInlineSize: number;
}) => {
  const delta =
    direction === "rtl" ? clientX - startClientX : startClientX - clientX;
  return clamp(
    startInlineSize + delta,
    Math.min(SIDEBAR_MIN_INLINE_SIZE, availableInlineSize),
    Math.min(SIDEBAR_MAX_INLINE_SIZE, availableInlineSize),
  );
};
