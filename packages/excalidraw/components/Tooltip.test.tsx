import { act, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { Excalidraw } from "../index";
import { render } from "../tests/test-utils";

import { Tooltip } from "./Tooltip";
import { Dialog } from "./Dialog";

describe("Tooltip adapter", () => {
  afterEach(() => vi.useRealTimers());

  it("delays pointer help, opens immediately for focus, and cleans association", async () => {
    const view = await render(
      <Excalidraw>
        <Tooltip label="Helpful label">
          <button type="button">Trigger</button>
        </Tooltip>
      </Excalidraw>,
    );
    vi.useFakeTimers();
    const trigger = view.getByRole("button", { name: "Trigger" });
    const wrapper = trigger.closest<HTMLElement>(
      ".excalidraw-tooltip-wrapper",
    )!;

    fireEvent.pointerEnter(wrapper, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(449));
    expect(view.queryByRole("tooltip")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    const pointerTooltip = view.getByRole("tooltip");
    expect(trigger.getAttribute("aria-describedby")).toBe(pointerTooltip.id);
    expect(pointerTooltip).not.toHaveAttribute("data-viewport-ui");
    expect(pointerTooltip).not.toHaveAttribute("data-large-surface");
    expect(pointerTooltip).not.toHaveAttribute("role", "menu");

    fireEvent.pointerLeave(wrapper);
    act(() => vi.advanceTimersByTime(100));
    expect(view.queryByRole("tooltip")).toBeNull();
    expect(trigger).not.toHaveAttribute("aria-describedby");

    fireEvent.focus(trigger);
    const keyboardTooltip = view.getByRole("tooltip");
    expect(trigger.getAttribute("aria-describedby")).toBe(keyboardTooltip.id);
    fireEvent.blur(trigger);
    act(() => vi.advanceTimersByTime(100));
    expect(view.queryByRole("tooltip")).toBeNull();
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("keeps a disabled tooltip trigger operable without showing a bubble", async () => {
    const onClick = vi.fn();
    const view = await render(
      <Excalidraw>
        <Tooltip label="Disabled help" disabled>
          <button type="button" onClick={onClick}>
            Still active
          </button>
        </Tooltip>
      </Excalidraw>,
    );
    const trigger = view.getByRole("button", { name: "Still active" });
    fireEvent.click(trigger);
    fireEvent.focus(trigger);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(view.queryByRole("tooltip")).toBeNull();
  });

  it("cancels delayed work on rapid replacement and suppresses touch hover", async () => {
    const view = await render(
      <Excalidraw>
        <Tooltip label="First help">
          <button type="button">First</button>
        </Tooltip>
        <Tooltip label="Second help">
          <button type="button">Second</button>
        </Tooltip>
      </Excalidraw>,
    );
    vi.useFakeTimers();
    const first = view.getByRole("button", { name: "First" });
    const second = view.getByRole("button", { name: "Second" });
    const firstWrapper = first.closest<HTMLElement>(
      ".excalidraw-tooltip-wrapper",
    )!;
    const secondWrapper = second.closest<HTMLElement>(
      ".excalidraw-tooltip-wrapper",
    )!;

    fireEvent.pointerEnter(firstWrapper, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.pointerEnter(secondWrapper, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(449));
    expect(view.queryByRole("tooltip")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(view.getByRole("tooltip")).toHaveTextContent("Second help");
    expect(first).not.toHaveAttribute("aria-describedby");

    fireEvent.pointerLeave(secondWrapper);
    act(() => vi.advanceTimersByTime(100));
    fireEvent.pointerEnter(firstWrapper, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(500));
    expect(view.queryByRole("tooltip")).toBeNull();

    fireEvent.focus(first);
    expect(view.getByRole("tooltip")).toHaveTextContent("First help");
    view.rerender(<Excalidraw />);
    await waitFor(() => expect(first).not.toHaveAttribute("aria-describedby"));
    act(() => vi.runOnlyPendingTimers());
    expect(view.queryByRole("tooltip")).toBeNull();
  });

  it("closes an editor tooltip when a modal takes ownership", async () => {
    const tooltip = (
      <Tooltip label="Canvas help">
        <button type="button">Canvas trigger</button>
      </Tooltip>
    );
    const view = await render(<Excalidraw>{tooltip}</Excalidraw>);
    const trigger = view.getByRole("button", { name: "Canvas trigger" });
    fireEvent.focus(trigger);
    expect(view.getByRole("tooltip")).toHaveTextContent("Canvas help");

    view.rerender(
      <Excalidraw>
        {tooltip}
        <Dialog title="Foreground" onCloseRequest={() => {}}>
          <Tooltip label="Dialog help">
            <button type="button">Dialog trigger</button>
          </Tooltip>
        </Dialog>
      </Excalidraw>,
    );
    await waitFor(() => expect(view.queryByText("Canvas help")).toBeNull());
    expect(trigger).not.toHaveAttribute("aria-describedby");

    const dialogTrigger = view.getByRole("button", { name: "Dialog trigger" });
    fireEvent.focus(dialogTrigger);
    expect(view.getByRole("tooltip")).toHaveTextContent("Dialog help");
    expect(
      view.getByRole("tooltip").closest(".excalidraw-tooltip-portal"),
    ).not.toHaveAttribute("inert");
  });
});
