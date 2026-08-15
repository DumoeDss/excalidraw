import { canonicalFilename } from "./naming";

import type { VisualRole, VisualScenario } from "./types";

export const renderReplayChecklist = (
  scenarios: readonly VisualScenario[],
  role: VisualRole,
) => {
  const lines = [`# ${role} visual replay`, ""];
  for (const scenario of scenarios) {
    lines.push(`## ${scenario.id}`, "");
    lines.push(
      `- Geometry: ${scenario.geometry.width}x${scenario.geometry.height} @ ${scenario.geometry.deviceScaleFactor}x`,
    );
    lines.push(`- Theme/direction: ${scenario.theme}/${scenario.direction}`);
    lines.push(`- Setup: ${scenario.setup}`);
    lines.push(`- Actions: ${scenario.actions.join(", ") || "none"}`);
    lines.push(
      `- Capture: ${scenario.capture.kind} ${scenario.capture.selector}`,
    );
    lines.push(
      `- Assertions: ${scenario.assertions
        .map((entry) => entry.id)
        .join(", ")}`,
    );
    lines.push(`- Canonical identity: ${canonicalFilename(scenario)}`);
    lines.push(`- Evidence owner: ${role}`);
    lines.push("- [ ] Captured in a fresh role-owned target");
    lines.push("- [ ] Opened and personally inspected");
    lines.push(
      "- [ ] Semantic, console, performance, and cleanup results inspected",
    );
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
};
