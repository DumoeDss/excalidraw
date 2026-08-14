import path from "node:path";

import type { VisualScenario } from "./types";

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SETUP_ADAPTERS = new Set([
  "welcome",
  "selected-rectangle",
  "selected-text",
  "active-text-editing",
  "library",
  "ai",
  "sharing",
  "collaboration",
  "loading",
  "recoverable-error",
  "top-level-recovery",
  "multi-editor",
]);
const ACTION_ADAPTERS = new Set([
  "open-toolbar-overflow",
  "exercise-toolbar-final-row",
  "exercise-multi-editor-lifecycle",
  "close-with-escape",
  "close-with-outside-click",
  "open-property-surface",
  "open-main-menu",
  "open-submenu",
  "open-context-surface",
  "open-help",
  "open-docked-sidebar",
  "open-overlay-sidebar",
  "open-library",
  "open-ai",
  "open-share",
  "focus-primary-action",
]);

const isUnsafeFragment = (value: string) =>
  path.isAbsolute(value) ||
  value.includes("..") ||
  value.includes("\\") ||
  value.includes("/");

export const defineVisualScenarios = <T extends readonly VisualScenario[]>(
  input: T,
): T => {
  const ids = new Set<string>();
  const stems = new Set<string>();
  for (const scenario of input) {
    if (!ID.test(scenario.id) || ids.has(scenario.id)) {
      throw new Error(`Invalid or duplicate scenario id: ${scenario.id}`);
    }
    if (!ID.test(scenario.artifactStem) || stems.has(scenario.artifactStem)) {
      throw new Error(
        `Invalid or duplicate artifact stem: ${scenario.artifactStem}`,
      );
    }
    if (isUnsafeFragment(scenario.artifactStem)) {
      throw new Error(`Unsafe artifact stem: ${scenario.artifactStem}`);
    }
    ids.add(scenario.id);
    stems.add(scenario.artifactStem);

    const { width, height, deviceScaleFactor } = scenario.geometry;
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 320 ||
      height < 320 ||
      width > 4096 ||
      height > 4096 ||
      ![1, 2].includes(deviceScaleFactor)
    ) {
      throw new Error(`Invalid geometry for ${scenario.id}`);
    }
    if (!scenario.assertions.length) {
      throw new Error(`Scenario ${scenario.id} requires semantic assertions`);
    }
    if (!SETUP_ADAPTERS.has(scenario.setup)) {
      throw new Error(`Undeclared setup adapter: ${scenario.setup}`);
    }
    for (const action of scenario.actions) {
      if (!ACTION_ADAPTERS.has(action)) {
        throw new Error(`Undeclared action adapter: ${action}`);
      }
    }
    if (
      scenario.comparison.channelTolerance < 0 ||
      scenario.comparison.channelTolerance > 16 ||
      scenario.comparison.antialiasTolerance < 0 ||
      scenario.comparison.antialiasTolerance > 32 ||
      scenario.comparison.maxMismatchRatio < 0 ||
      scenario.comparison.maxMismatchRatio > 0.005 ||
      scenario.comparison.maxMaskRatio < 0 ||
      scenario.comparison.maxMaskRatio > 0.02
    ) {
      throw new Error(`Unbounded comparison policy for ${scenario.id}`);
    }
    for (const mask of scenario.masks) {
      if (
        !mask.selector ||
        !mask.reason ||
        mask.maxArea <= 0 ||
        mask.maxArea > width * height * 0.02 ||
        mask.maxRatio <= 0 ||
        mask.maxRatio > 0.02
      ) {
        throw new Error(`Unbounded mask in ${scenario.id}`);
      }
    }
    if (scenario.performance) {
      if (
        !scenario.performance.source.startsWith("branch:") ||
        scenario.performance.samples < 3 ||
        !scenario.performance.requiredMetrics.length
      ) {
        throw new Error(
          `Performance gate requires a branch-derived source for ${scenario.id}`,
        );
      }
      for (const metric of scenario.performance.requiredMetrics) {
        if (scenario.performance.limits[metric] == null) {
          throw new Error(
            `Missing performance limit ${metric} for ${scenario.id}`,
          );
        }
      }
    }
  }
  return input;
};

export const filterScenarios = (
  scenarios: readonly VisualScenario[],
  filter?: string,
) => {
  if (!filter) {
    return [...scenarios];
  }
  const requested = new Set(filter.split(",").map((entry) => entry.trim()));
  const filtered = scenarios.filter(
    (scenario) =>
      requested.has(scenario.id) ||
      scenario.tags.some((tag) => requested.has(tag)),
  );
  if (!filtered.length) {
    throw new Error(`No visual scenarios matched: ${filter}`);
  }
  return filtered;
};

export const declaredSetupAdapters = SETUP_ADAPTERS;
export const declaredActionAdapters = ACTION_ADAPTERS;
