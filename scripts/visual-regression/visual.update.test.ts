import { expect, test } from "vitest";

import { filterScenarios } from "./manifest";
import { parseVisualWorkerRole } from "./paths";
import { runVisualScenarios } from "./runner";
import { visualScenarios } from "./scenarios";

test("writes semantically accepted candidates outside canonical baselines", async () => {
  expect(process.env.VISUAL_UPDATE).toBe("1");
  const inventory = await runVisualScenarios({
    scenarios: filterScenarios(visualScenarios, process.env.VISUAL_SCENARIOS),
    mode: "update",
    role: parseVisualWorkerRole(process.env.VISUAL_ROLE ?? "implementer"),
    runId: process.env.VISUAL_RUN_ID ?? "candidate",
  });
  expect(inventory.afterBaselineHash).toBe(inventory.beforeBaselineHash);
  expect(
    inventory.scenarios.every((scenario) => scenario.status === "pass"),
  ).toBe(true);
});
