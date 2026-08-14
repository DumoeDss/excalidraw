import { createHash } from "node:crypto";
import {
  mkdtemp,
  link,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { directoryHash, validateBaselineMetadata } from "./baseline";
import { comparePng } from "./comparator";
import {
  createApplicationFixtures,
  createSceneFixture,
  FIXTURE_VERSION,
} from "./fixtures";
import { defineVisualScenarios, filterScenarios } from "./manifest";
import { canonicalFilename, roleFilename } from "./naming";
import { performanceActionForScenario } from "./performance";
import {
  assertRoleMayRun,
  assertRoleMayWrite,
  baselinePath,
  candidatePath,
  evidencePath,
  parseVisualRole,
  parseVisualWorkerRole,
  resultPath,
} from "./paths";
import { createArtifactWriter } from "./artifactWriter";
import { captureVisualAppOwner } from "./appOwner";
import { decodePng, encodePng, pngHash } from "./png";
import {
  assertInputCapabilities,
  ChromeProxyAdapter,
  clearInputProfileCdpCommands,
  inputProfileCdpCommands,
  ownedAuxiliaryTargetIds,
  restoreInputCapabilitiesCdpCommands,
  trustedKeyCdpCommands,
} from "./proxy";
import { renderReplayChecklist } from "./replay";
import { contrastRatio, median, parseComputedColor } from "./semantics";
import { visualScenarios } from "./scenarios";
import { runWithLifecycle, runWithLifecycleAndPublish } from "./lifecycle";
import {
  assertBlankRoutingCleanup,
  assertBlankRoutingObservation,
  assertMultiEditorLifecycleFacts,
  assertToolbarCoordinateSamples,
  assertToolbarLifecycleFacts,
  assertToolbarOpenFacts,
  assertToolbarOutsideRoute,
  assertToolbarRestoredFacts,
  assertTrustedCoordinateResult,
  dispatchTrustedCoordinateInput,
  executeInstruction,
  waitForStableMultiEditorSnapshot,
} from "./actions";
import {
  assertCandidateMayBeWritten,
  assertSourceFingerprint,
  assertValidCandidateMetadata,
  assertValidInspectionEntry,
  deriveRestorationVerified,
  failedRestorationFacts,
  fingerprintImplementationSources,
  promoteInspectedCandidates,
  REQUIRED_HOST_RESTORATION_FACTS,
  resolveScenarioStatus,
  runVisualScenarios,
  semanticFailure,
} from "./runner";
import { runReviewerVisualVerification } from "./reviewerEntrypoint";
import {
  captureWithCheckerAudit,
  checkerFailureMessages,
  scanCheckerDiagnostics,
} from "./checkerDiagnostics";

import type { ChromeProxyPort, TargetCdpPort } from "./proxy";
import type {
  MultiEditorInstanceFacts,
  MultiEditorLifecycleEvidence,
  MultiEditorLifecycleSnapshot,
  ToolbarCoordinateSample,
  ToolbarLifecycleFacts,
  ToolbarShellFacts,
  TrustedCoordinateEvidence,
} from "./actions";
import type { VisualArtifactRoots } from "./paths";
import type {
  VisualBaselineMetadata,
  VisualCandidateMetadata,
  VisualScenario,
  VisualScenarioResult,
} from "./types";

const solid = (width: number, height: number, rgba: readonly number[]) => {
  const data = new Uint8Array(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data.set(rgba, offset);
  }
  return encodePng({ width, height, data });
};

const validScenario = (): VisualScenario => structuredClone(visualScenarios[0]);

const validTrustedCoordinateEvidence = (): TrustedCoordinateEvidence => ({
  token: "trusted-coordinate-unit",
  point: { x: 140, y: 220 },
  targetMode: "exact",
  expectedEditorInstanceId: "editor-instance-1",
  physicalTarget: {
    targetCount: 1,
    ownerCount: 1,
    hitMatches: true,
    hitTag: "CANVAS",
  },
  pageSequenceBefore: 0,
  editorSequenceBefore: 0,
  page: {
    token: "trusted-coordinate-unit",
    type: "pointerdown",
    sequence: 1,
    isTrusted: true,
    pointerType: "mouse",
    pointerId: 7,
    clientX: 140,
    clientY: 220,
    targetOwned: true,
    ownerOwned: true,
    exactTarget: true,
  },
  editor: {
    token: "trusted-coordinate-unit",
    type: "pointerdown",
    sequence: 1,
    isTrusted: true,
    pointerType: "mouse",
    pointerId: 7,
    clientX: 140,
    clientY: 220,
    targetOwned: true,
    ownerOwned: true,
    exactTarget: true,
    instanceId: "editor-instance-1",
    emitter: "ExcalidrawImperativeAPI.onPointerDown",
    activeTool: "selection",
    scenePoint: { x: 120, y: 200 },
  },
  driver: { clicked: true, x: 140, y: 220 },
});

const validToolbarShell = (open: boolean): ToolbarShellFacts => ({
  editorCount: 1,
  triggerCount: 1,
  triggerVisible: true,
  triggerExpanded: open ? "true" : "false",
  triggerControls: "toolbar-owner-1",
  triggerFocused: !open,
  surfaceCount: open ? 1 : 0,
  surfaceId: open ? "toolbar-owner-1" : null,
  rootOpen: open ? "true" : null,
  rootOwner: open ? "toolbar-owner-1" : null,
  ownerClaimed: open,
  sameEditor: open,
  focusInsideSurface: open,
  activeElementConnected: true,
  adjacent: {
    count: 1,
    ariaHidden: open ? "true" : null,
    inert: open,
    opacity: open ? "0" : "1",
    inlineOpacity: open ? "0" : "",
    inlineTransition: open ? "none" : "",
    pointerEvents: open ? "none" : "auto",
    visibility: open ? "hidden" : "visible",
  },
});

const validToolbarSample = (ratio: number): ToolbarCoordinateSample => {
  const rect = { left: 100, top: 198, width: 200, height: 44 };
  const point = {
    x: rect.left + rect.width * ratio,
    y: rect.top + rect.height / 2,
  };
  const trusted = validTrustedCoordinateEvidence();
  trusted.targetMode = "contained";
  trusted.expectedEditorInstanceId = null;
  trusted.editorSequenceBefore = null;
  trusted.editor = null;
  trusted.point = point;
  trusted.page!.clientX = point.x;
  trusted.page!.clientY = point.y;
  trusted.driver.x = point.x;
  trusted.driver.y = point.y;
  return {
    ratio,
    rowIdentity: "toolbar-owner-1|toolbar-line|menuitemradio|Line",
    actionIdentity: "toolbar-line",
    rect,
    transition: { before: "rectangle", after: "line" },
    trusted,
    activation: {
      rowClicks: 1,
      rowReceipt: {
        isTrusted: true,
        targetOwned: true,
        rowIdentity: "toolbar-owner-1|toolbar-line|menuitemradio|Line",
      },
      siblingClicks: 0,
      adjacentClicks: 0,
    },
    closed: validToolbarShell(false),
  };
};

const validToolbarLifecycle = (): ToolbarLifecycleFacts => {
  const unmountInput = validTrustedCoordinateEvidence();
  unmountInput.expectedEditorInstanceId = null;
  unmountInput.editorSequenceBefore = null;
  unmountInput.editor = null;
  const recreateInput = structuredClone(unmountInput);
  return {
    opened: validToolbarShell(true),
    unmountInput,
    recreateInput,
    afterUnmount: {
      oldRootConnected: false,
      oldTriggerConnected: false,
      oldSurfaceConnected: false,
      oldAdjacentConnected: false,
      oldRootOpen: null,
      oldRootOwner: null,
      oldAdjacentHidden: null,
      oldAdjacentInert: false,
      oldAdjacentOpacity: "",
      oldAdjacentTransition: "",
      oldAdjacentPointerStyles: [],
      ownerClaimed: false,
      mainEditorConnected: true,
      mainEditorMarkers: 0,
      mainEditorSurfaces: 0,
    },
    recreated: {
      generation: "2",
      rootOpen: null,
      rootOwner: null,
      surfaceCount: 0,
      mainEditorConnected: true,
    },
    removed: {
      removed: true,
      mounts: [
        { generation: 1, editorId: "editor-1" },
        { generation: 2, editorId: "editor-2" },
      ],
      unmounts: [
        { generation: 1, editorId: "editor-1" },
        { generation: 2, editorId: "editor-2" },
      ],
      controls: [
        { action: "unmount", isTrusted: true, pointerType: "mouse" },
        { action: "recreate", isTrusted: true, pointerType: "mouse" },
      ],
    },
    helperCount: 0,
  };
};

const validMultiEditorInstance = ({
  side,
  generation = 1,
  theme,
  direction,
  profile,
  rect,
  sameInitial = true,
}: {
  side: "left" | "right";
  generation?: number;
  theme: "light" | "dark";
  direction: "ltr" | "rtl";
  profile: MultiEditorInstanceFacts["profile"];
  rect: MultiEditorInstanceFacts["rect"];
  sameInitial?: boolean;
}): MultiEditorInstanceFacts => ({
  generation,
  rootIdentity: `${side}-root-${generation}`,
  apiIdentity: `${side}-api-${generation}`,
  apiId: `${side}-editor-${generation}`,
  apiDestroyed: false,
  appOpenMenu: "canvas",
  sameInitialRoot: sameInitial,
  sameInitialApi: sameInitial,
  theme,
  direction,
  profile,
  scene:
    side === "left"
      ? {
          elementCount: 1,
          activeElementCount: 1,
          elementIds: ["visual-rectangle-01"],
          elementTypes: ["rectangle"],
        }
      : {
          elementCount: 1,
          activeElementCount: 1,
          elementIds: ["visual-text-01"],
          elementTypes: ["text"],
        },
  renderedScene:
    side === "left"
      ? {
          canvasConnected: true,
          canvasWidth: 1012,
          canvasHeight: 808,
          elementId: "visual-rectangle-01",
          sampleRegion: { x: 424, y: 262, width: 192, height: 126 },
          sampledPixels: 1536,
          matchingPixels: 1536,
          matchingRatio: 1,
          pixelSignature: "b13f8a42",
          paintPresent: true,
        }
      : null,
  rect,
  withinFixture: true,
  focus: {
    ownerIdentity: `${side}-focus-owner-1`,
    sameInitialOwner: side === "left" ? true : sameInitial,
    ownerConnected: side === "left",
    active: side === "left",
    ariaControls: `${side}-menu-${generation}`,
    surfaceConnected: side === "left",
  },
  primaryAssociation: {
    triggerIdentity: `${side}-trigger-${generation}`,
    surfaceIdentity: `${side}-surface-${generation}`,
    controlsId: `${side}-menu-${generation}`,
    triggerConnected: true,
    surfaceConnected: true,
    triggerExpanded: "true",
    surfaceDirection: direction,
    ownerIdentity: `${side}-editor-${generation}:main-menu`,
    ownerClaimed: true,
    sameInitialTrigger: sameInitial,
    sameInitialSurface: sameInitial,
  },
  associations: [
    {
      controlsId: `${side}-menu-${generation}`,
      triggerIdentity: `${side}-trigger-${generation}`,
      surfaceIdentity: `${side}-surface-${generation}`,
      triggerConnected: true,
      surfaceConnected: true,
    },
  ],
  toolbarOwner: null,
});

const validMultiEditorLifecycle = (): MultiEditorLifecycleEvidence => {
  const leftProfile = {
    tier: "desktop",
    adapter: "desktop",
    orientation: "landscape",
    blockSize: "regular",
    density: "compact",
    presentation: "full",
    signature: '[1,"desktop","desktop","landscape"]',
  };
  const rightInitialProfile = {
    tier: "tablet",
    adapter: "desktop",
    orientation: "portrait",
    blockSize: "regular",
    density: "touch",
    presentation: "compact",
    signature: '[1,"tablet","desktop","portrait","rtl"]',
  };
  const rightUpdatedProfile = {
    ...rightInitialProfile,
    tier: "phone",
    adapter: "phone",
    presentation: "mobile",
    signature: '[1,"phone","phone","portrait","ltr"]',
  };
  const leftRect = {
    x: 24,
    y: 68,
    width: 1012,
    height: 808,
    right: 1036,
    bottom: 876,
  };
  const rightRect = {
    x: 1060,
    y: 68,
    width: 356,
    height: 808,
    right: 1416,
    bottom: 876,
  };
  const left = validMultiEditorInstance({
    side: "left",
    theme: "light",
    direction: "ltr",
    profile: leftProfile,
    rect: leftRect,
  });
  const right = validMultiEditorInstance({
    side: "right",
    theme: "dark",
    direction: "rtl",
    profile: rightInitialProfile,
    rect: rightRect,
  });
  right.focus.ownerConnected = false;
  right.focus.active = false;
  right.focus.surfaceConnected = false;
  const initialSummary = {
    documentDirection: "ltr",
    left: structuredClone(left),
    right: structuredClone(right),
  };
  const cleanDetached = {
    rootConnected: false,
    apiDestroyed: true,
    apiStillCurrent: false,
    connectedControls: 0,
    connectedSurfaces: 0,
    presentControlIds: 0,
    ownerClaimed: false,
    portalResidue: 0,
  };
  const control = (action: "update" | "unmount" | "recreate", x: number) => ({
    action,
    pointerTrusted: true,
    clickTrusted: true,
    pointerType: "mouse",
    clientX: x,
    clientY: 24,
    targetOwned: true,
  });
  const baseSnapshot = (): MultiEditorLifecycleSnapshot => ({
    phase: "initial",
    editorCount: 2,
    documentDirection: "ltr",
    fixtureRect: {
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
      right: 1440,
      bottom: 900,
    },
    initialRecorded: true,
    initial: structuredClone(initialSummary),
    expectedUpdatedRight: {
      theme: "light",
      direction: "ltr",
      profile: structuredClone(rightUpdatedProfile),
    },
    left: structuredClone(left),
    right: structuredClone(right),
    detachedRight: {
      rootConnected: true,
      apiDestroyed: false,
      apiStillCurrent: true,
      connectedControls: 1,
      connectedSurfaces: 1,
      presentControlIds: 1,
      ownerClaimed: true,
      portalResidue: 1,
    },
    controls: [],
    mounts: { left: [{ generation: 1 }], right: [{ generation: 1 }] },
    unmounts: { left: [], right: [] },
    staleMarkerCount: 0,
  });
  const initial = baseSnapshot();
  const updated = baseSnapshot();
  updated.phase = "updated";
  updated.controls = [control("update", 100)];
  updated.right = validMultiEditorInstance({
    side: "right",
    theme: "light",
    direction: "ltr",
    profile: rightUpdatedProfile,
    rect: rightRect,
  });
  updated.right.focus.ownerConnected = false;
  updated.right.focus.active = false;
  updated.right.focus.surfaceConnected = false;
  const unmounted = baseSnapshot();
  unmounted.phase = "unmounted";
  unmounted.editorCount = 1;
  unmounted.right = null;
  unmounted.detachedRight = structuredClone(cleanDetached);
  unmounted.controls = [control("update", 100), control("unmount", 200)];
  const restored = baseSnapshot();
  restored.phase = "restored";
  restored.detachedRight = structuredClone(cleanDetached);
  restored.controls = [
    control("update", 100),
    control("unmount", 200),
    control("recreate", 300),
  ];
  restored.right = validMultiEditorInstance({
    side: "right",
    generation: 2,
    theme: "dark",
    direction: "rtl",
    profile: rightInitialProfile,
    rect: rightRect,
    sameInitial: false,
  });
  restored.right.focus.ownerConnected = false;
  restored.right.focus.active = false;
  restored.right.focus.surfaceConnected = false;
  restored.mounts.right.push({ generation: 2 });
  restored.unmounts.right.push({ generation: 1 });
  return {
    initial,
    updated,
    unmounted,
    restored,
    drivers: {
      update: { clicked: true, x: 100, y: 24 },
      unmount: { clicked: true, x: 200, y: 24 },
      recreate: { clicked: true, x: 300, y: 24 },
    },
  };
};

const createCdpRecorder = () => {
  const calls: Array<{ type: string; targetId?: string; method?: string }> = [];
  const port: TargetCdpPort = {
    attach: async (targetId: string) => {
      calls.push({ type: "attach", targetId });
    },
    send: async (targetId, command) => {
      calls.push({ type: "send", targetId, method: command.method });
    },
    detach: async (targetId: string) => {
      calls.push({ type: "detach", targetId });
    },
    dispose: async () => {
      calls.push({ type: "dispose" });
    },
  };
  return { calls, port };
};

describe("target-scoped browser input profiles", () => {
  const coarse = {
    pointer: "coarse",
    hover: false,
    touchPoints: 1,
    acceptance: "mounted-editor",
  } as const;
  const fine = {
    pointer: "fine",
    hover: true,
    touchPoints: "preserve",
    acceptance: "browser",
  } as const;

  it("applies exact CDP media and touch capability overrides", () => {
    expect(inputProfileCdpCommands(coarse)).toEqual([
      {
        method: "Emulation.setTouchEmulationEnabled",
        params: { enabled: true, maxTouchPoints: 1 },
      },
      {
        method: "Emulation.setEmulatedMedia",
        params: {
          media: "",
          features: [
            { name: "pointer", value: "coarse" },
            { name: "any-pointer", value: "coarse" },
            { name: "hover", value: "none" },
            { name: "any-hover", value: "none" },
          ],
        },
      },
    ]);
    expect(clearInputProfileCdpCommands(coarse)).toEqual([
      {
        method: "Emulation.setEmulatedMedia",
        params: { media: "", features: [] },
      },
      {
        method: "Emulation.setTouchEmulationEnabled",
        params: { enabled: false },
      },
    ]);
    expect(inputProfileCdpCommands(fine)).toEqual([
      {
        method: "Emulation.setEmulatedMedia",
        params: {
          media: "",
          features: [
            { name: "pointer", value: "fine" },
            { name: "any-pointer", value: "fine" },
            { name: "hover", value: "hover" },
            { name: "any-hover", value: "hover" },
          ],
        },
      },
    ]);
    expect(clearInputProfileCdpCommands(fine)).toEqual([
      {
        method: "Emulation.setEmulatedMedia",
        params: { media: "", features: [] },
      },
    ]);
    expect(
      restoreInputCapabilitiesCdpCommands({
        pointer: "fine",
        hover: true,
        touchPoints: 10,
      }),
    ).toEqual([
      {
        method: "Emulation.setTouchEmulationEnabled",
        params: { enabled: true, maxTouchPoints: 10 },
      },
      {
        method: "Emulation.setEmulatedMedia",
        params: {
          media: "",
          features: [
            { name: "pointer", value: "fine" },
            { name: "any-pointer", value: "fine" },
            { name: "hover", value: "hover" },
            { name: "any-hover", value: "hover" },
          ],
        },
      },
    ]);
  });

  it("brings the exact inspected target to the foreground before trusted input", async () => {
    const { calls, port } = createCdpRecorder();
    const adapter = new ChromeProxyAdapter("http://proxy.invalid", port);
    vi.spyOn(adapter, "evaluate")
      .mockResolvedValueOnce("Prior title")
      .mockResolvedValueOnce({
        visibility: "visible",
        focused: true,
      })
      .mockResolvedValueOnce(undefined);
    (adapter as any).activateChromeWindow = vi
      .fn()
      .mockResolvedValue("window-1");

    await expect(adapter.activateTarget("target-active")).resolves.toEqual({
      targetId: "target-active",
      activated: true,
      windowHandle: "window-1",
      observation: { visibility: "visible", focused: true },
    });
    expect(calls).toEqual([
      {
        type: "send",
        targetId: "target-active",
        method: "Page.bringToFront",
      },
    ]);
  });

  it("retries transient window activation and hidden target observations", async () => {
    const { calls, port } = createCdpRecorder();
    const adapter = new ChromeProxyAdapter("http://proxy.invalid", port);
    vi.spyOn(adapter, "evaluate")
      .mockResolvedValueOnce("Prior title")
      .mockResolvedValueOnce({
        visibility: "hidden",
        focused: false,
      })
      .mockResolvedValueOnce({
        visibility: "visible",
        focused: true,
      })
      .mockResolvedValueOnce(undefined);
    const activateChromeWindow = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient foreground denial"))
      .mockResolvedValue("window-1");
    (adapter as any).activateChromeWindow = activateChromeWindow;

    await expect(adapter.activateTarget("target-retry")).resolves.toEqual({
      targetId: "target-retry",
      activated: true,
      windowHandle: "window-1",
      observation: { visibility: "visible", focused: true },
    });
    expect(activateChromeWindow).toHaveBeenCalledTimes(3);
    expect(calls).toEqual([
      {
        type: "send",
        targetId: "target-retry",
        method: "Page.bringToFront",
      },
      {
        type: "send",
        targetId: "target-retry",
        method: "Page.bringToFront",
      },
      {
        type: "send",
        targetId: "target-retry",
        method: "Page.bringToFront",
      },
    ]);
  });

  it("fails strictly when exact window activation exhausts its deadline", async () => {
    const { calls, port } = createCdpRecorder();
    const adapter = new ChromeProxyAdapter("http://proxy.invalid", port);
    vi.spyOn(adapter, "evaluate")
      .mockResolvedValueOnce("Prior title")
      .mockResolvedValueOnce(undefined);
    (adapter as any).activateChromeWindow = vi
      .fn()
      .mockRejectedValue(new Error("foreground remained unavailable"));
    const now = vi
      .spyOn(performance, "now")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(10_001);

    try {
      await expect(adapter.activateTarget("target-timeout")).rejects.toThrow(
        /did not become active within 10000ms.*foreground remained unavailable/,
      );
    } finally {
      now.mockRestore();
    }
    expect(calls).toEqual([
      {
        type: "send",
        targetId: "target-timeout",
        method: "Page.bringToFront",
      },
      {
        type: "send",
        targetId: "target-timeout",
        method: "Page.bringToFront",
      },
    ]);
  });

  it("dispatches supported keyboard input through the exact target CDP session", async () => {
    expect(trustedKeyCdpCommands("Escape")).toEqual([
      {
        method: "Input.dispatchKeyEvent",
        params: {
          key: "Escape",
          code: "Escape",
          windowsVirtualKeyCode: 27,
          nativeVirtualKeyCode: 27,
          modifiers: 0,
          autoRepeat: false,
          isKeypad: false,
          type: "keyDown",
        },
      },
      {
        method: "Input.dispatchKeyEvent",
        params: {
          key: "Escape",
          code: "Escape",
          windowsVirtualKeyCode: 27,
          nativeVirtualKeyCode: 27,
          modifiers: 0,
          autoRepeat: false,
          isKeypad: false,
          type: "keyUp",
        },
      },
    ]);
    expect(trustedKeyCdpCommands("ArrowLeft")[0]?.params).toMatchObject({
      key: "ArrowLeft",
      code: "ArrowLeft",
      windowsVirtualKeyCode: 37,
    });
    expect(trustedKeyCdpCommands("Tab")[0]?.params).toMatchObject({
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
    });
    expect(() => trustedKeyCdpCommands("Enter")).toThrow(
      /Unsupported trusted key: Enter/,
    );
  });

  it("accepts only a visible focused trusted key receipt from the exact target", async () => {
    const { calls, port } = createCdpRecorder();
    const adapter = new ChromeProxyAdapter("http://proxy.invalid", port);
    vi.spyOn(adapter, "activateTarget").mockResolvedValue({
      targetId: "target-key",
      activated: true,
      windowHandle: "window-1",
      observation: { visibility: "visible", focused: true },
    });
    const evaluate = vi
      .spyOn(adapter, "evaluate")
      .mockResolvedValueOnce({ visibility: "hidden", focused: false })
      .mockResolvedValueOnce({
        key: "Escape",
        code: "Escape",
        isTrusted: true,
        visibility: "visible",
        focused: true,
      })
      .mockResolvedValueOnce(undefined);

    await expect(adapter.trustedKey("target-key", "Escape")).resolves.toEqual(
      expect.objectContaining({
        key: "Escape",
        trusted: true,
        source: "browser-cdp",
        targetId: "target-key",
      }),
    );
    expect(evaluate.mock.calls[0]?.[1]).toContain(
      "event.key === expected && event.code === expectedCode",
    );
    expect(evaluate.mock.calls[0]?.[1]).toContain(
      "event.stopImmediatePropagation()",
    );
    expect(evaluate.mock.calls[0]?.[1]).not.toContain("once: true");
    expect(calls).toEqual([
      {
        type: "send",
        targetId: "target-key",
        method: "Input.dispatchKeyEvent",
      },
      {
        type: "send",
        targetId: "target-key",
        method: "Input.dispatchKeyEvent",
      },
    ]);
  });

  it("retries trusted input when the exact target loses visibility before dispatch", async () => {
    const { calls, port } = createCdpRecorder();
    const adapter = new ChromeProxyAdapter("http://proxy.invalid", port);
    const activateTarget = vi
      .spyOn(adapter, "activateTarget")
      .mockResolvedValue({
        targetId: "target-key-retry",
        activated: true,
        windowHandle: "window-retry",
        observation: { visibility: "visible", focused: true },
      });
    const evaluate = vi
      .spyOn(adapter, "evaluate")
      .mockResolvedValueOnce({ visibility: "hidden", focused: false })
      .mockResolvedValueOnce({
        key: "Escape",
        code: "Escape",
        isTrusted: true,
        visibility: "hidden",
        focused: true,
      })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        key: "Escape",
        code: "Escape",
        isTrusted: true,
        visibility: "visible",
        focused: true,
      })
      .mockResolvedValueOnce(undefined);

    await expect(
      adapter.trustedKey("target-key-retry", "Escape"),
    ).resolves.toEqual(
      expect.objectContaining({
        key: "Escape",
        trusted: true,
        targetId: "target-key-retry",
      }),
    );
    expect(activateTarget).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(4);
    expect(evaluate.mock.calls[0]?.[1]).toContain(
      'receipt.visibility === "visible"',
    );
    expect(evaluate.mock.calls[2]?.[1]).toContain("observed = null");
  });

  it("rejects an untrusted page receipt and always removes its probe", async () => {
    const { port } = createCdpRecorder();
    const adapter = new ChromeProxyAdapter("http://proxy.invalid", port);
    vi.spyOn(adapter, "activateTarget").mockResolvedValue({
      targetId: "target-key-negative",
      activated: true,
      windowHandle: "window-2",
      observation: { visibility: "visible", focused: true },
    });
    const evaluate = vi
      .spyOn(adapter, "evaluate")
      .mockResolvedValueOnce({ visibility: "visible", focused: true })
      .mockResolvedValueOnce({
        key: "Escape",
        code: "Escape",
        isTrusted: false,
        visibility: "visible",
        focused: true,
      })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        key: "Escape",
        code: "Escape",
        isTrusted: false,
        visibility: "visible",
        focused: true,
      })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        key: "Escape",
        code: "Escape",
        isTrusted: false,
        visibility: "visible",
        focused: true,
      })
      .mockResolvedValueOnce(undefined);

    await expect(
      adapter.trustedKey("target-key-negative", "Escape"),
    ).rejects.toThrow(/Exact-target trusted keyboard verification failed/);
    expect(evaluate).toHaveBeenCalledTimes(7);
    expect(evaluate.mock.calls[6]?.[1]).toContain(
      "delete window.__visualTrustedKeyProbe",
    );
  });

  it("fresh-reads apply and cleanup, restoring the pre-run values exactly", async () => {
    const { calls, port } = createCdpRecorder();
    const adapter = new ChromeProxyAdapter("http://proxy.invalid", port);
    vi.spyOn(adapter, "inputCapabilities")
      .mockResolvedValueOnce({ pointer: "fine", hover: true, touchPoints: 10 })
      .mockResolvedValueOnce({
        pointer: "coarse",
        hover: false,
        touchPoints: 1,
      })
      .mockResolvedValueOnce({
        pointer: "coarse",
        hover: false,
        touchPoints: 10,
      })
      .mockResolvedValueOnce({ pointer: "fine", hover: true, touchPoints: 10 });

    await expect(
      adapter.applyInputProfile("target-1", coarse),
    ).resolves.toEqual({
      prior: { pointer: "fine", hover: true, touchPoints: 10 },
      requested: coarse,
      expected: { pointer: "coarse", hover: false, touchPoints: 1 },
      actual: { pointer: "coarse", hover: false, touchPoints: 1 },
    });
    await expect(adapter.clearInputProfile("target-1")).resolves.toEqual({
      prior: { pointer: "fine", hover: true, touchPoints: 10 },
      afterRestoreCommands: {
        pointer: "coarse",
        hover: false,
        touchPoints: 10,
      },
    });
    const outerPostQuery = await adapter.inputCapabilities("target-1");
    expect(() =>
      assertInputCapabilities(
        { pointer: "fine", hover: true, touchPoints: 10 },
        outerPostQuery,
        "outer post-query",
      ),
    ).not.toThrow();
    expect(calls).toEqual([
      { type: "attach", targetId: "target-1" },
      {
        type: "send",
        targetId: "target-1",
        method: "Emulation.setTouchEmulationEnabled",
      },
      {
        type: "send",
        targetId: "target-1",
        method: "Emulation.setEmulatedMedia",
      },
      {
        type: "send",
        targetId: "target-1",
        method: "Emulation.setTouchEmulationEnabled",
      },
      {
        type: "send",
        targetId: "target-1",
        method: "Emulation.setEmulatedMedia",
      },
      { type: "detach", targetId: "target-1" },
      { type: "dispose" },
    ]);
  });

  it("fails exact capability mismatches and still clears the target override", async () => {
    const { calls, port } = createCdpRecorder();
    const adapter = new ChromeProxyAdapter("http://proxy.invalid", port);
    vi.spyOn(adapter, "inputCapabilities")
      .mockResolvedValueOnce({ pointer: "fine", hover: true, touchPoints: 10 })
      .mockResolvedValueOnce({
        pointer: "coarse",
        hover: false,
        touchPoints: 2,
      });

    await expect(adapter.applyInputProfile("target-2", coarse)).rejects.toThrow(
      /Browser input profile mismatch/,
    );
    expect(calls.slice(-4)).toEqual([
      {
        type: "send",
        targetId: "target-2",
        method: "Emulation.setTouchEmulationEnabled",
      },
      {
        type: "send",
        targetId: "target-2",
        method: "Emulation.setEmulatedMedia",
      },
      { type: "detach", targetId: "target-2" },
      { type: "dispose" },
    ]);
    expect(() =>
      assertInputCapabilities(
        { pointer: "fine", hover: true, touchPoints: 0 },
        { pointer: "fine", hover: true, touchPoints: 10 },
        "post-navigation",
      ),
    ).toThrow(/post-navigation/);
  });

  it("requires coarse phone scenarios to expose the touch root projection", () => {
    for (const id of ["phone-light-library", "phone-dark-landscape"]) {
      const scenario = visualScenarios.find(
        (candidate) => candidate.id === id,
      )!;
      expect(scenario.input).toEqual(coarse);
      expect(
        scenario.assertions.some(
          (assertion) =>
            assertion.kind === "responsive" &&
            assertion.expected?.density === "touch",
        ),
      ).toBe(true);
    }
  });

  it("uses a phone-visible toolbar action for final-row performance sampling", () => {
    const scenario = visualScenarios.find(
      (candidate) => candidate.id === "phone-dark-landscape",
    )!;
    expect(performanceActionForScenario(scenario)).toBe(
      "open-toolbar-overflow",
    );
  });

  it("isolates only the exact DevTools auxiliary target tree for cleanup", () => {
    expect(
      ownedAuxiliaryTargetIds(
        [
          { targetId: "devtools-worker", parentId: "devtools-page" },
          { targetId: "devtools-frame", parentId: "devtools-page" },
          { targetId: "nested-worker", parentId: "devtools-frame" },
          { targetId: "unrelated-worker", parentId: "ordinary-page" },
          { targetId: "orphan-worker" },
        ],
        "devtools-page",
      ),
    ).toEqual(["devtools-worker", "devtools-frame", "nested-worker"]);
  });

  it("accepts the proxy's empty success response for non-page cleanup", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 200 }));
    const adapter = new ChromeProxyAdapter("http://proxy.invalid");

    await expect(adapter.closeTarget("auxiliary-target")).resolves.toEqual({
      success: true,
    });
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/close",
        searchParams: expect.any(URLSearchParams),
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    request.mockRestore();
  });
});

describe("declarative manifest", () => {
  it("has stable unique identities and deterministic filtering", () => {
    expect(visualScenarios.length).toBeGreaterThanOrEqual(19);
    expect(new Set(visualScenarios.map((scenario) => scenario.id)).size).toBe(
      visualScenarios.length,
    );
    expect(
      filterScenarios(visualScenarios, "tablet").map((scenario) => scenario.id),
    ).toEqual(["tablet-dark-library", "tablet-light-properties"]);
    expect(defineVisualScenarios(structuredClone(visualScenarios))).toEqual(
      visualScenarios,
    );
  });

  it.each([
    ["duplicate id", (copy: VisualScenario[]) => copy.push({ ...copy[0] })],
    [
      "duplicate stem",
      (copy: VisualScenario[]) => copy.push({ ...copy[0], id: "unique-id" }),
    ],
    [
      "invalid geometry",
      (copy: VisualScenario[]) =>
        (copy[0] = { ...copy[0], geometry: { ...copy[0].geometry, width: 0 } }),
    ],
    [
      "invalid dpr",
      (copy: VisualScenario[]) =>
        (copy[0] = {
          ...copy[0],
          geometry: { ...copy[0].geometry, deviceScaleFactor: 3 },
        }),
    ],
    [
      "unsafe stem",
      (copy: VisualScenario[]) =>
        (copy[0] = { ...copy[0], artifactStem: "../escape" }),
    ],
    [
      "missing assertions",
      (copy: VisualScenario[]) => (copy[0] = { ...copy[0], assertions: [] }),
    ],
    [
      "undeclared setup",
      (copy: VisualScenario[]) => (copy[0] = { ...copy[0], setup: "unknown" }),
    ],
    [
      "undeclared action",
      (copy: VisualScenario[]) =>
        (copy[0] = { ...copy[0], actions: ["unknown"] }),
    ],
    [
      "unbounded mask",
      (copy: VisualScenario[]) =>
        (copy[0] = {
          ...copy[0],
          masks: [
            { selector: ".x", reason: "clock", maxArea: 999999, maxRatio: 1 },
          ],
        }),
    ],
    [
      "missing budget source",
      (copy: VisualScenario[]) =>
        (copy[0] = {
          ...copy[0],
          performance: {
            source: "guess",
            allowance: "none",
            requiredMetrics: ["harnessDuration"],
            limits: { harnessDuration: 1 },
            samples: 3,
          },
        }),
    ],
  ])("rejects %s before browser work", (_label, mutate) => {
    const copy = [validScenario()];
    mutate(copy);
    expect(() => defineVisualScenarios(copy)).toThrow();
  });

  it("uses one manifest identity for automation and human replay", () => {
    const replay = renderReplayChecklist(visualScenarios, "implementer");
    for (const scenario of visualScenarios) {
      expect(replay).toContain(`## ${scenario.id}`);
      expect(replay).toContain(canonicalFilename(scenario));
    }
    expect(replay).not.toContain("reviewer visual replay");
  });
});

describe("fixtures and filenames", () => {
  it("creates byte-stable fixed fixtures", () => {
    expect(JSON.stringify(createSceneFixture("selected-rectangle"))).toBe(
      JSON.stringify(createSceneFixture("selected-rectangle")),
    );
    expect(JSON.stringify(createApplicationFixtures())).toBe(
      JSON.stringify(createApplicationFixtures()),
    );
    expect(createApplicationFixtures().library).toMatchObject({
      id: "visual-library-01",
      name: "Reusable card",
      scene: "selected-rectangle",
    });
    expect(
      visualScenarios
        .filter((scenario) => scenario.tags.includes("library"))
        .every((scenario) =>
          scenario.assertions.some(
            (assertion) =>
              assertion.selector.includes("visual-library-01") &&
              assertion.expected?.name === "Reusable card",
          ),
        ),
    ).toBe(true);
    expect(FIXTURE_VERSION).toBe("visual-fixtures-v1");
  });

  it("requires the exact populated Library item semantics", () => {
    const fixture = createApplicationFixtures().library;
    const scenario = visualScenarios.find(
      (candidate) => candidate.id === "desktop-library",
    )!;
    const assertion = scenario.assertions.find(
      (candidate) => candidate.id === "library-content",
    )!;

    expect(
      semanticFailure(assertion, {
        facts: { visible: true, name: fixture.name },
      }),
    ).toEqual([]);
    expect(
      semanticFailure(assertion, {
        facts: { visible: true, name: "Different item" },
      }),
    ).toContain("library-content: accessible name Different item");
    expect(
      semanticFailure(assertion, {
        facts: { visible: false, name: null },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("expected visible"),
        "library-content: accessible name null",
      ]),
    );
    expect(assertion.selector).toContain(fixture.id);
  });

  it("encodes geometry, theme, direction, state, and noncanonical role suffixes", () => {
    const scenario = visualScenarios[0];
    expect(canonicalFilename(scenario)).toBe(
      "desktop-welcome__1440x900__dpr1__light__ltr__welcome.png",
    );
    expect(roleFilename(scenario, "reviewer", "round-1", "current")).toContain(
      "__reviewer__round-1__current.png",
    );
    expect(canonicalFilename(scenario)).not.toContain("reviewer");
  });

  it("prevents path escape and role mixing", () => {
    expect(() => parseVisualRole("unknown")).toThrow(/Invalid/);
    expect(() => parseVisualWorkerRole("reviewer")).toThrow(/hard-coded/);
    expect(() => baselinePath("..", "escape.png")).toThrow(/escapes/);
    expect(() =>
      evidencePath("implementer", "..", "reviewer", "x.png"),
    ).toThrow(/escapes/);
    expect(() =>
      assertRoleMayWrite(
        "reviewer",
        evidencePath("implementer", "screenshots", "x.png"),
        "evidence",
      ),
    ).toThrow(/escapes|Reviewer/);
    expect(() =>
      assertRoleMayWrite("reviewer", baselinePath("x.png"), "evidence"),
    ).toThrow();
    expect(() =>
      assertRoleMayWrite(
        "reviewer",
        candidatePath("reviewer", "round", "x.png"),
        "candidate",
      ),
    ).toThrow(/Reviewer/);
    expect(() =>
      assertRoleMayWrite(
        "fixer",
        resultPath("implementer", "round", "x.png"),
        "result",
      ),
    ).toThrow(/escapes/);
    expect(() =>
      assertRoleMayWrite(
        "fixer",
        evidencePath("fixer", "screenshots", "x.png"),
        "evidence",
      ),
    ).not.toThrow();
  });
});

describe("guarded artifact writer", () => {
  const expectFileAbsent = async (file: string) => {
    await expect(readFile(file)).rejects.toMatchObject({ code: "ENOENT" });
  };

  it("rejects an invalid runtime role before proxy preflight or target creation", async () => {
    let preflightCalls = 0;
    let createTargetCalls = 0;
    const proxy = {
      preflight: async () => {
        preflightCalls += 1;
        return {
          metadata: {
            platform: "win32-x64",
            browser: "Chrome",
            node: process.version,
          },
          health: { chromePort: 9222 },
        };
      },
      createTarget: async () => {
        createTargetCalls += 1;
        throw new Error("createTarget must not run");
      },
    } as unknown as ChromeProxyAdapter;

    await expect(
      runVisualScenarios({
        scenarios: [validScenario()],
        mode: "verify",
        role: "untrusted-role",
        runId: "invalid-role",
        proxy,
      }),
    ).rejects.toThrow(/Invalid visual artifact role/);
    expect(preflightCalls).toBe(0);
    expect(createTargetCalls).toBe(0);

    await expect(
      runVisualScenarios({
        scenarios: [validScenario()],
        mode: "update",
        role: "reviewer",
        runId: "reviewer-update",
        proxy,
      }),
    ).rejects.toThrow(/Reviewer/);
    expect(preflightCalls).toBe(0);
    expect(createTargetCalls).toBe(0);
  });

  it("hard-codes reviewer authority in the reviewer verify entry", async () => {
    let received: Parameters<typeof runVisualScenarios>[0] | null = null;
    const fakeRunner = async (
      options: Parameters<typeof runVisualScenarios>[0],
    ) => {
      received = options;
      return { role: options.role } as Awaited<
        ReturnType<typeof runVisualScenarios>
      >;
    };
    const previousRole = process.env.VISUAL_ROLE;
    process.env.VISUAL_ROLE = "implementer";
    try {
      await runReviewerVisualVerification(
        { scenarios: [], runId: "reviewer-entry-smoke" },
        fakeRunner,
      );
    } finally {
      if (previousRole === undefined) {
        delete process.env.VISUAL_ROLE;
      } else {
        process.env.VISUAL_ROLE = previousRole;
      }
    }
    expect(received).toMatchObject({ mode: "verify", role: "reviewer" });
  });

  it("couples real writes to role ownership and leaves forbidden files absent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "visual-writer-test-"));
    const roots: VisualArtifactRoots = {
      baseline: path.join(root, "baselines"),
      candidate: path.join(root, "candidates"),
      result: path.join(root, "results"),
      evidence: path.join(root, "evidence"),
    };
    try {
      const reviewer = createArtifactWriter("reviewer", roots);
      const reviewerResult = path.join(
        roots.result,
        "reviewer",
        "round-1",
        "result.json",
      );
      const reviewerEvidence = path.join(
        roots.evidence,
        "reviewer",
        "run-round-1.json",
      );
      await reviewer.writeStableJson("result", reviewerResult, {
        role: "reviewer",
      });
      await reviewer.writeStableJson("evidence", reviewerEvidence, {
        role: "reviewer",
      });
      expect(JSON.parse(await readFile(reviewerResult, "utf8"))).toEqual({
        role: "reviewer",
      });
      expect(JSON.parse(await readFile(reviewerEvidence, "utf8"))).toEqual({
        role: "reviewer",
      });

      const forbidden = [
        {
          kind: "result" as const,
          file: path.join(
            roots.result,
            "implementer",
            "round-1",
            "forbidden.json",
          ),
        },
        {
          kind: "result" as const,
          file: path.join(roots.result, "fixer", "round-1", "forbidden.json"),
        },
        {
          kind: "evidence" as const,
          file: path.join(roots.evidence, "implementer", "forbidden.json"),
        },
        {
          kind: "candidate" as const,
          file: path.join(
            roots.candidate,
            "reviewer",
            "round-1",
            "forbidden.png",
          ),
        },
        {
          kind: "canonical" as const,
          file: path.join(roots.baseline, "forbidden.png"),
        },
      ];
      for (const attempt of forbidden) {
        let callbackInvoked = false;
        await expect(
          reviewer.writeThrough(attempt.kind, attempt.file, async () => {
            callbackInvoked = true;
          }),
        ).rejects.toThrow(/Reviewer|escapes/);
        expect(callbackInvoked).toBe(false);
        await expectFileAbsent(attempt.file);
      }

      expect(() => assertRoleMayRun("reviewer", "update")).toThrow(/Reviewer/);
      expect(() => assertRoleMayRun("reviewer", "promote")).toThrow(/Reviewer/);
      await expect(
        promoteInspectedCandidates({
          scenarios: [],
          role: "reviewer",
          runId: "forbidden-promotion",
          inspectionFile: path.join(root, "absent-inspection.json"),
        }),
      ).rejects.toThrow(/Reviewer/);

      const implementer = createArtifactWriter("implementer", roots);
      const canonical = path.join(roots.baseline, "approved.png");
      await implementer.writeFileAtomically(
        "canonical",
        canonical,
        new Uint8Array([1, 2, 3]),
      );
      expect(await readFile(canonical)).toEqual(Buffer.from([1, 2, 3]));
      await expectFileAbsent(`${canonical}.candidate`);

      const fixer = createArtifactWriter("fixer", roots);
      const fixerCandidate = path.join(
        roots.candidate,
        "fixer",
        "round-1",
        "candidate.png",
      );
      await fixer.writeFile(
        "candidate",
        fixerCandidate,
        new Uint8Array([4, 5, 6]),
      );
      expect(await readFile(fixerCandidate)).toEqual(Buffer.from([4, 5, 6]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects junction, nearest-parent, lexical, and canonical-temp escapes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "visual-writer-link-"));
    const outside = await mkdtemp(
      path.join(os.tmpdir(), "visual-writer-outside-"),
    );
    const roots: VisualArtifactRoots = {
      baseline: path.join(root, "baselines"),
      candidate: path.join(root, "candidates"),
      result: path.join(root, "results"),
      evidence: path.join(root, "evidence"),
    };
    try {
      const reviewerRoot = path.join(roots.evidence, "reviewer");
      await mkdir(reviewerRoot, { recursive: true });
      const junction = path.join(reviewerRoot, "escape-link");
      await symlink(
        outside,
        junction,
        process.platform === "win32" ? "junction" : "dir",
      );
      const escapedByJunction = path.join(junction, "forbidden.json");
      const reviewer = createArtifactWriter("reviewer", roots);
      await expect(
        reviewer.writeStableJson("evidence", escapedByJunction, {
          forbidden: true,
        }),
      ).rejects.toThrow(/symlink|junction|escapes/);
      await expectFileAbsent(path.join(outside, "forbidden.json"));

      const outsideHardLinkTarget = path.join(outside, "hard-link-target.json");
      await writeFile(outsideHardLinkTarget, "preserve-me", "utf8");
      const hardLink = path.join(reviewerRoot, "hard-link.json");
      await link(outsideHardLinkTarget, hardLink);
      await expect(
        reviewer.writeStableJson("evidence", hardLink, { forbidden: true }),
      ).rejects.toThrow(/hard link/);
      expect(await readFile(outsideHardLinkTarget, "utf8")).toBe("preserve-me");

      const lexicalEscape = path.resolve(
        reviewerRoot,
        "..",
        "implementer",
        "forbidden.json",
      );
      await expect(
        reviewer.writeStableJson("evidence", lexicalEscape, {}),
      ).rejects.toThrow(/escapes/);
      await expectFileAbsent(lexicalEscape);

      const implementer = createArtifactWriter("implementer", roots);
      await mkdir(roots.baseline, { recursive: true });
      const canonical = path.join(roots.baseline, "temp-guard.png");
      const temporary = `${canonical}.candidate`;
      await symlink(
        outside,
        temporary,
        process.platform === "win32" ? "junction" : "dir",
      );
      await expect(
        implementer.writeFileAtomically(
          "canonical",
          canonical,
          new Uint8Array([7, 8, 9]),
        ),
      ).rejects.toThrow(/symlink|junction/);
      await expectFileAbsent(canonical);
      await expectFileAbsent(path.join(outside, "temp-guard.png"));

      const outsideCanonical = path.join(outside, "canonical-target.png");
      await writeFile(outsideCanonical, "preserve-canonical", "utf8");
      const hardLinkedCanonical = path.join(
        roots.baseline,
        "hard-linked-canonical.png",
      );
      await link(outsideCanonical, hardLinkedCanonical);
      await expect(
        implementer.writeFileAtomically(
          "canonical",
          hardLinkedCanonical,
          new Uint8Array([10, 11, 12]),
        ),
      ).rejects.toThrow(/hard link/);
      expect(await readFile(outsideCanonical, "utf8")).toBe(
        "preserve-canonical",
      );
      await expectFileAbsent(`${hardLinkedCanonical}.candidate`);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });
});

describe("PNG codec and bounded comparison", () => {
  it("round-trips deterministic RGBA PNGs and exact matches", () => {
    const png = solid(3, 2, [20, 40, 60, 255]);
    expect(decodePng(png)).toEqual({
      width: 3,
      height: 2,
      data: new Uint8Array([
        20, 40, 60, 255, 20, 40, 60, 255, 20, 40, 60, 255, 20, 40, 60, 255, 20,
        40, 60, 255, 20, 40, 60, 255,
      ]),
    });
    const result = comparePng({
      expected: png,
      current: png,
      policy: validScenario().comparison,
    });
    expect(result).toMatchObject({
      pass: true,
      mismatchCount: 0,
      changedBounds: null,
    });
    expect(pngHash(result.diff)).toHaveLength(64);
  });

  it("normalizes Chrome-style 8-bit RGB PNGs to opaque RGBA", () => {
    const rgba = {
      width: 2,
      height: 1,
      data: new Uint8Array([20, 40, 60, 255, 80, 100, 120, 255]),
    };
    const rgb = encodePng(rgba, { colorType: "rgb" });
    expect(rgb[25]).toBe(2);
    expect(decodePng(rgb)).toEqual(rgba);
  });

  it("reports threshold breaches, changed bounds, bounded masks, and deterministic diffs", () => {
    const expected = solid(10, 10, [255, 255, 255, 255]);
    const decoded = decodePng(expected);
    decoded.data.set([0, 0, 0, 255], (4 * 10 + 5) * 4);
    const current = encodePng(decoded);
    const policy = { ...validScenario().comparison, maxMismatchRatio: 0 };
    const first = comparePng({ expected, current, policy });
    const second = comparePng({ expected, current, policy });
    expect(first).toMatchObject({
      pass: false,
      mismatchCount: 1,
      changedBounds: { x: 5, y: 4, width: 1, height: 1 },
    });
    expect(first.diff).toEqual(second.diff);
    expect(
      comparePng({
        expected,
        current,
        policy: { ...policy, maxMaskRatio: 0.02 },
        masks: [
          { x: 5, y: 4, width: 1, height: 1, reason: "bounded fixture pixel" },
        ],
      }).pass,
    ).toBe(true);
    expect(() =>
      comparePng({
        expected,
        current,
        policy,
        masks: [{ x: 0, y: 0, width: 10, height: 10, reason: "blanket" }],
      }),
    ).toThrow(/bounded/);
  });

  it("rejects dimension mismatch and corrupt PNGs", () => {
    expect(() =>
      comparePng({
        expected: solid(2, 2, [0, 0, 0, 255]),
        current: solid(3, 2, [0, 0, 0, 255]),
        policy: validScenario().comparison,
      }),
    ).toThrow(/dimension/);
    expect(() => decodePng(new Uint8Array([1, 2, 3]))).toThrow(/signature/);
  });
});

describe("baseline governance", () => {
  const passingResult = (
    scenario: VisualScenario,
    image: Uint8Array,
  ): VisualScenarioResult => ({
    scenarioId: scenario.id,
    status: "pass",
    expectedPath: baselinePath(canonicalFilename(scenario)),
    currentPath: "current.png",
    diffPath: null,
    reportPath: "result.json",
    expectedHash: null,
    currentHash: pngHash(image),
    diffHash: null,
    mismatchCount: null,
    mismatchRatio: null,
    changedBounds: null,
    maskCount: 0,
    maskRatio: 0,
    semanticFailures: [],
    cleanupFailures: [],
    performance: { warmup: null, samples: [], medians: {}, failures: [] },
    environment: {
      checkerOverlays: 0,
      consoleErrors: 0,
      restorationVerified: true,
    },
  });

  it("hashes directories before and after reads without writes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "visual-baseline-test-"));
    try {
      await mkdir(path.join(root, "nested"));
      await writeFile(
        path.join(root, "nested", "a.png"),
        solid(1, 1, [0, 0, 0, 255]),
      );
      const before = await directoryHash(root);
      await readFile(path.join(root, "nested", "a.png"));
      expect(await directoryHash(root)).toBe(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("validates image hash, manifest identity, dimensions, approval, and budget source", () => {
    const scenario = validScenario();
    const image = solid(2, 2, [0, 0, 0, 255]);
    const metadata: VisualBaselineMetadata = {
      schemaVersion: 1,
      scenarioId: scenario.id,
      filename: canonicalFilename(scenario),
      width: 2,
      height: 2,
      deviceScaleFactor: 1,
      crop: {
        selector: ".excalidraw",
        target: { x: 0, y: 0, width: 2, height: 2 },
        editor: { x: 0, y: 0, width: 2, height: 2 },
      },
      browser: "Chrome",
      platform: "win32-x64",
      fontVersion: "repository-fonts-v1",
      fixtureVersion: FIXTURE_VERSION,
      comparison: scenario.comparison,
      imageHash: pngHash(image),
      budgetSource: null,
      approval: "intentional-change",
      approvedBy: "implementer",
      inspectedAt: "2026-08-13T00:00:00Z",
      sourceFingerprint: "a".repeat(64),
    };
    expect(() =>
      validateBaselineMetadata(metadata, image, scenario),
    ).not.toThrow();
    expect(() =>
      validateBaselineMetadata(
        { ...metadata, approvedBy: "fixer" },
        image,
        scenario,
      ),
    ).not.toThrow();
    expect(() =>
      validateBaselineMetadata(
        { ...metadata, approvedBy: "reviewer" },
        image,
        scenario,
      ),
    ).toThrow(/approval/);
    expect(() =>
      validateBaselineMetadata(
        { ...metadata, imageHash: "bad" },
        image,
        scenario,
      ),
    ).toThrow(/imageHash/);
  });

  it("rejects task-outside tracked changes before source fingerprinting", async () => {
    const readSource = async (file: string) => `source:${file}`;
    await expect(
      fingerprintImplementationSources({
        tracked: ["packages/excalidraw/index.tsx"],
        untracked: ["scripts/visual-regression/runner.ts"],
        readSource,
      }),
    ).rejects.toThrow(/task-outside/);
    const first = await fingerprintImplementationSources({
      tracked: ["package.json"],
      untracked: ["scripts/visual-regression/runner.ts"],
      readSource,
    });
    const second = await fingerprintImplementationSources({
      tracked: ["package.json"],
      untracked: ["scripts/visual-regression/runner.ts"],
      readSource,
    });
    expect(first).toEqual(second);
  });

  it("requires an exact caller-supplied source fingerprint", () => {
    expect(() =>
      assertSourceFingerprint("b".repeat(64), "a".repeat(64), ["package.json"]),
    ).toThrow(/VISUAL_SOURCE_FINGERPRINT/);
    expect(() =>
      assertSourceFingerprint("a".repeat(64), "a".repeat(64), ["package.json"]),
    ).not.toThrow();
  });

  it("writes candidates only after semantic, performance, and cleanup pass", () => {
    expect(() =>
      assertCandidateMayBeWritten({
        status: "pass",
        semanticFailures: [],
        cleanupFailures: [],
        performanceFailures: [],
        restorationVerified: true,
        checkerOverlays: 0,
      }),
    ).not.toThrow();
    expect(() =>
      assertCandidateMayBeWritten({
        status: "pass",
        semanticFailures: [],
        cleanupFailures: ["target-close"],
        performanceFailures: [],
        restorationVerified: true,
        checkerOverlays: 0,
      }),
    ).toThrow(/target-close/);
    expect(() =>
      assertCandidateMayBeWritten({
        status: "pass",
        semanticFailures: [],
        cleanupFailures: [],
        performanceFailures: [],
        restorationVerified: false,
        checkerOverlays: 0,
      }),
    ).toThrow(/restoration was not verified/);
    expect(() =>
      assertCandidateMayBeWritten({
        status: "pass",
        semanticFailures: [],
        cleanupFailures: [],
        performanceFailures: [],
        restorationVerified: true,
        checkerOverlays: 1,
      }),
    ).toThrow(/checkerOverlays/);
  });

  it("keeps pixel drift review-only in update mode while preserving every runtime gate", () => {
    expect(
      resolveScenarioStatus({
        mode: "update",
        performanceFailures: [],
        semanticFailures: [],
        comparisonPassed: false,
        baselineExists: true,
      }),
    ).toBe("pass");
    expect(
      resolveScenarioStatus({
        mode: "verify",
        performanceFailures: [],
        semanticFailures: [],
        comparisonPassed: false,
        baselineExists: true,
      }),
    ).toBe("fail");
    expect(
      resolveScenarioStatus({
        mode: "update",
        performanceFailures: [],
        semanticFailures: ["checker diagnostics"],
        comparisonPassed: false,
        baselineExists: true,
      }),
    ).toBe("fail");
  });

  it("rejects incomplete, duplicate, or stale personal image inspections", () => {
    const scenario = validScenario();
    const image = solid(2, 2, [0, 0, 0, 255]);
    const validEntry = {
      scenarioId: scenario.id,
      filename: canonicalFilename(scenario),
      imageHash: pngHash(image),
      width: 2,
      height: 2,
      classification: "intentional-change" as const,
      observations: ["hierarchy checked", "clipping checked", "theme checked"],
    };
    expect(() =>
      assertValidInspectionEntry({ entry: validEntry, scenario, image }),
    ).not.toThrow();
    expect(() =>
      assertValidInspectionEntry({
        entry: { ...validEntry, observations: ["same", "same", "same"] },
        scenario,
        image,
      }),
    ).toThrow(/inspection/);
    expect(() =>
      assertValidInspectionEntry({
        entry: { ...validEntry, imageHash: "a".repeat(64) },
        scenario,
        image,
      }),
    ).toThrow(/inspection/);
  });

  it("requires current passing result provenance before promotion", () => {
    const scenario = validScenario();
    const image = solid(2, 2, [0, 0, 0, 255]);
    const result = passingResult(scenario, image);
    const resultBytes = new TextEncoder().encode("result");
    const metadata: VisualCandidateMetadata = {
      schemaVersion: 1,
      scenarioId: scenario.id,
      filename: canonicalFilename(scenario),
      imageHash: pngHash(image),
      width: 2,
      height: 2,
      role: "implementer",
      runId: "current-run",
      status: "pass",
      sourceFingerprint: "a".repeat(64),
      resultHash:
        "f6a214f7a29f7e603b0f47a5e55a264e8bcfbaae28c9a45c2f5a6f5d9cf12864",
    };
    // The literal above is intentionally invalid; the negative case proves a
    // sidecar copied from another run cannot be promoted.
    expect(() =>
      assertValidCandidateMetadata({
        metadata,
        scenario,
        image,
        role: "implementer",
        runId: "current-run",
        sourceFingerprint: "a".repeat(64),
        result,
        resultBytes,
      }),
    ).toThrow(/provenance/);
    expect(() =>
      assertValidCandidateMetadata({
        metadata: {
          ...metadata,
          resultHash: createHash("sha256").update(resultBytes).digest("hex"),
        },
        scenario,
        image,
        role: "reviewer",
        runId: "current-run",
        sourceFingerprint: "a".repeat(64),
        result,
        resultBytes,
      }),
    ).toThrow(/provenance/);
    const currentMetadata = {
      ...metadata,
      resultHash: createHash("sha256").update(resultBytes).digest("hex"),
    };
    expect(() =>
      assertValidCandidateMetadata({
        metadata: currentMetadata,
        scenario,
        image,
        role: "implementer",
        runId: "current-run",
        sourceFingerprint: "a".repeat(64),
        result,
        resultBytes,
      }),
    ).not.toThrow();
    expect(() =>
      assertValidCandidateMetadata({
        metadata: currentMetadata,
        scenario,
        image,
        role: "implementer",
        runId: "current-run",
        sourceFingerprint: "a".repeat(64),
        result: {
          ...result,
          environment: {
            ...result.environment,
            restorationVerified: false,
          },
        },
        resultBytes,
      }),
    ).toThrow(/provenance/);
    expect(() =>
      assertValidCandidateMetadata({
        metadata: currentMetadata,
        scenario,
        image,
        role: "implementer",
        runId: "current-run",
        sourceFingerprint: "a".repeat(64),
        result: {
          ...result,
          environment: { ...result.environment, checkerOverlays: 1 },
        },
        resultBytes,
      }),
    ).toThrow(/checkerOverlays/);
  });
});

describe("checker diagnostics", () => {
  class FakeElement {
    public id = "";
    public textContent = "";
    public shadowRoot: {
      querySelectorAll: (selector: string) => FakeElement[];
    } | null = null;
    public rect = { x: 0, y: 0, width: 0, height: 0 };
    public style = {
      display: "block",
      visibility: "visible",
      opacity: "1",
      contentVisibility: "visible",
      position: "static",
    };

    public getBoundingClientRect() {
      return {
        ...this.rect,
        top: this.rect.y,
        left: this.rect.x,
        right: this.rect.x + this.rect.width,
        bottom: this.rect.y + this.rect.height,
        toJSON: () => this.rect,
      };
    }
  }

  const scan = ({
    hosts = [],
    alerts = [],
  }: {
    hosts?: FakeElement[];
    alerts?: FakeElement[];
  }) =>
    scanCheckerDiagnostics(
      {
        querySelectorAll: (selector: string) =>
          (selector === "[role='alert']" ? alerts : hosts) as never,
      },
      FakeElement as unknown as typeof HTMLElement,
      ((node: FakeElement) => node.style) as unknown as typeof getComputedStyle,
    );

  const shadowHost = ({
    badges = [],
    windows = [],
  }: {
    badges?: FakeElement[];
    windows?: FakeElement[];
  }) => {
    const host = new FakeElement();
    host.shadowRoot = {
      querySelectorAll: (selector) =>
        selector === ".badge-base" ? badges : windows,
    };
    return host;
  };

  it("finds a visible fixed shadow badge even when its checker host has zero size", () => {
    const badge = new FakeElement();
    badge.textContent = "2 errors / 0 warnings";
    badge.rect = { x: 16, y: 760, width: 86, height: 35 };
    badge.style.position = "fixed";
    const diagnostics = scan({ hosts: [shadowHost({ badges: [badge] })] });
    expect(diagnostics).toMatchObject({
      hostCount: 1,
      visibleHostCount: 0,
      badgeCount: 1,
      windowCount: 0,
      overlays: 1,
    });
    expect(diagnostics.badges[0].text).toBe("2 errors / 0 warnings");
  });

  it("records a visible shadow diagnostic window and accepts an empty host", () => {
    const diagnosticWindow = new FakeElement();
    diagnosticWindow.textContent = "Type diagnostics";
    diagnosticWindow.rect = { x: 20, y: 20, width: 600, height: 300 };
    expect(
      scan({ hosts: [shadowHost({ windows: [diagnosticWindow] })] }),
    ).toMatchObject({ badgeCount: 0, windowCount: 1, overlays: 1 });
    expect(scan({ hosts: [shadowHost({})] })).toMatchObject({
      badgeCount: 0,
      windowCount: 0,
      overlays: 0,
    });
    expect(scan({})).toMatchObject({ hostCount: 0, overlays: 0 });
  });

  it("blocks screenshots on pre-audit diagnostics and fails a post-audit race", async () => {
    const clean = scan({});
    const visible = {
      ...clean,
      badgeCount: 1,
      overlays: 1,
      badges: [
        {
          hostIndex: 0,
          text: "late diagnostic",
          rect: { x: 0, y: 0, width: 80, height: 30 },
        },
      ],
    };
    let captures = 0;
    await expect(
      captureWithCheckerAudit({
        readDiagnostics: async () => visible,
        capture: async () => {
          captures += 1;
        },
      }),
    ).rejects.toThrow(/Screenshot refused/);
    expect(captures).toBe(0);

    const sequence = [clean, visible];
    const raced = await captureWithCheckerAudit({
      readDiagnostics: async () => sequence.shift()!,
      capture: async () => {
        captures += 1;
      },
    });
    expect(captures).toBe(1);
    expect(checkerFailureMessages(raced)).toEqual([
      expect.stringContaining("late diagnostic"),
    ]);
  });
});

describe("lifecycle, semantics, and internal boundary", () => {
  it("keeps the captured main app owner stable when the dev singleton rebinds", () => {
    const main = {
      api: { id: "main-api" },
      library: { id: "main-library" },
      state: { showWelcomeScreen: true },
      setState(next: { showWelcomeScreen: boolean }) {
        this.state = next;
      },
    };
    const fixture = {
      api: { id: "fixture-api" },
      library: { id: "fixture-library" },
      state: { showWelcomeScreen: false },
      setState(next: { showWelcomeScreen: boolean }) {
        this.state = next;
      },
    };
    const devHook = { app: main };
    const captured = captureVisualAppOwner(devHook.app);

    devHook.app = fixture;
    captured.app.setState({ showWelcomeScreen: true });

    expect(captured.app).toBe(main);
    expect(captured.api).toBe(main.api);
    expect(captured.library).toBe(main.library);
    expect(main.state.showWelcomeScreen).toBe(true);
    expect(fixture.state.showWelcomeScreen).toBe(false);
  });

  it("rejects every false or missing fresh restoration observation", () => {
    const host = Object.fromEntries(
      REQUIRED_HOST_RESTORATION_FACTS.map((fact) => [fact, true]),
    );
    const input = { pointer: "fine", hover: true, touchPoints: 10 } as const;
    const valid = {
      host,
      inputPrior: input,
      inputPostQuery: { ...input },
      consoleClean: true,
    };
    expect(deriveRestorationVerified(valid)).toBe(true);
    for (const fact of REQUIRED_HOST_RESTORATION_FACTS) {
      const failed = {
        ...valid,
        host: { ...host, [fact]: false },
      };
      expect(deriveRestorationVerified(failed)).toBe(false);
      expect(failedRestorationFacts(failed)).toContain(`host.${fact}`);
    }
    expect(deriveRestorationVerified({ ...valid, host: null })).toBe(false);
    expect(
      deriveRestorationVerified({
        ...valid,
        inputPostQuery: { ...input, touchPoints: 1 },
      }),
    ).toBe(false);
    expect(deriveRestorationVerified({ ...valid, consoleClean: false })).toBe(
      false,
    );
  });

  it("uses the stable debugger owner marker and no position-style heuristic", async () => {
    const [debugCanvas, host, browserScripts, runner] = await Promise.all([
      readFile("excalidraw-app/components/DebugCanvas.tsx", "utf8"),
      readFile("excalidraw-app/visualRegressionHost.tsx", "utf8"),
      readFile("scripts/visual-regression/browserScripts.ts", "utf8"),
      readFile("scripts/visual-regression/runner.ts", "utf8"),
    ]);
    expect(debugCanvas).toContain('data-visual-debugger-canvas="true"');
    expect(host).toContain("DEBUG_CANVAS_SELECTOR");
    expect(host).not.toContain("canvas[style*='position: fixed']");
    expect(browserScripts).toContain("queryRestoration()");
    expect(runner).toContain('"post-restore-host-query"');
  });

  it("accepts exact trusted multi-editor update, unmount, and restoration facts", () => {
    expect(() =>
      assertMultiEditorLifecycleFacts(validMultiEditorLifecycle()),
    ).not.toThrow();
  });

  it("rejects a multi-editor fixture recorded before its initial scenes mount", () => {
    const evidence = validMultiEditorLifecycle();
    Object.assign(evidence.initial.left!, {
      scene: {
        elementCount: 0,
        activeElementCount: 0,
        elementIds: [],
        elementTypes: [],
      },
    });
    expect(() => assertMultiEditorLifecycleFacts(evidence)).toThrow(
      /immutable initial facts/,
    );
  });

  it("rejects left survivor scene loss during the multi-editor lifecycle", () => {
    const evidence = validMultiEditorLifecycle();
    Object.assign(evidence.updated.left!, {
      scene: {
        elementCount: 0,
        activeElementCount: 0,
        elementIds: [],
        elementTypes: [],
      },
    });
    expect(() => assertMultiEditorLifecycleFacts(evidence)).toThrow(
      /update state did not reach the exact expected facts/,
    );
  });

  it("waits for delayed canvas paint before accepting stable lifecycle readiness", async () => {
    const evidence = validMultiEditorLifecycle();
    const dataReadyButUnpainted = structuredClone(evidence.updated);
    Object.assign(dataReadyButUnpainted.left!.renderedScene!, {
      matchingPixels: 0,
      matchingRatio: 0,
      pixelSignature: "811c9dc5",
      paintPresent: false,
    });
    const observations = [
      dataReadyButUnpainted,
      structuredClone(dataReadyButUnpainted),
      evidence.updated,
      structuredClone(evidence.updated),
    ];
    let reads = 0;
    let captureCalls = 0;
    let publicationCalls = 0;
    const settleThenCaptureAndPublish = async () => {
      const receipt = await waitForStableMultiEditorSnapshot({
        expectedPhase: "updated",
        expectedControlCount: 1,
        timeoutMs: 1_000,
        readSnapshot: async () => {
          expect(captureCalls).toBe(0);
          expect(publicationCalls).toBe(0);
          const observation = observations[Math.min(reads, 3)];
          reads += 1;
          return structuredClone(observation);
        },
      });
      captureCalls += 1;
      publicationCalls += 1;
      return receipt;
    };
    const settled = await settleThenCaptureAndPublish();

    expect(reads).toBe(4);
    expect(captureCalls).toBe(1);
    expect(publicationCalls).toBe(1);
    expect(settled.left?.scene.elementIds).toEqual(["visual-rectangle-01"]);
    expect(settled.left?.renderedScene?.paintPresent).toBe(true);
  });

  it("rejects a data-ready lifecycle receipt whose rendered signature is absent", () => {
    const evidence = validMultiEditorLifecycle();
    Object.assign(evidence.initial.left!.renderedScene!, {
      matchingPixels: 0,
      matchingRatio: 0,
      pixelSignature: null,
      paintPresent: false,
    });
    expect(() => assertMultiEditorLifecycleFacts(evidence)).toThrow(
      /rendered scene/,
    );
  });

  it("rejects an updated phase marker when the right editor state is stale", () => {
    const evidence = validMultiEditorLifecycle();
    evidence.updated.right = structuredClone(evidence.initial.right);
    expect(() => assertMultiEditorLifecycleFacts(evidence)).toThrow(
      /update state did not reach the exact expected facts/,
    );
  });

  it("rejects left root or imperative API identity drift during update", () => {
    const rootDrift = validMultiEditorLifecycle();
    rootDrift.updated.left!.rootIdentity = "replacement-left-root";
    expect(() => assertMultiEditorLifecycleFacts(rootDrift)).toThrow(
      /update state did not reach the exact expected facts/,
    );

    const apiDrift = validMultiEditorLifecycle();
    apiDrift.updated.left!.apiIdentity = "replacement-left-api";
    expect(() => assertMultiEditorLifecycleFacts(apiDrift)).toThrow(
      /update state did not reach the exact expected facts/,
    );
  });

  it("rejects an unmounted right editor whose cached API is not destroyed", () => {
    const evidence = validMultiEditorLifecycle();
    evidence.unmounted.detachedRight!.apiDestroyed = false;
    expect(() => assertMultiEditorLifecycleFacts(evidence)).toThrow(
      /unmount cleanup or survivor isolation failed/,
    );
  });

  it("rejects right portal, aria-controls, or owner-claim residue", () => {
    for (const property of [
      "connectedSurfaces",
      "presentControlIds",
      "portalResidue",
    ] as const) {
      const evidence = validMultiEditorLifecycle();
      evidence.unmounted.detachedRight![property] = 1;
      expect(() => assertMultiEditorLifecycleFacts(evidence)).toThrow(
        /unmount cleanup or survivor isolation failed/,
      );
    }
    const claim = validMultiEditorLifecycle();
    claim.unmounted.detachedRight!.ownerClaimed = true;
    expect(() => assertMultiEditorLifecycleFacts(claim)).toThrow(
      /unmount cleanup or survivor isolation failed/,
    );
  });

  it("rejects survivor focus, geometry, or document-direction leakage", () => {
    const focus = validMultiEditorLifecycle();
    focus.unmounted.left!.focus.active = false;
    expect(() => assertMultiEditorLifecycleFacts(focus)).toThrow(
      /unmount cleanup or survivor isolation failed/,
    );

    const geometry = validMultiEditorLifecycle();
    geometry.unmounted.left!.rect.width += 24;
    geometry.unmounted.left!.rect.right += 24;
    expect(() => assertMultiEditorLifecycleFacts(geometry)).toThrow(
      /unmount cleanup or survivor isolation failed/,
    );

    const direction = validMultiEditorLifecycle();
    direction.unmounted.documentDirection = "rtl";
    expect(() => assertMultiEditorLifecycleFacts(direction)).toThrow(
      /unmount cleanup or survivor isolation failed/,
    );
  });

  it("rejects an unreachable blank-canvas coordinate and accepts only explicit state exclusions", () => {
    expect(() =>
      assertBlankRoutingObservation({
        applicable: true,
        reason: "no reachable physical blank canvas point inside the owner",
        canvas: false,
        neutral: true,
        point: { x: 100, y: 100 },
        insideOwner: true,
        editorInstanceId: "editor-instance-1",
        blockingLeaves: [],
      }),
    ).toThrow(/cannot reach canvas/);
    expect(() =>
      assertBlankRoutingObservation({
        applicable: false,
        reason: "application-owned recovery excludes editor routing",
        neutral: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertBlankRoutingObservation({
        applicable: false,
        reason: "modal isolation excludes background editor routing",
        neutral: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertBlankRoutingObservation({
        applicable: false,
        reason: "active text editing excludes destructive canvas routing",
        neutral: true,
        blockingState: "active-text-editing",
      }),
    ).not.toThrow();
    expect(() =>
      assertBlankRoutingObservation({
        applicable: false,
        reason: "active text editing excludes destructive canvas routing",
        neutral: true,
      }),
    ).toThrow(/Unexpected blank-routing exclusion/);
  });

  it("accepts correlated physical, trusted page, and editor-emitter coordinate receipts", () => {
    expect(() =>
      assertTrustedCoordinateResult(validTrustedCoordinateEvidence(), {
        requireEditorPath: true,
      }),
    ).not.toThrow();

    const genericControl = validTrustedCoordinateEvidence();
    genericControl.expectedEditorInstanceId = null;
    genericControl.editorSequenceBefore = null;
    genericControl.editor = null;
    expect(() =>
      assertTrustedCoordinateResult(genericControl, {
        requireEditorPath: false,
      }),
    ).not.toThrow();
  });

  it("reactivates and retries an exact coordinate when the first dispatch has no page receipt", async () => {
    const token = "trusted-coordinate-retry";
    const valid = validTrustedCoordinateEvidence();
    valid.token = token;
    valid.targetMode = "contained";
    valid.expectedEditorInstanceId = null;
    valid.editorSequenceBefore = null;
    valid.editor = null;
    valid.page!.token = token;
    let receiptReads = 0;
    let activations = 0;
    let clicks = 0;
    const proxy = {
      evaluateJson: async (_targetId: string, expression: string) => {
        if (
          expression.includes(
            "Trusted coordinate owner must resolve exactly once",
          )
        ) {
          return valid.physicalTarget;
        }
        receiptReads += 1;
        return {
          token,
          point: valid.point,
          targetMode: valid.targetMode,
          expectedEditorInstanceId: null,
          pageSequenceBefore: 0,
          editorSequenceBefore: null,
          page: receiptReads === 1 ? null : valid.page,
          editor: null,
        };
      },
      evaluate: async () => undefined,
      activateTarget: async (targetId: string) => {
        activations += 1;
        return {
          targetId,
          activated: true as const,
          windowHandle: "window-retry",
          observation: { visibility: "visible", focused: true },
        };
      },
      clickAt: async () => {
        clicks += 1;
        return { clicked: true, x: valid.point.x, y: valid.point.y };
      },
    } as unknown as ChromeProxyPort;

    await expect(
      dispatchTrustedCoordinateInput(proxy, "target-coordinate-retry", {
        token,
        point: valid.point,
        targetSelector: `[data-visual-target='${token}']`,
        ownerSelector: `[data-visual-owner='${token}']`,
        targetMode: "contained",
      }),
    ).resolves.toMatchObject({ page: valid.page });
    expect(activations).toBe(2);
    expect(clicks).toBe(2);
    expect(receiptReads).toBe(2);
  });

  it("rejects wrong coordinate ownership and untrusted page or editor receipts", () => {
    const wrongOwner = validTrustedCoordinateEvidence();
    wrongOwner.page!.ownerOwned = false;
    expect(() =>
      assertTrustedCoordinateResult(wrongOwner, { requireEditorPath: true }),
    ).toThrow(/target receipt failed/);

    const wrongInstance = validTrustedCoordinateEvidence();
    wrongInstance.editor!.instanceId = "editor-instance-2";
    expect(() =>
      assertTrustedCoordinateResult(wrongInstance, {
        requireEditorPath: true,
      }),
    ).toThrow(/editor handler receipt failed/);

    const untrustedPage = validTrustedCoordinateEvidence();
    untrustedPage.page!.isTrusted = false;
    expect(() =>
      assertTrustedCoordinateResult(untrustedPage, {
        requireEditorPath: true,
      }),
    ).toThrow(/target receipt failed/);

    const untrustedEditor = validTrustedCoordinateEvidence();
    untrustedEditor.editor!.isTrusted = false;
    expect(() =>
      assertTrustedCoordinateResult(untrustedEditor, {
        requireEditorPath: true,
      }),
    ).toThrow(/editor handler receipt failed/);
  });

  it("rejects absent editor consumption and unchanged default receipt sequences", () => {
    const noEditorReceipt = validTrustedCoordinateEvidence();
    noEditorReceipt.editor = null;
    expect(() =>
      assertTrustedCoordinateResult(noEditorReceipt, {
        requireEditorPath: true,
      }),
    ).toThrow(/editor handler receipt failed/);

    const unchangedEditor = validTrustedCoordinateEvidence();
    unchangedEditor.editor!.sequence = 0;
    expect(() =>
      assertTrustedCoordinateResult(unchangedEditor, {
        requireEditorPath: true,
      }),
    ).toThrow(/editor handler receipt failed/);

    const unchangedPage = validTrustedCoordinateEvidence();
    unchangedPage.page!.sequence = 0;
    expect(() =>
      assertTrustedCoordinateResult(unchangedPage, {
        requireEditorPath: true,
      }),
    ).toThrow(/target receipt failed/);
  });

  it("requires exact restoration of blank-routing selection, focus, and markers", () => {
    const restored = {
      restored: true,
      selection: true,
      surfaces: true,
      pointerState: true,
      scene: true,
      drawingState: true,
      focus: true,
      targetMarker: true,
      ownerMarker: true,
    };
    expect(() => assertBlankRoutingCleanup(restored)).not.toThrow();
    expect(() =>
      assertBlankRoutingCleanup({ ...restored, selection: false }),
    ).toThrow(/did not restore exactly/);
    expect(() =>
      assertBlankRoutingCleanup({ ...restored, scene: false }),
    ).toThrow(/did not restore exactly/);
    expect(() =>
      assertBlankRoutingCleanup({ ...restored, drawingState: false }),
    ).toThrow(/did not restore exactly/);
  });

  it("accepts trusted left, center, and right final-row transitions with no adjacent activation", () => {
    const samples = [0.15, 0.5, 0.85].map(validToolbarSample);
    expect(() => assertToolbarCoordinateSamples(samples)).not.toThrow();
    expect(() =>
      assertToolbarOpenFacts(validToolbarShell(true), {
        requireAdjacent: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertToolbarRestoredFacts(validToolbarShell(false), {
        requireAdjacent: true,
        requireTriggerFocus: true,
      }),
    ).not.toThrow();
  });

  it("rejects a wrong final row, an untrusted receipt, and an adjacent activation", () => {
    const wrongRow = [0.15, 0.5, 0.85].map(validToolbarSample);
    wrongRow[1].rowIdentity =
      "toolbar-owner-1|toolbar-arrow|menuitemradio|Arrow";
    expect(() => assertToolbarCoordinateSamples(wrongRow)).toThrow(
      /identity or activation/,
    );

    const untrusted = [0.15, 0.5, 0.85].map(validToolbarSample);
    untrusted[0].trusted.page!.isTrusted = false;
    expect(() => assertToolbarCoordinateSamples(untrusted)).toThrow(
      /target receipt failed/,
    );

    const adjacent = [0.15, 0.5, 0.85].map(validToolbarSample);
    adjacent[2].activation.adjacentClicks = 1;
    expect(() => assertToolbarCoordinateSamples(adjacent)).toThrow(
      /identity or activation/,
    );
  });

  it("requires computed shielding to restore and Escape to return trigger focus", () => {
    const unshielded = validToolbarShell(true);
    unshielded.adjacent.pointerEvents = "auto";
    expect(() =>
      assertToolbarOpenFacts(unshielded, { requireAdjacent: true }),
    ).toThrow(/owner or shielding/);

    const staleShield = validToolbarShell(false);
    staleShield.adjacent.ariaHidden = "true";
    expect(() =>
      assertToolbarRestoredFacts(staleShield, {
        requireAdjacent: true,
        requireTriggerFocus: true,
      }),
    ).toThrow(/restoration failed/);

    const lostFocus = validToolbarShell(false);
    lostFocus.triggerFocused = false;
    expect(() =>
      assertToolbarRestoredFacts(lostFocus, {
        requireAdjacent: true,
        requireTriggerFocus: true,
      }),
    ).toThrow(/restoration failed/);
  });

  it("requires the outside route to reach the exact editor receipt without stale trigger focus", () => {
    const trusted = validTrustedCoordinateEvidence();
    const closed = validToolbarShell(false);
    closed.triggerFocused = false;
    expect(() =>
      assertToolbarOutsideRoute({ applicable: true, trusted }, closed),
    ).not.toThrow();

    const missingEditor = validTrustedCoordinateEvidence();
    missingEditor.editor = null;
    expect(() =>
      assertToolbarOutsideRoute(
        { applicable: true, trusted: missingEditor },
        closed,
      ),
    ).toThrow(/outside canvas route|editor handler receipt/);

    const staleFocus = validToolbarShell(false);
    expect(() =>
      assertToolbarOutsideRoute(
        { applicable: true, trusted: validTrustedCoordinateEvidence() },
        staleFocus,
      ),
    ).toThrow(/outside canvas route/);
  });

  it("requires browser editor unmount and recreate cleanup without stale claims or helpers", () => {
    expect(() =>
      assertToolbarLifecycleFacts(validToolbarLifecycle()),
    ).not.toThrow();

    const staleClaim = validToolbarLifecycle();
    staleClaim.afterUnmount.ownerClaimed = true;
    expect(() => assertToolbarLifecycleFacts(staleClaim)).toThrow(
      /lifecycle cleanup failed/,
    );

    const missingRecreate = validToolbarLifecycle();
    missingRecreate.removed.mounts = [{ generation: 1, editorId: "editor-1" }];
    expect(() => assertToolbarLifecycleFacts(missingRecreate)).toThrow(
      /lifecycle cleanup failed/,
    );
  });

  it("requires visible application controls to receive trusted input and own the resulting surface", async () => {
    const closed = {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce({ ownerVisible: false, dialogName: null })
        .mockResolvedValueOnce({
          identity: "visible trigger",
          selector: ".trigger",
          visible: true,
          actionable: true,
        })
        .mockResolvedValueOnce({
          identity: "visible trigger",
          selector: ".trigger",
          type: "click",
          isTrusted: true,
          targetOwned: true,
        })
        .mockResolvedValueOnce({
          ownerIdentity: "owned application surface",
          visibleSurface: true,
          ownerSelector: ".owned-surface",
          focusInside: true,
          dialogName: "ttd",
          dialogTab: "mermaid",
        }),
      clickAt: vi.fn().mockResolvedValue({ clicked: true }),
    };
    await expect(
      executeInstruction(closed as never, "target", {
        type: "click-sequence",
        controls: [{ identity: "visible trigger", selector: ".trigger" }],
        ownerIdentity: "owned application surface",
        ownerSelector: ".owned-surface",
        dialogName: "ttd",
      }),
    ).resolves.toHaveLength(2);
    const alreadyOpen = {
      evaluate: vi
        .fn()
        .mockResolvedValue({ ownerVisible: true, dialogName: null }),
      clickAt: vi.fn(),
    };
    await expect(
      executeInstruction(alreadyOpen as never, "target", {
        type: "click-sequence",
        controls: [{ identity: "visible trigger", selector: ".trigger" }],
        ownerIdentity: "owned application surface",
        ownerSelector: ".owned-surface",
      }),
    ).rejects.toThrow(/begin closed/);
    expect(alreadyOpen.clickAt).not.toHaveBeenCalled();

    const blocked = {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce({ ownerVisible: false, dialogName: null })
        .mockResolvedValueOnce({
          identity: "visible trigger",
          visible: true,
          actionable: false,
          disabled: true,
          reachable: true,
        }),
      clickAt: vi.fn(),
    };
    await expect(
      executeInstruction(blocked as never, "target", {
        type: "click-sequence",
        controls: [{ identity: "visible trigger", selector: ".trigger" }],
        ownerIdentity: "owned application surface",
        ownerSelector: ".owned-surface",
      }),
    ).rejects.toThrow(/not actionable/);
    expect(blocked.clickAt).not.toHaveBeenCalled();

    const untrusted = {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce({ ownerVisible: false, dialogName: null })
        .mockResolvedValueOnce({
          identity: "visible trigger",
          visible: true,
          actionable: true,
        })
        .mockResolvedValueOnce({
          identity: "visible trigger",
          type: "click",
          isTrusted: false,
          targetOwned: true,
        }),
      clickAt: vi.fn().mockResolvedValue({ clicked: true }),
    };
    await expect(
      executeInstruction(untrusted as never, "target", {
        type: "click-sequence",
        controls: [{ identity: "visible trigger", selector: ".trigger" }],
        ownerIdentity: "owned application surface",
        ownerSelector: ".owned-surface",
      }),
    ).rejects.toThrow(/did not receive trusted input/);
  });

  it("restores in LIFO order and reports setup/run/restore/close/enumeration failures together", async () => {
    const order: string[] = [];
    const result = await runWithLifecycle({
      setup: async (stack) => {
        stack.push("first", () => order.push("first"));
        stack.push("second", () => {
          order.push("second");
          throw new Error("restore failed");
        });
      },
      run: async () => {
        throw new Error("capture failed");
      },
      verifyRestored: async () => {
        throw new Error("residual mutation");
      },
      close: async () => {
        throw new Error("close failed");
      },
      enumerate: async () => {
        throw new Error("enumeration failed");
      },
    });
    expect(order).toEqual(["second", "first"]);
    expect((result.primaryError as Error).message).toBe("capture failed");
    expect(result.cleanupFailures.map((entry) => entry.label)).toEqual([
      "second",
      "post-restore-verification",
      "target-close",
      "target-enumeration",
    ]);
  });

  it("post-queries after registered setup failure and publishes one final report last", async () => {
    const order: string[] = [];
    let reportExists = false;
    const guardedWriter = {
      writeStableJson: vi.fn(async () => {
        order.push("writer");
        reportExists = true;
      }),
    };
    const assertReportAbsent = () => expect(reportExists).toBe(false);

    const result = await runWithLifecycleAndPublish({
      setup: async (stack) => {
        stack.push("registered-before-throw", () => {
          assertReportAbsent();
          order.push("restore");
        });
        throw new Error("setup failed after registration");
      },
      run: async () => {
        throw new Error("run must not execute");
      },
      verifyRestored: async () => {
        assertReportAbsent();
        order.push("post-query");
      },
      close: async () => {
        assertReportAbsent();
        order.push("close");
        return { closed: true };
      },
      enumerate: async () => {
        assertReportAbsent();
        order.push("enumerate");
        return { absent: true };
      },
      publish: async (outcome) => {
        assertReportAbsent();
        order.push("publish");
        await guardedWriter.writeStableJson();
        expect(outcome.closeSucceeded).toBe(true);
        expect(outcome.enumerationSucceeded).toBe(true);
      },
    });

    expect((result.primaryError as Error).message).toBe(
      "setup failed after registration",
    );
    expect(result.restorationVerificationAttempted).toBe(true);
    expect(order).toEqual([
      "restore",
      "post-query",
      "close",
      "enumerate",
      "publish",
      "writer",
    ]);
    expect(guardedWriter.writeStableJson).toHaveBeenCalledTimes(1);
    expect(reportExists).toBe(true);
  });

  it("computes contrast and medians while failing unavailable samples", () => {
    expect(
      contrastRatio(
        parseComputedColor("rgb(0, 0, 0)"),
        parseComputedColor("rgb(255, 255, 255)"),
      ),
    ).toBe(21);
    expect(median([9, 1, 5])).toBe(5);
    expect(() => median([])).toThrow();
  });

  it("rejects an unnamed or unreadable top-level recovery heading", () => {
    const recovery = visualScenarios.find(
      (scenario) => scenario.id === "top-level-recovery",
    );
    const owner = recovery?.assertions.find(
      (assertion) => assertion.id === "recovery-owner",
    );
    const heading = recovery?.assertions.find(
      (assertion) => assertion.id === "recovery-heading",
    );
    const contrast = recovery?.assertions.find(
      (assertion) => assertion.id === "recovery-heading-contrast",
    );
    expect(owner).toBeDefined();
    expect(heading).toBeDefined();
    expect(contrast).toBeDefined();
    expect(
      semanticFailure(owner, {
        facts: {
          visible: true,
          role: "main",
          name: "The editor can be reopened",
          labelledBy: null,
          independentOfEditor: true,
        },
      }),
    ).toContain("recovery-owner: aria-labelledby null");
    expect(
      semanticFailure(heading, {
        facts: { visible: false, role: null, name: null },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("expected visible"),
        "recovery-heading: role null",
        "recovery-heading: accessible name null",
      ]),
    );
    expect(
      semanticFailure(heading, {
        facts: {
          visible: true,
          role: "heading",
          name: "Unexpected recovery",
        },
      }),
    ).toContain("recovery-heading: accessible name Unexpected recovery");
    expect(
      semanticFailure(contrast, {
        facts: {
          contrastRatio: 1,
          foreground: "rgb(255, 255, 255)",
          background: "rgb(255, 255, 255)",
        },
      }),
    ).toEqual([expect.stringContaining("contrast 1")]);
  });

  it("keeps the visual runner outside public exports and production entry", async () => {
    const packageIndex = await readFile(
      path.resolve(import.meta.dirname, "../../packages/excalidraw/index.tsx"),
      "utf8",
    );
    const appIndex = await readFile(
      path.resolve(import.meta.dirname, "../../excalidraw-app/index.tsx"),
      "utf8",
    );
    expect(packageIndex).not.toContain("visualRegression");
    expect(appIndex).toContain("import.meta.env.DEV");
    expect(appIndex).toContain('import("./visualRegressionHost")');
  });

  it("keeps verify and update commands explicit and distinct", async () => {
    const packageJson = JSON.parse(
      await readFile(
        path.resolve(import.meta.dirname, "../../package.json"),
        "utf8",
      ),
    );
    expect(packageJson.scripts["test:visual"]).not.toContain("VISUAL_UPDATE");
    expect(packageJson.scripts["test:visual:update"]).toContain(
      "VISUAL_UPDATE=1",
    );
    expect(packageJson.scripts["test:visual"]).not.toBe(
      packageJson.scripts["test:visual:update"],
    );
    expect(packageJson.scripts["test:visual:reviewer"]).toContain(
      "visual.reviewer.verify.test.ts",
    );
    expect(packageJson.scripts["test:visual:reviewer"]).not.toContain(
      "VISUAL_ROLE",
    );
  });
});
