import clsx from "clsx";
import React from "react";

import "./button.scss";

export type UiButtonVariant = "default" | "solid" | "ghost" | "danger";
export type UiButtonSize = "md" | "lg";

export interface UiButtonProps
  extends React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {
  /** Visual style. `default` is the outline look. */
  variant?: UiButtonVariant;
  /** Control size. */
  size?: UiButtonSize;
  /**
   * Canonical selected/active/checked state. Renders the `ui-button--selected`
   * class and, when true, `aria-pressed="true"`. The legacy names `active`,
   * `checked`, and `aria-pressed` all map onto this one concept — prefer
   * `selected` in new code (see primitives/README.md).
   */
  selected?: boolean;
  /** Stretch to the full width of the container. */
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
}

/**
 * The canonical UI button primitive for the redesign. One state model
 * (`selected`), owned focus-visible ring, keyed on the `--ui-*` design tokens.
 *
 * INTERNAL — not part of the package's public API surface. Adopt gradually on
 * new surfaces; legacy buttons (`Button`, `.dropdown-menu-button`) already
 * share the same SCSS base (`uiButtonStyles`) via their class selectors.
 */
export const UiButton = React.forwardRef<HTMLButtonElement, UiButtonProps>(
  (
    {
      variant = "default",
      size = "md",
      selected = false,
      fullWidth = false,
      className,
      type = "button",
      ...rest
    },
    ref,
  ) => (
    <button
      {...rest}
      ref={ref}
      type={type}
      aria-pressed={selected ? true : undefined}
      className={clsx(
        "ui-button",
        `ui-button--${variant}`,
        `ui-button--${size}`,
        {
          "ui-button--selected": selected,
          "ui-button--full-width": fullWidth,
        },
        className,
      )}
    />
  ),
);

UiButton.displayName = "UiButton";
