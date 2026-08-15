import {
  claimPropertyPopupOwnership,
  createPropertyPopupOwnerClaim,
  getPropertyPopupTransition,
  isOwnedPropertyPopup,
  releasePropertyPopupOwnership,
  shouldClearOwnedPropertyPopup,
} from "./propertyPopup";

describe("property popup ownership", () => {
  it("switches categories through one controlled identity", () => {
    expect(getPropertyPopupTransition(null, "compactStrokeStyles", true)).toBe(
      "compactStrokeStyles",
    );
    expect(
      getPropertyPopupTransition(
        "compactStrokeStyles",
        "compactTextProperties",
        true,
      ),
    ).toBe("compactTextProperties");
    expect(
      getPropertyPopupTransition(
        "compactTextProperties",
        "compactTextProperties",
        false,
      ),
    ).toBe(null);
  });

  it("does not let obsolete cleanup clear a newer owner", () => {
    const oldClaim = createPropertyPopupOwnerClaim();
    const newClaim = createPropertyPopupOwnerClaim();
    claimPropertyPopupOwnership("compactStrokeStyles", oldClaim);
    claimPropertyPopupOwnership("compactStrokeStyles", newClaim);

    expect(
      shouldClearOwnedPropertyPopup(
        "compactStrokeStyles",
        "compactStrokeStyles",
        oldClaim,
      ),
    ).toBe(false);
    expect(
      shouldClearOwnedPropertyPopup(
        "compactStrokeStyles",
        "compactStrokeStyles",
        newClaim,
      ),
    ).toBe(true);
    releasePropertyPopupOwnership("compactStrokeStyles", newClaim);
  });

  it("recognizes only property-owned popup identities", () => {
    expect(isOwnedPropertyPopup("compactOtherProperties")).toBe(true);
    expect(isOwnedPropertyPopup("elementStroke")).toBe(false);
    expect(isOwnedPropertyPopup(null)).toBe(false);
  });
});
