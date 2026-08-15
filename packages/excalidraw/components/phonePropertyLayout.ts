export type PhonePropertyCandidate = Readonly<{
  id: string;
  width: number;
  required?: boolean;
}>;

export type PhonePropertyPlan = Readonly<{
  directIds: readonly string[];
  combinedIds: readonly string[];
}>;

const fallbackPlan = (
  candidates: readonly PhonePropertyCandidate[],
): PhonePropertyPlan => ({
  directIds: candidates
    .filter((candidate) => candidate.required)
    .map((candidate) => candidate.id),
  combinedIds: candidates
    .filter((candidate) => !candidate.required)
    .map((candidate) => candidate.id),
});

export const planPhonePropertyLayout = ({
  candidates,
  availableWidth,
  gap,
  paddingInline,
}: {
  candidates: readonly PhonePropertyCandidate[];
  availableWidth: number;
  gap: number;
  paddingInline: number;
}): PhonePropertyPlan => {
  if (
    availableWidth <= 0 ||
    candidates.length === 0 ||
    candidates.some((candidate) => candidate.width <= 0)
  ) {
    return fallbackPlan(candidates);
  }

  const lastRequiredIndex = candidates.reduce(
    (last, candidate, index) => (candidate.required ? index : last),
    -1,
  );
  for (
    let directCount = candidates.length;
    directCount > lastRequiredIndex;
    directCount--
  ) {
    const direct = candidates.slice(0, directCount);
    const requiredWidth =
      paddingInline +
      direct.reduce((total, candidate) => total + candidate.width, 0) +
      Math.max(0, direct.length - 1) * gap;
    if (requiredWidth <= availableWidth + 0.25) {
      return {
        directIds: direct.map((candidate) => candidate.id),
        combinedIds: candidates
          .slice(directCount)
          .map((candidate) => candidate.id),
      };
    }
  }

  return fallbackPlan(candidates);
};

export const phonePropertyPlanSignature = (plan: PhonePropertyPlan) =>
  `${plan.directIds.join(",")}|${plan.combinedIds.join(",")}`;
