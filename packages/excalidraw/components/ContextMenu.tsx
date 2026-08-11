import React, { useEffect, useMemo, useRef } from "react";

import { KEYS } from "@excalidraw/common";

import { getShortcutFromShortcutName } from "../actions/shortcuts";
import { t } from "../i18n";

import {
  useEditorInterface,
  useExcalidrawAppState,
  useExcalidrawContainer,
  useExcalidrawElements,
} from "./App";
import {
  FloatingSurfaceCheck,
  FloatingSurfaceFrame,
  FloatingSurfaceItemVisual,
  FloatingSurfaceScrollViewport,
  FloatingSurfaceSeparator,
  FloatingSurfaceShortcut,
  readEditorSafeAreaInsets,
  resolveFloatingSurfacePolicy,
  useFloatingSurfaceOwner,
} from "./floatingSurface";
import { Popover } from "./Popover";

import "./ContextMenu.scss";

import type { ActionManager } from "../actions/manager";
import type { ShortcutName } from "../actions/shortcuts";
import type { Action } from "../actions/types";
import type { TranslationKeys } from "../i18n";

export type ContextMenuItem = typeof CONTEXT_MENU_SEPARATOR | Action;
export type ContextMenuItems = (ContextMenuItem | false | null | undefined)[];

type ContextMenuProps = {
  actionManager: ActionManager;
  items: ContextMenuItems;
  top: number;
  left: number;
  onClose: (callback?: () => void) => void;
};

export const CONTEXT_MENU_SEPARATOR = "separator";

export const ContextMenu = React.memo(
  ({ actionManager, items, top, left, onClose }: ContextMenuProps) => {
    const appState = useExcalidrawAppState();
    const elements = useExcalidrawElements();
    const editorInterface = useEditorInterface();
    const { container, id: editorId } = useExcalidrawContainer();
    const menuRef = useRef<HTMLUListElement>(null);
    const typeaheadRef = useRef({ value: "", timeout: 0 });
    const direction =
      container?.getAttribute("dir") === "rtl" ||
      container?.closest<HTMLElement>("[dir=rtl]")
        ? "rtl"
        : "ltr";
    const policy = resolveFloatingSurfacePolicy({
      kind: "context-menu",
      intent: "pointer-anchor",
      formFactor: editorInterface.formFactor === "phone" ? "phone" : "desktop",
      direction,
      pointerDensity: editorInterface.isTouchScreen ? "coarse" : "fine",
      availableBlockSize: container?.clientHeight ?? appState.height,
      safeArea: readEditorSafeAreaInsets(container),
    });
    const owner = useFloatingSurfaceOwner({
      scope: `${editorId ?? "editor"}:context-menu`,
      identity: "canvas-context",
      open: true,
      onOpenChange: (open) => {
        if (!open) {
          onClose();
        }
      },
    });

    const close = (callback?: () => void) => {
      owner.markClosed();
      onClose(callback);
    };

    const filteredItems = useMemo(
      () =>
        items.reduce((acc: ContextMenuItem[], item) => {
          if (
            item &&
            (item === CONTEXT_MENU_SEPARATOR ||
              !item.predicate ||
              item.predicate(
                elements,
                appState,
                actionManager.app.props,
                actionManager.app,
              ))
          ) {
            acc.push(item);
          }
          return acc;
        }, []),
      [actionManager, appState, elements, items],
    );

    const getItems = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>(
          '[role^="menuitem"]:not(:disabled)',
        ) ?? [],
      );

    useEffect(() => {
      const typeahead = typeaheadRef.current;
      getItems()[0]?.focus();
      return () => window.clearTimeout(typeahead.timeout);
    }, []);

    const moveFocus = (target: "first" | "last" | "next" | "previous") => {
      const entries = getItems();
      if (!entries.length) {
        return;
      }
      const current = entries.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      const nextIndex =
        target === "first"
          ? 0
          : target === "last"
          ? entries.length - 1
          : target === "next"
          ? (current + 1 + entries.length) % entries.length
          : (current - 1 + entries.length) % entries.length;
      entries[nextIndex]?.focus();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
      if (event.key === KEYS.ESCAPE) {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === KEYS.TAB) {
        close();
        return;
      }
      const movement =
        event.key === KEYS.ARROW_DOWN
          ? "next"
          : event.key === KEYS.ARROW_UP
          ? "previous"
          : event.key === "Home"
          ? "first"
          : event.key === "End"
          ? "last"
          : null;
      if (movement) {
        event.preventDefault();
        moveFocus(movement);
        return;
      }
      if (
        event.key.length === 1 &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        window.clearTimeout(typeaheadRef.current.timeout);
        typeaheadRef.current.value += event.key.toLocaleLowerCase();
        const query = typeaheadRef.current.value;
        const match = getItems().find((entry) =>
          entry.textContent?.trim().toLocaleLowerCase().startsWith(query),
        );
        match?.focus();
        typeaheadRef.current.timeout = window.setTimeout(() => {
          typeaheadRef.current.value = "";
        }, 500);
      }
    };

    return (
      <Popover
        onCloseRequest={() => close()}
        top={top}
        left={left}
        fitInViewport
        viewportWidth={container?.clientWidth ?? appState.width}
        viewportHeight={container?.clientHeight ?? appState.height}
        className="context-menu-popover floating-surface-positioner"
        autoFocus={false}
        trapTab={false}
        collisionPadding={8}
        direction={direction}
        safeArea={readEditorSafeAreaInsets(container)}
      >
        <FloatingSurfaceFrame
          className="context-menu-frame"
          density={policy.density}
          kind="context-menu"
        >
          <FloatingSurfaceScrollViewport>
            <ul
              ref={menuRef}
              className="context-menu"
              role="menu"
              style={{ minInlineSize: 0, inlineSize: "100%" }}
              onKeyDown={onKeyDown}
              onContextMenu={(event) => event.preventDefault()}
            >
              {filteredItems.map((item, idx) => {
                if (item === CONTEXT_MENU_SEPARATOR) {
                  if (
                    !filteredItems[idx - 1] ||
                    filteredItems[idx - 1] === CONTEXT_MENU_SEPARATOR
                  ) {
                    return null;
                  }
                  return (
                    <FloatingSurfaceSeparator
                      key={idx}
                      className="context-menu-item-separator"
                    />
                  );
                }

                const actionName = item.name;
                let label = "";
                if (item.label) {
                  label =
                    typeof item.label === "function"
                      ? t(
                          item.label(
                            elements,
                            appState,
                            actionManager.app,
                          ) as unknown as TranslationKeys,
                        )
                      : t(item.label as unknown as TranslationKeys);
                }
                const checked = item.checked?.(appState) ?? false;
                const checkable = typeof item.checked === "function";
                const destructive = actionName === "deleteSelectedElements";

                return (
                  <li
                    key={idx}
                    data-testid={actionName}
                    role="none"
                    style={{ minInlineSize: 0, inlineSize: "100%" }}
                  >
                    <FloatingSurfaceItemVisual
                      asChild
                      checked={checked}
                      destructive={destructive}
                    >
                      <button
                        type="button"
                        className="context-menu-item"
                        data-destructive={destructive || undefined}
                        role={checkable ? "menuitemcheckbox" : "menuitem"}
                        aria-checked={checkable ? checked : undefined}
                        tabIndex={-1}
                        onPointerMove={(event) =>
                          event.currentTarget.focus({ preventScroll: true })
                        }
                        onClick={() => {
                          close(() => {
                            actionManager.executeAction(item, "contextMenu");
                          });
                        }}
                      >
                        <FloatingSurfaceCheck aria-hidden="true">
                          {checked ? "✓" : null}
                        </FloatingSurfaceCheck>
                        <span className="context-menu-item__label">
                          {label}
                        </span>
                        <FloatingSurfaceShortcut className="context-menu-item__shortcut">
                          {actionName
                            ? getShortcutFromShortcutName(
                                actionName as ShortcutName,
                              )
                            : ""}
                        </FloatingSurfaceShortcut>
                      </button>
                    </FloatingSurfaceItemVisual>
                  </li>
                );
              })}
            </ul>
          </FloatingSurfaceScrollViewport>
        </FloatingSurfaceFrame>
      </Popover>
    );
  },
);
