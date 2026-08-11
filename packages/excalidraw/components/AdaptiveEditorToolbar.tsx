import clsx from "clsx";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { capitalizeString } from "@excalidraw/common";

import type { PointerType } from "@excalidraw/element/types";

import { t } from "../i18n";
import { useTunnels } from "../context/tunnels";

import DropdownMenu from "./dropdownMenu/DropdownMenu";
import { ToolButton } from "./ToolButton";
import { ToolGroupDropdown } from "./ToolGroupDropdown";
import {
  AudioIcon,
  ImageIcon,
  MagicIcon,
  VideoIcon,
  extraToolsIcon,
  mermaidLogoIcon,
} from "./icons";
import { DotsHorizontalIcon } from "./primitives/chrome-icons";
import { activateToolbarTool, TOOLS } from "./Tools";
import { useExcalidrawContainer } from "./App";
import {
  createToolbarUnits,
  resolveToolbarItems,
  useAdaptiveToolbarLayout,
} from "./adaptiveToolbar";

import "./AdaptiveEditorToolbar.scss";

import type { AppClassProperties, AppProps, UIAppState } from "../types";
import type { ToolGroupOption } from "./ToolGroupDropdown";
import type { ResolvedToolbarItem, ToolbarUnit } from "./adaptiveToolbar";
import type { JSX } from "react";

type AdaptiveEditorToolbarProps = {
  app: AppClassProperties;
  activeTool: UIAppState["activeTool"];
  setAppState: React.Component<any, UIAppState>["setState"];
  UIOptions: AppProps["UIOptions"];
  isFullStylesPanel: boolean;
  variant: "desktop" | "phone";
  maxWidth?: number;
};

const GeneratorToolIcon = ({ base }: { base: JSX.Element }) => (
  <span className="generator-tool-icon">
    {base}
    <span className="generator-tool-icon__sparkle">{MagicIcon}</span>
  </span>
);

const getItemIcon = (item: ResolvedToolbarItem): JSX.Element => {
  if (item.activation.kind === "tool") {
    if (item.activation.type === "video") {
      return VideoIcon;
    }
    if (item.activation.type === "audio") {
      return AudioIcon;
    }
    const config = TOOLS[item.activation.type as keyof typeof TOOLS];
    return (config?.icon ?? extraToolsIcon) as JSX.Element;
  }
  switch (item.activation.type) {
    case "generate-image":
      return <GeneratorToolIcon base={ImageIcon} />;
    case "generate-video":
      return <GeneratorToolIcon base={VideoIcon} />;
    case "mermaid":
      return mermaidLogoIcon;
    case "diagram-to-code":
      return MagicIcon;
    default:
      return extraToolsIcon;
  }
};

const itemLabel = (item: ResolvedToolbarItem) =>
  capitalizeString(t(item.labelKey as Parameters<typeof t>[0]));

export const AdaptiveEditorToolbar = ({
  app,
  activeTool,
  setAppState,
  UIOptions,
  isFullStylesPanel,
  variant,
  maxWidth,
}: AdaptiveEditorToolbarProps) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [lastSelectedByGroup, setLastSelectedByGroup] = useState<
    Record<string, string>
  >({
    selection: "selection",
    upload: "image",
    shapes: "rectangle",
    drawing: "freedraw",
  });
  const [lastOverflowActivatedId, setLastOverflowActivatedId] = useState<
    string | null
  >(null);
  const overflowTriggerRef = useRef<HTMLButtonElement>(null);
  const menuTriggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastPointerTypeRef = useRef<PointerType | null>(null);
  const toolbarInstanceId = useId();
  const { container } = useExcalidrawContainer();
  const { TTDDialogTriggerTunnel } = useTunnels();
  const preferredSelectionToolType = app.state.preferredSelectionTool.type;
  const forcedToolType = app.props.activeTool?.type;
  const isCollaborating = app.props.isCollaborating;
  const hasGenerator = Boolean(app.props.renderGeneratorPanel);
  const aiEnabled = app.props.aiEnabled !== false;
  const hasDiagramToCode = Boolean(app.plugins.diagramToCode);

  const items = useMemo(
    () =>
      resolveToolbarItems({
        activeToolType: activeTool.type,
        preferredSelectionToolType,
        toolOptions: UIOptions.tools as
          | (AppProps["UIOptions"]["tools"] & Record<string, boolean>)
          | undefined,
        forcedToolType,
        isFullStylesPanel,
        isCollaborating,
        hasGenerator,
        aiEnabled,
        hasDiagramToCode,
      }),
    [
      UIOptions.tools,
      activeTool.type,
      aiEnabled,
      forcedToolType,
      hasDiagramToCode,
      hasGenerator,
      isFullStylesPanel,
      isCollaborating,
      preferredSelectionToolType,
    ],
  );
  const units = useMemo(() => createToolbarUnits(items), [items]);
  const { containerRef, measurementRef, primaryUnits, overflowUnits } =
    useAdaptiveToolbarLayout(units);

  useEffect(() => {
    const unsubscribe = app.onPointerDownEmitter.on(() => setOpenMenu(null));
    return () => unsubscribe?.();
  }, [app]);

  useEffect(() => {
    const mobileActions =
      container?.querySelector<HTMLElement>(".mobile-shape-actions") ?? null;
    if (openMenu) {
      container?.setAttribute("data-toolbar-menu-open", "true");
      mobileActions?.setAttribute("aria-hidden", "true");
      if (mobileActions) {
        mobileActions.inert = true;
        mobileActions.style.opacity = "0";
      }
    } else {
      container?.removeAttribute("data-toolbar-menu-open");
      mobileActions?.removeAttribute("aria-hidden");
      if (mobileActions) {
        mobileActions.inert = false;
        mobileActions.style.removeProperty("opacity");
      }
    }

    return () => {
      container?.removeAttribute("data-toolbar-menu-open");
      mobileActions?.removeAttribute("aria-hidden");
      if (mobileActions) {
        mobileActions.inert = false;
        mobileActions.style.removeProperty("opacity");
      }
    };
  }, [container, openMenu]);

  const activate = (
    item: ResolvedToolbarItem,
    fromOverflow = false,
    pointerType: PointerType | null = lastPointerTypeRef.current,
  ) => {
    if (item.disabled) {
      return;
    }
    if (fromOverflow) {
      setLastOverflowActivatedId(item.id);
    }

    if (item.activation.kind === "tool") {
      const type = item.activation.type;
      activateToolbarTool(app, type, pointerType);
      if (type === "selection" || type === "lasso") {
        setAppState({
          preferredSelectionTool: { type, initialized: true },
        });
      }
      return;
    }

    switch (item.activation.type) {
      case "generate-image":
        app.createGeneratorNode("image");
        break;
      case "generate-video":
        app.createGeneratorNode("video");
        break;
      case "mermaid":
        app.setOpenDialog({ name: "ttd", tab: "mermaid" });
        break;
      case "diagram-to-code":
        app.onMagicframeToolSelect();
        break;
      case "text-to-diagram":
        break;
    }
  };

  const renderGroup = (unit: ToolbarUnit) => {
    const options: ToolGroupOption[] = unit.items
      .filter((item) => item.activation.kind === "tool")
      .map((item) => ({
        type: item.activation.kind === "tool" ? item.activation.type : item.id,
        icon: getItemIcon(item),
        label: itemLabel(item),
        shortcut: variant === "phone" ? undefined : item.shortcut,
        fillable: item.fillable,
        disabled: item.disabled,
        "data-testid": item.testId,
      }));
    if (options.length === 0) {
      return null;
    }
    const titleKey =
      unit.id === "selection"
        ? "toolBar.select"
        : unit.id === "upload"
        ? "toolBar.upload"
        : unit.id === "shapes"
        ? "toolBar.shapes"
        : "toolBar.freedraw";
    return (
      <ToolGroupDropdown
        key={unit.id}
        app={app}
        activeToolType={activeTool.type}
        options={options}
        title={capitalizeString(t(titleKey as Parameters<typeof t>[0]))}
        data-testid={
          unit.id === "drawing"
            ? "toolbar-freedraw"
            : unit.id === "selection"
            ? "toolbar-selection"
            : `toolbar-${unit.id}-group`
        }
        isOpen={openMenu === unit.id}
        onOpenChange={(open) => setOpenMenu(open ? unit.id : null)}
        lastSelectedType={lastSelectedByGroup[unit.id] ?? options[0].type}
        onLastSelectedTypeChange={(type) =>
          setLastSelectedByGroup((current) => ({
            ...current,
            [unit.id]: type,
          }))
        }
        onSelectTool={(type, pointerType) => {
          const item = unit.items.find(
            (candidate) =>
              candidate.activation.kind === "tool" &&
              candidate.activation.type === type,
          );
          if (item) {
            activate(item, false, pointerType);
          }
        }}
        activateOnOpen={unit.id !== "upload"}
        menuClassName={clsx(
          unit.id === "drawing" && "tool-popover-content",
          variant === "phone" && "adaptive-editor-toolbar__menu--phone",
        )}
        collisionBoundary={container}
      />
    );
  };

  const renderMenuItem = (item: ResolvedToolbarItem, fromOverflow: boolean) => {
    if (
      item.activation.kind === "action" &&
      item.activation.type === "text-to-diagram"
    ) {
      return (
        <div key={item.id} className="adaptive-editor-toolbar__tunnel-item">
          <TTDDialogTriggerTunnel.Out />
        </div>
      );
    }
    return (
      <DropdownMenu.Item
        key={item.id}
        onSelect={() => activate(item, fromOverflow)}
        icon={getItemIcon(item)}
        shortcut={variant === "phone" ? undefined : item.shortcut}
        data-testid={item.testId}
        selected={item.selected}
        disabled={item.disabled}
        role="menuitemradio"
        aria-checked={item.selected}
        onPointerDown={(event) => {
          lastPointerTypeRef.current = event.pointerType as PointerType;
        }}
        onPointerUp={() => {
          requestAnimationFrame(() => {
            lastPointerTypeRef.current = null;
          });
        }}
      >
        {itemLabel(item)}
      </DropdownMenu.Item>
    );
  };

  const renderDropdownUnit = (unit: ToolbarUnit) => {
    const selectedItem = unit.items.find(
      (item) =>
        item.selected && (variant === "phone" || item.projectedSelected),
    );
    const isOpen = openMenu === unit.id;
    const menuId = `${toolbarInstanceId}-${unit.id}-menu`;
    const menuItems =
      unit.id === "extra"
        ? [
            ...items.filter((item) => item.id === "tool:autoshape"),
            ...unit.items,
          ]
        : unit.items;
    return (
      <DropdownMenu
        open={isOpen}
        key={unit.id}
        ownerIdentity={menuId}
        onOpenChange={(open) => {
          setOpenMenu(open ? unit.id : null);
          if (open) {
            setAppState({ openMenu: null, openPopup: null });
          } else {
            requestAnimationFrame(() =>
              menuTriggerRefs.current.get(unit.id)?.focus(),
            );
          }
        }}
      >
        <DropdownMenu.Trigger
          ref={(node) => {
            if (node) {
              menuTriggerRefs.current.set(unit.id, node);
            } else {
              menuTriggerRefs.current.delete(unit.id);
            }
          }}
          className={clsx("adaptive-editor-toolbar__menu-trigger", {
            "App-toolbar__extra-tools-trigger": true,
            "App-toolbar__extra-tools-trigger--selected":
              Boolean(selectedItem) || isOpen,
            "adaptive-editor-toolbar__menu-trigger--selected":
              Boolean(selectedItem) || isOpen,
          })}
          title={t("toolBar.extraTools")}
          aria-label={t("toolBar.extraTools")}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={menuId}
          data-testid={`toolbar-${unit.id}-group`}
        >
          {selectedItem ? getItemIcon(selectedItem) : extraToolsIcon}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          id={menuId}
          onSelect={() => setOpenMenu(null)}
          className={clsx(
            "App-toolbar__extra-tools-dropdown adaptive-editor-toolbar__menu",
            variant === "phone" && "adaptive-editor-toolbar__menu--phone",
          )}
          align="center"
          side="top"
          surfaceKind="toolbar-menu"
          placementIntent="toolbar-up"
          collisionBoundary={container}
        >
          {menuItems.map((item) => renderMenuItem(item, false))}
        </DropdownMenu.Content>
      </DropdownMenu>
    );
  };

  const renderUnit = (unit: ToolbarUnit) => {
    if (
      unit.id === "selection" ||
      unit.id === "upload" ||
      unit.id === "shapes" ||
      unit.id === "drawing"
    ) {
      return renderGroup(unit);
    }
    if (unit.id === "extra") {
      return renderDropdownUnit(unit);
    }
    const item = unit.items[0];
    return (
      <ToolButton
        key={unit.id}
        className={clsx("Shape adaptive-editor-toolbar__action", {
          fillable: item.fillable,
        })}
        type="button"
        icon={getItemIcon(item)}
        selected={item.selected}
        disabled={item.disabled}
        title={itemLabel(item)}
        aria-label={itemLabel(item)}
        aria-keyshortcuts={variant === "phone" ? undefined : item.shortcut}
        data-testid={item.testId}
        onPointerDown={({ pointerType }) => {
          lastPointerTypeRef.current = pointerType;
        }}
        onClick={() => activate(item)}
      />
    );
  };

  const overflowSemanticItems = overflowUnits.flatMap((unit) => unit.items);
  const overflowItems = [
    ...(overflowUnits.some((unit) => unit.id === "extra")
      ? items.filter((item) => item.id === "tool:autoshape")
      : []),
    ...overflowSemanticItems,
  ];
  const hiddenSelectedItem = overflowSemanticItems.find(
    (item) => item.selected && (variant === "phone" || item.projectedSelected),
  );
  const recentOverflowItem = overflowSemanticItems.find(
    (item) => item.id === lastOverflowActivatedId,
  );
  const projectedItem = hiddenSelectedItem ?? recentOverflowItem;
  const overflowOpen = openMenu === "overflow";
  const overflowLabel = projectedItem
    ? `${t("toolBar.extraTools")}: ${itemLabel(projectedItem)}`
    : t("toolBar.extraTools");
  const overflowMenuId = `${toolbarInstanceId}-overflow-menu`;

  const renderMeasurementUnit = (unit: ToolbarUnit) => {
    const selectedItem = unit.items.find(
      (item) =>
        item.selected && (variant === "phone" || item.projectedSelected),
    );
    const displayedItem = selectedItem ?? unit.items[0];
    const className =
      unit.id === "selection" ||
      unit.id === "upload" ||
      unit.id === "shapes" ||
      unit.id === "drawing"
        ? "adaptive-editor-toolbar__group-trigger"
        : unit.id === "extra"
        ? "adaptive-editor-toolbar__menu-trigger"
        : "adaptive-editor-toolbar__action";

    return (
      <button
        type="button"
        tabIndex={-1}
        className={clsx(
          "adaptive-editor-toolbar__measurement-control",
          className,
        )}
        data-toolbar-measure-id={unit.id}
        key={unit.id}
      >
        {getItemIcon(displayedItem)}
      </button>
    );
  };

  return (
    <div
      className={clsx(
        "adaptive-editor-toolbar",
        `adaptive-editor-toolbar--${variant}`,
      )}
      ref={containerRef}
      style={maxWidth ? { width: maxWidth } : undefined}
      role="toolbar"
      aria-label={capitalizeString(t("helpDialog.tools"))}
      data-adaptive-toolbar={variant}
      onPointerDownCapture={(event) => {
        lastPointerTypeRef.current = event.pointerType as PointerType;
      }}
      onPointerUpCapture={() => {
        requestAnimationFrame(() => {
          lastPointerTypeRef.current = null;
        });
      }}
      onPointerCancelCapture={() => {
        lastPointerTypeRef.current = null;
      }}
    >
      <div className="adaptive-editor-toolbar__primary">
        {primaryUnits.map(renderUnit)}
        {overflowItems.length > 0 && (
          <DropdownMenu
            open={overflowOpen}
            ownerIdentity={overflowMenuId}
            onOpenChange={(open) => {
              setOpenMenu(open ? "overflow" : null);
              if (open) {
                setAppState({ openMenu: null, openPopup: null });
              } else {
                requestAnimationFrame(() =>
                  overflowTriggerRef.current?.focus(),
                );
              }
            }}
          >
            <DropdownMenu.Trigger
              ref={overflowTriggerRef}
              className={clsx("adaptive-editor-toolbar__overflow-trigger", {
                "App-toolbar__extra-tools-trigger": true,
                "App-toolbar__extra-tools-trigger--selected":
                  Boolean(projectedItem) || overflowOpen,
                "adaptive-editor-toolbar__overflow-trigger--selected":
                  Boolean(projectedItem) || overflowOpen,
              })}
              title={overflowLabel}
              aria-label={overflowLabel}
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              aria-controls={overflowMenuId}
              data-testid="toolbar-overflow-trigger"
            >
              {projectedItem ? getItemIcon(projectedItem) : DotsHorizontalIcon}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              id={overflowMenuId}
              onSelect={() => setOpenMenu(null)}
              className={clsx(
                "App-toolbar__extra-tools-dropdown adaptive-editor-toolbar__menu",
                variant === "phone" && "adaptive-editor-toolbar__menu--phone",
              )}
              align="center"
              side="top"
              surfaceKind="toolbar-menu"
              placementIntent="toolbar-up"
              collisionBoundary={container}
            >
              {overflowItems.map((item) => renderMenuItem(item, true))}
            </DropdownMenu.Content>
          </DropdownMenu>
        )}
      </div>

      <div
        ref={measurementRef}
        className="adaptive-editor-toolbar__measurement"
        aria-hidden="true"
        inert={true}
      >
        {units.map(renderMeasurementUnit)}
        <button
          type="button"
          tabIndex={-1}
          className="adaptive-editor-toolbar__measurement-control adaptive-editor-toolbar__overflow-trigger"
          data-toolbar-measure-overflow
        >
          {DotsHorizontalIcon}
        </button>
      </div>
    </div>
  );
};
