import clsx from "clsx";
import React from "react";

import {
  CLASSES,
  DEFAULT_SIDEBAR,
  TOOL_TYPE,
  arrayToMap,
  capitalizeString,
  isShallowEqual,
} from "@excalidraw/common";

import { mutateElement } from "@excalidraw/element";

import { showSelectedShapeActions } from "@excalidraw/element";

import { ShapeCache } from "@excalidraw/element";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { actionToggleStats } from "../actions";
import { trackEvent } from "../analytics";
import { TunnelsContext, useInitializeTunnels } from "../context/tunnels";
import { UIAppStateContext } from "../context/ui-appState";
import { useAtom, useAtomValue } from "../editor-jotai";

import { t } from "../i18n";
import { getScrollToContentState } from "../scene";

import {
  SelectedShapeActions,
  CompactShapeActions,
  ShapesSwitcher,
} from "./Actions";
import { LoadingMessage } from "./LoadingMessage";
import { MobileMenu } from "./MobileMenu";
import { CanvasUiLayout } from "./CanvasUiLayout";
import { PasteChartDialog } from "./PasteChartDialog";
import { Section } from "./Section";
import Stack from "./Stack";
import { UserList } from "./UserList";
import { PenModeButton } from "./PenModeButton";
import Footer from "./footer/Footer";
import { isSidebarDockedAtom } from "./Sidebar/Sidebar";
import MainMenu from "./main-menu/MainMenu";
import { ActiveConfirmDialog } from "./ActiveConfirmDialog";
import {
  useAppProps,
  useEditorInterface,
  useResponsiveEditorShell,
  useStylesPanelMode,
} from "./App";
import { OverwriteConfirmDialog } from "./OverwriteConfirm/OverwriteConfirm";
import { sidebarRightIcon } from "./primitives/chrome-icons";
import { DefaultSidebar } from "./DefaultSidebar";
import { TTDDialog } from "./TTDDialog/TTDDialog";
import { Stats } from "./Stats";
import ElementLinkDialog from "./ElementLinkDialog";
import { ErrorDialog } from "./ErrorDialog";
import { EyeDropper, activeEyeDropperAtom } from "./EyeDropper";
import { HelpDialog } from "./HelpDialog";
import { ImageExportDialog } from "./ImageExportDialog";
import { Island } from "./Island";
import { JSONExportDialog } from "./JSONExportDialog";
import { LaserPointerButton } from "./LaserPointerButton";
import { ToastRegion } from "./Toast";
import { LockButton } from "./LockButton";
import { HintViewer } from "./HintViewer";

import "./LayerUI.scss";
import "./Toolbar.scss";

import type { ActionManager } from "../actions/manager";
import type { CanvasUiZones } from "./CanvasUiLayout";

import type { Language } from "../i18n";
import type {
  AppProps,
  AppState,
  ExcalidrawProps,
  BinaryFiles,
  UIAppState,
  AppClassProperties,
} from "../types";

interface LayerUIProps {
  actionManager: ActionManager;
  appState: UIAppState;
  files: BinaryFiles;
  canvas: HTMLCanvasElement;
  setAppState: React.Component<any, AppState>["setState"];
  elements: readonly NonDeletedExcalidrawElement[];
  onLockToggle: () => void;
  onPenModeToggle: AppClassProperties["togglePenMode"];
  showExitZenModeBtn: boolean;
  langCode: Language["code"];
  renderTopLeftUI?: ExcalidrawProps["renderTopLeftUI"];
  renderTopRightUI?: ExcalidrawProps["renderTopRightUI"];
  renderCustomStats?: ExcalidrawProps["renderCustomStats"];
  UIOptions: AppProps["UIOptions"];
  onExportImage: AppClassProperties["onExportImage"];
  renderWelcomeScreen: boolean;
  children?: React.ReactNode;
  app: AppClassProperties;
  defaultUIEnabled: boolean;
  zoomUIEnabled: boolean;
  scrollBackToContentUIEnabled: boolean;
  isCollaborating: boolean;
  generateLinkForSelection?: AppProps["generateLinkForSelection"];
  currentUserControls?: ExcalidrawProps["currentUserControls"];
}

const DefaultMainMenu: React.FC<{
  UIOptions: AppProps["UIOptions"];
}> = ({ UIOptions }) => {
  return (
    <MainMenu __fallback>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      {/* FIXME we should to test for this inside the item itself */}
      {UIOptions.canvasActions.export && <MainMenu.DefaultItems.Export />}
      {/* FIXME we should to test for this inside the item itself */}
      {UIOptions.canvasActions.saveAsImage && (
        <MainMenu.DefaultItems.SaveAsImage />
      )}
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <MainMenu.Group title="Excalidraw links">
        <MainMenu.DefaultItems.Socials />
      </MainMenu.Group>
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme allowSystemTheme={false} />
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
};

const DefaultOverwriteConfirmDialog = () => {
  return (
    <OverwriteConfirmDialog __fallback>
      <OverwriteConfirmDialog.Actions.SaveToDisk />
      <OverwriteConfirmDialog.Actions.ExportToImage />
    </OverwriteConfirmDialog>
  );
};

const LayerUI = ({
  actionManager,
  appState,
  files,
  setAppState,
  elements,
  canvas,
  onLockToggle,
  onPenModeToggle,
  showExitZenModeBtn,
  renderTopLeftUI,
  renderTopRightUI,
  renderCustomStats,
  UIOptions,
  onExportImage,
  renderWelcomeScreen,
  children,
  app,
  defaultUIEnabled,
  zoomUIEnabled,
  scrollBackToContentUIEnabled,
  isCollaborating,
  generateLinkForSelection,
  currentUserControls,
}: LayerUIProps) => {
  const editorInterface = useEditorInterface();
  const responsive = useResponsiveEditorShell();
  const appProps = useAppProps();
  const stylesPanelMode = useStylesPanelMode();
  const isCompactStylesPanel = stylesPanelMode === "compact";
  const tunnels = useInitializeTunnels();

  const spacing = isCompactStylesPanel
    ? {
        menuTopGap: 4,
        toolbarColGap: 4,
        toolbarRowGap: 1,
        toolbarInnerRowGap: 0.5,
        islandPadding: 1,
        collabMarginLeft: 8,
      }
    : {
        menuTopGap: 6,
        toolbarColGap: 4,
        toolbarRowGap: 1,
        toolbarInnerRowGap: 1,
        islandPadding: 1,
        collabMarginLeft: 8,
      };

  const TunnelsJotaiProvider = tunnels.tunnelsJotai.Provider;

  const [eyeDropperState, setEyeDropperState] = useAtom(activeEyeDropperAtom);

  const renderJSONExportDialog = () => {
    if (!UIOptions.canvasActions.export) {
      return null;
    }

    return (
      <JSONExportDialog
        elements={elements}
        appState={appState}
        files={files}
        actionManager={actionManager}
        exportOpts={UIOptions.canvasActions.export}
        canvas={canvas}
        setAppState={setAppState}
      />
    );
  };

  const renderImageExportDialog = () => {
    if (
      !UIOptions.canvasActions.saveAsImage ||
      appState.openDialog?.name !== "imageExport"
    ) {
      return null;
    }

    return (
      <ImageExportDialog
        elements={elements}
        appState={appState}
        files={files}
        actionManager={actionManager}
        onExportImage={onExportImage}
        onCloseRequest={() => setAppState({ openDialog: null })}
        name={app.getName()}
      />
    );
  };

  const renderCanvasActions = () => (
    <div style={{ position: "relative" }}>
      <div className="excalidraw-ui-top-left">
        {renderTopLeftUI?.(false, appState)}
        <tunnels.MainMenuTunnel.Out />
      </div>
      {renderWelcomeScreen && <tunnels.WelcomeScreenMenuHintTunnel.Out />}
    </div>
  );

  const renderSelectedShapeActions = () => {
    return (
      <Section
        heading="selectedShapeActions"
        className={clsx("property-panel-section zen-mode-transition", {
          "transition-right": appState.zenModeEnabled,
        })}
      >
        {isCompactStylesPanel ? (
          <Island
            className="compact-shape-actions-island property-rail-island"
            padding={0}
            data-viewport-ui="side"
            data-viewport-ui-name="stylesPanel"
          >
            <CompactShapeActions
              appState={appState}
              elementsMap={app.scene.getNonDeletedElementsMap()}
              renderAction={actionManager.renderAction}
              app={app}
              setAppState={setAppState}
            />
          </Island>
        ) : (
          <Island
            className={clsx(
              CLASSES.SHAPE_ACTIONS_MENU,
              "property-inspector-island",
            )}
            padding={0}
            data-viewport-ui="side"
            data-viewport-ui-name="stylesPanel"
          >
            <SelectedShapeActions
              appState={appState}
              elementsMap={app.scene.getNonDeletedElementsMap()}
              renderAction={actionManager.renderAction}
              app={app}
            />
          </Island>
        )}
      </Section>
    );
  };

  const renderDesktopLayout = (footerZones: CanvasUiZones) => {
    const shouldRenderSelectedShapeActions =
      defaultUIEnabled && showSelectedShapeActions(appState, elements);

    const shouldShowStats =
      defaultUIEnabled &&
      appState.stats.open &&
      !appState.zenModeEnabled &&
      !appState.viewModeEnabled &&
      appState.openDialog?.name !== "elementLinkSelector";

    const topStart = (
      <Stack.Col gap={spacing.menuTopGap} className="layer-ui__top-start">
        {renderCanvasActions()}
      </Stack.Col>
    );

    const bottomToolbar =
      defaultUIEnabled &&
      !appState.viewModeEnabled &&
      appState.openDialog?.name !== "elementLinkSelector" ? (
        <Section
          heading="shapes"
          className="shapes-section"
          style={{ pointerEvents: "none" }}
        >
          {(heading: React.ReactNode) => (
            <div style={{ position: "relative", pointerEvents: "none" }}>
              {renderWelcomeScreen && (
                <tunnels.WelcomeScreenToolbarHintTunnel.Out />
              )}
              <Stack.Col
                gap={spacing.toolbarColGap}
                align="start"
                style={{ pointerEvents: "none" }}
              >
                <Stack.Row
                  gap={spacing.toolbarRowGap}
                  style={{ pointerEvents: "none" }}
                  className={clsx("App-toolbar-container", {
                    "zen-mode": appState.zenModeEnabled,
                  })}
                >
                  <Island
                    padding={spacing.islandPadding}
                    className={clsx("App-toolbar adaptive-toolbar-shell", {
                      "zen-mode": appState.zenModeEnabled,
                      "App-toolbar--compact": isCompactStylesPanel,
                    })}
                    data-viewport-ui="bottom"
                  >
                    <HintViewer
                      appState={appState}
                      isMobile={editorInterface.formFactor === "phone"}
                      editorInterface={editorInterface}
                      app={app}
                    />
                    {heading}
                    <Stack.Row gap={spacing.toolbarInnerRowGap}>
                      <PenModeButton
                        checked={appState.penMode}
                        onChange={() => onPenModeToggle(null)}
                        title={t("toolBar.penMode")}
                        penDetected={appState.penDetected}
                      />
                      {app.props.activeTool == null && (
                        <LockButton
                          checked={appState.activeTool.locked}
                          onChange={onLockToggle}
                          title={t("toolBar.lock")}
                        />
                      )}

                      <div className="App-toolbar__divider" />

                      <ShapesSwitcher
                        setAppState={setAppState}
                        activeTool={appState.activeTool}
                        UIOptions={UIOptions}
                        app={app}
                        maxWidth={Math.max(
                          180,
                          Math.min(420, appState.width - 360),
                        )}
                      />
                      {isCollaborating && (
                        <>
                          <div className="App-toolbar__divider" />
                          <LaserPointerButton
                            title={t("toolBar.laser")}
                            checked={
                              appState.activeTool.type === TOOL_TYPE.laser
                            }
                            onChange={() =>
                              app.setActiveTool({ type: TOOL_TYPE.laser })
                            }
                            isMobile
                          />
                        </>
                      )}
                    </Stack.Row>
                  </Island>
                </Stack.Row>
              </Stack.Col>
            </div>
          )}
        </Section>
      ) : null;

    const topEndChrome = (
      <div
        className={clsx("layer-ui__wrapper__top-right zen-mode-transition", {
          "transition-right": appState.zenModeEnabled,
          "layer-ui__wrapper__top-right--compact": isCompactStylesPanel,
        })}
      >
        {defaultUIEnabled && appState.collaborators.size > 0 && (
          <UserList
            collaborators={appState.collaborators}
            userToFollow={appProps.userToFollow?.socketId || null}
            currentUserControls={currentUserControls}
          />
        )}
        {renderTopRightUI?.(false, appState)}
        {!appState.viewModeEnabled &&
          appState.openDialog?.name !== "elementLinkSelector" &&
          (!isSidebarDocked ||
            appState.openSidebar?.name !== DEFAULT_SIDEBAR.name) && (
            <tunnels.DefaultSidebarTriggerTunnel.Out />
          )}
        {shouldShowStats && (
          <Stats
            app={app}
            onClose={() => {
              actionManager.executeAction(actionToggleStats);
            }}
            renderCustomStats={renderCustomStats}
          />
        )}
      </div>
    );

    const propertyStack = defaultUIEnabled ? (
      <div
        className={clsx("layer-ui__property-stack", {
          "layer-ui__property-stack--compact": isCompactStylesPanel,
        })}
        data-property-stack="top-end"
      >
        {shouldRenderSelectedShapeActions && renderSelectedShapeActions()}
        {isCompactStylesPanel &&
          !appState.viewModeEnabled &&
          shouldRenderSelectedShapeActions && (
            <PenModeButton
              checked={appState.penMode}
              onChange={() => onPenModeToggle(null)}
              title={t("toolBar.penMode")}
              isMobile
              penDetected={appState.penDetected}
            />
          )}
      </div>
    ) : null;

    const topEnd = (
      <div className="layer-ui__top-end-zone">
        {topEndChrome}
        {propertyStack}
      </div>
    );

    const bottomCenter = (
      <div
        className="layer-ui__bottom-center-stack"
        style={{ pointerEvents: "none" }}
      >
        {bottomToolbar}
        {footerZones.bottomCenter}
      </div>
    );

    return (
      <CanvasUiLayout
        mode="desktop"
        dockedSidebar={Boolean(
          appState.openSidebar &&
            isSidebarDocked &&
            editorInterface.canFitSidebar,
        )}
        zones={{
          topStart,
          topCenter: null,
          topEnd,
          ...footerZones,
          bottomCenter,
        }}
      />
    );
  };

  const renderSidebars = () => {
    if (!defaultUIEnabled) {
      return null;
    }

    return (
      <DefaultSidebar
        __fallback
        onDock={(docked) => {
          trackEvent(
            "sidebar",
            `toggleDock (${docked ? "dock" : "undock"})`,
            `(${
              editorInterface.formFactor === "phone" ? "mobile" : "desktop"
            })`,
          );
        }}
      />
    );
  };

  const isSidebarDocked = useAtomValue(isSidebarDockedAtom);

  const layerUIJSX = (
    <>
      {/* ------------------------- tunneled UI ---------------------------- */}
      {/* make sure we render host app components first so that we can detect
          them first on initial render to optimize layout shift */}
      {children}
      {/* Fallback entry points are the default UI. Host components above keep
          rendering into the outlets below even when defaults are disabled. */}
      {defaultUIEnabled && (
        <>
          <DefaultMainMenu UIOptions={UIOptions} />
          <DefaultSidebar.Trigger
            __fallback
            icon={sidebarRightIcon}
            title={capitalizeString(t("toolBar.library"))}
            onToggle={(open) => {
              if (open) {
                trackEvent(
                  "sidebar",
                  `${DEFAULT_SIDEBAR.name} (open)`,
                  `button (${
                    editorInterface.formFactor === "phone"
                      ? "mobile"
                      : "desktop"
                  })`,
                );
              }
            }}
            tab={DEFAULT_SIDEBAR.defaultTab}
          />
        </>
      )}
      {/* Keep supporting surfaces available to host-supplied UI, including
          MainMenu.DefaultItems. */}
      <DefaultOverwriteConfirmDialog />
      {appState.openDialog?.name === "ttd" && <TTDDialog __fallback />}
      {/* ------------------------------------------------------------------ */}

      {defaultUIEnabled && appState.isLoading && <LoadingMessage delay={250} />}
      {defaultUIEnabled && appState.errorMessage && (
        <ErrorDialog onClose={() => setAppState({ errorMessage: null })}>
          {appState.errorMessage}
        </ErrorDialog>
      )}
      {defaultUIEnabled &&
        eyeDropperState &&
        editorInterface.formFactor !== "phone" && (
          <EyeDropper
            colorPickerType={eyeDropperState.colorPickerType}
            onCancel={() => {
              setEyeDropperState(null);
            }}
            onChange={(
              colorPickerType,
              color,
              selectedElements,
              { altKey },
            ) => {
              if (
                colorPickerType !== "elementBackground" &&
                colorPickerType !== "elementStroke"
              ) {
                return;
              }

              if (selectedElements.length) {
                for (const element of selectedElements) {
                  mutateElement(element, arrayToMap(elements), {
                    [altKey && eyeDropperState.swapPreviewOnAlt
                      ? colorPickerType === "elementBackground"
                        ? "strokeColor"
                        : "backgroundColor"
                      : colorPickerType === "elementBackground"
                      ? "backgroundColor"
                      : "strokeColor"]: color,
                  });
                  ShapeCache.delete(element);
                }
                app.scene.triggerUpdate();
              } else if (colorPickerType === "elementBackground") {
                setAppState({
                  currentItemBackgroundColor: color,
                });
              } else {
                setAppState({ currentItemStrokeColor: color });
              }
            }}
            onSelect={(color, event) => {
              setEyeDropperState((state) => {
                return state?.keepOpenOnAlt && event.altKey ? state : null;
              });
              eyeDropperState?.onSelect?.(color, event);
            }}
          />
        )}
      {appState.openDialog?.name === "help" && (
        <HelpDialog
          onClose={() => {
            setAppState({ openDialog: null });
          }}
        />
      )}
      <ActiveConfirmDialog />
      {defaultUIEnabled && appState.openDialog?.name === "elementLinkSelector" && (
        <ElementLinkDialog
          sourceElementId={appState.openDialog.sourceElementId}
          onClose={() => {
            setAppState({
              openDialog: null,
            });
          }}
          scene={app.scene}
          appState={appState}
          generateLinkForSelection={generateLinkForSelection}
        />
      )}
      <tunnels.OverwriteConfirmDialogTunnel.Out />
      {renderImageExportDialog()}
      {renderJSONExportDialog()}
      {defaultUIEnabled && appState.openDialog?.name === "charts" && (
        <PasteChartDialog
          data={appState.openDialog.data}
          rawText={appState.openDialog.rawText}
          onClose={() =>
            setAppState({
              openDialog: null,
            })
          }
        />
      )}
      {responsive.adapter === "phone" && (
        <MobileMenu
          app={app}
          appState={appState}
          elements={elements}
          actionManager={actionManager}
          renderJSONExportDialog={renderJSONExportDialog}
          renderImageExportDialog={renderImageExportDialog}
          setAppState={setAppState}
          onPenModeToggle={onPenModeToggle}
          renderTopLeftUI={renderTopLeftUI}
          renderTopRightUI={renderTopRightUI}
          renderSidebars={renderSidebars}
          renderWelcomeScreen={renderWelcomeScreen}
          defaultUIEnabled={defaultUIEnabled}
          scrollBackToContentUIEnabled={scrollBackToContentUIEnabled}
        />
      )}
      {responsive.adapter === "desktop" && (
        <>
          <div className="layer-ui__wrapper">
            {renderWelcomeScreen && <tunnels.WelcomeScreenCenterTunnel.Out />}
            <Footer
              appState={appState}
              actionManager={actionManager}
              showExitZenModeBtn={showExitZenModeBtn}
              renderWelcomeScreen={renderWelcomeScreen}
              defaultUIEnabled={defaultUIEnabled}
              zoomUIEnabled={zoomUIEnabled}
            >
              {(footerZones) => renderDesktopLayout(footerZones)}
            </Footer>
            {scrollBackToContentUIEnabled && appState.scrolledOutside && (
              <div className="floating-status-stack">
                <button
                  type="button"
                  className="scroll-back-to-content"
                  onClick={() => {
                    setAppState((appState) => ({
                      ...getScrollToContentState(elements, appState),
                    }));
                  }}
                >
                  {t("buttons.scrollBackToContent")}
                </button>
              </div>
            )}
          </div>
          {renderSidebars()}
        </>
      )}
      <ToastRegion
        toast={appState.toast}
        subscribe={app.onToast}
        onConsume={(toast) => {
          setAppState((current) =>
            current.toast === toast ? { toast: null } : null,
          );
        }}
      />
    </>
  );

  return (
    <UIAppStateContext.Provider value={appState}>
      <TunnelsJotaiProvider>
        <TunnelsContext.Provider value={tunnels}>
          {layerUIJSX}
        </TunnelsContext.Provider>
      </TunnelsJotaiProvider>
    </UIAppStateContext.Provider>
  );
};

const stripIrrelevantAppStateProps = (appState: AppState): UIAppState => {
  const {
    cursorButton,
    scrollX,
    scrollY,
    zoom,
    shouldCacheIgnoreZoom,
    snapLines,
    originSnapOffset,
    suggestedBinding,
    frameToHighlight,
    elementsToHighlight,
    ...ret
  } = appState;
  return ret;
};

const areEqual = (prevProps: LayerUIProps, nextProps: LayerUIProps) => {
  // short-circuit early
  if (prevProps.children !== nextProps.children) {
    return false;
  }

  const { canvas: _pC, appState: prevAppState, ...prev } = prevProps;
  const { canvas: _nC, appState: nextAppState, ...next } = nextProps;

  return (
    isShallowEqual(
      // asserting AppState because we're being passed the whole AppState
      // but resolve to only the UI-relevant props
      stripIrrelevantAppStateProps(prevAppState as AppState),
      stripIrrelevantAppStateProps(nextAppState as AppState),
      {
        selectedElementIds: isShallowEqual,
        selectedGroupIds: isShallowEqual,
      },
    ) && isShallowEqual(prev, next)
  );
};

export default React.memo(LayerUI, areEqual);
