import React, { useId } from "react";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { CLASSES } from "@excalidraw/common";

import { getLanguage, useI18n } from "../../i18n";
import { useExcalidrawContainer } from "../App";
import { useFloatingSurfaceOwner } from "../floatingSurface";

import DropdownMenuContent from "./DropdownMenuContent";
import DropdownMenuGroup from "./DropdownMenuGroup";
import DropdownMenuItem from "./DropdownMenuItem";
import DropdownMenuItemCustom from "./DropdownMenuItemCustom";
import DropdownMenuItemLink from "./DropdownMenuItemLink";
import MenuSeparator from "./DropdownMenuSeparator";
import DropdownMenuSub from "./DropdownMenuSub";
import DropdownMenuTrigger from "./DropdownMenuTrigger";
import DropdownMenuItemCheckbox from "./DropdownMenuItemCheckbox";
import {
  getMenuContentComponent,
  getMenuTriggerComponent,
} from "./dropdownMenuUtils";

import "./DropdownMenu.scss";

const DropdownMenu = ({
  children,
  open,
  onOpenChange = () => {},
  ownerIdentity,
}: {
  children?: React.ReactNode;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  ownerIdentity?: string;
}) => {
  const { container } = useExcalidrawContainer();
  useI18n();
  const generatedOwnerIdentity = useId();
  const direction =
    container?.getAttribute("dir") === "rtl" ||
    container?.closest<HTMLElement>("[dir=rtl]") ||
    document.documentElement.getAttribute("dir") === "rtl" ||
    getLanguage().rtl
      ? "rtl"
      : "ltr";
  useFloatingSurfaceOwner({
    scope: "dropdown-menu",
    identity: ownerIdentity ?? generatedOwnerIdentity,
    open,
    onOpenChange,
  });
  const MenuTriggerComp = getMenuTriggerComponent(children);
  const MenuContentComp = getMenuContentComponent(children);
  const MenuTriggerWithOpenChange =
    MenuTriggerComp && React.isValidElement(MenuTriggerComp)
      ? React.cloneElement(
          MenuTriggerComp as React.ReactElement<
            React.ComponentProps<typeof DropdownMenuTrigger>
          >,
          {
            onToggle: () => onOpenChange(!open),
          },
        )
      : MenuTriggerComp;

  return (
    <DropdownMenuPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      dir={direction}
    >
      <div
        className={CLASSES.DROPDOWN_MENU_EVENT_WRAPPER}
        style={{
          // remove this div from box layout
          display: "contents",
        }}
      >
        {MenuTriggerWithOpenChange}
        {MenuContentComp}
      </div>
    </DropdownMenuPrimitive.Root>
  );
};

DropdownMenu.Trigger = DropdownMenuTrigger;
DropdownMenu.Content = DropdownMenuContent;
DropdownMenu.Item = DropdownMenuItem;
DropdownMenu.ItemCheckbox = DropdownMenuItemCheckbox;
DropdownMenu.ItemLink = DropdownMenuItemLink;
DropdownMenu.ItemCustom = DropdownMenuItemCustom;
DropdownMenu.Group = DropdownMenuGroup;
DropdownMenu.Separator = MenuSeparator;
DropdownMenu.Sub = DropdownMenuSub;

export default DropdownMenu;

DropdownMenu.displayName = "DropdownMenu";
