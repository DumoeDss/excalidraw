export type VisualTheme = "light" | "dark";
export type VisualDirection = "ltr" | "rtl";
export type VisualRole = "implementer" | "reviewer" | "fixer";
export type VisualRunMode = "verify" | "update";

export type VisualGeometry = Readonly<{
  width: number;
  height: number;
  deviceScaleFactor: number;
  mobile: boolean;
}>;

export type VisualSafeArea = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

export type VisualInputProfile = Readonly<{
  pointer: "fine" | "coarse";
  hover: boolean;
  touchPoints: number | "preserve";
  acceptance: "browser" | "mounted-editor";
}>;

export type VisualInputCapabilities = Readonly<{
  pointer: "fine" | "coarse" | "none";
  hover: boolean;
  touchPoints: number;
}>;

export type VisualMountedInputReceipt = Readonly<{
  contract: "full-mounted-editor";
  sourceFingerprint: string;
  command: string;
  testFile: string;
  passed: true;
}>;

export type VisualCaptureRegion = Readonly<{
  selector: string;
  kind: "editor-root" | "fixture-root" | "semantic-region";
}>;

export type VisualAssertion = Readonly<{
  id: string;
  kind:
    | "accessibility"
    | "contrast"
    | "focus"
    | "geometry"
    | "marker"
    | "routing"
    | "responsive"
    | "isolation"
    | "console";
  selector: string;
  expected?: Readonly<Record<string, unknown>>;
}>;

export type VisualMask = Readonly<{
  selector: string;
  reason: string;
  maxArea: number;
  maxRatio: number;
}>;

export type VisualComparisonPolicy = Readonly<{
  channelTolerance: number;
  antialiasTolerance: number;
  maxMismatchRatio: number;
  maxMaskRatio: number;
}>;

export type VisualPerformanceBudget = Readonly<{
  source: string;
  allowance: string;
  requiredMetrics: readonly (
    | "postSettleCls"
    | "longTaskDuration"
    | "interactionDuration"
    | "resourceCount"
    | "transferBytes"
    | "harnessDuration"
  )[];
  limits: Readonly<
    Partial<Record<VisualPerformanceBudget["requiredMetrics"][number], number>>
  >;
  samples: number;
}>;

export type VisualScenario = Readonly<{
  id: string;
  artifactStem: string;
  state: string;
  geometry: VisualGeometry;
  theme: VisualTheme;
  direction: VisualDirection;
  locale: string;
  safeArea: VisualSafeArea;
  input: VisualInputProfile;
  setup: string;
  actions: readonly string[];
  capture: VisualCaptureRegion;
  assertions: readonly VisualAssertion[];
  masks: readonly VisualMask[];
  comparison: VisualComparisonPolicy;
  performance?: VisualPerformanceBudget;
  tags: readonly string[];
}>;

export type VisualCrop = Readonly<{
  selector: string;
  target: { x: number; y: number; width: number; height: number };
  editor: { x: number; y: number; width: number; height: number };
}>;

export type VisualBaselineMetadata = Readonly<{
  schemaVersion: 1;
  scenarioId: string;
  filename: string;
  width: number;
  height: number;
  deviceScaleFactor: number;
  crop: VisualCrop;
  browser: string;
  platform: string;
  fontVersion: string;
  fixtureVersion: string;
  comparison: VisualComparisonPolicy;
  imageHash: string;
  budgetSource: string | null;
  approval: "intentional-change";
  approvedBy: VisualRole;
  inspectedAt: string;
  sourceFingerprint: string;
}>;

export type VisualInspectionEntry = Readonly<{
  scenarioId: string;
  filename: string;
  imageHash: string;
  width: number;
  height: number;
  classification: "intentional-change";
  observations: readonly string[];
}>;

export type VisualInspectionManifest = Readonly<{
  schemaVersion: 1;
  role: "implementer" | "fixer";
  runId: string;
  inspectedAt: string;
  sourceFingerprint: string;
  entries: readonly VisualInspectionEntry[];
}>;

export type VisualCandidateMetadata = Readonly<{
  schemaVersion: 1;
  scenarioId: string;
  filename: string;
  imageHash: string;
  width: number;
  height: number;
  role: "implementer" | "fixer";
  runId: string;
  status: "pass";
  sourceFingerprint: string;
  resultHash: string;
}>;

export type VisualPerformanceSample = Readonly<{
  postSettleCls: number | null;
  longTaskDuration: number | null;
  interactionDuration: number | null;
  resourceCount: number | null;
  transferBytes: number | null;
  harnessDuration: number | null;
}>;

export type VisualScenarioStatus = "pass" | "fail" | "inconclusive";

export type VisualScenarioResult = Readonly<{
  scenarioId: string;
  status: VisualScenarioStatus;
  expectedPath: string;
  currentPath: string;
  diffPath: string | null;
  reportPath: string;
  expectedHash: string | null;
  currentHash: string;
  diffHash: string | null;
  mismatchCount: number | null;
  mismatchRatio: number | null;
  changedBounds: { x: number; y: number; width: number; height: number } | null;
  maskCount: number;
  maskRatio: number;
  semanticFailures: readonly string[];
  cleanupFailures: readonly string[];
  performance: {
    warmup: VisualPerformanceSample | null;
    samples: readonly VisualPerformanceSample[];
    medians: Partial<VisualPerformanceSample>;
    failures: readonly string[];
  };
  environment: Readonly<Record<string, unknown>>;
}>;
