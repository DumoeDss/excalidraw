import clsx from "clsx";

import { actionShortcuts } from "../../actions";
import { useTunnels } from "../../context/tunnels";
import { ExitZenModeButton, UndoRedoActions, ZoomActions } from "../Actions";
import { useApp } from "../App";
import { HelpButton } from "../HelpButton";
import { Section } from "../Section";
import Stack from "../Stack";

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
  children,
}: {
  appState: UIAppState;
  actionManager: ActionManager;
  showExitZenModeBtn: boolean;
  renderWelcomeScreen: boolean;
  defaultUIEnabled: boolean;
  zoomUIEnabled: boolean;
  children: (zones: FooterZones) => React.ReactNode;
}) => {
  const { FooterCenterTunnel, WelcomeScreenHelpHintTunnel } = useTunnels();
  const app = useApp();

  return children({
    bottomStart:
      defaultUIEnabled || (zoomUIEnabled && app.isNavigationEnabled()) ? (
        <div
          className={clsx(
            "layer-ui__wrapper__footer-left zen-mode-transition",
            {
              "layer-ui__wrapper__footer-left--transition-left":
                appState.zenModeEnabled,
            },
          )}
        >
          <Stack.Col gap={2}>
            <Section heading="canvasActions">
              {zoomUIEnabled && app.isNavigationEnabled() && (
                <ZoomActions renderAction={actionManager.renderAction} />
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
            </Section>
          </Stack.Col>
        </div>
      ) : null,
    bottomCenter: <FooterCenterTunnel.Out />,
    bottomEnd:
      defaultUIEnabled || renderWelcomeScreen ? (
        <>
          <div
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
