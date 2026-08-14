import type { VisualRole, VisualScenario } from "./types";

const token = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const canonicalFilename = (scenario: VisualScenario) =>
  `${[
    token(scenario.id),
    `${scenario.geometry.width}x${scenario.geometry.height}`,
    `dpr${scenario.geometry.deviceScaleFactor}`,
    scenario.theme,
    scenario.direction,
    token(scenario.state),
  ].join("__")}.png`;

export const roleFilename = (
  scenario: VisualScenario,
  role: VisualRole,
  run: string,
  kind: "current" | "diff" | "evidence" | "result",
) =>
  canonicalFilename(scenario).replace(
    /\.png$/,
    `__${role}__${token(run)}__${kind}${kind === "result" ? ".json" : ".png"}`,
  );
