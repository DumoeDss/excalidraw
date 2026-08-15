import React from "react";
import { render } from "@testing-library/react";

import { renderPropertyDescriptor } from "./Actions";

import type { PropertyDescriptor } from "./propertyModel";
import type { ActionManager } from "../actions/manager";

describe("property adapter action contract", () => {
  it("delegates the descriptor action identity and render options unchanged", () => {
    const renderAction = vi.fn(() => <button type="button">control</button>);
    const descriptor = {
      id: "freedrawMode",
      section: "stroke",
      action: "changeFreedrawMode",
      renderOptions: { cycle: true },
      visible: true,
      selected: "action",
      disabled: "action",
      availableIn: ["full", "compact", "phone"],
      capabilities: ["direct"],
    } as PropertyDescriptor;

    render(
      <>
        {renderPropertyDescriptor(
          descriptor,
          renderAction as ActionManager["renderAction"],
        )}
      </>,
    );

    expect(renderAction).toHaveBeenCalledTimes(1);
    expect(renderAction).toHaveBeenCalledWith("changeFreedrawMode", {
      cycle: true,
    });
  });

  it.each(["full", "compact", "phone"] as const)(
    "propagates canonical active and disabled state into the %s DOM contract",
    (adapter) => {
      const renderAction = vi.fn(() => <button type="button">control</button>);
      const active = {
        id: "freedrawMode",
        section: "stroke",
        action: "changeFreedrawMode",
        visible: true,
        selected: true,
        disabled: "action",
        availableIn: ["full", "compact", "phone"],
        capabilities: ["direct"],
      } as PropertyDescriptor;
      const disabled = {
        id: "sendToBack",
        section: "arrangement",
        action: "sendToBack",
        visible: true,
        selected: "action",
        disabled: true,
        availableIn: ["full", "compact", "phone"],
        capabilities: ["direct"],
      } as PropertyDescriptor;

      const view = render(
        <div data-property-adapter={adapter}>
          {renderPropertyDescriptor(active, renderAction)}
          {renderPropertyDescriptor(disabled, renderAction)}
        </div>,
      );

      const activeControl = view.container.querySelector(
        '[data-property-id="freedrawMode"]',
      );
      expect(activeControl).toHaveAttribute("data-property-selected", "true");
      expect(activeControl).toHaveAttribute("aria-current", "true");
      const disabledControl = view.container.querySelector(
        '[data-property-id="sendToBack"]',
      );
      expect(disabledControl).toHaveAttribute("data-property-disabled", "true");
      expect(disabledControl).toHaveAttribute("aria-disabled", "true");
      expect(disabledControl).toHaveAttribute("inert");
    },
  );
});
