import path from "node:path";

import type { VisualRole } from "./types";

export type VisualArtifactKind =
  | "candidate"
  | "result"
  | "evidence"
  | "canonical";

export type VisualArtifactRoots = {
  baseline: string;
  candidate: string;
  result: string;
  evidence: string;
};

const VISUAL_ROLES = new Set<VisualRole>(["implementer", "reviewer", "fixer"]);

export const parseVisualRole = (value: unknown): VisualRole => {
  if (typeof value !== "string" || !VISUAL_ROLES.has(value as VisualRole)) {
    throw new Error(`Invalid visual artifact role: ${String(value)}`);
  }
  return value as VisualRole;
};

export const parseVisualWorkerRole = (
  value: unknown,
): Exclude<VisualRole, "reviewer"> => {
  const role = parseVisualRole(value);
  if (role === "reviewer") {
    throw new Error(
      "Reviewer acceptance must use the hard-coded reviewer verify entry",
    );
  }
  return role;
};

export const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "../..");
export const VISUAL_ROOT = path.join(
  REPOSITORY_ROOT,
  "scripts",
  "visual-regression",
);
export const BASELINE_ROOT = path.join(VISUAL_ROOT, "baselines");
export const CANDIDATE_ROOT = path.join(VISUAL_ROOT, "candidates");
export const RESULT_ROOT = path.join(VISUAL_ROOT, "results");
export const CHANGE_EVIDENCE_ROOT = path.join(
  REPOSITORY_ROOT,
  "rasen",
  "changes",
  "visual-regression-hardening",
  "evidence",
);

export const VISUAL_ARTIFACT_ROOTS: VisualArtifactRoots = {
  baseline: BASELINE_ROOT,
  candidate: CANDIDATE_ROOT,
  result: RESULT_ROOT,
  evidence: CHANGE_EVIDENCE_ROOT,
};

const resolveInside = (root: string, ...segments: string[]) => {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...segments);
  if (
    resolved !== resolvedRoot &&
    !resolved.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error(
      `Visual artifact path escapes its declared root: ${resolved}`,
    );
  }
  return resolved;
};

export const baselinePath = (...segments: string[]) =>
  resolveInside(BASELINE_ROOT, ...segments);
export const candidatePath = (...segments: string[]) =>
  resolveInside(CANDIDATE_ROOT, ...segments);
export const resultPath = (...segments: string[]) =>
  resolveInside(RESULT_ROOT, ...segments);
export const evidencePath = (role: VisualRole, ...segments: string[]) =>
  resolveInside(path.join(CHANGE_EVIDENCE_ROOT, role), ...segments);

export const assertRoleMayWrite = (
  roleValue: unknown,
  destination: string,
  kind: VisualArtifactKind,
  roots: VisualArtifactRoots = VISUAL_ARTIFACT_ROOTS,
) => {
  const role = parseVisualRole(roleValue);
  if (!path.isAbsolute(destination)) {
    throw new Error("Visual artifact destinations must be absolute");
  }
  if ((kind === "candidate" || kind === "canonical") && role === "reviewer") {
    throw new Error("Reviewer artifacts cannot write baseline material");
  }
  const root =
    kind === "candidate"
      ? path.join(roots.candidate, role)
      : kind === "result"
      ? path.join(roots.result, role)
      : kind === "canonical"
      ? roots.baseline
      : path.join(roots.evidence, role);
  resolveInside(root, path.relative(root, destination));
  const resolvedDestination = path.resolve(destination);
  const resolvedBaselineRoot = path.resolve(roots.baseline);
  if (
    kind !== "canonical" &&
    (resolvedDestination === resolvedBaselineRoot ||
      resolvedDestination.startsWith(`${resolvedBaselineRoot}${path.sep}`))
  ) {
    throw new Error("Role evidence cannot overwrite canonical baselines");
  }
  return path.resolve(destination);
};

export const assertRoleMayRun = (
  roleValue: unknown,
  operation: "verify" | "update" | "promote",
) => {
  const role = parseVisualRole(roleValue);
  if (role === "reviewer" && operation !== "verify") {
    throw new Error(`Reviewer runs may not ${operation} baseline material`);
  }
  return role;
};
