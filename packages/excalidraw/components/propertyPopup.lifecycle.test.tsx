import React, { useCallback, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { usePropertyPopupOwner } from "./Actions";

import type { AppState, UIAppState } from "../types";
import type { PropertyPopupIdentity } from "./propertyPopup";

const PopupOwnerHarness = ({
  eligible,
  ownerKey,
}: {
  eligible: readonly PropertyPopupIdentity[];
  ownerKey: string;
}) => {
  const [openPopup, setOpenPopup] = useState<AppState["openPopup"]>(
    "compactOtherProperties",
  );
  const setAppState = useCallback((update: unknown) => {
    setOpenPopup((current) => {
      const patch =
        typeof update === "function"
          ? update({ openPopup: current } as AppState)
          : update;
      if (!patch || !Object.prototype.hasOwnProperty.call(patch, "openPopup")) {
        return current;
      }
      return (patch as Partial<AppState>).openPopup ?? null;
    });
  }, []);

  usePropertyPopupOwner({
    appState: { openPopup } as UIAppState,
    setAppState: setAppState as React.Component<any, AppState>["setState"],
    eligible,
    ownerKey,
  });

  return <output data-testid="open-popup">{openPopup ?? "closed"}</output>;
};

const SharedPopupOwner = ({
  openPopup,
  setAppState,
  name,
}: {
  openPopup: AppState["openPopup"];
  setAppState: React.Component<any, AppState>["setState"];
  name: string;
}) => {
  const owner = usePropertyPopupOwner({
    appState: { openPopup } as UIAppState,
    setAppState,
    eligible: ["compactOtherProperties"],
    ownerKey: "shared-actions",
  });

  return (
    <button
      type="button"
      onClick={() => owner.onOpenChange("compactOtherProperties")(true)}
    >
      Open {name}
    </button>
  );
};

const SharedPopupHarness = ({ owner }: { owner: "old" | "replacement" }) => {
  const [openPopup, setOpenPopup] = useState<AppState["openPopup"]>(null);
  const setAppState = useCallback((update: unknown) => {
    setOpenPopup((current) => {
      const patch =
        typeof update === "function"
          ? update({ openPopup: current } as AppState)
          : update;
      if (!patch || !Object.prototype.hasOwnProperty.call(patch, "openPopup")) {
        return current;
      }
      return (patch as Partial<AppState>).openPopup ?? null;
    });
  }, []);

  return (
    <>
      <SharedPopupOwner
        key={owner}
        name={owner}
        openPopup={openPopup}
        setAppState={setAppState as React.Component<any, AppState>["setState"]}
      />
      <output data-testid="shared-open-popup">{openPopup ?? "closed"}</output>
    </>
  );
};

describe("property popup owner lifecycle", () => {
  it("closes an eligible popup when responsive ownership changes", async () => {
    const { rerender } = render(
      <PopupOwnerHarness
        eligible={["compactOtherProperties"]}
        ownerKey="compact:selection"
      />,
    );
    expect(screen.getByTestId("open-popup")).toHaveTextContent(
      "compactOtherProperties",
    );

    rerender(
      <PopupOwnerHarness
        eligible={["compactOtherProperties"]}
        ownerKey="phone:portrait"
      />,
    );
    await act(() => Promise.resolve());

    expect(screen.getByTestId("open-popup")).toHaveTextContent("closed");
  });

  it("does not let an old owner clear a replacement claim for the same identity", () => {
    const view = render(<SharedPopupHarness owner="old" />);
    fireEvent.click(screen.getByRole("button", { name: "Open old" }));
    expect(screen.getByTestId("shared-open-popup")).toHaveTextContent(
      "compactOtherProperties",
    );

    const queued: VoidFunction[] = [];
    const queueSpy = vi
      .spyOn(globalThis, "queueMicrotask")
      .mockImplementation((callback) => queued.push(callback));
    try {
      view.rerender(<SharedPopupHarness owner="replacement" />);
      fireEvent.click(screen.getByRole("button", { name: "Open replacement" }));
      expect(queued.length).toBeGreaterThan(0);

      act(() => {
        queued.splice(0).forEach((callback) => callback());
      });

      expect(screen.getByTestId("shared-open-popup")).toHaveTextContent(
        "compactOtherProperties",
      );
    } finally {
      view.unmount();
      queueSpy.mockRestore();
    }
  });
});
