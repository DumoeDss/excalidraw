import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  actionExpression,
  assertionExpression,
  cropExpression,
  inputAcceptanceExpression,
  postRestoreExpression,
  prepareExpression,
  readinessExpression,
  restoreExpression,
} from "./browserScripts";
import {
  baselinePath,
  BASELINE_ROOT,
  candidatePath,
  evidencePath,
  resultPath,
  assertRoleMayRun,
} from "./paths";
import { createArtifactWriter } from "./artifactWriter";
import { canonicalFilename, roleFilename } from "./naming";
import { assertInputCapabilities, ChromeProxyAdapter } from "./proxy";
import { runWithLifecycleAndPublish } from "./lifecycle";
import {
  executeInstruction,
  exerciseFinalToolbarRow,
  assertBlankShellRoutesToCanvas,
  waitForRenderedMultiEditorPhase,
} from "./actions";
import { comparePng } from "./comparator";
import { cropPng, decodePng, pngHash } from "./png";
import { directoryHash, validateBaselineMetadata } from "./baseline";
import { collectPerformance } from "./performance";
import { FIXTURE_VERSION } from "./fixtures";
import {
  assertCheckerFreeArtifact,
  captureWithCheckerAudit,
  checkerDiagnosticsExpression,
  checkerFailureMessages,
} from "./checkerDiagnostics";

import type {
  VisualBaselineMetadata,
  VisualCandidateMetadata,
  VisualInspectionEntry,
  VisualInspectionManifest,
  VisualInputCapabilities,
  VisualMountedInputReceipt,
  VisualRole,
  VisualRunMode,
  VisualScenario,
  VisualScenarioResult,
} from "./types";

const appUrl = process.env.VISUAL_APP_URL ?? "http://localhost:3001/";
const supportedPlatform = "win32";

const traceStage = async <T>(
  scenarioId: string,
  targetId: string,
  stage: string,
  operation: () => Promise<T>,
) => {
  const started = performance.now();
  console.info(
    `[visual] start scenario=${scenarioId} target=${targetId} stage=${stage}`,
  );
  try {
    const value = await operation();
    console.info(
      `[visual] done scenario=${scenarioId} target=${targetId} stage=${stage} elapsedMs=${Math.round(
        performance.now() - started,
      )}`,
    );
    return value;
  } catch (error) {
    console.error(
      `[visual] fail scenario=${scenarioId} target=${targetId} stage=${stage} elapsedMs=${Math.round(
        performance.now() - started,
      )}: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
};

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const allowedImplementationPaths = [
  "excalidraw-app/global.d.ts",
  "excalidraw-app/components/DebugCanvas.tsx",
  "excalidraw-app/App.tsx",
  "excalidraw-app/index.tsx",
  "excalidraw-app/visualRegressionHost.tsx",
  "package.json",
  "packages/excalidraw/components/App.tsx",
  "packages/excalidraw/components/AdaptiveEditorToolbar.tsx",
  "packages/excalidraw/components/AdaptiveEditorToolbar.scss",
  "packages/excalidraw/components/ToolGroupDropdown.tsx",
  "packages/excalidraw/components/adaptiveToolbar.test.tsx",
  "packages/excalidraw/components/dropdownMenu/DropdownMenuContent.tsx",
  "packages/excalidraw/components/floatingSurface/owner.ts",
  "packages/excalidraw/components/LibraryMenuSection.tsx",
  "packages/excalidraw/components/LibraryUnit.tsx",
  "packages/excalidraw/components/LibraryUnit.test.tsx",
  "packages/excalidraw/tests/interactivity.test.tsx",
  "packages/excalidraw/tests/packages/events.test.tsx",
  "tsconfig.json",
  "vitest.visual.config.mts",
] as const;
const allowedImplementationPathSet = new Set<string>(
  allowedImplementationPaths,
);
const mountedInputTestFile = "packages/excalidraw/tests/interactivity.test.tsx";
const mountedInputTestName =
  "uses the complete mounted-editor pointer-aware activation authority";
const mountedInputTestCommand = [
  "test:app",
  "--run",
  mountedInputTestFile,
  "-t",
  mountedInputTestName,
] as const;

const collectMountedInputReceipt = async (
  sourceFingerprint: string,
): Promise<VisualMountedInputReceipt> => {
  const yarnExecutable = process.platform === "win32" ? "yarn.cmd" : "yarn";
  const spawnArgs = [...mountedInputTestCommand];
  if (process.platform === "win32") {
    spawnArgs[4] = `"${spawnArgs[4]}"`;
  }
  await execFileAsync(yarnExecutable, spawnArgs, {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
    ...(process.platform === "win32" ? { shell: true } : {}),
  });
  return {
    contract: "full-mounted-editor",
    sourceFingerprint,
    command: `yarn ${mountedInputTestCommand.join(" ")}`,
    testFile: mountedInputTestFile,
    passed: true,
  };
};

const isAllowedImplementationPath = (file: string) =>
  allowedImplementationPathSet.has(file) ||
  (file.startsWith("scripts/visual-regression/") &&
    !file.startsWith("scripts/visual-regression/baselines/") &&
    !file.startsWith("scripts/visual-regression/candidates/") &&
    !file.startsWith("scripts/visual-regression/results/"));

export const fingerprintImplementationSources = async ({
  tracked,
  untracked,
  readSource,
}: {
  tracked: readonly string[];
  untracked: readonly string[];
  readSource: (file: string) => Promise<Uint8Array | string | null>;
}) => {
  const normalizedTracked = tracked.map((file) => file.replaceAll("\\", "/"));
  const taskOutsideTracked = normalizedTracked.filter(
    (file) => !isAllowedImplementationPath(file),
  );
  if (taskOutsideTracked.length) {
    throw new Error(
      `Update candidates refuse task-outside tracked changes: ${taskOutsideTracked.join(
        ", ",
      )}`,
    );
  }
  const sources = [
    ...new Set([
      ...normalizedTracked,
      ...untracked.map((file) => file.replaceAll("\\", "/")),
    ]),
  ]
    .filter(isAllowedImplementationPath)
    .sort();
  const hash = createHash("sha256");
  for (const file of sources) {
    hash.update(`${file}\0`);
    hash.update((await readSource(file)) ?? "<deleted>");
    hash.update("\0");
  }
  return { fingerprint: hash.digest("hex"), sources };
};

const gitLines = async (args: readonly string[]) => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return stdout
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replaceAll("\\", "/"));
};

export const implementationSourceFingerprint = async () => {
  const tracked = await gitLines(["diff", "--name-only", "HEAD", "--"]);
  const untracked = await gitLines([
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    ...allowedImplementationPaths,
    "scripts/visual-regression",
  ]);
  return fingerprintImplementationSources({
    tracked,
    untracked,
    readSource: async (file) => {
      try {
        return await readFile(path.join(repositoryRoot, file));
      } catch (error: any) {
        if (error?.code === "ENOENT") {
          return null;
        }
        throw error;
      }
    },
  });
};

const ensureSupportedImplementationState = async () => {
  const state = await implementationSourceFingerprint();
  assertSourceFingerprint(
    process.env.VISUAL_SOURCE_FINGERPRINT,
    state.fingerprint,
    state.sources,
  );
  return state;
};

export const assertSourceFingerprint = (
  provided: string | undefined,
  actual: string,
  sources: readonly string[],
) => {
  if (provided !== actual) {
    throw new Error(
      `Update candidates require explicit VISUAL_SOURCE_FINGERPRINT=${actual} for the audited implementation source set: ${sources.join(
        ", ",
      )}`,
    );
  }
};

export const assertCandidateMayBeWritten = ({
  status,
  semanticFailures,
  cleanupFailures,
  performanceFailures,
  restorationVerified,
  checkerOverlays,
}: {
  status: VisualScenarioResult["status"];
  semanticFailures: readonly string[];
  cleanupFailures: readonly string[];
  performanceFailures: readonly string[];
  restorationVerified: boolean;
  checkerOverlays: unknown;
}) => {
  assertCheckerFreeArtifact(checkerOverlays, "candidate");
  if (
    status !== "pass" ||
    semanticFailures.length > 0 ||
    cleanupFailures.length > 0 ||
    performanceFailures.length > 0 ||
    restorationVerified !== true
  ) {
    throw new Error(
      `Candidate refused: ${
        [...semanticFailures, ...cleanupFailures, ...performanceFailures].join(
          "; ",
        ) ||
        (restorationVerified ? status : "final restoration was not verified")
      }`,
    );
  }
};

export const resolveScenarioStatus = ({
  mode,
  performanceFailures,
  semanticFailures,
  comparisonPassed,
  baselineExists,
}: {
  mode: VisualRunMode;
  performanceFailures: readonly string[];
  semanticFailures: readonly string[];
  comparisonPassed: boolean | null;
  baselineExists: boolean;
}): VisualScenarioResult["status"] =>
  performanceFailures.length > 0
    ? "inconclusive"
    : semanticFailures.length > 0 ||
      (mode === "verify" && comparisonPassed === false)
    ? "fail"
    : baselineExists || mode === "update"
    ? "pass"
    : "fail";

const hashBytes = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

const candidateMetadataFile = (candidateFile: string) =>
  candidateFile.replace(/\.png$/, ".candidate.json");

export const assertValidInspectionEntry = ({
  entry,
  scenario,
  image,
}: {
  entry: VisualInspectionEntry | undefined;
  scenario: VisualScenario;
  image: Uint8Array;
}) => {
  const decoded = decodePng(image);
  const observations = entry?.observations ?? [];
  if (
    !entry ||
    entry.scenarioId !== scenario.id ||
    entry.filename !== canonicalFilename(scenario) ||
    entry.imageHash !== pngHash(image) ||
    entry.width !== decoded.width ||
    entry.height !== decoded.height ||
    entry.classification !== "intentional-change" ||
    observations.length < 3 ||
    observations.some(
      (observation) =>
        typeof observation !== "string" || observation.trim().length === 0,
    ) ||
    new Set(observations.map((observation) => observation.trim())).size < 3
  ) {
    throw new Error(`Candidate inspection is invalid for ${scenario.id}`);
  }
};

export const assertValidCandidateMetadata = ({
  metadata,
  scenario,
  image,
  role,
  runId,
  sourceFingerprint,
  result,
  resultBytes,
}: {
  metadata: VisualCandidateMetadata;
  scenario: VisualScenario;
  image: Uint8Array;
  role: VisualRole;
  runId: string;
  sourceFingerprint: string;
  result: VisualScenarioResult;
  resultBytes: Uint8Array;
}) => {
  assertCheckerFreeArtifact(result.environment.checkerOverlays, "promotion");
  const decoded = decodePng(image);
  if (
    metadata.schemaVersion !== 1 ||
    role === "reviewer" ||
    metadata.role !== role ||
    metadata.runId !== runId ||
    metadata.scenarioId !== scenario.id ||
    metadata.filename !== canonicalFilename(scenario) ||
    metadata.imageHash !== pngHash(image) ||
    metadata.width !== decoded.width ||
    metadata.height !== decoded.height ||
    metadata.status !== "pass" ||
    metadata.sourceFingerprint !== sourceFingerprint ||
    metadata.resultHash !== hashBytes(resultBytes) ||
    result.scenarioId !== scenario.id ||
    result.status !== "pass" ||
    result.currentHash !== metadata.imageHash ||
    result.semanticFailures.length > 0 ||
    result.cleanupFailures.length > 0 ||
    result.performance.failures.length > 0 ||
    result.environment.checkerOverlays !== 0 ||
    result.environment.consoleErrors !== 0 ||
    result.environment.restorationVerified !== true
  ) {
    throw new Error(`Candidate provenance is invalid for ${scenario.id}`);
  }
};

export const semanticFailure = (assertion: any, observation: any) => {
  const failures: string[] = [];
  const facts = observation?.facts ?? {};
  if (observation?.__visualError) {
    return [`${assertion.id}: ${observation.__visualError}`];
  }
  if (assertion.expected?.visible && !facts.visible) {
    failures.push(`${assertion.id}: expected visible ${assertion.selector}`);
  }
  if (assertion.expected?.active && !facts.active) {
    failures.push(`${assertion.id}: expected current focus`);
  }
  if (assertion.expected?.visibleFocus && !facts.visibleFocus) {
    failures.push(`${assertion.id}: expected visible focus style`);
  }
  if (assertion.expected?.contained && !facts.focusContained) {
    failures.push(`${assertion.id}: expected focus containment`);
  }
  if (
    assertion.expected?.role != null &&
    facts.role !== assertion.expected.role
  ) {
    failures.push(`${assertion.id}: role ${facts.role}`);
  }
  if (
    assertion.expected?.name != null &&
    facts.name !== assertion.expected.name
  ) {
    failures.push(`${assertion.id}: accessible name ${facts.name}`);
  }
  if (
    assertion.expected?.labelledBy != null &&
    facts.labelledBy !== assertion.expected.labelledBy
  ) {
    failures.push(`${assertion.id}: aria-labelledby ${facts.labelledBy}`);
  }
  for (const property of [
    "expanded",
    "selected",
    "checked",
    "disabled",
  ] as const) {
    if (
      assertion.expected?.[property] != null &&
      facts[property] !== String(assertion.expected[property])
    ) {
      failures.push(`${assertion.id}: ${property} ${facts[property]}`);
    }
  }
  if (assertion.expected?.live && !facts.live) {
    failures.push(`${assertion.id}: expected a live region`);
  }
  if (
    assertion.expected?.ratio != null &&
    (!Number.isFinite(facts.contrastRatio) ||
      facts.contrastRatio < assertion.expected.ratio)
  ) {
    failures.push(
      `${assertion.id}: contrast ${facts.contrastRatio} for ${facts.foreground} on ${facts.background}`,
    );
  }
  if (assertion.expected?.noHorizontalOverflow && facts.rootOverflow !== 0) {
    failures.push(
      `${assertion.id}: root horizontal overflow ${facts.rootOverflow}`,
    );
  }
  if (
    assertion.expected?.direction &&
    facts.responsive?.direction !== assertion.expected.direction
  ) {
    failures.push(`${assertion.id}: direction ${facts.responsive?.direction}`);
  }
  for (const property of [
    "adapter",
    "tier",
    "orientation",
    "blockSize",
    "density",
    "presentation",
  ] as const) {
    if (
      assertion.expected?.[property] != null &&
      facts.responsive?.[property] !== assertion.expected[property]
    ) {
      failures.push(
        `${assertion.id}: ${property} ${facts.responsive?.[property]}`,
      );
    }
  }
  if (assertion.expected?.neutralWrappers && !facts.neutralWrappers) {
    failures.push(`${assertion.id}: canvas wrappers are not neutral`);
  }
  for (const property of [
    "containedByViewport",
    "containedByEditor",
    "boundedScroll",
    "safeArea",
    "touchTarget",
    "intrinsicWidth",
    "ownedOverflow",
    "docked",
    "independentOfEditor",
  ] as const) {
    if (assertion.expected?.[property] && !facts[property]) {
      failures.push(`${assertion.id}: expected ${property}`);
    }
  }
  if (
    assertion.expected?.viewportMarker != null &&
    facts.viewportMarker !== assertion.expected.viewportMarker
  ) {
    failures.push(`${assertion.id}: viewportMarker ${facts.viewportMarker}`);
  }
  if (
    assertion.expected?.hitSamples != null &&
    facts.hitSamples !== assertion.expected.hitSamples
  ) {
    failures.push(`${assertion.id}: physical hit samples ${facts.hitSamples}`);
  }
  if (
    assertion.expected?.count != null &&
    facts.editorCount !== assertion.expected.count
  ) {
    failures.push(`${assertion.id}: editor count ${facts.editorCount}`);
  }
  if (
    assertion.expected?.directions &&
    JSON.stringify(facts.directions) !==
      JSON.stringify(assertion.expected.directions)
  ) {
    failures.push(
      `${assertion.id}: editor directions ${JSON.stringify(facts.directions)}`,
    );
  }
  if (
    assertion.expected?.themes &&
    JSON.stringify(facts.themes) !== JSON.stringify(assertion.expected.themes)
  ) {
    failures.push(
      `${assertion.id}: editor themes ${JSON.stringify(facts.themes)}`,
    );
  }
  if (assertion.kind === "geometry" && facts.debuggerAbsent === false) {
    failures.push(`${assertion.id}: debugger contaminates geometry`);
  }
  return failures;
};

const safeRead = async (file: string) => {
  try {
    return await readFile(file);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const REQUIRED_HOST_RESTORATION_FACTS = [
  "debuggerLive",
  "debuggerState",
  "debuggerStorage",
  "debuggerCanvas",
  "storage",
  "locale",
  "safeArea",
  "styles",
  "focus",
  "focusMarker",
  "transientMarkers",
  "clockIdentity",
  "clockState",
  "scene",
  "theme",
  "appState",
  "library",
  "share",
  "fixtureRoots",
  "documentDirection",
  "documentLanguage",
] as const;

type ConsoleEvent = Readonly<{ seq?: number }> & Record<string, unknown>;

const consoleEvents = (
  response: { events?: unknown[] } | unknown[] | null,
): ConsoleEvent[] => {
  const events = Array.isArray(response) ? response : response?.events ?? [];
  return events.filter(
    (event): event is ConsoleEvent =>
      event != null && typeof event === "object",
  );
};

const consoleBoundary = (events: readonly ConsoleEvent[]) =>
  events.reduce(
    (boundary, event) =>
      typeof event.seq === "number" ? Math.max(boundary, event.seq) : boundary,
    0,
  );

const sameInputCapabilities = (
  expected: VisualInputCapabilities | null | undefined,
  actual: VisualInputCapabilities | null | undefined,
) =>
  !!expected &&
  !!actual &&
  expected.pointer === actual.pointer &&
  expected.hover === actual.hover &&
  expected.touchPoints === actual.touchPoints;

export const failedRestorationFacts = ({
  host,
  inputPrior,
  inputPostQuery,
  consoleClean,
}: {
  host: Record<string, unknown> | null;
  inputPrior: VisualInputCapabilities | null | undefined;
  inputPostQuery: VisualInputCapabilities | null | undefined;
  consoleClean: boolean;
}) => [
  ...REQUIRED_HOST_RESTORATION_FACTS.filter(
    (fact) => host?.[fact] !== true,
  ).map((fact) => `host.${fact}`),
  ...(sameInputCapabilities(inputPrior, inputPostQuery)
    ? []
    : ["browser.inputCapabilities"]),
  ...(consoleClean ? [] : ["console.newErrorEvents"]),
];

export const deriveRestorationVerified = (
  observations: Parameters<typeof failedRestorationFacts>[0],
) => failedRestorationFacts(observations).length === 0;

export const runVisualScenarios = async ({
  scenarios,
  mode,
  role: roleValue,
  runId,
  proxy = new ChromeProxyAdapter(),
}: {
  scenarios: readonly VisualScenario[];
  mode: VisualRunMode;
  role: unknown;
  runId: string;
  proxy?: ChromeProxyAdapter;
}) => {
  const artifactWriter = createArtifactWriter(roleValue);
  const role = assertRoleMayRun(artifactWriter.role, mode);
  const auditedSourceState = await implementationSourceFingerprint();
  const requiresMountedInputReceipt = scenarios.some(
    (scenario) => scenario.input.acceptance === "mounted-editor",
  );
  const mountedInputReceipt = requiresMountedInputReceipt
    ? await collectMountedInputReceipt(auditedSourceState.fingerprint)
    : null;
  const beforeBaselineHash = await directoryHash(BASELINE_ROOT);
  let sourceState: Awaited<
    ReturnType<typeof implementationSourceFingerprint>
  > | null = null;
  if (mode === "update") {
    if (process.env.VISUAL_UPDATE !== "1") {
      throw new Error("Update mode requires VISUAL_UPDATE=1");
    }
    sourceState = await ensureSupportedImplementationState();
  }
  const preflight = await proxy.preflight();
  if (preflight.metadata.platform.split("-")[0] !== supportedPlatform) {
    throw new Error(
      `Unsupported baseline platform: ${preflight.metadata.platform}`,
    );
  }
  const targetIds: string[] = [];
  const results: VisualScenarioResult[] = [];
  const pendingCandidates: Array<{
    scenario: VisualScenario;
    result: VisualScenarioResult;
  }> = [];
  for (const scenario of scenarios) {
    const targetId = await proxy.createTarget("about:blank");
    targetIds.push(targetId);
    const reportFile = resultPath(
      role,
      runId,
      roleFilename(scenario, role, runId, "result"),
    );
    let cleanupFailures: string[] = [];
    let restorationObservations: Record<string, unknown> | null = null;
    let inputApplication: Awaited<
      ReturnType<ChromeProxyAdapter["applyInputProfile"]>
    > | null = null;
    let inputRestoration: Record<string, unknown> | null = null;
    let inputPostQuery: VisualInputCapabilities | null = null;
    let baselineConsoleEvents: ConsoleEvent[] = [];
    let baselineConsoleBoundary = 0;
    let postRestoreConsoleEvents: ConsoleEvent[] = [];
    let postRestoreConsoleQuerySucceeded = false;
    let finalResult: VisualScenarioResult | null = null;
    let finalReportPublished = false;
    let checkerAudit: Awaited<
      ReturnType<typeof captureWithCheckerAudit>
    > | null = null;
    const lifecycle = await runWithLifecycleAndPublish({
      setup: async (stack) => {
        await traceStage(scenario.id, targetId, "viewport", () =>
          proxy.setViewport(targetId, scenario.geometry),
        );
        inputApplication = await traceStage(
          scenario.id,
          targetId,
          "input-profile-apply",
          () => proxy.applyInputProfile(targetId, scenario.input),
        );
        stack.push("browser-input-profile", async () => {
          inputRestoration = await proxy.clearInputProfile(targetId);
        });
        await traceStage(scenario.id, targetId, "console-enable", () =>
          proxy.enableConsole(targetId),
        );
        await traceStage(scenario.id, targetId, "console-clear", () =>
          proxy.clearConsole(targetId),
        );
        baselineConsoleEvents = consoleEvents(
          await traceStage(scenario.id, targetId, "console-baseline", () =>
            proxy.console(targetId, "error"),
          ),
        );
        baselineConsoleBoundary = consoleBoundary(baselineConsoleEvents);
        await traceStage(scenario.id, targetId, "navigate", () =>
          proxy.navigate(targetId, appUrl),
        );
        await traceStage(scenario.id, targetId, "activate", () =>
          proxy.activateTarget(targetId),
        );
        stack.push("browser-state", async () => {
          const restored = await proxy.evaluate<{
            failures?: string[];
          }>(targetId, restoreExpression);
          if (restored?.failures?.length) {
            throw new Error(restored.failures.join("; "));
          }
        });
        await traceStage(scenario.id, targetId, "prepare", () =>
          proxy.evaluate(targetId, prepareExpression(scenario)),
        );
      },
      run: async () => {
        if (!inputApplication) {
          throw new Error(
            `Input profile application is absent for ${scenario.id}`,
          );
        }
        await traceStage(scenario.id, targetId, "initial-readiness", () =>
          proxy.evaluate(targetId, readinessExpression(scenario)),
        );
        const inputAcceptance = await traceStage(
          scenario.id,
          targetId,
          "input-acceptance",
          () =>
            proxy.evaluateJson<any>(
              targetId,
              inputAcceptanceExpression(scenario, inputApplication.expected),
            ),
        );
        if (!inputAcceptance.browserMatches) {
          throw new Error(
            `Input capability was not applied: ${JSON.stringify(
              inputAcceptance,
            )}`,
          );
        }
        if (!inputAcceptance.mountedProjectionMatches) {
          throw new Error(
            `Mounted editor did not project the applied input profile: ${JSON.stringify(
              inputAcceptance,
            )}`,
          );
        }
        if (
          scenario.input.acceptance === "mounted-editor" &&
          (!mountedInputReceipt ||
            mountedInputReceipt.sourceFingerprint !==
              auditedSourceState.fingerprint)
        ) {
          throw new Error(
            `Mounted-editor input receipt is absent or stale for ${scenario.id}`,
          );
        }
        const blankRouting = await traceStage(
          scenario.id,
          targetId,
          "blank-canvas-routing",
          () => assertBlankShellRoutesToCanvas(proxy, targetId),
        );
        const actionEvidence = [];
        for (const action of scenario.actions) {
          const instruction = await traceStage(
            scenario.id,
            targetId,
            `action-plan:${action}`,
            () =>
              proxy.evaluate<any>(
                targetId,
                actionExpression(scenario.id, action),
              ),
          );
          actionEvidence.push({
            action,
            instruction,
            trusted: await traceStage(
              scenario.id,
              targetId,
              `action-execute:${action}`,
              () => executeInstruction(proxy, targetId, instruction),
            ),
          });
          if (action === "exercise-toolbar-final-row") {
            const restoredScreenshot = evidencePath(
              role,
              "screenshots",
              roleFilename(
                { ...scenario, state: "toolbar-restored" },
                role,
                runId,
                "evidence",
              ),
            );
            actionEvidence.push({
              action: "final-row-routing",
              evidence: await exerciseFinalToolbarRow(proxy, targetId, {
                captureRestored: async () => {
                  await artifactWriter.writeThrough(
                    "evidence",
                    restoredScreenshot,
                    (authorizedDestination) =>
                      proxy.screenshot(targetId, authorizedDestination),
                  );
                  return restoredScreenshot;
                },
              }),
            });
          }
          await traceStage(
            scenario.id,
            targetId,
            `action-readiness:${action}`,
            () => proxy.evaluate(targetId, readinessExpression(scenario)),
          );
        }
        if (scenario.actions.includes("exercise-multi-editor-lifecycle")) {
          const preCapture = await traceStage(
            scenario.id,
            targetId,
            "semantic:multi-editor-rendered-scene",
            () =>
              waitForRenderedMultiEditorPhase(proxy, targetId, "restored", 3),
          );
          actionEvidence.push({
            action: "multi-editor-rendered-scene-pre-capture",
            evidence: {
              phase: preCapture.phase,
              left: preCapture.left?.renderedScene ?? null,
            },
          });
        }
        const crop = await traceStage(scenario.id, targetId, "crop", () =>
          proxy.evaluateJson<any>(
            targetId,
            cropExpression(scenario.capture.selector, scenario.capture.kind),
          ),
        );
        if (!crop?.target || !crop?.editor) {
          throw new Error(
            `Invalid semantic crop payload: ${JSON.stringify(crop)}`,
          );
        }
        const semanticFailures: string[] = [];
        const semanticObservations = [];
        for (const assertion of scenario.assertions) {
          const observation = await traceStage(
            scenario.id,
            targetId,
            `assert:${assertion.id}`,
            () =>
              proxy.evaluateJson<any>(targetId, assertionExpression(assertion)),
          );
          semanticObservations.push(observation);
          semanticFailures.push(...semanticFailure(assertion, observation));
        }
        const screenshotName = roleFilename(scenario, role, runId, "evidence");
        const screenshotFile = evidencePath(
          role,
          "screenshots",
          screenshotName,
        );
        const temporaryScreenshot = resultPath(
          role,
          runId,
          `${scenario.id}.viewport.png`,
        );
        checkerAudit = await captureWithCheckerAudit({
          readDiagnostics: () =>
            traceStage(
              scenario.id,
              targetId,
              checkerAudit
                ? "checker-after-screenshot"
                : "checker-before-screenshot",
              () =>
                proxy.evaluateJson(targetId, checkerDiagnosticsExpression()),
            ),
          capture: () =>
            traceStage(scenario.id, targetId, "screenshot", () =>
              artifactWriter.writeThrough(
                "result",
                temporaryScreenshot,
                (authorizedDestination) =>
                  proxy.screenshot(targetId, authorizedDestination),
              ),
            ),
          onAudit: (audit) => {
            checkerAudit = audit;
          },
        });
        semanticFailures.push(...checkerFailureMessages(checkerAudit));
        const viewportPng = await readFile(temporaryScreenshot);
        const current = cropPng(
          viewportPng,
          crop.target,
          scenario.geometry.deviceScaleFactor,
        );
        await artifactWriter.writeFile("evidence", screenshotFile, current);
        const currentName = roleFilename(scenario, role, runId, "current");
        const currentFile = resultPath(role, runId, currentName);
        await artifactWriter.writeFile("result", currentFile, current);
        const baselineFile = baselinePath(canonicalFilename(scenario));
        const expected = await safeRead(baselineFile);
        let comparison: ReturnType<typeof comparePng> | null = null;
        let diffFile: string | null = null;
        let diffHash: string | null = null;
        if (expected) {
          comparison = comparePng({
            expected,
            current,
            policy: scenario.comparison,
          });
          if (!comparison.pass) {
            diffFile = resultPath(
              role,
              runId,
              roleFilename(scenario, role, runId, "diff"),
            );
            await artifactWriter.writeFile("result", diffFile, comparison.diff);
            diffHash = pngHash(comparison.diff);
          }
          const metadataFile = baselineFile.replace(/\.png$/, ".json");
          const metadata = JSON.parse(
            await readFile(metadataFile, "utf8"),
          ) as VisualBaselineMetadata;
          validateBaselineMetadata(metadata, expected, scenario);
        } else if (mode === "verify") {
          semanticFailures.push("Canonical baseline is missing");
        }

        const performance = await traceStage(
          scenario.id,
          targetId,
          "performance",
          () => collectPerformance(proxy, targetId, scenario),
        );
        const scenarioConsoleEvents = consoleEvents(
          await proxy.console(targetId, "error", baselineConsoleBoundary),
        );
        if (scenarioConsoleEvents.length) {
          semanticFailures.push(
            `Unexpected error console events: ${scenarioConsoleEvents.length}`,
          );
        }
        const checker = checkerAudit.afterScreenshot;
        if (!checker) {
          throw new Error(
            `Checker diagnostics were not captured after ${scenario.id}`,
          );
        }
        const status = resolveScenarioStatus({
          mode,
          performanceFailures: performance.failures,
          semanticFailures,
          comparisonPassed: comparison?.pass ?? null,
          baselineExists: !!expected,
        });
        const result: VisualScenarioResult = {
          scenarioId: scenario.id,
          status,
          expectedPath: baselineFile,
          currentPath: currentFile,
          diffPath: diffFile,
          reportPath: reportFile,
          expectedHash: expected ? pngHash(expected) : null,
          currentHash: pngHash(current),
          diffHash,
          mismatchCount: comparison?.mismatchCount ?? null,
          mismatchRatio: comparison?.mismatchRatio ?? null,
          changedBounds: comparison?.changedBounds ?? null,
          maskCount: comparison?.maskCount ?? 0,
          maskRatio: comparison?.maskRatio ?? 0,
          semanticFailures,
          cleanupFailures,
          performance,
          environment: {
            browser: preflight.metadata.browser,
            platform: preflight.metadata.platform,
            node: preflight.metadata.node,
            chromePort: preflight.health.chromePort,
            fontsReady: true,
            debuggerRestored: null,
            restorationVerified: false,
            targetActivated: true,
            actions: actionEvidence.length,
            semanticAssertions: semanticObservations.length,
            blankCanvasRouting: (blankRouting as any).canvas,
            blankCanvasRoutingApplicable: (blankRouting as any).applicable,
            inputAcceptance,
            inputApplication,
            mountedInputReceipt:
              scenario.input.acceptance === "mounted-editor"
                ? mountedInputReceipt
                : null,
            checkerOverlays: checker.overlays,
            checkerBadgeCount: checker.badgeCount,
            checkerWindowCount: checker.windowCount,
            checkerBadgeTexts: checker.badges.map((entry) => entry.text),
            checkerWindowTexts: checker.windows.map((entry) => entry.text),
            consoleErrors: scenarioConsoleEvents.length,
          },
        };
        return {
          result,
          details: {
            actionEvidence,
            blankRouting,
            semanticObservations,
            crop,
            checker: checkerAudit,
            consoleEvents: scenarioConsoleEvents,
          },
        };
      },
      verifyRestored: async () => {
        const verificationErrors: string[] = [];
        try {
          restorationObservations =
            (await traceStage(
              scenario.id,
              targetId,
              "post-restore-host-query",
              () =>
                proxy.evaluate<Record<string, unknown> | null>(
                  targetId,
                  postRestoreExpression,
                ),
            )) ?? null;
        } catch (error) {
          verificationErrors.push(
            `host post-query: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
        try {
          inputPostQuery = await traceStage(
            scenario.id,
            targetId,
            "post-restore-input-query",
            () => proxy.inputCapabilities(targetId),
          );
          if (inputApplication?.prior) {
            assertInputCapabilities(
              inputApplication.prior,
              inputPostQuery,
              "Outer browser input post-query did not match the pre-run state",
            );
          }
        } catch (error) {
          verificationErrors.push(
            `input post-query: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
        inputRestoration = {
          ...(inputRestoration ?? {}),
          prior: inputApplication?.prior ?? null,
          postQuery: inputPostQuery,
          restoredExactly: sameInputCapabilities(
            inputApplication?.prior,
            inputPostQuery,
          ),
        };
        try {
          postRestoreConsoleEvents = consoleEvents(
            await traceStage(
              scenario.id,
              targetId,
              "post-restore-console-query",
              () => proxy.console(targetId, "error", baselineConsoleBoundary),
            ),
          );
          postRestoreConsoleQuerySucceeded = true;
        } catch (error) {
          verificationErrors.push(
            `console post-query: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
        const failedFacts = failedRestorationFacts({
          host: restorationObservations,
          inputPrior: inputApplication?.prior,
          inputPostQuery,
          consoleClean:
            postRestoreConsoleQuerySucceeded &&
            postRestoreConsoleEvents.length === 0,
        });
        if (verificationErrors.length || failedFacts.length) {
          throw new Error([...verificationErrors, ...failedFacts].join("; "));
        }
      },
      close: async () => {
        const observation = await proxy.closeTarget(targetId);
        return { targetId, observation };
      },
      enumerate: async () => {
        await proxy.assertTargetsAbsent([targetId]);
        return { targetId, absent: true };
      },
      publish: async (outcome) => {
        if (finalReportPublished) {
          throw new Error(
            `Scenario report was already published: ${reportFile}`,
          );
        }
        finalReportPublished = true;
        cleanupFailures = outcome.cleanupFailures.map(
          (entry) => `${entry.label}: ${entry.error}`,
        );
        const restorationVerified = deriveRestorationVerified({
          host: restorationObservations,
          inputPrior: inputApplication?.prior,
          inputPostQuery,
          consoleClean:
            postRestoreConsoleQuerySucceeded &&
            postRestoreConsoleEvents.length === 0,
        });
        const observedChecker =
          checkerAudit?.afterScreenshot ?? checkerAudit?.beforeScreenshot;
        const baseEnvironment = outcome.value?.result.environment ?? {
          browser: preflight.metadata.browser,
          platform: preflight.metadata.platform,
          node: preflight.metadata.node,
          chromePort: preflight.health.chromePort,
          fontsReady: false,
          targetActivated: false,
          actions: 0,
          semanticAssertions: 0,
          checkerOverlays: observedChecker?.overlays ?? null,
          checkerBadgeCount: observedChecker?.badgeCount ?? null,
          checkerWindowCount: observedChecker?.windowCount ?? null,
          checkerBadgeTexts:
            observedChecker?.badges.map((entry) => entry.text) ?? [],
          checkerWindowTexts:
            observedChecker?.windows.map((entry) => entry.text) ?? [],
          consoleErrors: null,
        };
        const restoredEnvironment = {
          ...baseEnvironment,
          debuggerRestored:
            restorationObservations?.debuggerLive === true &&
            restorationObservations?.debuggerState === true &&
            restorationObservations?.debuggerStorage === true &&
            restorationObservations?.debuggerCanvas === true,
          restorationVerified,
          restorationObservations,
          inputRestoration,
          consoleBaseline: {
            events: baselineConsoleEvents,
            boundary: baselineConsoleBoundary,
          },
          postRestoreConsoleEvents,
          postRestoreConsoleQuerySucceeded,
          restorationVerificationAttempted:
            outcome.restorationVerificationAttempted,
          targetCloseSucceeded: outcome.closeSucceeded,
          targetCloseObservation: outcome.closeObservation,
          targetEnumerationSucceeded: outcome.enumerationSucceeded,
          targetEnumerationObservation: outcome.enumerationObservation,
        };
        const primaryError = outcome.primaryError
          ? outcome.primaryError instanceof Error
            ? outcome.primaryError.message
            : String(outcome.primaryError)
          : null;
        let finalReportPayload: Record<string, unknown>;
        if (outcome.value) {
          finalResult = {
            ...outcome.value.result,
            status:
              cleanupFailures.length || !restorationVerified
                ? "fail"
                : outcome.value.result.status,
            cleanupFailures,
            environment: restoredEnvironment,
          };
          finalReportPayload = {
            ...finalResult,
            ...outcome.value.details,
            primaryError,
          };
        } else {
          finalReportPayload = {
            schemaVersion: 1,
            scenarioId: scenario.id,
            status: "fail",
            expectedPath: baselinePath(canonicalFilename(scenario)),
            currentPath: null,
            diffPath: null,
            reportPath: reportFile,
            expectedHash: null,
            currentHash: null,
            diffHash: null,
            mismatchCount: null,
            mismatchRatio: null,
            changedBounds: null,
            maskCount: null,
            maskRatio: null,
            semanticFailures: primaryError ? [primaryError] : [],
            cleanupFailures,
            performance: null,
            environment: restoredEnvironment,
            checker: checkerAudit,
            primaryError,
          };
        }
        await artifactWriter.writeStableJson(
          "result",
          reportFile,
          finalReportPayload,
        );
      },
    });
    if (lifecycle.primaryError) {
      if (cleanupFailures.length) {
        throw new Error(
          `Scenario ${scenario.id} failed: ${
            lifecycle.primaryError instanceof Error
              ? lifecycle.primaryError.message
              : String(lifecycle.primaryError)
          }; cleanup failures: ${cleanupFailures.join("; ")}`,
          { cause: lifecycle.primaryError },
        );
      }
      throw lifecycle.primaryError;
    }
    if (!finalResult) {
      throw new Error(
        `Scenario ${scenario.id} completed without a final result`,
      );
    }
    const result = finalResult;
    if (mode === "update") {
      assertCandidateMayBeWritten({
        status: result.status,
        semanticFailures: result.semanticFailures,
        cleanupFailures: result.cleanupFailures,
        performanceFailures: result.performance.failures,
        restorationVerified: result.environment.restorationVerified === true,
        checkerOverlays: result.environment.checkerOverlays,
      });
      pendingCandidates.push({ scenario, result });
    }
    results.push(result);
  }
  await proxy.assertTargetsAbsent(targetIds);
  const afterBaselineHash = await directoryHash(BASELINE_ROOT);
  if (beforeBaselineHash !== afterBaselineHash) {
    throw new Error(
      "Canonical baseline directory changed during verify/update run",
    );
  }
  for (const { scenario, result } of pendingCandidates) {
    const current = await readFile(result.currentPath);
    const decoded = decodePng(current);
    const candidateFile = candidatePath(
      role,
      runId,
      canonicalFilename(scenario),
    );
    const finalReportBytes = await readFile(result.reportPath);
    const candidateMetadata: VisualCandidateMetadata = {
      schemaVersion: 1,
      scenarioId: scenario.id,
      filename: canonicalFilename(scenario),
      imageHash: pngHash(current),
      width: decoded.width,
      height: decoded.height,
      role,
      runId,
      status: "pass",
      sourceFingerprint: sourceState!.fingerprint,
      resultHash: hashBytes(finalReportBytes),
    };
    await artifactWriter.writeFile("candidate", candidateFile, current);
    await artifactWriter.writeStableJson(
      "candidate",
      candidateMetadataFile(candidateFile),
      candidateMetadata,
    );
  }
  const inventory = {
    schemaVersion: 1,
    mode,
    role,
    runId,
    sourceFingerprint: sourceState?.fingerprint ?? null,
    implementationSources: sourceState?.sources ?? [],
    beforeBaselineHash,
    afterBaselineHash,
    scenarios: results,
    disposableTargets: targetIds,
    targetsClean: true,
    proxyHealthy: true,
  };
  const inventoryFile = evidencePath(role, `run-${runId}.json`);
  await artifactWriter.writeStableJson("evidence", inventoryFile, inventory);
  return inventory;
};

export const promoteInspectedCandidates = async ({
  scenarios,
  role: roleValue,
  runId,
  inspectionFile,
}: {
  scenarios: readonly VisualScenario[];
  role: VisualRole;
  runId: string;
  inspectionFile: string;
}) => {
  const artifactWriter = createArtifactWriter(roleValue);
  const role = assertRoleMayRun(artifactWriter.role, "promote");
  if (process.env.VISUAL_PROMOTE !== "INSPECTED") {
    throw new Error(
      "Promotion requires VISUAL_PROMOTE=INSPECTED after personal image inspection",
    );
  }
  const source = await implementationSourceFingerprint();
  const inspection = JSON.parse(
    await readFile(inspectionFile, "utf8"),
  ) as VisualInspectionManifest;
  if (
    inspection.schemaVersion !== 1 ||
    inspection.role !== role ||
    inspection.runId !== runId ||
    inspection.sourceFingerprint !== source.fingerprint ||
    !Number.isFinite(Date.parse(inspection.inspectedAt))
  ) {
    throw new Error("Inspection manifest does not match this candidate run");
  }
  if (inspection.entries.length !== scenarios.length) {
    throw new Error("Inspection manifest is incomplete");
  }
  const approved: Array<{
    scenario: VisualScenario;
    image: Uint8Array;
    metadata: VisualBaselineMetadata;
  }> = [];
  for (const scenario of scenarios) {
    const candidateFile = candidatePath(
      role,
      runId,
      canonicalFilename(scenario),
    );
    const image = await readFile(candidateFile);
    const decoded = decodePng(image);
    const inspected = inspection.entries.find(
      (entry) => entry.scenarioId === scenario.id,
    );
    assertValidInspectionEntry({ entry: inspected, scenario, image });
    const candidateMetadata = JSON.parse(
      await readFile(candidateMetadataFile(candidateFile), "utf8"),
    ) as VisualCandidateMetadata;
    const scenarioResultFile = resultPath(
      role,
      runId,
      roleFilename(scenario, role, runId, "result"),
    );
    const scenarioResultBytes = await readFile(scenarioResultFile);
    const scenarioResult = JSON.parse(
      scenarioResultBytes.toString("utf8"),
    ) as VisualScenarioResult & { crop?: VisualBaselineMetadata["crop"] };
    assertValidCandidateMetadata({
      metadata: candidateMetadata,
      scenario,
      image,
      role,
      runId,
      sourceFingerprint: source.fingerprint,
      result: scenarioResult,
      resultBytes: scenarioResultBytes,
    });
    if (!scenarioResult.crop) {
      throw new Error(
        `Candidate crop provenance is missing for ${scenario.id}`,
      );
    }
    const metadata: VisualBaselineMetadata = {
      schemaVersion: 1,
      scenarioId: scenario.id,
      filename: canonicalFilename(scenario),
      width: decoded.width,
      height: decoded.height,
      deviceScaleFactor: scenario.geometry.deviceScaleFactor,
      crop: scenarioResult.crop,
      browser: String(scenarioResult.environment.browser),
      platform: String(scenarioResult.environment.platform),
      fontVersion: "repository-fonts-v1",
      fixtureVersion: FIXTURE_VERSION,
      comparison: scenario.comparison,
      imageHash: pngHash(image),
      budgetSource: scenario.performance?.source ?? null,
      approval: "intentional-change",
      approvedBy: role,
      inspectedAt: inspection.inspectedAt,
      sourceFingerprint: source.fingerprint,
    };
    validateBaselineMetadata(metadata, image, scenario);
    approved.push({ scenario, image, metadata });
  }
  for (const { scenario, image, metadata } of approved) {
    const destination = baselinePath(canonicalFilename(scenario));
    const metadataDestination = destination.replace(/\.png$/, ".json");
    await artifactWriter.writeFileAtomically("canonical", destination, image);
    await artifactWriter.writeStableJson(
      "canonical",
      metadataDestination,
      metadata,
    );
  }
};
