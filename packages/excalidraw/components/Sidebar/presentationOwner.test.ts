import {
  claimSidebarPresentation,
  releaseSidebarPresentation,
} from "./presentationOwner";

describe("sidebar presentation ownership", () => {
  it("ignores cleanup from a replaced presentation", () => {
    const editor = document.createElement("div");
    const oldToken = claimSidebarPresentation(editor);
    const replacement = claimSidebarPresentation(editor);

    expect(releaseSidebarPresentation(editor, oldToken)).toBe(false);
    expect(releaseSidebarPresentation(editor, replacement)).toBe(true);
  });
});
