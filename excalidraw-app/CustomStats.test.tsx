import { act, fireEvent, render, screen } from "@testing-library/react";

import { t } from "@excalidraw/excalidraw/i18n";

import CustomStats from "./CustomStats";

const copyText = vi.fn(async () => {});
const sceneSize = vi.fn(() => 1024);
const totalSize = vi.fn(() => 2048);

vi.mock("@excalidraw/excalidraw/clipboard", () => ({
  copyTextToSystemClipboard: () => copyText(),
}));

vi.mock("./data/localStorage", () => ({
  getElementsStorageSize: () => sceneSize(),
  getTotalStorageSize: () => totalSize(),
}));

describe("CustomStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    copyText.mockClear();
    sceneSize.mockClear();
    totalSize.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps storage debounce and copy action at the application adapter", async () => {
    const setToast = vi.fn();
    const { unmount } = render(
      <CustomStats appState={{} as never} elements={[]} setToast={setToast} />,
    );

    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(sceneSize).toHaveBeenCalledTimes(1);
    expect(totalSize).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle(t("stats.versionCopy")));
    await act(() => vi.runAllTimersAsync());
    expect(copyText).toHaveBeenCalledTimes(1);
    expect(setToast).toHaveBeenCalledWith(t("toast.copyToClipboard"));

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("recomputes through the host callback inputs without transferring storage", async () => {
    const setToast = vi.fn();
    const { rerender } = render(
      <CustomStats
        appState={{ zoom: 1 } as never}
        elements={[]}
        setToast={setToast}
      />,
    );

    rerender(
      <CustomStats
        appState={{ zoom: 2 } as never}
        elements={[{} as never]}
        setToast={setToast}
      />,
    );
    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(sceneSize).toHaveBeenCalledTimes(1);
    expect(totalSize).toHaveBeenCalledTimes(1);
  });
});
