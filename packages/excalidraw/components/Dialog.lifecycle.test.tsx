import React, { StrictMode, useState } from "react";
import { act, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { Excalidraw } from "../index";
import {
  mockBoundingClientRect,
  render,
  restoreOriginalGetBoundingClientRect,
} from "../tests/test-utils";

import ConfirmDialog from "./ConfirmDialog";
import { Dialog } from "./Dialog";
import { getModalClaimCount } from "./largeSurface/modalOwner";

describe("Dialog lifecycle", () => {
  it("recomputes focusables on every Tab step and restores trigger focus", async () => {
    let setDynamicEnabled: ((enabled: boolean) => void) | undefined;
    const Harness = () => {
      const [open, setOpen] = useState(false);
      const [dynamicEnabled, setEnabled] = useState(false);
      setDynamicEnabled = setEnabled;
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open dialog
          </button>
          {open && (
            <Dialog title="Focus model" onCloseRequest={() => setOpen(false)}>
              <button type="button">First</button>
              <button type="button" disabled={!dynamicEnabled}>
                Dynamic
              </button>
              <button type="button">Last</button>
            </Dialog>
          )}
        </>
      );
    };

    const view = await render(
      <Excalidraw>
        <Harness />
      </Excalidraw>,
    );
    const trigger = view.getByRole("button", { name: "Open dialog" });
    Object.defineProperty(trigger, "getClientRects", {
      configurable: true,
      value: () => [{ width: 1, height: 1 }],
    });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await view.findByRole("dialog", { name: "Focus model" });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        view.getByRole("button", { name: "First" }),
      ),
    );
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(
      view.getByRole("button", { name: "Last" }),
    );

    act(() => setDynamicEnabled?.(true));
    view.getByRole("button", { name: "First" }).focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(
      view.getByRole("button", { name: "Dynamic" }),
    );
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(
      view.getByRole("button", { name: "First" }),
    );

    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    await act(async () => Promise.resolve());
    expect(document.activeElement).toBe(trigger);
  });

  it("settles an unmounted confirm as cancel exactly once", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const view = await render(
      <Excalidraw>
        <ConfirmDialog
          title="Confirm"
          onCancel={onCancel}
          onConfirm={onConfirm}
        >
          Confirm content
        </ConfirmDialog>
      </Excalidraw>,
    );

    view.unmount();
    await act(async () => Promise.resolve());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("stays open through the StrictMode effect probe", async () => {
    const onCancel = vi.fn();
    const view = await render(
      <StrictMode>
        <Excalidraw>
          <ConfirmDialog
            title="Strict confirm"
            onCancel={onCancel}
            onConfirm={() => {}}
          >
            Confirm content
          </ConfirmDialog>
        </Excalidraw>
      </StrictMode>,
    );

    expect(
      await view.findByRole("dialog", { name: "Strict confirm" }),
    ).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("routes document Escape when autofocus is disabled", async () => {
    const onClose = vi.fn();
    const view = await render(
      <Excalidraw>
        <Dialog title="No autofocus" autofocus={false} onCloseRequest={onClose}>
          Content
        </Dialog>
      </Excalidraw>,
    );
    await view.findByRole("dialog", { name: "No autofocus" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("routes nested Escape only to the top dialog", async () => {
    const parentClose = vi.fn();
    const childClose = vi.fn();
    const view = await render(
      <Excalidraw>
        <Dialog title="Parent" onCloseRequest={parentClose}>
          <button type="button">Parent action</button>
          <Dialog title="Child" onCloseRequest={childClose}>
            <button type="button">Child action</button>
          </Dialog>
        </Dialog>
      </Excalidraw>,
    );
    await view.findByRole("dialog", { name: "Child" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(childClose).toHaveBeenCalledTimes(1);
    expect(parentClose).not.toHaveBeenCalled();
  });

  it("keeps one modal claim across responsive presentation changes", async () => {
    mockBoundingClientRect({ width: 1440, height: 900 });
    const view = await render(
      <Excalidraw>
        <Dialog title="Responsive" onCloseRequest={() => {}}>
          Responsive content
        </Dialog>
      </Excalidraw>,
    );
    const editor = view.container.querySelector<HTMLElement>(
      ".excalidraw-container",
    )!;
    const positioner = await waitFor(() => {
      const node = editor.querySelector<HTMLElement>(
        "[data-large-surface-positioner]",
      );
      expect(node).not.toBeNull();
      return node!;
    });
    expect(getModalClaimCount(editor)).toBe(1);
    expect(positioner).toHaveAttribute(
      "data-large-surface-presentation",
      "centered",
    );

    mockBoundingClientRect({ width: 375, height: 812 });
    fireEvent(window, new Event("resize"));
    await waitFor(() =>
      expect(positioner).toHaveAttribute(
        "data-large-surface-presentation",
        "fullscreen",
      ),
    );
    expect(getModalClaimCount(editor)).toBe(1);

    mockBoundingClientRect({ width: 1200, height: 420 });
    fireEvent(window, new Event("resize"));
    await waitFor(() =>
      expect(positioner).toHaveAttribute(
        "data-large-surface-presentation",
        "sheet",
      ),
    );
    expect(getModalClaimCount(editor)).toBe(1);
    restoreOriginalGetBoundingClientRect();
  });
});
