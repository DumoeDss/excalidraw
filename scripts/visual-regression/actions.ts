import type { ChromeProxyPort } from "./proxy";

type Instruction =
  | { type: "none" }
  | { type: "click"; selector: string; nth?: number }
  | { type: "key"; key: string }
  | {
      type: "seed-focus-then-key-to";
      selector: string;
      key: string;
      target: string;
    }
  | { type: "tab-to"; selector: string; maxTabs?: number }
  | {
      type: "click-sequence";
      controls: Array<{ identity: string; selector: string }>;
      ownerIdentity: string;
      ownerSelector: string;
      dialogName?: string;
    }
  | {
      type: "multi-editor-lifecycle";
      updateSelector: string;
      unmountSelector: string;
      recreateSelector: string;
    };

const clickCoordinate = async (
  proxy: ChromeProxyPort,
  targetId: string,
  x: number,
  y: number,
) => {
  await proxy.evaluate(
    targetId,
    `(() => {
      document.querySelector("[data-visual-coordinate-click-rail]")?.remove();
      const rail = document.createElement("div");
      rail.dataset.visualCoordinateClickRail = "true";
      rail.style.cssText = ${JSON.stringify(
        "position:fixed;inset:0;pointer-events:none;z-index:-1;overflow:visible",
      )};
      const target = document.createElement("span");
      target.dataset.visualCoordinateClickMarker = "true";
      target.style.cssText = ${JSON.stringify(
        "position:absolute;width:1px;height:1px;pointer-events:none;z-index:-1",
      )};
      target.style.left = (${JSON.stringify(x)} - 0.5) + "px";
      target.style.top = (${JSON.stringify(y)} - 0.5) + "px";
      rail.append(target);
      document.body.append(rail);
    })()`,
  );
  try {
    return await proxy.clickAt(
      targetId,
      "[data-visual-coordinate-click-marker]",
    );
  } finally {
    await proxy.evaluate(
      targetId,
      `document.querySelector("[data-visual-coordinate-click-rail]")?.remove()`,
    );
  }
};

type TrustedCoordinateReceipt = {
  token: string;
  type: string;
  sequence: number;
  isTrusted: boolean;
  pointerType: string;
  pointerId: number;
  clientX: number;
  clientY: number;
  targetOwned: boolean;
  ownerOwned: boolean;
  exactTarget: boolean;
  instanceId?: string;
  emitter?: string;
  activeTool?: string | null;
  scenePoint?: { x: number; y: number } | null;
};

export type TrustedCoordinateEvidence = {
  token: string;
  point: { x: number; y: number };
  targetMode: "exact" | "contained";
  expectedEditorInstanceId: string | null;
  physicalTarget: {
    targetCount: number;
    ownerCount: number;
    hitMatches: boolean;
    hitTag: string | null;
    targetTestId: string | null;
  };
  pageSequenceBefore: number;
  editorSequenceBefore: number | null;
  page: TrustedCoordinateReceipt | null;
  editor: TrustedCoordinateReceipt | null;
  driver: { clicked: boolean; x: number; y: number };
};

const coordinateMatches = (
  actual: number,
  expected: number,
  tolerance = 0.75,
) => Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;

const TRUSTED_COORDINATE_DISPATCH_ATTEMPTS = 3;

export const assertTrustedCoordinateResult = (
  evidence: TrustedCoordinateEvidence,
  options: { requireEditorPath: boolean },
) => {
  const page = evidence.page;
  const driver = evidence.driver;
  if (
    evidence.physicalTarget.targetCount !== 1 ||
    evidence.physicalTarget.ownerCount !== 1 ||
    !evidence.physicalTarget.hitMatches ||
    !driver.clicked ||
    !coordinateMatches(driver.x, evidence.point.x) ||
    !coordinateMatches(driver.y, evidence.point.y) ||
    !page ||
    page.token !== evidence.token ||
    page.type !== "pointerdown" ||
    page.sequence !== evidence.pageSequenceBefore + 1 ||
    page.isTrusted !== true ||
    !page.targetOwned ||
    !page.ownerOwned ||
    (evidence.targetMode === "exact" && !page.exactTarget) ||
    !coordinateMatches(page.clientX, evidence.point.x) ||
    !coordinateMatches(page.clientY, evidence.point.y)
  ) {
    throw new Error(
      `Trusted coordinate target receipt failed: ${JSON.stringify(evidence)}`,
    );
  }

  if (!options.requireEditorPath) {
    return;
  }
  const editor = evidence.editor;
  if (
    !evidence.expectedEditorInstanceId ||
    evidence.editorSequenceBefore == null ||
    !editor ||
    editor.token !== evidence.token ||
    editor.type !== "pointerdown" ||
    editor.sequence !== evidence.editorSequenceBefore + 1 ||
    editor.isTrusted !== true ||
    !editor.targetOwned ||
    !editor.ownerOwned ||
    editor.exactTarget !== true ||
    editor.instanceId !== evidence.expectedEditorInstanceId ||
    editor.emitter !== "ExcalidrawImperativeAPI.onPointerDown" ||
    editor.pointerId !== page.pointerId ||
    editor.pointerType !== page.pointerType ||
    !coordinateMatches(editor.clientX, page.clientX) ||
    !coordinateMatches(editor.clientY, page.clientY) ||
    !editor.activeTool ||
    !editor.scenePoint ||
    !Number.isFinite(editor.scenePoint.x) ||
    !Number.isFinite(editor.scenePoint.y)
  ) {
    throw new Error(
      `Trusted coordinate editor handler receipt failed: ${JSON.stringify(
        evidence,
      )}`,
    );
  }
};

export const dispatchTrustedCoordinateInput = async (
  proxy: ChromeProxyPort,
  targetId: string,
  request: {
    token: string;
    point: { x: number; y: number };
    targetSelector: string;
    ownerSelector: string;
    targetMode: "exact" | "contained";
    editorInstanceId?: string;
    alreadyActivated?: boolean;
  },
) => {
  let prepared = false;
  try {
    const physicalTarget = await proxy.evaluateJson<
      TrustedCoordinateEvidence["physicalTarget"]
    >(
      targetId,
      `JSON.stringify((() => {
        const token = ${JSON.stringify(request.token)};
        const targetCandidates = [...document.querySelectorAll(${JSON.stringify(
          request.targetSelector,
        )})];
        const ownerCandidates = [...document.querySelectorAll(${JSON.stringify(
          request.ownerSelector,
        )})];
        if (ownerCandidates.length !== 1 || !(ownerCandidates[0] instanceof HTMLElement)) {
          return {
            __visualError: "Trusted coordinate owner must resolve exactly once: " + JSON.stringify({
              ownerCount: ownerCandidates.length,
            }),
          };
        }
        const owner = ownerCandidates[0];
        const x = ${JSON.stringify(request.point.x)};
        const y = ${JSON.stringify(request.point.y)};
        const hit = document.elementFromPoint(x, y);
        const matchedTargets = targetCandidates.filter((candidate) => {
          if (!(candidate instanceof HTMLElement) || !owner.contains(candidate)) return false;
          return ${JSON.stringify(request.targetMode)} === "exact"
            ? hit === candidate
            : hit === candidate || (hit instanceof Node && candidate.contains(hit));
        });
        if (matchedTargets.length !== 1) {
          return {
            __visualError: "Trusted coordinate point must resolve to exactly one owned target: " + JSON.stringify({
              candidateCount: targetCandidates.length,
              matchedTargetCount: matchedTargets.length,
              hitTag: hit?.tagName ?? null,
              x,
              y,
            }),
          };
        }
        const target = matchedTargets[0];
        const hitMatches = true;
        const probe = {
          token,
          target,
          owner,
          targetMode: ${JSON.stringify(request.targetMode)},
          point: { x, y },
          pageSequence: 0,
          editorSequence: 0,
          pageReceipt: null,
          editorReceipt: null,
          pageListener: null,
          unsubscribeEditor: null,
          physicalTarget: {
            targetCount: matchedTargets.length,
            ownerCount: ownerCandidates.length,
            hitMatches,
            hitTag: hit?.tagName ?? null,
            targetTestId: target.getAttribute("data-testid"),
          },
        };
        window.__visualTrustedCoordinateProbe = probe;
        document.documentElement.setAttribute("data-visual-trusted-coordinate-token", token);
        document.documentElement.setAttribute("data-visual-trusted-coordinate-physical", JSON.stringify(probe.physicalTarget));
        return probe.physicalTarget;
      })())`,
    );
    prepared = true;
    await proxy.evaluate(
      targetId,
      `(() => {
        const probe = window.__visualTrustedCoordinateProbe;
        if (!probe || probe.token !== ${JSON.stringify(request.token)}) {
          throw new Error("Trusted coordinate page probe installation lost its owner");
        }
        const { target, owner, token } = probe;
        probe.pageListener = (event) => {
          probe.pageSequence += 1;
          const targetOwned = event.target === target || (event.target instanceof Node && target.contains(event.target));
          const ownerOwned = event.target instanceof Node && owner.contains(event.target);
          const exactTarget = event.target === target;
          probe.pageReceipt = {
            token,
            type: event.type,
            sequence: probe.pageSequence,
            isTrusted: event.isTrusted,
            pointerType: event.pointerType,
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            targetOwned,
            ownerOwned,
            exactTarget,
          };
          document.documentElement.setAttribute(
            "data-visual-trusted-coordinate-page",
            JSON.stringify(probe.pageReceipt),
          );
          if (
            event.isTrusted !== true ||
            !targetOwned ||
            !ownerOwned ||
            (probe.targetMode === "exact" && !exactTarget) ||
            Math.abs(event.clientX - probe.point.x) > 0.75 ||
            Math.abs(event.clientY - probe.point.y) > 0.75
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        };
        window.addEventListener("pointerdown", probe.pageListener, { capture: true });
      })()`,
    );
    if (request.editorInstanceId) {
      await proxy.evaluate(
        targetId,
        `(() => {
          const probe = window.__visualTrustedCoordinateProbe;
          const editorApp = window.h?.app;
          if (
            !probe ||
            probe.token !== ${JSON.stringify(request.token)} ||
            !editorApp?.api ||
            editorApp.api.id !== ${JSON.stringify(request.editorInstanceId)} ||
            editorApp.interactiveCanvas !== probe.target
          ) {
            throw new Error("Trusted coordinate editor instance does not own the declared canvas");
          }
          const { target, owner, token } = probe;
          probe.unsubscribeEditor = editorApp.api.onPointerDown((activeTool, pointerDownState, event) => {
            const nativeEvent = event.nativeEvent ?? event;
            probe.editorSequence += 1;
            probe.editorReceipt = {
              token,
              type: nativeEvent.type,
              sequence: probe.editorSequence,
              isTrusted: nativeEvent.isTrusted,
              pointerType: nativeEvent.pointerType,
              pointerId: nativeEvent.pointerId,
              clientX: nativeEvent.clientX,
              clientY: nativeEvent.clientY,
              targetOwned: nativeEvent.target === target,
              ownerOwned: nativeEvent.target instanceof Node && owner.contains(nativeEvent.target),
              exactTarget: nativeEvent.target === target,
              instanceId: editorApp.api.id,
              emitter: "ExcalidrawImperativeAPI.onPointerDown",
              activeTool: activeTool?.type ?? null,
              scenePoint: Number.isFinite(pointerDownState?.origin?.x) && Number.isFinite(pointerDownState?.origin?.y)
                ? { x: pointerDownState.origin.x, y: pointerDownState.origin.y }
                : null,
            };
            document.documentElement.setAttribute("data-visual-trusted-coordinate-editor", JSON.stringify(probe.editorReceipt));
          });
        })()`,
      );
    }
    for (
      let attempt = 0;
      attempt < TRUSTED_COORDINATE_DISPATCH_ATTEMPTS;
      attempt += 1
    ) {
      if (!request.alreadyActivated || attempt > 0) {
        await proxy.activateTarget(targetId);
      }
      const driver = await clickCoordinate(
        proxy,
        targetId,
        request.point.x,
        request.point.y,
      );
      const receipt = await proxy.evaluateJson<
        Omit<TrustedCoordinateEvidence, "physicalTarget" | "driver">
      >(
        targetId,
        `JSON.stringify((() => {
          const root = document.documentElement;
          if (root.getAttribute("data-visual-trusted-coordinate-token") !== ${JSON.stringify(
            request.token,
          )}) {
            return { __visualError: "Trusted coordinate probe receipt is unavailable" };
          }
          return {
            token: ${JSON.stringify(request.token)},
            point: ${JSON.stringify(request.point)},
            targetMode: ${JSON.stringify(request.targetMode)},
            expectedEditorInstanceId: ${JSON.stringify(
              request.editorInstanceId ?? null,
            )},
            pageSequenceBefore: 0,
            editorSequenceBefore: ${request.editorInstanceId ? "0" : "null"},
            page: JSON.parse(root.getAttribute("data-visual-trusted-coordinate-page") ?? "null"),
            editor: JSON.parse(root.getAttribute("data-visual-trusted-coordinate-editor") ?? "null"),
          };
        })())`,
      );
      const evidence: TrustedCoordinateEvidence = {
        ...receipt,
        physicalTarget,
        driver,
      };
      if (
        !evidence.page &&
        !evidence.editor &&
        evidence.driver.clicked &&
        coordinateMatches(evidence.driver.x, evidence.point.x) &&
        coordinateMatches(evidence.driver.y, evidence.point.y) &&
        attempt + 1 < TRUSTED_COORDINATE_DISPATCH_ATTEMPTS
      ) {
        continue;
      }
      assertTrustedCoordinateResult(evidence, {
        requireEditorPath: request.editorInstanceId != null,
      });
      return evidence;
    }
    throw new Error("Trusted coordinate dispatch attempts exhausted");
  } finally {
    if (prepared) {
      await proxy.evaluate(
        targetId,
        `(() => {
          const probe = window.__visualTrustedCoordinateProbe;
          if (probe?.token === ${JSON.stringify(request.token)}) {
            if (probe.pageListener) window.removeEventListener("pointerdown", probe.pageListener, { capture: true });
            probe.unsubscribeEditor?.();
            delete window.__visualTrustedCoordinateProbe;
          }
          const root = document.documentElement;
          if (root.getAttribute("data-visual-trusted-coordinate-token") === ${JSON.stringify(
            request.token,
          )}) {
            root.removeAttribute("data-visual-trusted-coordinate-token");
            root.removeAttribute("data-visual-trusted-coordinate-physical");
            root.removeAttribute("data-visual-trusted-coordinate-page");
            root.removeAttribute("data-visual-trusted-coordinate-editor");
          }
        })()`,
      );
    }
  }
};

type MultiEditorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

type MultiEditorProfileFacts = {
  tier: string | null;
  adapter: string | null;
  orientation: string | null;
  blockSize: string | null;
  density: string | null;
  presentation: string | null;
  signature: string | null;
};

export type MultiEditorInstanceFacts = {
  generation: number;
  rootIdentity: string;
  apiIdentity: string;
  apiId: string;
  apiDestroyed: boolean;
  appOpenMenu: string | null;
  sameInitialRoot: boolean;
  sameInitialApi: boolean;
  theme: string;
  direction: string;
  profile: MultiEditorProfileFacts;
  scene: {
    elementCount: number;
    activeElementCount: number;
    elementIds: string[];
    elementTypes: string[];
  };
  renderedScene: {
    canvasConnected: boolean;
    canvasWidth: number;
    canvasHeight: number;
    elementId: string | null;
    sampleRegion: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null;
    sampledPixels: number;
    matchingPixels: number;
    matchingRatio: number;
    pixelSignature: string | null;
    paintPresent: boolean;
  } | null;
  rect: MultiEditorRect;
  withinFixture: boolean;
  focus: {
    ownerIdentity: string | null;
    sameInitialOwner: boolean;
    ownerConnected: boolean;
    active: boolean;
    ariaControls: string | null;
    surfaceConnected: boolean;
  };
  primaryAssociation: {
    triggerIdentity: string;
    surfaceIdentity: string | null;
    controlsId: string;
    triggerConnected: boolean;
    surfaceConnected: boolean;
    triggerExpanded: string | null;
    surfaceDirection: string | null;
    ownerIdentity: string;
    ownerClaimed: boolean;
    sameInitialTrigger: boolean;
    sameInitialSurface: boolean;
  } | null;
  associations: Array<{
    controlsId: string;
    triggerIdentity: string;
    surfaceIdentity: string | null;
    triggerConnected: boolean;
    surfaceConnected: boolean;
  }>;
  toolbarOwner: string | null;
};

export type MultiEditorLifecycleSnapshot = {
  phase: "initial" | "updated" | "unmounted" | "restored";
  editorCount: number;
  documentDirection: string | null;
  fixtureRect: MultiEditorRect;
  initialRecorded: boolean;
  initial: {
    documentDirection: string | null;
    left: MultiEditorInstanceFacts;
    right: MultiEditorInstanceFacts;
  } | null;
  expectedUpdatedRight: {
    theme: string;
    direction: string;
    profile: MultiEditorProfileFacts;
  } | null;
  left: MultiEditorInstanceFacts | null;
  right: MultiEditorInstanceFacts | null;
  detachedRight: {
    rootConnected: boolean;
    apiDestroyed: boolean;
    apiStillCurrent: boolean;
    connectedControls: number;
    connectedSurfaces: number;
    presentControlIds: number;
    ownerClaimed: boolean;
    portalResidue: number;
  } | null;
  controls: Array<{
    action: "update" | "unmount" | "recreate";
    pointerTrusted: boolean;
    clickTrusted: boolean;
    pointerType: string;
    clientX: number;
    clientY: number;
    targetOwned: boolean;
  }>;
  mounts: {
    left: Array<Record<string, unknown>>;
    right: Array<Record<string, unknown>>;
  };
  unmounts: {
    left: Array<Record<string, unknown>>;
    right: Array<Record<string, unknown>>;
  };
  staleMarkerCount: number;
};

type MultiEditorDriverReceipt = {
  clicked: boolean;
  x: number;
  y: number;
};

export type MultiEditorLifecycleEvidence = {
  initial: MultiEditorLifecycleSnapshot;
  updated: MultiEditorLifecycleSnapshot;
  unmounted: MultiEditorLifecycleSnapshot;
  restored: MultiEditorLifecycleSnapshot;
  drivers: {
    update: MultiEditorDriverReceipt;
    unmount: MultiEditorDriverReceipt;
    recreate: MultiEditorDriverReceipt;
  };
};

const exactFacts = (value: unknown) => JSON.stringify(value);

const sameRect = (left: MultiEditorRect, right: MultiEditorRect) =>
  ["x", "y", "width", "height", "right", "bottom"].every(
    (property) =>
      Math.abs(
        left[property as keyof MultiEditorRect] -
          right[property as keyof MultiEditorRect],
      ) <= 1,
  );

const leftRenderedSceneReady = (
  facts: MultiEditorInstanceFacts | null | undefined,
) => {
  const rendered = facts?.renderedScene;
  return (
    rendered?.canvasConnected === true &&
    rendered.canvasWidth > 0 &&
    rendered.canvasHeight > 0 &&
    rendered.elementId === "visual-rectangle-01" &&
    rendered.sampleRegion !== null &&
    rendered.sampledPixels >= 16 &&
    rendered.matchingPixels > 0 &&
    rendered.matchingRatio >= 0.2 &&
    typeof rendered.pixelSignature === "string" &&
    rendered.pixelSignature.length > 0 &&
    rendered.paintPresent === true
  );
};

const stableInstanceFacts = (facts: MultiEditorInstanceFacts) => ({
  rootIdentity: facts.rootIdentity,
  apiIdentity: facts.apiIdentity,
  apiId: facts.apiId,
  apiDestroyed: facts.apiDestroyed,
  appOpenMenu: facts.appOpenMenu,
  sameInitialRoot: facts.sameInitialRoot,
  sameInitialApi: facts.sameInitialApi,
  theme: facts.theme,
  direction: facts.direction,
  profile: facts.profile,
  scene: facts.scene,
  renderedScene: facts.renderedScene,
  focus: facts.focus,
  primaryAssociation: facts.primaryAssociation,
  associations: facts.associations,
  toolbarOwner: facts.toolbarOwner,
});

const assertMultiEditorAssociation = (
  side: string,
  facts: MultiEditorInstanceFacts,
  options: { requireInitialIdentity: boolean },
) => {
  const association = facts.primaryAssociation;
  if (
    !association ||
    !association.triggerConnected ||
    !association.surfaceConnected ||
    association.triggerExpanded !== "true" ||
    !association.controlsId ||
    association.surfaceDirection !== facts.direction ||
    !association.ownerClaimed ||
    (options.requireInitialIdentity &&
      (!association.sameInitialTrigger || !association.sameInitialSurface))
  ) {
    throw new Error(
      `Multi-editor ${side} owned association is invalid: ${JSON.stringify(
        association,
      )}`,
    );
  }
};

const assertTrustedMultiEditorControl = (
  snapshot: MultiEditorLifecycleSnapshot,
  action: "update" | "unmount" | "recreate",
  index: number,
  driver: MultiEditorDriverReceipt,
) => {
  const receipt = snapshot.controls[index];
  if (
    !driver.clicked ||
    !Number.isFinite(driver.x) ||
    !Number.isFinite(driver.y) ||
    receipt?.action !== action ||
    receipt.pointerTrusted !== true ||
    receipt.clickTrusted !== true ||
    receipt.pointerType !== "mouse" ||
    receipt.targetOwned !== true ||
    Math.abs(receipt.clientX - driver.x) > 1 ||
    Math.abs(receipt.clientY - driver.y) > 1
  ) {
    throw new Error(
      `Multi-editor ${action} did not use the trusted coordinate path: ${JSON.stringify(
        { driver, receipt },
      )}`,
    );
  }
};

export const assertMultiEditorLifecycleFacts = (
  evidence: MultiEditorLifecycleEvidence,
) => {
  const { initial, updated, unmounted, restored, drivers } = evidence;
  const initialLeft = initial.left;
  const initialRight = initial.right;
  const expectedLeftScene = {
    elementCount: 1,
    activeElementCount: 1,
    elementIds: ["visual-rectangle-01"],
    elementTypes: ["rectangle"],
  };
  const expectedRightScene = {
    elementCount: 1,
    activeElementCount: 1,
    elementIds: ["visual-text-01"],
    elementTypes: ["text"],
  };
  if (
    initial.phase !== "initial" ||
    initial.editorCount !== 2 ||
    !initial.initialRecorded ||
    !initial.initial ||
    !initialLeft ||
    !initialRight ||
    initialLeft.apiDestroyed ||
    initialRight.apiDestroyed ||
    !initialLeft.sameInitialRoot ||
    !initialLeft.sameInitialApi ||
    !initialRight.sameInitialRoot ||
    !initialRight.sameInitialApi ||
    initialLeft.rootIdentity === initialRight.rootIdentity ||
    initialLeft.apiIdentity === initialRight.apiIdentity ||
    initialLeft.apiId === initialRight.apiId ||
    initialLeft.theme !== "light" ||
    initialLeft.direction !== "ltr" ||
    exactFacts(initialLeft.scene) !== exactFacts(expectedLeftScene) ||
    !leftRenderedSceneReady(initialLeft) ||
    initialRight.theme !== "dark" ||
    initialRight.direction !== "rtl" ||
    exactFacts(initialRight.scene) !== exactFacts(expectedRightScene) ||
    initialLeft.profile.signature === initialRight.profile.signature ||
    initialRight.profile.tier !== "tablet" ||
    initialRight.profile.adapter !== "desktop" ||
    !initialLeft.withinFixture ||
    !initialRight.withinFixture ||
    !initialLeft.focus.ownerConnected ||
    !initialLeft.focus.active ||
    !initialLeft.focus.sameInitialOwner ||
    !initialLeft.focus.surfaceConnected
  ) {
    throw new Error(
      `Multi-editor immutable initial facts or rendered scene facts are invalid: ${JSON.stringify(
        initial,
      )}`,
    );
  }
  assertMultiEditorAssociation("initial left", initialLeft, {
    requireInitialIdentity: true,
  });
  assertMultiEditorAssociation("initial right", initialRight, {
    requireInitialIdentity: true,
  });

  assertTrustedMultiEditorControl(updated, "update", 0, drivers.update);
  const expectedRight = updated.expectedUpdatedRight;
  if (
    updated.phase !== "updated" ||
    updated.editorCount !== 2 ||
    !updated.left ||
    !updated.right ||
    !expectedRight ||
    exactFacts(stableInstanceFacts(updated.left)) !==
      exactFacts(stableInstanceFacts(initialLeft)) ||
    !sameRect(updated.left.rect, initialLeft.rect) ||
    updated.right.rootIdentity !== initialRight.rootIdentity ||
    updated.right.apiIdentity !== initialRight.apiIdentity ||
    updated.right.apiId !== initialRight.apiId ||
    updated.right.apiDestroyed ||
    !updated.right.sameInitialRoot ||
    !updated.right.sameInitialApi ||
    updated.right.theme !== expectedRight.theme ||
    updated.right.direction !== expectedRight.direction ||
    exactFacts(updated.right.profile) !== exactFacts(expectedRight.profile) ||
    exactFacts(updated.right.scene) !== exactFacts(initialRight.scene) ||
    (updated.right.theme === initialRight.theme &&
      updated.right.direction === initialRight.direction &&
      exactFacts(updated.right.profile) === exactFacts(initialRight.profile))
  ) {
    throw new Error(
      `Multi-editor update state did not reach the exact expected facts or rendered scene: ${JSON.stringify(
        { initial: initialRight, expectedRight, updated: updated.right },
      )}`,
    );
  }
  assertMultiEditorAssociation("updated right", updated.right, {
    requireInitialIdentity: true,
  });

  assertTrustedMultiEditorControl(unmounted, "unmount", 1, drivers.unmount);
  const detached = unmounted.detachedRight;
  if (
    unmounted.phase !== "unmounted" ||
    unmounted.editorCount !== 1 ||
    unmounted.right !== null ||
    !unmounted.left ||
    !detached ||
    detached.rootConnected ||
    !detached.apiDestroyed ||
    detached.apiStillCurrent ||
    detached.connectedControls !== 0 ||
    detached.connectedSurfaces !== 0 ||
    detached.presentControlIds !== 0 ||
    detached.ownerClaimed ||
    detached.portalResidue !== 0 ||
    unmounted.left.rootIdentity !== initialLeft.rootIdentity ||
    unmounted.left.apiIdentity !== initialLeft.apiIdentity ||
    unmounted.left.apiId !== initialLeft.apiId ||
    unmounted.left.apiDestroyed ||
    !unmounted.left.sameInitialRoot ||
    !unmounted.left.sameInitialApi ||
    unmounted.left.theme !== initialLeft.theme ||
    unmounted.left.direction !== initialLeft.direction ||
    exactFacts(unmounted.left.profile) !== exactFacts(initialLeft.profile) ||
    exactFacts(unmounted.left.scene) !== exactFacts(initialLeft.scene) ||
    !leftRenderedSceneReady(unmounted.left) ||
    !sameRect(unmounted.left.rect, initialLeft.rect) ||
    !unmounted.left.focus.ownerConnected ||
    !unmounted.left.focus.active ||
    !unmounted.left.focus.sameInitialOwner ||
    !unmounted.left.focus.surfaceConnected ||
    !unmounted.left.withinFixture ||
    unmounted.documentDirection !== initial.documentDirection
  ) {
    throw new Error(
      `Multi-editor unmount cleanup or survivor isolation failed, including rendered scene: ${JSON.stringify(
        unmounted,
      )}`,
    );
  }
  assertMultiEditorAssociation("unmounted survivor", unmounted.left, {
    requireInitialIdentity: true,
  });

  assertTrustedMultiEditorControl(restored, "recreate", 2, drivers.recreate);
  const restoredDetached = restored.detachedRight;
  if (
    restored.phase !== "restored" ||
    restored.editorCount !== 2 ||
    !restored.left ||
    !restored.right ||
    !restoredDetached ||
    exactFacts(stableInstanceFacts(restored.left)) !==
      exactFacts(stableInstanceFacts(initialLeft)) ||
    !leftRenderedSceneReady(restored.left) ||
    !sameRect(restored.left.rect, initialLeft.rect) ||
    !restored.left.withinFixture ||
    restored.right.rootIdentity === initialRight.rootIdentity ||
    restored.right.apiIdentity === initialRight.apiIdentity ||
    restored.right.apiId === initialRight.apiId ||
    restored.right.apiDestroyed ||
    restored.right.sameInitialRoot ||
    restored.right.sameInitialApi ||
    restored.right.theme !== initialRight.theme ||
    restored.right.direction !== initialRight.direction ||
    exactFacts(restored.right.profile) !== exactFacts(initialRight.profile) ||
    exactFacts(restored.right.scene) !== exactFacts(initialRight.scene) ||
    !sameRect(restored.right.rect, initialRight.rect) ||
    !restored.right.withinFixture ||
    restoredDetached.rootConnected ||
    !restoredDetached.apiDestroyed ||
    restoredDetached.connectedControls !== 0 ||
    restoredDetached.connectedSurfaces !== 0 ||
    restoredDetached.ownerClaimed ||
    restored.staleMarkerCount !== 0 ||
    restored.documentDirection !== initial.documentDirection ||
    restored.mounts.left.length !== 1 ||
    restored.mounts.right.length !== 2 ||
    restored.unmounts.left.length !== 0 ||
    restored.unmounts.right.length !== 1
  ) {
    throw new Error(
      `Multi-editor trusted recreation did not restore exact facts or rendered scene: ${JSON.stringify(
        restored,
      )}`,
    );
  }
  assertMultiEditorAssociation("restored left", restored.left, {
    requireInitialIdentity: true,
  });
  assertMultiEditorAssociation("restored right", restored.right, {
    requireInitialIdentity: false,
  });
};

export const multiEditorPhaseObservation = (
  snapshot: MultiEditorLifecycleSnapshot,
  expectedPhase: MultiEditorLifecycleSnapshot["phase"],
  expectedControlCount: number,
) => {
  const detached = snapshot.detachedRight;
  const leftSceneReady =
    exactFacts(snapshot.left?.scene) ===
      exactFacts(snapshot.initial?.left.scene) &&
    leftRenderedSceneReady(snapshot.left);
  const rightSceneReady =
    expectedPhase === "unmounted" ||
    exactFacts(snapshot.right?.scene) ===
      exactFacts(snapshot.initial?.right.scene);
  const ready =
    snapshot.phase === expectedPhase &&
    snapshot.controls.length === expectedControlCount &&
    leftSceneReady &&
    rightSceneReady &&
    (expectedPhase === "updated"
      ? !!snapshot.right?.primaryAssociation?.ownerClaimed &&
        snapshot.left?.focus.active === true
      : expectedPhase === "unmounted"
      ? snapshot.right === null &&
        detached?.apiDestroyed === true &&
        detached.ownerClaimed === false &&
        detached.portalResidue === 0 &&
        snapshot.left?.focus.active === true
      : expectedPhase === "restored"
      ? !!snapshot.right?.primaryAssociation?.ownerClaimed &&
        snapshot.left?.focus.active === true &&
        snapshot.editorCount === 2
      : true);
  const signature = exactFacts({
    phase: snapshot.phase,
    count: snapshot.editorCount,
    documentDirection: snapshot.documentDirection,
    left: snapshot.left && {
      root: snapshot.left.rootIdentity,
      api: snapshot.left.apiIdentity,
      theme: snapshot.left.theme,
      direction: snapshot.left.direction,
      profile: snapshot.left.profile,
      scene: snapshot.left.scene,
      renderedScene: snapshot.left.renderedScene,
      rect: snapshot.left.rect,
      focus: snapshot.left.focus,
      association: snapshot.left.primaryAssociation,
    },
    right: snapshot.right && {
      root: snapshot.right.rootIdentity,
      api: snapshot.right.apiIdentity,
      theme: snapshot.right.theme,
      direction: snapshot.right.direction,
      profile: snapshot.right.profile,
      scene: snapshot.right.scene,
      rect: snapshot.right.rect,
      association: snapshot.right.primaryAssociation,
    },
    detached,
    controls: snapshot.controls,
  });
  return { ready, signature };
};

export const waitForStableMultiEditorSnapshot = async ({
  expectedPhase,
  expectedControlCount,
  readSnapshot,
  timeoutMs = 5_000,
}: {
  expectedPhase: MultiEditorLifecycleSnapshot["phase"];
  expectedControlCount: number;
  readSnapshot: () => Promise<MultiEditorLifecycleSnapshot>;
  timeoutMs?: number;
}) => {
  const timeoutAt = Date.now() + timeoutMs;
  let previousSignature: string | null = null;
  let stableFrames = 0;
  let last: MultiEditorLifecycleSnapshot | null = null;
  while (Date.now() < timeoutAt) {
    last = await readSnapshot();
    const observation = multiEditorPhaseObservation(
      last,
      expectedPhase,
      expectedControlCount,
    );
    stableFrames =
      observation.ready && observation.signature === previousSignature
        ? stableFrames + 1
        : observation.ready
        ? 1
        : 0;
    previousSignature = observation.signature;
    if (stableFrames >= 2) {
      return last;
    }
  }
  throw new Error(
    `Multi-editor rendered scene did not settle for ${expectedPhase}: ${JSON.stringify(
      last,
    )}`,
  );
};

const readMultiEditorLifecycleAfterFrame = (
  proxy: ChromeProxyPort,
  targetId: string,
) =>
  proxy.evaluateJson<MultiEditorLifecycleSnapshot>(
    targetId,
    `await (async () => {
      try {
        await Promise.resolve();
        await new Promise(requestAnimationFrame);
        return JSON.stringify(window.__visualRegressionHost.readMultiEditorLifecycle());
      } catch (error) {
        return JSON.stringify({
          __visualError: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack ?? null : null,
        });
      }
    })()`,
  );

export const waitForRenderedMultiEditorPhase = (
  proxy: ChromeProxyPort,
  targetId: string,
  expectedPhase: MultiEditorLifecycleSnapshot["phase"],
  expectedControlCount: number,
) =>
  waitForStableMultiEditorSnapshot({
    expectedPhase,
    expectedControlCount,
    readSnapshot: () => readMultiEditorLifecycleAfterFrame(proxy, targetId),
  });

export const executeInstruction = async (
  proxy: ChromeProxyPort,
  targetId: string,
  instruction: Instruction,
) => {
  switch (instruction.type) {
    case "none":
      return [];
    case "click":
      return [
        await proxy.clickAt(targetId, instruction.selector, {
          nth: instruction.nth,
        }),
      ];
    case "key":
      return [await proxy.trustedKey(targetId, instruction.key)];
    case "seed-focus-then-key-to": {
      const seeded = await proxy.evaluate<boolean>(
        targetId,
        `(() => {
          const candidates = [...document.querySelectorAll(${JSON.stringify(
            instruction.selector,
          )})];
          const node = candidates.find((candidate) => candidate instanceof HTMLElement && candidate.offsetParent !== null);
          if (!(node instanceof HTMLElement)) return false;
          node.focus({ preventScroll: true });
          return document.activeElement === node;
        })()`,
      );
      if (!seeded) {
        throw new Error(
          `Focus prerequisite unavailable: ${instruction.selector}`,
        );
      }
      const result = [
        { prerequisite: "focus", selector: instruction.selector, seeded },
        await proxy.trustedKey(targetId, instruction.key),
      ];
      const reached = await proxy.evaluate<boolean>(
        targetId,
        `document.activeElement instanceof Element && document.activeElement.matches(${JSON.stringify(
          instruction.target,
        )})`,
      );
      if (!reached) {
        throw new Error(
          `Trusted keyboard input did not reach ${instruction.target}`,
        );
      }
      return result;
    }
    case "tab-to": {
      const results = [];
      const matches = () =>
        proxy.evaluate<boolean>(
          targetId,
          `(() => {
            const active = document.activeElement;
            return active instanceof Element && active.matches(${JSON.stringify(
              instruction.selector,
            )});
          })()`,
        );
      if (await matches()) {
        results.push(await proxy.trustedKey(targetId, "ArrowLeft"));
      }
      for (
        let index = 0;
        index < (instruction.maxTabs ?? 40) && !(await matches());
        index++
      ) {
        results.push(await proxy.trustedKey(targetId, "Tab"));
      }
      if (!(await matches())) {
        throw new Error(
          `Trusted keyboard navigation did not reach ${instruction.selector}`,
        );
      }
      return results;
    }
    case "click-sequence": {
      const results = [];
      const before = await proxy.evaluate<Record<string, unknown>>(
        targetId,
        `(() => ({
          ownerVisible: Boolean([...document.querySelectorAll(${JSON.stringify(
            instruction.ownerSelector,
          )})].find((node) => node instanceof HTMLElement && node.offsetParent !== null)),
          dialogName: window.h?.state?.openDialog?.name ?? null,
        }))()`,
      );
      if (
        before.ownerVisible ||
        (instruction.dialogName != null && before.dialogName != null)
      ) {
        throw new Error(
          `Application action did not begin closed: ${JSON.stringify(before)}`,
        );
      }
      for (const control of instruction.controls) {
        const precondition = await proxy.evaluate<Record<string, unknown>>(
          targetId,
          `(() => {
            const selector = ${JSON.stringify(control.selector)};
            const identity = ${JSON.stringify(control.identity)};
            const candidates = [...document.querySelectorAll(selector)];
            const node = candidates.find((candidate) => {
              if (!(candidate instanceof HTMLElement)) return false;
              const rect = candidate.getBoundingClientRect();
              const style = getComputedStyle(candidate);
              return candidate.offsetParent !== null && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
            });
            if (!(node instanceof HTMLElement)) {
              return { identity, selector, visible: false, actionable: false, candidateCount: candidates.length };
            }
            const rect = node.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            const hit = document.elementFromPoint(x, y);
            const disabled = node.matches(":disabled, [aria-disabled='true']");
            const reachable = hit === node || (hit instanceof Node && node.contains(hit));
            const actionable = !disabled && getComputedStyle(node).pointerEvents !== "none" && reachable;
            const facts = {
              identity,
              selector,
              visible: true,
              actionable,
              disabled,
              reachable,
              candidateCount: candidates.length,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              tag: node.tagName,
              testId: node.getAttribute("data-testid"),
              ariaLabel: node.getAttribute("aria-label"),
              text: node.innerText.trim().slice(0, 120),
            };
            if (!actionable) return facts;
            const probe = {
              identity,
              selector,
              node,
              observed: null,
              listener: null,
            };
            probe.listener = (event) => {
              probe.observed = {
                type: event.type,
                isTrusted: event.isTrusted,
                targetOwned: event.target === node || (event.target instanceof Node && node.contains(event.target)),
              };
            };
            node.addEventListener("click", probe.listener, { capture: true, once: true });
            window.__visualTrustedControlProbe = probe;
            return facts;
          })()`,
        );
        if (!precondition.visible || !precondition.actionable) {
          throw new Error(
            `Visible product control is not actionable: ${JSON.stringify(
              precondition,
            )}`,
          );
        }
        const click = await proxy.clickAt(targetId, control.selector);
        const receipt = await proxy.evaluate<Record<string, unknown>>(
          targetId,
          `(() => {
            const probe = window.__visualTrustedControlProbe;
            if (!probe) return null;
            if (probe.listener) probe.node.removeEventListener("click", probe.listener, { capture: true });
            const receipt = {
              identity: probe.identity,
              selector: probe.selector,
              ...probe.observed,
            };
            delete window.__visualTrustedControlProbe;
            return receipt;
          })()`,
        );
        if (receipt.isTrusted !== true || receipt.targetOwned !== true) {
          throw new Error(
            `Product control did not receive trusted input: ${JSON.stringify(
              receipt,
            )}`,
          );
        }
        results.push({
          control: control.identity,
          precondition,
          trusted: click,
          receipt,
        });
      }
      const owner = await proxy.evaluate<Record<string, unknown>>(
        targetId,
        `(() => {
          const surface = [...document.querySelectorAll(${JSON.stringify(
            instruction.ownerSelector,
          )})].find((node) => node instanceof HTMLElement && node.offsetParent !== null);
          const state = window.h?.state;
          return {
            ownerIdentity: ${JSON.stringify(instruction.ownerIdentity)},
            visibleSurface: surface instanceof HTMLElement && surface.offsetParent !== null,
            ownerSelector: ${JSON.stringify(instruction.ownerSelector)},
            focusInside: surface instanceof HTMLElement && surface.contains(document.activeElement),
            dialogName: state?.openDialog?.name ?? null,
            dialogTab: state?.openDialog?.tab ?? null,
          };
        })()`,
      );
      if (
        !owner.visibleSurface ||
        !owner.focusInside ||
        (instruction.dialogName != null &&
          owner.dialogName !== instruction.dialogName)
      ) {
        throw new Error(
          `Visible action sequence did not open an owned surface: ${JSON.stringify(
            owner,
          )}`,
        );
      }
      results.push({ before, owner });
      return results;
    }
    case "multi-editor-lifecycle": {
      const trustedControl = async (
        selector: string,
        phase: MultiEditorLifecycleSnapshot["phase"],
        controlCount: number,
      ) => {
        await proxy.activateTarget(targetId);
        const driver = await proxy.clickAt(targetId, selector);
        const snapshot = await waitForRenderedMultiEditorPhase(
          proxy,
          targetId,
          phase,
          controlCount,
        );
        return { driver, snapshot };
      };

      const initial = await proxy.evaluateJson<MultiEditorLifecycleSnapshot>(
        targetId,
        `await (async () => {
          try {
            return JSON.stringify(await window.__visualRegressionHost.initializeMultiEditorLifecycle());
          } catch (error) {
            return JSON.stringify({
              __visualError: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack ?? null : null,
            });
          }
        })()`,
      );
      if (
        initial.phase !== "initial" ||
        initial.initialRecorded !== true ||
        !initial.initial ||
        !initial.left?.primaryAssociation?.ownerClaimed ||
        !initial.right?.primaryAssociation?.ownerClaimed
      ) {
        throw new Error(
          `Multi-editor fixture did not record immutable initial facts: ${JSON.stringify(
            initial,
          )}`,
        );
      }
      const update = await trustedControl(
        instruction.updateSelector,
        "updated",
        1,
      );
      const unmount = await trustedControl(
        instruction.unmountSelector,
        "unmounted",
        2,
      );
      const recreate = await trustedControl(
        instruction.recreateSelector,
        "restored",
        3,
      );
      const evidence: MultiEditorLifecycleEvidence = {
        initial,
        updated: update.snapshot,
        unmounted: unmount.snapshot,
        restored: recreate.snapshot,
        drivers: {
          update: update.driver,
          unmount: unmount.driver,
          recreate: recreate.driver,
        },
      };
      assertMultiEditorLifecycleFacts(evidence);
      return [evidence];
    }
  }
};

export type ToolbarShellFacts = {
  editorCount: number;
  triggerCount: number;
  triggerVisible: boolean;
  triggerExpanded: string | null;
  triggerControls: string | null;
  triggerFocused: boolean;
  surfaceCount: number;
  surfaceId: string | null;
  rootOpen: string | null;
  rootOwner: string | null;
  ownerClaimed: boolean;
  sameEditor: boolean;
  focusInsideSurface: boolean;
  activeElementConnected: boolean;
  adjacent: {
    count: number;
    ariaHidden: string | null;
    inert: boolean;
    opacity: string | null;
    inlineOpacity: string | null;
    inlineTransition: string | null;
    pointerEvents: string | null;
    visibility: string | null;
  };
};

export type ToolbarCoordinateSample = {
  ratio: number;
  rowIdentity: string;
  actionIdentity: string;
  rect: { left: number; top: number; width: number; height: number };
  transition: { before: string | null; after: string | null };
  trusted: TrustedCoordinateEvidence;
  activation: {
    rowClicks: number;
    rowReceipt: {
      isTrusted: boolean;
      targetOwned: boolean;
      rowIdentity: string;
    } | null;
    siblingClicks: number;
    adjacentClicks: number;
  };
  closed: ToolbarShellFacts;
};

export type ToolbarLifecycleFacts = {
  opened: ToolbarShellFacts;
  unmountInput: TrustedCoordinateEvidence;
  recreateInput: TrustedCoordinateEvidence;
  afterUnmount: {
    oldRootConnected: boolean;
    oldTriggerConnected: boolean;
    oldSurfaceConnected: boolean;
    oldAdjacentConnected: boolean;
    oldRootOpen: string | null;
    oldRootOwner: string | null;
    oldAdjacentHidden: string | null;
    oldAdjacentInert: boolean;
    oldAdjacentOpacity: string;
    oldAdjacentTransition: string;
    oldAdjacentPointerStyles: string[];
    ownerClaimed: boolean;
    mainEditorConnected: boolean;
    mainEditorMarkers: number;
    mainEditorSurfaces: number;
  };
  recreated: {
    generation: string | null;
    rootOpen: string | null;
    rootOwner: string | null;
    surfaceCount: number;
    mainEditorConnected: boolean;
  };
  removed: {
    removed?: boolean;
    mounts?: Array<{ generation: number; editorId: string }>;
    unmounts?: Array<{ generation: number; editorId: string | null }>;
    controls?: Array<{
      action: string;
      isTrusted: boolean;
      pointerType: string;
    }>;
  };
  helperCount: number;
};

export const assertToolbarOpenFacts = (
  facts: ToolbarShellFacts,
  options: { requireAdjacent: boolean },
) => {
  if (
    facts.editorCount !== 1 ||
    facts.triggerCount !== 1 ||
    !facts.triggerVisible ||
    facts.triggerExpanded !== "true" ||
    facts.surfaceCount !== 1 ||
    !facts.surfaceId ||
    facts.triggerControls !== facts.surfaceId ||
    facts.rootOpen !== "true" ||
    facts.rootOwner !== facts.surfaceId ||
    !facts.ownerClaimed ||
    !facts.sameEditor ||
    !facts.activeElementConnected ||
    (options.requireAdjacent &&
      (facts.adjacent.count !== 1 ||
        facts.adjacent.ariaHidden !== "true" ||
        !facts.adjacent.inert ||
        facts.adjacent.opacity !== "0" ||
        facts.adjacent.inlineOpacity !== "0" ||
        facts.adjacent.inlineTransition !== "none" ||
        facts.adjacent.pointerEvents !== "none"))
  ) {
    throw new Error(
      `Toolbar open owner or shielding failed: ${JSON.stringify(facts)}`,
    );
  }
};

export const assertToolbarRestoredFacts = (
  facts: ToolbarShellFacts,
  options: { requireAdjacent: boolean; requireTriggerFocus: boolean },
) => {
  if (
    facts.editorCount !== 1 ||
    facts.triggerCount !== 1 ||
    !facts.triggerVisible ||
    facts.triggerExpanded !== "false" ||
    facts.surfaceCount !== 0 ||
    facts.rootOpen != null ||
    facts.rootOwner != null ||
    facts.ownerClaimed ||
    facts.focusInsideSurface ||
    !facts.activeElementConnected ||
    (options.requireTriggerFocus && !facts.triggerFocused) ||
    (options.requireAdjacent &&
      (facts.adjacent.count !== 1 ||
        facts.adjacent.ariaHidden != null ||
        facts.adjacent.inert ||
        facts.adjacent.opacity !== "1" ||
        facts.adjacent.inlineOpacity !== "" ||
        facts.adjacent.inlineTransition !== "" ||
        facts.adjacent.pointerEvents === "none" ||
        facts.adjacent.visibility === "hidden"))
  ) {
    throw new Error(`Toolbar restoration failed: ${JSON.stringify(facts)}`);
  }
};

export const assertToolbarCoordinateSamples = (
  samples: readonly ToolbarCoordinateSample[],
) => {
  const expectedRatios = [0.15, 0.5, 0.85];
  const first = samples[0];
  if (samples.length !== expectedRatios.length || !first) {
    throw new Error(
      `Toolbar coordinate sample count failed: ${samples.length}`,
    );
  }
  for (const [index, sample] of samples.entries()) {
    assertTrustedCoordinateResult(sample.trusted, { requireEditorPath: false });
    const expectedPoint = {
      x: sample.rect.left + sample.rect.width * sample.ratio,
      y: sample.rect.top + sample.rect.height / 2,
    };
    if (
      sample.ratio !== expectedRatios[index] ||
      sample.rowIdentity !== first.rowIdentity ||
      sample.actionIdentity !== first.actionIdentity ||
      JSON.stringify(sample.transition) !== JSON.stringify(first.transition) ||
      sample.rect.width < 40 ||
      sample.rect.height < 40 ||
      !coordinateMatches(sample.trusted.point.x, expectedPoint.x) ||
      !coordinateMatches(sample.trusted.point.y, expectedPoint.y) ||
      sample.activation.rowClicks !== 1 ||
      !sample.activation.rowReceipt ||
      sample.activation.rowReceipt.isTrusted !== true ||
      sample.activation.rowReceipt.targetOwned !== true ||
      sample.activation.rowReceipt.rowIdentity !== sample.rowIdentity ||
      sample.activation.siblingClicks !== 0 ||
      sample.activation.adjacentClicks !== 0
    ) {
      throw new Error(
        `Toolbar coordinate identity or activation failed: ${JSON.stringify(
          sample,
        )}`,
      );
    }
    assertToolbarRestoredFacts(sample.closed, {
      requireAdjacent: true,
      requireTriggerFocus: false,
    });
  }
};

export const assertToolbarOutsideRoute = (
  outside: {
    applicable: boolean;
    trusted: TrustedCoordinateEvidence | null;
  },
  facts: ToolbarShellFacts,
) => {
  assertToolbarRestoredFacts(facts, {
    requireAdjacent: true,
    requireTriggerFocus: false,
  });
  if (
    !outside.applicable ||
    !outside.trusted ||
    !outside.trusted.page?.isTrusted ||
    !outside.trusted.editor?.isTrusted ||
    facts.triggerFocused
  ) {
    throw new Error(
      `Toolbar outside canvas route or focus cleanup failed: ${JSON.stringify({
        outside,
        facts,
      })}`,
    );
  }
  assertTrustedCoordinateResult(outside.trusted, { requireEditorPath: true });
};

export const assertToolbarLifecycleFacts = (facts: ToolbarLifecycleFacts) => {
  assertToolbarOpenFacts(facts.opened, { requireAdjacent: true });
  assertTrustedCoordinateResult(facts.unmountInput, {
    requireEditorPath: false,
  });
  assertTrustedCoordinateResult(facts.recreateInput, {
    requireEditorPath: false,
  });
  const mounts = facts.removed.mounts ?? [];
  const unmounts = facts.removed.unmounts ?? [];
  const controls = facts.removed.controls ?? [];
  if (
    facts.afterUnmount.oldRootConnected ||
    facts.afterUnmount.oldTriggerConnected ||
    facts.afterUnmount.oldSurfaceConnected ||
    facts.afterUnmount.oldAdjacentConnected ||
    facts.afterUnmount.oldRootOpen != null ||
    facts.afterUnmount.oldRootOwner != null ||
    facts.afterUnmount.oldAdjacentHidden != null ||
    facts.afterUnmount.oldAdjacentInert ||
    facts.afterUnmount.oldAdjacentOpacity ||
    facts.afterUnmount.oldAdjacentTransition ||
    facts.afterUnmount.oldAdjacentPointerStyles.some(Boolean) ||
    facts.afterUnmount.ownerClaimed ||
    !facts.afterUnmount.mainEditorConnected ||
    facts.afterUnmount.mainEditorMarkers !== 0 ||
    facts.afterUnmount.mainEditorSurfaces !== 0 ||
    facts.recreated.generation !== "2" ||
    facts.recreated.rootOpen != null ||
    facts.recreated.rootOwner != null ||
    facts.recreated.surfaceCount !== 0 ||
    !facts.recreated.mainEditorConnected ||
    facts.removed.removed !== true ||
    mounts.length !== 2 ||
    mounts[0].editorId === mounts[1].editorId ||
    !unmounts.some((entry) => entry.editorId === mounts[0].editorId) ||
    controls.length !== 2 ||
    controls.some((entry) => entry.isTrusted !== true) ||
    facts.helperCount !== 0
  ) {
    throw new Error(
      `Toolbar editor lifecycle cleanup failed: ${JSON.stringify(facts)}`,
    );
  }
};

const toolbarFrames = async (proxy: ChromeProxyPort, targetId: string) =>
  proxy.evaluate(
    targetId,
    `await (async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return true;
    })()`,
  );

const waitForToolbarRestoration = async (
  proxy: ChromeProxyPort,
  targetId: string,
  scopeSelector: string,
) =>
  proxy.evaluate(
    targetId,
    `await (async () => {
      const timeoutAt = performance.now() + 2000;
      while (performance.now() < timeoutAt) {
        const roots = [...document.querySelectorAll(${JSON.stringify(
          scopeSelector,
        )})].filter((node) => node instanceof HTMLElement && node.querySelector("canvas.interactive"));
        const root = roots[0];
        const adjacent = root?.querySelector(".mobile-shape-actions");
        const controls = adjacent instanceof HTMLElement
          ? [...adjacent.querySelectorAll("button, a[href], input, select, textarea, [role='button']")]
          : [];
        if (
          roots.length === 1 &&
          adjacent instanceof HTMLElement &&
          adjacent.getAttribute("aria-hidden") == null &&
          !adjacent.inert &&
          adjacent.style.opacity === "" &&
          adjacent.style.transition === "" &&
          getComputedStyle(adjacent).opacity === "1" &&
          controls.length > 0 &&
          controls.every((node) => node.style.pointerEvents === "" && getComputedStyle(node).pointerEvents !== "none") &&
          root.getAttribute("data-toolbar-menu-open") == null &&
          root.getAttribute("data-toolbar-menu-owner") == null
        ) return true;
        await new Promise(requestAnimationFrame);
      }
      throw new Error("Toolbar adjacent actions did not finish restoring");
    })()`,
  );

const dispatchVisibleToolbarControl = async (
  proxy: ChromeProxyPort,
  targetId: string,
  request: {
    token: string;
    selector: string;
    ownerSelector: string;
    preferTestId?: string;
  },
) => {
  await proxy.activateTarget(targetId);
  const prepared = await proxy.evaluate<{
    point: { x: number; y: number };
    testId: string | null;
  }>(
    targetId,
    `(() => {
      const token = ${JSON.stringify(request.token)};
      const visible = (node) => {
        if (!(node instanceof HTMLElement)) return false;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      };
      const candidates = [...document.querySelectorAll(${JSON.stringify(
        request.selector,
      )})].filter(visible);
      const preferredTestId = ${JSON.stringify(request.preferTestId ?? null)};
      const target = candidates.find((node) => preferredTestId && node.getAttribute("data-testid") === preferredTestId) ?? candidates[0];
      if (!(target instanceof HTMLElement)) throw new Error("Visible toolbar control is unavailable");
      const owners = [...document.querySelectorAll(${JSON.stringify(
        request.ownerSelector,
      )})]
        .filter((node) => node instanceof HTMLElement && node.contains(target));
      if (owners.length !== 1 || !(owners[0] instanceof HTMLElement)) {
        throw new Error("Visible toolbar control owner is ambiguous");
      }
      owners[0].setAttribute("data-visual-toolbar-coordinate-owner", token);
      const rect = target.getBoundingClientRect();
      return {
        point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        testId: target.getAttribute("data-testid"),
      };
    })()`,
  );
  try {
    const stableTargetSelector = `[data-visual-toolbar-coordinate-owner='${request.token}'] ${request.selector}`;
    const trusted = await dispatchTrustedCoordinateInput(proxy, targetId, {
      token: request.token,
      point: prepared.point,
      targetSelector: stableTargetSelector,
      ownerSelector: `[data-visual-toolbar-coordinate-owner='${request.token}']`,
      targetMode: "contained",
      alreadyActivated: true,
    });
    return {
      ...prepared,
      testId: trusted.physicalTarget.targetTestId,
      trusted,
    };
  } finally {
    await proxy.evaluate(
      targetId,
      `(() => {
        document.querySelector("[data-visual-toolbar-coordinate-owner='${request.token}']")?.removeAttribute("data-visual-toolbar-coordinate-owner");
      })()`,
    );
  }
};

export const exerciseFinalToolbarRow = async (
  proxy: ChromeProxyPort,
  targetId: string,
  options: { captureRestored?: () => Promise<string | void> } = {},
) => {
  const mainScope = ".excalidraw-container:has(canvas.interactive)";
  let triggerTestId: string | null = null;
  let ownerIdentity: string | null = null;
  let sequence = 0;
  const nextToken = (label: string) =>
    `toolbar-${label}-${process.pid}-${Date.now()}-${sequence++}`;
  const triggerSelector = `${mainScope} [data-testid='toolbar-overflow-trigger'], ${mainScope} [data-testid='toolbar-shapes-group']`;

  const inspectShell = async (
    scopeSelector: string,
    expectedTriggerTestId: string,
    expectedOwnerIdentity: string | null,
  ) =>
    proxy.evaluate<ToolbarShellFacts>(
      targetId,
      `(() => {
        const scopes = [...document.querySelectorAll(${JSON.stringify(
          scopeSelector,
        )})]
          .filter((node) => node instanceof HTMLElement && node.querySelector("canvas.interactive"));
        const root = scopes[0];
        const triggers = root instanceof HTMLElement
          ? [...root.querySelectorAll("[data-testid='" + ${JSON.stringify(
            expectedTriggerTestId,
          )} + "']")]
          : [];
        const trigger = triggers.find((node) => node instanceof HTMLElement && node.offsetParent !== null);
        const surfaceId = trigger?.getAttribute("aria-controls") ?? null;
        const surfaces = surfaceId ? [...document.querySelectorAll("[id='" + CSS.escape(surfaceId) + "']")] : [];
        const surface = surfaces[0];
        const adjacent = root instanceof HTMLElement ? root.querySelector(".mobile-shape-actions") : null;
        const adjacentStyle = adjacent instanceof HTMLElement ? getComputedStyle(adjacent) : null;
        const adjacentControls = adjacent instanceof HTMLElement
          ? [...adjacent.querySelectorAll("button, a[href], input, select, textarea, [role='button']")]
          : [];
        const expectedOwner = ${JSON.stringify(expectedOwnerIdentity)};
        return {
          editorCount: scopes.length,
          triggerCount: triggers.length,
          triggerVisible: trigger instanceof HTMLElement && trigger.offsetParent !== null,
          triggerExpanded: trigger?.getAttribute("aria-expanded") ?? null,
          triggerControls: surfaceId,
          triggerFocused: document.activeElement === trigger,
          surfaceCount: surfaces.length,
          surfaceId,
          rootOpen: root?.getAttribute("data-toolbar-menu-open") ?? null,
          rootOwner: root?.getAttribute("data-toolbar-menu-owner") ?? null,
          ownerClaimed: expectedOwner ? window.__visualRegressionHost?.hasToolbarSurfaceOwner(expectedOwner) === true : false,
          sameEditor: root instanceof HTMLElement && surface instanceof Node && root.contains(surface),
          focusInsideSurface: surface instanceof HTMLElement && surface.contains(document.activeElement),
          activeElementConnected: document.activeElement instanceof HTMLElement && document.activeElement.isConnected,
          adjacent: {
            count: adjacent instanceof HTMLElement ? 1 : 0,
            ariaHidden: adjacent?.getAttribute("aria-hidden") ?? null,
            inert: adjacent instanceof HTMLElement ? adjacent.inert : false,
            opacity: adjacentStyle?.opacity ?? null,
            inlineOpacity: adjacent instanceof HTMLElement ? adjacent.style.opacity : null,
            inlineTransition: adjacent instanceof HTMLElement ? adjacent.style.transition : null,
            pointerEvents: adjacentControls.length && adjacentControls.every((node) => getComputedStyle(node).pointerEvents === "none") ? "none" : "auto",
            visibility: adjacentStyle?.visibility ?? null,
          },
        };
      })()`,
    );

  const openToolbar = async (
    scopeSelector: string,
    selector: string,
    expectedTestId: string | null,
  ) => {
    const openedBy = await dispatchVisibleToolbarControl(proxy, targetId, {
      token: nextToken("open"),
      selector,
      ownerSelector: scopeSelector,
      preferTestId: expectedTestId ?? "toolbar-overflow-trigger",
    });
    await toolbarFrames(proxy, targetId);
    const resolvedTestId = openedBy.testId;
    if (!resolvedTestId) {
      throw new Error("Toolbar trigger identity is absent");
    }
    const preliminary = await inspectShell(scopeSelector, resolvedTestId, null);
    const resolvedOwner = preliminary.triggerControls;
    const facts = await inspectShell(
      scopeSelector,
      resolvedTestId,
      resolvedOwner,
    );
    assertToolbarOpenFacts(facts, { requireAdjacent: true });
    return {
      openedBy,
      triggerTestId: resolvedTestId,
      ownerIdentity: resolvedOwner!,
      facts,
    };
  };

  const clickRow = async (
    ratio: number,
    kind: "final" | "reset",
    expectedTrigger: string,
    expectedOwner: string,
  ) => {
    const token = nextToken(kind);
    const prepared = await proxy.evaluate<{
      point: { x: number; y: number };
      rect: { left: number; top: number; width: number; height: number };
      rowIdentity: string;
      actionIdentity: string;
      before: string | null;
    }>(
      targetId,
      `(() => {
        const owner = document.getElementById(${JSON.stringify(expectedOwner)});
        if (!(owner instanceof HTMLElement)) throw new Error("Toolbar menu owner is unavailable");
        const rows = [...owner.querySelectorAll("[role^='menuitem']")]
          .filter((node) => node instanceof HTMLElement && node.offsetParent !== null && !node.matches(":disabled, [aria-disabled='true']"));
        const row = ${JSON.stringify(
          kind,
        )} === "final" ? rows.at(-1) : rows.find((candidate) => candidate !== rows.at(-1));
        if (!(row instanceof HTMLElement)) throw new Error("Toolbar row is unavailable");
        const root = row.closest(".excalidraw-container");
        const adjacent = root?.querySelector(".mobile-shape-actions");
        const rowIdentity = [
          owner.id,
          row.getAttribute("data-testid") ?? "",
          row.getAttribute("role") ?? "",
          row.getAttribute("aria-label") ?? row.innerText.trim(),
        ].join("|");
        const actionIdentity = row.getAttribute("data-testid") ?? row.getAttribute("aria-label") ?? row.innerText.trim();
        row.setAttribute("data-visual-toolbar-coordinate-target", ${JSON.stringify(
          token,
        )});
        owner.setAttribute("data-visual-toolbar-coordinate-owner", ${JSON.stringify(
          token,
        )});
        const probe = {
          row,
          rowIdentity,
          rowReceipt: null,
          rowClicks: 0,
          siblingClicks: 0,
          adjacentClicks: 0,
          listeners: [],
        };
        const listen = (node, listener) => {
          node.addEventListener("click", listener, true);
          probe.listeners.push([node, listener]);
        };
        listen(row, (event) => {
          probe.rowClicks += 1;
          probe.rowReceipt = {
            isTrusted: event.isTrusted,
            targetOwned: event.target === row || (event.target instanceof Node && row.contains(event.target)),
            rowIdentity,
          };
        });
        rows.filter((candidate) => candidate !== row).forEach((candidate) =>
          listen(candidate, () => { probe.siblingClicks += 1; })
        );
        if (adjacent instanceof HTMLElement) {
          listen(adjacent, () => { probe.adjacentClicks += 1; });
        }
        window.__visualToolbarRowProbe = probe;
        const rect = row.getBoundingClientRect();
        return {
          point: { x: rect.left + rect.width * ${JSON.stringify(
            ratio,
          )}, y: rect.top + rect.height / 2 },
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          rowIdentity,
          actionIdentity,
          before: window.h?.state?.activeTool?.type ?? null,
        };
      })()`,
    );
    let trusted: TrustedCoordinateEvidence;
    try {
      trusted = await dispatchTrustedCoordinateInput(proxy, targetId, {
        token,
        point: prepared.point,
        targetSelector: `[data-visual-toolbar-coordinate-target='${token}']`,
        ownerSelector: `[data-visual-toolbar-coordinate-owner='${token}']`,
        targetMode: "contained",
      });
      await waitForToolbarRestoration(proxy, targetId, mainScope);
      const activation = await proxy.evaluate<
        ToolbarCoordinateSample["activation"] & { after: string | null }
      >(
        targetId,
        `(() => {
          const probe = window.__visualToolbarRowProbe;
          if (!probe || probe.rowIdentity !== ${JSON.stringify(
            prepared.rowIdentity,
          )}) {
            throw new Error("Toolbar row activation receipt is unavailable");
          }
          return {
            rowClicks: probe.rowClicks,
            rowReceipt: probe.rowReceipt,
            siblingClicks: probe.siblingClicks,
            adjacentClicks: probe.adjacentClicks,
            after: window.h?.state?.activeTool?.type ?? null,
          };
        })()`,
      );
      const closed = await inspectShell(
        mainScope,
        expectedTrigger,
        expectedOwner,
      );
      assertToolbarRestoredFacts(closed, {
        requireAdjacent: true,
        requireTriggerFocus: false,
      });
      return {
        ratio,
        rowIdentity: prepared.rowIdentity,
        actionIdentity: prepared.actionIdentity,
        rect: prepared.rect,
        transition: { before: prepared.before, after: activation.after },
        trusted,
        activation: {
          rowClicks: activation.rowClicks,
          rowReceipt: activation.rowReceipt,
          siblingClicks: activation.siblingClicks,
          adjacentClicks: activation.adjacentClicks,
        },
        closed,
      } as ToolbarCoordinateSample;
    } finally {
      await proxy.evaluate(
        targetId,
        `(() => {
          const probe = window.__visualToolbarRowProbe;
          if (probe?.rowIdentity === ${JSON.stringify(prepared.rowIdentity)}) {
            probe.listeners.forEach(([node, listener]) => node.removeEventListener("click", listener, true));
            probe.row.removeAttribute("data-visual-toolbar-coordinate-target");
            document.querySelector("[data-visual-toolbar-coordinate-owner='${token}']")?.removeAttribute("data-visual-toolbar-coordinate-owner");
            delete window.__visualToolbarRowProbe;
          }
        })()`,
      );
    }
  };

  const initial = await openToolbar(mainScope, triggerSelector, null);
  triggerTestId = initial.triggerTestId;
  ownerIdentity = initial.ownerIdentity;
  const openings = [initial];
  const resetReceipts = [];
  const samples: ToolbarCoordinateSample[] = [];

  const reset = await clickRow(0.5, "reset", triggerTestId, ownerIdentity);
  resetReceipts.push(reset);
  for (const ratio of [0.15, 0.5, 0.85]) {
    const opened = await openToolbar(mainScope, triggerSelector, triggerTestId);
    openings.push(opened);
    if (opened.ownerIdentity !== ownerIdentity) {
      throw new Error("Toolbar owner identity changed while sampling");
    }
    samples.push(await clickRow(ratio, "final", triggerTestId, ownerIdentity));
    if (ratio !== 0.85) {
      const resetOpen = await openToolbar(
        mainScope,
        triggerSelector,
        triggerTestId,
      );
      openings.push(resetOpen);
      resetReceipts.push(
        await clickRow(0.5, "reset", triggerTestId, ownerIdentity),
      );
    }
  }
  assertToolbarCoordinateSamples(samples);

  const escapeOpen = await openToolbar(
    mainScope,
    triggerSelector,
    triggerTestId,
  );
  openings.push(escapeOpen);
  const escape = await proxy.trustedKey(targetId, "Escape");
  await waitForToolbarRestoration(proxy, targetId, mainScope);
  await toolbarFrames(proxy, targetId);
  const afterEscape = await inspectShell(
    mainScope,
    triggerTestId,
    ownerIdentity,
  );
  assertToolbarRestoredFacts(afterEscape, {
    requireAdjacent: true,
    requireTriggerFocus: true,
  });
  const restoredScreenshot = await options.captureRestored?.();

  const outsideOpen = await openToolbar(
    mainScope,
    triggerSelector,
    triggerTestId,
  );
  openings.push(outsideOpen);
  const outside = await assertBlankShellRoutesToCanvas(proxy, targetId);
  await waitForToolbarRestoration(proxy, targetId, mainScope);
  const afterOutside = await inspectShell(
    mainScope,
    triggerTestId,
    ownerIdentity,
  );
  assertToolbarOutsideRoute(outside, afterOutside);

  const mainMarker = nextToken("main-editor");
  await proxy.evaluate(
    targetId,
    `(() => {
      const roots = [...document.querySelectorAll(${JSON.stringify(mainScope)})]
        .filter((node) => node instanceof HTMLElement && node.querySelector("canvas.interactive"));
      if (roots.length !== 1) throw new Error("Main toolbar editor is ambiguous before lifecycle proof");
      roots[0].setAttribute("data-visual-toolbar-main-editor", ${JSON.stringify(
        mainMarker,
      )});
    })()`,
  );
  let lifecycle: ToolbarLifecycleFacts;
  try {
    await proxy.evaluate(
      targetId,
      `await window.__visualRegressionHost.installToolbarLifecycleFixture()`,
    );
    const lifecycleScope =
      "[data-visual-toolbar-lifecycle-editor]:has(canvas.interactive)";
    const lifecycleTriggerSelector =
      "[data-visual-toolbar-lifecycle-fixture] [data-testid='toolbar-overflow-trigger'], [data-visual-toolbar-lifecycle-fixture] [data-testid='toolbar-shapes-group']";
    const lifecycleOpen = await openToolbar(
      lifecycleScope,
      lifecycleTriggerSelector,
      null,
    );
    await proxy.evaluate(
      targetId,
      `(() => {
        const root = document.querySelector(${JSON.stringify(lifecycleScope)});
        const trigger = root?.querySelector("[data-testid='" + ${JSON.stringify(
          lifecycleOpen.triggerTestId,
        )} + "']");
        const surface = document.getElementById(${JSON.stringify(
          lifecycleOpen.ownerIdentity,
        )});
        const adjacent = root?.querySelector(".mobile-shape-actions");
        if (!(root instanceof HTMLElement) || !(trigger instanceof HTMLElement) || !(surface instanceof HTMLElement) || !(adjacent instanceof HTMLElement)) {
          throw new Error("Toolbar lifecycle cleanup references are unavailable");
        }
        window.__visualToolbarLifecycleContext = { root, trigger, surface, adjacent };
      })()`,
    );
    const unmountControl = await dispatchVisibleToolbarControl(
      proxy,
      targetId,
      {
        token: nextToken("unmount"),
        selector: "[data-visual-toolbar-lifecycle-unmount]",
        ownerSelector: "[data-visual-toolbar-lifecycle-fixture]",
      },
    );
    await proxy.evaluate(
      targetId,
      `await (async () => {
        const timeoutAt = performance.now() + 10000;
        while (performance.now() < timeoutAt && document.querySelector("[data-visual-toolbar-lifecycle-editor]")) {
          await new Promise(requestAnimationFrame);
        }
        if (document.querySelector("[data-visual-toolbar-lifecycle-editor]")) throw new Error("Toolbar lifecycle editor did not unmount");
        await Promise.resolve();
        await new Promise(requestAnimationFrame);
        return true;
      })()`,
    );
    const afterUnmount = await proxy.evaluate<
      ToolbarLifecycleFacts["afterUnmount"]
    >(
      targetId,
      `(() => {
        const context = window.__visualToolbarLifecycleContext;
        const main = document.querySelector("[data-visual-toolbar-main-editor='${mainMarker}']");
        return {
          oldRootConnected: context.root.isConnected,
          oldTriggerConnected: context.trigger.isConnected,
          oldSurfaceConnected: context.surface.isConnected,
          oldAdjacentConnected: context.adjacent.isConnected,
          oldRootOpen: context.root.getAttribute("data-toolbar-menu-open"),
          oldRootOwner: context.root.getAttribute("data-toolbar-menu-owner"),
          oldAdjacentHidden: context.adjacent.getAttribute("aria-hidden"),
          oldAdjacentInert: context.adjacent.inert,
          oldAdjacentOpacity: context.adjacent.style.opacity,
          oldAdjacentTransition: context.adjacent.style.transition,
          oldAdjacentPointerStyles: [...context.adjacent.querySelectorAll("button, a[href], input, select, textarea, [role='button']")].map((node) => node.style.pointerEvents),
          ownerClaimed: window.__visualRegressionHost.hasToolbarSurfaceOwner(${JSON.stringify(
            lifecycleOpen.ownerIdentity,
          )}),
          mainEditorConnected: main instanceof HTMLElement && main.isConnected,
          mainEditorMarkers: main instanceof HTMLElement ? main.querySelectorAll("[data-toolbar-menu-open], [data-toolbar-menu-owner]").length + (main.matches("[data-toolbar-menu-open], [data-toolbar-menu-owner]") ? 1 : 0) : -1,
          mainEditorSurfaces: main instanceof HTMLElement ? main.querySelectorAll("[data-surface-kind='toolbar-menu']").length : -1,
        };
      })()`,
    );
    const recreateControl = await dispatchVisibleToolbarControl(
      proxy,
      targetId,
      {
        token: nextToken("recreate"),
        selector: "[data-visual-toolbar-lifecycle-recreate]",
        ownerSelector: "[data-visual-toolbar-lifecycle-fixture]",
      },
    );
    await proxy.evaluate(
      targetId,
      `await (async () => {
        const timeoutAt = performance.now() + 10000;
        while (performance.now() < timeoutAt && !document.querySelector("[data-visual-toolbar-lifecycle-editor='2'] [data-adaptive-toolbar]")) {
          await new Promise(requestAnimationFrame);
        }
        if (!document.querySelector("[data-visual-toolbar-lifecycle-editor='2'] [data-adaptive-toolbar]")) throw new Error("Toolbar lifecycle editor did not recreate");
        return true;
      })()`,
    );
    const recreated = await proxy.evaluate<ToolbarLifecycleFacts["recreated"]>(
      targetId,
      `(() => {
        const root = document.querySelector("[data-visual-toolbar-lifecycle-editor='2']");
        const main = document.querySelector("[data-visual-toolbar-main-editor='${mainMarker}']");
        return {
          generation: root?.getAttribute("data-visual-toolbar-lifecycle-editor") ?? null,
          rootOpen: root?.getAttribute("data-toolbar-menu-open") ?? null,
          rootOwner: root?.getAttribute("data-toolbar-menu-owner") ?? null,
          surfaceCount: root instanceof HTMLElement ? root.querySelectorAll("[data-surface-kind='toolbar-menu']").length : -1,
          mainEditorConnected: main instanceof HTMLElement && main.isConnected,
        };
      })()`,
    );
    const removed = await proxy.evaluate<ToolbarLifecycleFacts["removed"]>(
      targetId,
      `await window.__visualRegressionHost.removeToolbarLifecycleFixture()`,
    );
    const helperCount = await proxy.evaluate<number>(
      targetId,
      `document.querySelectorAll("[data-visual-toolbar-lifecycle-fixture], [data-visual-toolbar-coordinate-target], [data-visual-toolbar-coordinate-owner], [data-visual-trusted-coordinate-token], [data-visual-trusted-coordinate-physical], [data-visual-trusted-coordinate-page], [data-visual-trusted-coordinate-editor]").length`,
    );
    lifecycle = {
      opened: lifecycleOpen.facts,
      unmountInput: unmountControl.trusted,
      recreateInput: recreateControl.trusted,
      afterUnmount,
      recreated,
      removed,
      helperCount,
    };
    assertToolbarLifecycleFacts(lifecycle);
  } finally {
    await proxy.evaluate(
      targetId,
      `await (async () => {
        await window.__visualRegressionHost.removeToolbarLifecycleFixture();
        document.querySelector("[data-visual-toolbar-main-editor='${mainMarker}']")?.removeAttribute("data-visual-toolbar-main-editor");
        delete window.__visualToolbarLifecycleContext;
      })()`,
    );
  }

  const finalOpen = await openToolbar(
    mainScope,
    triggerSelector,
    triggerTestId,
  );
  if (finalOpen.ownerIdentity !== ownerIdentity) {
    throw new Error(
      "Toolbar owner identity changed before the retained open capture",
    );
  }
  return {
    openings,
    resetReceipts,
    samples,
    escape,
    afterEscape,
    restoredScreenshot: restoredScreenshot ?? null,
    outside,
    afterOutside,
    lifecycle,
    finalOpen,
  };
};

export const assertBlankShellRoutesToCanvas = async (
  proxy: ChromeProxyPort,
  targetId: string,
) => {
  type RoutingFacts = {
    applicable: boolean;
    reason: string | null;
    point?: { x: number; y: number; sceneX: number; sceneY: number };
    canvas?: boolean;
    neutral: boolean;
    insideOwner?: boolean;
    editorInstanceId?: string;
    targetSelector?: string;
    ownerSelector?: string;
    candidateCount?: number;
    layoutZoneCount?: number;
    blockingLeaves?: string[];
    blockingState?: "active-text-editing";
    editorState?: Record<string, unknown>;
    hit?: {
      tag: string | null;
      className: string | null;
      testId: string | null;
    };
  };
  const token = `blank-routing-${process.pid}-${Date.now()}-${Math.round(
    performance.now(),
  )}`;
  const before = await proxy.evaluate<RoutingFacts>(
    targetId,
    `(() => {
      const fixture = document.querySelector("[data-visual-fixture-root='top-level-recovery']");
      if (fixture) {
        return {
          applicable: false,
          reason: "application-owned recovery excludes editor routing",
          neutral: true,
        };
      }

      const app = window.h?.app;
      const canvas = app?.interactiveCanvas;
      const owner = app?.excalidrawContainerRef?.current ?? canvas?.closest(".excalidraw-container");
      const instanceId = app?.api?.id;
      if (!(canvas instanceof HTMLCanvasElement) || !(owner instanceof HTMLElement) || !instanceId || !owner.contains(canvas)) {
        throw new Error("Canvas routing roots and editor ownership are unavailable");
      }

      const wrappers = [...owner.querySelectorAll("[data-canvas-ui-layout], [data-canvas-ui-row], [data-canvas-ui-zone]")]
        .filter((node) => node instanceof HTMLElement);
      const neutral = wrappers.every((node) =>
        getComputedStyle(node).pointerEvents === "none" && !node.hasAttribute("data-viewport-ui")
      );
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        active.matches(".excalidraw-wysiwyg") &&
        owner.contains(active)
      ) {
        return {
          applicable: false,
          reason: "active text editing excludes destructive canvas routing",
          neutral,
          editorInstanceId: instanceId,
          blockingState: "active-text-editing",
        };
      }
      const canvasRect = canvas.getBoundingClientRect();
      const ownerRect = owner.getBoundingClientRect();
      const left = Math.max(canvasRect.left, ownerRect.left, 0) + 8;
      const top = Math.max(canvasRect.top, ownerRect.top, 0) + 8;
      const right = Math.min(canvasRect.right, ownerRect.right, window.innerWidth) - 8;
      const bottom = Math.min(canvasRect.bottom, ownerRect.bottom, window.innerHeight) - 8;
      const ratios = [0.86, 0.7, 0.54, 0.38, 0.22, 0.94, 0.06];
      const candidates = [];
      for (const yRatio of ratios) {
        for (const xRatio of ratios) {
          candidates.push({
            x: left + (right - left) * xRatio,
            y: top + (bottom - top) * yRatio,
          });
        }
      }
      const interactiveSelector = [
        "button", "a", "input", "select", "textarea",
        "[role='button']", "[role='menu']", "[role='menuitem']", "[role='dialog']",
        "[data-viewport-ui]", "[data-floating-surface]", "[data-large-surface]", ".sidebar"
      ].join(",");
      let selected = null;
      let selectedHit = null;
      let selectedBlockers = [];
      let selectedLayoutZones = [];
      for (const point of candidates) {
        const hit = document.elementFromPoint(point.x, point.y);
        const stack = document.elementsFromPoint(point.x, point.y);
        const blockers = stack.filter((node) =>
          node instanceof HTMLElement &&
          node !== canvas &&
          !node.contains(canvas) &&
          node.matches(interactiveSelector) &&
          getComputedStyle(node).pointerEvents !== "none"
        );
        const state = app.state;
        const sceneX = (point.x - state.offsetLeft) / state.zoom.value - state.scrollX;
        const sceneY = (point.y - state.offsetTop) / state.zoom.value - state.scrollY;
        const sceneHit = app.getElementAtPosition(sceneX, sceneY, { includeLockedElements: true });
        const layoutZones = wrappers.filter((node) => {
          const rect = node.getBoundingClientRect();
          return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
        });
        if (hit === canvas && blockers.length === 0 && !sceneHit) {
          selected = { ...point, sceneX, sceneY };
          selectedHit = hit;
          selectedBlockers = blockers;
          selectedLayoutZones = layoutZones;
          break;
        }
      }
      const state = app.state;
      if (!selected) {
        const center = {
          x: (left + right) / 2,
          y: (top + bottom) / 2,
        };
        selectedHit = document.elementFromPoint(center.x, center.y);
        const isolatingDialog = [...document.querySelectorAll("[role='dialog']")]
          .find((node) => {
            if (!(node instanceof HTMLElement)) return false;
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              selectedHit instanceof Node &&
              node.contains(selectedHit)
            );
          });
        if (isolatingDialog) {
          return {
            applicable: false,
            reason: "modal isolation excludes background editor routing",
            neutral,
            editorInstanceId: instanceId,
            candidateCount: candidates.length,
            hit: {
              tag: selectedHit?.tagName ?? null,
              className: selectedHit instanceof HTMLElement ? selectedHit.className : null,
              testId: selectedHit instanceof HTMLElement ? selectedHit.dataset.testid ?? null : null,
            },
          };
        }
        return {
          applicable: true,
          reason: "no reachable physical blank canvas point inside the owning editor",
          canvas: false,
          neutral,
          insideOwner: false,
          editorInstanceId: instanceId,
          candidateCount: candidates.length,
          layoutZoneCount: 0,
          blockingLeaves: [],
          hit: {
            tag: selectedHit?.tagName ?? null,
            className: selectedHit instanceof HTMLElement ? selectedHit.className : null,
            testId: selectedHit instanceof HTMLElement ? selectedHit.dataset.testid ?? null : null,
          },
        };
      }

      const token = ${JSON.stringify(token)};
      const priorTargetMarker = canvas.getAttribute("data-visual-coordinate-target");
      const priorOwnerMarker = owner.getAttribute("data-visual-coordinate-owner");
      const sceneSnapshot = app.getSceneElementsIncludingDeleted();
      canvas.setAttribute("data-visual-coordinate-target", token);
      owner.setAttribute("data-visual-coordinate-owner", token);
      window.__visualBlankRoutingContext = {
        token,
        app,
        canvas,
        owner,
        priorTargetMarker,
        priorOwnerMarker,
        priorFocus: document.activeElement,
        sceneSnapshot,
        sceneSignature: JSON.stringify(sceneSnapshot),
        stateSnapshot: {
          selectedElementIds: state.selectedElementIds,
          selectedGroupIds: state.selectedGroupIds,
          editingGroupId: state.editingGroupId,
          previousSelectedElementIds: state.previousSelectedElementIds,
          openMenu: state.openMenu,
          openPopup: state.openPopup,
          cursorButton: state.cursorButton,
          lastPointerDownWith: state.lastPointerDownWith,
          newElement: state.newElement,
          multiElement: state.multiElement,
          selectionElement: state.selectionElement,
          resizingElement: state.resizingElement,
          selectedLinearElement: state.selectedLinearElement,
          editingLinearElement: state.editingLinearElement,
        },
      };
      return {
        applicable: true,
        reason: null,
        point: selected,
        canvas: selectedHit === canvas,
        neutral,
        insideOwner:
          selected.x >= ownerRect.left && selected.x <= ownerRect.right &&
          selected.y >= ownerRect.top && selected.y <= ownerRect.bottom,
        editorInstanceId: instanceId,
        targetSelector: "[data-visual-coordinate-target='" + token + "']",
        ownerSelector: "[data-visual-coordinate-owner='" + token + "']",
        candidateCount: candidates.length,
        layoutZoneCount: selectedLayoutZones.length,
        blockingLeaves: selectedBlockers.map((node) => node.tagName),
        hit: {
          tag: selectedHit?.tagName ?? null,
          className: selectedHit instanceof HTMLElement ? selectedHit.className : null,
          testId: selectedHit instanceof HTMLElement ? selectedHit.dataset.testid ?? null : null,
        },
        editorState: {
          selectedElementIds: Object.keys(state.selectedElementIds ?? {}).sort(),
          selectedGroupIds: Object.keys(state.selectedGroupIds ?? {}).sort(),
          openMenu: state.openMenu,
          openPopup: state.openPopup,
          cursorButton: state.cursorButton,
          lastPointerDownWith: state.lastPointerDownWith,
        },
      };
    })()`,
  );
  assertBlankRoutingObservation(before);
  if (!before.applicable) {
    return { ...before, trusted: null, cleanup: null };
  }

  let trusted: TrustedCoordinateEvidence | null = null;
  let cleanup: Record<string, unknown> | null = null;
  try {
    trusted = await dispatchTrustedCoordinateInput(proxy, targetId, {
      token,
      point: before.point!,
      targetSelector: before.targetSelector!,
      ownerSelector: before.ownerSelector!,
      targetMode: "exact",
      editorInstanceId: before.editorInstanceId,
    });
  } finally {
    cleanup = await proxy.evaluate<Record<string, unknown>>(
      targetId,
      `await (async () => {
        const context = window.__visualBlankRoutingContext;
        if (!context || context.token !== ${JSON.stringify(token)}) {
          throw new Error("Blank routing cleanup context is unavailable");
        }
        context.app.updateScene({
          elements: context.sceneSnapshot,
          appState: context.stateSnapshot,
        });
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const restoreFocus = () => {
          if (!context.priorFocus?.isConnected || document.activeElement === context.priorFocus) {
            return;
          }
          context.priorFocus.focus({ preventScroll: true });
          if (document.activeElement !== context.priorFocus) {
            const priorTabIndex = context.priorFocus.getAttribute("tabindex");
            context.priorFocus.setAttribute("tabindex", "-1");
            context.priorFocus.focus({ preventScroll: true });
            if (priorTabIndex == null) {
              context.priorFocus.removeAttribute("tabindex");
            } else {
              context.priorFocus.setAttribute("tabindex", priorTabIndex);
            }
          }
        };
        restoreFocus();
        await new Promise(requestAnimationFrame);
        restoreFocus();
        if (context.priorTargetMarker == null) {
          context.canvas.removeAttribute("data-visual-coordinate-target");
        } else {
          context.canvas.setAttribute("data-visual-coordinate-target", context.priorTargetMarker);
        }
        if (context.priorOwnerMarker == null) {
          context.owner.removeAttribute("data-visual-coordinate-owner");
        } else {
          context.owner.setAttribute("data-visual-coordinate-owner", context.priorOwnerMarker);
        }
        const state = context.app.state;
        const observations = {
          editorInstanceId: context.app.api.id,
          selection:
            JSON.stringify(state.selectedElementIds) === JSON.stringify(context.stateSnapshot.selectedElementIds) &&
            JSON.stringify(state.selectedGroupIds) === JSON.stringify(context.stateSnapshot.selectedGroupIds) &&
            state.editingGroupId === context.stateSnapshot.editingGroupId &&
            JSON.stringify(state.previousSelectedElementIds) === JSON.stringify(context.stateSnapshot.previousSelectedElementIds),
          surfaces:
            state.openMenu === context.stateSnapshot.openMenu &&
            state.openPopup === context.stateSnapshot.openPopup,
          pointerState:
            state.cursorButton === context.stateSnapshot.cursorButton &&
            state.lastPointerDownWith === context.stateSnapshot.lastPointerDownWith,
          scene:
            JSON.stringify(context.app.getSceneElementsIncludingDeleted()) ===
            context.sceneSignature,
          drawingState:
            state.newElement === context.stateSnapshot.newElement &&
            state.multiElement === context.stateSnapshot.multiElement &&
            state.selectionElement === context.stateSnapshot.selectionElement &&
            state.resizingElement === context.stateSnapshot.resizingElement &&
            state.selectedLinearElement === context.stateSnapshot.selectedLinearElement &&
            state.editingLinearElement === context.stateSnapshot.editingLinearElement,
          focus: !context.priorFocus?.isConnected || document.activeElement === context.priorFocus,
          targetMarker: context.canvas.getAttribute("data-visual-coordinate-target") === context.priorTargetMarker,
          ownerMarker: context.owner.getAttribute("data-visual-coordinate-owner") === context.priorOwnerMarker,
        };
        delete window.__visualBlankRoutingContext;
        return {
          ...observations,
          focusDetails: {
            priorTag: context.priorFocus?.tagName ?? null,
            priorId: context.priorFocus?.id ?? null,
            priorConnected: context.priorFocus?.isConnected ?? false,
            activeTag: document.activeElement?.tagName ?? null,
            activeId: document.activeElement?.id ?? null,
          },
          restored: Object.values(observations).every((value) => typeof value === "string" || value === true),
        };
      })()`,
    );
  }
  assertBlankRoutingCleanup(cleanup);
  return { ...before, trusted, cleanup };
};

export const assertBlankRoutingObservation = (facts: {
  applicable: boolean;
  reason: string | null;
  canvas?: boolean;
  neutral: boolean;
  insideOwner?: boolean;
  point?: { x: number; y: number };
  editorInstanceId?: string;
  blockingLeaves?: string[];
  blockingState?: "active-text-editing";
}) => {
  if (!facts.applicable) {
    if (
      facts.reason !== "application-owned recovery excludes editor routing" &&
      facts.reason !== "modal isolation excludes background editor routing" &&
      !(
        facts.reason ===
          "active text editing excludes destructive canvas routing" &&
        facts.blockingState === "active-text-editing"
      )
    ) {
      throw new Error(
        `Unexpected blank-routing exclusion: ${JSON.stringify(facts)}`,
      );
    }
    return;
  }
  if (
    !facts.neutral ||
    !facts.canvas ||
    !facts.point ||
    !facts.insideOwner ||
    !facts.editorInstanceId ||
    (facts.blockingLeaves?.length ?? 0) > 0
  ) {
    throw new Error(
      `Blank shell cannot reach canvas: ${JSON.stringify(facts)}`,
    );
  }
};

export const assertBlankRoutingCleanup = (
  cleanup: Record<string, unknown> | null,
) => {
  if (
    !cleanup ||
    cleanup.restored !== true ||
    cleanup.selection !== true ||
    cleanup.surfaces !== true ||
    cleanup.pointerState !== true ||
    cleanup.scene !== true ||
    cleanup.drawingState !== true ||
    cleanup.focus !== true ||
    cleanup.targetMarker !== true ||
    cleanup.ownerMarker !== true
  ) {
    throw new Error(
      `Blank routing state did not restore exactly: ${JSON.stringify(cleanup)}`,
    );
  }
};
