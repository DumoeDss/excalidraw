import { runVisualScenarios } from "./runner";

type VisualRunner = typeof runVisualScenarios;
type ReviewerVerificationOptions = Omit<
  Parameters<VisualRunner>[0],
  "mode" | "role"
>;

export const runReviewerVisualVerification = (
  options: ReviewerVerificationOptions,
  run: VisualRunner = runVisualScenarios,
) =>
  run({
    ...options,
    mode: "verify",
    role: "reviewer",
  });
