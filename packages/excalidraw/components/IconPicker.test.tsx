import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { vi } from "vitest";

import { EditorJotaiProvider } from "../editor-jotai";

import { IconPicker } from "./IconPicker";

const option = (value: string, keyBinding: string) => ({
  value,
  text: `Option ${value}`,
  icon: <svg aria-hidden="true" />,
  keyBinding,
});

describe("IconPicker", () => {
  it("retains dialog and grid navigation semantics over the shared frame", async () => {
    const onChange = vi.fn();
    render(
      <EditorJotaiProvider>
        <IconPicker
          label="Icon style"
          value="a"
          visibleSections={[
            {
              name: "default",
              options: [option("a", "a"), option("b", "b")],
            },
          ]}
          hiddenSections={[{ name: "More", options: [option("c", "c")] }]}
          onChange={onChange}
        />
      </EditorJotaiProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Icon style" }));
    const dialog = await screen.findByRole("dialog", { name: "Icon style" });
    expect(screen.getAllByRole("dialog", { name: "Icon style" })).toHaveLength(
      1,
    );
    const frame = dialog.querySelector("[data-floating-surface]");
    expect(frame).toHaveAttribute("data-surface-kind", "icon-picker");
    const grid = frame?.querySelector(".picker-content");
    expect(grid).not.toBeNull();
    expect(grid?.querySelectorAll(".floating-surface__item")).toHaveLength(2);

    const selected = screen.getByRole("button", { name: "Option a" });
    await waitFor(() => expect(selected).toHaveFocus());
    fireEvent.keyDown(selected, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("b");
    fireEvent.keyDown(selected, { key: "c" });
    expect(onChange).toHaveBeenCalledWith("c");
    fireEvent.keyDown(selected, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Icon style" })).toBeNull();
  });

  it("keeps every four-column option inside the shared scroll viewport", async () => {
    render(
      <EditorJotaiProvider>
        <IconPicker
          label="Icon style"
          value="a"
          visibleSections={[
            {
              name: "default",
              options: [
                option("a", "a"),
                option("b", "b"),
                option("c", "c"),
                option("d", "d"),
              ],
            },
          ]}
          onChange={() => {}}
        />
      </EditorJotaiProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Icon style" }));
    const dialog = await screen.findByRole("dialog", { name: "Icon style" });
    const viewport = dialog.querySelector(".floating-surface__scroll-viewport");
    const grid = viewport?.querySelector(".picker-content");
    const options = Array.from(
      grid?.querySelectorAll<HTMLButtonElement>(".picker-option") ?? [],
    );

    expect(viewport).not.toBeNull();
    expect(grid).not.toBeNull();
    expect(options).toHaveLength(4);
    expect(grid).toHaveStyle({
      minInlineSize: 0,
      inlineSize: "100%",
      gridTemplateColumns: "repeat(4, minmax(2.75rem, 1fr))",
    });
    expect(
      options.every((entry) => entry.matches(".floating-surface__item")),
    ).toBe(true);
  });

  it("opens collapsible sections and closes on an outside pointer", async () => {
    render(
      <EditorJotaiProvider>
        <IconPicker
          label="Icon style"
          value="a"
          visibleSections={[{ name: "default", options: [option("a", "a")] }]}
          hiddenSections={[{ name: "More", options: [option("c", "c")] }]}
          onChange={() => {}}
        />
      </EditorJotaiProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Icon style" }));
    expect(screen.queryByRole("button", { name: "Option c" })).toBeNull();
    fireEvent.click(screen.getByText("More options"));
    expect(screen.getByRole("button", { name: "Option c" })).toBeVisible();

    await act(() => new Promise((resolve) => window.setTimeout(resolve, 0)));
    fireEvent.pointerDown(document.body, {
      button: 0,
      pointerType: "mouse",
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Icon style" })).toBeNull(),
    );
  });

  it("mirrors horizontal grid navigation in RTL", async () => {
    const previousDirection = document.documentElement.getAttribute("dir");
    document.documentElement.setAttribute("dir", "rtl");
    const onChange = vi.fn();

    try {
      render(
        <EditorJotaiProvider>
          <IconPicker
            label="Icon style"
            value="a"
            visibleSections={[
              {
                name: "default",
                options: [option("a", "a"), option("b", "b")],
              },
            ]}
            onChange={onChange}
          />
        </EditorJotaiProvider>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Icon style" }));
      const selected = screen.getByRole("button", { name: "Option a" });
      await waitFor(() => expect(selected).toHaveFocus());
      fireEvent.keyDown(selected, { key: "ArrowLeft" });
      expect(onChange).toHaveBeenCalledWith("b");
    } finally {
      if (previousDirection === null) {
        document.documentElement.removeAttribute("dir");
      } else {
        document.documentElement.setAttribute("dir", previousDirection);
      }
    }
  });
});
