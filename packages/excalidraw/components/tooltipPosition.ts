import type { PhysicalSafeAreaInsets } from "./largeSurface";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const resolveTooltipPosition = ({
  editor,
  trigger,
  tooltip,
  safeArea,
  margin = 8,
}: {
  editor: Readonly<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>;
  trigger: Readonly<{
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
  }>;
  tooltip: Readonly<{ width: number; height: number }>;
  safeArea: PhysicalSafeAreaInsets;
  margin?: number;
}) => {
  const minLeft = safeArea.left + margin;
  const maxLeft = editor.width - safeArea.right - margin - tooltip.width;
  const preferredLeft =
    trigger.left - editor.left + trigger.width / 2 - tooltip.width / 2;
  const below = trigger.bottom - editor.top + margin;
  const above = trigger.top - editor.top - tooltip.height - margin;
  const maxBottom = editor.height - safeArea.bottom - margin;

  return {
    left: clamp(preferredLeft, minLeft, Math.max(minLeft, maxLeft)),
    top:
      below + tooltip.height <= maxBottom
        ? below
        : Math.max(safeArea.top + margin, above),
  };
};
