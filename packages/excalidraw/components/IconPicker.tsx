import { Popover } from "radix-ui";
import clsx from "clsx";
import React, { useEffect, useId, useMemo, useRef } from "react";

import { isArrowKey, KEYS } from "@excalidraw/common";

import { atom, useAtom } from "../editor-jotai";
import { t } from "../i18n";

import Collapsible from "./Stats/Collapsible";
import {
  useEditorInterface,
  useExcalidrawContainer,
  useStylesPanelMode,
} from "./App";
import {
  FloatingSurfaceFrame,
  FloatingSurfaceHeading,
  FloatingSurfaceItemVisual,
  FloatingSurfaceScrollViewport,
  FloatingSurfaceSection,
  FloatingSurfaceShortcut,
  readEditorSafeAreaInsets,
  resolveFloatingSurfacePolicy,
  useFloatingSurfaceOwner,
} from "./floatingSurface";
import { resolvePropertyPlacement } from "./propertyPlacement";

import "./IconPicker.scss";

import type { JSX } from "react";

const moreOptionsAtom = atom(false);
const PICKER_COLUMNS = 4;
const DEFAULT_SECTION_NAME = "default";

type Option<T> = {
  value: T;
  text: string;
  icon: JSX.Element;
  keyBinding: string | null;
};

type PickerSection<T> = {
  name: string;
  options: readonly Option<T>[];
};

const flattenOptions = <T,>(sections: readonly PickerSection<T>[]) =>
  sections.flatMap((section) => section.options);

const findOption = <T,>(
  sections: readonly PickerSection<T>[],
  predicate: (option: Option<T>) => boolean,
) => {
  for (const section of sections) {
    const option = section.options.find(predicate);
    if (option) {
      return option;
    }
  }

  return null;
};

const hasOption = <T,>(
  sections: readonly PickerSection<T>[],
  predicate: (option: Option<T>) => boolean,
) => sections.some((section) => section.options.some(predicate));

const getNavigationRows = <T,>(sections: readonly PickerSection<T>[]) =>
  sections.flatMap((section) =>
    Array.from(
      { length: Math.ceil(section.options.length / PICKER_COLUMNS) },
      (_, index) =>
        section.options.slice(
          index * PICKER_COLUMNS,
          index * PICKER_COLUMNS + PICKER_COLUMNS,
        ),
    ),
  );

function Picker<T>({
  visibleSections,
  hiddenSections = [],
  value,
  label,
  onChange,
  onClose,
}: {
  label: string;
  value: T;
  visibleSections: readonly PickerSection<T>[];
  hiddenSections?: readonly PickerSection<T>[];
  onChange: (value: T) => void;
  onClose: () => void;
}) {
  const { container } = useExcalidrawContainer();
  const editorInterface = useEditorInterface();
  const stylesPanelMode = useStylesPanelMode();
  const [showMoreOptions, setShowMoreOptions] = useAtom(moreOptionsAtom);
  const selectedOptionRef = useRef<HTMLButtonElement>(null);
  const direction =
    container?.getAttribute("dir") === "rtl" ||
    container?.closest<HTMLElement>("[dir=rtl]") ||
    document.documentElement.getAttribute("dir") === "rtl"
      ? "rtl"
      : "ltr";
  const allSections = [...visibleSections, ...hiddenSections];
  const allOptions = flattenOptions(allSections);
  const navigationRows = getNavigationRows([
    ...visibleSections,
    ...(showMoreOptions ? hiddenSections : []),
  ]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const pressedOption = allOptions.find(
      (option) => option.keyBinding === event.key.toLowerCase(),
    );

    if (!(event.metaKey || event.altKey || event.ctrlKey) && pressedOption) {
      // Keybinding navigation
      onChange(pressedOption.value);

      event.preventDefault();
    } else if (event.key === KEYS.TAB) {
      const index = allOptions.findIndex((option) => option.value === value);
      const nextIndex = event.shiftKey
        ? (allOptions.length + index - 1) % allOptions.length
        : (index + 1) % allOptions.length;
      onChange(allOptions[nextIndex].value);
    } else if (isArrowKey(event.key)) {
      // Arrow navigation
      const isRTL = direction === "rtl";
      const index = allOptions.findIndex((option) => option.value === value);
      if (index !== -1) {
        const length = allOptions.length;
        let nextIndex = index;

        switch (event.key) {
          // Select the next option
          case isRTL ? KEYS.ARROW_LEFT : KEYS.ARROW_RIGHT:
            nextIndex = (index + 1) % length;
            break;
          // Select the previous option
          case isRTL ? KEYS.ARROW_RIGHT : KEYS.ARROW_LEFT:
            nextIndex = (length + index - 1) % length;
            break;
          // Go the next row
          case KEYS.ARROW_DOWN: {
            const currentRowIndex = navigationRows.findIndex((row) =>
              row.some((option) => option.value === value),
            );
            const currentRow = navigationRows[currentRowIndex];

            if (currentRowIndex !== -1 && currentRow) {
              const column = currentRow.findIndex(
                (option) => option.value === value,
              );
              const nextRow =
                navigationRows[(currentRowIndex + 1) % navigationRows.length];
              const nextOption =
                nextRow[Math.min(column, nextRow.length - 1)] ??
                allOptions[index];

              onChange(nextOption.value);
              event.preventDefault();
              event.nativeEvent.stopImmediatePropagation();
              event.stopPropagation();
              return;
            }
            break;
          }
          // Go the previous row
          case KEYS.ARROW_UP: {
            const currentRowIndex = navigationRows.findIndex((row) =>
              row.some((option) => option.value === value),
            );
            const currentRow = navigationRows[currentRowIndex];

            if (currentRowIndex !== -1 && currentRow) {
              const column = currentRow.findIndex(
                (option) => option.value === value,
              );
              const previousRow =
                navigationRows[
                  (navigationRows.length + currentRowIndex - 1) %
                    navigationRows.length
                ];
              const previousOption =
                previousRow[Math.min(column, previousRow.length - 1)] ??
                allOptions[index];

              onChange(previousOption.value);
              event.preventDefault();
              event.nativeEvent.stopImmediatePropagation();
              event.stopPropagation();
              return;
            }
            break;
          }
        }

        onChange(allOptions[nextIndex].value);
      }
      event.preventDefault();
    } else if (event.key === KEYS.ESCAPE || event.key === KEYS.ENTER) {
      // Close on escape or enter
      event.preventDefault();
      onClose();
    }
    event.nativeEvent.stopImmediatePropagation();
    event.stopPropagation();
  };

  useEffect(() => {
    if (hasOption(hiddenSections, (option) => option.value === value)) {
      setShowMoreOptions(true);
    }
  }, [value, hiddenSections, setShowMoreOptions]);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      selectedOptionRef.current?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  const placement = resolvePropertyPlacement({
    formFactor: editorInterface.formFactor === "phone" ? "phone" : "desktop",
    isLandscape: editorInterface.isLandscape,
    direction,
    surface:
      editorInterface.formFactor === "phone"
        ? "phone"
        : stylesPanelMode === "full"
        ? "full"
        : "compact",
    collisionBoundary: container,
  });
  const policy = resolveFloatingSurfacePolicy({
    kind: "icon-picker",
    intent:
      editorInterface.formFactor === "phone"
        ? "phone-up"
        : "property-canvas-inward",
    formFactor: editorInterface.formFactor === "phone" ? "phone" : "desktop",
    direction,
    pointerDensity: editorInterface.isTouchScreen ? "coarse" : "fine",
    collisionPadding: placement.collisionPadding,
    safeArea: readEditorSafeAreaInsets(container),
    availableBlockSize: container?.clientHeight ?? 0,
  });

  const renderOptions = (options: readonly Option<T>[]) => {
    return (
      <div
        className="picker-content"
        style={{
          minInlineSize: 0,
          inlineSize: "100%",
          gridTemplateColumns: "repeat(4, minmax(2.75rem, 1fr))",
        }}
      >
        {options.map((option) => (
          <FloatingSurfaceItemVisual
            asChild
            selected={value === option.value}
            key={option.text}
          >
            <button
              type="button"
              className={clsx("picker-option", {
                active: value === option.value,
              })}
              data-selected={value === option.value || undefined}
              onClick={() => {
                onChange(option.value);
              }}
              title={
                option.keyBinding
                  ? `${option.text} — ${option.keyBinding.toUpperCase()}`
                  : option.text
              }
              aria-label={option.text || "none"}
              aria-keyshortcuts={option.keyBinding || undefined}
              aria-pressed={value === option.value}
              ref={value === option.value ? selectedOptionRef : undefined}
            >
              {option.icon}
              {option.keyBinding && (
                <FloatingSurfaceShortcut className="picker-keybinding">
                  {option.keyBinding}
                </FloatingSurfaceShortcut>
              )}
            </button>
          </FloatingSurfaceItemVisual>
        ))}
      </div>
    );
  };

  const renderSections = (sections: readonly PickerSection<T>[]) =>
    sections.map((section, index) =>
      section.name === DEFAULT_SECTION_NAME ? (
        <React.Fragment key={`${section.name}-${index}`}>
          {renderOptions(section.options)}
        </React.Fragment>
      ) : (
        <FloatingSurfaceSection
          className="picker-section"
          key={`${section.name}-${index}`}
        >
          <FloatingSurfaceHeading className="picker-section-label">
            {section.name}
          </FloatingSurfaceHeading>
          {renderOptions(section.options)}
        </FloatingSurfaceSection>
      ),
    );

  return (
    <Popover.Portal container={container}>
      <Popover.Content
        className="floating-surface-positioner icon-picker-positioner"
        aria-label={label}
        side={placement.popoverSide}
        align={placement.popoverAlign}
        sideOffset={10}
        collisionPadding={policy.collisionPadding}
        style={{ zIndex: "var(--zIndex-ui-styles-popup)" }}
        onKeyDown={handleKeyDown}
        collisionBoundary={placement.collisionBoundary ?? undefined}
      >
        <FloatingSurfaceFrame
          className="picker"
          density={policy.density}
          kind="icon-picker"
          style={{
            ["--floating-surface-available-block-size" as string]: `min(${policy.maxBlockSize}px, var(--radix-popover-content-available-height))`,
          }}
        >
          <FloatingSurfaceScrollViewport className="picker-sections">
            {renderSections(visibleSections)}

            {hiddenSections.length > 0 && (
              <Collapsible
                label={t("labels.more_options")}
                open={showMoreOptions}
                openTrigger={() => {
                  setShowMoreOptions((value) => !value);
                }}
                className="picker-collapsible"
              >
                <div className="picker-sections">
                  {renderSections(hiddenSections)}
                </div>
              </Collapsible>
            )}
          </FloatingSurfaceScrollViewport>
        </FloatingSurfaceFrame>
      </Popover.Content>
    </Popover.Portal>
  );
}

export function IconPicker<T>({
  value,
  label,
  visibleSections,
  hiddenSections,
  onChange,
}: {
  label: string;
  value: T;
  visibleSections: readonly PickerSection<T>[];
  hiddenSections?: readonly PickerSection<T>[];
  onChange: (value: T) => void;
}) {
  const [isActive, setActive] = React.useState(false);
  const { id: editorId } = useExcalidrawContainer();
  const instanceId = useId();
  useFloatingSurfaceOwner({
    scope: `${editorId ?? "editor"}:picker`,
    identity: `icon-picker:${instanceId}`,
    open: isActive,
    onOpenChange: setActive,
  });
  const selectedOption = useMemo(
    () =>
      findOption(visibleSections, (option) => option.value === value) ??
      findOption(hiddenSections ?? [], (option) => option.value === value),
    [visibleSections, hiddenSections, value],
  );

  return (
    <div>
      <Popover.Root open={isActive} onOpenChange={(open) => setActive(open)}>
        <Popover.Trigger
          type="button"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={isActive}
          className={isActive ? "active" : ""}
        >
          {selectedOption?.icon}
        </Popover.Trigger>
        {isActive && (
          <Picker
            visibleSections={visibleSections}
            hiddenSections={hiddenSections}
            value={value}
            label={label}
            onChange={onChange}
            onClose={() => {
              setActive(false);
            }}
          />
        )}
      </Popover.Root>
    </div>
  );
}
