import clsx from "clsx";
import React, { useCallback, useId } from "react";

import { useSetAtom } from "../editor-jotai";
import { t } from "../i18n";

import {
  useExcalidrawContainer,
  useEditorInterface,
  useExcalidrawSetAppState,
} from "./App";
import { Island } from "./Island";
import { isLibraryMenuOpenAtom } from "./LibraryMenu";
import { Modal } from "./Modal";
import { CloseIcon } from "./icons";

import "./Dialog.scss";

export type DialogSize = number | "small" | "regular" | "wide" | undefined;

export interface DialogProps {
  children: React.ReactNode;
  className?: string;
  size?: DialogSize;
  onCloseRequest(): void;
  title: React.ReactNode | false;
  autofocus?: boolean;
  closeOnClickOutside?: boolean;
}

function getDialogSize(size: DialogSize): number {
  if (size && typeof size === "number") {
    return size;
  }

  switch (size) {
    case "small":
      return 550;
    case "wide":
      return 1024;
    case "regular":
    default:
      return 800;
  }
}

export const Dialog = (props: DialogProps) => {
  const { id } = useExcalidrawContainer();
  const isFullscreen = useEditorInterface().formFactor === "phone";
  const reactId = useId();
  const titleId = `${id ?? "excalidraw"}-dialog-title-${reactId.replaceAll(
    ":",
    "",
  )}`;

  const setAppState = useExcalidrawSetAppState();
  const setIsLibraryMenuOpen = useSetAtom(isLibraryMenuOpenAtom);

  const onClose = useCallback(() => {
    setAppState({ openMenu: null });
    setIsLibraryMenuOpen(false);
    props.onCloseRequest();
  }, [props, setAppState, setIsLibraryMenuOpen]);

  const closeButton = (
    <button
      className="Dialog__close"
      onClick={onClose}
      title={t("buttons.close")}
      aria-label={t("buttons.close")}
      type="button"
    >
      {CloseIcon}
    </button>
  );

  const header = props.title ? (
    <>
      <h2 id={titleId} className="Dialog__title">
        <span className="Dialog__titleContent">{props.title}</span>
      </h2>
      {closeButton}
    </>
  ) : (
    closeButton
  );

  return (
    <Modal
      className={clsx("Dialog", props.className, {
        "Dialog--fullscreen": isFullscreen,
      })}
      labelledBy={props.title ? titleId : undefined}
      logicalId={`${id ?? "excalidraw"}:${reactId}`}
      maxWidth={getDialogSize(props.size)}
      surfaceSize={
        props.size === "small"
          ? "small"
          : props.size === "wide"
          ? "wide"
          : "regular"
      }
      onCloseRequest={onClose}
      closeOnClickOutside={props.closeOnClickOutside}
      autofocus={props.autofocus}
      header={header}
    >
      <Island>
        <div className="Dialog__content">{props.children}</div>
      </Island>
    </Modal>
  );
};
