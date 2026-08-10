import React from "react";
import { act, render, screen } from "@testing-library/react";

import { usePhonePropertyLayout } from "./Actions";

const units = [
  { id: "stroke" },
  { id: "fill" },
  { id: "combined", required: true },
  { id: "undo", required: true },
  { id: "redo", required: true },
] as const;

describe("phone property measurement lifecycle", () => {
  let observerCallback: ResizeObserverCallback;
  let containerWidth: number;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    containerWidth = 351;
    originalResizeObserver = global.ResizeObserver;
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const width = this.hasAttribute("data-phone-property-container")
          ? containerWidth
          : this.hasAttribute("data-property-measure-id")
          ? 44
          : 0;
        return {
          width,
          height: 44,
          top: 0,
          right: width,
          bottom: 44,
          left: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      },
    );
    global.ResizeObserver = class ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    if (originalResizeObserver) {
      global.ResizeObserver = originalResizeObserver;
    } else {
      delete (global as any).ResizeObserver;
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const Harness = () => {
    const { containerRef, measurementRef, plan } =
      usePhonePropertyLayout(units);
    return (
      <div
        data-phone-property-container
        ref={containerRef}
        style={{ paddingInline: 8 }}
      >
        <div ref={measurementRef} style={{ columnGap: 6 }}>
          {units.map((unit) => (
            <span data-property-measure-id={unit.id} key={unit.id} />
          ))}
        </div>
        <output data-testid="phone-property-plan">
          {plan.directIds.join(",")}/{plan.combinedIds.join(",")}
        </output>
      </div>
    );
  };

  it("adopts valid geometry when animation frames are suspended", () => {
    render(<Harness />);
    expect(screen.getByTestId("phone-property-plan")).toHaveTextContent(
      "combined,undo,redo/stroke,fill",
    );

    act(() => vi.advanceTimersByTime(200));

    expect(screen.getByTestId("phone-property-plan")).toHaveTextContent(
      "stroke,fill,combined,undo,redo/",
    );
  });

  it("deduplicates observer bursts while a fallback read is pending", () => {
    render(<Harness />);

    act(() => {
      observerCallback([], {} as ResizeObserver);
      observerCallback([], {} as ResizeObserver);
      observerCallback([], {} as ResizeObserver);
    });
    act(() => vi.advanceTimersByTime(200));

    expect(screen.getByTestId("phone-property-plan")).toHaveTextContent(
      "stroke,fill,combined,undo,redo/",
    );
  });

  it("adopts a valid observer measurement after mounting at zero width", () => {
    containerWidth = 0;
    render(<Harness />);
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByTestId("phone-property-plan")).toHaveTextContent(
      "combined,undo,redo/stroke,fill",
    );

    containerWidth = 351;
    act(() => {
      observerCallback([], {} as ResizeObserver);
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("phone-property-plan")).toHaveTextContent(
      "stroke,fill,combined,undo,redo/",
    );
  });

  it("keeps the deterministic fallback when ResizeObserver is unavailable", () => {
    delete (global as any).ResizeObserver;

    render(<Harness />);
    act(() => vi.advanceTimersByTime(200));

    expect(screen.getByTestId("phone-property-plan")).toHaveTextContent(
      "combined,undo,redo/stroke,fill",
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores a stale observer callback after unmount", () => {
    const requestFrame = vi.mocked(window.requestAnimationFrame);
    const { unmount } = render(<Harness />);

    unmount();
    requestFrame.mockClear();

    act(() => observerCallback([], {} as ResizeObserver));

    expect(requestFrame).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
