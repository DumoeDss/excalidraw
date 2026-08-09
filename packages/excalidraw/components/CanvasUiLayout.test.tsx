import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import React from "react";
import { render } from "@testing-library/react";

import * as publicApi from "../index";

import { CanvasUiLayout } from "./CanvasUiLayout";

const layoutStyles = readFileSync(
  resolve(process.cwd(), "packages/excalidraw/components/CanvasUiLayout.scss"),
  "utf8",
);

const ZONES = [
  "top-start",
  "top-center",
  "top-end",
  "bottom-start",
  "bottom-center",
  "bottom-end",
] as const;

describe("CanvasUiLayout", () => {
  it.each(["desktop", "phone"] as const)(
    "renders six stable logical zones in %s mode",
    (mode) => {
      const { container } = render(
        <CanvasUiLayout
          mode={mode}
          zones={{
            topStart: <span>start content</span>,
            topCenter: <span>center content</span>,
            topEnd: <span>end content</span>,
            bottomCenter: <span>bottom content</span>,
          }}
        />,
      );

      const layout = container.querySelector(
        `[data-canvas-ui-layout="${mode}"]`,
      );
      expect(layout).not.toBeNull();

      const zones = Array.from(
        container.querySelectorAll<HTMLElement>("[data-canvas-ui-zone]"),
      );
      const rows = Array.from(
        container.querySelectorAll<HTMLElement>("[data-canvas-ui-row]"),
      );
      const contents = Array.from(
        container.querySelectorAll<HTMLElement>(".canvas-ui-layout__content"),
      );
      expect(zones.map((zone) => zone.dataset.canvasUiZone)).toEqual(ZONES);
      expect(zones).toHaveLength(6);
      expect(
        container.querySelector('[data-canvas-ui-zone="bottom-start"]'),
      ).toBeEmptyDOMElement();
      expect(
        container.querySelector('[data-canvas-ui-zone="bottom-end"]'),
      ).toBeEmptyDOMElement();

      for (const shellNode of [layout, ...rows, ...zones, ...contents]) {
        expect(shellNode).not.toHaveAttribute("data-viewport-ui");
        expect(shellNode).not.toHaveAttribute("data-viewport-ui-name");
      }
    },
  );

  it("keeps logical zone identity in an RTL container", () => {
    const { container } = render(
      <div dir="rtl">
        <CanvasUiLayout
          mode="desktop"
          zones={{
            topStart: <span>logical start</span>,
            topEnd: <span>logical end</span>,
          }}
        />
      </div>,
    );

    expect(
      container.querySelector('[data-canvas-ui-zone="top-start"]'),
    ).toHaveTextContent("logical start");
    expect(
      container.querySelector('[data-canvas-ui-zone="top-end"]'),
    ).toHaveTextContent("logical end");
  });

  it.each(["ltr", "rtl"] as const)(
    "keeps asymmetric safe areas on their physical edges in %s",
    (direction) => {
      const { container } = render(
        <div
          className="excalidraw"
          dir={direction}
          style={
            {
              "--editor-container-padding": "12px",
              "--sal": "20px",
              "--sar": "4px",
            } as React.CSSProperties
          }
        >
          <CanvasUiLayout mode="phone" zones={{}} />
        </div>,
      );

      expect(container.firstElementChild).toHaveAttribute("dir", direction);
      expect(layoutStyles).toContain(
        "left: calc(var(--editor-container-padding) + var(--sal));",
      );
      expect(layoutStyles).toContain(
        "right: calc(var(--editor-container-padding) + var(--sar));",
      );
      expect(layoutStyles).toContain("left: var(--sal);");
      expect(layoutStyles).toContain("right: var(--sar);");
      expect(layoutStyles).not.toContain("inset-inline-start");
      expect(layoutStyles).not.toContain("inset-inline-end");
    },
  );

  it("keeps populated wrappers transparent and constrains only docked desktop mode", () => {
    const { container } = render(
      <div
        className="excalidraw"
        style={{ "--right-sidebar-width": "302px" } as React.CSSProperties}
      >
        <CanvasUiLayout
          mode="desktop"
          dockedSidebar
          zones={{ bottomCenter: <button type="button">desktop</button> }}
        />
        <CanvasUiLayout
          mode="phone"
          dockedSidebar
          zones={{ bottomCenter: <button type="button">phone</button> }}
        />
      </div>,
    );

    const desktop = container.querySelector<HTMLElement>(
      '[data-canvas-ui-layout="desktop"]',
    )!;
    const phone = container.querySelector<HTMLElement>(
      '[data-canvas-ui-layout="phone"]',
    )!;

    expect(desktop).toHaveClass("canvas-ui-layout--docked-sidebar");
    expect(layoutStyles).toContain(
      "width: calc(100% - var(--right-sidebar-width));",
    );
    expect(phone).not.toHaveClass("canvas-ui-layout--docked-sidebar");

    for (const content of container.querySelectorAll<HTMLElement>(
      ".canvas-ui-layout__content",
    )) {
      expect(content).not.toHaveAttribute("style");
    }
    expect(layoutStyles).toContain("pointer-events: none;");
  });

  it("stays internal to the package", () => {
    expect("CanvasUiLayout" in publicApi).toBe(false);
  });
});
