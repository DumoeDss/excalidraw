import React from "react";

import { composeEventHandlers } from "@excalidraw/common";

import { useTunnels } from "../../context/tunnels";
import { useUIAppState } from "../../context/ui-appState";
import { t } from "../../i18n";
import {
  useAppProps,
  useEditorInterface,
  useExcalidrawContainer,
  useExcalidrawSetAppState,
} from "../App";
import { UserList } from "../UserList";
import DropdownMenu from "../dropdownMenu/DropdownMenu";
import DropdownMenuSub from "../dropdownMenu/DropdownMenuSub";
import { withInternalFallback } from "../hoc/withInternalFallback";
import { HamburgerMenuIcon } from "../primitives/chrome-icons";

import * as DefaultItems from "./DefaultItems";

const MainMenu = Object.assign(
  withInternalFallback(
    "MainMenu",
    ({
      children,
      onSelect,
    }: {
      children?: React.ReactNode;
      /**
       * Called when any menu item is selected (clicked on).
       */
      onSelect?: (event: Event) => void;
    }) => {
      const { MainMenuTunnel } = useTunnels();
      const editorInterface = useEditorInterface();
      const appState = useUIAppState();
      const appProps = useAppProps();
      const setAppState = useExcalidrawSetAppState();
      const { id: editorId } = useExcalidrawContainer();

      return (
        <MainMenuTunnel.In>
          <DropdownMenu
            open={appState.openMenu === "canvas"}
            ownerIdentity={`${editorId ?? "editor"}:main-menu`}
            onOpenChange={(open) => {
              if (open) {
                setAppState({
                  openMenu: "canvas",
                  openPopup: null,
                  openDialog: null,
                });
              } else {
                setAppState({ openMenu: null });
              }
            }}
          >
            <DropdownMenu.Trigger
              data-testid="main-menu-trigger"
              className="main-menu-trigger"
            >
              {HamburgerMenuIcon}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              onSelect={composeEventHandlers(onSelect, () => {
                setAppState({ openMenu: null });
              })}
              className="main-menu"
              align="start"
              surfaceKind="main-menu"
              placementIntent="main-menu-start-bottom"
            >
              {children}
              {editorInterface.formFactor === "phone" &&
                appState.collaborators.size > 0 && (
                  <fieldset className="UserList-Wrapper">
                    <legend>{t("labels.collaborators")}</legend>
                    <UserList
                      mobile={true}
                      collaborators={appState.collaborators}
                      userToFollow={appProps.userToFollow?.socketId || null}
                      currentUserControls={appProps.currentUserControls}
                    />
                  </fieldset>
                )}
            </DropdownMenu.Content>
          </DropdownMenu>
        </MainMenuTunnel.In>
      );
    },
  ),
  {
    Trigger: DropdownMenu.Trigger,
    Item: DropdownMenu.Item,
    ItemLink: DropdownMenu.ItemLink,
    ItemCustom: DropdownMenu.ItemCustom,
    Group: DropdownMenu.Group,
    Separator: DropdownMenu.Separator,
    Sub: DropdownMenuSub,
    DefaultItems,
  },
);

export default MainMenu;
