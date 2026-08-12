import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useCreatePortalContainer } from "../hooks/useCreatePortalContainer";

import { useEditorInterface, useExcalidrawContainer } from "./App";
import { readLargeSurfaceSafeAreaInsets } from "./largeSurface";
import { subscribeToModalChanges } from "./largeSurface/modalOwner";
import { resolveTooltipPosition } from "./tooltipPosition";

import "./Tooltip.scss";

const POINTER_OPEN_DELAY = 450;
const CLOSE_GRACE_DELAY = 100;
const TOOLTIP_TARGET_SELECTOR =
  "button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])";

type TooltipClaim = { token: symbol; close: () => void };
const tooltipClaims = new WeakMap<HTMLElement, TooltipClaim>();

let nextCanvasTooltipId = 1;

// Compatibility bridge for the canvas-owned element-link hover affordance.
// Its owning editor is mandatory so multiple editors never share DOM state.
export const getTooltipDiv = (editor: HTMLElement) => {
  const existing = editor.querySelector<HTMLDivElement>(
    ":scope > .excalidraw-tooltip-canvas-bridge",
  );
  if (existing) {
    return existing;
  }
  const div = document.createElement("div");
  div.className = "excalidraw-tooltip excalidraw-tooltip-canvas-bridge";
  div.id = `excalidraw-hyperlink-tooltip-${nextCanvasTooltipId++}`;
  div.setAttribute("role", "tooltip");
  div.hidden = true;
  editor.appendChild(div);
  return div;
};

export const updateTooltipPosition = (
  tooltip: HTMLDivElement,
  editor: HTMLElement,
  item: { left: number; top: number; width: number; height: number },
  position: "bottom" | "top" = "bottom",
) => {
  const editorRect = editor.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const resolved = resolveTooltipPosition({
    editor: editorRect,
    trigger: {
      ...item,
      right: item.left + item.width,
      bottom: item.top + item.height,
    },
    tooltip: tooltipRect,
    safeArea: readLargeSurfaceSafeAreaInsets(editor),
  });
  if (position === "top") {
    const safeArea = readLargeSurfaceSafeAreaInsets(editor);
    const above = item.top - editorRect.top - tooltipRect.height - 8;
    const below = item.top - editorRect.top + item.height + 8;
    const minTop = safeArea.top + 8;
    const maxTop = Math.max(
      minTop,
      editorRect.height - safeArea.bottom - tooltipRect.height - 8,
    );
    resolved.top =
      above >= minTop ? above : Math.min(Math.max(minTop, below), maxTop);
  }
  Object.assign(tooltip.style, {
    left: `${resolved.left}px`,
    top: `${resolved.top}px`,
  });
};

const claimTooltip = (editor: HTMLElement, close: () => void) => {
  tooltipClaims.get(editor)?.close();
  const token = Symbol("tooltip");
  tooltipClaims.set(editor, { token, close });
  return token;
};

const releaseTooltip = (editor: HTMLElement, token: symbol | null) => {
  if (token && tooltipClaims.get(editor)?.token === token) {
    tooltipClaims.delete(editor);
  }
};

const isTooltipClaim = (editor: HTMLElement, token: symbol | null) =>
  !!token && tooltipClaims.get(editor)?.token === token;

type TooltipProps = {
  children: React.ReactNode;
  label: string;
  long?: boolean;
  style?: React.CSSProperties;
  disabled?: boolean;
};

export const Tooltip = ({
  children,
  label,
  long = false,
  style,
  disabled,
}: TooltipProps) => {
  const portal = useCreatePortalContainer({
    className: "excalidraw-tooltip-portal",
    editorPortal: true,
  });
  const { container } = useExcalidrawContainer();
  const editorInterface = useEditorInterface();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const claimRef = useRef<symbol | null>(null);
  const describedTargetRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const reactId = useId();
  const tooltipId = `excalidraw-tooltip-${reactId.replaceAll(":", "")}`;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearTimer();
    if (container) {
      releaseTooltip(container, claimRef.current);
    }
    claimRef.current = null;
    setVisible(false);
  }, [clearTimer, container]);

  const open = useCallback(
    (target: HTMLElement) => {
      if (!container || disabled) {
        return;
      }
      const topModal = container.querySelector<HTMLElement>(
        '.excalidraw-modal-container:not([inert]) [role="dialog"]',
      );
      if (
        container.hasAttribute("data-modal-open") &&
        !topModal?.contains(target)
      ) {
        return;
      }
      if (!isTooltipClaim(container, claimRef.current)) {
        claimRef.current = claimTooltip(container, close);
      }
      describedTargetRef.current = target;
      setVisible(true);
    },
    [close, container, disabled],
  );

  const scheduleOpen = useCallback(
    (target: HTMLElement) => {
      clearTimer();
      if (!container || disabled) {
        return;
      }
      describedTargetRef.current = target;
      claimRef.current = claimTooltip(container, close);
      timerRef.current = window.setTimeout(
        () => open(target),
        POINTER_OPEN_DELAY,
      );
    },
    [clearTimer, close, container, disabled, open],
  );

  const scheduleClose = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(close, CLOSE_GRACE_DELAY);
  }, [clearTimer, close]);

  useLayoutEffect(() => {
    if (!visible || !container || !wrapperRef.current || !bubbleRef.current) {
      return;
    }
    const editorRect = container.getBoundingClientRect();
    const triggerRect = wrapperRef.current.getBoundingClientRect();
    const tooltipRect = bubbleRef.current.getBoundingClientRect();
    setPosition(
      resolveTooltipPosition({
        editor: editorRect,
        trigger: triggerRect,
        tooltip: tooltipRect,
        safeArea: readLargeSurfaceSafeAreaInsets(container),
      }),
    );
  }, [container, label, long, visible]);

  useEffect(() => {
    const target = describedTargetRef.current;
    if (visible && target) {
      target.setAttribute("aria-describedby", tooltipId);
    }
    return () => {
      if (target?.getAttribute("aria-describedby") === tooltipId) {
        target.removeAttribute("aria-describedby");
      }
    };
  }, [tooltipId, visible]);

  useEffect(() => {
    if (disabled) {
      close();
    }
  }, [close, disabled]);

  useEffect(() => {
    if (!container) {
      return;
    }
    const enforceTopModalOwnership = () => {
      if (!claimRef.current) {
        return;
      }
      const topModal = container.querySelector<HTMLElement>(
        '.excalidraw-modal-container:not([inert]) [role="dialog"]',
      );
      if (
        container.hasAttribute("data-modal-open") &&
        !topModal?.contains(describedTargetRef.current)
      ) {
        close();
      }
    };
    enforceTopModalOwnership();
    return subscribeToModalChanges(container, enforceTopModalOwnership);
  }, [close, container]);

  useEffect(
    () => () => {
      clearTimer();
      if (container) {
        releaseTooltip(container, claimRef.current);
      }
      const target = describedTargetRef.current;
      if (target?.getAttribute("aria-describedby") === tooltipId) {
        target.removeAttribute("aria-describedby");
      }
    },
    [clearTimer, container, tooltipId],
  );

  return (
    <>
      <div
        className="excalidraw-tooltip-wrapper"
        ref={wrapperRef}
        onPointerEnter={(event) => {
          if (
            !disabled &&
            event.pointerType !== "touch" &&
            !editorInterface.isTouchScreen
          ) {
            scheduleOpen(
              event.currentTarget.querySelector<HTMLElement>(
                TOOLTIP_TARGET_SELECTOR,
              ) ?? event.currentTarget,
            );
          }
        }}
        onPointerLeave={disabled ? undefined : scheduleClose}
        onFocusCapture={
          disabled ? undefined : (event) => open(event.target as HTMLElement)
        }
        onBlurCapture={(event) => {
          if (
            !disabled &&
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            scheduleClose();
          }
        }}
        style={style}
      >
        {children}
      </div>
      {visible &&
        portal &&
        createPortal(
          <div
            className="excalidraw-tooltip"
            id={tooltipId}
            role="tooltip"
            data-tooltip-long={long || undefined}
            ref={bubbleRef}
            style={position}
          >
            {label}
          </div>,
          portal,
        )}
    </>
  );
};
