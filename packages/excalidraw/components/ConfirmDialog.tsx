import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { useSetAtom } from "../editor-jotai";
import { t } from "../i18n";

import { useExcalidrawContainer, useExcalidrawSetAppState } from "./App";
import { Dialog } from "./Dialog";
import DialogActionButton from "./DialogActionButton";
import { isLibraryMenuOpenAtom } from "./LibraryMenu";
import { createSettleOnce } from "./largeSurface/settleOnce";

import "./ConfirmDialog.scss";

import type { DialogProps } from "./Dialog";

interface Props extends Omit<DialogProps, "onCloseRequest"> {
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}
const ConfirmDialog = (props: Props) => {
  const {
    onConfirm,
    onCancel,
    children,
    confirmText = t("buttons.confirm"),
    cancelText = t("buttons.cancel"),
    className = "",
    closeOnClickOutside = false,
    ...rest
  } = props;
  const setAppState = useExcalidrawSetAppState();
  const setIsLibraryMenuOpen = useSetAtom(isLibraryMenuOpenAtom);
  const { container } = useExcalidrawContainer();
  const settleRef = useRef<{
    confirm: () => void;
    cancel: () => void;
  } | null>(null);
  const lifecycleGenerationRef = useRef(0);
  if (!settleRef.current) {
    const settle = createSettleOnce((decision: "confirm" | "cancel") => {
      if (decision === "confirm") {
        onConfirm();
      } else {
        onCancel();
      }
    });
    settleRef.current = {
      confirm: () => settle("confirm"),
      cancel: () => settle("cancel"),
    };
  }

  useEffect(() => {
    const lifecycle = lifecycleGenerationRef;
    const generation = ++lifecycle.current;
    return () => {
      queueMicrotask(() => {
        if (lifecycle.current === generation) {
          settleRef.current?.cancel();
        }
      });
    };
  }, []);

  return (
    <Dialog
      onCloseRequest={settleRef.current.cancel}
      size="small"
      closeOnClickOutside={closeOnClickOutside}
      {...rest}
      className={`confirm-dialog ${className}`}
    >
      {children}
      <div className="confirm-dialog-buttons">
        <DialogActionButton
          label={cancelText}
          onClick={() => {
            setAppState({ openMenu: null });
            setIsLibraryMenuOpen(false);
            // flush any pending updates synchronously,
            // otherwise it could lead to crash in some chromium versions (131.0.6778.86),
            // when `.focus` is invoked with container in some intermediate state
            // (container seems mounted in DOM, but focus still causes a crash)
            flushSync(() => {
              settleRef.current?.cancel();
            });

            container?.focus();
          }}
        />
        <DialogActionButton
          label={confirmText}
          onClick={() => {
            setAppState({ openMenu: null });
            setIsLibraryMenuOpen(false);
            // flush any pending updates synchronously,
            // otherwise it leads to crash in some chromium versions (131.0.6778.86),
            // when `.focus` is invoked with container in some intermediate state
            // (container seems mounted in DOM, but focus still causes a crash)
            flushSync(() => {
              settleRef.current?.confirm();
            });

            container?.focus();
          }}
          actionType="danger"
        />
      </div>
    </Dialog>
  );
};
export default ConfirmDialog;
