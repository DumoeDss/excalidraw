import { expect, test } from "vitest";

import { filterScenarios } from "./manifest";
import { parseVisualWorkerRole } from "./paths";
import { promoteInspectedCandidates } from "./runner";
import { visualScenarios } from "./scenarios";

test("promotes only a completely inspected implementer candidate run", async () => {
  expect(process.env.VISUAL_PROMOTE).toBe("INSPECTED");
  const runId = process.env.VISUAL_RUN_ID;
  const inspectionFile = process.env.VISUAL_INSPECTION_FILE;
  if (!runId || !inspectionFile) {
    throw new Error(
      "Promotion requires VISUAL_RUN_ID and VISUAL_INSPECTION_FILE",
    );
  }
  await promoteInspectedCandidates({
    scenarios: filterScenarios(visualScenarios, process.env.VISUAL_SCENARIOS),
    role: parseVisualWorkerRole(process.env.VISUAL_ROLE ?? "implementer"),
    runId,
    inspectionFile,
  });
});
