import {
  getPropertyDescriptorsForAdapter,
  getPropertyModelForAdapter,
  projectPropertySections,
  resolvePropertyModelFromPredicates,
} from "./propertyModel";

import type { UIAppState } from "../types";

import type { ShapeActionPredicates } from "./shapeActionPredicates";

const appState = {
  activeTool: { type: "selection" },
} as UIAppState;

const predicates = (overrides: Partial<ShapeActionPredicates> = {}) =>
  ({
    hasSelection: true,
    showExtraActions: true,
    strokeColor: true,
    backgroundColor: true,
    fill: true,
    strokeWidth: true,
    freedrawMode: false,
    strokeStyle: true,
    sloppiness: true,
    roundness: true,
    arrowType: false,
    arrowheads: false,
    text: false,
    textAlign: false,
    verticalAlign: false,
    opacity: true,
    layers: true,
    align: false,
    distribute: false,
    link: true,
    linkSingleOnly: true,
    cropEditor: false,
    lineEditor: false,
    ...overrides,
  } as ShapeActionPredicates);

describe("canonical property model", () => {
  it("gives every adapter the same ordered semantic and action identities", () => {
    const model = resolvePropertyModelFromPredicates(
      appState,
      predicates({ text: true, textAlign: true, verticalAlign: true }),
    );

    const read = (adapter: "full" | "compact" | "phone") =>
      getPropertyDescriptorsForAdapter(model, adapter).map((descriptor) => ({
        id: descriptor.id,
        section: descriptor.section,
        action: descriptor.action,
        visible: descriptor.visible,
        selected: descriptor.selected,
        disabled: descriptor.disabled,
      }));

    expect(read("compact")).toEqual(read("full"));
    expect(read("phone")).toEqual(read("full"));
    expect(read("full").slice(0, 5)).toEqual([
      {
        id: "strokeColor",
        section: "appearance",
        action: "changeStrokeColor",
        visible: true,
        selected: "action",
        disabled: "action",
      },
      {
        id: "backgroundColor",
        section: "appearance",
        action: "changeBackgroundColor",
        visible: true,
        selected: "action",
        disabled: "action",
      },
      {
        id: "fillStyle",
        section: "appearance",
        action: "changeFillStyle",
        visible: true,
        selected: "action",
        disabled: "action",
      },
      {
        id: "opacity",
        section: "appearance",
        action: "changeOpacity",
        visible: true,
        selected: "action",
        disabled: "action",
      },
      {
        id: "strokeWidth",
        section: "stroke",
        action: "changeStrokeWidth",
        visible: true,
        selected: "action",
        disabled: "action",
      },
    ]);
  });

  it("derives meaningful model state while naming action-owned state", () => {
    const variableState = {
      ...appState,
      currentItemStrokeVariability: "variable",
    } as UIAppState;
    const model = resolvePropertyModelFromPredicates(
      variableState,
      predicates({
        hasSelection: false,
        showExtraActions: false,
        freedrawMode: true,
        layers: true,
      }),
    );

    for (const adapter of ["full", "compact", "phone"] as const) {
      const descriptors = getPropertyDescriptorsForAdapter(model, adapter);
      expect(
        descriptors.find((descriptor) => descriptor.id === "freedrawMode"),
      ).toMatchObject({ selected: true, disabled: "action" });
      expect(
        descriptors.find((descriptor) => descriptor.id === "sendToBack"),
      ).toMatchObject({ selected: "action", disabled: true });
      expect(
        descriptors.find((descriptor) => descriptor.id === "strokeColor"),
      ).toMatchObject({ selected: "action", disabled: "action" });
    }
  });

  it("keeps bound-container hyperlink eligibility adapter-specific", () => {
    const model = resolvePropertyModelFromPredicates(
      appState,
      predicates({ link: true, linkSingleOnly: false }),
    );

    expect(
      getPropertyModelForAdapter(model, "full").descriptors.map(
        (descriptor) => descriptor.id,
      ),
    ).toContain("hyperlink");
    for (const adapter of ["compact", "phone"] as const) {
      const projected = getPropertyModelForAdapter(model, adapter);
      expect(
        projected.descriptors.map((descriptor) => descriptor.id),
      ).not.toContain("hyperlink");
      expect(
        projected.sections.flatMap((section) =>
          section.descriptors.map((descriptor) => descriptor.id),
        ),
      ).not.toContain("hyperlink");
    }
  });

  it.each([
    ["rectangle", {}, ["fillStyle", "roundness"], ["fontFamily", "arrowType"]],
    [
      "text",
      { text: true, textAlign: true, verticalAlign: true },
      ["fontFamily", "fontSize", "textAlign", "verticalAlign"],
      ["arrowType"],
    ],
    [
      "arrow",
      { arrowType: true, arrowheads: true, roundness: false },
      ["arrowType", "arrowheads"],
      ["fontFamily"],
    ],
    [
      "freedraw",
      { freedrawMode: true, roundness: false, layers: false },
      ["freedrawMode"],
      ["roundness", "sendToBack"],
    ],
    [
      "multiple selection",
      { align: true, distribute: true, link: false, linkSingleOnly: false },
      ["alignLeft", "distributeHorizontally", "duplicate", "delete"],
      ["hyperlink"],
    ],
    [
      "no selection",
      { hasSelection: false, showExtraActions: false, layers: false },
      ["strokeColor"],
      ["duplicate", "delete", "group", "sendToBack"],
    ],
    [
      "active drawing",
      {
        hasSelection: false,
        showExtraActions: false,
        layers: false,
        opacity: false,
      },
      ["strokeColor", "strokeWidth"],
      ["duplicate", "opacity", "sendToBack"],
    ],
    [
      "bucket fill",
      {
        strokeColor: false,
        backgroundColor: true,
        fill: true,
        strokeWidth: false,
        strokeStyle: false,
        sloppiness: false,
        roundness: false,
        layers: false,
        showExtraActions: false,
        hasSelection: false,
      },
      ["backgroundColor", "fillStyle", "opacity"],
      ["strokeColor", "strokeWidth", "duplicate"],
    ],
  ] as const)(
    "preserves %s eligibility",
    (name, overrides, included, omitted) => {
      const state = {
        ...appState,
        activeTool: {
          type: name === "bucket fill" ? "bucketfill" : "selection",
        },
      } as UIAppState;
      const ids = resolvePropertyModelFromPredicates(
        state,
        predicates(overrides),
      ).descriptors.map((descriptor) => descriptor.id);

      included.forEach((id) => expect(ids).toContain(id));
      omitted.forEach((id) => expect(ids).not.toContain(id));
    },
  );

  it("keeps action options on the descriptor contract", () => {
    const model = resolvePropertyModelFromPredicates(
      appState,
      predicates({ freedrawMode: true }),
    );
    const pressure = model.descriptors.find(
      (descriptor) => descriptor.id === "freedrawMode",
    );

    expect(pressure).toMatchObject({
      action: "changeFreedrawMode",
      renderOptions: { cycle: true },
    });
  });

  it("projects combined controls in canonical sections without empty groups", () => {
    const model = resolvePropertyModelFromPredicates(appState, predicates());

    expect(
      projectPropertySections(model, [
        "sendToBack",
        "opacity",
        "strokeWidth",
        "sendToBack",
      ]).map((section) => ({
        id: section.id,
        descriptors: section.descriptors.map((descriptor) => descriptor.id),
      })),
    ).toEqual([
      { id: "appearance", descriptors: ["opacity"] },
      { id: "stroke", descriptors: ["strokeWidth"] },
      { id: "arrangement", descriptors: ["sendToBack"] },
    ]);
  });
});
