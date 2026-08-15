import { TOOLS } from "./Tools";

import type { AppClassProperties } from "../types";
import type { ToolbarToolType } from "./Tools";

const COMPATIBILITY_TOOL_TYPES = (
  Object.keys(TOOLS) as ToolbarToolType[]
).filter((type) =>
  [
    "hand",
    "selection",
    "rectangle",
    "diamond",
    "ellipse",
    "arrow",
    "line",
    "freedraw",
    "text",
    "image",
    "eraser",
    "laser",
  ].includes(type),
);

/**
 * Compatibility metadata derived from the canonical tool authority. New live
 * toolbar code resolves through adaptiveToolbar.ts instead of this adapter.
 */
export const SHAPES = COMPATIBILITY_TOOL_TYPES.map((value) => ({
  icon: TOOLS[value].icon,
  value,
  key: TOOLS[value].letterKey ?? null,
  numericKey: TOOLS[value].numericKey ?? null,
  fillable: Boolean(TOOLS[value].fillable),
  toolbar: value !== "laser",
}));

export const getToolbarTools = (app: AppClassProperties) =>
  app.state.preferredSelectionTool.type === "lasso"
    ? SHAPES.map((shape) =>
        shape.value === "selection"
          ? { ...shape, value: "lasso" as const }
          : shape,
      )
    : SHAPES;

export const findShapeByKey = (key: string, app: AppClassProperties) => {
  const shape = getToolbarTools(app).find(
    ({ key: letterKey, numericKey }) =>
      (numericKey != null && key === numericKey.toString()) ||
      (letterKey != null &&
        (typeof letterKey === "string"
          ? letterKey === key
          : letterKey.includes(key))),
  );
  return shape?.value || null;
};
