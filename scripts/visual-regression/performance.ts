import {
  actionExpression,
  finishPerformanceWindowExpression,
  readinessExpression,
  startPerformanceWindowExpression,
} from "./browserScripts";
import { executeInstruction } from "./actions";
import { median } from "./semantics";

import type { ChromeProxyPort } from "./proxy";
import type { VisualPerformanceSample, VisualScenario } from "./types";

const metrics = [
  "postSettleCls",
  "longTaskDuration",
  "interactionDuration",
  "resourceCount",
  "transferBytes",
  "harnessDuration",
] as const;

export const performanceActionForScenario = (scenario: VisualScenario) =>
  scenario.actions.find((entry) => entry !== "exercise-toolbar-final-row") ??
  "open-toolbar-overflow";

const collectOne = async (
  proxy: ChromeProxyPort,
  targetId: string,
  scenario: VisualScenario,
): Promise<VisualPerformanceSample> => {
  await proxy.evaluate(targetId, readinessExpression(scenario));
  await proxy.trustedKey(targetId, "Escape");
  const action = performanceActionForScenario(scenario);
  const instruction = await proxy.evaluate<any>(
    targetId,
    actionExpression(scenario.id, action),
  );
  const started = performance.now();
  await proxy.evaluate(targetId, startPerformanceWindowExpression);
  await executeInstruction(proxy, targetId, instruction);
  const inPage = await proxy.evaluate<any>(
    targetId,
    finishPerformanceWindowExpression,
  );
  const proxyMetric = await proxy.performance(targetId, true);
  return {
    postSettleCls: typeof inPage.cls === "number" ? inPage.cls : null,
    longTaskDuration: Array.isArray(inPage.longTasks)
      ? Math.max(0, ...inPage.longTasks)
      : null,
    interactionDuration:
      typeof inPage.interactionDuration === "number"
        ? inPage.interactionDuration
        : null,
    resourceCount: proxyMetric.resourceCount,
    transferBytes: proxyMetric.transferBytes,
    harnessDuration: performance.now() - started,
  };
};

export const collectPerformance = async (
  proxy: ChromeProxyPort,
  targetId: string,
  scenario: VisualScenario,
) => {
  if (!scenario.performance) {
    return { warmup: null, samples: [], medians: {}, failures: [] };
  }
  const warmup = await collectOne(proxy, targetId, scenario);
  const samples: VisualPerformanceSample[] = [];
  for (let index = 0; index < scenario.performance.samples; index++) {
    samples.push(await collectOne(proxy, targetId, scenario));
  }
  const medians: Partial<VisualPerformanceSample> = {};
  const failures: string[] = [];
  for (const metric of metrics) {
    const values = samples.map((sample) => sample[metric]);
    if (
      values.every(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      )
    ) {
      medians[metric] = median(values);
    } else if (scenario.performance.requiredMetrics.includes(metric)) {
      failures.push(`${metric} is unavailable in an accepted sample`);
    }
  }
  for (const metric of scenario.performance.requiredMetrics) {
    const value = medians[metric];
    const limit = scenario.performance.limits[metric];
    if (value == null || limit == null) {
      if (!failures.some((failure) => failure.startsWith(metric))) {
        failures.push(`${metric} is inconclusive`);
      }
    } else if (value > limit) {
      failures.push(`${metric} median ${value} exceeds branch budget ${limit}`);
    }
  }
  return { warmup, samples, medians, failures };
};
