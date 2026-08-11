import React, { useState } from "react";
import { act, render } from "@testing-library/react";
import { vi } from "vitest";

import { useFloatingSurfaceOwner } from "./owner";

const Owner = ({
  identity,
  open,
  eligible = true,
  onOpenChange,
  onReady,
}: {
  identity: string;
  open: boolean;
  eligible?: boolean;
  onOpenChange: (open: boolean) => void;
  onReady?: (scheduleFocus: (focus: () => void) => void) => void;
}) => {
  const owner = useFloatingSurfaceOwner({
    scope: "lifecycle-test",
    identity,
    open,
    eligible,
    onOpenChange,
  });
  onReady?.(owner.scheduleFocus);
  return null;
};

describe("floating surface owner lifecycle", () => {
  it("closes when eligibility or anchor ownership is lost", () => {
    const onOpenChange = vi.fn();
    const view = render(
      <Owner identity="property" open eligible onOpenChange={onOpenChange} />,
    );
    view.rerender(
      <Owner
        identity="property"
        open
        eligible={false}
        onOpenChange={onOpenChange}
      />,
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("cancels scheduled focus when the owner unmounts", () => {
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const onOpenChange = vi.fn();
    let scheduleFocus: ((focus: () => void) => void) | undefined;
    const view = render(
      <Owner
        identity="picker"
        open
        onOpenChange={onOpenChange}
        onReady={(schedule) => {
          scheduleFocus = schedule;
        }}
      />,
    );
    act(() => scheduleFocus?.(() => {}));
    view.unmount();
    expect(cancel).toHaveBeenCalled();
    cancel.mockRestore();
  });

  it("does not let obsolete queued cleanup close a replacement", () => {
    const queued: VoidFunction[] = [];
    const queueSpy = vi
      .spyOn(globalThis, "queueMicrotask")
      .mockImplementation((callback) => queued.push(callback));
    const close = vi.fn();

    const Harness = () => {
      const [replacement, setReplacement] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setReplacement(true)}>
            Replace
          </button>
          <Owner
            key={replacement ? "new" : "old"}
            identity="same-identity"
            open
            onOpenChange={close}
          />
        </>
      );
    };

    try {
      const view = render(<Harness />);
      act(() => view.getByRole("button").click());
      act(() => queued.splice(0).forEach((callback) => callback()));
      expect(close).not.toHaveBeenCalled();
      view.unmount();
    } finally {
      queueSpy.mockRestore();
    }
  });
});
