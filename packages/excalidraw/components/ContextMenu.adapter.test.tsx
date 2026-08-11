import React from "react";

import { Excalidraw } from "../index";
import {
  fireEvent,
  GlobalTestState,
  render,
  screen,
  waitFor,
} from "../tests/test-utils";

const openCanvasMenu = () => {
  fireEvent.contextMenu(GlobalTestState.interactiveCanvas, {
    button: 2,
    clientX: 40,
    clientY: 40,
  });
  return screen.getByRole("menu");
};

describe("context menu adapter", () => {
  it("uses menu roles, roving focus, Home/End, and typeahead", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    const menu = openCanvasMenu();
    const items = Array.from(
      menu.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]'),
    );
    expect(menu.closest("[data-floating-surface]")).toHaveAttribute(
      "data-surface-kind",
      "context-menu",
    );
    expect(menu).toHaveStyle({ minInlineSize: 0, inlineSize: "100%" });
    expect(items[0]).toHaveFocus();
    expect(menu.parentElement).toHaveClass("floating-surface__scroll-viewport");
    expect(
      items.every(
        (item) =>
          item.matches(".floating-surface__item") &&
          item.parentElement?.parentElement === menu,
      ),
    ).toBe(true);
    items.forEach((item) =>
      expect(item.parentElement).toHaveStyle({
        minInlineSize: 0,
        inlineSize: "100%",
      }),
    );

    fireEvent.keyDown(menu, { key: "End" });
    expect(items.at(-1)).toHaveFocus();
    fireEvent.keyDown(menu, { key: "Home" });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(menu, { key: "s" });
    expect(
      document.activeElement?.textContent?.trim().toLocaleLowerCase(),
    ).toMatch(/^s/);
  });

  it("keeps unchecked actions exposed as menuitemcheckbox", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    const menu = openCanvasMenu();
    const gridMode = menu.querySelector<HTMLButtonElement>(
      '[data-testid="gridMode"] button',
    );

    expect(gridMode).toHaveAttribute("role", "menuitemcheckbox");
    expect(gridMode).toHaveAttribute("aria-checked", "false");
  });

  it("closes with Escape, restores editor focus, and leaves no portal blocker", async () => {
    const { container } = await render(<Excalidraw handleKeyboardGlobally />);
    const menu = openCanvasMenu();
    const positioner = menu.closest(".popover");
    const frame = menu.closest("[data-floating-surface]");
    expect(positioner).not.toHaveAttribute("data-floating-surface");
    expect(positioner).not.toHaveAttribute("data-viewport-ui");
    expect(frame).not.toHaveAttribute("data-viewport-ui");

    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(container.querySelector(".excalidraw")).toHaveFocus();
  });

  it("outside pointer closes without preventing the canvas event", async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    openCanvasMenu();
    const reachedCanvas = fireEvent.pointerDown(
      GlobalTestState.interactiveCanvas,
      {
        clientX: 2,
        clientY: 2,
      },
    );
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(reachedCanvas).toBe(true);
  });
});
