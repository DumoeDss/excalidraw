import React from "react";

import { Excalidraw, WelcomeScreen } from "../index";

import {
  act,
  fireEvent,
  mockBoundingClientRect,
  render,
  restoreOriginalGetBoundingClientRect,
  waitFor,
} from "./test-utils";

const { h } = window;

describe("application chrome integration", () => {
  afterEach(() => {
    restoreOriginalGetBoundingClientRect();
  });

  it.each([
    ["desktop", { width: 1440, height: 900 }],
    ["phone", { width: 375, height: 812 }],
  ] as const)(
    "keeps welcome content in its real tunnel on %s",
    async (formFactor, dimensions) => {
      mockBoundingClientRect(dimensions);
      const { container } = await render(
        <Excalidraw>
          <WelcomeScreen>
            <WelcomeScreen.Center>
              <WelcomeScreen.Center.Menu>
                <WelcomeScreen.Center.MenuItem onSelect={() => {}}>
                  Host welcome action
                </WelcomeScreen.Center.MenuItem>
              </WelcomeScreen.Center.Menu>
            </WelcomeScreen.Center>
          </WelcomeScreen>
        </Excalidraw>,
      );

      act(() => {
        h.app.refreshEditorInterface();
        h.app.refresh();
      });

      await waitFor(() =>
        expect(h.app.editorInterface.formFactor).toBe(formFactor),
      );
      const center = container.querySelector(".welcome-screen-center");
      expect(center).not.toBeNull();
      expect(
        center?.closest(
          formFactor === "phone" ? ".App-welcome-screen" : ".layer-ui__wrapper",
        ),
      ).not.toBeNull();
      expect(
        center?.querySelector('[data-app-content][aria-label="Actions"]'),
      ).toHaveAttribute("data-app-content-interaction", "neutral");
      expect(center?.querySelector("[data-viewport-ui]")).toBeNull();
      expect(
        container.querySelector('button[aria-label="Host welcome action"]') ??
          Array.from(container.querySelectorAll("button")).find((button) =>
            button.textContent?.includes("Host welcome action"),
          ),
      ).toBeEnabled();
    },
  );

  it("keeps phone fallback and refreshes host callbacks and children", async () => {
    mockBoundingClientRect({ width: 375, height: 812 });
    const firstTopRight = vi.fn((isMobile: boolean) =>
      isMobile ? null : <div>desktop only</div>,
    );
    const secondTopRight = vi.fn((isMobile: boolean) =>
      isMobile ? <button type="button">Fresh phone action</button> : null,
    );

    const { container, rerender } = await render(
      <Excalidraw renderTopRightUI={firstTopRight}>
        <div data-testid="host-child">first child</div>
      </Excalidraw>,
    );

    act(() => {
      h.app.refreshEditorInterface();
      h.app.refresh();
    });
    await waitFor(() => {
      expect(h.app.editorInterface.formFactor).toBe("phone");
      expect(firstTopRight.mock.calls.some(([isMobile]) => isMobile)).toBe(
        true,
      );
    });
    expect(container.querySelector(".sidebar-trigger")).not.toBeNull();

    rerender(
      <Excalidraw renderTopRightUI={secondTopRight}>
        <div data-testid="host-child">fresh child</div>
      </Excalidraw>,
    );

    await waitFor(() => {
      expect(secondTopRight).toHaveBeenCalledWith(true, expect.any(Object));
      expect(container).toHaveTextContent("Fresh phone action");
      expect(container).toHaveTextContent("fresh child");
    });
  });

  it("keeps recoverable error dismissal at LayerUI", async () => {
    const { container } = await render(<Excalidraw />);

    act(() =>
      h.app.setState({ errorMessage: "Recoverable application error" }),
    );

    await waitFor(() => {
      expect(container.querySelector('[role="alert"]')).toHaveTextContent(
        "Recoverable application error",
      );
    });
    fireEvent.click(container.querySelector(".Dialog__close")!);

    await waitFor(() => {
      expect(h.state.errorMessage).toBeNull();
      expect(container.querySelector('[role="alert"]')).toBeNull();
    });
  });

  it("renders CustomStats through the current host callback", async () => {
    const renderCustomStats = vi.fn(() => (
      <div data-testid="custom-stats-host">Host statistics</div>
    ));
    const { container } = await render(
      <Excalidraw renderCustomStats={renderCustomStats} />,
    );

    act(() =>
      h.app.setState((state) => ({
        stats: { ...state.stats, open: true },
      })),
    );

    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="custom-stats-host"]'),
      ).toHaveTextContent("Host statistics");
    });
    expect(renderCustomStats).toHaveBeenCalledWith(h.elements, h.state);
  });
});
