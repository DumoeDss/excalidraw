import { render, screen } from "@testing-library/react";

import { AppSidebar } from "./AppSidebar";

vi.mock("@excalidraw/excalidraw", () => {
  const DefaultSidebar = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  DefaultSidebar.TabTriggers = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div>{children}</div>;
  const Sidebar = {
    TabTrigger: ({ children }: { children: React.ReactNode }) => (
      <button type="button">{children}</button>
    ),
    Tab: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
  return { DefaultSidebar, Sidebar, THEME: { DARK: "dark" } };
});
vi.mock("@excalidraw/excalidraw/context/ui-appState", () => ({
  useUIAppState: () => ({ theme: "dark", openSidebar: { tab: "comments" } }),
}));

describe("AppSidebar promo adapters", () => {
  it("retains both promo destinations through pointer-neutral wrappers", () => {
    const { container } = render(<AppSidebar />);

    const comments = container.querySelector(
      '[data-app-content][aria-label="Comments"]',
    );
    const presentation = container.querySelector(
      '[data-app-content][aria-label="Presentation"]',
    );
    expect(comments).toHaveAttribute("data-app-content-interaction", "neutral");
    expect(presentation).not.toHaveAttribute("data-viewport-ui");
    const links = screen.getAllByRole("link", { name: "Sign up now" });
    expect(links[0]).toHaveAttribute(
      "href",
      expect.stringContaining("comments_promo"),
    );
    expect(links[1]).toHaveAttribute(
      "href",
      expect.stringContaining("presentations_promo"),
    );
  });
});
