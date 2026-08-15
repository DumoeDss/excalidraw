import { editorJotaiStore } from "../../editor-jotai";

import {
  openConfirmModal,
  overwriteConfirmStateAtom,
} from "./OverwriteConfirmState";

describe("overwrite confirmation state", () => {
  afterEach(() => {
    const current = editorJotaiStore.get(overwriteConfirmStateAtom);
    if (current.active) {
      current.onReject();
    }
    editorJotaiStore.set(overwriteConfirmStateAtom, { active: false });
  });

  it("rejects an older request when a replacement opens", async () => {
    const first = openConfirmModal({
      title: "First",
      description: "First request",
      actionLabel: "Replace",
      color: "warning",
    });
    const second = openConfirmModal({
      title: "Second",
      description: "Second request",
      actionLabel: "Replace",
      color: "danger",
    });

    await expect(first).resolves.toBe(false);
    const active = editorJotaiStore.get(overwriteConfirmStateAtom);
    expect(active.active && active.title).toBe("Second");
    if (active.active) {
      active.onConfirm();
    }
    await expect(second).resolves.toBe(true);
  });
});
