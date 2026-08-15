import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import React from "react";
import { expectTypeOf, vi } from "vitest";

import type { EditorInterface } from "@excalidraw/common";

import {
  Excalidraw,
  Sidebar,
  WelcomeScreen,
  useEditorInterface,
} from "../../index";
import { API } from "../../tests/helpers/api";
import {
  act,
  fireEvent,
  mockBoundingClientRect,
  render,
  restoreOriginalGetBoundingClientRect,
  waitFor,
} from "../../tests/test-utils";

const { h } = window;
const sidebarStyles = readFileSync(
  resolve(process.cwd(), "packages/excalidraw/components/Sidebar/Sidebar.scss"),
  "utf8",
);
const welcomeStyles = readFileSync(
  resolve(
    process.cwd(),
    "packages/excalidraw/components/welcome-screen/WelcomeScreen.scss",
  ),
  "utf8",
);

describe("responsive editor shell App lifecycle", () => {
  const originalResizeObserver = global.ResizeObserver;
  const originalMatchMedia = window.matchMedia;
  const originalVisualViewport = window.visualViewport;
  const originalDocumentDirection =
    document.documentElement.getAttribute("dir");
  const observers: Array<{
    callback: ResizeObserverCallback;
    targets: Set<Element>;
  }> = [];

  beforeEach(() => {
    observers.length = 0;
    global.ResizeObserver = class ResizeObserver {
      private record: typeof observers[number];

      constructor(callback: ResizeObserverCallback) {
        this.record = { callback, targets: new Set() };
        observers.push(this.record);
      }

      observe(target: Element) {
        this.record.targets.add(target);
      }

      unobserve(target: Element) {
        this.record.targets.delete(target);
      }

      disconnect() {
        this.record.targets.clear();
      }
    };
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: originalVisualViewport,
    });
    if (originalDocumentDirection === null) {
      document.documentElement.removeAttribute("dir");
    } else {
      document.documentElement.setAttribute("dir", originalDocumentDirection);
    }
    restoreOriginalGetBoundingClientRect();
  });

  const notifyEditorResize = () => {
    const record = observers.find(({ targets }) =>
      Array.from(targets).some((target) =>
        target.classList.contains("excalidraw"),
      ),
    );
    expect(record).toBeDefined();
    act(() => record!.callback([], {} as ResizeObserver));
  };

  it("keeps the public editor-interface hook exact", () => {
    expectTypeOf(useEditorInterface).returns.toEqualTypeOf<EditorInterface>();
  });

  it("updates profile and adapter from a container-only resize", async () => {
    mockBoundingClientRect({ width: 1440, height: 900 });
    const { container } = await render(<Excalidraw />);

    notifyEditorResize();
    await waitFor(() => {
      expect(h.app.editorInterface.responsive).toMatchObject({
        tier: "desktop",
        adapter: "desktop",
        presentation: "full",
      });
    });
    expect(
      container.querySelector('.excalidraw[data-responsive-adapter="desktop"]'),
    ).not.toBeNull();
    expect(container.querySelector(".layer-ui__wrapper")).not.toBeNull();
    expect(container.querySelector(".mobile-menu")).toBeNull();

    mockBoundingClientRect({ width: 375, height: 812 });
    notifyEditorResize();

    await waitFor(() => {
      expect(h.app.editorInterface.responsive).toMatchObject({
        tier: "phone",
        adapter: "phone",
        presentation: "mobile",
      });
      expect(
        container.querySelector('.excalidraw[data-responsive-adapter="phone"]'),
      ).not.toBeNull();
      expect(container.querySelector(".layer-ui__wrapper")).toBeNull();
    });
  });

  it("renders the phone adapter when the first positive rect already matches App state", async () => {
    mockBoundingClientRect({ width: 375, height: 812 });
    const { container } = await render(<Excalidraw />);

    expect(h.state).toMatchObject({ width: 375, height: 812 });
    expect(h.app.editorInterface.responsive.adapter).toBe("desktop");
    expect(container.querySelector(".layer-ui__wrapper")).not.toBeNull();

    notifyEditorResize();

    await waitFor(() => {
      expect(h.app.editorInterface.responsive.adapter).toBe("phone");
      expect(
        container.querySelector('.excalidraw[data-responsive-adapter="phone"]'),
      ).not.toBeNull();
      expect(container.querySelector(".excalidraw--mobile")).not.toBeNull();
      expect(container.querySelector(".layer-ui__wrapper")).toBeNull();
      expect(
        container.querySelector('[data-canvas-ui-layout="phone"]'),
      ).not.toBeNull();
    });
  });

  it("retains the initial or last valid size profile through zero bounds", async () => {
    mockBoundingClientRect({ width: 0, height: 0 });
    await render(<Excalidraw />);

    expect(h.app.editorInterface.responsive).toMatchObject({
      tier: "desktop",
      adapter: "desktop",
      orientation: "landscape",
    });

    mockBoundingClientRect({ width: 375, height: 812 });
    notifyEditorResize();
    await waitFor(() =>
      expect(h.app.editorInterface.responsive.adapter).toBe("phone"),
    );

    const validProfile = h.app.editorInterface.responsive;
    mockBoundingClientRect({ width: 0, height: 0 });
    notifyEditorResize();
    expect(h.app.editorInterface.responsive).toBe(validProfile);

    mockBoundingClientRect({ width: 1024, height: 768 });
    notifyEditorResize();
    await waitFor(() =>
      expect(h.app.editorInterface.responsive).toMatchObject({
        tier: "tablet",
        adapter: "desktop",
      }),
    );
  });

  it("refreshes fixed-size direction, coarse input, safe area, and touch latch", async () => {
    const coarseListeners = new Set<(event: MediaQueryListEvent) => void>();
    let coarse = false;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return query === "(pointer: coarse)" ? coarse : false;
      },
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (
        _type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => coarseListeners.add(listener),
      removeEventListener: (
        _type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => coarseListeners.delete(listener),
      dispatchEvent: vi.fn(),
    }));
    const viewportListeners = new Set<EventListener>();
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        addEventListener: (_type: string, listener: EventListener) =>
          viewportListeners.add(listener),
        removeEventListener: (_type: string, listener: EventListener) =>
          viewportListeners.delete(listener),
      },
    });
    mockBoundingClientRect({ width: 1024, height: 768 });
    const view = await render(<Excalidraw langCode="__test__" />);
    notifyEditorResize();
    const editor = view.container.querySelector<HTMLElement>(".excalidraw")!;
    const initial = h.app.editorInterface.responsive;

    act(() => h.app.refreshEditorInterface());
    expect(h.app.editorInterface.responsive).toBe(initial);

    view.rerender(<Excalidraw langCode="ar-SA" />);
    await waitFor(() => {
      expect(h.app.editorInterface.responsive.direction).toBe("rtl");
      expect(editor).toHaveAttribute("dir", "rtl");
    });

    coarse = true;
    act(() => {
      coarseListeners.forEach((listener) =>
        listener({ matches: true } as MediaQueryListEvent),
      );
    });
    expect(h.app.editorInterface.responsive.density).toBe("touch");

    editor.style.setProperty("--sat", "1px");
    editor.style.setProperty("--sar", "2px");
    editor.style.setProperty("--sab", "3px");
    editor.style.setProperty("--sal", "4px");
    act(() =>
      viewportListeners.forEach((listener) => listener(new Event("resize"))),
    );
    expect(h.app.editorInterface.responsive.safeArea).toEqual({
      physical: { top: 1, right: 2, bottom: 3, left: 4 },
      logical: { blockStart: 1, inlineEnd: 4, blockEnd: 3, inlineStart: 2 },
    });

    coarse = false;
    act(() => {
      coarseListeners.forEach((listener) =>
        listener({ matches: false } as MediaQueryListEvent),
      );
    });
    expect(h.app.editorInterface.responsive.density).toBe("compact");

    fireEvent.pointerDown(view.container.querySelector("canvas.interactive")!, {
      pointerId: 71,
      pointerType: "pen",
      clientX: 200,
      clientY: 200,
    });
    expect(h.app.editorInterface.isTouchScreen).toBe(true);
    expect(h.app.editorInterface.responsive.density).toBe("touch");
    expect(h.state.penDetected).toBe(true);
  });

  it("cleans instance listeners and isolates simultaneous editor profiles", async () => {
    const coarseListeners = new Set<EventListener>();
    const removeCoarse = vi.fn((_type: string, listener: EventListener) =>
      coarseListeners.delete(listener),
    );
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(pointer: coarse)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_type: string, listener: EventListener) =>
        coarseListeners.add(listener),
      removeEventListener: removeCoarse,
      dispatchEvent: vi.fn(),
    }));
    mockBoundingClientRect({ width: 1440, height: 900 });
    const view = await render(
      <div>
        <Excalidraw UIOptions={{ getFormFactor: () => "desktop" }} />
        <Excalidraw UIOptions={{ getFormFactor: () => "phone" }} />
      </div>,
    );
    const editors = Array.from(
      view.container.querySelectorAll<HTMLElement>(
        ".excalidraw.excalidraw-container",
      ),
    );
    expect(editors).toHaveLength(2);

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    await waitFor(() => {
      expect(editors[0]).toHaveAttribute("data-responsive-adapter", "desktop");
      expect(editors[1]).toHaveAttribute("data-responsive-adapter", "phone");
    });
    expect(editors[0].dataset.responsiveSignature).not.toBe(
      editors[1].dataset.responsiveSignature,
    );

    view.unmount();
    expect(coarseListeners.size).toBe(0);
    expect(removeCoarse).toHaveBeenCalled();
    expect(observers.every(({ targets }) => targets.size === 0)).toBe(true);
  });

  it("isolates opposite-direction Sidebar placement and borders per editor", async () => {
    mockBoundingClientRect({ width: 1024, height: 768 });
    const view = await render(
      <div>
        <Excalidraw
          langCode="en"
          initialData={{ appState: { openSidebar: { name: "ltr" } } }}
        >
          <Sidebar name="ltr" className="ltr-sidebar">
            LTR
          </Sidebar>
        </Excalidraw>
        <Excalidraw
          langCode="ar-SA"
          initialData={{ appState: { openSidebar: { name: "rtl" } } }}
        >
          <Sidebar name="rtl" className="rtl-sidebar">
            RTL
          </Sidebar>
        </Excalidraw>
      </div>,
    );
    const editors = Array.from(
      view.container.querySelectorAll<HTMLElement>(
        ".excalidraw.excalidraw-container",
      ),
    );
    await waitFor(() => {
      expect(editors[0]).toHaveAttribute("dir", "ltr");
      expect(editors[1]).toHaveAttribute("dir", "rtl");
    });

    document.documentElement.setAttribute("dir", "ltr");
    const ltrSidebar = view.container.querySelector(".ltr-sidebar")!;
    const rtlSidebar = view.container.querySelector(".rtl-sidebar")!;
    expect(ltrSidebar.closest('.excalidraw[dir="ltr"]')).toBe(editors[0]);
    expect(rtlSidebar.closest('.excalidraw[dir="rtl"]')).toBe(editors[1]);
    expect(sidebarStyles).toContain('&[dir="rtl"] .sidebar');
    expect(sidebarStyles).toContain("left: var(--sidebar-safe-left, 0)");
    expect(sidebarStyles).toContain("right: auto");
    expect(sidebarStyles).toContain(
      "border-right: 1px solid var(--sidebar-border-color)",
    );
    expect(sidebarStyles).toContain("border-left: 0");
    expect(sidebarStyles).not.toContain(':root[dir="rtl"]');
  });

  it("uses the editor direction for the fixed-size welcome Help hint", async () => {
    mockBoundingClientRect({ width: 1440, height: 900 });
    const view = await render(
      <Excalidraw langCode="ar-SA">
        <WelcomeScreen />
      </Excalidraw>,
    );
    const editor = view.container.querySelector<HTMLElement>(
      ".excalidraw.excalidraw-container",
    )!;
    await waitFor(() => expect(editor).toHaveAttribute("dir", "rtl"));
    document.documentElement.setAttribute("dir", "ltr");

    const hint = view.container.querySelector<HTMLElement>(
      ".welcome-screen-decor-hint--help",
    )!;
    const arrow = hint.querySelector<SVGElement>("svg")!;
    expect(hint).not.toBeNull();
    expect(arrow).not.toBeNull();
    expect(hint.closest('.excalidraw[dir="rtl"]')).toBe(editor);
    expect(welcomeStyles).toContain('&[dir="rtl"]');
    expect(welcomeStyles).toContain("left: 0");
    expect(welcomeStyles).toContain("right: auto");
    expect(welcomeStyles).toContain("transform: rotate(80deg)");
    expect(welcomeStyles).not.toContain(':root[dir="rtl"]');
  });

  it("keeps domain state while context refreshes memoized surface consumers", async () => {
    mockBoundingClientRect({ width: 1440, height: 900 });
    const view = await render(<Excalidraw langCode="en" />);
    notifyEditorResize();
    const rectangle = API.createElement({ type: "rectangle" });
    act(() => h.app.setActiveTool({ type: "rectangle" }));
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);

    fireEvent.click(
      view.container.querySelector<HTMLButtonElement>(
        ".default-sidebar-trigger",
      )!,
    );
    await waitFor(() =>
      expect(view.container.querySelector(".sidebar")).not.toBeNull(),
    );

    act(() => h.app.setAppState({ openDialog: { name: "help" } }));
    const modal = await waitFor(() => {
      const node = view.container.querySelector<HTMLElement>(
        "[data-large-surface-positioner]",
      );
      expect(node).not.toBeNull();
      return node!;
    });
    const initialSignature = h.app.editorInterface.responsive.signature;

    view.rerender(<Excalidraw langCode="ar-SA" />);
    await waitFor(() => {
      expect(h.app.editorInterface.responsive.direction).toBe("rtl");
      expect(h.app.editorInterface.responsive.signature).not.toBe(
        initialSignature,
      );
    });

    expect(h.state.activeTool.type).toBe("rectangle");
    expect(h.state.selectedElementIds[rectangle.id]).toBe(true);
    expect(h.state.openSidebar).not.toBeNull();
    expect(h.state.openDialog).toEqual({ name: "help" });
    expect(modal).toHaveAttribute("data-large-surface-presentation");
    expect(
      view.container.querySelectorAll("[data-large-surface-positioner]"),
    ).toHaveLength(1);
    expect(
      view.container.querySelectorAll('[data-viewport-ui-name="stylesPanel"]'),
    ).toHaveLength(1);
  });

  it.each(["stylesPanel", "sidebar"] as const)(
    "validates hidden %s reservations against the complete profile",
    async (name) => {
      mockBoundingClientRect({ width: 1440, height: 900 });
      const view = await render(<Excalidraw langCode="en" />);
      notifyEditorResize();
      const editor = view.container.querySelector<HTMLElement>(
        ".excalidraw.excalidraw-container",
      )!;
      const editorRect = vi
        .spyOn(editor, "getBoundingClientRect")
        .mockReturnValue(new DOMRect(0, 0, 1440, 900));
      const leaf = document.createElement("div");
      leaf.dataset.viewportUi = "side";
      leaf.dataset.viewportUiName = name;
      editor.appendChild(leaf);
      vi.spyOn(leaf, "getBoundingClientRect").mockReturnValue(
        new DOMRect(1360, 20, 80.0004, 100),
      );

      expect(h.app.viewport.getOffsets({ padding: 0 }).right).toBeCloseTo(80);
      leaf.remove();
      expect(
        h.app.viewport.getOffsets({
          padding: 0,
          reserve: { [name]: true },
        }).right,
      ).toBeCloseTo(80);

      view.rerender(<Excalidraw langCode="ar-SA" />);
      await waitFor(() =>
        expect(h.app.editorInterface.responsive.direction).toBe("rtl"),
      );
      const rtl = h.app.viewport.getOffsets({
        padding: 0,
        reserve: { [name]: true },
      });
      expect(rtl.right).toBe(0);
      expect(rtl.left).toBe(name === "stylesPanel" ? 256 : 302);

      editorRect.mockReturnValue(new DOMRect(0, 0, 375, 812));
      notifyEditorResize();
      await waitFor(() =>
        expect(h.app.editorInterface.responsive.adapter).toBe("phone"),
      );
      expect(
        h.app.viewport.getOffsets({
          padding: 0,
          reserve: { [name]: true },
        }),
      ).toMatchObject({ right: 0, left: 0 });
    },
  );
});
