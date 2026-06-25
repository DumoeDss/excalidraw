import clsx from "clsx";
import { useCallback } from "react";

import { trackEvent } from "../analytics";

import { ToolButton } from "./ToolButton";
import { Island } from "./Island";

import "./ToolGroupDropdown.scss";

import type { AppClassProperties } from "../types";
import type { JSX } from "react";

export type ToolGroupOption = {
  type: string;
  icon: JSX.Element;
  label: string;
  shortcut?: string;
  fillable?: boolean;
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
  /** override how a tool is activated (defaults to app.setActiveTool) */
  onSelectTool?: (type: string) => void;
  /**
   * Whether clicking the trigger also activates the displayed tool (default).
   * Set to `false` when activating a tool has an immediate side effect (e.g.
   * the upload tools open a file picker) so the trigger only reveals the menu.
   */
  activateOnOpen?: boolean;
};

/**
 * A toolbar button that groups related tools (e.g. selection/hand, the shapes)
 * behind a single trigger and reveals them in a vertical, labeled dropdown.
 *
 * The dropdown content stays mounted and is toggled via CSS so that each tool's
 * `data-testid` remains queryable/clickable (the test-suite selects tools
 * without opening the group).
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
}: ToolGroupDropdownProps) => {
  const activeOption = options.find((o) => o.type === activeToolType);
  const displayedOption =
    activeOption ??
    options.find((o) => o.type === lastSelectedType) ??
    options[0];
  const isGroupActive = Boolean(activeOption);

  const activateTool = useCallback(
    (type: string) => {
      onLastSelectedTypeChange(type);
      // re-activating the current tool is a no-op, mirroring the native radio
      // tool buttons (otherwise it would trigger a redundant scene render)
      if (app.state.activeTool.type === type) {
        return;
      }
      trackEvent("toolbar", type, "ui");
      if (onSelectTool) {
        onSelectTool(type);
      } else {
        app.setActiveTool({ type: type as any });
      }
    },
    [app, onSelectTool, onLastSelectedTypeChange],
  );

  return (
    <div className="tool-group-dropdown">
      <ToolButton
        className={clsx("Shape", {
          fillable: displayedOption.fillable && isGroupActive,
        })}
        type="radio"
        icon={displayedOption.icon}
        checked={isGroupActive}
        name="editor-current-shape"
        title={title}
        aria-label={title}
        data-testid={dataTestId}
        onPointerDown={() => {
          const willOpen = !isOpen;
          onOpenChange(willOpen);
          // mirror the native tool buttons by activating the displayed tool,
          // unless doing so has a side effect (e.g. opening a file picker), in
          // which case the trigger only reveals the menu
          if (activateOnOpen && willOpen) {
            activateTool(displayedOption.type);
          }
        }}
      />
      <div
        className={clsx("tool-group-dropdown__menu dropdown-menu", {
          "tool-group-dropdown__menu--open": isOpen,
        })}
      >
        <Island
          className="dropdown-menu-container tool-group-dropdown__container"
          padding={2}
        >
          {options.map(
            ({ type, icon, label, shortcut, "data-testid": testId }) => (
              <button
                key={type}
                type="button"
                className={clsx(
                  "dropdown-menu-item dropdown-menu-item-base tool-group-dropdown__item",
                  {
                    "dropdown-menu-item--selected": activeToolType === type,
                  },
                )}
                title={label}
                aria-label={label}
                data-testid={testId ?? `toolbar-${type}`}
                onClick={() => {
                  activateTool(type);
                  onOpenChange(false);
                }}
              >
                <div className="dropdown-menu-item__icon">{icon}</div>
                <div className="dropdown-menu-item__text">{label}</div>
                {shortcut && (
                  <div className="dropdown-menu-item__shortcut">{shortcut}</div>
                )}
              </button>
            ),
          )}
        </Island>
      </div>
    </div>
  );
};
