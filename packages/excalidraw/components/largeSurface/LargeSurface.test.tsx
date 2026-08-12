import { render } from "@testing-library/react";

import { Toast } from "../Toast";

import { LargeSurfaceFrame } from "./LargeSurface";

describe("LargeSurfaceFrame", () => {
  it("renders structured, marker-neutral presentation slots", () => {
    const { container } = render(
      <LargeSurfaceFrame
        kind="dialog"
        presentation="centered"
        density="compact"
        elevation="modal"
        header={<h2>Heading</h2>}
        description="Description"
        footer={<button>Finish</button>}
      >
        <div>Content</div>
      </LargeSurfaceFrame>,
    );
    const frame = container.querySelector("[data-large-surface]")!;

    expect(frame.getAttribute("role")).toBeNull();
    expect(frame.getAttribute("data-viewport-ui")).toBeNull();
    expect(frame.querySelector("[data-large-surface-header]")).not.toBeNull();
    expect(frame.querySelector("[data-large-surface-content]")).not.toBeNull();
    expect(frame.querySelector("[data-large-surface-footer]")).not.toBeNull();
    expect(frame.querySelector('[role="menu"]')).toBeNull();
  });

  it("adds only semantics explicitly owned by an adapter", () => {
    const { container } = render(
      <>
        <LargeSurfaceFrame
          kind="dialog"
          presentation="centered"
          density="compact"
          elevation="modal"
          role="dialog"
          aria-modal="true"
        >
          Dialog content
        </LargeSurfaceFrame>
        <LargeSurfaceFrame
          kind="sidebar"
          presentation="overlay"
          density="compact"
          elevation="raised"
        >
          Sidebar content
        </LargeSurfaceFrame>
        <Toast message="Saved" duration={Infinity} onClose={() => {}} />
      </>,
    );
    const surfaces = container.querySelectorAll("[data-large-surface]");
    const dialog = surfaces[0];
    const sidebar = surfaces[1];
    const toast = container.querySelector('[role="status"]')!;

    expect(dialog).toHaveAttribute("role", "dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(sidebar).not.toHaveAttribute("role");
    expect(sidebar).not.toHaveAttribute("aria-modal");
    expect(sidebar).not.toHaveAttribute("data-viewport-ui");
    expect(toast).toHaveAttribute("aria-live", "polite");
    expect(toast).not.toHaveAttribute("data-large-surface");
    expect(toast).not.toHaveAttribute("data-viewport-ui");
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });
});
