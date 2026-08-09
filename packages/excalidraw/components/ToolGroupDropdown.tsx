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
  isOpen,
  onOpenChange,
  lastSelectedType,
  onLastSelectedTypeChange,
  onSelectTool,
  activateOnOpen = true,
  menuClassName,
  collisionBoundary,
}: ToolGroupDropdownProps) => {
  const menuId = useId();
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

  const closeAndFocusTrigger = useCallback(() => {
    onOpenChange(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [onOpenChange]);

  const rememberPointerType = (pointerType: string) => {
    lastPointerTypeRef.current = (pointerType || null) as PointerType | null;
  };
  const clearPointerTypeAfterActivation = () => {
    requestAnimationFrame(() => {
      lastPointerTypeRef.current = null;
    });
  };

  return (
    <DropdownMenu open={isOpen}>
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
        onToggle={() => {
          const willOpen = !isOpen;
          onOpenChange(willOpen);
          if (activateOnOpen && willOpen) {
            activateTool(displayedOption.type, lastPointerTypeRef.current);
          }
        }}
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
        onClickOutside={closeAndFocusTrigger}
        onSelect={() => onOpenChange(false)}
        className={clsx(
          "tool-group-dropdown__menu adaptive-editor-toolbar__menu",
          menuClassName,
        )}
        align="center"
        side="top"
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
