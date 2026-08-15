import React from "react";

import { KEYS } from "@excalidraw/common";

import { Excalidraw, MainMenu } from "../../index";
import { Keyboard } from "../../tests/helpers/ui";
import { defaultLang, setLanguage } from "../../i18n";
import {
  render,
  waitFor,
  getByTestId,
  fireEvent,
  GlobalTestState,
  screen,
  act,
} from "../../tests/test-utils";

describe("Test <DropdownMenu/>", () => {
  it("uses one controlled transition for trigger and Escape", async () => {
    const { container } = await render(<Excalidraw />);
    const trigger = getByTestId(container, "main-menu-trigger");

    expect(window.h.state.openMenu).toBe(null);

    fireEvent.click(trigger);
    expect(window.h.state.openMenu).toBe("canvas");
    expect(screen.getByRole("menu")).toBeVisible();

    Keyboard.keyDown(KEYS.ESCAPE);
    await waitFor(() => expect(window.h.state.openMenu).toBe(null));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("does not replay the fallback after a complete pointer sequence", async () => {
    const { container } = await render(<Excalidraw />);
    const trigger = getByTestId(container, "main-menu-trigger");

    fireEvent.pointerDown(trigger, {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.click(trigger, { detail: 1 });

    expect(window.h.state.openMenu).toBe("canvas");
    expect(screen.getByRole("menu")).toBeVisible();
  });

  it("retains roving focus, typeahead, disabled skipping, and persistent selection", async () => {
    const keepOpen = vi.fn((event: Event) => event.preventDefault());
    const { container } = await render(
      <Excalidraw>
        <MainMenu>
          <MainMenu.Item onSelect={() => {}}>Alpha</MainMenu.Item>
          <MainMenu.Item disabled onSelect={() => {}}>
            Beta
          </MainMenu.Item>
          <MainMenu.Item onSelect={keepOpen}>Stay open</MainMenu.Item>
          <MainMenu.Item onSelect={() => {}}>Zulu</MainMenu.Item>
        </MainMenu>
      </Excalidraw>,
    );

    fireEvent.click(getByTestId(container, "main-menu-trigger"));
    const menu = screen.getByRole("menu");
    const alpha = screen.getByRole("menuitem", { name: "Alpha" });
    const stayOpen = screen.getByRole("menuitem", { name: "Stay open" });
    const zulu = screen.getByRole("menuitem", { name: "Zulu" });
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(alpha).toHaveFocus();
    fireEvent.keyDown(alpha, { key: "ArrowDown" });
    await waitFor(() => expect(stayOpen).toHaveFocus());
    fireEvent.keyDown(menu, { key: "z" });
    await waitFor(() => expect(zulu).toHaveFocus());

    fireEvent.click(stayOpen);
    expect(keepOpen).toHaveBeenCalledTimes(1);
    expect(window.h.state.openMenu).toBe("canvas");
    expect(menu).toBeVisible();

    fireEvent.pointerDown(GlobalTestState.interactiveCanvas, {
      button: 0,
      pointerType: "mouse",
    });
    await waitFor(() => expect(window.h.state.openMenu).toBe(null));
  });

  it.each([
    ["ltr", "ArrowRight"],
    ["rtl", "ArrowLeft"],
  ] as const)(
    "opens and closes a nested submenu with logical arrows in %s",
    async (direction, openKey) => {
      await act(() =>
        setLanguage(
          direction === "rtl"
            ? { code: "ar-SA", label: "العربية", rtl: true }
            : defaultLang,
        ),
      );

      try {
        const { container } = await render(
          <Excalidraw
            langCode={direction === "rtl" ? "ar-SA" : defaultLang.code}
          >
            <MainMenu>
              <MainMenu.Sub>
                <MainMenu.Sub.Trigger>Preferences</MainMenu.Sub.Trigger>
                <MainMenu.Sub.Content>
                  <MainMenu.Item onSelect={() => {}}>
                    Preference one
                  </MainMenu.Item>
                </MainMenu.Sub.Content>
              </MainMenu.Sub>
            </MainMenu>
          </Excalidraw>,
        );
        await waitFor(() =>
          expect(document.documentElement).toHaveAttribute("dir", direction),
        );

        fireEvent.click(getByTestId(container, "main-menu-trigger"));
        const rootMenu = screen.getByRole("menu");
        expect(rootMenu).toHaveAttribute("dir", direction);
        const parent = screen.getByRole("menuitem", { name: /Preferences/ });
        fireEvent.keyDown(rootMenu, { key: "ArrowDown" });
        expect(parent).toHaveFocus();
        fireEvent.keyDown(parent, { key: openKey });

        const child = await screen.findByRole("menuitem", {
          name: "Preference one",
        });
        await waitFor(() => expect(child).toHaveFocus());
        fireEvent.keyDown(child, { key: KEYS.ESCAPE });
        await waitFor(() => expect(parent).toHaveFocus());
        expect(screen.getAllByRole("menu")).toHaveLength(1);
        expect(window.h.state.openMenu).toBe("canvas");
      } finally {
        await act(() => setLanguage(defaultLang));
      }
    },
  );

  it("keeps Radix associations instance-local across editors", async () => {
    const view = await render(
      <>
        <Excalidraw>
          <MainMenu>
            <MainMenu.Item onSelect={() => {}}>Editor one</MainMenu.Item>
          </MainMenu>
        </Excalidraw>
        <Excalidraw>
          <MainMenu>
            <MainMenu.Item onSelect={() => {}}>Editor two</MainMenu.Item>
          </MainMenu>
        </Excalidraw>
      </>,
    );
    const triggers = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>(
        '[data-testid="main-menu-trigger"]',
      ),
    );
    expect(triggers).toHaveLength(2);

    fireEvent.click(triggers[0]);
    await waitFor(() => expect(triggers[0]).toHaveAttribute("aria-controls"));
    const firstAssociation = triggers[0].getAttribute("aria-controls");
    Keyboard.keyDown(KEYS.ESCAPE);
    await waitFor(() =>
      expect(triggers[0]).toHaveAttribute("aria-expanded", "false"),
    );

    fireEvent.click(triggers[1]);
    await waitFor(() => expect(triggers[1]).toHaveAttribute("aria-controls"));
    expect(firstAssociation).not.toBe(
      triggers[1].getAttribute("aria-controls"),
    );
  });
});
