import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  act,
  fireEvent,
  render as renderDOM,
  waitFor,
} from "@testing-library/react";
import { vi } from "vitest";

import { Excalidraw } from "../index";
import {
  mockBoundingClientRect,
  render as renderApp,
  restoreOriginalGetBoundingClientRect,
} from "../tests/test-utils";

import { getToastBottomReservation, Toast, ToastRegion } from "./Toast";
import { ExcalidrawContainerContext } from "./App";

const rootStyles = readFileSync(
  resolve(process.cwd(), "packages/excalidraw/css/styles.scss"),
  "utf8",
);
const toastStyles = readFileSync(
  resolve(process.cwd(), "packages/excalidraw/components/Toast.scss"),
  "utf8",
);

const readLayer = (name: string) =>
  Number.parseInt(
    rootStyles.match(new RegExp(`--zIndex-${name}:\\s*(\\d+)`))?.[1] ?? "NaN",
    10,
  );

const renderRegion = (
  editor: HTMLDivElement,
  props: React.ComponentProps<typeof ToastRegion>,
) =>
  renderDOM(
    <ExcalidrawContainerContext.Provider
      value={{ container: editor, id: "toast-test" }}
    >
      <ToastRegion {...props} />
    </ExcalidrawContainerContext.Provider>,
  );

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("uses bounded percentage progress semantics", () => {
    const { container, rerender } = renderDOM(
      <Toast.ProgressBar progress={0.72} />,
    );
    expect(
      container.querySelector<HTMLElement>(".Toast__progress-bar-fill")?.style
        .width,
    ).toBe("72%");
    rerender(<Toast.ProgressBar progress={2} />);
    expect(
      container.querySelector<HTMLElement>(".Toast__progress-bar-fill")?.style
        .width,
    ).toBe("100%");
  });

  it("layers status feedback above editor UI and below modals", () => {
    expect(readLayer("toast")).toBeGreaterThan(readLayer("ui-library"));
    expect(readLayer("toast")).toBeLessThan(readLayer("modal"));
  });

  it("places phone toasts above the highest visible bottom leaf", () => {
    const editor = document.createElement("div");
    const propertyLeaf = document.createElement("div");
    const toolbarLeaf = document.createElement("div");
    propertyLeaf.dataset.viewportUi = "bottom";
    toolbarLeaf.dataset.viewportUi = "bottom";
    editor.append(propertyLeaf, toolbarLeaf);

    vi.spyOn(editor, "getBoundingClientRect").mockReturnValue({
      top: 0,
      right: 375,
      bottom: 812,
      left: 0,
      width: 375,
      height: 812,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });
    vi.spyOn(propertyLeaf, "getBoundingClientRect").mockReturnValue({
      top: 678,
      right: 363,
      bottom: 732,
      left: 12,
      width: 351,
      height: 54,
      x: 12,
      y: 678,
      toJSON: () => undefined,
    });
    vi.spyOn(toolbarLeaf, "getBoundingClientRect").mockReturnValue({
      top: 736,
      right: 363,
      bottom: 790,
      left: 12,
      width: 351,
      height: 54,
      x: 12,
      y: 736,
      toJSON: () => undefined,
    });

    expect(getToastBottomReservation(editor)).toBe(134);
  });

  it("measures desktop zoom and Help leaves as editor-local reservations", () => {
    const editor = document.createElement("div");
    const toolbarLeaf = document.createElement("div");
    const zoomLeaf = document.createElement("div");
    const helpLeaf = document.createElement("div");
    toolbarLeaf.dataset.viewportUi = "bottom";
    zoomLeaf.dataset.toastReservation = "bottom";
    helpLeaf.dataset.toastReservation = "bottom";
    editor.append(toolbarLeaf, zoomLeaf, helpLeaf);

    vi.spyOn(editor, "getBoundingClientRect").mockReturnValue({
      top: 0,
      right: 1440,
      bottom: 900,
      left: 0,
      width: 1440,
      height: 900,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });
    vi.spyOn(toolbarLeaf, "getBoundingClientRect").mockReturnValue({
      top: 800,
      right: 979,
      bottom: 850,
      left: 461,
      width: 518,
      height: 50,
      x: 461,
      y: 800,
      toJSON: () => undefined,
    });
    vi.spyOn(zoomLeaf, "getBoundingClientRect").mockReturnValue({
      top: 812,
      right: 190,
      bottom: 852,
      left: 16,
      width: 174,
      height: 40,
      x: 16,
      y: 812,
      toJSON: () => undefined,
    });
    vi.spyOn(helpLeaf, "getBoundingClientRect").mockReturnValue({
      top: 812,
      right: 1424,
      bottom: 852,
      left: 1384,
      width: 40,
      height: 40,
      x: 1384,
      y: 812,
      toJSON: () => undefined,
    });

    expect(getToastBottomReservation(editor)).toBe(100);
    const desktopRegionStart = toastStyles.indexOf(".ToastRegion {");
    const mobileOverrideStart = toastStyles.indexOf(
      "&.excalidraw--mobile .ToastRegion",
    );
    const desktopRegionRule = toastStyles.slice(
      desktopRegionStart,
      mobileOverrideStart === -1 ? undefined : mobileOverrideStart,
    );
    expect(desktopRegionRule).toContain("--toast-bottom-reservation");
  });

  it("pauses and resumes with remaining time", () => {
    const onClose = vi.fn();
    const { container } = renderDOM(
      <Toast message="Saved" duration={1000} onClose={onClose} />,
    );
    const toast = container.querySelector(".Toast")!;
    act(() => vi.advanceTimersByTime(400));
    fireEvent.pointerEnter(toast);
    act(() => vi.advanceTimersByTime(1000));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerLeave(toast);
    act(() => vi.advanceTimersByTime(599));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("bounds visible concurrency and drains in order", () => {
    const editor = document.createElement("div");
    document.body.append(editor);
    const onConsume = vi.fn();
    const { container, rerender, unmount } = renderRegion(editor, {
      toast: { message: "one", duration: 100 },
      onConsume,
    });
    rerender(
      <ExcalidrawContainerContext.Provider
        value={{ container: editor, id: "toast-test" }}
      >
        <ToastRegion
          toast={{ message: "two", duration: 100 }}
          onConsume={onConsume}
        />
      </ExcalidrawContainerContext.Provider>,
    );
    rerender(
      <ExcalidrawContainerContext.Provider
        value={{ container: editor, id: "toast-test" }}
      >
        <ToastRegion
          toast={{ message: "three", duration: 100 }}
          onConsume={onConsume}
        />
      </ExcalidrawContainerContext.Provider>,
    );
    expect(container.querySelectorAll(".Toast")).toHaveLength(2);
    expect(container.textContent).toContain("one");
    expect(container.textContent).toContain("two");
    expect(container.textContent).not.toContain("three");
    act(() => vi.advanceTimersByTime(100));
    expect(container.textContent).toContain("three");
    unmount();
    editor.remove();
  });

  it("retains two distinct same-turn imperative notifications in order", async () => {
    const view = await renderApp(<Excalidraw />);

    act(() => {
      window.h.app.api.setToast({ message: "first", duration: Infinity });
      window.h.app.api.setToast({ message: "second", duration: Infinity });
    });

    await waitFor(() =>
      expect(view.container.querySelectorAll(".Toast")).toHaveLength(2),
    );
    expect(
      Array.from(view.container.querySelectorAll(".Toast__message")).map(
        (node) => node.textContent,
      ),
    ).toEqual(["first", "second"]);
  });

  it("suppresses duplicates and manually dismisses once", () => {
    const editor = document.createElement("div");
    document.body.append(editor);
    const toast = { message: "same", duration: Infinity, closable: true };
    const onConsume = vi.fn();
    const view = renderRegion(editor, { toast, onConsume });
    view.rerender(
      <ExcalidrawContainerContext.Provider
        value={{ container: editor, id: "toast-test" }}
      >
        <ToastRegion toast={toast} onConsume={onConsume} />
      </ExcalidrawContainerContext.Provider>,
    );
    expect(view.container.querySelectorAll(".Toast")).toHaveLength(1);
    fireEvent.click(view.getByRole("button", { name: "close" }));
    expect(view.container.querySelectorAll(".Toast")).toHaveLength(0);
    view.unmount();
    editor.remove();
  });

  it("keeps each close control inside its card and dismisses only that entry", () => {
    const editor = document.createElement("div");
    document.body.append(editor);
    const onConsume = vi.fn();
    const view = renderRegion(editor, {
      toast: { message: "first closable", duration: Infinity, closable: true },
      onConsume,
    });
    view.rerender(
      <ExcalidrawContainerContext.Provider
        value={{ container: editor, id: "toast-test" }}
      >
        <ToastRegion
          toast={{
            message: "second closable",
            duration: Infinity,
            closable: true,
          }}
          onConsume={onConsume}
        />
      </ExcalidrawContainerContext.Provider>,
    );

    const cards = Array.from(view.container.querySelectorAll(".Toast"));
    const closeButtons = view.getAllByRole("button", { name: "close" });
    expect(cards).toHaveLength(2);
    expect(closeButtons[0].closest(".Toast")).toBe(cards[0]);
    expect(closeButtons[1].closest(".Toast")).toBe(cards[1]);
    expect(toastStyles).toMatch(/\.Toast\s*\{[\s\S]*?position:\s*relative;/);

    fireEvent.click(closeButtons[0]);
    fireEvent.click(closeButtons[0]);
    expect(view.container).not.toHaveTextContent("first closable");
    expect(view.container).toHaveTextContent("second closable");
    expect(view.container.querySelectorAll(".Toast")).toHaveLength(1);
    view.unmount();
    editor.remove();
  });

  it("pauses while the owning editor has a foreground modal", async () => {
    const editor = document.createElement("div");
    document.body.append(editor);
    const view = renderRegion(editor, {
      toast: { message: "paused", duration: 1000 },
      onConsume: vi.fn(),
    });
    act(() => vi.advanceTimersByTime(400));
    await act(async () => {
      editor.setAttribute("data-modal-open", "true");
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(view.container.textContent).toContain("paused");
    await act(async () => {
      editor.removeAttribute("data-modal-open");
      await Promise.resolve();
    });
    act(() => vi.advanceTimersByTime(599));
    expect(view.container.textContent).toContain("paused");
    act(() => vi.advanceTimersByTime(1));
    expect(view.container.textContent).not.toContain("paused");
    view.unmount();
    editor.remove();
  });

  it("pauses for focus and page visibility with remaining duration", async () => {
    const editor = document.createElement("div");
    document.body.append(editor);
    const view = renderRegion(editor, {
      toast: { message: "Accessible pause", duration: 1000, closable: true },
      onConsume: vi.fn(),
    });
    const toast = view.getByRole("status");
    act(() => vi.advanceTimersByTime(250));
    fireEvent.focus(view.getByRole("button", { name: "close" }));
    act(() => vi.advanceTimersByTime(1000));
    expect(view.container).toHaveTextContent("Accessible pause");
    fireEvent.blur(view.getByRole("button", { name: "close" }));
    act(() => vi.advanceTimersByTime(250));

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(1000));
    expect(view.container).toHaveTextContent("Accessible pause");
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(499));
    expect(view.container).toHaveTextContent("Accessible pause");
    act(() => vi.advanceTimersByTime(1));
    expect(view.container).not.toHaveTextContent("Accessible pause");
    expect(toast).not.toHaveAttribute("data-viewport-ui");
    view.unmount();
    editor.remove();
  });

  it("keeps one toast region and current entry across desktop-phone changes", async () => {
    mockBoundingClientRect({ width: 1440, height: 900 });
    const view = await renderApp(<Excalidraw />);
    act(() => {
      window.h.app.setState({
        toast: { message: "Responsive toast", duration: Infinity },
      });
    });
    const toast = await view.findByRole("status");
    const region = view.getByRole("region", { name: "Notifications" });
    expect(view.container.querySelectorAll(".ToastRegion")).toHaveLength(1);
    mockBoundingClientRect({ width: 375, height: 812 });
    fireEvent(window, new Event("resize"));
    await waitFor(() =>
      expect(view.container.querySelector(".excalidraw-container")).toHaveClass(
        "excalidraw--mobile",
      ),
    );
    expect(view.getByRole("status")).toBe(toast);
    expect(view.getByRole("region", { name: "Notifications" })).toBe(region);
    expect(view.container.querySelectorAll(".ToastRegion")).toHaveLength(1);
    restoreOriginalGetBoundingClientRect();
  });
});
