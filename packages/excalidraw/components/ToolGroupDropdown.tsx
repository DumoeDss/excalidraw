import clsx from "clsx";
import { useCallback, useId, useRef } from "react";

import type { PointerType } from "@excalidraw/element/types";

import { activateToolbarTool } from "./Tools";
import DropdownMenu from "./dropdownMenu/DropdownMenu";

import "./ToolGroupDropdown.scss";

import type { AppClassProperties } from "../types";
import type { JSX } from "react";

export type ToolGroupOption = {
  type: string;
  icon: JSX.Element;
  label: string;
  shortcut?: string;
  fillable?: boolean;
  disabled?: boolean;
  "data-testid"?: string;
};

type ToolGroupDropdownProps = {
  app: AppClassProperties;
  activeToolType: string;
  options: readonly ToolGroupOption[];
  title: string;
  "data-testid"?: string;
  ownerIdentity?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** remembers the last picked tool so the trigger reflects it */
  lastSelectedType: string;
  onLastSelectedTypeChange: (type: string) => void;
  /** override how a tool is activated (defaults to the shared authority) */
  onSelectTool?: (type: string, pointerType: PointerType | null) => void;
  /**
   * Whether clicking the trigger also activates the displayed tool (default).
   * Set to `false` when activating a tool has an immediate side effect (e.g.
   * the upload tools open a file picker) so the trigger only reveals the menu.
   */
  activateOnOpen?: boolean;
  menuClassName?: string;
  collisionBoundary?: Element | null;
  onClickOutside?: () => void;
  onEscapeKeyDown?: () => void;
  onCloseAutoFocus?: (event: Event) => void;
  shouldRestoreFocusOnClose?: () => boolean;
};

/**
 * A collision-aware toolbar menu for semantic tool groups. The trigger and
 * menu delegate activation to the same pointer-aware authority as standalone
 * tool buttons.
 */
export const ToolGroupDropdown = ({
  app,
  activeToolType,
  options,
  title,
  "data-testid": dataTestId,
  ownerIdentity,
  isOpen,
  onOpenChange,
  lastSelectedType,
  onLastSelectedTypeChange,
  onSelectTool,
  activateOnOpen = true,
  menuClassName,
  collisionBoundary,
  onClickOutside,
  onEscapeKeyDown,
  onCloseAutoFocus,
  shouldRestoreFocusOnClose,
}: ToolGroupDropdownProps) => {
  const generatedMenuId = useId();
  const menuId = ownerIdentity ?? generatedMenuId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lastPointerTypeRef = useRef<PointerType | null>(null);
  const activeOption = options.find((option) => option.type === activeToolType);
  const displayedOption =
    activeOption ??
    options.find((option) => option.type === lastSelectedType) ??
    options[0];
  const isGroupActive = Boolean(activeOption);

  const activateTool = useCallback(
    (type: string, pointerType: PointerType | null) => {
      onLastSelectedTypeChange(type);
      if (onSelectTool) {
        onSelectTool(type, pointerType);
      } else {
        activateToolbarTool(app, type, pointerType);
      }
    },
    [app, onSelectTool, onLastSelectedTypeChange],
  );

  const rememberPointerType = (pointerType: string) => {
    lastPointerTypeRef.current = (pointerType || null) as PointerType | null;
  };
  const clearPointerTypeAfterActivation = () => {
    requestAnimationFrame(() => {
      lastPointerTypeRef.current = null;
    });
  };

  return (
    <DropdownMenu
      open={isOpen}
      ownerIdentity={menuId}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (open && activateOnOpen) {
          activateTool(displayedOption.type, lastPointerTypeRef.current);
        } else if (!open && (shouldRestoreFocusOnClose?.() ?? true)) {
          requestAnimationFrame(() => triggerRef.current?.focus());
        }
      }}
    >
      <DropdownMenu.Trigger
        ref={triggerRef}
        className={clsx("Shape adaptive-editor-toolbar__group-trigger", {
          fillable: displayedOption.fillable && isGroupActive,
          "adaptive-editor-toolbar__group-trigger--selected":
            isGroupActive || isOpen,
        })}
        title={title}
        aria-label={title}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-pressed={isGroupActive || undefined}
        data-testid={dataTestId}
        disabled={options.every((option) => option.disabled)}
        onPointerDown={(event) => rememberPointerType(event.pointerType)}
        onPointerUp={clearPointerTypeAfterActivation}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
            return;
          }
          event.preventDefault();
          if (!isOpen) {
            onOpenChange(true);
          }
          requestAnimationFrame(() => {
            const entries = Array.from(
              document
                .getElementById(menuId)
                ?.querySelectorAll<HTMLButtonElement>(
                  '[role="menuitemradio"]:not(:disabled)',
                ) ?? [],
            );
            const entry =
              event.key === "ArrowDown" ? entries[0] : entries.at(-1);
            entry?.focus();
          });
        }}
      >
        <div className="ToolIcon__icon" aria-hidden="true">
          {displayedOption.icon}
        </div>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        id={menuId}
        onSelect={() => onOpenChange(false)}
        onClickOutside={onClickOutside}
        onEscapeKeyDown={onEscapeKeyDown}
        onCloseAutoFocus={onCloseAutoFocus}
        className={clsx(
          "tool-group-dropdown__menu adaptive-editor-toolbar__menu",
          menuClassName,
        )}
        align="center"
        side="top"
        surfaceKind="toolbar-menu"
        placementIntent="toolbar-up"
        collisionBoundary={collisionBoundary}
      >
        {options.map(
          ({
            type,
            icon,
            label,
            shortcut,
            disabled,
            "data-testid": testId,
          }) => (
            <DropdownMenu.Item
              key={type}
              icon={icon}
              shortcut={shortcut}
              selected={activeToolType === type}
              title={label}
              aria-label={label}
              aria-keyshortcuts={shortcut}
              role="menuitemradio"
              aria-checked={activeToolType === type}
              data-testid={testId ?? `toolbar-${type}`}
              disabled={disabled}
              onPointerDown={(event) => rememberPointerType(event.pointerType)}
              onPointerUp={clearPointerTypeAfterActivation}
              onSelect={() => activateTool(type, lastPointerTypeRef.current)}
            >
              {label}
            </DropdownMenu.Item>
          ),
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
