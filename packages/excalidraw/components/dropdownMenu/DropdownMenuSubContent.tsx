import clsx from "clsx";
import { useLayoutEffect, useState } from "react";

import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { useExcalidrawContainer, useResponsiveEditorShell } from "../App";
import {
  FloatingSurfaceFrame,
  FloatingSurfaceScrollViewport,
  resolveFloatingSurfaceInlineShift,
  resolveFloatingSurfacePolicy,
  useFloatingSurfaceAvailableBlockSize,
} from "../floatingSurface";

const BASE_SIDE_OFFSET = 4;

const DropdownMenuSubContent = ({
  children,
  className,
  onEscape,
}: {
  children?: React.ReactNode;
  className?: string;
  onEscape?: () => void;
}) => {
  const responsive = useResponsiveEditorShell();
  const { container } = useExcalidrawContainer();
  const [frameElement, setFrameElement] = useState<HTMLDivElement | null>(null);
  const policy = resolveFloatingSurfacePolicy({
    kind: "submenu",
    intent: "nested-submenu-inline",
    formFactor: responsive.adapter,
    direction: responsive.direction,
    pointerDensity: responsive.density === "touch" ? "coarse" : "fine",
    availableBlockSize: container?.clientHeight ?? 0,
    safeArea: responsive.safeArea.physical,
  });
  const availableBlockSize = useFloatingSurfaceAvailableBlockSize({
    boundary: container,
    frame: frameElement,
    padding: policy.collisionPadding,
  });
  const collisionPaddingLeft = policy.collisionPadding.left;
  const collisionPaddingRight = policy.collisionPadding.right;

  const classNames = clsx(`dropdown-menu dropdown-submenu ${className}`, {
    "dropdown-menu--mobile": responsive.adapter === "phone",
  }).trim();

  useLayoutEffect(() => {
    const frame = frameElement;
    const content = frame?.parentElement;
    if (!frame || !content || !container) {
      return;
    }

    const fitInline = () => {
      content.style.transform = "";
      const surfaceRect = frame.getBoundingClientRect();
      const boundaryRect = container.getBoundingClientRect();
      const shift = resolveFloatingSurfaceInlineShift({
        boundary: boundaryRect,
        surface: surfaceRect,
        padding: {
          left: collisionPaddingLeft,
          right: collisionPaddingRight,
        },
      });
      content.style.transform = shift ? `translateX(${shift}px)` : "";
    };

    fitInline();
    const ownerWindow = content.ownerDocument.defaultView;
    const deferredFit = ownerWindow?.setTimeout(fitInline, 0);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(fitInline);
    const positionObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(fitInline);
    observer?.observe(frame);
    observer?.observe(container);
    if (content.parentElement) {
      positionObserver?.observe(content.parentElement, {
        attributeFilter: ["style"],
        attributes: true,
      });
    }

    return () => {
      if (deferredFit !== undefined) {
        ownerWindow?.clearTimeout(deferredFit);
      }
      observer?.disconnect();
      positionObserver?.disconnect();
      content.style.transform = "";
    };
  }, [container, frameElement, collisionPaddingLeft, collisionPaddingRight]);

  return (
    <DropdownMenuPrimitive.Portal container={container}>
      <DropdownMenuPrimitive.SubContent
        className="floating-surface-positioner dropdown-menu-positioner"
        sideOffset={BASE_SIDE_OFFSET}
        collisionBoundary={container ?? undefined}
        collisionPadding={policy.collisionPadding}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onEscape?.();
        }}
      >
        <FloatingSurfaceFrame
          className={classNames}
          density={policy.density}
          kind="submenu"
          ref={setFrameElement}
          style={{
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
      </DropdownMenuPrimitive.SubContent>
    </DropdownMenuPrimitive.Portal>
  );
};

export default DropdownMenuSubContent;
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";
