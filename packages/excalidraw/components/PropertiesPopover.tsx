import { Popover } from "radix-ui";
import clsx from "clsx";
import React, { type ReactNode } from "react";

import { isInteractive } from "@excalidraw/common";

import { useEditorInterface } from "./App";
import { useStylesPanelMode } from "./App";
import {
  FloatingSurfaceFrame,
  FloatingSurfaceScrollViewport,
  readEditorSafeAreaInsets,
  resolveFloatingSurfacePolicy,
} from "./floatingSurface";
import { resolvePropertyPlacement } from "./propertyPlacement";

import type { FloatingSurfaceKind } from "./floatingSurface";

interface PropertiesPopoverProps {
  className?: string;
  container: HTMLDivElement | null;
  children: ReactNode;
  style?: React.CSSProperties;
  onClose: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
  onFocusOutside?: Popover.PopoverContentProps["onFocusOutside"];
  onPointerDownOutside?: Popover.PopoverContentProps["onPointerDownOutside"];
  preventAutoFocusOnTouch?: boolean;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  surfaceKind?: Extract<
    FloatingSurfaceKind,
    "property-popover" | "color-picker" | "font-picker"
  >;
}

export const PropertiesPopover = React.forwardRef<
  HTMLDivElement,
  PropertiesPopoverProps
>(
  (
    {
      className,
      container,
      children,
      style,
      onClose,
      onKeyDown,
      onFocusOutside,
      onPointerLeave,
      onPointerDownOutside,
      preventAutoFocusOnTouch = false,
      returnFocusRef,
      surfaceKind = "property-popover",
    },
    ref,
  ) => {
    const editorInterface = useEditorInterface();
    const stylesPanelMode = useStylesPanelMode();
    const direction =
      container?.closest<HTMLElement>(".excalidraw")?.getAttribute("dir") ===
        "rtl" || document.documentElement.getAttribute("dir") === "rtl"
        ? "rtl"
        : "ltr";
    const placement = resolvePropertyPlacement({
      formFactor: editorInterface.formFactor === "phone" ? "phone" : "desktop",
      isLandscape: editorInterface.isLandscape,
      direction,
      surface:
        editorInterface.formFactor === "phone"
          ? "phone"
          : stylesPanelMode === "full"
          ? "full"
          : "compact",
      collisionBoundary: container,
    });
    const policy = resolveFloatingSurfacePolicy({
      kind: surfaceKind,
      intent:
        editorInterface.formFactor === "phone"
          ? "phone-up"
          : "property-canvas-inward",
      formFactor: editorInterface.formFactor === "phone" ? "phone" : "desktop",
      direction,
      pointerDensity: editorInterface.isTouchScreen ? "coarse" : "fine",
      collisionPadding: placement.collisionPadding,
      safeArea: readEditorSafeAreaInsets(container),
      availableBlockSize: container?.clientHeight ?? 0,
    });

    return (
      <Popover.Portal container={container}>
        <Popover.Content
          className="floating-surface-positioner focus-visible-none properties-popover-positioner"
          data-prevent-outside-click
          side={placement.popoverSide}
          align={placement.popoverAlign}
          alignOffset={0}
          sideOffset={10}
          collisionBoundary={placement.collisionBoundary ?? undefined}
          collisionPadding={policy.collisionPadding}
          style={{
            zIndex: "var(--zIndex-ui-styles-popup)",
          }}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
          onFocusOutside={onFocusOutside}
          onPointerDownOutside={onPointerDownOutside}
          onOpenAutoFocus={(e) => {
            // prevent auto-focus on touch devices to avoid keyboard popup
            if (preventAutoFocusOnTouch && editorInterface.isTouchScreen) {
              e.preventDefault();
            }
          }}
          onCloseAutoFocus={(e) => {
            e.stopPropagation();
            // prevents focusing the trigger
            e.preventDefault();

            onClose();

            if (
              returnFocusRef?.current &&
              !preventAutoFocusOnTouch &&
              !isInteractive(document.activeElement)
            ) {
              returnFocusRef.current.focus();
              return;
            }

            // return focus to excalidraw container unless
            // user focuses an interactive element, such as a button, or
            // enters the text editor by clicking on canvas with the text tool
            if (container && !isInteractive(document.activeElement)) {
              container.focus();
            }
          }}
        >
          <FloatingSurfaceFrame
            ref={ref}
            className={clsx("properties-popover-frame", className)}
            density={policy.density}
            kind={surfaceKind}
            style={{
              ...style,
              ["--floating-surface-available-block-size" as string]: `min(${policy.maxBlockSize}px, var(--radix-popover-content-available-height))`,
            }}
          >
            <FloatingSurfaceScrollViewport className="properties-popover-scroll-viewport">
              {children}
            </FloatingSurfaceScrollViewport>
          </FloatingSurfaceFrame>
          <Popover.Arrow
            className="properties-popover-arrow"
            width={20}
            height={10}
            style={{
              fill: "var(--popup-bg-color)",
              filter: "drop-shadow(rgba(0, 0, 0, 0.05) 0px 3px 2px)",
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    );
  },
);
