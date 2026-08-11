import React from "react";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { chevronRight } from "../primitives/chrome-icons";
import { FloatingSurfaceChevron } from "../floatingSurface";

import { getDropdownMenuItemClassName } from "./common";
import MenuItemContent from "./DropdownMenuItemContent";

import type { JSX } from "react";

const DropdownMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    icon?: JSX.Element;
    shortcut?: string;
    className?: string;
  }
>(({ children, icon, shortcut, className }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    className={`${getDropdownMenuItemClassName(
      className,
    )} floating-surface__item dropdown-menu__submenu-trigger`}
    ref={ref}
  >
    <MenuItemContent icon={icon} shortcut={shortcut}>
      {children}
    </MenuItemContent>
    <FloatingSurfaceChevron className="dropdown-menu__submenu-trigger-icon">
      {chevronRight}
    </FloatingSurfaceChevron>
  </DropdownMenuPrimitive.SubTrigger>
));

export default DropdownMenuSubTrigger;
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";
