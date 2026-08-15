import React, { useState } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";

import { useFloatingSurfaceAvailableBlockSize } from "./useFloatingSurfaceAvailableBlockSize";

const rect = (top: number, bottom: number, width = 375): DOMRect => ({
  bottom,
  height: bottom - top,
  left: 0,
  right: width,
  top,
  width,
  x: 0,
  y: top,
  toJSON: () => ({}),
});

const Harness = () => {
  const [boundary, setBoundary] = useState<HTMLDivElement | null>(null);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const availableBlockSize = useFloatingSurfaceAvailableBlockSize({
    boundary,
    frame,
    padding: { top: 8, bottom: 8 },
  });

  return (
    <div className="test-boundary" ref={setBoundary}>
      <div className="test-frame" ref={setFrame} />
      <div className="test-reservation" data-viewport-ui="bottom" />
      <output data-testid="available-block-size">{availableBlockSize}</output>
    </div>
  );
};

describe("floating surface available block-size measurement", () => {
  const OriginalResizeObserver = globalThis.ResizeObserver;
  const observers: Array<{
    callback: ResizeObserverCallback;
    observer: ResizeObserver;
  }> = [];
  let reservationTop = 670;

  beforeEach(() => {
    reservationTop = 670;
    observers.length = 0;
    globalThis.ResizeObserver = class ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        observers.push({ callback, observer: this });
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    globalThis.ResizeObserver = OriginalResizeObserver;
    vi.restoreAllMocks();
  });

  it("tracks the nearest persistent bottom reservation inside the editor", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.classList.contains("test-boundary")) {
          return rect(0, 812);
        }
        if (this.classList.contains("test-frame")) {
          return rect(52, 662, 232);
        }
        if (this.classList.contains("test-reservation")) {
          return rect(reservationTop, reservationTop + 62, 351);
        }
        return rect(0, 0, 0);
      },
    );

    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("available-block-size")).toHaveTextContent(
        "610",
      ),
    );

    reservationTop = 600;
    act(() => {
      for (const { callback, observer } of observers) {
        callback([], observer);
      }
    });
    await waitFor(() =>
      expect(screen.getByTestId("available-block-size")).toHaveTextContent(
        "540",
      ),
    );
  });
});
