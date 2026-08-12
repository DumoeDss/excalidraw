import clsx from "clsx";
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import { KEYS, queryFocusableElements } from "@excalidraw/common";

import { useCreatePortalContainer } from "../hooks/useCreatePortalContainer";

import {
  useEditorInterface,
  useExcalidrawAppState,
  useExcalidrawContainer,
} from "./App";
import { LargeSurfaceFrame } from "./largeSurface";
import {
  readLargeSurfaceSafeAreaInsets,
  resolveLargeSurfacePolicy,
} from "./largeSurface/policy";
import {
  claimModal,
  isTopModalClaim,
  releaseModal,
} from "./largeSurface/modalOwner";

import "./Modal.scss";

import type { AppState } from "../types";
import type { LargeSurfaceSize } from "./largeSurface";

export const Modal: React.FC<{
  className?: string;
  children: React.ReactNode;
  maxWidth?: number;
  surfaceSize?: LargeSurfaceSize;
  onCloseRequest(): void;
  labelledBy?: string;
  theme?: AppState["theme"];
  closeOnClickOutside?: boolean;
  autofocus?: boolean;
  logicalId: string;
  header?: React.ReactNode;
}> = (props) => {
  const { closeOnClickOutside = true } = props;
  const modalRoot = useCreatePortalContainer({
    className: "excalidraw-modal-container",
    editorPortal: true,
  });
  const { container } = useExcalidrawContainer();
  const appState = useExcalidrawAppState();
  const editorInterface = useEditorInterface();
  const frameRef = useRef<HTMLDivElement>(null);
  const claimRef = useRef<symbol | null>(null);
  const onCloseRequestRef = useRef(props.onCloseRequest);
  onCloseRequestRef.current = props.onCloseRequest;

  const animationsDisabledRef = useRef(
    document.body.classList.contains("excalidraw-animations-disabled"),
  );

  const policy = useMemo(
    () =>
      resolveLargeSurfacePolicy({
        kind: "dialog",
        presentation: "centered",
        size: props.surfaceSize ?? "regular",
        requestedInlineSize: props.maxWidth,
        container: { width: appState.width, height: appState.height },
        safeArea: readLargeSurfaceSafeAreaInsets(container),
        formFactor: editorInterface.formFactor,
        direction: document.documentElement.dir === "rtl" ? "rtl" : "ltr",
        coarsePointer: editorInterface.isTouchScreen,
      }),
    [
      appState.height,
      appState.width,
      container,
      editorInterface.formFactor,
      editorInterface.isTouchScreen,
      props.maxWidth,
      props.surfaceSize,
    ],
  );

  useEffect(() => {
    if (!container || !modalRoot || !frameRef.current) {
      return;
    }
    const token = claimModal({
      editor: container,
      logicalId: props.logicalId,
      portal: modalRoot,
      returnTarget:
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null,
    });
    claimRef.current = token;
    const focusTimer = window.setTimeout(() => {
      if (
        props.autofocus === false ||
        !frameRef.current ||
        !isTopModalClaim(container, token)
      ) {
        return;
      }
      const focusable = queryFocusableElements(frameRef.current);
      const initialTarget =
        frameRef.current.querySelector<HTMLElement>("[data-autofocus]") ??
        focusable.find(
          (element) => !element.matches("[data-destructive], .Dialog__close"),
        ) ??
        focusable[0] ??
        frameRef.current;
      initialTarget.focus({ preventScroll: true });
    });

    return () => {
      window.clearTimeout(focusTimer);
      releaseModal({ editor: container, token });
      if (claimRef.current === token) {
        claimRef.current = null;
      }
    };
  }, [container, modalRoot, props.autofocus, props.logicalId]);

  useEffect(() => {
    if (!container) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key !== KEYS.ESCAPE ||
        !isTopModalClaim(container, claimRef.current)
      ) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      onCloseRequestRef.current();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [container]);

  if (!modalRoot) {
    return null;
  }

  const handleKeydown = (event: React.KeyboardEvent) => {
    if (!container || !isTopModalClaim(container, claimRef.current)) {
      return;
    }
    if (event.key === KEYS.TAB && frameRef.current) {
      const focusable = queryFocusableElements(frameRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        frameRef.current.focus({ preventScroll: true });
        return;
      }
      const activeElement = document.activeElement;
      const currentIndex = focusable.findIndex(
        (element) => element === activeElement,
      );
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusable.length - 1
          : currentIndex - 1
        : currentIndex < 0 || currentIndex === focusable.length - 1
        ? 0
        : currentIndex + 1;
      event.preventDefault();
      focusable[nextIndex].focus({ preventScroll: true });
    }
  };

  return createPortal(
    <div
      className={clsx("Modal", props.className, {
        "animations-disabled": animationsDisabledRef.current,
      })}
      onKeyDown={handleKeydown}
      data-large-surface-positioner
      data-large-surface-presentation={policy.presentation}
      style={
        {
          "--large-surface-inline-size": `${policy.inlineSize}px`,
          "--large-surface-max-block-size": `${policy.maxBlockSize}px`,
          "--large-surface-safe-top": `${policy.inset.top}px`,
          "--large-surface-safe-right": `${policy.inset.right}px`,
          "--large-surface-safe-bottom": `${policy.inset.bottom}px`,
          "--large-surface-safe-left": `${policy.inset.left}px`,
        } as React.CSSProperties
      }
    >
      <div
        className="Modal__background"
        data-large-surface-scrim
        onPointerDown={(event) => {
          if (
            closeOnClickOutside &&
            event.isTrusted &&
            container &&
            isTopModalClaim(container, claimRef.current)
          ) {
            props.onCloseRequest();
          }
        }}
      />
      <LargeSurfaceFrame
        className="Modal__content"
        kind="dialog"
        presentation={policy.presentation}
        density={policy.density}
        elevation={policy.elevation}
        header={props.header}
        role="dialog"
        aria-modal="true"
        aria-labelledby={props.labelledBy}
        tabIndex={-1}
        ref={frameRef}
      >
        {props.children}
      </LargeSurfaceFrame>
    </div>,
    modalRoot,
  );
};
