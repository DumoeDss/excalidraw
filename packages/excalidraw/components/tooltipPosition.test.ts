import { resolveTooltipPosition } from "./tooltipPosition";

describe("tooltip position", () => {
  const editor = { left: 100, top: 50, width: 375, height: 300 };
  const safeArea = { top: 10, right: 20, bottom: 30, left: 40 };
  const tooltip = { width: 100, height: 50 };

  it.each([
    [{ left: 102, right: 142, top: 60, bottom: 90, width: 40 }, 48, 48],
    [{ left: 440, right: 470, top: 60, bottom: 90, width: 30 }, 247, 48],
    [{ left: 250, right: 290, top: 310, bottom: 340, width: 40 }, 120, 202],
  ] as const)("fits edge trigger %o", (trigger, left, top) => {
    expect(
      resolveTooltipPosition({ editor, trigger, tooltip, safeArea }),
    ).toEqual({ left, top });
  });
});
