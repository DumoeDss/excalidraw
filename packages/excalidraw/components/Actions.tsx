import clsx from "clsx";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Popover } from "radix-ui";

import { CLASSES } from "@excalidraw/common";

import { isArrowElement } from "@excalidraw/element";

import type {
  ExcalidrawElement,
  NonDeletedElementsMap,
  NonDeletedSceneElementsMap,
} from "@excalidraw/element/types";

import {
  actionToggleZenMode,
  actionZoomIn,
  actionZoomOut,
  actionZoomToFit,
} from "../actions";

import { t } from "../i18n";
import { getNormalizedZoom, getTargetElements } from "../scene";
import { getViewportForZoomWithScrollConstraints } from "../viewport";

import { getFormValue } from "../actions/actionProperties";

import { useTextEditorFocus } from "../hooks/useTextEditorFocus";
import { useAppStateValue } from "../hooks/useAppStateValue";

import { actionToggleViewMode } from "../actions/actionToggleViewMode";

import "./Actions.scss";

import { useApp, useExcalidrawContainer, useStylesPanelMode } from "./App";
import { AdaptiveEditorToolbar } from "./AdaptiveEditorToolbar";
import { Tooltip } from "./Tooltip";
import { PropertiesPopover } from "./PropertiesPopover";
import {
  sharpArrowIcon,
  roundArrowIcon,
  elbowArrowIcon,
  TextSizeIcon,
  adjustmentsIcon,
  pencilIcon,
} from "./icons";
import { DotsHorizontalIcon } from "./primitives/chrome-icons";

import { Island } from "./Island";

import {
  getPropertyModelForAdapter,
  projectPropertySections,
  resolvePropertyModel,
} from "./propertyModel";
import {
  claimPropertyPopupOwnership,
  createPropertyPopupOwnerClaim,
  getPropertyPopupTransition,
  isCurrentPropertyPopupOwner,
  isOwnedPropertyPopup,
  releasePropertyPopupOwnership,
  type PropertyPopupIdentity,
} from "./propertyPopup";
import {
  phonePropertyPlanSignature,
  planPhonePropertyLayout,
  type PhonePropertyPlan,
} from "./phonePropertyLayout";
import { UiButton } from "./primitives/UiButton";

import type {
  PropertyDescriptor,
  PropertyIdentity,
  ResolvedPropertyModel,
  ResolvedPropertySection,
} from "./propertyModel";
import type {
  AppClassProperties,
  AppProps,
  UIAppState,
  AppState,
} from "../types";
import type { ActionManager } from "../actions/manager";

// re-exported for consumers outside the styles panel (e.g. CommandPalette)
export {
  canChangeStrokeColor,
  canChangeBackgroundColor,
} from "./shapeActionPredicates";

// Common CSS class combinations
const PROPERTIES_CLASSES = clsx([
  CLASSES.SHAPE_ACTIONS_THEME_SCOPE,
  "properties-content",
]);

const PROPERTY_SECTION_LABELS: Record<
  ResolvedPropertySection["id"],
  () => string
> = {
  appearance: () => `${t("labels.stroke")} / ${t("labels.background")}`,
  stroke: () => t("labels.stroke"),
  text: () => t("element.text"),
  arrangement: () => t("labels.layers"),
  selection: () => t("labels.actions"),
};

export const renderPropertyDescriptor = (
  descriptor: PropertyDescriptor,
  renderAction: ActionManager["renderAction"],
) => {
  const selected = descriptor.selected === true;
  const disabled = descriptor.disabled === true;
  return (
    <div
      className={clsx("property-control", {
        "property-control--complex":
          descriptor.capabilities.includes("complex"),
        "property-control--destructive":
          descriptor.capabilities.includes("destructive"),
        "property-control--selected": selected,
        "property-control--disabled": disabled,
      })}
      data-property-id={descriptor.id}
      data-property-section={descriptor.section}
      data-property-selected={String(descriptor.selected)}
      data-property-disabled={String(descriptor.disabled)}
      aria-current={selected ? "true" : undefined}
      aria-disabled={
        descriptor.disabled === "action" ? undefined : descriptor.disabled
      }
      inert={disabled || undefined}
      key={descriptor.id}
    >
      {renderAction(descriptor.action, descriptor.renderOptions)}
    </div>
  );
};

const descriptorsById = (
  model: ResolvedPropertyModel,
  ids: readonly PropertyIdentity[],
) =>
  ids.flatMap((id) => {
    const descriptor = model.descriptors.find((item) => item.id === id);
    return descriptor ? [descriptor] : [];
  });

export const usePropertyPopupOwner = ({
  appState,
  setAppState,
  eligible,
  ownerKey,
}: {
  appState: UIAppState;
  setAppState: React.Component<any, AppState>["setState"];
  eligible: readonly PropertyPopupIdentity[];
  ownerKey: string;
}) => {
  const currentPopupRef = useRef(appState.openPopup);
  const eligibleRef = useRef(new Set(eligible));
  const generationRef = useRef(0);
  const ownerKeyRef = useRef(ownerKey);
  const claimRef = useRef(createPropertyPopupOwnerClaim());
  currentPopupRef.current = appState.openPopup;
  eligibleRef.current = new Set(eligible);

  const change = useCallback(
    (identity: PropertyPopupIdentity, open: boolean) => {
      if (open) {
        claimPropertyPopupOwnership(identity, claimRef.current);
      }
      setAppState((state) => ({
        openPopup: getPropertyPopupTransition(state.openPopup, identity, open),
      }));
    },
    [setAppState],
  );

  const eligibleSignature = eligible.join("|");
  useEffect(() => {
    const generation = ++generationRef.current;
    const claim = createPropertyPopupOwnerClaim();
    claimRef.current = claim;
    const claimedIdentities = [...eligibleRef.current];
    claimedIdentities.forEach((identity) =>
      claimPropertyPopupOwnership(identity, claim),
    );
    const current = currentPopupRef.current;
    const ownerChanged = ownerKeyRef.current !== ownerKey;
    ownerKeyRef.current = ownerKey;
    if (
      isOwnedPropertyPopup(current) &&
      (ownerChanged || !eligibleRef.current.has(current))
    ) {
      change(current, false);
    }

    return () => {
      const owned = currentPopupRef.current;
      queueMicrotask(() => {
        // The current generation intentionally distinguishes a superseding
        // effect from the final owner unmount.
        if (
          generationRef.current === generation && // eslint-disable-line react-hooks/exhaustive-deps
          isOwnedPropertyPopup(owned) &&
          isCurrentPropertyPopupOwner(owned, claim)
        ) {
          setAppState((state) =>
            state.openPopup === owned ? { openPopup: null } : null,
          );
        }
        claimedIdentities.forEach((identity) =>
          releasePropertyPopupOwnership(identity, claim),
        );
      });
    };
  }, [change, eligibleSignature, ownerKey, setAppState]);

  return {
    isOpen: (identity: PropertyPopupIdentity) =>
      appState.openPopup === identity,
    onOpenChange: (identity: PropertyPopupIdentity) => (open: boolean) =>
      change(identity, open),
  };
};

type PhonePropertyUnit = Readonly<{
  id: string;
  required?: boolean;
}>;

const fallbackPhonePropertyPlan = (
  units: readonly PhonePropertyUnit[],
): PhonePropertyPlan =>
  planPhonePropertyLayout({
    candidates: units.map((unit) => ({ ...unit, width: 0 })),
    availableWidth: 0,
    gap: 0,
    paddingInline: 0,
  });

export const usePhonePropertyLayout = (units: readonly PhonePropertyUnit[]) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const unitsRef = useRef(units);
  unitsRef.current = units;
  const unitSignature = units.map((unit) => unit.id).join("|");
  const fallback = useMemo(
    () => fallbackPhonePropertyPlan(units),
    // The semantic unit signature is the invalidation boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitSignature],
  );
  const [plan, setPlan] = useState<PhonePropertyPlan>(fallback);
  const planSignatureRef = useRef(phonePropertyPlanSignature(fallback));

  useLayoutEffect(() => {
    let mounted = true;
    let frame: number | null = null;
    let fallbackTimer: number | null = null;
    let measurementSignature: string | null = null;
    const container = containerRef.current;
    const rail = measurementRef.current;

    planSignatureRef.current = phonePropertyPlanSignature(fallback);
    setPlan(fallback);
    if (!container || !rail || typeof ResizeObserver === "undefined") {
      return;
    }

    const read = () => {
      frame = null;
      if (fallbackTimer != null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (!mounted) {
        return;
      }
      const containerStyle = getComputedStyle(container);
      const railStyle = getComputedStyle(rail);
      const availableWidth =
        Math.round(container.getBoundingClientRect().width * 100) / 100;
      const gap =
        Number.parseFloat(railStyle.columnGap || railStyle.gap || "0") || 0;
      const paddingInline =
        (Number.parseFloat(containerStyle.paddingLeft || "0") || 0) +
        (Number.parseFloat(containerStyle.paddingRight || "0") || 0);
      const candidates = unitsRef.current.map((unit) => {
        const node = rail.querySelector<HTMLElement>(
          `[data-property-measure-id="${unit.id}"]`,
        );
        return {
          ...unit,
          width: node
            ? Math.round(node.getBoundingClientRect().width * 100) / 100
            : 0,
        };
      });
      const nextMeasurementSignature = [
        availableWidth,
        gap,
        paddingInline,
        ...candidates.map((candidate) => `${candidate.id}:${candidate.width}`),
      ].join("|");
      if (nextMeasurementSignature === measurementSignature) {
        return;
      }
      measurementSignature = nextMeasurementSignature;
      const nextPlan = planPhonePropertyLayout({
        candidates,
        availableWidth,
        gap,
        paddingInline,
      });
      const nextSignature = phonePropertyPlanSignature(nextPlan);
      if (nextSignature !== planSignatureRef.current && mounted) {
        planSignatureRef.current = nextSignature;
        setPlan(nextPlan);
      }
    };
    const schedule = () => {
      if (frame == null && fallbackTimer == null) {
        frame = requestAnimationFrame(read);
        // Background tabs may suspend animation frames indefinitely. Keep the
        // frame as the primary batch boundary, with a bounded timer so valid
        // container geometry can still replace the deterministic fallback.
        fallbackTimer = window.setTimeout(() => {
          fallbackTimer = null;
          if (frame != null) {
            cancelAnimationFrame(frame);
            frame = null;
          }
          read();
        }, 120);
      }
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    observer.observe(rail);
    rail
      .querySelectorAll<HTMLElement>("[data-property-measure-id]")
      .forEach((node) => observer.observe(node));
    schedule();

    return () => {
      mounted = false;
      observer.disconnect();
      if (frame != null) {
        cancelAnimationFrame(frame);
      }
      if (fallbackTimer != null) {
        window.clearTimeout(fallbackTimer);
      }
    };
  }, [fallback, unitSignature]);

  return { containerRef, measurementRef, plan };
};

/**
 * Full styles panel: the wide, always-expanded layout used on desktop when the
 * UI is in "full" mode.
 */
export const SelectedShapeActions = ({
  appState,
  elementsMap,
  renderAction,
  app,
}: {
  appState: UIAppState;
  elementsMap: NonDeletedElementsMap | NonDeletedSceneElementsMap;
  renderAction: ActionManager["renderAction"];
  app: AppClassProperties;
}) => {
  const targetElements = getTargetElements(elementsMap, appState);
  const model = resolvePropertyModel(
    appState,
    targetElements,
    elementsMap,
    app,
  );

  return (
    <div
      className="selected-shape-actions property-inspector"
      data-property-adapter="full"
    >
      <div className="property-inspector__header">
        <span className="property-inspector__eyebrow">{t("stats.title")}</span>
        <strong>
          {targetElements.length > 1
            ? `${targetElements.length} ${t("stats.selected")}`
            : targetElements[0]
            ? t(`element.${targetElements[0].type}`)
            : appState.activeTool.type === "custom"
            ? appState.activeTool.customType || t("toolBar.selection")
            : t(`toolBar.${appState.activeTool.type}`)}
        </strong>
      </div>
      <div className="property-inspector__content">
        {model.sections.map((section) => (
          <section
            className="property-section"
            data-property-section={section.id}
            key={section.id}
          >
            <h2>{PROPERTY_SECTION_LABELS[section.id]()}</h2>
            <div className="property-section__controls">
              {section.descriptors.map((descriptor) =>
                renderPropertyDescriptor(descriptor, renderAction),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const CombinedShapeProperties = ({
  renderAction,
  model,
  popupOwner,
  container,
  railSlot,
}: {
  renderAction: ActionManager["renderAction"];
  model: ResolvedPropertyModel;
  popupOwner: ReturnType<typeof usePropertyPopupOwner>;
  container: HTMLDivElement | null;
  railSlot?: string;
}) => {
  const descriptors = descriptorsById(model, [
    "fillStyle",
    "opacity",
    "strokeWidth",
    "freedrawMode",
    "strokeStyle",
    "sloppiness",
    "roundness",
  ]);
  const isOpen = popupOwner.isOpen("compactStrokeStyles");
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (!descriptors.length) {
    return null;
  }

  return (
    <div className="compact-action-item" data-property-rail-slot={railSlot}>
      <Popover.Root
        open={isOpen}
        onOpenChange={popupOwner.onOpenChange("compactStrokeStyles")}
      >
        <Popover.Trigger asChild>
          <UiButton
            ref={triggerRef}
            variant="ghost"
            className={clsx("compact-action-button properties-trigger", {
              active: isOpen,
            })}
            title={t("labels.stroke")}
            aria-label={t("labels.stroke")}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            selected={isOpen}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {adjustmentsIcon}
          </UiButton>
        </Popover.Trigger>
        {isOpen && (
          <PropertiesPopover
            className={PROPERTIES_CLASSES}
            container={container}
            style={{ maxWidth: "13rem" }}
            onClose={() => {}}
            returnFocusRef={triggerRef}
          >
            <div className="selected-shape-actions">
              {descriptors.map((descriptor) =>
                renderPropertyDescriptor(descriptor, renderAction),
              )}
            </div>
          </PropertiesPopover>
        )}
      </Popover.Root>
    </div>
  );
};

const CombinedArrowProperties = ({
  appState,
  renderAction,
  targetElements,
  model,
  popupOwner,
  container,
  app,
  railSlot,
}: {
  appState: UIAppState;
  renderAction: ActionManager["renderAction"];
  targetElements: ExcalidrawElement[];
  model: ResolvedPropertyModel;
  popupOwner: ReturnType<typeof usePropertyPopupOwner>;
  container: HTMLDivElement | null;
  app: AppClassProperties;
  railSlot?: string;
}) => {
  const descriptors = descriptorsById(model, ["arrowType", "arrowheads"]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  if (!descriptors.length) {
    return null;
  }

  const isOpen = popupOwner.isOpen("compactArrowProperties");

  return (
    <div className="compact-action-item" data-property-rail-slot={railSlot}>
      <Popover.Root
        open={isOpen}
        onOpenChange={popupOwner.onOpenChange("compactArrowProperties")}
      >
        <Popover.Trigger asChild>
          <UiButton
            ref={triggerRef}
            variant="ghost"
            className={clsx("compact-action-button properties-trigger", {
              active: isOpen,
            })}
            title={t("labels.arrowtypes")}
            aria-label={t("labels.arrowtypes")}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            selected={isOpen}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {(() => {
              // Show an icon based on the current arrow type
              const arrowType = getFormValue(
                targetElements,
                app,
                (element) => {
                  if (isArrowElement(element)) {
                    return element.elbowed
                      ? "elbow"
                      : element.roundness
                      ? "round"
                      : "sharp";
                  }
                  return null;
                },
                (element) => isArrowElement(element),
                (hasSelection) =>
                  hasSelection ? null : appState.currentItemArrowType,
              );

              if (arrowType === "elbow") {
                return elbowArrowIcon;
              }
              if (arrowType === "round") {
                return roundArrowIcon;
              }
              return sharpArrowIcon;
            })()}
          </UiButton>
        </Popover.Trigger>
        {isOpen && (
          <PropertiesPopover
            container={container}
            className="properties-content"
            style={{ maxWidth: "13rem" }}
            onClose={() => {}}
            returnFocusRef={triggerRef}
          >
            <div className="selected-shape-actions">
              {descriptors.map((descriptor) =>
                renderPropertyDescriptor(descriptor, renderAction),
              )}
            </div>
          </PropertiesPopover>
        )}
      </Popover.Root>
    </div>
  );
};

const CombinedTextProperties = ({
  appState,
  renderAction,
  model,
  popupOwner,
  container,
  railSlot,
}: {
  appState: UIAppState;
  renderAction: ActionManager["renderAction"];
  model: ResolvedPropertyModel;
  popupOwner: ReturnType<typeof usePropertyPopupOwner>;
  container: HTMLDivElement | null;
  railSlot?: string;
}) => {
  const { saveCaretPosition, restoreCaretPosition } = useTextEditorFocus();
  const isOpen = popupOwner.isOpen("compactTextProperties");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const descriptors = descriptorsById(model, [
    "fontSize",
    "textAlign",
    "verticalAlign",
  ]);

  if (!descriptors.length) {
    return null;
  }

  return (
    <div className="compact-action-item" data-property-rail-slot={railSlot}>
      <Popover.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (open) {
            if (appState.editingTextElement) {
              saveCaretPosition();
            }
          }
          popupOwner.onOpenChange("compactTextProperties")(open);
        }}
      >
        <Popover.Trigger asChild>
          <UiButton
            ref={triggerRef}
            variant="ghost"
            className={clsx("compact-action-button properties-trigger", {
              active: isOpen,
            })}
            title={t("labels.textAlign")}
            aria-label={t("labels.textAlign")}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            selected={isOpen}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {TextSizeIcon}
          </UiButton>
        </Popover.Trigger>
        {isOpen && (
          <PropertiesPopover
            className={PROPERTIES_CLASSES}
            container={container}
            style={{ maxWidth: "13rem" }}
            // Improve focus handling for text editing scenarios
            preventAutoFocusOnTouch={!!appState.editingTextElement}
            returnFocusRef={triggerRef}
            onClose={() => {
              // Refocus text editor when popover closes with caret restoration
              if (appState.editingTextElement) {
                restoreCaretPosition();
              }
            }}
          >
            <div className="selected-shape-actions">
              {descriptors.map((descriptor) =>
                renderPropertyDescriptor(descriptor, renderAction),
              )}
            </div>
          </PropertiesPopover>
        )}
      </Popover.Root>
    </div>
  );
};

const CombinedExtraActions = ({
  renderAction,
  model,
  popupOwner,
  container,
  combinedDescriptorIds = [],
  excludedDescriptorIds = [],
  maxContentBlockSize,
  railSlot,
}: {
  renderAction: ActionManager["renderAction"];
  model: ResolvedPropertyModel;
  popupOwner: ReturnType<typeof usePropertyPopupOwner>;
  container: HTMLDivElement | null;
  combinedDescriptorIds?: readonly PropertyIdentity[];
  excludedDescriptorIds?: readonly PropertyIdentity[];
  maxContentBlockSize?: number;
  railSlot?: string;
}) => {
  const isOpen = popupOwner.isOpen("compactOtherProperties");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const excludedDescriptors = new Set(excludedDescriptorIds);
  const baseDescriptors = model.descriptors.filter(
    (descriptor) =>
      (descriptor.section === "arrangement" ||
        descriptor.section === "selection") &&
      !excludedDescriptors.has(descriptor.id),
  );
  const extraDescriptors = descriptorsById(model, combinedDescriptorIds);
  const sections = projectPropertySections(
    model,
    [...baseDescriptors, ...extraDescriptors].map(
      (descriptor) => descriptor.id,
    ),
  );

  if (!sections.length) {
    return null;
  }

  return (
    <div className="compact-action-item" data-property-rail-slot={railSlot}>
      <Popover.Root
        open={isOpen}
        onOpenChange={popupOwner.onOpenChange("compactOtherProperties")}
      >
        <Popover.Trigger asChild>
          <UiButton
            ref={triggerRef}
            variant="ghost"
            className={clsx("compact-action-button properties-trigger", {
              active: isOpen,
            })}
            title={t("labels.actions")}
            aria-label={t("labels.actions")}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            selected={isOpen}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {DotsHorizontalIcon}
          </UiButton>
        </Popover.Trigger>
        {isOpen && (
          <PropertiesPopover
            className={clsx(PROPERTIES_CLASSES, "property-extra-popover")}
            container={container}
            style={{
              width: "13rem",
              maxWidth: "calc(100vw - 2rem)",
              ...(maxContentBlockSize
                ? {
                    maxBlockSize: `${maxContentBlockSize}px`,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                  }
                : {}),
            }}
            onClose={() => {}}
            returnFocusRef={triggerRef}
          >
            <div className="selected-shape-actions property-popover-sections">
              {sections.map((section) => (
                <section
                  className="property-popover-section"
                  data-property-section={section.id}
                  key={section.id}
                >
                  <h3>{PROPERTY_SECTION_LABELS[section.id]()}</h3>
                  <div className="property-popover-section__controls">
                    {section.descriptors.map((descriptor) =>
                      renderPropertyDescriptor(descriptor, renderAction),
                    )}
                  </div>
                </section>
              ))}
            </div>
          </PropertiesPopover>
        )}
      </Popover.Root>
    </div>
  );
};

/**
 * Compact styles panel — the collapsed, popover-driven layout used on tablets
 * and on desktop when the UI is in "compact" mode.
 */
export const CompactShapeActions = ({
  appState,
  elementsMap,
  renderAction,
  app,
  setAppState,
}: {
  appState: UIAppState;
  elementsMap: NonDeletedElementsMap | NonDeletedSceneElementsMap;
  renderAction: ActionManager["renderAction"];
  app: AppClassProperties;
  setAppState: React.Component<any, AppState>["setState"];
}) => {
  const targetElements = getTargetElements(elementsMap, appState);
  const model = resolvePropertyModel(
    appState,
    targetElements,
    elementsMap,
    app,
  );
  const { container } = useExcalidrawContainer();
  const compactModel = getPropertyModelForAdapter(model, "compact");
  const compactDescriptors = compactModel.descriptors;
  const hasAny = (ids: readonly PropertyIdentity[]) =>
    ids.some((id) => compactDescriptors.some((item) => item.id === id));
  const eligible = [
    hasAny([
      "fillStyle",
      "opacity",
      "strokeWidth",
      "freedrawMode",
      "strokeStyle",
      "sloppiness",
      "roundness",
    ]) && "compactStrokeStyles",
    hasAny(["arrowType", "arrowheads"]) && "compactArrowProperties",
    hasAny(["fontSize", "textAlign", "verticalAlign"]) &&
      "compactTextProperties",
    compactModel.sections.some(
      (section) => section.id === "arrangement" || section.id === "selection",
    ) && "compactOtherProperties",
  ].filter(Boolean) as PropertyPopupIdentity[];
  const popupOwner = usePropertyPopupOwner({
    appState,
    setAppState,
    eligible,
    ownerKey: `compact:${appState.activeTool.type}`,
  });
  const appearanceDescriptors = descriptorsById(compactModel, [
    "strokeColor",
    "backgroundColor",
  ]);
  const tailDescriptors = descriptorsById(compactModel, ["lineEditor"]);

  return (
    <div
      className="compact-shape-actions property-rail"
      data-property-adapter="compact"
      role="toolbar"
      aria-label={t("stats.title")}
    >
      <div
        className="property-rail__group property-rail__appearance"
        data-property-rail-group="appearance"
      >
        {appearanceDescriptors.map((descriptor) => (
          <div
            className="compact-action-item"
            data-property-rail-slot={`appearance:${descriptor.id}`}
            key={descriptor.id}
          >
            {renderPropertyDescriptor(descriptor, renderAction)}
          </div>
        ))}
      </div>

      <div
        className="property-rail__group property-rail__categories"
        data-property-rail-group="categories"
      >
        <CombinedShapeProperties
          renderAction={renderAction}
          model={compactModel}
          popupOwner={popupOwner}
          container={container}
          railSlot="category:stroke"
        />

        <CombinedArrowProperties
          appState={appState}
          renderAction={renderAction}
          targetElements={targetElements}
          model={compactModel}
          popupOwner={popupOwner}
          container={container}
          app={app}
          railSlot="category:arrow"
        />
        {hasAny(["fontFamily", "fontSize", "textAlign", "verticalAlign"]) && (
          <>
            {descriptorsById(compactModel, ["fontFamily"]).map((descriptor) => (
              <div
                className="compact-action-item"
                data-property-rail-slot="category:font"
                key={descriptor.id}
              >
                {renderPropertyDescriptor(descriptor, renderAction)}
              </div>
            ))}
            <CombinedTextProperties
              appState={appState}
              renderAction={renderAction}
              model={compactModel}
              popupOwner={popupOwner}
              container={container}
              railSlot="category:text"
            />
          </>
        )}
      </div>

      <div
        className="property-rail__group property-rail__tail"
        data-property-rail-group="tail"
      >
        {tailDescriptors.map((descriptor) => (
          <div
            className="compact-action-item"
            data-property-rail-slot={`tail:${descriptor.id}`}
            key={descriptor.id}
          >
            {renderPropertyDescriptor(descriptor, renderAction)}
          </div>
        ))}
        <CombinedExtraActions
          renderAction={renderAction}
          model={compactModel}
          popupOwner={popupOwner}
          container={container}
          railSlot="tail:actions"
        />
      </div>
    </div>
  );
};

/**
 * Mobile styles panel — the horizontal action bar used on phones, with an
 * overflow measurement that promotes duplicate/delete out of the popover when
 * there is room.
 */
export const MobileShapeActions = ({
  appState,
  elementsMap,
  renderAction,
  app,
  setAppState,
}: {
  appState: UIAppState;
  elementsMap: NonDeletedElementsMap | NonDeletedSceneElementsMap;
  renderAction: ActionManager["renderAction"];
  app: AppClassProperties;
  setAppState: React.Component<any, AppState>["setState"];
}) => {
  const targetElements = getTargetElements(elementsMap, appState);
  const model = resolvePropertyModel(
    appState,
    targetElements,
    elementsMap,
    app,
  );
  const { container } = useExcalidrawContainer();
  const phoneModel = getPropertyModelForAdapter(model, "phone");
  const phoneDescriptors = phoneModel.descriptors;
  const candidateDescriptorIds = [
    "strokeColor",
    "backgroundColor",
    "fontFamily",
  ].filter((id): id is PropertyIdentity =>
    phoneDescriptors.some((descriptor) => descriptor.id === id),
  );
  const units = useMemo<readonly PhonePropertyUnit[]>(
    () => [
      ...candidateDescriptorIds.map((id) => ({ id })),
      { id: "combined", required: true },
      { id: "undo", required: true },
      { id: "redo", required: true },
      ...(phoneDescriptors.some((descriptor) => descriptor.id === "duplicate")
        ? [{ id: "duplicate" }]
        : []),
      ...(phoneDescriptors.some((descriptor) => descriptor.id === "delete")
        ? [{ id: "delete" }]
        : []),
    ],
    // Descriptor identity is the complete semantic invalidation boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phoneDescriptors.map((descriptor) => descriptor.id).join("|")],
  );
  const { containerRef, measurementRef, plan } = usePhonePropertyLayout(units);
  const popupOwner = usePropertyPopupOwner({
    appState,
    setAppState,
    eligible: ["compactOtherProperties"],
    ownerKey: `phone:${
      appState.width > appState.height ? "landscape" : "portrait"
    }`,
  });
  const directDescriptorIds = new Set(
    plan.directIds.filter((id): id is PropertyIdentity =>
      phoneDescriptors.some((descriptor) => descriptor.id === id),
    ),
  );
  const combinedDescriptorIds = phoneDescriptors
    .filter((descriptor) => !directDescriptorIds.has(descriptor.id))
    .map((descriptor) => descriptor.id);
  const propertyPopupOpen = popupOwner.isOpen("compactOtherProperties");
  const propertyForegroundOpen =
    propertyPopupOpen ||
    (appState.openPopup !== null && appState.openPopup !== "canvasBackground");
  const propertyPopupMaxBlockSize = Math.max(
    128,
    Math.min(340, Math.floor(appState.height * 0.42)),
  );

  useEffect(() => {
    if (!propertyForegroundOpen || !container) {
      return;
    }
    const toolbar = container.querySelector<HTMLElement>(
      ".App-bottom-bar > .adaptive-toolbar-shell",
    );
    if (!toolbar) {
      return;
    }
    const previous = {
      opacity: toolbar.style.opacity,
      pointerEvents: toolbar.style.pointerEvents,
      ariaHidden: toolbar.getAttribute("aria-hidden"),
      inert: toolbar.inert,
    };
    toolbar.dataset.propertyPopupShielded = "true";
    toolbar.style.opacity = "0";
    toolbar.style.pointerEvents = "none";
    toolbar.setAttribute("aria-hidden", "true");
    toolbar.inert = true;

    return () => {
      if (toolbar.dataset.propertyPopupShielded !== "true") {
        return;
      }
      delete toolbar.dataset.propertyPopupShielded;
      toolbar.style.opacity = previous.opacity;
      toolbar.style.pointerEvents = previous.pointerEvents;
      toolbar.inert = previous.inert;
      if (previous.ariaHidden == null) {
        toolbar.removeAttribute("aria-hidden");
      } else {
        toolbar.setAttribute("aria-hidden", previous.ariaHidden);
      }
    };
  }, [container, propertyForegroundOpen]);

  const renderUnit = (id: string) => {
    const descriptor = phoneDescriptors.find((item) => item.id === id);
    if (descriptor) {
      return (
        <div className="compact-action-item" key={id}>
          {renderPropertyDescriptor(descriptor, renderAction)}
        </div>
      );
    }
    if (id === "combined") {
      return (
        <CombinedExtraActions
          key={id}
          renderAction={renderAction}
          model={phoneModel}
          popupOwner={popupOwner}
          container={container}
          combinedDescriptorIds={combinedDescriptorIds}
          excludedDescriptorIds={[...directDescriptorIds]}
          maxContentBlockSize={propertyPopupMaxBlockSize}
        />
      );
    }
    if (id === "undo" || id === "redo") {
      return (
        <div className="compact-action-item" key={id}>
          {renderAction(id)}
        </div>
      );
    }
    return null;
  };

  return (
    <Island
      className="compact-shape-actions mobile-shape-actions property-phone-surface"
      data-viewport-ui="bottom"
      data-viewport-ui-name="stylesPanel"
      aria-label={t("stats.title")}
      style={{ pointerEvents: "none" }}
      ref={containerRef}
    >
      <div
        className="property-phone-surface__visible"
        data-property-adapter="phone"
      >
        {plan.directIds.map(renderUnit)}
      </div>
      <div
        aria-hidden="true"
        className="property-phone-surface__measurement"
        data-property-measurement
        inert
        ref={measurementRef}
      >
        {units.map((unit) => (
          <button
            type="button"
            aria-hidden="true"
            className="property-phone-surface__measure-control"
            data-property-measure-id={unit.id}
            key={unit.id}
            tabIndex={-1}
          />
        ))}
      </div>
    </Island>
  );
};

export const ShapesSwitcher = ({
  activeTool,
  setAppState,
  app,
  UIOptions,
  maxWidth,
}: {
  activeTool: UIAppState["activeTool"];
  setAppState: React.Component<any, AppState>["setState"];
  app: AppClassProperties;
  UIOptions: AppProps["UIOptions"];
  maxWidth?: number;
}) => {
  const isFullStylesPanel = useStylesPanelMode() === "full";
  return (
    <AdaptiveEditorToolbar
      activeTool={activeTool}
      setAppState={setAppState}
      app={app}
      UIOptions={UIOptions}
      isFullStylesPanel={isFullStylesPanel}
      variant="desktop"
      maxWidth={maxWidth}
    />
  );
};

export const ZoomActions = ({
  actionManager,
}: {
  actionManager: ActionManager;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const zoom = useAppStateValue((appState) => appState.zoom.value);
  const app = useApp();

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const runAndClose = (action: typeof actionZoomToFit) => {
    actionManager.executeAction(action, "ui");
    setOpen(false);
  };

  const setZoom = (value: number) => {
    app.requestUnfollow();
    app.setAppState(
      getViewportForZoomWithScrollConstraints(
        {
          viewportX: app.state.width / 2 + app.state.offsetLeft,
          viewportY: app.state.height / 2 + app.state.offsetTop,
          nextZoom: getNormalizedZoom(value),
        },
        app.state,
      ),
    );
    setOpen(false);
  };

  return (
    <div className={CLASSES.ZOOM_ACTIONS} ref={rootRef}>
      <button
        type="button"
        className="zoom-menu-trigger"
        aria-label={t("buttons.resetZoom")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {Math.round(zoom * 100)}%
      </button>
      {open && (
        <div className="zoom-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => actionManager.executeAction(actionZoomIn, "ui")}
          >
            <span className="zoom-menu__icon">＋</span>
            <span>{t("buttons.zoomIn")}</span>
            <span className="zoom-menu__shortcut">⌘ +</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => actionManager.executeAction(actionZoomOut, "ui")}
          >
            <span className="zoom-menu__icon">−</span>
            <span>{t("buttons.zoomOut")}</span>
            <span className="zoom-menu__shortcut">⌘ −</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAndClose(actionZoomToFit)}
          >
            <span className="zoom-menu__icon">⌗</span>
            <span>{t("helpDialog.zoomToFit")}</span>
            <span className="zoom-menu__shortcut">⇧ 1</span>
          </button>
          <div className="zoom-menu__separator" />
          {[0.5, 1, 2].map((value) => (
            <button
              type="button"
              role="menuitem"
              className={Math.abs(zoom - value) < 0.001 ? "is-selected" : ""}
              key={value}
              onClick={() => {
                setZoom(value);
              }}
            >
              <span>{value * 100}%</span>
              {Math.abs(zoom - value) < 0.001 && (
                <span className="zoom-menu__check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const UndoRedoActions = ({
  renderAction,
  className,
}: {
  renderAction: ActionManager["renderAction"];
  className?: string;
}) => (
  <div className={`undo-redo-buttons ${className}`}>
    <div className="undo-button-container">
      <Tooltip label={t("buttons.undo")}>{renderAction("undo")}</Tooltip>
    </div>
    <div className="redo-button-container">
      <Tooltip label={t("buttons.redo")}> {renderAction("redo")}</Tooltip>
    </div>
  </div>
);

export const ExitZenModeButton = ({
  actionManager,
  showExitZenModeBtn,
}: {
  actionManager: ActionManager;
  showExitZenModeBtn: boolean;
}) => (
  <button
    type="button"
    className={clsx("disable-zen-mode", {
      "disable-zen-mode--visible": showExitZenModeBtn,
    })}
    onClick={() => actionManager.executeAction(actionToggleZenMode)}
  >
    {t("buttons.exitZenMode")}
  </button>
);

export const ExitViewModeButton = ({
  actionManager,
}: {
  actionManager: ActionManager;
}) => (
  <button
    type="button"
    className="disable-view-mode"
    onClick={() => actionManager.executeAction(actionToggleViewMode)}
  >
    {pencilIcon}
  </button>
);
