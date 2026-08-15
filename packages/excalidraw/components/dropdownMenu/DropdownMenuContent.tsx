import clsx from "clsx";
import React, { useState } from "react";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { useExcalidrawContainer, useResponsiveEditorShell } from "../App";
import {
  FloatingSurfaceFrame,
  FloatingSurfaceScrollViewport,
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
  onEscapeKeyDown,
  onCloseAutoFocus,
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
  onEscapeKeyDown?: () => void;
  onCloseAutoFocus?: (event: Event) => void;
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
  const responsive = useResponsiveEditorShell();
  const { container } = useExcalidrawContainer();
  const owningContainer = collisionBoundary ?? container;
  const [frameElement, setFrameElement] = useState<HTMLDivElement | null>(null);
  const policy = resolveFloatingSurfacePolicy({
    kind: surfaceKind,
    intent:
      placementIntent ??
      (side === "top" ? "toolbar-up" : "main-menu-start-bottom"),
    formFactor: responsive.adapter,
    direction: responsive.direction,
    pointerDensity: responsive.density === "touch" ? "coarse" : "fine",
    availableBlockSize: owningContainer?.clientHeight ?? 0,
    safeArea: responsive.safeArea.physical,
  });
  const availableBlockSize = useFloatingSurfaceAvailableBlockSize({
    boundary: owningContainer,
    frame: frameElement,
    padding: policy.collisionPadding,
  });

  const classNames = clsx(`dropdown-menu ${className}`, {
    "dropdown-menu--mobile": responsive.adapter === "phone",
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
          onEscapeKeyDown={() => onEscapeKeyDown?.()}
          onCloseAutoFocus={onCloseAutoFocus}
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
