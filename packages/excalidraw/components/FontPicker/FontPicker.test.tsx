import { KEYS } from "@excalidraw/common";
import { vi } from "vitest";

import { Excalidraw } from "../../index";
import { Keyboard, UI } from "../../tests/helpers/ui";
import { getTextEditor } from "../../tests/queries/dom";
import { act, fireEvent, render, waitFor } from "../../tests/test-utils";

describe("FontPicker", () => {
  it("keeps composite focus through the real ArrowDown then Enter path", async () => {
    (global as any).ResizeObserver =
      (global as any).ResizeObserver ||
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      };

    const { queryByTestId } = await render(
      <Excalidraw handleKeyboardGlobally={true} />,
    );

    Keyboard.keyPress(KEYS.T);

    const fontPickerTrigger = queryByTestId("font-family-show-fonts");

    expect(fontPickerTrigger).not.toBeNull();

    fireEvent.click(fontPickerTrigger!);

    await waitFor(() => expect(window.h.state.openPopup).toBe("fontFamily"));
    await waitFor(() => {
      const frame = document.querySelector(
        '[data-floating-surface][data-surface-kind="font-picker"]',
      );
      expect(frame).not.toBeNull();
      expect(frame?.querySelector('[role="menu"]')).toBeNull();
      const listbox = frame?.querySelector('[role="listbox"]');
      expect(listbox).toHaveAccessibleName("Font family");
      const options = Array.from(
        frame?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
      );
      expect(options.length).toBeGreaterThan(1);
      expect(
        options.filter(
          (option) => option.getAttribute("aria-selected") === "true",
        ),
      ).toHaveLength(1);
      expect(
        options.every((option) => option.hasAttribute("aria-selected")),
      ).toBe(true);
      expect(options.every((option) => option.tabIndex === -1)).toBe(true);
      expect(listbox).toHaveAttribute("tabindex", "0");
      expect(
        frame?.querySelector(".floating-surface__scroll-viewport"),
      ).not.toBeNull();
      expect(frame).not.toHaveAttribute("data-viewport-ui");
    });

    const listbox = document.querySelector<HTMLElement>('[role="listbox"]')!;
    const selectedBefore = window.h.state.currentItemFontFamily;
    const activeDescendantBefore = listbox.getAttribute(
      "aria-activedescendant",
    );
    const arrowTarget = document.activeElement as HTMLElement;

    expect(
      document
        .querySelector(
          '[data-floating-surface][data-surface-kind="font-picker"]',
        )
        ?.contains(arrowTarget),
    ).toBe(true);
    fireEvent.keyDown(arrowTarget, { key: KEYS.ARROW_DOWN });

    await waitFor(() =>
      expect(listbox.getAttribute("aria-activedescendant")).not.toBe(
        activeDescendantBefore,
      ),
    );
    expect(document.activeElement).toBe(listbox);

    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: KEYS.ENTER,
    });

    await waitFor(() => expect(window.h.state.openPopup).toBeNull());
    expect(window.h.state.currentItemFontFamily).not.toBe(selectedBefore);
    expect(
      document.querySelector(
        '[data-floating-surface][data-surface-kind="font-picker"]',
      ),
    ).toBeNull();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });

  it("preserves search navigation through the composite listbox", async () => {
    const { queryByTestId } = await render(
      <Excalidraw handleKeyboardGlobally={true} />,
    );

    Keyboard.keyPress(KEYS.T);
    fireEvent.click(queryByTestId("font-family-show-fonts")!);

    const search = await waitFor(() => {
      const input = document.querySelector<HTMLInputElement>(
        ".QuickSearch__input",
      );
      expect(input).not.toBeNull();
      return input!;
    });
    const listbox = document.querySelector<HTMLElement>('[role="listbox"]')!;

    fireEvent.change(search, { target: { value: "excalifont" } });
    await waitFor(() =>
      expect(listbox.querySelectorAll('[role="option"]')).toHaveLength(1),
    );
    expect(document.activeElement).toBe(search);

    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: KEYS.ARROW_DOWN,
    });

    await waitFor(() => expect(document.activeElement).toBe(listbox));
    const activeDescendant = listbox.getAttribute("aria-activedescendant");
    expect(activeDescendant).not.toBeNull();
    expect(document.getElementById(activeDescendant!)).toHaveAttribute(
      "title",
      "Excalifont",
    );
  });

  it("preserves touch text caret and font loading on pointer selection", async () => {
    await render(<Excalidraw handleKeyboardGlobally={true} />);
    UI.createElement("text");
    const textEditor = await getTextEditor();

    fireEvent.input(textEditor, { target: { value: "hello" } });
    textEditor.selectionStart = 2;
    textEditor.selectionEnd = 4;
    act(() => {
      window.h.app.editorInterface = {
        ...window.h.app.editorInterface,
        isTouchScreen: true,
      };
      window.h.app.forceUpdate();
    });
    textEditor.focus();

    Keyboard.withModifierKeys({ shift: true }, () => {
      Keyboard.keyPress(KEYS.F);
    });

    await waitFor(() => expect(window.h.state.openPopup).toBe("fontFamily"));
    expect(document.activeElement).toBe(textEditor);

    const checkFont = vi.mocked(document.fonts.check);
    const loadFont = vi.mocked(document.fonts.load);
    checkFont.mockReturnValue(false);
    loadFont.mockClear();
    const option = document.querySelector<HTMLElement>(
      '[role="option"][aria-selected="false"]',
    )!;
    fireEvent.mouseMove(option);
    const activeDescendant = await waitFor(() => {
      const id = document
        .querySelector('[role="listbox"]')
        ?.getAttribute("aria-activedescendant");
      expect(id).toBe(option.id);
      return id!;
    });
    fireEvent.click(document.getElementById(activeDescendant)!);

    await waitFor(() => expect(window.h.state.openPopup).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(textEditor));
    expect(textEditor.selectionStart).toBe(2);
    expect(textEditor.selectionEnd).toBe(4);
    await waitFor(() => expect(loadFont).toHaveBeenCalled());
    checkFont.mockReturnValue(true);
  });
});
