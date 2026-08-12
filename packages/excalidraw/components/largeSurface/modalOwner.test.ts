import {
  claimModal,
  getModalClaimCount,
  isTopModalClaim,
  releaseModal,
} from "./modalOwner";

describe("modal ownership", () => {
  const editors: HTMLElement[] = [];
  const createEditor = () => {
    const editor = document.createElement("div");
    editor.tabIndex = 0;
    const canvas = document.createElement("div");
    const parentPortal = document.createElement("div");
    const childPortal = document.createElement("div");
    const tooltipPortal = document.createElement("div");
    tooltipPortal.className = "excalidraw-tooltip-portal";
    editor.append(canvas, parentPortal, childPortal, tooltipPortal);
    document.body.append(editor);
    editors.push(editor);
    return { editor, canvas, parentPortal, childPortal, tooltipPortal };
  };

  afterEach(() => {
    editors.splice(0).forEach((editor) => editor.remove());
  });

  it("isolates background and reference-counts nested claims", async () => {
    const { editor, canvas, parentPortal, childPortal, tooltipPortal } =
      createEditor();
    const parent = claimModal({
      editor,
      logicalId: "parent",
      portal: parentPortal,
      returnTarget: editor,
    });
    const child = claimModal({
      editor,
      logicalId: "child",
      portal: childPortal,
      returnTarget: parentPortal,
    });

    expect(getModalClaimCount(editor)).toBe(2);
    expect(isTopModalClaim(editor, child)).toBe(true);
    expect(parentPortal.inert).toBe(true);
    expect(canvas.inert).toBe(true);
    expect(tooltipPortal.inert).toBe(false);
    expect(editor.style.overflow).toBe("hidden");

    const lateBackground = document.createElement("div");
    editor.append(lateBackground);
    await Promise.resolve();
    expect(lateBackground.inert).toBe(true);
    expect(lateBackground.getAttribute("aria-hidden")).toBe("true");

    releaseModal({ editor, token: child });
    await Promise.resolve();
    expect(getModalClaimCount(editor)).toBe(1);
    expect(isTopModalClaim(editor, parent)).toBe(true);
    expect(parentPortal.inert).toBe(false);
    expect(editor.style.overflow).toBe("hidden");

    releaseModal({ editor, token: parent });
    await Promise.resolve();
    expect(getModalClaimCount(editor)).toBe(0);
    expect(canvas.inert).toBe(false);
    expect(editor.style.overflow).toBe("");
    expect(lateBackground.inert).toBe(false);
    expect(lateBackground.getAttribute("aria-hidden")).toBeNull();
  });

  it("does not let stale cleanup release a same-identity replacement", async () => {
    const { editor, parentPortal, childPortal } = createEditor();
    const oldToken = claimModal({
      editor,
      logicalId: "dialog",
      portal: parentPortal,
      returnTarget: editor,
    });
    const replacement = claimModal({
      editor,
      logicalId: "dialog",
      portal: childPortal,
      returnTarget: editor,
    });

    releaseModal({ editor, token: oldToken });
    await Promise.resolve();
    expect(getModalClaimCount(editor)).toBe(1);
    expect(isTopModalClaim(editor, replacement)).toBe(true);
  });

  it("returns focus inside the parent when a child target is unavailable", async () => {
    const { editor, parentPortal, childPortal } = createEditor();
    const parentButton = document.createElement("button");
    parentPortal.append(parentButton);
    claimModal({
      editor,
      logicalId: "parent",
      portal: parentPortal,
      returnTarget: editor,
    });
    const child = claimModal({
      editor,
      logicalId: "child",
      portal: childPortal,
      returnTarget: null,
    });

    releaseModal({ editor, token: child });
    await Promise.resolve();
    expect(document.activeElement).toBe(parentButton);
    expect(editor.style.overflow).toBe("hidden");
  });
});
