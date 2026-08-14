import { DEFAULT_SIDEBAR, LIBRARY_SIDEBAR_TAB } from "@excalidraw/common";
import { convertToExcalidrawElements } from "@excalidraw/element";
import { Excalidraw, THEME } from "@excalidraw/excalidraw";
import { createElement, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";

import type {
  ExcalidrawImperativeAPI,
  LibraryItem,
} from "@excalidraw/excalidraw/types";

import {
  hasFloatingSurfaceOwner,
  useFloatingSurfaceOwner,
} from "../packages/excalidraw/components/floatingSurface/owner";

import { captureVisualAppOwner } from "../scripts/visual-regression/appOwner";
import { createApplicationFixtures } from "../scripts/visual-regression/fixtures";

import { appJotaiStore } from "./app-jotai";
import { appLangCodeAtom } from "./app-language/language-state";
import { shareDialogStateAtom } from "./share/ShareDialog";

type HostPrepare = {
  id: string;
  setup: string;
  theme: "light" | "dark";
  direction: "ltr" | "rtl";
  locale: string;
  safeArea: { top: number; right: number; bottom: number; left: number };
  input: {
    pointer: "fine" | "coarse";
    hover: boolean;
    touchPoints: number;
    acceptance: "browser" | "mounted-editor";
  };
  fixedTime: number;
  noMotionCss: string;
};

type HostAssertion = {
  id: string;
  kind: string;
  selector: string;
  expected?: Record<string, unknown>;
};

type ActionInstruction =
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

type RestoreAction = () => void | Promise<void>;

type MultiEditorPhase = "initial" | "updated" | "unmounted" | "restored";
type MultiEditorSide = "left" | "right";
type MultiEditorControlAction = "update" | "unmount" | "recreate";

type ToolbarLifecycleProbe = {
  generation: number;
  mounted: boolean;
  mounts: Array<{ generation: number; editorId: string }>;
  unmounts: Array<{ generation: number; editorId: string | null }>;
  controls: Array<{
    action: "unmount" | "recreate";
    isTrusted: boolean;
    pointerType: string;
  }>;
  currentContainer: HTMLElement | null;
  currentEditorId: string | null;
};

type ToolbarLifecycleFixture = {
  fixture: HTMLElement;
  root: Root;
  probe: ToolbarLifecycleProbe;
};

export type VisualRegressionHost = {
  prepare: (request: HostPrepare) => Promise<Record<string, unknown>>;
  restore: () => Promise<{
    failures: string[];
  }>;
  queryRestoration: () => Promise<Record<string, unknown> | null>;
  isReady: (scenarioId: string) => boolean;
  action: (scenarioId: string, action: string) => Promise<ActionInstruction>;
  assert: (assertion: HostAssertion) => Record<string, unknown>;
  installToolbarLifecycleFixture: () => Promise<Record<string, unknown>>;
  removeToolbarLifecycleFixture: () => Promise<Record<string, unknown>>;
  hasToolbarSurfaceOwner: (identity: string) => boolean;
  readMultiEditorLifecycle: () => Record<string, unknown>;
  initializeMultiEditorLifecycle: () => Promise<Record<string, unknown>>;
};

declare global {
  interface Window {
    __visualRegressionHost?: VisualRegressionHost;
    __visualDebuggerForceUpdate?: () => void;
    __visualBlankCanvasReceipt?: {
      isTrusted: boolean;
      pointerType: string;
      targetIsCanvas: boolean;
    } | null;
    __visualPerf?: {
      cls: number;
      longTasks: number[];
      started: number;
      layoutObserver?: PerformanceObserver;
      longTaskObserver?: PerformanceObserver;
    };
  }
}

const DEBUG_STORAGE_KEY = "excalidraw-debug";
const transientSelectors = [
  ".Toast",
  "[data-toast]",
  "[data-floating-surface]",
  "[data-large-surface-positioner]",
  ".sidebar",
];

const DEBUG_CANVAS_SELECTOR = "canvas[data-visual-debugger-canvas='true']";
const FIXTURE_ROOT_SELECTOR =
  "[data-visual-fixture-root], [data-visual-toolbar-lifecycle-fixture]";

const waitForBoundedReactCommit = async () => {
  for (let frame = 0; frame < 2; frame += 1) {
    await Promise.race([
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
      new Promise<void>((resolve) => setTimeout(resolve, 250)),
    ]);
  }
  await Promise.resolve();
};

const restorationSnapshot = (value: unknown) =>
  JSON.stringify(value, (_key, entry) => {
    if (entry instanceof Map) {
      return { __visualMap: [...entry.entries()] };
    }
    if (entry instanceof Set) {
      return { __visualSet: [...entry.values()] };
    }
    return entry;
  });

const sameNodes = (before: readonly Element[], after: readonly Element[]) =>
  before.length === after.length &&
  before.every((node, index) => after[index] === node);

const waitForEditor = async () => {
  const timeoutAt = performance.now() + 10_000;
  while (performance.now() < timeoutAt) {
    if (window.h?.app && document.querySelector(".excalidraw")) {
      return window.h;
    }
    await new Promise(requestAnimationFrame);
  }
  throw new Error("Editor development hook did not become ready");
};

const waitForLoadingPresentation = async () => {
  const timeoutAt = performance.now() + 2_000;
  while (performance.now() < timeoutAt) {
    const loadingMessage =
      document.querySelector<HTMLElement>(".LoadingMessage");
    const liveRegion = loadingMessage?.querySelector<HTMLElement>(
      "[aria-live], [role='status'], [role='alert']",
    );
    if (loadingMessage && liveRegion) {
      const rect = loadingMessage.getBoundingClientRect();
      const style = getComputedStyle(loadingMessage);
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      ) {
        return;
      }
    }
    await new Promise(requestAnimationFrame);
  }
  throw new Error("Loading presentation did not become semantically ready");
};

const createScene = (setup: string, fixedTime: number) => {
  if (setup === "welcome") {
    return [];
  }
  if (setup === "selected-rectangle") {
    return convertToExcalidrawElements(
      [
        {
          type: "rectangle",
          id: "visual-rectangle-01",
          seed: 10101,
          version: 3,
          versionNonce: 11001,
          x: 360,
          y: 220,
          width: 320,
          height: 210,
          backgroundColor: "#d0bfff",
          strokeColor: "#6741d9",
        },
      ],
      { regenerateIds: false },
    );
  }
  if (setup === "selected-text" || setup === "active-text-editing") {
    return convertToExcalidrawElements(
      [
        {
          type: "text",
          id: "visual-text-01",
          seed: 20202,
          version: 4,
          versionNonce: 22002,
          x: 350,
          y: 260,
          text: "A deterministic editing state",
          originalText: "A deterministic editing state",
          fontSize: 28,
          fontFamily: 1,
          textAlign: "left",
          verticalAlign: "top",
        },
      ],
      { regenerateIds: false },
    );
  }
  return [];
};

const createLibraryFixture = (fixedTime: number): LibraryItem[] => {
  const source = createApplicationFixtures().library;
  const elements = createScene(source.scene, fixedTime);
  return [
    {
      id: source.id,
      status: source.status,
      created: source.created,
      name: source.name,
      elements,
    },
  ];
};

type MultiEditorAssociationRef = {
  controlsId: string;
  trigger: HTMLElement;
  surface: HTMLElement | null;
};

type MultiEditorSlot = {
  side: MultiEditorSide;
  generation: number;
  currentRoot: HTMLElement | null;
  currentApi: ExcalidrawImperativeAPI | null;
  mounts: Array<{
    generation: number;
    rootIdentity: string;
    apiIdentity: string;
  }>;
  unmounts: Array<{ generation: number; rootIdentity: string | null }>;
};

type MultiEditorInitialRefs = {
  documentDirection: string | null;
  left: {
    root: HTMLElement;
    api: ExcalidrawImperativeAPI;
    associations: MultiEditorAssociationRef[];
    focusOwner: HTMLElement;
    primarySurface: HTMLElement;
    ownerIdentity: string;
  };
  right: {
    root: HTMLElement;
    api: ExcalidrawImperativeAPI;
    associations: MultiEditorAssociationRef[];
    primarySurface: HTMLElement;
    ownerIdentity: string;
  };
};

type MultiEditorRenderedSceneFacts = {
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
};

const createMultiEditorProbe = (fixture: HTMLElement) => {
  const originalDocumentDirection =
    document.documentElement.getAttribute("dir");
  const originalDocumentLanguage =
    document.documentElement.getAttribute("lang");
  const slots: Record<MultiEditorSide, MultiEditorSlot> = {
    left: {
      side: "left",
      generation: 1,
      currentRoot: null,
      currentApi: null,
      mounts: [],
      unmounts: [],
    },
    right: {
      side: "right",
      generation: 1,
      currentRoot: null,
      currentApi: null,
      mounts: [],
      unmounts: [],
    },
  };
  const objectIdentities = new WeakMap<object, string>();
  const pendingPointers = new Map<
    MultiEditorControlAction,
    {
      isTrusted: boolean;
      pointerType: string;
      clientX: number;
      clientY: number;
      targetOwned: boolean;
    }
  >();
  const controls: Array<{
    action: MultiEditorControlAction;
    pointerTrusted: boolean;
    clickTrusted: boolean;
    pointerType: string;
    clientX: number;
    clientY: number;
    targetOwned: boolean;
  }> = [];
  let identitySequence = 0;
  let phase: MultiEditorPhase = "initial";
  let initialRefs: MultiEditorInitialRefs | null = null;
  let initialFacts: Record<string, unknown> | null = null;
  let expectedUpdatedRight: Record<string, unknown> | null = null;

  const identityFor = (value: object | null, prefix: string) => {
    if (!value) {
      return null;
    }
    let identity = objectIdentities.get(value);
    if (!identity) {
      identity = `${prefix}-${++identitySequence}`;
      objectIdentities.set(value, identity);
    }
    return identity;
  };

  const rectOf = (node: HTMLElement) => {
    const rect = node.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    };
  };

  const sceneFacts = (api: ExcalidrawImperativeAPI) => {
    const elements = api.getSceneElementsIncludingDeleted();
    const activeElements = api.getSceneElements();
    return {
      elementCount: elements.length,
      activeElementCount: activeElements.length,
      elementIds: activeElements.map((element) => element.id).sort(),
      elementTypes: activeElements.map((element) => element.type).sort(),
    };
  };

  const renderedSceneFacts = (
    root: HTMLElement,
    api: ExcalidrawImperativeAPI,
    elementId: string,
  ): MultiEditorRenderedSceneFacts => {
    const canvas = root.querySelector<HTMLCanvasElement>(
      ".excalidraw__canvas.static",
    );
    const element = api
      .getSceneElements()
      .find((candidate) => candidate.id === elementId);
    const empty = {
      canvasConnected: canvas?.isConnected === true,
      canvasWidth: canvas?.width ?? 0,
      canvasHeight: canvas?.height ?? 0,
      elementId: element?.id ?? null,
      sampleRegion: null,
      sampledPixels: 0,
      matchingPixels: 0,
      matchingRatio: 0,
      pixelSignature: null,
      paintPresent: false,
    };
    if (!canvas || !element || element.type !== "rectangle") {
      return empty;
    }
    const context = canvas.getContext("2d");
    const canvasRect = canvas.getBoundingClientRect();
    const appState = api.getAppState();
    const zoom = appState.zoom.value;
    if (
      !context ||
      canvasRect.width <= 0 ||
      canvasRect.height <= 0 ||
      canvas.width <= 0 ||
      canvas.height <= 0 ||
      zoom <= 0
    ) {
      return empty;
    }

    const canvasLeft =
      (element.x + element.width * 0.2 + appState.scrollX) * zoom;
    const canvasTop =
      (element.y + element.height * 0.2 + appState.scrollY) * zoom;
    const canvasRight =
      (element.x + element.width * 0.8 + appState.scrollX) * zoom;
    const canvasBottom =
      (element.y + element.height * 0.8 + appState.scrollY) * zoom;
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const x = Math.max(
      0,
      Math.min(canvas.width - 1, Math.floor(canvasLeft * scaleX)),
    );
    const y = Math.max(
      0,
      Math.min(canvas.height - 1, Math.floor(canvasTop * scaleY)),
    );
    const right = Math.max(
      x + 1,
      Math.min(canvas.width, Math.ceil(canvasRight * scaleX)),
    );
    const bottom = Math.max(
      y + 1,
      Math.min(canvas.height, Math.ceil(canvasBottom * scaleY)),
    );
    const width = right - x;
    const height = bottom - y;
    if (width <= 0 || height <= 0) {
      return empty;
    }

    const image = context.getImageData(x, y, width, height);
    const expected = element.backgroundColor.match(
      /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i,
    );
    if (!expected) {
      return { ...empty, sampleRegion: { x, y, width, height } };
    }
    const expectedColor = expected
      .slice(1)
      .map((value) => Number.parseInt(value, 16));
    const stride = Math.max(1, Math.floor(Math.min(width, height) / 48));
    let sampledPixels = 0;
    let matchingPixels = 0;
    let hash = 2166136261;
    for (let sampleY = 0; sampleY < height; sampleY += stride) {
      for (let sampleX = 0; sampleX < width; sampleX += stride) {
        const offset = (sampleY * width + sampleX) * 4;
        const red = image.data[offset];
        const green = image.data[offset + 1];
        const blue = image.data[offset + 2];
        const alpha = image.data[offset + 3];
        sampledPixels += 1;
        if (
          alpha > 0 &&
          Math.abs(red - expectedColor[0]) <= 20 &&
          Math.abs(green - expectedColor[1]) <= 20 &&
          Math.abs(blue - expectedColor[2]) <= 20
        ) {
          matchingPixels += 1;
        }
        for (const value of [red, green, blue, alpha]) {
          hash ^= value;
          hash = Math.imul(hash, 16777619);
        }
      }
    }
    const matchingRatio =
      sampledPixels > 0 ? matchingPixels / sampledPixels : 0;
    return {
      canvasConnected: canvas.isConnected,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      elementId: element.id,
      sampleRegion: { x, y, width, height },
      sampledPixels,
      matchingPixels,
      matchingRatio,
      pixelSignature: (hash >>> 0).toString(16).padStart(8, "0"),
      paintPresent: sampledPixels >= 16 && matchingRatio >= 0.2,
    };
  };

  const expectedSceneMounted = (
    api: ExcalidrawImperativeAPI,
    id: string,
    type: string,
  ) => {
    const scene = sceneFacts(api);
    return (
      scene.elementCount === 1 &&
      scene.activeElementCount === 1 &&
      scene.elementIds[0] === id &&
      scene.elementTypes[0] === type
    );
  };

  const restoreDocumentState = () => {
    if (originalDocumentDirection == null) {
      document.documentElement.removeAttribute("dir");
    } else {
      document.documentElement.setAttribute("dir", originalDocumentDirection);
    }
    if (originalDocumentLanguage == null) {
      document.documentElement.removeAttribute("lang");
    } else {
      document.documentElement.setAttribute("lang", originalDocumentLanguage);
    }
  };

  const collectAssociations = (root: HTMLElement) =>
    [
      ...(
        root.closest<HTMLElement>("[data-visual-editor]") ?? root
      ).querySelectorAll<HTMLElement>(
        "[data-visual-multi-association][aria-controls]",
      ),
    ]
      .map((trigger) => {
        const controlsId = trigger.getAttribute("aria-controls")?.trim() ?? "";
        return controlsId
          ? {
              controlsId,
              trigger,
              surface: document.getElementById(controlsId),
            }
          : null;
      })
      .filter((entry): entry is MultiEditorAssociationRef => entry !== null)
      .sort((left, right) => left.controlsId.localeCompare(right.controlsId));

  const primaryAssociation = (associations: MultiEditorAssociationRef[]) =>
    associations.find(({ surface }) => surface?.isConnected) ?? null;

  const instanceFacts = (side: MultiEditorSide) => {
    const slot = slots[side];
    const root = slot.currentRoot;
    const api = slot.currentApi;
    if (!root || !api) {
      return null;
    }
    const associations = collectAssociations(root);
    const primary = primaryAssociation(associations);
    const rect = rectOf(root);
    const fixtureRect = rectOf(fixture);
    const initial = initialRefs?.[side] ?? null;
    const focusOwner =
      side === "left" ? initialRefs?.left.focusOwner ?? primary?.trigger : null;
    const ownerIdentity =
      primary?.trigger.dataset.visualMultiOwnerIdentity ?? "";
    const profile = {
      tier: root.dataset.responsiveTier ?? null,
      adapter: root.dataset.responsiveAdapter ?? null,
      orientation: root.dataset.responsiveOrientation ?? null,
      blockSize: root.dataset.responsiveBlockSize ?? null,
      density: root.dataset.responsiveDensity ?? null,
      presentation: root.dataset.responsivePresentation ?? null,
      signature: root.dataset.responsiveSignature ?? null,
    };
    return {
      generation: slot.generation,
      rootIdentity: identityFor(root, `${side}-root`),
      apiIdentity: identityFor(api, `${side}-api`),
      apiId: api.id,
      apiDestroyed: api.isDestroyed,
      appOpenMenu: api.getAppState().openMenu,
      sameInitialRoot: initial ? root === initial.root : true,
      sameInitialApi: initial ? api === initial.api : true,
      theme: root.classList.contains("theme--dark") ? "dark" : "light",
      direction: root.dir,
      profile,
      scene: sceneFacts(api),
      renderedScene:
        side === "left"
          ? renderedSceneFacts(root, api, "visual-rectangle-01")
          : null,
      rect,
      withinFixture:
        rect.width > 0 &&
        rect.height > 0 &&
        rect.x >= fixtureRect.x - 1 &&
        rect.y >= fixtureRect.y - 1 &&
        rect.right <= fixtureRect.right + 1 &&
        rect.bottom <= fixtureRect.bottom + 1,
      focus: {
        ownerIdentity: identityFor(focusOwner ?? null, `${side}-focus-owner`),
        sameInitialOwner:
          side !== "left" || !initialRefs
            ? true
            : focusOwner === initialRefs.left.focusOwner,
        ownerConnected: focusOwner?.isConnected ?? false,
        active: document.activeElement === focusOwner,
        ariaControls: focusOwner?.getAttribute("aria-controls") ?? null,
        surfaceConnected:
          !!focusOwner?.getAttribute("aria-controls") &&
          document.getElementById(focusOwner.getAttribute("aria-controls")!)
            ?.isConnected === true,
      },
      primaryAssociation: primary
        ? {
            triggerIdentity: identityFor(
              primary.trigger,
              `${side}-association-trigger`,
            ),
            surfaceIdentity: identityFor(
              primary.surface,
              `${side}-association-surface`,
            ),
            controlsId: primary.controlsId,
            triggerConnected: primary.trigger.isConnected,
            surfaceConnected:
              primary.surface?.isConnected === true &&
              document.getElementById(primary.controlsId) === primary.surface,
            triggerExpanded: primary.trigger.getAttribute("aria-expanded"),
            surfaceDirection: primary.surface
              ? getComputedStyle(primary.surface).direction
              : null,
            ownerIdentity,
            ownerClaimed: hasFloatingSurfaceOwner(
              "multi-editor-fixture",
              ownerIdentity,
            ),
            sameInitialTrigger:
              !!initial &&
              primary.trigger ===
                initial.associations.find(
                  (association) =>
                    association.trigger ===
                    (side === "left"
                      ? initialRefs?.left.focusOwner
                      : initial.associations.find(({ surface }) => surface)
                          ?.trigger),
                )?.trigger,
            sameInitialSurface:
              !!initial &&
              primary.surface ===
                (side === "left"
                  ? initialRefs?.left.primarySurface
                  : initialRefs?.right.primarySurface),
          }
        : null,
      associations: associations.map(({ controlsId, trigger, surface }) => ({
        controlsId,
        triggerIdentity: identityFor(trigger, `${side}-association-trigger`),
        surfaceIdentity: identityFor(surface, `${side}-association-surface`),
        triggerConnected: trigger.isConnected,
        surfaceConnected:
          surface?.isConnected === true &&
          document.getElementById(controlsId) === surface,
      })),
      toolbarOwner: root.getAttribute("data-toolbar-menu-owner"),
    };
  };

  const detachedRightFacts = () => {
    if (!initialRefs) {
      return null;
    }
    const { right } = initialRefs;
    return {
      rootConnected: right.root.isConnected,
      apiDestroyed: right.api.isDestroyed,
      apiStillCurrent: slots.right.currentApi === right.api,
      connectedControls: right.associations.filter(
        ({ trigger }) => trigger.isConnected,
      ).length,
      connectedSurfaces: right.associations.filter(
        ({ surface }) => surface?.isConnected,
      ).length,
      presentControlIds: right.associations.filter(
        ({ controlsId, surface }) =>
          surface && document.getElementById(controlsId) === surface,
      ).length,
      ownerClaimed: hasFloatingSurfaceOwner(
        "multi-editor-fixture",
        right.ownerIdentity,
      ),
      portalResidue: right.associations.filter(
        ({ controlsId, surface }) =>
          surface?.isConnected ||
          document.getElementById(controlsId) === surface,
      ).length,
    };
  };

  const read = () => ({
    phase,
    editorCount: [slots.left.currentRoot, slots.right.currentRoot].filter(
      (root) => root?.isConnected,
    ).length,
    documentDirection: document.documentElement.getAttribute("dir"),
    fixtureRect: rectOf(fixture),
    initialRecorded: initialRefs !== null,
    initial: initialFacts,
    expectedUpdatedRight,
    left: instanceFacts("left"),
    right: instanceFacts("right"),
    detachedRight: detachedRightFacts(),
    controls: [...controls],
    mounts: {
      left: [...slots.left.mounts],
      right: [...slots.right.mounts],
    },
    unmounts: {
      left: [...slots.left.unmounts],
      right: [...slots.right.unmounts],
    },
    staleMarkerCount: document.querySelectorAll(
      "[data-visual-multi-helper], [data-visual-coordinate-click-rail]",
    ).length,
  });

  const initialize = async () => {
    const timeoutAt = performance.now() + 5_000;
    let leftRenderRefreshes = 0;
    while (performance.now() < timeoutAt) {
      await Promise.resolve();
      await new Promise(requestAnimationFrame);
      const left = slots.left;
      const right = slots.right;
      if (
        left.currentRoot &&
        left.currentApi &&
        right.currentRoot &&
        right.currentApi &&
        expectedSceneMounted(
          left.currentApi,
          "visual-rectangle-01",
          "rectangle",
        ) &&
        expectedSceneMounted(right.currentApi, "visual-text-01", "text")
      ) {
        const leftRendered = renderedSceneFacts(
          left.currentRoot,
          left.currentApi,
          "visual-rectangle-01",
        );
        if (!leftRendered.paintPresent) {
          if (leftRenderRefreshes < 3) {
            leftRenderRefreshes += 1;
            left.currentApi.updateScene({
              elements: [...left.currentApi.getSceneElementsIncludingDeleted()],
            });
          }
          continue;
        }
        const leftAssociations = collectAssociations(left.currentRoot);
        const rightAssociations = collectAssociations(right.currentRoot);
        const leftPrimary = primaryAssociation(leftAssociations);
        const rightPrimary = primaryAssociation(rightAssociations);
        const leftOwnerIdentity =
          leftPrimary?.trigger.dataset.visualMultiOwnerIdentity ?? "";
        const rightOwnerIdentity =
          rightPrimary?.trigger.dataset.visualMultiOwnerIdentity ?? "";
        if (
          leftPrimary?.surface &&
          rightPrimary?.surface &&
          hasFloatingSurfaceOwner("multi-editor-fixture", leftOwnerIdentity) &&
          hasFloatingSurfaceOwner("multi-editor-fixture", rightOwnerIdentity)
        ) {
          leftPrimary.trigger.focus();
          restoreDocumentState();
          await waitForBoundedReactCommit();
          if (document.activeElement !== leftPrimary.trigger) {
            continue;
          }
          initialRefs = {
            documentDirection: document.documentElement.getAttribute("dir"),
            left: {
              root: left.currentRoot,
              api: left.currentApi,
              associations: leftAssociations,
              focusOwner: leftPrimary.trigger,
              primarySurface: leftPrimary.surface,
              ownerIdentity: leftOwnerIdentity,
            },
            right: {
              root: right.currentRoot,
              api: right.currentApi,
              associations: rightAssociations,
              primarySurface: rightPrimary.surface,
              ownerIdentity: rightOwnerIdentity,
            },
          };
          const leftFacts = instanceFacts("left")!;
          const rightFacts = instanceFacts("right")!;
          initialFacts = JSON.parse(
            JSON.stringify({
              documentDirection: initialRefs.documentDirection,
              left: leftFacts,
              right: rightFacts,
            }),
          );
          const signature = JSON.parse(
            String(rightFacts.profile.signature),
          ) as unknown[];
          signature[1] = "phone";
          signature[2] = "phone";
          signature[5] = "touch";
          signature[6] = "mobile";
          signature[7] = "ltr";
          signature[13] = signature[9];
          signature[14] = signature[10];
          signature[15] = signature[11];
          signature[16] = signature[12];
          expectedUpdatedRight = {
            theme: "light",
            direction: "ltr",
            profile: {
              tier: "phone",
              adapter: "phone",
              orientation: rightFacts.profile.orientation,
              blockSize: rightFacts.profile.blockSize,
              density: "touch",
              presentation: "mobile",
              signature: JSON.stringify(signature),
            },
          };
          return read();
        }
      }
    }
    throw new Error(
      `Multi-editor fixture did not record both initial owners: ${JSON.stringify(
        read(),
      )}`,
    );
  };

  return {
    read,
    initialize,
    setPhase(next: MultiEditorPhase) {
      phase = next;
    },
    registerMount(
      side: MultiEditorSide,
      generation: number,
      api: ExcalidrawImperativeAPI,
      root: HTMLElement | null,
    ) {
      if (!root) {
        return;
      }
      const slot = slots[side];
      slot.generation = generation;
      slot.currentRoot = root;
      slot.currentApi = api;
      slot.mounts.push({
        generation,
        rootIdentity: identityFor(root, `${side}-root`)!,
        apiIdentity: identityFor(api, `${side}-api`)!,
      });
    },
    registerApi(
      side: MultiEditorSide,
      generation: number,
      api: ExcalidrawImperativeAPI | null,
    ) {
      const slot = slots[side];
      if (api) {
        slot.generation = generation;
        slot.currentApi = api;
      } else if (slot.generation === generation) {
        slot.currentApi = null;
      }
    },
    registerUnmount(side: MultiEditorSide, generation: number) {
      const slot = slots[side];
      slot.unmounts.push({
        generation,
        rootIdentity: identityFor(slot.currentRoot, `${side}-root`),
      });
      if (slot.generation === generation) {
        slot.currentRoot = null;
        slot.currentApi = null;
      }
    },
    recordPointer(
      action: MultiEditorControlAction,
      event: {
        isTrusted: boolean;
        pointerType: string;
        clientX: number;
        clientY: number;
        currentTarget: EventTarget | null;
        target: EventTarget | null;
      },
    ) {
      pendingPointers.set(action, {
        isTrusted: event.isTrusted,
        pointerType: event.pointerType,
        clientX: event.clientX,
        clientY: event.clientY,
        targetOwned:
          event.currentTarget instanceof Node &&
          event.target instanceof Node &&
          (event.currentTarget === event.target ||
            event.currentTarget.contains(event.target)),
      });
    },
    recordClick(
      action: MultiEditorControlAction,
      event: {
        isTrusted: boolean;
        clientX: number;
        clientY: number;
        currentTarget: EventTarget | null;
        target: EventTarget | null;
      },
    ) {
      const pointer = pendingPointers.get(action);
      pendingPointers.delete(action);
      controls.push({
        action,
        pointerTrusted: pointer?.isTrusted === true,
        clickTrusted: event.isTrusted,
        pointerType: pointer?.pointerType ?? "",
        clientX: event.clientX,
        clientY: event.clientY,
        targetOwned:
          pointer?.targetOwned === true &&
          event.currentTarget instanceof Node &&
          event.target instanceof Node &&
          (event.currentTarget === event.target ||
            event.currentTarget.contains(event.target)),
      });
    },
    restoreFocus() {
      restoreDocumentState();
      initialRefs?.left.focusOwner.focus();
    },
    dispose() {
      restoreDocumentState();
    },
  };
};

const installRecoveryFixture = (
  kind: "top-level-recovery" | "multi-editor",
  recovery = createApplicationFixtures().topLevelRecovery,
) => {
  const fixture = document.createElement("div");
  fixture.dataset.visualFixtureRoot = kind;
  fixture.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:var(--color-surface-low,#fff);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box";
  document.body.append(fixture);
  if (kind === "top-level-recovery") {
    fixture.innerHTML = `<main role="main" aria-labelledby="visual-recovery-heading" style="max-width:420px;padding:32px;border:1px solid #d9d9e3;border-radius:16px;background:#fff;color:#1b1b1f;box-shadow:0 18px 48px rgba(0,0,0,.12)"><h1 id="visual-recovery-heading" style="margin:0 0 12px;color:#1b1b1f">${recovery.title}</h1><p style="margin:0 0 24px;color:#5f5f6f">Your local drawing remains available. Reopen the editor to continue.</p><a data-visual-focus-predecessor href="#recovery-details" style="display:inline-flex;align-items:center;min-height:44px;margin-right:12px;color:#5f5f6f">Review details</a><button data-visual-primary-action type="button" style="min-width:112px;min-height:44px;border:0;border-radius:10px;background:#6965db;color:#fff">${recovery.action}</button></main>`;
    return { fixture, root: null as Root | null };
  }
  fixture.style.gap = "24px";
  fixture.style.alignItems = "stretch";
  fixture.style.padding = "68px 24px 24px";
  const root = createRoot(fixture);
  const multiProbe = createMultiEditorProbe(fixture);
  const MultiEditorOwnedSurface = ({
    side,
    generation,
    direction,
  }: {
    side: MultiEditorSide;
    generation: number;
    direction: "ltr" | "rtl";
  }) => {
    const controlsId = `visual-multi-${side}-${generation}-surface`;
    const ownerIdentity = `visual-multi-${side}-${generation}-owner`;
    useFloatingSurfaceOwner({
      scope: "multi-editor-fixture",
      identity: ownerIdentity,
      open: true,
      onOpenChange: () => {},
    });
    return createElement(
      "div",
      { style: { display: "contents" } },
      createElement(
        "button",
        {
          type: "button",
          "aria-controls": controlsId,
          "aria-expanded": true,
          "data-visual-multi-association": side,
          "data-visual-multi-owner-identity": ownerIdentity,
          style: {
            position: "absolute",
            inset: "8px 8px auto auto",
            zIndex: 3,
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "1px solid #6965db",
            background: "#fff",
            color: "#1b1b1f",
          },
        },
        side === "left" ? "L" : "R",
      ),
      createPortal(
        createElement(
          "aside",
          {
            id: controlsId,
            dir: direction,
            "data-floating-surface": true,
            "data-visual-multi-owned-surface": side,
            "data-visual-multi-owner-identity": ownerIdentity,
            style: {
              position: "absolute",
              inset:
                side === "left" ? "auto auto 10px 10px" : "auto 10px 10px auto",
              zIndex: 10002,
              width: 24,
              height: 24,
              border: "1px solid #6965db",
              borderRadius: 6,
              background: side === "left" ? "#fff" : "#121212",
            },
          },
          createElement("span", { hidden: true }, `${side} owned surface`),
        ),
        fixture,
      ),
    );
  };
  const MultiEditorFixture = () => {
    const [phase, setPhase] = useState<MultiEditorPhase>("initial");
    const [rightGeneration, setRightGeneration] = useState(1);
    multiProbe.setPhase(phase);
    useEffect(() => {
      if (phase === "initial") {
        return;
      }
      let cancelled = false;
      let remainingFrames = 8;
      const restoreAfterCommit = () => {
        if (cancelled) {
          return;
        }
        multiProbe.restoreFocus();
        remainingFrames -= 1;
        if (remainingFrames > 0) {
          requestAnimationFrame(restoreAfterCommit);
        }
      };
      const firstFrame = requestAnimationFrame(restoreAfterCommit);
      return () => {
        cancelled = true;
        cancelAnimationFrame(firstFrame);
      };
    }, [phase, rightGeneration]);
    const recordControl = (
      action: MultiEditorControlAction,
      event: {
        isTrusted: boolean;
        clientX: number;
        clientY: number;
        currentTarget: EventTarget | null;
        target: EventTarget | null;
      },
    ) => multiProbe.recordClick(action, event);
    const recordPointer = (
      action: MultiEditorControlAction,
      event: {
        isTrusted: boolean;
        pointerType: string;
        clientX: number;
        clientY: number;
        currentTarget: EventTarget | null;
        target: EventTarget | null;
      },
    ) => multiProbe.recordPointer(action, event);
    const right =
      phase === "unmounted"
        ? createElement("section", {
            "aria-hidden": true,
            "data-visual-editor-placeholder": "right",
            style: { width: 360, minWidth: 0 },
          })
        : createElement(
            "section",
            {
              key: rightGeneration,
              "data-visual-editor": "right",
              style: { width: 360, minWidth: 0, position: "relative" },
            },
            createElement(Excalidraw, {
              theme: phase === "updated" ? THEME.LIGHT : THEME.DARK,
              langCode: phase === "updated" ? "en" : "ar-SA",
              UIOptions: {
                getFormFactor: () => (phase === "updated" ? "phone" : "tablet"),
              },
              initialData: {
                elements: createScene("selected-text", 1_725_000_000_000),
                appState: { showWelcomeScreen: false },
              },
              onMount: ({ excalidrawAPI, container }) =>
                multiProbe.registerMount(
                  "right",
                  rightGeneration,
                  excalidrawAPI,
                  container,
                ),
              onExcalidrawAPI: (api) =>
                multiProbe.registerApi("right", rightGeneration, api),
              onUnmount: () =>
                multiProbe.registerUnmount("right", rightGeneration),
            }),
            createElement(MultiEditorOwnedSurface, {
              side: "right",
              generation: rightGeneration,
              direction: phase === "updated" ? "ltr" : "rtl",
            }),
          );
    return createElement(
      "div",
      {
        style: { display: "contents" },
        "data-visual-multi-phase": phase,
      },
      createElement(
        "section",
        {
          "data-visual-editor": "left",
          style: { flex: 1, minWidth: 0, position: "relative" },
        },
        createElement(Excalidraw, {
          theme: THEME.LIGHT,
          langCode: "en",
          UIOptions: { getFormFactor: () => "desktop" as const },
          initialData: {
            elements: createScene("selected-rectangle", 1_725_000_000_000),
            appState: { showWelcomeScreen: false },
          },
          onMount: ({ excalidrawAPI, container }) =>
            multiProbe.registerMount("left", 1, excalidrawAPI, container),
          onExcalidrawAPI: (api) => multiProbe.registerApi("left", 1, api),
          onUnmount: () => multiProbe.registerUnmount("left", 1),
        }),
        createElement(MultiEditorOwnedSurface, {
          side: "left",
          generation: 1,
          direction: "ltr",
        }),
      ),
      right,
      createElement(
        "nav",
        {
          "aria-label": "Multi-editor lifecycle controls",
          style: {
            position: "absolute",
            inset: "12px auto auto 50%",
            transform: "translateX(-50%)",
            zIndex: 10001,
            display: "flex",
            gap: 8,
            padding: 6,
            border: "1px solid #6965db",
            borderRadius: 10,
            background: "#ffffff",
            boxShadow: "0 4px 16px rgba(0,0,0,.18)",
          },
        },
        createElement(
          "button",
          {
            type: "button",
            disabled: phase !== "initial",
            "data-visual-multi-update": true,
            onPointerDown: (event) => recordPointer("update", event),
            onClick: (event) => {
              recordControl("update", event);
              if (phase === "initial") {
                setPhase("updated");
              }
            },
          },
          "Update right editor",
        ),
        createElement(
          "button",
          {
            type: "button",
            disabled: phase !== "updated",
            "data-visual-multi-unmount": true,
            onPointerDown: (event) => recordPointer("unmount", event),
            onClick: (event) => {
              recordControl("unmount", event);
              if (phase === "updated") {
                setPhase("unmounted");
              }
            },
          },
          "Unmount right editor",
        ),
        createElement(
          "button",
          {
            type: "button",
            disabled: phase !== "unmounted",
            "data-visual-multi-recreate": true,
            onPointerDown: (event) => recordPointer("recreate", event),
            onClick: (event) => {
              recordControl("recreate", event);
              if (phase === "unmounted") {
                setRightGeneration((generation) => generation + 1);
                setPhase("restored");
              }
            },
          },
          "Recreate right editor",
        ),
      ),
    );
  };
  root.render(createElement(MultiEditorFixture));
  return { fixture, root, multiProbe };
};

const createToolbarLifecycleFixture = (): ToolbarLifecycleFixture => {
  const fixture = document.createElement("section");
  fixture.dataset.visualToolbarLifecycleFixture = "true";
  fixture.style.cssText =
    "position:fixed;inset:4px 4px 4px auto;width:396px;z-index:10000;background:#121212;border:1px solid #6965db;border-radius:12px;overflow:hidden;box-sizing:border-box";
  document.body.append(fixture);
  const root = createRoot(fixture);
  const probe: ToolbarLifecycleProbe = {
    generation: 1,
    mounted: true,
    mounts: [],
    unmounts: [],
    controls: [],
    currentContainer: null,
    currentEditorId: null,
  };

  const ToolbarLifecycleHarness = () => {
    const [mounted, setMounted] = useState(true);
    const [generation, setGeneration] = useState(1);
    probe.generation = generation;
    probe.mounted = mounted;
    const recordControl = (
      action: "unmount" | "recreate",
      event: { isTrusted: boolean; pointerType: string },
    ) => {
      probe.controls.push({
        action,
        isTrusted: event.isTrusted,
        pointerType: event.pointerType,
      });
    };
    return createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateRows: "52px minmax(0, 1fr)",
          width: "100%",
          height: "100%",
        },
      },
      createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            position: "relative",
            zIndex: 2,
            background: "#232329",
          },
        },
        createElement(
          "button",
          {
            type: "button",
            disabled: !mounted,
            "data-visual-toolbar-lifecycle-unmount": true,
            style: { minWidth: 132, minHeight: 44 },
            onPointerDown: (event) => {
              if (event.button !== 0 || !mounted) {
                return;
              }
              recordControl("unmount", event.nativeEvent);
              setMounted(false);
            },
          },
          "Unmount toolbar editor",
        ),
        createElement(
          "button",
          {
            type: "button",
            disabled: mounted,
            "data-visual-toolbar-lifecycle-recreate": true,
            style: { minWidth: 132, minHeight: 44 },
            onPointerDown: (event) => {
              if (event.button !== 0 || mounted) {
                return;
              }
              recordControl("recreate", event.nativeEvent);
              setGeneration((current) => current + 1);
              setMounted(true);
            },
          },
          "Recreate toolbar editor",
        ),
      ),
      createElement(
        "div",
        {
          "data-visual-toolbar-lifecycle-editor-host": true,
          style: { minHeight: 0, position: "relative" },
        },
        mounted
          ? createElement(Excalidraw, {
              key: generation,
              theme: THEME.DARK,
              langCode: "en",
              onMount: ({ excalidrawAPI, container }) => {
                if (!container) {
                  throw new Error("Toolbar lifecycle editor root is absent");
                }
                probe.currentContainer = container;
                probe.currentEditorId = excalidrawAPI.id;
                container.dataset.visualToolbarLifecycleEditor =
                  String(generation);
                probe.mounts.push({
                  generation,
                  editorId: excalidrawAPI.id,
                });
              },
              onUnmount: () => {
                probe.unmounts.push({
                  generation,
                  editorId: probe.currentEditorId,
                });
                probe.currentContainer = null;
                probe.currentEditorId = null;
              },
            })
          : createElement(
              "div",
              {
                role: "status",
                style: {
                  color: "white",
                  display: "grid",
                  placeItems: "center",
                  height: "100%",
                },
              },
              "Toolbar editor unmounted",
            ),
      ),
    );
  };

  root.render(createElement(ToolbarLifecycleHarness));
  return { fixture, root, probe };
};

export const installVisualRegressionHost = () => {
  if (!import.meta.env.DEV || window.__visualRegressionHost) {
    return;
  }

  const restores: RestoreAction[] = [];
  let readyScenario: string | null = null;
  let inspectRestoration: (() => Promise<Record<string, unknown>>) | null =
    null;
  let toolbarLifecycleFixture: ToolbarLifecycleFixture | null = null;
  let multiEditorProbe: ReturnType<typeof createMultiEditorProbe> | null = null;

  const restore = async () => {
    const failures: string[] = [];
    while (restores.length) {
      const action = restores.pop()!;
      try {
        await action();
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    readyScenario = null;
    return { failures };
  };

  const host: VisualRegressionHost = {
    async prepare(request) {
      await restore();
      inspectRestoration = null;
      const devHook = await waitForEditor();
      // Capture mount-owned references before any fixture can rebind window.h.
      const {
        app: mainApp,
        api: mainApi,
        library: mainLibrary,
      } = captureVisualAppOwner(devHook.app);
      const editor = document.querySelector<HTMLElement>(".excalidraw")!;
      const applicationFixtures = createApplicationFixtures();

      const previousFocus = document.activeElement as HTMLElement | null;
      const previousFocusMarker = previousFocus?.dataset.visualRestoreFocus;
      const previousFocusMarkers = [
        ...document.querySelectorAll<HTMLElement>(
          "[data-visual-restore-focus]",
        ),
      ].map((node) => [node, node.dataset.visualRestoreFocus] as const);
      const storageSnapshot = Object.fromEntries(
        Object.keys(localStorage)
          .sort()
          .map((key) => [key, localStorage.getItem(key)]),
      );
      const previousLocale = appJotaiStore.get(appLangCodeAtom);
      const previousInsets = ["--sat", "--sar", "--sab", "--sal"].map(
        (name) => [name, editor.style.getPropertyValue(name)] as const,
      );
      const previousDebug = window.visualDebug;
      const previousDebugData = previousDebug?.data;
      const previousDebugDataSnapshot = restorationSnapshot(
        previousDebugData ?? null,
      );
      const previousDebugCurrentFrame = previousDebug?.currentFrame;
      const previousDebugHadCurrentFrame = previousDebug
        ? Object.prototype.hasOwnProperty.call(previousDebug, "currentFrame")
        : false;
      const previousDebugStorage = localStorage.getItem(DEBUG_STORAGE_KEY);
      const previousControlStyles = [
        ...document.querySelectorAll("style[data-visual-regression-control]"),
      ];
      const previousDebugCanvasCount = document.querySelectorAll(
        DEBUG_CANVAS_SELECTOR,
      ).length;
      const previousAppState = mainApi.getAppState();
      const previousTheme = previousAppState.theme;
      const previousScene = [...mainApi.getSceneElementsIncludingDeleted()];
      const previousLibrary = await mainLibrary.getLatestLibrary();
      const previousShare = appJotaiStore.get(shareDialogStateAtom);
      const previousState = {
        activeTool: previousAppState.activeTool,
        showWelcomeScreen: previousAppState.showWelcomeScreen,
        selectedElementIds: previousAppState.selectedElementIds,
        editingTextElement: previousAppState.editingTextElement,
        openMenu: previousAppState.openMenu,
        openPopup: previousAppState.openPopup,
        openSidebar: previousAppState.openSidebar,
        openDialog: previousAppState.openDialog,
        defaultSidebarDockedPreference:
          previousAppState.defaultSidebarDockedPreference,
        isLoading: previousAppState.isLoading,
        errorMessage: previousAppState.errorMessage,
        collaborators: previousAppState.collaborators,
      };
      const previousSceneSnapshot = restorationSnapshot(previousScene);
      const previousStateSnapshot = restorationSnapshot(previousState);
      const previousLibrarySnapshot = restorationSnapshot(previousLibrary);
      const previousShareSnapshot = restorationSnapshot(previousShare);
      const previousFixtureRoots = [
        ...document.querySelectorAll(FIXTURE_ROOT_SELECTOR),
      ];
      const previousTransientMarkers = [
        ...document.querySelectorAll<HTMLElement>(
          "[data-visual-prior-transient]",
        ),
      ].map((node) => [node, node.dataset.visualPriorTransient] as const);
      const previousDocumentDirection = {
        html: document.documentElement.getAttribute("dir"),
        body: document.body.getAttribute("dir"),
        editor: editor.getAttribute("dir"),
      };
      const previousDocumentLanguage = {
        html: document.documentElement.getAttribute("lang"),
        body: document.body.getAttribute("lang"),
        editor: editor.getAttribute("lang"),
      };
      const previousDateNowDescriptor = Object.getOwnPropertyDescriptor(
        Date,
        "now",
      )!;
      const previousClockSample = Date.now();
      const previousTimeOrigin = performance.timeOrigin;
      const priorTransient = new Map<HTMLElement, string | null>();
      const forceDebuggerCommit = () => {
        mainApp.forceUpdate();
        window.__visualDebuggerForceUpdate?.();
      };

      inspectRestoration = async () => {
        await waitForBoundedReactCommit();
        const currentStorage = Object.fromEntries(
          Object.keys(localStorage)
            .sort()
            .map((key) => [key, localStorage.getItem(key)]),
        );
        const currentInsets = previousInsets.map(([name]) => [
          name,
          editor.style.getPropertyValue(name),
        ]);
        const focusRestored = previousFocus?.isConnected
          ? document.activeElement === previousFocus
          : true;
        const markerRestored = previousFocus
          ? previousFocus.dataset.visualRestoreFocus === previousFocusMarker
          : true;
        const currentTransientMarkers = [
          ...document.querySelectorAll<HTMLElement>(
            "[data-visual-prior-transient]",
          ),
        ];
        const currentFocusMarkers = [
          ...document.querySelectorAll<HTMLElement>(
            "[data-visual-restore-focus]",
          ),
        ];
        const currentDateNowDescriptor = Object.getOwnPropertyDescriptor(
          Date,
          "now",
        );
        const currentLibrary = await mainLibrary.getLatestLibrary();
        const currentDebugCanvasCount = document.querySelectorAll(
          DEBUG_CANVAS_SELECTOR,
        ).length;
        const currentMainAppState = mainApi.getAppState();
        const currentState = {
          activeTool: currentMainAppState.activeTool,
          showWelcomeScreen: currentMainAppState.showWelcomeScreen,
          selectedElementIds: currentMainAppState.selectedElementIds,
          editingTextElement: currentMainAppState.editingTextElement,
          openMenu: currentMainAppState.openMenu,
          openPopup: currentMainAppState.openPopup,
          openSidebar: currentMainAppState.openSidebar,
          openDialog: currentMainAppState.openDialog,
          defaultSidebarDockedPreference:
            currentMainAppState.defaultSidebarDockedPreference,
          isLoading: currentMainAppState.isLoading,
          errorMessage: currentMainAppState.errorMessage,
          collaborators: currentMainAppState.collaborators,
        };
        const currentStateSnapshot = restorationSnapshot(currentState);
        const appStateDifferences = (
          Object.keys(previousState) as Array<keyof typeof previousState>
        ).filter(
          (key) =>
            restorationSnapshot(currentState[key]) !==
            restorationSnapshot(previousState[key]),
        );
        const appStateDetails = Object.fromEntries(
          appStateDifferences.map((key) => [
            key,
            { previous: previousState[key], current: currentState[key] },
          ]),
        );
        const facts = {
          debuggerLive:
            (previousDebug == null && window.visualDebug == null) ||
            window.visualDebug === previousDebug,
          debuggerState:
            previousDebug == null
              ? window.visualDebug == null
              : window.visualDebug === previousDebug &&
                restorationSnapshot(previousDebug.data) ===
                  previousDebugDataSnapshot &&
                Object.prototype.hasOwnProperty.call(
                  previousDebug,
                  "currentFrame",
                ) === previousDebugHadCurrentFrame &&
                previousDebug.currentFrame === previousDebugCurrentFrame,
          debuggerStorage:
            localStorage.getItem(DEBUG_STORAGE_KEY) === previousDebugStorage,
          debuggerCanvas: currentDebugCanvasCount === previousDebugCanvasCount,
          storage:
            JSON.stringify(currentStorage) === JSON.stringify(storageSnapshot),
          locale: appJotaiStore.get(appLangCodeAtom) === previousLocale,
          safeArea:
            JSON.stringify(currentInsets) === JSON.stringify(previousInsets),
          styles: sameNodes(previousControlStyles, [
            ...document.querySelectorAll(
              "style[data-visual-regression-control]",
            ),
          ]),
          focus: focusRestored,
          focusMarker:
            markerRestored &&
            sameNodes(
              previousFocusMarkers.map(([node]) => node),
              currentFocusMarkers,
            ) &&
            previousFocusMarkers.every(
              ([node, value]) => node.dataset.visualRestoreFocus === value,
            ),
          transientMarkers:
            sameNodes(
              previousTransientMarkers.map(([node]) => node),
              currentTransientMarkers,
            ) &&
            previousTransientMarkers.every(
              ([node, value]) => node.dataset.visualPriorTransient === value,
            ),
          clockIdentity:
            currentDateNowDescriptor?.value === previousDateNowDescriptor.value,
          clockState:
            currentDateNowDescriptor?.configurable ===
              previousDateNowDescriptor.configurable &&
            currentDateNowDescriptor?.enumerable ===
              previousDateNowDescriptor.enumerable &&
            currentDateNowDescriptor?.writable ===
              previousDateNowDescriptor.writable &&
            performance.timeOrigin === previousTimeOrigin &&
            Date.now() >= previousClockSample,
          scene:
            restorationSnapshot(mainApi.getSceneElementsIncludingDeleted()) ===
            previousSceneSnapshot,
          theme: currentMainAppState.theme === previousTheme,
          appState: currentStateSnapshot === previousStateSnapshot,
          library:
            restorationSnapshot(currentLibrary) === previousLibrarySnapshot,
          share:
            appJotaiStore.get(shareDialogStateAtom) === previousShare &&
            restorationSnapshot(appJotaiStore.get(shareDialogStateAtom)) ===
              previousShareSnapshot,
          fixtureRoots: sameNodes(previousFixtureRoots, [
            ...document.querySelectorAll(FIXTURE_ROOT_SELECTOR),
          ]),
          documentDirection:
            restorationSnapshot({
              html: document.documentElement.getAttribute("dir"),
              body: document.body.getAttribute("dir"),
              editor: editor.getAttribute("dir"),
            }) === restorationSnapshot(previousDocumentDirection),
          documentLanguage:
            restorationSnapshot({
              html: document.documentElement.getAttribute("lang"),
              body: document.body.getAttribute("lang"),
              editor: editor.getAttribute("lang"),
            }) === restorationSnapshot(previousDocumentLanguage),
        };
        return {
          ...facts,
          focusDetails: {
            previousTag: previousFocus?.tagName ?? null,
            previousId: previousFocus?.id ?? null,
            previousConnected: previousFocus?.isConnected ?? false,
            activeTag: document.activeElement?.tagName ?? null,
            activeId:
              (document.activeElement as HTMLElement | null)?.id ?? null,
          },
          appStateDifferences,
          appStateDetails,
          restored: Object.values(facts).every(Boolean),
        };
      };

      restores.push(async () => {
        const restoreAppState = () => {
          mainApi.updateScene({
            appState: { ...previousState, theme: previousTheme },
          });
          mainApp.setState({ ...previousState, theme: previousTheme });
          mainApp.forceUpdate();
        };
        const restoreFocus = () => {
          if (!previousFocus?.isConnected) {
            return;
          }
          previousFocus.focus({ preventScroll: true });
          if (document.activeElement !== previousFocus) {
            const previousTabIndex = previousFocus.getAttribute("tabindex");
            previousFocus.setAttribute("tabindex", "-1");
            previousFocus.focus({ preventScroll: true });
            if (previousTabIndex == null) {
              previousFocus.removeAttribute("tabindex");
            } else {
              previousFocus.setAttribute("tabindex", previousTabIndex);
            }
          }
        };
        await waitForBoundedReactCommit();
        restoreAppState();
        await waitForBoundedReactCommit();
        restoreAppState();
        await waitForBoundedReactCommit();
        restoreFocus();
        await waitForBoundedReactCommit();
        restoreFocus();
        if (previousFocus?.isConnected) {
          restoreFocus();
        }
        if (previousFocus) {
          if (previousFocusMarker == null) {
            previousFocus.removeAttribute("data-visual-restore-focus");
          } else {
            previousFocus.dataset.visualRestoreFocus = previousFocusMarker;
          }
        }
      });
      previousFocus?.setAttribute("data-visual-restore-focus", "true");

      const restoreStorage = () => {
        localStorage.clear();
        for (const [key, value] of Object.entries(storageSnapshot)) {
          if (value != null) {
            localStorage.setItem(key, value);
          }
        }
      };
      restores.push(async () => {
        restoreStorage();
        await waitForBoundedReactCommit();
        restoreStorage();
      });

      restores.push(async () => {
        if (previousDebug) {
          window.visualDebug = previousDebug;
        } else {
          delete window.visualDebug;
        }
        if (previousDebugStorage == null) {
          localStorage.removeItem(DEBUG_STORAGE_KEY);
        } else {
          localStorage.setItem(DEBUG_STORAGE_KEY, previousDebugStorage);
        }
        forceDebuggerCommit();
        await waitForBoundedReactCommit();
        if (previousDebug) {
          previousDebug.data = previousDebugData ?? [];
          if (previousDebugHadCurrentFrame) {
            previousDebug.currentFrame = previousDebugCurrentFrame;
          } else {
            delete previousDebug.currentFrame;
          }
        }
      });
      delete window.visualDebug;
      localStorage.setItem(
        DEBUG_STORAGE_KEY,
        JSON.stringify({ enabled: false }),
      );
      forceDebuggerCommit();
      await waitForBoundedReactCommit();
      if (document.querySelector(DEBUG_CANVAS_SELECTOR)) {
        throw new Error("Visual debugger canvas remained after disable commit");
      }

      restores.push(() => {
        Object.defineProperty(Date, "now", previousDateNowDescriptor);
      });
      Object.defineProperty(Date, "now", {
        ...previousDateNowDescriptor,
        value: () => request.fixedTime,
      });

      const style = document.createElement("style");
      style.dataset.visualRegressionControl = "true";
      style.textContent = request.noMotionCss;
      restores.push(() => style.remove());
      document.head.append(style);

      restores.push(() => {
        for (const [name, value] of previousInsets) {
          if (value) {
            editor.style.setProperty(name, value);
          } else {
            editor.style.removeProperty(name);
          }
        }
        mainApp.refreshEditorInterface(undefined, false);
        mainApp.forceUpdate();
      });
      editor.style.setProperty("--sat", `${request.safeArea.top}px`);
      editor.style.setProperty("--sar", `${request.safeArea.right}px`);
      editor.style.setProperty("--sab", `${request.safeArea.bottom}px`);
      editor.style.setProperty("--sal", `${request.safeArea.left}px`);

      restores.push(() => appJotaiStore.set(appLangCodeAtom, previousLocale));
      appJotaiStore.set(appLangCodeAtom, request.locale);

      restores.push(() => {
        mainApi.updateScene({
          elements: previousScene,
          appState: { ...previousState, theme: previousTheme },
        });
      });
      restores.push(async () => {
        await mainLibrary.setLibrary(previousLibrary);
      });

      const scene = createScene(request.setup, request.fixedTime);
      const selectedElementIds: Record<string, true> =
        request.setup === "selected-rectangle" ||
        request.setup === "selected-text" ||
        request.setup === "active-text-editing"
          ? Object.fromEntries(
              scene.map((element) => [element.id, true as const]),
            )
          : {};
      mainApi.updateScene({
        elements: scene,
        appState: {
          theme: request.theme === "dark" ? THEME.DARK : THEME.LIGHT,
          activeTool: {
            ...mainApi.getAppState().activeTool,
            type: "selection",
            customType: null,
            lastActiveTool: null,
            locked: false,
          },
          showWelcomeScreen: request.setup === "welcome",
          selectedElementIds,
          editingTextElement: null,
          openMenu: null,
          openPopup: null,
          openSidebar: null,
          openDialog: null,
          defaultSidebarDockedPreference: false,
          isLoading: request.setup === "loading",
          errorMessage:
            request.setup === "recoverable-error"
              ? "Local content could not be prepared. Try again."
              : null,
          collaborators:
            request.setup === "collaboration"
              ? new Map(
                  applicationFixtures.collaboration.map(
                    (collaborator, index) => [
                      collaborator.id,
                      {
                        ...collaborator,
                        socketId: collaborator.id,
                        ...(index === 0 ? { isCurrentUser: true } : {}),
                      },
                    ],
                  ),
                )
              : new Map(),
        },
      });
      mainApp.refreshEditorInterface(undefined, false);
      mainApp.forceUpdate();

      if (request.setup === "library") {
        const libraryFixture = createLibraryFixture(request.fixedTime);
        await mainLibrary.setLibrary(libraryFixture);
        const installedLibrary = await mainLibrary.getLatestLibrary();
        const installed = installedLibrary.find(
          (item) => item.id === libraryFixture[0].id,
        );
        if (
          !installed ||
          installed.name !== libraryFixture[0].name ||
          !installed.elements.length
        ) {
          throw new Error(
            "Deterministic Library fixture did not reach app state",
          );
        }
      }

      if (request.setup === "active-text-editing") {
        await new Promise(requestAnimationFrame);
        const text = mainApi
          .getSceneElementsIncludingDeleted()
          .find((element) => element.id === "visual-text-01");
        if (text) {
          (mainApp as any).startTextEditing({
            sceneX: text.x + 10,
            sceneY: text.y + 10,
          });
        }
      }

      if (request.setup === "top-level-recovery") {
        const fixture = installRecoveryFixture(
          "top-level-recovery",
          applicationFixtures.topLevelRecovery,
        );
        restores.push(() => {
          fixture.root?.unmount();
          fixture.fixture.remove();
        });
      }

      if (request.setup === "loading") {
        await waitForLoadingPresentation();
      }

      restores.push(() =>
        appJotaiStore.set(shareDialogStateAtom, previousShare),
      );
      appJotaiStore.set(shareDialogStateAtom, { isOpen: false });

      for (const selector of transientSelectors) {
        document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
          if (node.closest("[data-visual-fixture-root]")) {
            return;
          }
          priorTransient.set(
            node,
            node.getAttribute("data-visual-prior-transient"),
          );
          node.dataset.visualPriorTransient = "true";
        });
      }
      restores.push(() => {
        for (const [node, value] of priorTransient) {
          if (!node.isConnected) {
            continue;
          }
          if (value == null) {
            node.removeAttribute("data-visual-prior-transient");
          } else {
            node.dataset.visualPriorTransient = value;
          }
        }
      });

      if (request.setup === "multi-editor") {
        const fixture = installRecoveryFixture("multi-editor");
        restores.push(() => {
          fixture.multiProbe?.dispose();
          if (multiEditorProbe === fixture.multiProbe) {
            multiEditorProbe = null;
          }
          fixture.root?.unmount();
          fixture.fixture.remove();
        });
        if (!fixture.multiProbe) {
          throw new Error("Multi-editor fixture probe was not installed");
        }
        multiEditorProbe = fixture.multiProbe;
      }

      readyScenario = request.id;
      return {
        scenarioId: request.id,
        debuggerDisabled:
          !window.visualDebug && !document.querySelector(DEBUG_CANVAS_SELECTOR),
        inputAcceptance: request.input.acceptance,
        direction: editor.dir,
      };
    },

    restore,

    async queryRestoration() {
      const inspect = inspectRestoration;
      if (!inspect) {
        return null;
      }
      try {
        return await inspect();
      } finally {
        inspectRestoration = null;
      }
    },

    isReady(scenarioId) {
      return readyScenario === scenarioId;
    },

    async action(scenarioId, action) {
      const h = await waitForEditor();
      switch (action) {
        case "focus-primary-action":
          if (scenarioId === "top-level-recovery") {
            return {
              type: "seed-focus-then-key-to",
              selector: "[data-visual-focus-predecessor]",
              key: "Tab",
              target: "[data-visual-primary-action]",
            };
          }
          return {
            type: "seed-focus-then-key-to",
            selector: "[data-testid='toolbar-lock']",
            key: "Tab",
            target: "[data-testid='toolbar-selection']",
          };
        case "open-toolbar-overflow":
          return {
            type: "click",
            selector:
              "[data-testid='toolbar-overflow-trigger'], [data-testid='toolbar-shapes-group']",
          };
        case "exercise-toolbar-final-row":
          return { type: "none" };
        case "exercise-multi-editor-lifecycle":
          return {
            type: "multi-editor-lifecycle",
            updateSelector: "[data-visual-multi-update]",
            unmountSelector: "[data-visual-multi-unmount]",
            recreateSelector: "[data-visual-multi-recreate]",
          };
        case "close-with-escape":
          return { type: "key", key: "Escape" };
        case "close-with-outside-click":
          return { type: "click", selector: "canvas.interactive" };
        case "open-property-surface":
          return {
            type: "click",
            selector: "[data-viewport-ui-name='stylesPanel'] button",
          };
        case "open-main-menu":
          return {
            type: "click",
            selector: "[data-testid='main-menu-trigger']",
          };
        case "open-submenu":
          return {
            type: "click",
            selector: "[data-testid='dropdown-menu'] [aria-haspopup='menu']",
          };
        case "open-context-surface":
          h.setState({ openMenu: "canvas" });
          return { type: "none" };
        case "open-help":
          h.setState({ openDialog: { name: "help" } });
          return { type: "none" };
        case "open-docked-sidebar":
          h.setState({ defaultSidebarDockedPreference: true });
          return {
            type: "click",
            selector:
              ".default-sidebar-trigger button, .default-sidebar-trigger",
          };
        case "open-overlay-sidebar":
          h.setState({ defaultSidebarDockedPreference: false });
          return {
            type: "click",
            selector:
              ".default-sidebar-trigger button, .default-sidebar-trigger",
          };
        case "open-library":
          h.setState({
            defaultSidebarDockedPreference: false,
            openSidebar: {
              name: DEFAULT_SIDEBAR.name,
              tab: LIBRARY_SIDEBAR_TAB,
            },
          });
          return { type: "none" };
        case "open-ai":
          return {
            type: "click-sequence",
            controls: [
              {
                identity: "editor toolbar extra-tools control",
                selector:
                  "[data-testid='toolbar-extra-group'], [data-testid='toolbar-overflow-trigger']",
              },
              {
                identity: "editor toolbar text-to-diagram control",
                selector:
                  ".adaptive-editor-toolbar__tunnel-item [role='menuitem']",
              },
            ],
            ownerIdentity: "editor text-to-diagram surface",
            ownerSelector: "[data-large-surface]",
            dialogName: "ttd",
          };
        case "open-share":
          return {
            type: "click-sequence",
            controls: [
              {
                identity: "application share control",
                selector: ".collab-button",
              },
            ],
            ownerIdentity: "application share surface",
            ownerSelector: ".ShareDialog",
          };
        default:
          throw new Error(`Unknown visual action adapter: ${action}`);
      }
    },

    assert(assertion) {
      const queriedNodes = [
        ...document.querySelectorAll<HTMLElement>(assertion.selector),
      ];
      const nodes =
        assertion.selector === ".excalidraw"
          ? queriedNodes.filter(
              (node) =>
                node.matches(".excalidraw-container") &&
                node.querySelector("canvas.interactive"),
            )
          : queriedNodes;
      const isVisible = (node: HTMLElement) => {
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return (
          box.width > 0 &&
          box.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      };
      const visible = nodes.filter(isVisible);
      const root = [
        ...document.querySelectorAll<HTMLElement>(".excalidraw-container"),
      ].find((node) => node.querySelector("canvas.interactive"));
      const activeElement = document.activeElement;
      const focusOwner = visible.find(
        (node) =>
          node === activeElement ||
          (activeElement instanceof Node && node.contains(activeElement)),
      );
      const first = focusOwner ?? visible[0] ?? nodes[0] ?? null;
      const rect = first?.getBoundingClientRect();
      const styles = first ? getComputedStyle(first) : null;
      const editor = first?.closest<HTMLElement>(".excalidraw-container");
      const editorRect = editor?.getBoundingClientRect();
      const focusVisible = first?.matches(":focus-visible") ?? false;
      const focusContained =
        first != null &&
        activeElement instanceof HTMLElement &&
        first.contains(activeElement);
      const parseColor = (value: string) => {
        const match = value.match(
          /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i,
        );
        return match
          ? {
              r: Number(match[1]),
              g: Number(match[2]),
              b: Number(match[3]),
              a: match[4] == null ? 1 : Number(match[4]),
            }
          : null;
      };
      const opaqueBackground = (node: HTMLElement | null) => {
        let current: HTMLElement | null = node;
        while (current) {
          const color = parseColor(getComputedStyle(current).backgroundColor);
          if (color && color.a > 0.99) {
            return color;
          }
          current = current.parentElement;
        }
        return { r: 255, g: 255, b: 255, a: 1 };
      };
      const luminance = (color: { r: number; g: number; b: number }) => {
        const channel = (value: number) => {
          const normalized = value / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        };
        return (
          0.2126 * channel(color.r) +
          0.7152 * channel(color.g) +
          0.0722 * channel(color.b)
        );
      };
      const foreground = styles ? parseColor(styles.color) : null;
      const background = opaqueBackground(first);
      const labelledBy = first?.getAttribute("aria-labelledby") ?? null;
      const labelledByName = labelledBy
        ?.split(/\s+/)
        .map((id) => document.getElementById(id)?.innerText.trim() ?? "")
        .filter(Boolean)
        .join(" ");
      const light = foreground
        ? Math.max(luminance(foreground), luminance(background))
        : null;
      const dark = foreground
        ? Math.min(luminance(foreground), luminance(background))
        : null;
      const hitSamples = rect
        ? [0.15, 0.5, 0.85].filter((ratio) => {
            const hit = document.elementFromPoint(
              rect.left + rect.width * ratio,
              rect.top + rect.height / 2,
            );
            return (
              hit === first || (hit instanceof Node && first?.contains(hit))
            );
          }).length
        : 0;
      const editorNodes = first
        ? [
            ...first.querySelectorAll<HTMLElement>(
              ".excalidraw-container:has(canvas.interactive)",
            ),
          ]
        : [];
      const markerNodes = [
        ...document.querySelectorAll<HTMLElement>("[data-viewport-ui]"),
      ];
      const neutralWrappers = [
        ...document.querySelectorAll<HTMLElement>(
          "[data-canvas-ui-layout], [data-canvas-ui-row], [data-canvas-ui-zone], .floating-surface-positioner, [data-large-surface-positioner]",
        ),
      ];
      return {
        visible: visible.length > 0,
        count: nodes.length,
        active:
          first != null && (document.activeElement === first || focusContained),
        visibleFocus:
          focusVisible ||
          (!!styles &&
            ((styles.outlineStyle !== "none" &&
              Number.parseFloat(styles.outlineWidth) > 0) ||
              styles.boxShadow !== "none")),
        focusContained,
        focusOutline: styles
          ? `${styles.outlineStyle}:${styles.outlineWidth}:${styles.boxShadow}`
          : null,
        rect: rect
          ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          : null,
        role:
          first?.getAttribute("role") ??
          (first?.matches("h1, h2, h3, h4, h5, h6") ? "heading" : null),
        name:
          first?.getAttribute("aria-label") ??
          labelledByName ??
          first?.getAttribute("data-visual-name") ??
          first?.innerText?.trim().slice(0, 120) ??
          null,
        labelledBy,
        expanded: first?.getAttribute("aria-expanded") ?? null,
        selected: first?.getAttribute("aria-selected") ?? null,
        checked: first?.getAttribute("aria-checked") ?? null,
        disabled:
          first?.getAttribute("aria-disabled") ??
          (first instanceof HTMLButtonElement && first.disabled
            ? "true"
            : null),
        live: Boolean(
          first?.closest("[aria-live], [role='status'], [role='alert']") ??
            first?.querySelector(
              "[aria-live], [role='status'], [role='alert']",
            ),
        ),
        foreground: styles?.color ?? null,
        background: `rgb(${background.r}, ${background.g}, ${background.b})`,
        contrastRatio:
          light != null && dark != null ? (light + 0.05) / (dark + 0.05) : null,
        rootOverflow: root ? root.scrollWidth - root.clientWidth : null,
        responsive: root
          ? {
              direction: root.dir,
              tier: root.dataset.responsiveTier,
              adapter: root.dataset.responsiveAdapter,
              orientation: root.dataset.responsiveOrientation,
              blockSize: root.dataset.responsiveBlockSize,
              density: root.dataset.responsiveDensity,
              presentation: root.dataset.responsivePresentation,
              signature: root.dataset.responsiveSignature,
            }
          : null,
        markers: markerNodes.map((node) => ({
          name: node.dataset.viewportUiName ?? null,
          edge: node.dataset.viewportUi,
          tag: node.tagName,
        })),
        neutralWrappers: neutralWrappers.every(
          (node) =>
            !node.hasAttribute("data-viewport-ui") &&
            getComputedStyle(node).pointerEvents === "none",
        ),
        debuggerAbsent:
          !window.visualDebug && !document.querySelector(DEBUG_CANVAS_SELECTOR),
        containedByViewport: rect
          ? rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= window.innerWidth &&
            rect.bottom <= window.innerHeight
          : false,
        containedByEditor:
          !!rect &&
          !!editorRect &&
          rect.left >= editorRect.left &&
          rect.top >= editorRect.top &&
          rect.right <= editorRect.right &&
          rect.bottom <= editorRect.bottom,
        boundedScroll:
          !!first &&
          first.scrollHeight >= first.clientHeight &&
          first.scrollWidth >= first.clientWidth &&
          first.scrollHeight <= window.innerHeight * 4 &&
          first.scrollWidth <= window.innerWidth * 4,
        safeArea: (() => {
          if (!rect || !root) {
            return false;
          }
          const rootRect = root.getBoundingClientRect();
          const style = getComputedStyle(root);
          const inset = (name: string) =>
            Number.parseFloat(style.getPropertyValue(name)) || 0;
          return (
            rect.top >= rootRect.top + inset("--sat") &&
            rect.right <= rootRect.right - inset("--sar") &&
            rect.bottom <= rootRect.bottom - inset("--sab") &&
            rect.left >= rootRect.left + inset("--sal")
          );
        })(),
        touchTarget: !!rect && rect.width >= 40 && rect.height >= 40,
        intrinsicWidth: !!first && first.scrollWidth > 0,
        ownedOverflow:
          !!first &&
          (() => {
            const owner = first.closest<HTMLElement>(
              ".Island.adaptive-toolbar-shell",
            );
            if (!owner) {
              return false;
            }
            const ownerStyle = getComputedStyle(owner);
            return ["hidden", "clip"].includes(ownerStyle.overflowX);
          })(),
        docked: Boolean(
          first?.closest("[data-sidebar-docked='true'], .sidebar--docked") ??
            first?.getAttribute("data-docked") === "true",
        ),
        viewportMarker: Boolean(
          first?.hasAttribute("data-viewport-ui") ||
            first?.querySelector("[data-viewport-ui]"),
        ),
        hitSamples,
        independentOfEditor: !first?.closest(".excalidraw-container"),
        editorCount: editorNodes.length,
        directions: editorNodes.map((node) => node.dir),
        themes: editorNodes.map((node) =>
          node.classList.contains("theme--dark") ? "dark" : "light",
        ),
      };
    },

    async installToolbarLifecycleFixture() {
      if (toolbarLifecycleFixture) {
        throw new Error("Toolbar lifecycle fixture is already installed");
      }
      const installed = createToolbarLifecycleFixture();
      toolbarLifecycleFixture = installed;
      restores.push(() => {
        if (toolbarLifecycleFixture !== installed) {
          return;
        }
        installed.root.unmount();
        installed.fixture.remove();
        toolbarLifecycleFixture = null;
      });
      const timeoutAt = performance.now() + 10_000;
      while (
        performance.now() < timeoutAt &&
        (!installed.probe.currentContainer ||
          !installed.fixture.querySelector(
            "[data-visual-toolbar-lifecycle-editor] [data-adaptive-toolbar]",
          ))
      ) {
        await new Promise(requestAnimationFrame);
      }
      if (!installed.probe.currentContainer) {
        throw new Error("Toolbar lifecycle editor did not mount");
      }
      return {
        mounts: installed.probe.mounts.map((entry) => ({ ...entry })),
        currentEditorId: installed.probe.currentEditorId,
      };
    },

    async removeToolbarLifecycleFixture() {
      const installed = toolbarLifecycleFixture;
      if (!installed) {
        return { removed: true, alreadyAbsent: true };
      }
      installed.root.unmount();
      installed.fixture.remove();
      toolbarLifecycleFixture = null;
      await Promise.resolve();
      return {
        removed: !document.querySelector(
          "[data-visual-toolbar-lifecycle-fixture]",
        ),
        mounts: installed.probe.mounts.map((entry) => ({ ...entry })),
        unmounts: installed.probe.unmounts.map((entry) => ({ ...entry })),
        controls: installed.probe.controls.map((entry) => ({ ...entry })),
      };
    },

    hasToolbarSurfaceOwner(identity) {
      return hasFloatingSurfaceOwner("dropdown-menu", identity);
    },

    readMultiEditorLifecycle() {
      if (!multiEditorProbe) {
        throw new Error("Multi-editor lifecycle fixture is not installed");
      }
      return multiEditorProbe.read();
    },

    async initializeMultiEditorLifecycle() {
      if (!multiEditorProbe) {
        throw new Error("Multi-editor lifecycle fixture is not installed");
      }
      return multiEditorProbe.initialize();
    },
  };
  window.__visualRegressionHost = host;
};
