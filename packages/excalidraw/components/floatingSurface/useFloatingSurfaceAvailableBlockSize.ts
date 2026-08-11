import { useLayoutEffect, useState } from "react";

import { resolveFloatingSurfaceAvailableBlockSize } from "./policy";

import type { PhysicalSafeAreaInsets } from "./policy";

const BOTTOM_RESERVATION_SELECTOR = '[data-viewport-ui="bottom"]';

const getVisibleBottomReservationTop = (
  boundary: Element,
  frame: HTMLElement,
) => {
  const boundaryRect = boundary.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  const ownerWindow = boundary.ownerDocument.defaultView;
  let reservationTop: number | undefined;

  for (const node of boundary.querySelectorAll<HTMLElement>(
    BOTTOM_RESERVATION_SELECTOR,
  )) {
    const styles = ownerWindow?.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    if (
      styles?.display === "none" ||
      styles?.visibility === "hidden" ||
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.bottom <= boundaryRect.top ||
      rect.top >= boundaryRect.bottom ||
      rect.top <= frameRect.top
    ) {
      continue;
    }
    reservationTop =
      reservationTop === undefined
        ? rect.top
        : Math.min(reservationTop, rect.top);
  }

  return reservationTop;
};

/**
 * Measures editor-local block-size after Radix has placed the frame. The
 * returned budget follows persistent bottom UI as it mounts, resizes, or
 * moves, while remaining independent from the browser viewport.
 */
export const useFloatingSurfaceAvailableBlockSize = ({
  boundary,
  frame,
  padding,
}: {
  boundary: Element | null;
  frame: HTMLElement | null;
  padding: Pick<PhysicalSafeAreaInsets, "top" | "bottom">;
}) => {
  const [availableBlockSize, setAvailableBlockSize] = useState<number | null>(
    null,
  );
  const paddingTop = padding.top;
  const paddingBottom = padding.bottom;

  useLayoutEffect(() => {
    if (!boundary || !frame) {
      setAvailableBlockSize(null);
      return;
    }

    const observedReservations = new Set<Element>();
    let resizeObserver: ResizeObserver | null = null;
    const observeReservations = () => {
      for (const node of boundary.querySelectorAll<HTMLElement>(
        BOTTOM_RESERVATION_SELECTOR,
      )) {
        if (!observedReservations.has(node)) {
          observedReservations.add(node);
          resizeObserver?.observe(node);
        }
      }
    };
    const recompute = () => {
      observeReservations();
      const nextBlockSize = resolveFloatingSurfaceAvailableBlockSize({
        boundary: boundary.getBoundingClientRect(),
        surfaceTop: frame.getBoundingClientRect().top,
        bottomReservationTop: getVisibleBottomReservationTop(boundary, frame),
        padding: {
          top: paddingTop,
          bottom: paddingBottom,
        },
      });
      setAvailableBlockSize((currentBlockSize) =>
        currentBlockSize === nextBlockSize ? currentBlockSize : nextBlockSize,
      );
    };

    const ownerWindow = boundary.ownerDocument.defaultView;
    resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(recompute);
    resizeObserver?.observe(boundary);
    resizeObserver?.observe(frame);
    recompute();
    const deferredRecompute = ownerWindow?.setTimeout(recompute, 0);

    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(recompute);
    mutationObserver?.observe(boundary, {
      attributeFilter: [
        "aria-hidden",
        "class",
        "data-viewport-ui",
        "hidden",
        "style",
      ],
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      if (deferredRecompute !== undefined) {
        ownerWindow?.clearTimeout(deferredRecompute);
      }
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [boundary, frame, paddingBottom, paddingTop]);

  return availableBlockSize;
};
