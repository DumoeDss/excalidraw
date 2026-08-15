import React, { useLayoutEffect, useRef, useEffect } from "react";
import { unstable_batchedUpdates } from "react-dom";

import { KEYS, queryFocusableElements } from "@excalidraw/common";

import clsx from "clsx";

import { EMPTY_SAFE_AREA, fitFloatingSurfacePoint } from "./floatingSurface";

import "./Popover.scss";

import type {
  FloatingSurfaceDirection,
  PhysicalSafeAreaInsets,
} from "./floatingSurface";

type Props = {
  top?: number;
  left?: number;
  children?: React.ReactNode;
  onCloseRequest?(event: PointerEvent): void;
  fitInViewport?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  className?: string;
  autoFocus?: boolean;
  trapTab?: boolean;
  collisionPadding?: number;
  direction?: FloatingSurfaceDirection;
  safeArea?: PhysicalSafeAreaInsets;
};

export const Popover = ({
  children,
  left,
  top,
  onCloseRequest,
  fitInViewport = false,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
  className,
  autoFocus = true,
  trapTab = true,
  collisionPadding = 10,
  direction = "ltr",
  safeArea = EMPTY_SAFE_AREA,
}: Props) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = popoverRef.current;

    if (!container) {
      return;
    }

    // focus popover only if the caller didn't focus on something else nested
    // within the popover, which should take precedence. Fixes cases
    // like color picker listening to keydown events on containers nested
    // in the popover.
    if (autoFocus && !container.contains(document.activeElement)) {
      container.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (trapTab && event.key === KEYS.TAB) {
        const focusableElements = queryFocusableElements(container);
        const { activeElement } = document;
        const currentIndex = focusableElements.findIndex(
          (element) => element === activeElement,
        );

        if (activeElement === container) {
          if (event.shiftKey) {
            focusableElements[focusableElements.length - 1]?.focus();
          } else {
            focusableElements[0].focus();
          }
          event.preventDefault();
          event.stopImmediatePropagation();
        } else if (currentIndex === 0 && event.shiftKey) {
          focusableElements[focusableElements.length - 1]?.focus();
          event.preventDefault();
          event.stopImmediatePropagation();
        } else if (
          currentIndex === focusableElements.length - 1 &&
          !event.shiftKey
        ) {
          focusableElements[0]?.focus();
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [autoFocus, trapTab]);

  // ensure the popover doesn't overflow the viewport
  useLayoutEffect(() => {
    if (fitInViewport && popoverRef.current && top != null && left != null) {
      const element = popoverRef.current;
      const fit = () => {
        const { width, height } = element.getBoundingClientRect();
        const fitted = fitFloatingSurfacePoint({
          anchor: { x: left, y: top },
          measuredSize: { width, height },
          editorSize: { width: viewportWidth, height: viewportHeight },
          direction,
          collisionPadding,
          safeArea,
        });
        element.style.left = `${fitted.left}px`;
        element.style.top = `${fitted.top}px`;
        element.style.maxWidth = `${fitted.maxInlineSize}px`;
        element.style.maxHeight = `${fitted.maxBlockSize}px`;
        element.style.setProperty(
          "--floating-surface-available-block-size",
          `${fitted.maxBlockSize}px`,
        );
      };

      fit();
      if (typeof ResizeObserver === "undefined") {
        return;
      }
      const observer = new ResizeObserver(fit);
      observer.observe(element);
      const editor = element.parentElement;
      if (editor) {
        observer.observe(editor);
      }
      return () => observer.disconnect();
    }
  }, [
    collisionPadding,
    direction,
    fitInViewport,
    left,
    safeArea,
    top,
    viewportHeight,
    viewportWidth,
  ]);

  useEffect(() => {
    if (onCloseRequest) {
      const handler = (event: PointerEvent) => {
        if (!popoverRef.current?.contains(event.target as Node)) {
          unstable_batchedUpdates(() => onCloseRequest(event));
        }
      };
      document.addEventListener("pointerdown", handler, false);
      return () => document.removeEventListener("pointerdown", handler, false);
    }
  }, [onCloseRequest]);

  return (
    <div className={clsx("popover", className)} ref={popoverRef} tabIndex={-1}>
      {children}
    </div>
  );
};
