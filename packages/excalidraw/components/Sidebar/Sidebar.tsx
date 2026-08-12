import clsx from "clsx";
import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
} from "react";

import {
  CLASSES,
  EVENT,
  isDevEnv,
  KEYS,
  updateObject,
} from "@excalidraw/common";

import { useUIAppState } from "../../context/ui-appState";
import { atom, useSetAtom } from "../../editor-jotai";
import { useOutsideClick } from "../../hooks/useOutsideClick";
import {
  useEditorInterface,
  useExcalidrawAppState,
  useExcalidrawContainer,
  useExcalidrawSetAppState,
} from "../App";
import { Island } from "../Island";
import {
  readLargeSurfaceSafeAreaInsets,
  resolveLargeSurfacePolicy,
} from "../largeSurface";

import { SidebarHeader } from "./SidebarHeader";
import { SidebarTabTrigger } from "./SidebarTabTrigger";
import { SidebarTabTriggers } from "./SidebarTabTriggers";
import { SidebarTrigger } from "./SidebarTrigger";
import { SidebarPropsContext } from "./common";
import { SidebarTabs } from "./SidebarTabs";
import { SidebarTab } from "./SidebarTab";
import {
  claimSidebarPresentation,
  isSidebarPresentationClaim,
  releaseSidebarPresentation,
} from "./presentationOwner";
import {
  SIDEBAR_DEFAULT_INLINE_SIZE,
  resolveSidebarResize,
} from "./resizePolicy";

import "./Sidebar.scss";

import type { SidebarProps, SidebarPropsContextValue } from "./common";

/**
 * Flags whether the currently rendered Sidebar is docked or not, for use
 * in upstream components that need to act on this (e.g. LayerUI to shift the
 * UI). We use an atom because of potential host app sidebars (for the default
 * sidebar we could just read from appState.defaultSidebarDockedPreference).
 *
 * Since we can only render one Sidebar at a time, we can use a simple flag.
 */
export const isSidebarDockedAtom = atom(false);

export const SidebarInner = forwardRef(
  (
    {
      name,
      children,
      onDock,
      docked,
      className,
      ...rest
    }: SidebarProps & Omit<React.RefAttributes<HTMLDivElement>, "onSelect">,
    ref: React.ForwardedRef<HTMLDivElement>,
  ) => {
    if (isDevEnv() && onDock && docked == null) {
      console.warn(
        "Sidebar: `docked` must be set when `onDock` is supplied for the sidebar to be user-dockable. To hide this message, either pass `docked` or remove `onDock`",
      );
    }

    const setAppState = useExcalidrawSetAppState();

    const setIsSidebarDockedAtom = useSetAtom(isSidebarDockedAtom);

    const editorInterface = useEditorInterface();
    const appState = useExcalidrawAppState();
    const { container } = useExcalidrawContainer();
    const direction = document.documentElement.dir === "rtl" ? "rtl" : "ltr";
    const safeArea = readLargeSurfaceSafeAreaInsets(container);
    const [requestedInlineSize, setRequestedInlineSize] = useState(
      SIDEBAR_DEFAULT_INLINE_SIZE,
    );
    const resizeHandleRef = useRef<HTMLDivElement>(null);
    const presentationClaimRef = useRef<symbol | null>(null);
    const resizeRef = useRef<{
      pointerId: number;
      target: HTMLDivElement;
      startClientX: number;
      startInlineSize: number;
    } | null>(null);
    const effectivelyDocked = !!docked && editorInterface.canFitSidebar;
    const presentation = effectivelyDocked ? "docked" : "overlay";
    const resizeAllowed =
      !!onDock &&
      docked != null &&
      editorInterface.formFactor !== "phone" &&
      editorInterface.canFitSidebar;
    const policy = resolveLargeSurfacePolicy({
      kind: "sidebar",
      presentation,
      size: "small",
      requestedInlineSize,
      container: { width: appState.width, height: appState.height },
      safeArea,
      formFactor: editorInterface.formFactor,
      direction,
      coarsePointer: editorInterface.isTouchScreen,
    });

    const availableInlineSize = Math.max(
      0,
      appState.width - safeArea.left - safeArea.right,
    );

    useEffect(
      () => () => {
        const activeResize = resizeRef.current;
        const handle = activeResize?.target ?? resizeHandleRef.current;
        if (
          activeResize &&
          handle?.hasPointerCapture?.(activeResize.pointerId)
        ) {
          handle.releasePointerCapture(activeResize.pointerId);
        }
        resizeRef.current = null;
      },
      [],
    );

    useLayoutEffect(() => {
      if (!container) {
        return;
      }
      const token = claimSidebarPresentation(container);
      presentationClaimRef.current = token;
      setIsSidebarDockedAtom(effectivelyDocked);
      return () => {
        if (releaseSidebarPresentation(container, token)) {
          setIsSidebarDockedAtom(false);
        }
        if (presentationClaimRef.current === token) {
          presentationClaimRef.current = null;
        }
      };
    }, [container, effectivelyDocked, setIsSidebarDockedAtom]);

    const headerPropsRef = useRef<SidebarPropsContextValue>(
      {} as SidebarPropsContextValue,
    );
    headerPropsRef.current.onCloseRequest = () => {
      setAppState({ openSidebar: null });
    };
    headerPropsRef.current.onDock = (isDocked) => onDock?.(isDocked);
    // renew the ref object if the following props change since we want to
    // rerender. We can't pass down as component props manually because
    // the <Sidebar.Header/> can be rendered upstream.
    headerPropsRef.current = updateObject(headerPropsRef.current, {
      docked,
      // explicit prop to rerender on update
      shouldRenderDockButton: !!onDock && docked != null,
    });

    const islandRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => {
      return islandRef.current!;
    });

    const closeLibrary = useCallback(() => {
      if (
        container &&
        !isSidebarPresentationClaim(container, presentationClaimRef.current)
      ) {
        return;
      }
      const isDialogOpen = !!container?.querySelector(".Dialog");

      // Prevent closing if any dialog is open
      if (isDialogOpen) {
        return;
      }
      setAppState({ openSidebar: null });
    }, [container, setAppState]);

    useOutsideClick(
      islandRef,
      useCallback(
        (event) => {
          // If click on the library icon, do nothing so that LibraryButton
          // can toggle library menu
          if ((event.target as Element).closest(".sidebar-trigger")) {
            return;
          }
          if (!effectivelyDocked) {
            closeLibrary();
          }
        },
        [closeLibrary, effectivelyDocked],
      ),
    );

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === KEYS.ESCAPE && !effectivelyDocked) {
          closeLibrary();
        }
      };
      document.addEventListener(EVENT.KEYDOWN, handleKeyDown);
      return () => {
        document.removeEventListener(EVENT.KEYDOWN, handleKeyDown);
      };
    }, [closeLibrary, effectivelyDocked]);

    return (
      <Island
        {...rest}
        className={clsx(
          CLASSES.SIDEBAR,
          {
            "sidebar--docked": effectivelyDocked,
            "sidebar--overlay": !effectivelyDocked,
          },
          className,
        )}
        data-large-surface
        data-large-surface-kind="sidebar"
        data-large-surface-presentation={presentation}
        data-large-surface-density={policy.density}
        data-large-surface-elevation={policy.elevation}
        data-viewport-ui={effectivelyDocked ? "side" : undefined}
        data-viewport-ui-name={effectivelyDocked ? "sidebar" : undefined}
        style={
          {
            "--sidebar-inline-size": `${policy.inlineSize}px`,
            "--sidebar-safe-top": `${policy.inset.top}px`,
            "--sidebar-safe-right": `${policy.inset.right}px`,
            "--sidebar-safe-bottom": `${policy.inset.bottom}px`,
            "--sidebar-safe-left": `${policy.inset.left}px`,
          } as React.CSSProperties
        }
        ref={islandRef}
      >
        {resizeAllowed && (
          <div
            className="sidebar__resize-handle"
            data-sidebar-resize-handle
            data-coarse-pointer={editorInterface.isTouchScreen || undefined}
            role="separator"
            aria-orientation="vertical"
            aria-valuemin={Math.min(240, availableInlineSize)}
            aria-valuemax={Math.min(480, availableInlineSize)}
            aria-valuenow={Math.round(policy.inlineSize)}
            tabIndex={0}
            ref={resizeHandleRef}
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }
              resizeRef.current = {
                pointerId: event.pointerId,
                target: event.currentTarget,
                startClientX: event.clientX,
                startInlineSize: policy.inlineSize,
              };
              event.currentTarget.setPointerCapture?.(event.pointerId);
              event.preventDefault();
            }}
            onPointerMove={(event) => {
              const activeResize = resizeRef.current;
              if (activeResize?.pointerId !== event.pointerId) {
                return;
              }
              setRequestedInlineSize(
                resolveSidebarResize({
                  startInlineSize: activeResize.startInlineSize,
                  startClientX: activeResize.startClientX,
                  clientX: event.clientX,
                  direction,
                  availableInlineSize,
                }),
              );
            }}
            onPointerUp={(event) => {
              if (resizeRef.current?.pointerId !== event.pointerId) {
                return;
              }
              resizeRef.current = null;
              if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onPointerCancel={() => {
              resizeRef.current = null;
            }}
            onLostPointerCapture={() => {
              resizeRef.current = null;
            }}
            onKeyDown={(event) => {
              if (
                event.key !== KEYS.ARROW_LEFT &&
                event.key !== KEYS.ARROW_RIGHT
              ) {
                return;
              }
              const logicalDelta = event.key === KEYS.ARROW_LEFT ? -8 : 8;
              setRequestedInlineSize((inlineSize) =>
                resolveSidebarResize({
                  startInlineSize: inlineSize,
                  startClientX: 0,
                  clientX: logicalDelta,
                  direction,
                  availableInlineSize,
                }),
              );
              event.preventDefault();
            }}
          />
        )}
        <SidebarPropsContext.Provider value={headerPropsRef.current}>
          {children}
        </SidebarPropsContext.Provider>
      </Island>
    );
  },
);
SidebarInner.displayName = "SidebarInner";

export const Sidebar = Object.assign(
  forwardRef((props: SidebarProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const appState = useUIAppState();

    const { onStateChange } = props;

    const refPrevOpenSidebar = useRef(appState.openSidebar);
    useEffect(() => {
      if (
        // closing sidebar
        ((!appState.openSidebar &&
          refPrevOpenSidebar?.current?.name === props.name) ||
          // opening current sidebar
          (appState.openSidebar?.name === props.name &&
            refPrevOpenSidebar?.current?.name !== props.name) ||
          // switching tabs or switching to a different sidebar
          refPrevOpenSidebar.current?.name === props.name) &&
        appState.openSidebar !== refPrevOpenSidebar.current
      ) {
        onStateChange?.(
          appState.openSidebar?.name !== props.name
            ? null
            : appState.openSidebar,
        );
      }
      refPrevOpenSidebar.current = appState.openSidebar;
    }, [appState.openSidebar, onStateChange, props.name]);

    const [mounted, setMounted] = useState(false);
    useLayoutEffect(() => {
      setMounted(true);
      return () => setMounted(false);
    }, []);

    const shouldRender = mounted && appState.openSidebar?.name === props.name;

    if (!shouldRender) {
      return null;
    }

    return <SidebarInner {...props} ref={ref} key={props.name} />;
  }),
  {
    Header: SidebarHeader,
    TabTriggers: SidebarTabTriggers,
    TabTrigger: SidebarTabTrigger,
    Tabs: SidebarTabs,
    Tab: SidebarTab,
    Trigger: SidebarTrigger,
  },
);
Sidebar.displayName = "Sidebar";
