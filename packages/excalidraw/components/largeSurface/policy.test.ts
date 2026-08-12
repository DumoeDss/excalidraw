import { resolveLargeSurfacePolicy } from "./policy";

describe("large surface policy", () => {
  const base = {
    kind: "dialog" as const,
    presentation: "centered" as const,
    size: "regular" as const,
    container: { width: 1440, height: 900 },
    direction: "ltr" as const,
    formFactor: "desktop" as const,
    coarsePointer: false,
  };

  it("bounds centered desktop surfaces to the editor container", () => {
    expect(resolveLargeSurfacePolicy(base)).toMatchObject({
      presentation: "centered",
      inlineSize: 800,
      maxInlineSize: 1400,
      maxBlockSize: 760,
      density: "compact",
      hasScrim: true,
      scrollMode: "content",
    });
  });

  it.each([
    ["phone", { width: 375, height: 812 }, "fullscreen"],
    ["tablet", { width: 768, height: 1024 }, "sheet"],
    ["tablet", { width: 1024, height: 768 }, "sheet"],
    ["desktop", { width: 900, height: 420 }, "sheet"],
  ] as const)("adapts %s %o to %s", (formFactor, container, expected) => {
    expect(
      resolveLargeSurfacePolicy({ ...base, formFactor, container })
        .presentation,
    ).toBe(expected);
  });

  it("keeps physical safe areas fixed while logical edges mirror", () => {
    const safeArea = { top: 7, right: 13, bottom: 17, left: 23 };
    const resolve = (direction: "ltr" | "rtl") =>
      resolveLargeSurfacePolicy({
        ...base,
        kind: "sidebar",
        presentation: "overlay",
        direction,
        size: "small",
        requestedInlineSize: 300,
        safeArea,
      });

    expect(resolve("ltr")).toMatchObject({
      physicalSide: "right",
      inset: safeArea,
      inlineSize: 300,
      elevation: "raised",
      hasScrim: false,
    });
    expect(resolve("rtl")).toMatchObject({
      physicalSide: "left",
      inset: safeArea,
    });
  });

  it("uses touch density for a coarse pointer", () => {
    expect(
      resolveLargeSurfacePolicy({ ...base, coarsePointer: true }).density,
    ).toBe("touch");
  });
});
