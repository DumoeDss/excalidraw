import React from "react";
import { vi } from "vitest";

import { MIME_TYPES } from "@excalidraw/common";

import type { ExcalidrawAudioElement } from "@excalidraw/element/types";

import { Excalidraw } from "../index";

import {
  act,
  createEvent,
  fireEvent,
  GlobalTestState,
  render,
  waitFor,
} from "./test-utils";

const h = window.h;

type TestDropItem =
  | {
      kind: "file";
      type: string;
      getAsFile: () => File | null;
    }
  | {
      kind: "string";
      type: string;
      getAsString: (callback: (value: string) => void) => void;
    };

const createDropEvent = (items: TestDropItem[]) => {
  const event = createEvent.drop(GlobalTestState.interactiveCanvas);
  const fileArray: File[] = [];
  const files = Object.assign(fileArray, {
    item: (index: number) => fileArray[index],
  });

  Object.defineProperty(event, "dataTransfer", {
    value: {
      files,
      items,
      getData: () => "",
      types: Array.from(
        new Set(
          items.map((item) => (item.kind === "file" ? "Files" : item.type)),
        ),
      ),
    },
  });
  Object.defineProperty(event, "clientX", { value: 120 });
  Object.defineProperty(event, "clientY", { value: 80 });
  return event;
};

const createStringItem = (value: string): TestDropItem => ({
  kind: "string",
  type: MIME_TYPES.text,
  getAsString: (callback) => callback(value),
});

describe("host drop interception", () => {
  let pauseSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    pauseSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, "pause")
      .mockImplementation(() => undefined);
  });

  afterAll(() => {
    pauseSpy.mockRestore();
  });

  it("passes the original drag event once and cancels a video before default insertion", async () => {
    const video = new File(["video"], "clip.mp4", { type: "video/mp4" });
    const getAsFile = vi.fn(() => video);
    const onMediaUpload = vi.fn(() =>
      Promise.resolve({ url: "https://media.example.test/video/clip.mp4" }),
    );
    const onDrop = vi.fn((_event: React.DragEvent<HTMLDivElement>) => {
      expect(onMediaUpload).not.toHaveBeenCalled();
      expect(h.elements).toEqual([]);
      return false;
    });

    await render(<Excalidraw onDrop={onDrop} onMediaUpload={onMediaUpload} />);
    const nativeEvent = createDropEvent([
      { kind: "file", type: video.type, getAsFile },
    ]);
    fireEvent(GlobalTestState.interactiveCanvas, nativeEvent);

    await waitFor(() => expect(onDrop).toHaveBeenCalledTimes(1));
    expect(onDrop.mock.calls[0][0].nativeEvent).toBe(nativeEvent);
    expect(getAsFile).toHaveBeenCalledTimes(1);
    expect(onMediaUpload).not.toHaveBeenCalled();
    expect(h.elements).toEqual([]);
  });

  it("waits for asynchronous false and cancels a non-media drop", async () => {
    let resolveDecision!: (value: boolean) => void;
    const decision = new Promise<boolean>((resolve) => {
      resolveDecision = resolve;
    });
    const onDrop = vi.fn(() => decision);

    await render(<Excalidraw onDrop={onDrop} />);
    fireEvent(
      GlobalTestState.interactiveCanvas,
      createDropEvent([
        createStringItem("https://www.youtube.com/watch?v=cancelled"),
      ]),
    );

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(h.elements).toEqual([]);

    await act(async () => {
      resolveDecision(false);
      await decision;
    });
    expect(h.elements).toEqual([]);
    expect(await h.app.library.getLatestLibrary()).toEqual([]);
  });

  it("fails closed when the host handler throws synchronously", async () => {
    const error = new Error("host drop failed synchronously");
    const onDrop = vi.fn(() => {
      throw error;
    });
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      await render(<Excalidraw onDrop={onDrop} />);
      fireEvent(
        GlobalTestState.interactiveCanvas,
        createDropEvent([
          createStringItem("https://www.youtube.com/watch?v=sync-error"),
        ]),
      );

      await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith(error));
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(h.elements).toEqual([]);
      expect(await h.app.library.getLatestLibrary()).toEqual([]);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("fails closed when the host handler rejects asynchronously", async () => {
    const error = new Error("host drop failed asynchronously");
    let rejectDecision!: (reason: Error) => void;
    const decision = new Promise<boolean>((_resolve, reject) => {
      rejectDecision = reject;
    });
    const onDrop = vi.fn(() => decision);
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      await render(<Excalidraw onDrop={onDrop} />);
      fireEvent(
        GlobalTestState.interactiveCanvas,
        createDropEvent([
          createStringItem("https://www.youtube.com/watch?v=async-error"),
        ]),
      );

      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(h.elements).toEqual([]);
      rejectDecision(error);

      await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith(error));
      expect(h.elements).toEqual([]);
      expect(await h.app.library.getLatestLibrary()).toEqual([]);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("lets a false host decision win when drop parsing rejects", async () => {
    const parseError = new Error("drop parsing failed");
    const getAsFile = vi.fn(() => {
      throw parseError;
    });
    const onDrop = vi.fn(() => false);
    const onMediaUpload = vi.fn();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      await render(
        <Excalidraw onDrop={onDrop} onMediaUpload={onMediaUpload} />,
      );
      fireEvent(
        GlobalTestState.interactiveCanvas,
        createDropEvent([{ kind: "file", type: "video/mp4", getAsFile }]),
      );

      await waitFor(() =>
        expect(consoleErrorSpy).toHaveBeenCalledWith(parseError),
      );
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(getAsFile).toHaveBeenCalledTimes(1);
      expect(onMediaUpload).not.toHaveBeenCalled();
      expect(h.elements).toEqual([]);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("continues the existing default path when the host returns true", async () => {
    const link = "https://www.youtube.com/watch?v=allowed";
    const onDrop = vi.fn(() => true);

    await render(<Excalidraw onDrop={onDrop} />);
    fireEvent(
      GlobalTestState.interactiveCanvas,
      createDropEvent([createStringItem(link)]),
    );

    await waitFor(() => {
      expect(h.elements).toEqual([
        expect.objectContaining({ type: "embeddable", link }),
      ]);
    });
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it("continues the existing default path when no host handler is configured", async () => {
    const link = "https://www.youtube.com/watch?v=unobserved";

    await render(<Excalidraw />);
    fireEvent(
      GlobalTestState.interactiveCanvas,
      createDropEvent([createStringItem(link)]),
    );

    await waitFor(() => {
      expect(h.elements).toEqual([
        expect.objectContaining({ type: "embeddable", link }),
      ]);
    });
  });

  it("captures a file in the event frame before asynchronous true resolves", async () => {
    const audio = new File(["audio"], "track.mp3", { type: "audio/mpeg" });
    let fileIsAvailable = true;
    const getAsFile = vi.fn(() => (fileIsAvailable ? audio : null));
    let resolveDecision!: (value: boolean) => void;
    const decision = new Promise<boolean>((resolve) => {
      resolveDecision = resolve;
    });
    const onDrop = vi.fn(() => decision);
    const onMediaUpload = vi.fn(() =>
      Promise.resolve({ url: "https://media.example.test/audio/track.mp3" }),
    );

    await render(<Excalidraw onDrop={onDrop} onMediaUpload={onMediaUpload} />);
    fireEvent(
      GlobalTestState.interactiveCanvas,
      createDropEvent([{ kind: "file", type: audio.type, getAsFile }]),
    );

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(getAsFile).toHaveBeenCalledTimes(1);
    fileIsAvailable = false;
    expect(onMediaUpload).not.toHaveBeenCalled();
    expect(h.elements).toEqual([]);

    await act(async () => {
      resolveDecision(true);
      await decision;
    });

    await waitFor(() => {
      expect(h.elements).toHaveLength(1);
      const inserted = h.elements[0] as ExcalidrawAudioElement;
      expect(inserted).toEqual(
        expect.objectContaining({
          type: "audio",
          src: "https://media.example.test/audio/track.mp3",
          status: "saved",
        }),
      );
    });
    expect(getAsFile).toHaveBeenCalledTimes(1);
    expect(onMediaUpload).toHaveBeenCalledTimes(1);
  });
});
