import {
  claimFloatingSurfaceOwnership,
  createFloatingSurfaceOwnerClaim,
  isCurrentFloatingSurfaceOwner,
  releaseFloatingSurfaceOwnership,
  shouldCleanupFloatingSurface,
} from "./owner";

describe("floating surface owner claims", () => {
  it.each(["outside-pointer", "escape", "selection-loss", "anchor-loss"])(
    "allows current %s cleanup",
    (scope) => {
      const claim = createFloatingSurfaceOwnerClaim();
      claimFloatingSurfaceOwnership(scope, "surface", claim);
      expect(
        shouldCleanupFloatingSurface(scope, "surface", "surface", claim),
      ).toBe(true);
      releaseFloatingSurfaceOwnership(scope, "surface", claim);
    },
  );

  it("requires both scoped identity and current claim", () => {
    const claim = createFloatingSurfaceOwnerClaim();
    claimFloatingSurfaceOwnership("editor-a", "menu", claim);

    expect(
      shouldCleanupFloatingSurface("editor-a", "picker", "menu", claim),
    ).toBe(false);
    expect(
      shouldCleanupFloatingSurface("editor-b", "menu", "menu", claim),
    ).toBe(false);
    releaseFloatingSurfaceOwnership("editor-a", "menu", claim);
  });

  it("protects a same-identity replacement from old unmount cleanup", () => {
    const oldClaim = createFloatingSurfaceOwnerClaim();
    const replacementClaim = createFloatingSurfaceOwnerClaim();
    claimFloatingSurfaceOwnership("responsive", "properties", oldClaim);
    claimFloatingSurfaceOwnership("responsive", "properties", replacementClaim);

    expect(
      shouldCleanupFloatingSurface(
        "responsive",
        "properties",
        "properties",
        oldClaim,
      ),
    ).toBe(false);
    expect(
      isCurrentFloatingSurfaceOwner(
        "responsive",
        "properties",
        replacementClaim,
      ),
    ).toBe(true);

    releaseFloatingSurfaceOwnership("responsive", "properties", oldClaim);
    expect(
      isCurrentFloatingSurfaceOwner(
        "responsive",
        "properties",
        replacementClaim,
      ),
    ).toBe(true);
    releaseFloatingSurfaceOwnership(
      "responsive",
      "properties",
      replacementClaim,
    );
  });
});
