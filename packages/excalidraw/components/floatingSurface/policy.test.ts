import {
  fitFloatingSurfacePoint,
  readEditorSafeAreaInsets,
  resolveFloatingSurfaceAvailableBlockSize,
  resolveFloatingSurfacePolicy,
  resolveFloatingSurfaceInlineShift,
} from "./policy";

describe("floating surface policy", () => {
  it("reads the canonical base physical variables", () => {
    const editor = document.createElement("div");
    editor.style.setProperty("--sat", "7px");
    editor.style.setProperty("--sar", "13px");
    editor.style.setProperty("--sab", "17px");
    editor.style.setProperty("--sal", "23px");
    editor.style.setProperty("--floating-safe-area-top", "99px");

    expect(readEditorSafeAreaInsets(editor)).toEqual({
      top: 7,
      right: 13,
      bottom: 17,
      left: 23,
    });
  });

  it.each([
    ["main-menu-start-bottom", "ltr", "bottom", "start"],
    ["toolbar-up", "ltr", "top", "center"],
    ["phone-up", "rtl", "top", "center"],
    ["property-canvas-inward", "ltr", "left", "start"],
    ["property-canvas-inward", "rtl", "right", "start"],
    ["nested-submenu-inline", "ltr", "right", "start"],
    ["nested-submenu-inline", "rtl", "left", "start"],
    ["pointer-anchor", "rtl", "bottom", "start"],
  ] as const)(
    "resolves %s in %s to %s/%s",
    (intent, direction, side, align) => {
      expect(
        resolveFloatingSurfacePolicy({
          kind: "menu",
          intent,
          formFactor: "desktop",
          direction,
          pointerDensity: "fine",
          availableBlockSize: 900,
        }),
      ).toMatchObject({ side, align });
    },
  );

  it.each([
    ["desktop", "fine", "compact"],
    ["desktop", "coarse", "touch"],
    ["phone", "fine", "touch"],
    ["phone", "coarse", "touch"],
  ] as const)(
    "uses %s/%s density as %s",
    (formFactor, pointerDensity, density) => {
      expect(
        resolveFloatingSurfacePolicy({
          kind: "menu",
          intent: "main-menu-start-bottom",
          formFactor,
          direction: "ltr",
          pointerDensity,
          availableBlockSize: 400,
        }).density,
      ).toBe(density);
    },
  );

  it("subtracts physical safe areas and exact collision padding", () => {
    const policy = resolveFloatingSurfacePolicy({
      kind: "color-picker",
      intent: "phone-up",
      formFactor: "phone",
      direction: "ltr",
      pointerDensity: "coarse",
      collisionPadding: 8,
      safeArea: { top: 7, right: 6, bottom: 5, left: 4 },
      availableBlockSize: 320,
      measuredBlockSize: 290,
    });

    expect(policy.collisionPadding).toEqual({
      top: 15,
      right: 14,
      bottom: 13,
      left: 12,
    });
    expect(policy.maxBlockSize).toBe(292);
    expect(policy.shouldScroll).toBe(false);
    expect(
      { ...policy, shouldScroll: 293 > policy.maxBlockSize }.shouldScroll,
    ).toBe(true);
  });

  it("mirrors logical submenu chevrons", () => {
    const resolve = (direction: "ltr" | "rtl") =>
      resolveFloatingSurfacePolicy({
        kind: "submenu",
        intent: "nested-submenu-inline",
        formFactor: "desktop",
        direction,
        pointerDensity: "fine",
        availableBlockSize: 500,
      });

    expect(resolve("ltr").chevronDirection).toBe("inline-end");
    expect(resolve("rtl").chevronDirection).toBe("inline-start");
  });

  it.each([
    [{ left: 100, width: 200 }, 0],
    [{ left: 235, width: 209 }, -81],
    [{ left: -40, width: 209 }, 52],
  ] as const)(
    "fits a measured inline surface %o within its editor boundary",
    (surface, expectedShift) => {
      expect(
        resolveFloatingSurfaceInlineShift({
          boundary: { left: 0, right: 375 },
          surface,
          padding: { left: 12, right: 12 },
        }),
      ).toBe(expectedShift);
    },
  );

  it("budgets from the placed frame to the nearest persistent bottom UI", () => {
    expect(
      resolveFloatingSurfaceAvailableBlockSize({
        boundary: { top: 0, bottom: 812 },
        surfaceTop: 52,
        bottomReservationTop: 670,
        padding: { top: 8, bottom: 8 },
      }),
    ).toBe(610);
  });

  it("uses the editor edge and physical safe area without a reservation", () => {
    expect(
      resolveFloatingSurfaceAvailableBlockSize({
        boundary: { top: 100, bottom: 500 },
        surfaceTop: 90,
        padding: { top: 16, bottom: 28 },
      }),
    ).toBe(356);
  });

  it("preserves an exact reserved boundary fit", () => {
    expect(
      resolveFloatingSurfaceAvailableBlockSize({
        boundary: { top: 0, bottom: 400 },
        surfaceTop: 40,
        bottomReservationTop: 240,
        padding: { top: 8, bottom: 8 },
      }),
    ).toBe(192);
  });
});

describe("editor-local point fitting", () => {
  const editorSize = { width: 300, height: 200 };

  it("preserves an exact boundary fit", () => {
    expect(
      fitFloatingSurfacePoint({
        anchor: { x: 192, y: 92 },
        measuredSize: { width: 100, height: 100 },
        editorSize,
        direction: "ltr",
      }),
    ).toMatchObject({ left: 192, top: 92 });
  });

  it.each([
    [{ x: 298, y: 198 }, "ltr", 192, 92],
    [{ x: 2, y: 2 }, "ltr", 8, 8],
    [{ x: 2, y: 198 }, "rtl", 8, 92],
    [{ x: 298, y: 2 }, "rtl", 192, 8],
  ] as const)("fits edge anchor %o in %s", (anchor, direction, left, top) => {
    expect(
      fitFloatingSurfacePoint({
        anchor,
        measuredSize: { width: 100, height: 100 },
        editorSize,
        direction,
      }),
    ).toMatchObject({ left, top });
  });

  it("bounds oversized content and accounts for physical safe areas", () => {
    expect(
      fitFloatingSurfacePoint({
        anchor: { x: 150, y: 100 },
        measuredSize: { width: 500, height: 400 },
        editorSize,
        direction: "ltr",
        collisionPadding: 10,
        safeArea: { top: 20, right: 8, bottom: 6, left: 4 },
      }),
    ).toEqual({
      left: 14,
      top: 30,
      maxInlineSize: 268,
      maxBlockSize: 154,
      overflowInline: true,
      overflowBlock: true,
    });
  });

  it("recomputes against a resized editor", () => {
    const fit = (width: number) =>
      fitFloatingSurfacePoint({
        anchor: { x: 260, y: 20 },
        measuredSize: { width: 100, height: 80 },
        editorSize: { width, height: 200 },
        direction: "ltr",
      });

    expect(fit(300).left).toBe(192);
    expect(fit(220).left).toBe(112);
  });
});
