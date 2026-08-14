import { expect, test } from "vitest";

import { filterScenarios } from "./manifest";
import { runReviewerVisualVerification } from "./reviewerEntrypoint";
import { visualScenarios } from "./scenarios";

test("independently verifies the declarative visual matrix as reviewer", async () => {
  const inventory = await runReviewerVisualVerification({
    scenarios: filterScenarios(visualScenarios, process.env.VISUAL_SCENARIOS),
    runId: process.env.VISUAL_RUN_ID ?? "local-reviewer-verify",
  });
  expect(inventory.role).toBe("reviewer");
  expect(inventory.afterBaselineHash).toBe(inventory.beforeBaselineHash);
  expect(
    inventory.scenarios.every((scenario) => scenario.status === "pass"),
  ).toBe(true);
});
