import { expect, test } from "vitest";

import { filterScenarios } from "./manifest";
import { parseVisualWorkerRole } from "./paths";
import { runVisualScenarios } from "./runner";
import { visualScenarios } from "./scenarios";

test("verifies the declarative visual matrix without canonical writes", async () => {
  const inventory = await runVisualScenarios({
    scenarios: filterScenarios(visualScenarios, process.env.VISUAL_SCENARIOS),
    mode: "verify",
    role: parseVisualWorkerRole(process.env.VISUAL_ROLE ?? "implementer"),
    runId: process.env.VISUAL_RUN_ID ?? "local-verify",
  });
  expect(inventory.afterBaselineHash).toBe(inventory.beforeBaselineHash);
  expect(
    inventory.scenarios.every((scenario) => scenario.status === "pass"),
  ).toBe(true);
});
