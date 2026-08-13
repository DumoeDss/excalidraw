import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";

import {
  AppContent,
  AppContentActionGroup,
  AppContentBody,
  AppContentFooter,
  AppContentHeader,
  AppContentSection,
  AppContentState,
} from "./AppContent";

describe("app content presentation", () => {
  it("provides a bounded, labelled hierarchy without claiming a viewport reservation", () => {
    const { container } = render(
      <AppContent density="touch" label="Application panel">
        <AppContentSection>
          <AppContentHeader title="Library" description="Reusable content" />
          <AppContentBody>Section content</AppContentBody>
          <AppContentFooter>
            <AppContentActionGroup label="Library actions">
              <button type="button">Load</button>
            </AppContentActionGroup>
          </AppContentFooter>
        </AppContentSection>
      </AppContent>,
    );

    const frame = screen.getByRole("region", { name: "Application panel" });
    expect(frame).toHaveAttribute("data-app-content", "");
    expect(frame).toHaveAttribute("data-app-content-density", "touch");
    expect(frame).toHaveAttribute("data-app-content-bounded", "true");
    expect(frame).not.toHaveAttribute("data-viewport-ui");
    expect(
      container.querySelector("[data-app-content-header]"),
    ).toHaveTextContent("LibraryReusable content");
    expect(
      container.querySelector("[data-app-content-body]"),
    ).toHaveTextContent("Section content");
    expect(
      container.querySelector("[data-app-content-footer]"),
    ).toContainElement(screen.getByRole("group", { name: "Library actions" }));
    expect(screen.getByRole("button", { name: "Load" })).toBeEnabled();
  });

  it.each(["loading", "empty", "error", "fallback"] as const)(
    "renders the %s state with its accessible copy and owned actions",
    (kind) => {
      render(
        <AppContentState
          kind={kind}
          title={`${kind} title`}
          message={`${kind} message`}
          actions={<button type="button">Try again</button>}
        />,
      );

      const state = screen.getByTestId(`app-content-state-${kind}`);
      expect(state).toHaveAttribute("data-app-content-state", kind);
      expect(state).toHaveAccessibleName(`${kind} title`);
      expect(state).toHaveTextContent(`${kind} message`);
      expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    },
  );

  it("consumes the existing semantic token layer without defining another one", () => {
    const styles = readFileSync(
      join(
        process.cwd(),
        "packages/excalidraw/components/appContent/AppContent.scss",
      ),
      "utf8",
    );

    expect(styles).toContain("var(--ui-space-5)");
    expect(styles).toContain("var(--ui-surface-panel)");
    expect(styles).toContain("var(--ui-border)");
    expect(styles).toContain("var(--ui-font-size-sm)");
    expect(styles).not.toMatch(/--ui-[\w-]+\s*:/);
    expect(styles).not.toContain("!important");
  });

  it("keeps the editor container a clipping boundary instead of a scrollable ancestor", () => {
    const editorStyles = readFileSync(
      join(process.cwd(), "packages/excalidraw/css/styles.scss"),
      "utf8",
    );

    expect(editorStyles).toMatch(
      /\.excalidraw \{[\s\S]*?position: relative;\s*overflow: clip;/,
    );
  });

  it("keeps contained div actions interactive while neutral frames expose only real leaves", () => {
    const onContainedAction = vi.fn();
    const onNeutralAction = vi.fn();

    const { container } = render(
      <>
        <AppContent label="Contained panel">
          <AppContentBody>
            <div role="button" tabIndex={0} onClick={onContainedAction}>
              Toggle details
            </div>
          </AppContentBody>
        </AppContent>
        <AppContent interaction="neutral" label="Neutral host">
          <AppContentActionGroup label="Host actions">
            <button type="button" onClick={onNeutralAction}>
              Open
            </button>
          </AppContentActionGroup>
        </AppContent>
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle details" }));
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(onContainedAction).toHaveBeenCalledTimes(1);
    expect(onNeutralAction).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("region", { name: "Contained panel" }),
    ).toHaveAttribute("data-app-content-interaction", "contained");
    expect(
      screen.getByRole("region", { name: "Neutral host" }),
    ).toHaveAttribute("data-app-content-interaction", "neutral");

    const styles = readFileSync(
      join(
        process.cwd(),
        "packages/excalidraw/components/appContent/AppContent.scss",
      ),
      "utf8",
    );
    expect(styles).toMatch(
      /\.app-content \{[\s\S]*?pointer-events: var\(--ui-pointerEvents, auto\);/,
    );
    expect(styles).toContain(
      '.app-content[data-app-content-interaction="neutral"]',
    );
    expect(container.querySelector("[data-viewport-ui]")).toBeNull();
  });

  it("does not expose raw class, style, event, or layout props", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "packages/excalidraw/components/appContent/AppContent.tsx",
      ),
      "utf8",
    );

    expect(source).not.toContain("HTMLAttributes");
    expect(source).not.toMatch(/\bclassName\??:/);
    expect(source).not.toMatch(/\bstyle\??:/);
    expect(source).not.toMatch(/\.\.\.rest/);
  });
});

describe("app content scope", () => {
  it("stays absent from the public package entry", () => {
    const publicEntry = readFileSync(
      join(process.cwd(), "packages/excalidraw/index.tsx"),
      "utf8",
    );

    expect(publicEntry).not.toMatch(/appContent|AppContent/);
  });

  it("leaves host, tunnel, surface, and delayed ownership contracts at their existing owners", () => {
    const layerUI = readFileSync(
      join(process.cwd(), "packages/excalidraw/components/LayerUI.tsx"),
      "utf8",
    );
    const tunnels = readFileSync(
      join(process.cwd(), "packages/excalidraw/context/tunnels.ts"),
      "utf8",
    );
    const surface = readFileSync(
      join(
        process.cwd(),
        "packages/excalidraw/components/largeSurface/LargeSurface.tsx",
      ),
      "utf8",
    );
    const ttdDialog = readFileSync(
      join(
        process.cwd(),
        "packages/excalidraw/components/TTDDialog/TTDDialog.tsx",
      ),
      "utf8",
    );
    const chatInterface = readFileSync(
      join(
        process.cwd(),
        "packages/excalidraw/components/TTDDialog/Chat/ChatInterface.tsx",
      ),
      "utf8",
    );
    const ttdInput = readFileSync(
      join(
        process.cwd(),
        "packages/excalidraw/components/TTDDialog/TTDDialogInput.tsx",
      ),
      "utf8",
    );
    const ttdStyles = readFileSync(
      join(
        process.cwd(),
        "packages/excalidraw/components/TTDDialog/TTDDialog.scss",
      ),
      "utf8",
    );

    expect(layerUI).toContain("{children}");
    expect(layerUI).toContain("<LoadingMessage delay={250} />");
    expect(layerUI).toContain("prevProps.children !== nextProps.children");
    expect(layerUI).toContain("renderTopRightUI?.(false, appState)");
    expect(tunnels).toContain("WelcomeScreenCenterTunnel: tunnel()");
    expect(surface).toContain("data-large-surface");
    expect(surface).not.toContain("AppContent");
    expect(ttdDialog).not.toContain("ttd-dialog-app-content");
    expect(chatInterface).toContain("focus({ preventScroll: true })");
    expect(chatInterface).toContain(
      "messagesContainer.scrollTop = messagesContainer.scrollHeight",
    );
    expect(chatInterface).not.toContain("scrollIntoView");
    expect(chatInterface).not.toContain("autoFocus");
    expect(ttdInput).toContain("focus({ preventScroll: true })");
    expect(ttdStyles).not.toMatch(/\d+(?:\.\d+)?(?:d|s|l)?v[hw]\b/i);
  });
});
