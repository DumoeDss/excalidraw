import {
  MQ_MAX_HEIGHT_LANDSCAPE,
  MQ_MAX_MOBILE,
  MQ_MAX_TABLET,
  MQ_MAX_WIDTH_LANDSCAPE,
  MQ_MIN_TABLET,
  getFormFactor,
  type EditorInterface,
} from "@excalidraw/common";

import {
  resolveResponsiveEditorShell,
  type ResponsiveEditorShellInput,
} from "./responsiveEditorShell";

const input = (
  overrides: Partial<ResponsiveEditorShellInput> = {},
): ResponsiveEditorShellInput => ({
  width: 1440,
  height: 900,
  formFactor: "desktop",
  desktopUIMode: "full",
  canFitSidebar: true,
  direction: "ltr",
  isTouchScreen: false,
  hasCoarsePointer: false,
  safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  ...overrides,
});

const profileForDimensions = (
  width: number,
  height: number,
  overrides: Partial<ResponsiveEditorShellInput> = {},
) =>
  resolveResponsiveEditorShell(
    input({
      width,
      height,
      formFactor: getFormFactor(width, height),
      ...overrides,
    }),
  );

describe("resolveResponsiveEditorShell", () => {
  it.each([
    [1440, 900, "desktop", "desktop", "full", "landscape", "regular"],
    [1180, 700, "tablet", "desktop", "compact", "landscape", "regular"],
    [1024, 768, "tablet", "desktop", "compact", "landscape", "regular"],
    [768, 1024, "tablet", "desktop", "compact", "portrait", "regular"],
    [812, 375, "phone", "phone", "mobile", "landscape", "short"],
    [640, 480, "phone", "phone", "mobile", "landscape", "short"],
    [375, 812, "phone", "phone", "mobile", "portrait", "regular"],
  ] as const)(
    "resolves %sx%s as the expected semantic profile",
    (width, height, tier, adapter, presentation, orientation, blockSize) => {
      const profile = profileForDimensions(width, height);

      expect(profile).toMatchObject({
        schemaVersion: 1,
        tier,
        adapter,
        presentation,
        orientation,
        blockSize,
        density: tier === "phone" ? "touch" : "compact",
      });
    },
  );

  it.each([
    [MQ_MAX_MOBILE - 1, 800, "phone"],
    [MQ_MAX_MOBILE, 800, "phone"],
    [MQ_MAX_MOBILE + 1, 800, "tablet"],
    [MQ_MAX_WIDTH_LANDSCAPE - 1, MQ_MAX_HEIGHT_LANDSCAPE - 1, "phone"],
    [MQ_MAX_WIDTH_LANDSCAPE, MQ_MAX_HEIGHT_LANDSCAPE - 1, "desktop"],
    [MQ_MAX_WIDTH_LANDSCAPE - 1, MQ_MAX_HEIGHT_LANDSCAPE, "desktop"],
    [MQ_MIN_TABLET - 1, 900, "phone"],
    [MQ_MIN_TABLET, 900, "tablet"],
    [MQ_MIN_TABLET + 1, 900, "tablet"],
    [800, MQ_MAX_TABLET - 1, "tablet"],
    [800, MQ_MAX_TABLET, "tablet"],
    [800, MQ_MAX_TABLET + 1, "desktop"],
  ] as const)(
    "preserves the existing form-factor boundary at %sx%s",
    (width, height, tier) => {
      expect(profileForDimensions(width, height).tier).toBe(tier);
    },
  );

  it.each([
    [800, 519, "short"],
    [800, 520, "regular"],
    [800, 521, "regular"],
  ] as const)(
    "uses the strict short-block boundary",
    (width, height, blockSize) => {
      expect(
        resolveResponsiveEditorShell(
          input({ width, height, formFactor: "desktop" }),
        ).blockSize,
      ).toBe(blockSize);
    },
  );

  it.each([
    [799, 800, "portrait"],
    [800, 800, "portrait"],
    [801, 800, "landscape"],
  ] as const)(
    "uses strict orientation at %sx%s",
    (width, height, orientation) => {
      expect(
        resolveResponsiveEditorShell(
          input({ width, height, formFactor: "desktop" }),
        ).orientation,
      ).toBe(orientation);
    },
  );

  it("treats host-resolved tier and sidebar fit as authoritative", () => {
    expect(
      resolveResponsiveEditorShell(
        input({
          width: 1440,
          height: 900,
          formFactor: "phone",
          canFitSidebar: false,
        }),
      ),
    ).toMatchObject({
      tier: "phone",
      adapter: "phone",
      presentation: "mobile",
      canFitSidebar: false,
    });

    expect(
      resolveResponsiveEditorShell(
        input({
          width: 375,
          height: 812,
          formFactor: "desktop",
          desktopUIMode: "compact",
          canFitSidebar: true,
        }),
      ),
    ).toMatchObject({
      tier: "desktop",
      adapter: "desktop",
      presentation: "compact",
      canFitSidebar: true,
    });
  });

  it.each([
    ["phone", false, false, "touch"],
    ["desktop", true, false, "touch"],
    ["desktop", false, true, "touch"],
    ["desktop", false, false, "compact"],
  ] as const)(
    "resolves density for %s/touch=%s/coarse=%s",
    (formFactor, isTouchScreen, hasCoarsePointer, density) => {
      expect(
        resolveResponsiveEditorShell(
          input({ formFactor, isTouchScreen, hasCoarsePointer }),
        ).density,
      ).toBe(density);
    },
  );

  it("normalizes invalid and negative-zero numeric inputs", () => {
    const profile = resolveResponsiveEditorShell(
      input({
        width: Number.NaN,
        height: Number.POSITIVE_INFINITY,
        safeArea: {
          top: -1,
          right: Number.NEGATIVE_INFINITY,
          bottom: -0,
          left: Number.NaN,
        },
      }),
    );

    expect(profile.orientation).toBe("portrait");
    expect(profile.blockSize).toBe("short");
    expect(profile.safeArea.physical).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(Object.is(profile.safeArea.physical.bottom, -0)).toBe(false);
  });

  it("keeps physical safe areas fixed and mirrors only logical inline edges", () => {
    const safeArea = { top: 1, right: 2, bottom: 3, left: 4 };
    const ltr = resolveResponsiveEditorShell(input({ safeArea }));
    const rtl = resolveResponsiveEditorShell(
      input({ direction: "rtl", safeArea }),
    );

    expect(ltr.safeArea).toEqual({
      physical: safeArea,
      logical: { blockStart: 1, inlineEnd: 2, blockEnd: 3, inlineStart: 4 },
    });
    expect(rtl.safeArea).toEqual({
      physical: safeArea,
      logical: { blockStart: 1, inlineEnd: 4, blockEnd: 3, inlineStart: 2 },
    });
  });

  it("uses deterministic precision for semantically equal safe areas", () => {
    const first = resolveResponsiveEditorShell(
      input({ safeArea: { top: 1.000_4, right: 2, bottom: 3, left: 4 } }),
    );
    const second = resolveResponsiveEditorShell(
      input({ safeArea: { top: 1.000_49, right: 2, bottom: 3, left: 4 } }),
    );

    expect(first.safeArea).toEqual(second.safeArea);
    expect(first.signature).toBe(second.signature);
  });

  it("includes every semantic result in a stable signature", () => {
    const base = input();
    const baseSignature = resolveResponsiveEditorShell(base).signature;
    const variants: ResponsiveEditorShellInput[] = [
      input({ formFactor: "tablet" }),
      input({ formFactor: "phone" }),
      input({ width: 800, height: 900 }),
      input({ height: 519 }),
      input({ isTouchScreen: true }),
      input({ desktopUIMode: "compact" }),
      input({ direction: "rtl" }),
      input({ canFitSidebar: false }),
      input({ safeArea: { top: 1, right: 0, bottom: 0, left: 0 } }),
    ];

    expect(
      new Set(
        variants.map((value) => resolveResponsiveEditorShell(value).signature),
      ),
    ).not.toContain(baseSignature);
  });

  it("returns deeply immutable, semantically equal profiles", () => {
    const first = resolveResponsiveEditorShell(input());
    const second = resolveResponsiveEditorShell(input({ width: 1440.9 }));

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.safeArea)).toBe(true);
    expect(Object.isFrozen(first.safeArea.physical)).toBe(true);
    expect(Object.isFrozen(first.safeArea.logical)).toBe(true);
  });

  it("keeps the common EditorInterface contract compatible", () => {
    const common: EditorInterface = {
      formFactor: "desktop",
      desktopUIMode: "full",
      userAgent: { isMobileDevice: false, platform: "other" },
      isTouchScreen: false,
      canFitSidebar: true,
      isLandscape: true,
    };

    expect(common.formFactor).toBe("desktop");
  });
});
