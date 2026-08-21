import { queries, buildQueries, fireEvent } from "@testing-library/react";

import { TOOL_TYPE } from "@excalidraw/common";

import { TOOL_GROUP_TRIGGER } from "../helpers/toolGroups";

import type { ToolType } from "@excalidraw/excalidraw/types";

const queryToolbarLevel = (container: HTMLElement, testId: string) => {
  const all = queries.queryAllByTestId(container, testId);
  // an open tool menu renders options with the same testids as the toolbar
  // buttons — prefer the toolbar-level button, but fall back to the menu item
  // when that's the only place the tool is rendered (grouped toolbars)
  const standalone = all.filter(
    (el) =>
      !el.closest(".tool-popover-content, .tool-group-dropdown__menu"),
  );
  return standalone.length > 0 ? standalone : all;
};

const _getAllByToolName = (container: HTMLElement, tool: ToolType | "lock") => {
  const toolTitle = tool === "lock" ? "lock" : TOOL_TYPE[tool];
  const testId = `toolbar-${toolTitle}`;
  const attempt = () => {
    let matches = queryToolbarLevel(container, testId);
    if (matches.length === 0) {
      const groupTrigger = TOOL_GROUP_TRIGGER[toolTitle];
      if (groupTrigger) {
        const trigger = container.querySelector<HTMLElement>(
          `[data-testid="${groupTrigger}"]`,
        );
        if (trigger) {
          fireEvent.click(trigger);
          matches = queryToolbarLevel(container, testId);
        }
      }
    }
    return matches;
  };
  let matches = attempt();
  if (matches.length === 0) {
    // opening a group activates its displayed tool, and the first activation
    // can remount the toolbar (the responsive shell settles its layout on the
    // first appState change), tearing down the just-opened menu — retry once
    // against the fresh instance
    matches = attempt();
  }
  return matches;
};

const getMultipleError = (_container: any, tool: any) =>
  `Found multiple elements with tool name: ${tool}`;
const getMissingError = (_container: any, tool: any) =>
  `Unable to find an element with tool name: ${tool}`;

export const [
  queryByToolName,
  getAllByToolName,
  getByToolName,
  findAllByToolName,
  findByToolName,
] = buildQueries<(ToolType | "lock")[]>(
  _getAllByToolName,
  getMultipleError,
  getMissingError,
);
