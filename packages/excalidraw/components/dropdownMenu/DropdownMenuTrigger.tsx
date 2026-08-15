import clsx from "clsx";
import React from "react";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { useEditorInterface } from "../App";

const MenuTrigger = React.forwardRef<
  HTMLButtonElement,
  {
    className?: string;
    children: React.ReactNode;
    onToggle?: React.MouseEventHandler<HTMLButtonElement>;
    title?: string;
  } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect">
>(({ className = "", children, onToggle, onClick, title, ...rest }, ref) => {
  const editorInterface = useEditorInterface();
  const classNames = clsx(
    `dropdown-menu-button ${className}`,
    "zen-mode-transition",
    {
      "dropdown-menu-button--mobile": editorInterface.formFactor === "phone",
    },
  ).trim();
  return (
    <DropdownMenuPrimitive.Trigger
      className={classNames}
      onClick={(event) => {
        onClick?.(event);
        // Radix owns complete pointer sequences. This fallback only forwards
        // click-only activation (assistive technology and test hosts) to the
        // same root onOpenChange transition. Trusted pointer clicks have a
        // positive detail and were already handled on pointerdown.
        if (!event.defaultPrevented && event.detail === 0) {
          onToggle?.(event);
        }
      }}
      type="button"
      data-testid="dropdown-menu-button"
      title={title}
      ref={ref}
      {...rest}
    >
      {children}
    </DropdownMenuPrimitive.Trigger>
  );
});

export default MenuTrigger;
MenuTrigger.displayName = "DropdownMenuTrigger";
