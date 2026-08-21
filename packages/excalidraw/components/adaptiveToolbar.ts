import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { getToolShortcut, TOOLS } from "./Tools";

import type { AppProps } from "../types";
import type { ToolbarToolType } from "./Tools";
import type { RefObject } from "react";

export type ToolbarSemanticGroup =
  | "selection"
  | "upload"
  | "shapes"
  | "drawing"
  | "primary"
  | "generation"
  | "extra";

export type ToolbarActivation =
  | { kind: "tool"; type: string }
  | {
      kind: "action";
      type:
        | "generate-image"
        | "generate-video"
        | "text-to-diagram"
        | "mermaid"
        | "diagram-to-code";
    };

export type ResolvedToolbarItem = Readonly<{
  id: string;
  group: ToolbarSemanticGroup;
  labelKey: string;
  shortcut?: string;
  testId: string;
  selected: boolean;
  projectedSelected: boolean;
  disabled: boolean;
  fillable: boolean;
  activation: ToolbarActivation;
}>;

export type ToolbarResolveContext = Readonly<{
  activeToolType: string;
  preferredSelectionToolType: "selection" | "lasso";
  toolOptions?: AppProps["UIOptions"]["tools"] & Record<string, boolean>;
  forcedToolType?: string | null;
  isFullStylesPanel: boolean;
  isCollaborating: boolean;
  hasGenerator: boolean;
  aiEnabled: boolean;
  hasDiagramToCode: boolean;
}>;

type StaticToolbarItem = Readonly<{
  id: string;
  group: ToolbarSemanticGroup;
  labelKey: string;
  testId: string;
  activation: ToolbarActivation;
  shortcutType?: ToolbarToolType;
  fillable?: boolean;
  visible?: (context: ToolbarResolveContext) => boolean;
}>;

const tool = (
  type: ToolbarToolType | "video" | "audio",
  group: ToolbarSemanticGroup,
  options: Partial<Omit<StaticToolbarItem, "id" | "group" | "activation">> = {},
): StaticToolbarItem => ({
  id: `tool:${type}`,
  group,
  labelKey: `toolBar.${type}`,
  testId: `toolbar-${type}`,
  activation: { kind: "tool", type },
  shortcutType: type in TOOLS ? (type as ToolbarToolType) : undefined,
  fillable:
    type in TOOLS ? Boolean(TOOLS[type as ToolbarToolType].fillable) : false,
  ...options,
});

/**
 * Presentation-neutral canonical inventory. Rendering adapters map these
 * identities to the existing action and icon authorities.
 *
 * Built lazily, not at module top level: `tool()` dereferences `TOOLS`, and
 * `./Tools` (via ToolPopover → App → AdaptiveEditorToolbar) participates in
 * an import cycle with this module — evaluating the table during module init
 * crashes when `./Tools` is entered first and still mid-initialization.
 */
let toolbarItemsCache: readonly StaticToolbarItem[] | null = null;
const getToolbarItems = (): readonly StaticToolbarItem[] => {
  if (!toolbarItemsCache) {
    toolbarItemsCache = [
      tool("hand", "selection"),
      tool("selection", "selection"),
      tool("lasso", "selection", {
        shortcutType: "selection",
        visible: (context) =>
          context.isFullStylesPanel ||
          context.preferredSelectionToolType === "lasso" ||
          context.activeToolType === "lasso",
      }),
      tool("image", "upload"),
      tool("video", "upload"),
      tool("audio", "upload"),
      tool("rectangle", "shapes"),
      tool("diamond", "shapes"),
      tool("ellipse", "shapes"),
      tool("arrow", "shapes"),
      tool("line", "shapes"),
      tool("freedraw", "drawing"),
      tool("autoshape", "drawing"),
      tool("text", "primary"),
      tool("eraser", "primary"),
      {
        id: "action:generate-image",
        group: "generation",
        labelKey: "toolBar.imageGenerator",
        testId: "toolbar-image-generator",
        activation: { kind: "action", type: "generate-image" },
        visible: (context) => context.hasGenerator,
      },
      {
        id: "action:generate-video",
        group: "generation",
        labelKey: "toolBar.videoGenerator",
        testId: "toolbar-video-generator",
        activation: { kind: "action", type: "generate-video" },
        visible: (context) => context.hasGenerator,
      },
      tool("frame", "extra"),
      tool("embeddable", "extra"),
      tool("laser", "extra"),
      tool("bucketfill", "extra"),
      {
        id: "action:text-to-diagram",
        group: "extra",
        labelKey: "toolBar.textToDiagram",
        testId: "toolbar-text-to-diagram",
        activation: { kind: "action", type: "text-to-diagram" },
        visible: (context) => context.aiEnabled,
      },
      {
        id: "action:mermaid",
        group: "extra",
        labelKey: "toolBar.mermaidToExcalidraw",
        testId: "toolbar-mermaid",
        activation: { kind: "action", type: "mermaid" },
      },
      {
        id: "action:diagram-to-code",
        group: "extra",
        labelKey: "toolBar.magicframe",
        testId: "toolbar-magicframe",
        activation: { kind: "action", type: "diagram-to-code" },
        visible: (context) => context.aiEnabled && context.hasDiagramToCode,
      },
    ];
  }
  return toolbarItemsCache;
};

export const resolveToolbarItems = (
  context: ToolbarResolveContext,
): readonly ResolvedToolbarItem[] =>
  getToolbarItems().filter((item) => {
    const toolType =
      item.activation.kind === "tool" ? item.activation.type : null;
    return (
      item.visible?.(context) !== false &&
      (toolType == null || context.toolOptions?.[toolType] !== false)
    );
  }).map((item) => {
    const toolType =
      item.activation.kind === "tool" ? item.activation.type : null;
    const selected = toolType === context.activeToolType;
    const projectedSelected =
      selected && !(toolType === "laser" && context.isCollaborating);
    const disabled = Boolean(
      toolType && context.forcedToolType && context.forcedToolType !== toolType,
    );
    return {
      id: item.id,
      group: item.group,
      labelKey: item.labelKey,
      shortcut:
        item.shortcutType &&
        (TOOLS[item.shortcutType].letterKey ||
          TOOLS[item.shortcutType].numericKey)
          ? getToolShortcut(item.shortcutType)
          : undefined,
      testId: item.testId,
      selected,
      projectedSelected,
      disabled,
      fillable: Boolean(item.fillable),
      activation: item.activation,
    };
  });

export type ToolbarUnit = Readonly<{
  id: string;
  items: readonly ResolvedToolbarItem[];
  required: boolean;
}>;

const UNIT_DEFINITIONS = [
  { id: "selection", groups: ["selection"], required: true },
  { id: "upload", groups: ["upload"], required: false },
  { id: "shapes", groups: ["shapes"], required: true },
  { id: "drawing", groups: ["drawing"], required: true },
  { id: "text", itemIds: ["tool:text"], required: true },
  { id: "eraser", itemIds: ["tool:eraser"], required: true },
  {
    id: "generate-image",
    itemIds: ["action:generate-image"],
    required: false,
  },
  {
    id: "generate-video",
    itemIds: ["action:generate-video"],
    required: false,
  },
  { id: "extra", groups: ["extra"], required: false },
] as const;

export const createToolbarUnits = (
  items: readonly ResolvedToolbarItem[],
): readonly ToolbarUnit[] =>
  UNIT_DEFINITIONS.map((definition) => ({
    id: definition.id,
    required: definition.required,
    items: items.filter((item) =>
      "itemIds" in definition
        ? (definition.itemIds as readonly string[]).includes(item.id)
        : (definition.groups as readonly ToolbarSemanticGroup[]).includes(
            item.group,
          ),
    ),
  })).filter((unit) => unit.items.length > 0);

export type ToolbarLayoutCandidate = Readonly<{
  id: string;
  width: number;
  required?: boolean;
}>;

export type ToolbarLayoutPlan = Readonly<{
  primaryIds: readonly string[];
  overflowIds: readonly string[];
}>;

const deterministicFallback = (
  candidates: readonly ToolbarLayoutCandidate[],
): ToolbarLayoutPlan => {
  const lastRequired = candidates.reduce(
    (last, item, index) => (item.required ? index : last),
    -1,
  );
  const primaryCount = Math.min(
    candidates.length,
    Math.max(1, lastRequired + 1),
  );
  return {
    primaryIds: candidates.slice(0, primaryCount).map((item) => item.id),
    overflowIds: candidates.slice(primaryCount).map((item) => item.id),
  };
};

export const planToolbarLayout = ({
  candidates,
  availableWidth,
  gap,
  overflowTriggerWidth,
}: {
  candidates: readonly ToolbarLayoutCandidate[];
  availableWidth: number;
  gap: number;
  overflowTriggerWidth: number;
}): ToolbarLayoutPlan => {
  if (
    availableWidth <= 0 ||
    candidates.length === 0 ||
    candidates.some((candidate) => candidate.width <= 0)
  ) {
    return deterministicFallback(candidates);
  }

  const requiredPrefix = Math.max(
    1,
    candidates.reduce(
      (last, item, index) => (item.required ? index + 1 : last),
      0,
    ),
  );

  for (
    let primaryCount = candidates.length;
    primaryCount >= requiredPrefix;
    primaryCount--
  ) {
    const hasOverflow = primaryCount < candidates.length;
    const primaryWidth = candidates
      .slice(0, primaryCount)
      .reduce((total, item) => total + item.width, 0);
    const controlCount = primaryCount + (hasOverflow ? 1 : 0);
    const requiredWidth =
      primaryWidth +
      Math.max(0, controlCount - 1) * gap +
      (hasOverflow ? overflowTriggerWidth : 0);

    if (requiredWidth <= availableWidth + 0.25) {
      return {
        primaryIds: candidates.slice(0, primaryCount).map((item) => item.id),
        overflowIds: candidates.slice(primaryCount).map((item) => item.id),
      };
    }
  }

  return deterministicFallback(candidates);
};

const planSignature = (plan: ToolbarLayoutPlan) =>
  `${plan.primaryIds.join(",")}|${plan.overflowIds.join(",")}`;

export const useAdaptiveToolbarLayout = (
  units: readonly ToolbarUnit[],
): {
  containerRef: RefObject<HTMLDivElement | null>;
  measurementRef: RefObject<HTMLDivElement | null>;
  primaryUnits: readonly ToolbarUnit[];
  overflowUnits: readonly ToolbarUnit[];
} => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const unitsRef = useRef(units);
  unitsRef.current = units;
  const unitSignature = units.map((unit) => unit.id).join("|");
  const fallbackPlan = useMemo(
    () =>
      deterministicFallback(
        units.map((unit) => ({
          id: unit.id,
          width: 0,
          required: unit.required,
        })),
      ),
    // The semantic signature is the canonical invalidation boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitSignature],
  );
  const [plan, setPlan] = useState<ToolbarLayoutPlan>(fallbackPlan);
  const currentPlanSignatureRef = useRef(planSignature(fallbackPlan));

  useLayoutEffect(() => {
    let mounted = true;
    let frame: number | null = null;
    let lastMeasurementSignature: string | null = null;
    const container = containerRef.current;
    const rail = measurementRef.current;
    const measuredUnits = unitsRef.current;

    currentPlanSignatureRef.current = planSignature(fallbackPlan);
    setPlan(fallbackPlan);

    if (!container || !rail || typeof ResizeObserver === "undefined") {
      return;
    }

    const readAndPlan = () => {
      frame = null;
      if (!mounted) {
        return;
      }

      const containerStyle = getComputedStyle(container);
      const width =
        Math.round(
          (container.getBoundingClientRect().width -
            parseFloat(containerStyle.paddingLeft || "0") -
            parseFloat(containerStyle.paddingRight || "0")) *
            100,
        ) / 100;

      const railStyle = getComputedStyle(rail);
      const gap = parseFloat(railStyle.columnGap || railStyle.gap || "0") || 0;
      const candidates = measuredUnits.map((unit) => {
        const node = rail.querySelector<HTMLElement>(
          `[data-toolbar-measure-id="${unit.id}"]`,
        );
        return {
          id: unit.id,
          required: unit.required,
          width: node
            ? Math.round(node.getBoundingClientRect().width * 100) / 100
            : 0,
        };
      });
      const overflowNode = rail.querySelector<HTMLElement>(
        "[data-toolbar-measure-overflow]",
      );
      const overflowTriggerWidth = overflowNode
        ? Math.round(overflowNode.getBoundingClientRect().width * 100) / 100
        : 0;
      const measurementSignature = [
        width,
        gap,
        ...candidates.map((candidate) => `${candidate.id}:${candidate.width}`),
        `overflow:${overflowTriggerWidth}`,
      ].join("|");

      if (measurementSignature === lastMeasurementSignature) {
        return;
      }
      lastMeasurementSignature = measurementSignature;

      const nextPlan = planToolbarLayout({
        candidates,
        availableWidth: width,
        gap,
        overflowTriggerWidth,
      });
      const signature = planSignature(nextPlan);
      if (signature !== currentPlanSignatureRef.current && mounted) {
        currentPlanSignatureRef.current = signature;
        setPlan(nextPlan);
      }
    };

    const schedule = () => {
      if (frame == null) {
        frame = requestAnimationFrame(readAndPlan);
      }
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    observer.observe(rail);
    rail
      .querySelectorAll<HTMLElement>(
        "[data-toolbar-measure-id], [data-toolbar-measure-overflow]",
      )
      .forEach((node) => observer.observe(node));

    const fonts = document.fonts;
    const onFontsChanged = () => schedule();
    fonts?.addEventListener?.("loadingdone", onFontsChanged);
    fonts?.ready?.then(schedule).catch(() => undefined);
    schedule();

    return () => {
      mounted = false;
      observer.disconnect();
      fonts?.removeEventListener?.("loadingdone", onFontsChanged);
      if (frame != null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [fallbackPlan, unitSignature]);

  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  return {
    containerRef,
    measurementRef,
    primaryUnits: plan.primaryIds.flatMap((id) => {
      const unit = unitMap.get(id);
      return unit ? [unit] : [];
    }),
    overflowUnits: plan.overflowIds.flatMap((id) => {
      const unit = unitMap.get(id);
      return unit ? [unit] : [];
    }),
  };
};
