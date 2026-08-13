import { fireEvent, render, screen } from "@testing-library/react";

import LibraryMenuItems from "./LibraryMenuItems";

vi.mock("../hooks/useLibraryItemSvg", () => ({
  useLibraryCache: () => ({ svgCache: new Map() }),
}));
vi.mock("../hooks/useScrollPosition", () => ({
  useScrollPosition: () => 0,
}));
vi.mock("./LibraryMenuHeaderContent", () => ({
  LibraryDropdownMenu: () => <button type="button">Library menu</button>,
}));
vi.mock("./LibraryMenuControlButtons", () => ({
  LibraryMenuControlButtons: () => (
    <div>
      <button type="button">Load library</button>
      <a href="https://libraries.excalidraw.com">Browse libraries</a>
    </div>
  ),
}));
vi.mock("./LibraryMenuSection", () => ({
  LibraryMenuSectionGrid: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LibraryMenuSection: ({ items }: { items: { name?: string }[] }) => (
    <div data-testid="library-section">
      {items.map((item) => item.name).join(",")}
    </div>
  ),
}));
vi.mock("./App", () => ({
  useResponsiveEditorShell: () => ({
    adapter: "phone",
    density: "touch",
  }),
}));

const baseProps = {
  id: "library",
  isLoading: false,
  libraryItems: [],
  libraryReturnUrl: undefined,
  onAddToLibrary: vi.fn(),
  onInsertLibraryItems: vi.fn(),
  onSelectItems: vi.fn(),
  pendingElements: [],
  selectedItems: [],
  theme: "light" as const,
};

describe("LibraryMenuItems app-content adapter", () => {
  it("keeps empty actions reachable and uses phone density", () => {
    const { container } = render(<LibraryMenuItems {...baseProps} />);

    expect(
      container.querySelector('[data-app-content][aria-label="Library"]'),
    ).toHaveAttribute("data-app-content-density", "touch");
    expect(screen.getByTestId("app-content-state-empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load library" })).toBeEnabled();
    expect(
      screen.getByRole("link", { name: "Browse libraries" }),
    ).toHaveAttribute("href", "https://libraries.excalidraw.com");
  });

  it("presents loading without transferring Library ownership", () => {
    render(<LibraryMenuItems {...baseProps} isLoading />);

    expect(screen.getByTestId("app-content-state-loading")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Library menu" })).toBeEnabled();
  });

  it("filters populated content and clears an empty search", () => {
    render(
      <LibraryMenuItems
        {...baseProps}
        libraryItems={
          [
            { id: "one", name: "Alpha", elements: [], status: "published" },
          ] as never
        }
      />,
    );

    const search = screen.getByPlaceholderText(/search/i);
    fireEvent.change(search, { target: { value: "missing" } });
    expect(screen.getByTestId("app-content-state-empty")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
    expect(screen.getByTestId("library-section")).toHaveTextContent("Alpha");
  });
});
