import { render, screen } from "@testing-library/react";

import { LibraryUnit } from "./LibraryUnit";

vi.mock("../hooks/useLibraryItemSvg", () => ({
  useLibraryItemSvg: () => undefined,
}));

vi.mock("./App", () => ({
  useEditorInterface: () => ({ formFactor: "desktop" }),
}));

const renderUnit = (id: string | null, name?: string) =>
  render(
    <LibraryUnit
      id={id}
      name={name}
      elements={id ? ([] as never) : undefined}
      onClick={vi.fn()}
      selected={false}
      onToggle={vi.fn()}
      onDrag={vi.fn()}
      svgCache={new Map()}
    />,
  );

describe("LibraryUnit item identity", () => {
  it("exposes the exact item id and accessible name", () => {
    const { container } = renderUnit("visual-library-01", "Reusable card");

    const item = screen.getByLabelText("Reusable card");
    expect(item).toHaveAttribute("data-library-item-id", "visual-library-01");
    expect(container.querySelectorAll("[data-library-item-id]")).toHaveLength(
      1,
    );
  });

  it("does not let a wrong name or empty item satisfy the fixture contract", () => {
    const wrong = renderUnit("visual-library-01", "Different item");
    expect(screen.queryByLabelText("Reusable card")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Different item")).toHaveAttribute(
      "data-library-item-id",
      "visual-library-01",
    );
    wrong.unmount();

    const wrongId = renderUnit("different-library-item", "Reusable card");
    expect(
      wrongId.container.querySelector(
        '[data-library-item-id="visual-library-01"]',
      ),
    ).toBeNull();
    wrongId.unmount();

    const empty = renderUnit(null);
    expect(empty.container.querySelector("[data-library-item-id]")).toBeNull();
    expect(empty.container.querySelector("[aria-label]")).toBeNull();
  });
});
