import {
  SIDEBAR_MAX_INLINE_SIZE,
  SIDEBAR_MIN_INLINE_SIZE,
  resolveSidebarResize,
} from "./resizePolicy";

describe("sidebar resize policy", () => {
  it("mirrors logical inline-start dragging in LTR and RTL", () => {
    expect(
      resolveSidebarResize({
        startInlineSize: 300,
        startClientX: 500,
        clientX: 460,
        direction: "ltr",
        availableInlineSize: 900,
      }),
    ).toBe(340);
    expect(
      resolveSidebarResize({
        startInlineSize: 300,
        startClientX: 500,
        clientX: 540,
        direction: "rtl",
        availableInlineSize: 900,
      }),
    ).toBe(340);
  });

  it("clamps to policy and the real container availability", () => {
    expect(
      resolveSidebarResize({
        startInlineSize: 300,
        startClientX: 500,
        clientX: 900,
        direction: "ltr",
        availableInlineSize: 900,
      }),
    ).toBe(SIDEBAR_MIN_INLINE_SIZE);
    expect(
      resolveSidebarResize({
        startInlineSize: 300,
        startClientX: 500,
        clientX: -500,
        direction: "ltr",
        availableInlineSize: 900,
      }),
    ).toBe(SIDEBAR_MAX_INLINE_SIZE);
    expect(
      resolveSidebarResize({
        startInlineSize: 300,
        startClientX: 500,
        clientX: -500,
        direction: "ltr",
        availableInlineSize: 360,
      }),
    ).toBe(360);
  });
});
