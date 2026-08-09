import clsx from "clsx";
import React from "react";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { useEditorInterface } from "../App";

const MenuTrigger = React.forwardRef<
  HTMLButtonElement,
  {
    className?: string;
    children: React.ReactNode;
    onToggle: () => void;
    title?: string;
  } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect">
>(({ className = "", children, onToggle, title, ...rest }, ref) => {
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
      onClick={onToggle}
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
