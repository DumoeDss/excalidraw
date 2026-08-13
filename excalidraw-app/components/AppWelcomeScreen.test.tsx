import { fireEvent, render, screen } from "@testing-library/react";

import { EditorJotaiProvider } from "@excalidraw/excalidraw/editor-jotai";

import { AppWelcomeScreen } from "./AppWelcomeScreen";

vi.mock("@excalidraw/excalidraw/index", () => {
  const WelcomeScreen = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  const Center = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="welcome-center">{children}</div>
  );
  Center.Logo = () => <div>Logo</div>;
  Center.Heading = ({ children }: { children: React.ReactNode }) => (
    <h1>{children}</h1>
  );
  Center.Menu = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  Center.MenuItemLoadScene = () => <button type="button">Open</button>;
  Center.MenuItemHelp = () => <button type="button">Help</button>;
  Center.MenuItemLiveCollaborationTrigger = ({
    onSelect,
  }: {
    onSelect: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      Live collaboration...
    </button>
  );
  Center.MenuItemLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  WelcomeScreen.Center = Center;
  WelcomeScreen.Hints = {
    MenuHint: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    ToolbarHint: () => null,
    HelpHint: () => null,
  };
  return { WelcomeScreen };
});

describe("AppWelcomeScreen", () => {
  const renderWelcome = (
    isCollabEnabled: boolean,
    onCollabDialogOpen: () => void,
  ) =>
    render(
      <EditorJotaiProvider>
        <AppWelcomeScreen
          isCollabEnabled={isCollabEnabled}
          onCollabDialogOpen={onCollabDialogOpen}
        />
      </EditorJotaiProvider>,
    );

  it("keeps all host actions and collaboration ownership at the adapter", () => {
    const onCollabDialogOpen = vi.fn();

    renderWelcome(true, onCollabDialogOpen);

    expect(screen.getByTestId("welcome-center")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Help" })).toBeEnabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Live collaboration..." }),
    );
    expect(onCollabDialogOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      expect.stringContaining("welcomeScreenGuest"),
    );
  });

  it("does not expose collaboration when the host disables it", () => {
    renderWelcome(false, vi.fn());

    expect(
      screen.queryByRole("button", { name: "Live collaboration..." }),
    ).not.toBeInTheDocument();
  });
});
