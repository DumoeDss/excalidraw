import type {
  ExcalidrawElement,
  NonDeletedElementsMap,
  NonDeletedSceneElementsMap,
} from "@excalidraw/element/types";

import {
  getShapeActionPredicates,
  type ShapeActionPredicates,
} from "./shapeActionPredicates";

import type { ActionName, PanelComponentProps } from "../actions/types";
import type { AppClassProperties, UIAppState } from "../types";

export type PropertyAdapter = "full" | "compact" | "phone";

export type PropertySectionId =
  | "appearance"
  | "stroke"
  | "text"
  | "arrangement"
  | "selection";

export type PropertyCapability =
  | "direct"
  | "opensPicker"
  | "complex"
  | "destructive";

export type PropertyControlState = boolean | "action";

export type PropertyIdentity =
  | "strokeColor"
  | "backgroundColor"
  | "fillStyle"
  | "opacity"
  | "strokeWidth"
  | "freedrawMode"
  | "strokeStyle"
  | "sloppiness"
  | "roundness"
  | "arrowType"
  | "arrowheads"
  | "fontFamily"
  | "fontSize"
  | "textAlign"
  | "verticalAlign"
  | "sendToBack"
  | "sendBackward"
  | "bringForward"
  | "bringToFront"
  | "alignLeft"
  | "alignHorizontallyCentered"
  | "alignRight"
  | "alignTop"
  | "alignVerticallyCentered"
  | "alignBottom"
  | "distributeHorizontally"
  | "distributeVertically"
  | "duplicate"
  | "delete"
  | "group"
  | "ungroup"
  | "hyperlink"
  | "crop"
  | "lineEditor";

export type PropertyDescriptor = Readonly<{
  id: PropertyIdentity;
  section: PropertySectionId;
  action: ActionName;
  visible: true;
  /** `action` means the existing action control remains authoritative. */
  selected: PropertyControlState;
  /** `action` means the existing action control remains authoritative. */
  disabled: PropertyControlState;
  availableIn: readonly PropertyAdapter[];
  capabilities: readonly PropertyCapability[];
  renderOptions?: PanelComponentProps["data"];
}>;

export type ResolvedPropertySection = Readonly<{
  id: PropertySectionId;
  descriptors: readonly PropertyDescriptor[];
}>;

export type ResolvedPropertyModel = Readonly<{
  descriptors: readonly PropertyDescriptor[];
  sections: readonly ResolvedPropertySection[];
}>;

const SECTION_ORDER: readonly PropertySectionId[] = [
  "appearance",
  "stroke",
  "text",
  "arrangement",
  "selection",
];

type DescriptorInput = Omit<
  PropertyDescriptor,
  "visible" | "selected" | "disabled" | "availableIn" | "capabilities"
> & {
  capabilities?: readonly PropertyCapability[];
  selected?: PropertyControlState;
  disabled?: PropertyControlState;
  availableIn?: readonly PropertyAdapter[];
};

type PropertyStateOverrides = Partial<
  Record<
    PropertyIdentity,
    Readonly<{
      selected?: PropertyControlState;
      disabled?: PropertyControlState;
    }>
  >
>;

export const resolvePropertyModelFromPredicates = (
  appState: UIAppState,
  predicates: ShapeActionPredicates,
  stateOverrides: PropertyStateOverrides = {},
): ResolvedPropertyModel => {
  const descriptors: PropertyDescriptor[] = [];
  const add = (condition: boolean, descriptor: DescriptorInput) => {
    if (!condition) {
      return;
    }
    descriptors.push({
      ...descriptor,
      visible: true,
      selected:
        stateOverrides[descriptor.id]?.selected ??
        descriptor.selected ??
        "action",
      disabled:
        stateOverrides[descriptor.id]?.disabled ??
        descriptor.disabled ??
        "action",
      availableIn: descriptor.availableIn ?? ["full", "compact", "phone"],
      capabilities: descriptor.capabilities ?? ["direct"],
    });
  };

  add(predicates.strokeColor, {
    id: "strokeColor",
    section: "appearance",
    action: "changeStrokeColor",
    capabilities: ["direct", "opensPicker", "complex"],
  });
  add(predicates.backgroundColor, {
    id: "backgroundColor",
    section: "appearance",
    action:
      appState.activeTool.type === "bucketfill"
        ? "changeBucketFillBackgroundColor"
        : "changeBackgroundColor",
    capabilities: ["direct", "opensPicker", "complex"],
  });
  add(predicates.fill, {
    id: "fillStyle",
    section: "appearance",
    action: "changeFillStyle",
  });
  add(predicates.opacity, {
    id: "opacity",
    section: "appearance",
    action: "changeOpacity",
    capabilities: ["complex"],
  });

  add(predicates.strokeWidth, {
    id: "strokeWidth",
    section: "stroke",
    action: "changeStrokeWidth",
  });
  add(predicates.freedrawMode, {
    id: "freedrawMode",
    section: "stroke",
    action: "changeFreedrawMode",
    selected: appState.currentItemStrokeVariability === "variable",
    renderOptions: { cycle: true },
  });
  add(predicates.strokeStyle, {
    id: "strokeStyle",
    section: "stroke",
    action: "changeStrokeStyle",
  });
  add(predicates.sloppiness, {
    id: "sloppiness",
    section: "stroke",
    action: "changeSloppiness",
  });
  add(predicates.roundness, {
    id: "roundness",
    section: "stroke",
    action: "changeRoundness",
  });
  add(predicates.arrowType, {
    id: "arrowType",
    section: "stroke",
    action: "changeArrowType",
  });
  add(predicates.arrowheads, {
    id: "arrowheads",
    section: "stroke",
    action: "changeArrowhead",
    capabilities: ["complex"],
  });

  add(predicates.text, {
    id: "fontFamily",
    section: "text",
    action: "changeFontFamily",
    capabilities: ["direct", "opensPicker"],
  });
  add(predicates.text, {
    id: "fontSize",
    section: "text",
    action: "changeFontSize",
  });
  add(predicates.textAlign, {
    id: "textAlign",
    section: "text",
    action: "changeTextAlign",
  });
  add(predicates.verticalAlign, {
    id: "verticalAlign",
    section: "text",
    action: "changeVerticalAlign",
  });

  const arrangementDisabled = !predicates.hasSelection;
  add(predicates.layers, {
    id: "sendToBack",
    section: "arrangement",
    action: "sendToBack",
    disabled: arrangementDisabled,
  });
  add(predicates.layers, {
    id: "sendBackward",
    section: "arrangement",
    action: "sendBackward",
    disabled: arrangementDisabled,
  });
  add(predicates.layers, {
    id: "bringForward",
    section: "arrangement",
    action: "bringForward",
    disabled: arrangementDisabled,
  });
  add(predicates.layers, {
    id: "bringToFront",
    section: "arrangement",
    action: "bringToFront",
    disabled: arrangementDisabled,
  });
  for (const [id, action] of [
    ["alignLeft", "alignLeft"],
    ["alignHorizontallyCentered", "alignHorizontallyCentered"],
    ["alignRight", "alignRight"],
    ["alignTop", "alignTop"],
    ["alignVerticallyCentered", "alignVerticallyCentered"],
    ["alignBottom", "alignBottom"],
  ] as const) {
    add(predicates.align, { id, section: "arrangement", action });
  }
  add(predicates.distribute, {
    id: "distributeHorizontally",
    section: "arrangement",
    action: "distributeHorizontally",
  });
  add(predicates.distribute, {
    id: "distributeVertically",
    section: "arrangement",
    action: "distributeVertically",
  });

  add(predicates.showExtraActions, {
    id: "duplicate",
    section: "selection",
    action: "duplicateSelection",
    disabled: !predicates.hasSelection,
  });
  add(predicates.showExtraActions, {
    id: "delete",
    section: "selection",
    action: "deleteSelectedElements",
    disabled: !predicates.hasSelection,
    capabilities: ["direct", "destructive"],
  });
  add(predicates.showExtraActions, {
    id: "group",
    section: "selection",
    action: "group",
  });
  add(predicates.showExtraActions, {
    id: "ungroup",
    section: "selection",
    action: "ungroup",
  });
  add(predicates.showExtraActions && predicates.link, {
    id: "hyperlink",
    section: "selection",
    action: "hyperlink",
    availableIn: [
      "full",
      ...(predicates.linkSingleOnly ? (["compact", "phone"] as const) : []),
    ],
  });
  add(predicates.showExtraActions && predicates.cropEditor, {
    id: "crop",
    section: "selection",
    action: "cropEditor",
  });
  add(predicates.lineEditor, {
    id: "lineEditor",
    section: "selection",
    action: "toggleLinearEditor",
  });

  return {
    descriptors,
    sections: SECTION_ORDER.flatMap((id) => {
      const sectionDescriptors = descriptors.filter(
        (descriptor) => descriptor.section === id,
      );
      return sectionDescriptors.length
        ? [{ id, descriptors: sectionDescriptors }]
        : [];
    }),
  };
};

export const resolvePropertyModel = (
  appState: UIAppState,
  targetElements: ExcalidrawElement[],
  elementsMap: NonDeletedElementsMap | NonDeletedSceneElementsMap,
  app: AppClassProperties,
) => {
  const selectedFreedrawElements = targetElements.filter(
    (element) => element.type === "freedraw",
  );
  const freedrawModeSelected = selectedFreedrawElements.length
    ? selectedFreedrawElements.every(
        (element) => element.strokeOptions?.variability === "variable",
      )
    : appState.currentItemStrokeVariability === "variable";

  return resolvePropertyModelFromPredicates(
    appState,
    getShapeActionPredicates(appState, targetElements, elementsMap, app),
    { freedrawMode: { selected: freedrawModeSelected } },
  );
};

export const getPropertyDescriptorsForAdapter = (
  model: ResolvedPropertyModel,
  adapter: PropertyAdapter,
) =>
  model.descriptors.filter((descriptor) =>
    descriptor.availableIn.includes(adapter),
  );

export const getPropertyModelForAdapter = (
  model: ResolvedPropertyModel,
  adapter: PropertyAdapter,
): ResolvedPropertyModel => {
  const descriptors = getPropertyDescriptorsForAdapter(model, adapter);
  const available = new Set(descriptors.map((descriptor) => descriptor.id));
  return {
    descriptors,
    sections: model.sections.flatMap((section) => {
      const sectionDescriptors = section.descriptors.filter((descriptor) =>
        available.has(descriptor.id),
      );
      return sectionDescriptors.length
        ? [{ ...section, descriptors: sectionDescriptors }]
        : [];
    }),
  };
};

export const projectPropertySections = (
  model: ResolvedPropertyModel,
  identities: readonly PropertyIdentity[],
): readonly ResolvedPropertySection[] => {
  const requested = new Set(identities);
  return model.sections.flatMap((section) => {
    const descriptors = section.descriptors.filter((descriptor) =>
      requested.has(descriptor.id),
    );
    return descriptors.length ? [{ ...section, descriptors }] : [];
  });
};
