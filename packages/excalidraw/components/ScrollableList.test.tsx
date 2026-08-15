import React from "react";

import { render, screen } from "../tests/test-utils";

import { ScrollableList } from "./ScrollableList";

describe("ScrollableList semantics", () => {
  it("preserves menu semantics for existing consumers by default", () => {
    render(
      <ScrollableList placeholder="Empty">
        <button role="menuitem">Action</button>
      </ScrollableList>,
    );

    expect(screen.getByRole("menu")).toContainElement(
      screen.getByRole("menuitem", { name: "Action" }),
    );
  });

  it("exposes picker listbox semantics without injecting a menu role", () => {
    render(
      <ScrollableList
        placeholder="Empty"
        semanticMode="picker-listbox"
        aria-label="Choices"
      >
        <button role="option" aria-selected="true">
          Choice
        </button>
      </ScrollableList>,
    );

    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("listbox", { name: "Choices" })).toContainElement(
      screen.getByRole("option", { name: "Choice", selected: true }),
    );
  });
});
