import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import React from "react";
import { act, render, screen } from "@testing-library/react";

import {
  createToolbarUnits,
  planToolbarLayout,
  resolveToolbarItems,
  useAdaptiveToolbarLayout,
} from "./adaptiveToolbar";

import type {
  ToolbarLayoutCandidate,
  ToolbarResolveContext,
  ToolbarUnit,
} from "./adaptiveToolbar";

const toolbarStyles = readFileSync(
  resolve(
    process.cwd(),
    "packages/excalidraw/components/AdaptiveEditorToolbar.scss",
  ),
  "utf8",
).replace(/\s+/g, " ");

const context = (
  overrides: Partial<ToolbarResolveContext> = {},
): ToolbarResolveContext => ({
  activeToolType: "selection",
  preferredSelectionToolType: "selection",
  toolOptions: {} as ToolbarResolveContext["toolOptions"],
  forcedToolType: null,
  isFullStylesPanel: true,
  isCollaborating: false,
  hasGenerator: true,
  aiEnabled: true,
  hasDiagramToCode: true,
  ...overrides,
});

describe("adaptive toolbar inventory", () => {
  it("resolves one ordered presentation-neutral inventory", () => {
    const inventory = resolveToolbarItems(context());
    const project = (items: typeof inventory) =>
      items.map(({ id, group, selected, disabled, shortcut, activation }) => ({
        id,
        group,
        selected,
        disabled,
        shortcut,
        activation,
      }));

    expect(project(inventory)).toHaveLength(inventory.length);
    expect(createToolbarUnits(inventory).map((unit) => unit.id)).toEqual([
      "selection",
      "upload",
      "shapes",
      "drawing",
      "text",
      "eraser",
      "generate-image",
      "generate-video",
      "extra",
    ]);
  });

  it("preserves host, configuration, selection, collaboration, media, and AI policy", () => {
    const items = resolveToolbarItems(
      context({
        activeToolType: "laser",
        preferredSelectionToolType: "lasso",
        toolOptions: { image: false },
        forcedToolType: "laser",
        isFullStylesPanel: false,
        isCollaborating: true,
      }),
    );

    expect(items.find((item) => item.id === "tool:image")).toBeUndefined();
    expect(items.find((item) => item.id === "tool:video")).toBeDefined();
    expect(items.find((item) => item.id === "tool:audio")).toBeDefined();
    expect(items.find((item) => item.id === "tool:lasso")).toBeDefined();
    expect(items.find((item) => item.id === "tool:laser")).toMatchObject({
      selected: true,
      projectedSelected: false,
      disabled: false,
    });
    expect(
      resolveToolbarItems(
        context({ activeToolType: "laser", isCollaborating: false }),
      ).find((item) => item.id === "tool:laser"),
    ).toMatchObject({ selected: true, projectedSelected: true });
    expect(items.find((item) => item.id === "tool:rectangle")?.disabled).toBe(
      true,
    );
    expect(items.find((item) => item.id === "tool:autoshape")).toBeDefined();
    expect(items.find((item) => item.id === "tool:bucketfill")).toBeDefined();
    expect(
      items.find((item) => item.id === "action:generate-image"),
    ).toBeDefined();
    expect(
      items.find((item) => item.id === "action:diagram-to-code"),
    ).toBeDefined();
  });
});

describe("adaptive toolbar interaction surface", () => {
  it("keeps shells pointer-neutral and opts in only interactive leaves", () => {
    expect(toolbarStyles).toMatch(
      /\.adaptive-toolbar-shell \{[^}]*pointer-events: none;/,
    );
    expect(toolbarStyles).toContain(
      ':where(button, input, select, textarea, a[href], [role="button"]) { pointer-events: var(--ui-pointerEvents);',
    );
    expect(toolbarStyles).toMatch(
      /\.App-bottom-bar > \.Island\.adaptive-toolbar-shell \{[^}]*pointer-events: none;[^}]*overflow: clip;/,
    );
    expect(toolbarStyles).not.toMatch(
      /\.layer-ui__bottom-center-stack \{[^}]*> \* \{[^}]*pointer-events:/,
    );
    expect(toolbarStyles).toContain(
      "--radix-dropdown-menu-content-available-height",
    );
    expect(toolbarStyles).toContain("&.adaptive-editor-toolbar__menu--phone");
    expect(toolbarStyles).toContain("z-index: 3;");
  });
});

describe("adaptive toolbar planner", () => {
  const candidates: readonly ToolbarLayoutCandidate[] = [
    { id: "selection", width: 36, required: true },
    { id: "shapes", width: 36 },
    { id: "drawing", width: 36 },
  ];

  it("keeps an exact fit and overflows deterministically at one pixel less", () => {
    expect(
      planToolbarLayout({
        candidates,
        availableWidth: 116,
        gap: 4,
        overflowTriggerWidth: 28,
      }),
    ).toEqual({
      primaryIds: ["selection", "shapes", "drawing"],
      overflowIds: [],
    });
    expect(
      planToolbarLayout({
        candidates,
        availableWidth: 115,
        gap: 4,
        overflowTriggerWidth: 28,
      }),
    ).toEqual({
      primaryIds: ["selection", "shapes"],
      overflowIds: ["drawing"],
    });
  });

  it("preserves relative order, required group boundaries, and zero-width fallback", () => {
    const grouped = [
      candidates[0],
      candidates[1],
      { ...candidates[2], required: true },
      { id: "extra", width: 36 },
    ];
    const fallback = planToolbarLayout({
      candidates: grouped,
      availableWidth: 0,
      gap: 4,
      overflowTriggerWidth: 28,
    });
    expect(fallback).toEqual({
      primaryIds: ["selection", "shapes", "drawing"],
      overflowIds: ["extra"],
    });
  });
});

describe("adaptive toolbar measurement lifecycle", () => {
  let width = 116;
  let candidateWidths: Record<string, number>;
  let observerCallback: ResizeObserverCallback;
  let disconnected = false;
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    width = 116;
    candidateWidths = {
      selection: 36,
      shapes: 36,
      drawing: 36,
    };
    disconnected = false;
    frames = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const candidateId = this.getAttribute("data-toolbar-measure-id");
        const measuredWidth = this.hasAttribute("data-container")
          ? width
          : this.hasAttribute("data-toolbar-measure-overflow")
          ? 28
          : candidateId
          ? candidateWidths[candidateId]
          : 0;
        return {
          width: measuredWidth,
          height: 36,
          top: 0,
          right: measuredWidth,
          bottom: 36,
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
      disconnect() {
        disconnected = true;
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const units: readonly ToolbarUnit[] = [
    { id: "selection", items: [], required: true },
    { id: "shapes", items: [], required: false },
    { id: "drawing", items: [], required: false },
  ];

  const Harness = () => {
    const { containerRef, measurementRef, primaryUnits, overflowUnits } =
      useAdaptiveToolbarLayout(units);
    return (
      <div ref={containerRef} data-container style={{ padding: 0 }}>
        <div ref={measurementRef} style={{ columnGap: 4 }}>
          {units.map((unit) => (
            <span data-toolbar-measure-id={unit.id} key={unit.id} />
          ))}
          <span data-toolbar-measure-overflow />
        </div>
        <output data-testid="plan">
          {primaryUnits.map((unit) => unit.id).join(",")}/
          {overflowUnits.map((unit) => unit.id).join(",")}
        </output>
      </div>
    );
  };

  const flushFrame = () => {
    const callback = frames.shift();
    callback?.(performance.now());
  };

  it("batches notifications, responds to container-only resize, and cleans up", () => {
    const view = render(<Harness />);
    act(flushFrame);
    expect(screen.getByTestId("plan")).toHaveTextContent(
      "selection,shapes,drawing/",
    );

    width = 115;
    act(() => {
      observerCallback([], {} as ResizeObserver);
      observerCallback([], {} as ResizeObserver);
      observerCallback([], {} as ResizeObserver);
    });
    expect(frames).toHaveLength(1);
    act(flushFrame);
    expect(screen.getByTestId("plan")).toHaveTextContent(
      "selection,shapes/drawing",
    );

    act(() => observerCallback([], {} as ResizeObserver));
    expect(frames).toHaveLength(1);
    view.unmount();
    expect(disconnected).toBe(true);
    expect(() => flushFrame()).not.toThrow();
  });

  it("invalidates from intrinsic control geometry while container width stays fixed", () => {
    render(<Harness />);
    act(flushFrame);
    expect(screen.getByTestId("plan")).toHaveTextContent(
      "selection,shapes,drawing/",
    );

    candidateWidths.drawing = 37;
    act(() => observerCallback([], {} as ResizeObserver));
    act(flushFrame);

    expect(screen.getByTestId("plan")).toHaveTextContent(
      "selection,shapes/drawing",
    );
  });
});
