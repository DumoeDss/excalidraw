import { act } from "@testing-library/react";
import { vi } from "vitest";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { getDefaultAppState } from "../../appState";
import { API } from "../../tests/helpers/api";

import { getTooltipDiv } from "../Tooltip";

import { hideHyperlinkToolip, showHyperlinkTooltip } from "./Hyperlink";

import type { AppState } from "../../types";

describe("hyperlink tooltip ownership", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("keeps the bridge inside its explicit editor and clamps to its edge", () => {
    const editor = document.createElement("div");
    editor.className = "excalidraw excalidraw-container";
    document.body.append(editor);
    vi.spyOn(editor, "getBoundingClientRect").mockReturnValue({
      top: 50,
      right: 475,
      bottom: 350,
      left: 100,
      width: 375,
      height: 300,
      x: 100,
      y: 50,
      toJSON: () => undefined,
    });

    const baseElement = API.createElement({
      type: "rectangle",
      x: 350,
      y: 20,
      width: 100,
      height: 100,
    });
    const element = {
      ...baseElement,
      link: "https://example.com",
    } as NonDeletedExcalidrawElement;
    const appState = {
      ...getDefaultAppState(),
      offsetLeft: 100,
      offsetTop: 50,
      width: 375,
      height: 300,
    } as AppState;

    showHyperlinkTooltip(
      element,
      appState,
      new Map([[element.id, element]]),
      editor,
    );
    act(() => vi.runOnlyPendingTimers());

    const tooltip = getTooltipDiv(editor);
    expect(tooltip.parentElement).toBe(editor);
    expect(document.body.querySelector(":scope > .excalidraw-tooltip")).toBe(
      null,
    );
    expect(tooltip).toHaveClass("excalidraw-tooltip--visible");
    expect(tooltip).not.toHaveAttribute("hidden");
    expect(Number.parseFloat(tooltip.style.left)).toBeLessThanOrEqual(367);
    expect(tooltip.style.top).not.toBe("");

    hideHyperlinkToolip(editor);
    expect(tooltip).not.toHaveClass("excalidraw-tooltip--visible");
    expect(tooltip).toHaveAttribute("hidden");
    expect(tooltip.textContent).toBe("");
  });

  it("does not reuse or clear another editor's bridge", () => {
    const firstEditor = document.createElement("div");
    const secondEditor = document.createElement("div");
    firstEditor.className = "excalidraw excalidraw-container";
    secondEditor.className = "excalidraw excalidraw-container";
    document.body.append(firstEditor, secondEditor);

    const first = getTooltipDiv(firstEditor);
    const second = getTooltipDiv(secondEditor);
    first.classList.add("excalidraw-tooltip--visible");
    second.classList.add("excalidraw-tooltip--visible");

    expect(first).not.toBe(second);
    expect(first.parentElement).toBe(firstEditor);
    expect(second.parentElement).toBe(secondEditor);
    hideHyperlinkToolip(firstEditor);
    expect(first).not.toHaveClass("excalidraw-tooltip--visible");
    expect(second).toHaveClass("excalidraw-tooltip--visible");
  });
});
