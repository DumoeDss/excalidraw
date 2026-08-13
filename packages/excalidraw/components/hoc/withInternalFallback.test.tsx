import React from "react";
import { act, fireEvent, waitFor } from "@testing-library/react";

import { Excalidraw, MainMenu } from "../../index";
import { render, queryAllByTestId } from "../../tests/test-utils";

describe("Test internal component fallback rendering", () => {
  it("should render only one menu per excalidraw instance (custom menu first scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
        <Excalidraw />
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per excalidraw instance (default menu first scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw />
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per excalidraw instance (two custom menus scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
        <Excalidraw>
          <MainMenu>test</MainMenu>
        </Excalidraw>
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per excalidraw instance (two default menus scenario)", async () => {
    const { container } = await render(
      <div>
        <Excalidraw />
        <Excalidraw />
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".excalidraw-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("keeps host preference isolated after one editor unmounts", async () => {
    const { container, rerender } = await render(
      <div>
        <div data-testid="editor-one" key="editor-one">
          <Excalidraw>
            <MainMenu>one</MainMenu>
          </Excalidraw>
        </div>
        <div data-testid="editor-two" key="editor-two">
          <Excalidraw>
            <MainMenu>two</MainMenu>
          </Excalidraw>
        </div>
      </div>,
    );

    await act(async () => {
      rerender(
        <div>
          <div data-testid="editor-two" key="editor-two">
            <Excalidraw>
              <MainMenu>two</MainMenu>
            </Excalidraw>
          </div>
        </div>,
      );
    });

    const triggers = queryAllByTestId(container, "main-menu-trigger");
    expect(triggers).toHaveLength(1);
    fireEvent.click(triggers[0]);
    await waitFor(() => expect(container).toHaveTextContent("two"));
  });
});
