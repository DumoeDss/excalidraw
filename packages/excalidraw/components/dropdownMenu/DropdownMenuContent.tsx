import clsx from "clsx";
import React, { useState } from "react";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { useEditorInterface, useExcalidrawContainer } from "../App";
import {
  FloatingSurfaceFrame,
  FloatingSurfaceScrollViewport,
  readEditorSafeAreaInsets,
  resolveFloatingSurfacePolicy,
  useFloatingSurfaceAvailableBlockSize,
} from "../floatingSurface";

import { DropdownMenuContentPropsContext } from "./common";

import type {
  FloatingSurfaceKind,
  FloatingSurfacePlacementIntent,
} from "../floatingSurface";

const MenuContent = ({
  children,
  onClickOutside,
  className = "",
  onSelect,
  align = "end",
  side = "bottom",
  id,
  collisionBoundary,
  style,
  surfaceKind = "menu",
  placementIntent,
}: {
  children?: React.ReactNode;
  onClickOutside?: () => void;
  className?: string;
  /**
   * Called when any menu item is selected (clicked on).
   */
  onSelect?: (event: Event) => void;
  style?: React.CSSProperties;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  id?: string;
  collisionBoundary?: Element | null;
  surfaceKind?: FloatingSurfaceKind;
  placementIntent?: FloatingSurfacePlacementIntent;
}) => {
  const editorInterface = useEditorInterface();
  const { container } = useExcalidrawContainer();
  const owningContainer = collisionBoundary ?? container;
  const [frameElement, setFrameElement] = useState<HTMLDivElement | null>(null);
  const direction =
    container?.getAttribute("dir") === "rtl" ||
    container?.closest<HTMLElement>("[dir=rtl]")
      ? "rtl"
      : "ltr";
  const safeArea = readEditorSafeAreaInsets(container);
  const policy = resolveFloatingSurfacePolicy({
    kind: surfaceKind,
    intent:
      placementIntent ??
      (side === "top" ? "toolbar-up" : "main-menu-start-bottom"),
    formFactor: editorInterface.formFactor === "phone" ? "phone" : "desktop",
    direction,
    pointerDensity: editorInterface.isTouchScreen ? "coarse" : "fine",
    availableBlockSize: owningContainer?.clientHeight ?? 0,
    safeArea,
  });
  const availableBlockSize = useFloatingSurfaceAvailableBlockSize({
    boundary: owningContainer,
    frame: frameElement,
    padding: policy.collisionPadding,
  });

  const classNames = clsx(`dropdown-menu ${className}`, {
    "dropdown-menu--mobile": editorInterface.formFactor === "phone",
  }).trim();

  return (
    <DropdownMenuContentPropsContext.Provider value={{ onSelect }}>
      <DropdownMenuPrimitive.Portal container={container}>
        <DropdownMenuPrimitive.Content
          className="floating-surface-positioner dropdown-menu-positioner"
          data-testid="dropdown-menu"
          align={align ?? policy.align}
          side={side ?? policy.side}
          id={id}
          collisionBoundary={owningContainer ?? undefined}
          collisionPadding={policy.collisionPadding}
          sideOffset={8}
          onPointerDownOutside={() => onClickOutside?.()}
        >
          <FloatingSurfaceFrame
            className={classNames}
            density={policy.density}
            kind={surfaceKind}
            ref={setFrameElement}
            style={{
              ...style,
              ["--floating-surface-available-block-size" as string]: `min(${
                policy.maxBlockSize
              }px, ${
                availableBlockSize ?? policy.maxBlockSize
              }px, var(--radix-dropdown-menu-content-available-height))`,
            }}
          >
            <FloatingSurfaceScrollViewport className="dropdown-menu-container">
              {children}
            </FloatingSurfaceScrollViewport>
          </FloatingSurfaceFrame>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuContentPropsContext.Provider>
  );
};
MenuContent.displayName = "DropdownMenuContent";

export default MenuContent;
