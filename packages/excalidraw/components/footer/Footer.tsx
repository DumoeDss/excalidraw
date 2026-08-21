import clsx from "clsx";

import { actionShortcuts } from "../../actions";
import { useTunnels } from "../../context/tunnels";
import { ExitZenModeButton, UndoRedoActions, ZoomActions } from "../Actions";
import { useApp } from "../App";
import { HelpButton } from "../HelpButton";
import { LockButton } from "../LockButton";
import { Section } from "../Section";
import Stack from "../Stack";
import { t } from "../../i18n";

import type { ActionManager } from "../../actions/manager";
import type { UIAppState } from "../../types";
import type { CanvasUiZones } from "../CanvasUiLayout";

type FooterZones = Pick<
  CanvasUiZones,
  "bottomStart" | "bottomCenter" | "bottomEnd"
>;

const Footer = ({
  appState,
  actionManager,
  showExitZenModeBtn,
  renderWelcomeScreen,
  defaultUIEnabled,
  zoomUIEnabled,
  onLockToggle,
  children,
}: {
  appState: UIAppState;
  actionManager: ActionManager;
  showExitZenModeBtn: boolean;
  renderWelcomeScreen: boolean;
  defaultUIEnabled: boolean;
  zoomUIEnabled: boolean;
  onLockToggle: () => void;
  children: (zones: FooterZones) => React.ReactNode;
}) => {
  const { FooterCenterTunnel, WelcomeScreenHelpHintTunnel } = useTunnels();
  const app = useApp();

  return children({
    bottomStart:
      defaultUIEnabled || (zoomUIEnabled && app.isNavigationEnabled()) ? (
        <div
          data-toast-reservation="bottom"
          className={clsx(
            "layer-ui__wrapper__footer-left zen-mode-transition",
            {
              "layer-ui__wrapper__footer-left--transition-left":
                appState.zenModeEnabled,
            },
          )}
        >
          <Stack.Row gap={1} align="center">
            <Section heading="canvasActions">
              <Stack.Row gap={1} align="center">
                {defaultUIEnabled &&
                  !appState.viewModeEnabled &&
                  app.props.activeTool == null && (
                    <LockButton
                      checked={appState.activeTool.locked}
                      onChange={onLockToggle}
                      title={t("toolBar.lock")}
                    />
                  )}

                {defaultUIEnabled && !appState.viewModeEnabled && (
                  <UndoRedoActions
                    renderAction={actionManager.renderAction}
                    className={clsx("zen-mode-transition", {
                      "layer-ui__wrapper__footer-left--transition-bottom":
                        appState.zenModeEnabled,
                    })}
                  />
                )}

                {zoomUIEnabled && app.isNavigationEnabled() && (
                  <ZoomActions actionManager={actionManager} />
                )}
              </Stack.Row>
            </Section>
          </Stack.Row>
        </div>
      ) : null,
    bottomCenter: <FooterCenterTunnel.Out />,
    bottomEnd:
      defaultUIEnabled || renderWelcomeScreen ? (
        <>
          <div
            data-toast-reservation="bottom"
            className={clsx(
              "layer-ui__wrapper__footer-right zen-mode-transition",
              {
                "transition-right": appState.zenModeEnabled,
              },
            )}
          >
            <div style={{ position: "relative" }}>
              {renderWelcomeScreen && <WelcomeScreenHelpHintTunnel.Out />}
              {defaultUIEnabled && (
                <HelpButton
                  onClick={() => actionManager.executeAction(actionShortcuts)}
                />
              )}
            </div>
          </div>
          {defaultUIEnabled && (
            <ExitZenModeButton
              actionManager={actionManager}
              showExitZenModeBtn={showExitZenModeBtn}
            />
          )}
        </>
      ) : null,
  });
};

export default Footer;
Footer.displayName = "Footer";
