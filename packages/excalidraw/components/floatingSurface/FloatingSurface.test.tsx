import React from "react";
import { render, screen } from "@testing-library/react";

import {
  FloatingSurfaceBadge,
  FloatingSurfaceCheck,
  FloatingSurfaceChevron,
  FloatingSurfaceFrame,
  FloatingSurfaceHeading,
  FloatingSurfaceItemVisual,
  FloatingSurfaceScrollViewport,
  FloatingSurfaceSection,
  FloatingSurfaceSeparator,
  FloatingSurfaceShortcut,
} from "./FloatingSurface";

describe("floating surface presentation", () => {
  it.each(["theme--light", "theme--dark"])(
    "exposes kind, density, hierarchy, and carriers in %s",
    (theme) => {
      render(
        <div className={`excalidraw ${theme}`}>
          <FloatingSurfaceFrame kind="main-menu" density="compact">
            <FloatingSurfaceScrollViewport>
              <FloatingSurfaceSection data-testid="section">
                <FloatingSurfaceHeading>Heading</FloatingSurfaceHeading>
                <FloatingSurfaceItemVisual selected asChild>
                  <button type="button">
                    Item
                    <FloatingSurfaceCheck>check</FloatingSurfaceCheck>
                    <FloatingSurfaceBadge>badge</FloatingSurfaceBadge>
                    <FloatingSurfaceShortcut>Ctrl+K</FloatingSurfaceShortcut>
                    <FloatingSurfaceChevron>next</FloatingSurfaceChevron>
                  </button>
                </FloatingSurfaceItemVisual>
                <FloatingSurfaceSeparator data-testid="separator" />
              </FloatingSurfaceSection>
            </FloatingSurfaceScrollViewport>
          </FloatingSurfaceFrame>
        </div>,
      );

      const frame = document.querySelector("[data-floating-surface]");
      expect(frame).toHaveAttribute("data-surface-kind", "main-menu");
      expect(frame).toHaveAttribute("data-surface-density", "compact");
      expect(screen.getByRole("button", { name: /Item/ })).toHaveAttribute(
        "data-selected",
        "true",
      );
      expect(screen.getByTestId("separator")).toHaveAttribute(
        "role",
        "separator",
      );
      expect(screen.getByTestId("section")).toContainElement(
        screen.getByText("Heading"),
      );
      expect(screen.getByText("Ctrl+K")).toHaveClass(
        "floating-surface__shortcut",
      );
    },
  );

  it("keeps distinct semantic visual states on the adapter element", () => {
    render(
      <FloatingSurfaceItemVisual
        checked
        destructive
        disabled
        highlighted
        open
        selected
        asChild
      >
        <button type="button">Stateful item</button>
      </FloatingSurfaceItemVisual>,
    );

    expect(screen.getByRole("button")).toMatchObject({
      dataset: expect.objectContaining({
        checked: "true",
        destructive: "true",
        disabled: "true",
        highlighted: "true",
        open: "true",
        selected: "true",
      }),
    });
  });
});
