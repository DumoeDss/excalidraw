import React, { useState } from "react";

import { t } from "../i18n";

import { useExcalidrawContainer } from "./App";
import { Dialog } from "./Dialog";
import { AppContentState } from "./appContent/AppContent";

export const ErrorDialog = ({
  children,
  onClose,
}: {
  children?: React.ReactNode;
  onClose?: () => void;
}) => {
  const [modalIsShown, setModalIsShown] = useState(!!children);
  const { container: excalidrawContainer } = useExcalidrawContainer();

  const handleClose = React.useCallback(() => {
    setModalIsShown(false);

    if (onClose) {
      onClose();
    }
    // TODO: Fix the A11y issues so this is never needed since we should always focus on last active element
    excalidrawContainer?.focus();
  }, [onClose, excalidrawContainer]);

  return (
    <>
      {modalIsShown && (
        <Dialog
          size="small"
          onCloseRequest={handleClose}
          title={t("errorDialog.title")}
        >
          <AppContentState
            kind="error"
            title={t("errorDialog.title")}
            message={<div style={{ whiteSpace: "pre-wrap" }}>{children}</div>}
          />
        </Dialog>
      )}
    </>
  );
};
