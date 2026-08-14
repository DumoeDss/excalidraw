import { test } from "vitest";

import { createArtifactWriter } from "./artifactWriter";
import { evidencePath } from "./paths";
import { renderReplayChecklist } from "./replay";
import { visualScenarios } from "./scenarios";

test("renders the human checklist from the automated manifest", async () => {
  const artifactWriter = createArtifactWriter("implementer");
  const file = evidencePath("implementer", "manual-replay.md");
  await artifactWriter.writeFile(
    "evidence",
    file,
    renderReplayChecklist(visualScenarios, "implementer"),
  );
});
