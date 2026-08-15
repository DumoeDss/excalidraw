import React, { useCallback, useRef, useState } from "react";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import DropdownMenuSubContent from "./DropdownMenuSubContent";
import DropdownMenuSubTrigger from "./DropdownMenuSubTrigger";
import {
  getSubMenuContentComponent,
  getSubMenuTriggerComponent,
} from "./dropdownMenuUtils";

const DropdownMenuSub = ({ children }: { children?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const MenuTriggerComp = getSubMenuTriggerComponent(children);
  const MenuContentComp = getSubMenuContentComponent(children);
  const closeAndFocusTrigger = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  const MenuTriggerWithRef =
    MenuTriggerComp && React.isValidElement(MenuTriggerComp)
      ? React.cloneElement(
          MenuTriggerComp as React.ReactElement<
            React.ComponentProps<typeof DropdownMenuSubTrigger>
          >,
          { ref: triggerRef },
        )
      : MenuTriggerComp;
  const MenuContentWithEscape =
    MenuContentComp && React.isValidElement(MenuContentComp)
      ? React.cloneElement(
          MenuContentComp as React.ReactElement<
            React.ComponentProps<typeof DropdownMenuSubContent>
          >,
          { onEscape: closeAndFocusTrigger },
        )
      : MenuContentComp;
  return (
    <DropdownMenuPrimitive.Sub open={open} onOpenChange={setOpen}>
      {MenuTriggerWithRef}
      {MenuContentWithEscape}
    </DropdownMenuPrimitive.Sub>
  );
};

DropdownMenuSub.Trigger = DropdownMenuSubTrigger;
DropdownMenuSub.Content = DropdownMenuSubContent;

DropdownMenuSub.displayName = "DropdownMenuSub";

export default DropdownMenuSub;
