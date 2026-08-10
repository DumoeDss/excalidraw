import {
  isPropertyMeasurementValid,
  resolvePropertyPlacement,
} from "./propertyPlacement";

describe("property placement", () => {
  it.each([
    ["ltr", "full", "right", "left"],
    ["ltr", "compact", "right", "left"],
    ["rtl", "full", "left", "right"],
    ["rtl", "compact", "left", "right"],
  ] as const)(
    "docks %s %s at logical inline-end and opens inward",
    (direction, surface, dock, popoverSide) => {
      const boundary = { id: "editor" } as unknown as HTMLDivElement;
      expect(
        resolvePropertyPlacement({
          formFactor: "desktop",
          isLandscape: false,
          direction,
          surface,
          collisionBoundary: boundary,
        }),
      ).toEqual({
        dock,
        popoverSide,
        popoverAlign: "start",
        collisionBoundary: boundary,
        collisionPadding: 12,
      });
    },
  );

  it("places phone content above its anchor in portrait and landscape", () => {
    for (const isLandscape of [false, true]) {
      expect(
        resolvePropertyPlacement({
          formFactor: "phone",
          isLandscape,
          direction: "rtl",
          surface: "phone",
          collisionBoundary: null,
        }),
      ).toMatchObject({
        dock: "bottom",
        popoverSide: "top",
        popoverAlign: "center",
      });
    }
  });

  it("rejects cached geometry from the old physical side", () => {
    expect(isPropertyMeasurementValid("right", "right")).toBe(true);
    expect(isPropertyMeasurementValid("left", "right")).toBe(false);
    expect(isPropertyMeasurementValid("right", "bottom")).toBe(false);
  });
});
