import { FIXED_TIME } from "./fixtures";

import type {
  VisualAssertion,
  VisualInputCapabilities,
  VisualScenario,
} from "./types";

export const noMotionCss = `
*, *::before, *::after {
  animation-delay: 0s;
  animation-duration: 0s;
  transition-delay: 0s;
  transition-duration: 0s;
  scroll-behavior: auto;
  caret-color: transparent;
}
.Toast, [data-toast], .UserList__collaborator-status, .cursor-preview, .laser-pointer { visibility: hidden; }
`;

export const prepareExpression = (
  scenario: VisualScenario,
) => `await (async () => {
  if (!window.__visualRegressionHost) throw new Error("Development visual host is unavailable");
  return window.__visualRegressionHost.prepare(${JSON.stringify({
    id: scenario.id,
    setup: scenario.setup,
    theme: scenario.theme,
    direction: scenario.direction,
    locale: scenario.locale,
    safeArea: scenario.safeArea,
    input: scenario.input,
    fixedTime: FIXED_TIME,
    noMotionCss,
  })});
})()`;

export const restoreExpression = `await window.__visualRegressionHost?.restore()`;

export const postRestoreExpression = `await window.__visualRegressionHost?.queryRestoration()`;

export const inputAcceptanceExpression = (
  scenario: VisualScenario,
  expected: VisualInputCapabilities,
) => `JSON.stringify((() => {
  const actual = {
    pointer: window.matchMedia?.("(pointer: coarse)").matches ? "coarse" : window.matchMedia?.("(pointer: fine)").matches ? "fine" : "none",
    hover: window.matchMedia?.("(hover: hover)").matches ?? false,
    touchPoints: navigator.maxTouchPoints,
  };
  const requested = ${JSON.stringify(scenario.input)};
  const expected = ${JSON.stringify(expected)};
  const browserMatches = actual.pointer === expected.pointer && actual.hover === expected.hover && actual.touchPoints === expected.touchPoints;
  const roots = [...document.querySelectorAll(".excalidraw-container")]
    .filter((node) => node instanceof HTMLElement && node.querySelector("canvas.interactive"))
    .map((node) => ({
      tier: node.dataset.responsiveTier ?? null,
      adapter: node.dataset.responsiveAdapter ?? null,
      density: node.dataset.responsiveDensity ?? null,
      signature: node.dataset.responsiveSignature ?? null,
    }));
  const requiresMountedProjection = requested.acceptance === "mounted-editor";
  const mountedProjectionMatches = !requiresMountedProjection || (
    roots.length === 1 &&
    requested.pointer === "coarse" &&
    roots[0].tier === "phone" &&
    roots[0].adapter === "phone" &&
    roots[0].density === "touch" &&
    typeof roots[0].signature === "string" && roots[0].signature.length > 0
  );
  return { requested, expected, actual, browserMatches, roots, requiresMountedProjection, mountedProjectionMatches };
})())`;

export const readinessExpression = (
  scenario: VisualScenario,
) => `await (async () => {
  const timeoutAt = performance.now() + 12000;
  const observations = [];
  let previous = "";
  let stable = 0;
  await document.fonts.ready;
  while (performance.now() < timeoutAt) {
    await Promise.resolve();
    await Promise.race([
      new Promise(requestAnimationFrame),
      new Promise((resolve) => setTimeout(resolve, 250)),
    ]);
    await Promise.race([
      new Promise(requestAnimationFrame),
      new Promise((resolve) => setTimeout(resolve, 250)),
    ]);
    const root = document.querySelector(${JSON.stringify(
      scenario.capture.selector,
    )});
    const pending = performance.getEntriesByType("resource").filter((entry) => !entry.responseEnd).length;
    const hostReady = Boolean(window.__visualRegressionHost?.isReady(${JSON.stringify(
      scenario.id,
    )}));
    const rect = root?.getBoundingClientRect();
    const signature = JSON.stringify({
      root: rect && [rect.x, rect.y, rect.width, rect.height],
      responsive: root instanceof HTMLElement ? [
        root.dataset.responsiveTier,
        root.dataset.responsiveAdapter,
        root.dataset.responsiveSignature,
      ] : null,
      surfaces: [...document.querySelectorAll("[data-floating-surface], [data-large-surface], .sidebar")]
        .filter((node) => node instanceof HTMLElement && node.offsetParent !== null)
        .map((node) => { const r = node.getBoundingClientRect(); return [node.tagName, r.x, r.y, r.width, r.height]; }),
      pending,
      hostReady,
    });
    observations.push(signature);
    if (hostReady && root && pending === 0 && signature === previous) stable += 1;
    else stable = 0;
    if (stable >= 2) return { signature, observations: observations.slice(-4) };
    previous = signature;
  }
  throw new Error("Semantic readiness timeout: " + observations.slice(-5).join(" | "));
})()`;

export const cropExpression = (
  selector: string,
  kind: string,
) => `JSON.stringify((() => {
  try {
  const candidates = [...document.querySelectorAll(${JSON.stringify(
    selector,
  )})].filter((node) => {
    if (!(node instanceof HTMLElement)) return false;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });
  const nodes = ${JSON.stringify(kind)} === "editor-root"
    ? candidates.filter((node) => node.matches(".excalidraw-container") && node.querySelector("canvas.interactive"))
    : candidates;
  if (nodes.length !== 1) throw new Error("Capture root must resolve exactly once; found " + nodes.length);
  if (${JSON.stringify(
    kind,
  )} === "semantic-region" && nodes[0] === document.documentElement) throw new Error("Uncontrolled browser-chrome capture rejected");
  const node = nodes[0];
  const target = node.getBoundingClientRect();
  const editor = node.matches(".excalidraw") ? node : node.closest(".excalidraw");
  const editorRect = editor?.getBoundingClientRect() ?? target;
  return {
    selector: ${JSON.stringify(selector)},
    target: { x: target.x, y: target.y, width: target.width, height: target.height },
    editor: { x: target.x - editorRect.x, y: target.y - editorRect.y, width: target.width, height: target.height },
  };
  } catch (error) {
    return { __visualError: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
  }
})())`;

export const assertionExpression = (
  assertion: VisualAssertion,
) => `JSON.stringify((() => {
  try {
  const nodes = [...document.querySelectorAll(${JSON.stringify(
    assertion.selector,
  )})];
  const visible = nodes.filter((node) => {
    if (!(node instanceof HTMLElement)) return false;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  });
  const root = document.querySelector(".excalidraw");
  const facts = window.__visualRegressionHost?.assert(${JSON.stringify(
    assertion,
  )});
  return {
    id: ${JSON.stringify(assertion.id)},
    kind: ${JSON.stringify(assertion.kind)},
    count: nodes.length,
    visibleCount: visible.length,
    rootOverflow: root instanceof HTMLElement ? root.scrollWidth - root.clientWidth : null,
    facts,
  };
  } catch (error) {
    return { __visualError: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
  }
})())`;

export const actionExpression = (scenarioId: string, action: string) =>
  `await window.__visualRegressionHost.action(${JSON.stringify(
    scenarioId,
  )}, ${JSON.stringify(action)})`;

export const startPerformanceWindowExpression = `(() => {
  window.__visualPerf = { cls: 0, longTasks: [], started: performance.now() };
  const layout = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__visualPerf.cls += entry.value;
  });
  const longTasks = new PerformanceObserver((list) => {
    window.__visualPerf.longTasks.push(...list.getEntries().map((entry) => entry.duration));
  });
  try { layout.observe({ type: "layout-shift", buffered: false }); } catch {}
  try { longTasks.observe({ type: "longtask", buffered: false }); } catch {}
  window.__visualPerf.layoutObserver = layout;
  window.__visualPerf.longTaskObserver = longTasks;
  return { started: window.__visualPerf.started };
})()`;

export const finishPerformanceWindowExpression = `await (async () => {
  if (!window.__visualPerf) throw new Error("Performance window is unavailable");
  await Promise.resolve();
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  const result = {
    cls: window.__visualPerf.cls,
    longTasks: window.__visualPerf.longTasks,
    interactionDuration: performance.now() - window.__visualPerf.started,
  };
  window.__visualPerf.layoutObserver?.disconnect();
  window.__visualPerf.longTaskObserver?.disconnect();
  delete window.__visualPerf;
  return result;
})()`;
