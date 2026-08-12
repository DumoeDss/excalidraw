import { atom, editorJotaiStore } from "../../editor-jotai";
import { createSettleOnce } from "../largeSurface/settleOnce";

import type React from "react";

export type OverwriteConfirmState =
  | {
      active: true;
      title: string;
      description: React.ReactNode;
      actionLabel: string;
      color: "danger" | "warning";

      onClose: () => void;
      onConfirm: () => void;
      onReject: () => void;
    }
  | { active: false };

export const overwriteConfirmStateAtom = atom<OverwriteConfirmState>({
  active: false,
});

export async function openConfirmModal({
  title,
  description,
  actionLabel,
  color,
}: {
  title: string;
  description: React.ReactNode;
  actionLabel: string;
  color: "danger" | "warning";
}) {
  return new Promise<boolean>((resolve) => {
    const current = editorJotaiStore.get(overwriteConfirmStateAtom);
    if (current.active) {
      current.onReject();
    }
    const settle = createSettleOnce(resolve);
    editorJotaiStore.set(overwriteConfirmStateAtom, {
      active: true,
      onConfirm: () => settle(true),
      onClose: () => settle(false),
      onReject: () => settle(false),
      title,
      description,
      actionLabel,
      color,
    });
  });
}
