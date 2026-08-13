import { act, render, screen } from "@testing-library/react";

import { LoadingMessage } from "./LoadingMessage";

describe("LoadingMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps loading presentation absent until the owning delay completes", () => {
    const { unmount } = render(<LoadingMessage delay={250} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(249));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-app-content-state",
      "loading",
    );

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cleans the pending work when the owning presentation unmounts", () => {
    const { unmount } = render(<LoadingMessage delay={250} />);

    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels the owning delay when loading presentation becomes immediate", () => {
    const { rerender } = render(<LoadingMessage delay={250} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<LoadingMessage />);

    expect(screen.getByRole("status")).toHaveAccessibleName(/loading/i);
    expect(vi.getTimerCount()).toBe(0);
  });
});
