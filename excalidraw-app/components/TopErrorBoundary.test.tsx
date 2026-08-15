import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TopErrorBoundary } from "./TopErrorBoundary";

const { compileString } = createRequire(import.meta.url)("sass") as {
  compileString: (source: string) => { css: string };
};

const stylesPath = resolve(
  process.cwd(),
  "packages/excalidraw/css/styles.scss",
);
const stylesSource = readFileSync(stylesPath, "utf8");
const recoveryStylesStart = stylesSource.indexOf(".ErrorSplash.excalidraw");
const recoveryStyles = stylesSource.slice(
  recoveryStylesStart,
  stylesSource.indexOf(
    ".excalidraw__embeddable-container",
    recoveryStylesStart,
  ),
);
const excalidrawStyles = compileString(
  recoveryStyles
    .replaceAll("var(--ui-space-5)", "1rem")
    .replaceAll("var(--ui-space-7)", "1.75rem")
    .replace(
      ".ErrorSplash.excalidraw",
      ".test-viewport .ErrorSplash.excalidraw",
    ),
).css;

vi.mock("@sentry/browser", () => ({
  captureException: () => "event-1",
  withScope: (callback: (scope: { setExtras: () => void }) => void) =>
    callback({ setExtras: () => {} }),
}));

const BrokenLeaf = () => {
  throw new Error("broken outside editor");
};

const matchingRuleValue = (element: Element, property: string) => {
  const rules = Array.from(document.styleSheets).flatMap((sheet) =>
    Array.from(sheet.cssRules),
  );

  return rules.reduce((value, rule) => {
    if (
      rule instanceof CSSStyleRule &&
      element.matches(rule.selectorText) &&
      rule.style.getPropertyValue(property)
    ) {
      return rule.style.getPropertyValue(property).trim();
    }

    return value;
  }, "");
};

const readPixels = (element: Element, property: string) => {
  const rawValue =
    matchingRuleValue(element, property) ||
    matchingRuleValue(element, property.replace(/-(left|right)$/, ""));
  const variable = rawValue.match(/^var\((--[\w-]+)/)?.[1];
  const value = variable
    ? matchingRuleValue(document.documentElement, variable)
    : rawValue;

  if (value.endsWith("rem")) {
    return Number.parseFloat(value) * 16;
  }

  return Number.parseFloat(value) || 0;
};

const measureRecoveryInlineBounds = (
  splash: HTMLElement,
  card: HTMLElement,
  viewportInlineSize: number,
) => {
  const splashBoxSizing =
    matchingRuleValue(splash, "box-sizing") || "content-box";
  const splashPadding =
    readPixels(splash, "padding-left") + readPixels(splash, "padding-right");
  const splashBorder =
    readPixels(splash, "border-left-width") +
    readPixels(splash, "border-right-width");
  const splashWidth =
    viewportInlineSize +
    (splashBoxSizing === "border-box" ? 0 : splashPadding + splashBorder);
  const splashContentWidth =
    splashBoxSizing === "border-box"
      ? splashWidth - splashPadding - splashBorder
      : viewportInlineSize;
  const cardStart = readPixels(splash, "padding-left");
  const cardBoxSizing = matchingRuleValue(card, "box-sizing") || "content-box";
  const cardPadding =
    readPixels(card, "padding-left") + readPixels(card, "padding-right");
  const cardBorder =
    readPixels(card, "border-left-width") +
    readPixels(card, "border-right-width");
  const requestedCardWidth =
    splashContentWidth +
    (cardBoxSizing === "border-box" ? 0 : cardPadding + cardBorder);
  const cardWidth = Math.min(requestedCardWidth, splashContentWidth);

  return {
    splash: { left: 0, right: splashWidth },
    card: { left: cardStart, right: cardStart + cardWidth },
  };
};

describe("TopErrorBoundary", () => {
  it("keeps the recovery splash and card inside a 375px viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 375,
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { container } = render(
      <>
        <style>{excalidrawStyles}</style>
        <div className="test-viewport">
          <TopErrorBoundary>
            <BrokenLeaf />
          </TopErrorBoundary>
        </div>
      </>,
    );
    consoleError.mockRestore();

    const splash = container.querySelector<HTMLElement>(
      ".ErrorSplash.excalidraw",
    );
    const card = container.querySelector<HTMLElement>(
      ".ErrorSplash-messageContainer",
    );
    expect(splash).not.toBeNull();
    expect(card).not.toBeNull();

    const bounds = measureRecoveryInlineBounds(
      splash!,
      card!,
      window.innerWidth,
    );

    expect(bounds.splash.right).toBeLessThanOrEqual(375);
    expect(bounds.card.right).toBeLessThanOrEqual(375);
  });

  it("renders recovery content without an editor context", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <TopErrorBoundary>
        <BrokenLeaf />
      </TopErrorBoundary>,
    );

    expect(screen.getByRole("main", { name: /error/i })).toHaveAttribute(
      "data-app-content-bounded",
      "true",
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("readonly");
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(() =>
      JSON.parse((screen.getByRole("textbox") as HTMLTextAreaElement).value),
    ).not.toThrow();

    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    fireEvent.click(buttons[2]);
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith(
        expect.stringContaining("github.com/excalidraw/excalidraw/issues/new"),
        "_blank",
        "noopener noreferrer",
      ),
    );
    open.mockRestore();

    consoleError.mockRestore();
  });

  it("retains the 762px recovery card when desktop space permits", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1440,
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { container } = render(
      <>
        <style>{excalidrawStyles}</style>
        <div className="test-viewport">
          <TopErrorBoundary>
            <BrokenLeaf />
          </TopErrorBoundary>
        </div>
      </>,
    );
    consoleError.mockRestore();

    const card = container.querySelector<HTMLElement>(
      ".ErrorSplash-messageContainer",
    )!;
    const cardInlineSize = matchingRuleValue(card, "inline-size");
    expect(cardInlineSize).toContain("47.5rem + 2px");
    expect(47.5 * 16 + 2).toBe(762);
  });
});
