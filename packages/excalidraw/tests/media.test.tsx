import { vi } from "vitest";

import { KEYS, MIME_TYPES } from "@excalidraw/common";

import {
  newAudioElement,
  newVideoElement,
  isAudioElement,
  isMediaElement,
  isVideoElement,
  shouldTestInside,
} from "@excalidraw/element";

import type { ExcalidrawVideoElement } from "@excalidraw/element/types";

import { actionAddToLibrary } from "../actions/actionAddToLibrary";
import { loadFromBlob, parseLibraryJSON } from "../data/blob";
import { serializeAsJSON, serializeLibraryAsJSON } from "../data/json";
import { Excalidraw } from "../index";
import * as restore from "../data/restore";

import { API } from "./helpers/api";
import {
  createNativeVideoFixture,
  getNativeVideoMetadata,
  getNativeVideoSnapshot,
} from "./helpers/nativeVideo";
import { Keyboard, Pointer, UI } from "./helpers/ui";
import { act, render, waitFor } from "./test-utils";

const h = window.h;

const getVideo = (id: string) =>
  h.app.scene
    .getElementsIncludingDeleted()
    .find((element) => element.id === id) as ExcalidrawVideoElement;

describe("media elements (audio / video)", () => {
  describe("factories", () => {
    it("newVideoElement has sane defaults", () => {
      const video = newVideoElement({ x: 0, y: 0, width: 320, height: 180 });
      expect(video.type).toBe("video");
      expect(video.src).toBe(null);
      expect(video.status).toBe("uploading");
      expect(video.poster).toBe(null);
    });

    it("newAudioElement has sane defaults", () => {
      const audio = newAudioElement({ x: 0, y: 0, width: 320, height: 54 });
      expect(audio.type).toBe("audio");
      expect(audio.src).toBe(null);
      expect(audio.status).toBe("uploading");
    });

    it("factories accept src/status/poster overrides", () => {
      const video = newVideoElement({
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        src: "https://example.com/v.mp4",
        status: "saved",
        poster: "https://example.com/p.png",
      });
      expect(video.src).toBe("https://example.com/v.mp4");
      expect(video.status).toBe("saved");
      expect(video.poster).toBe("https://example.com/p.png");
    });
  });

  describe("type guards", () => {
    it("identify video / audio / media correctly", () => {
      const video = API.createElement({ type: "video" });
      const audio = API.createElement({ type: "audio" });
      const rect = API.createElement({ type: "rectangle" });

      expect(isVideoElement(video)).toBe(true);
      expect(isVideoElement(audio)).toBe(false);
      expect(isVideoElement(rect)).toBe(false);

      expect(isAudioElement(audio)).toBe(true);
      expect(isAudioElement(video)).toBe(false);

      expect(isMediaElement(video)).toBe(true);
      expect(isMediaElement(audio)).toBe(true);
      expect(isMediaElement(rect)).toBe(false);
      expect(isMediaElement(null)).toBe(false);
    });
  });

  describe("hit area", () => {
    it("media nodes are hit/selectable across their whole interior (like images)", () => {
      // transparent-fill media must be draggable/hoverable from the inside,
      // not only on the stroke edge — same as image elements
      const video = API.createElement({ type: "video" });
      const audio = API.createElement({ type: "audio" });
      const transparentRect = API.createElement({
        type: "rectangle",
        backgroundColor: "transparent",
      });

      expect(shouldTestInside(video)).toBe(true);
      expect(shouldTestInside(audio)).toBe(true);
      // sanity: a transparent rectangle is NOT (only its stroke is hittable)
      expect(shouldTestInside(transparentRect)).toBe(false);
    });
  });

  describe("restore", () => {
    it("preserves video element fields through restore", () => {
      const video = API.createElement({
        type: "video",
        src: "https://example.com/v.mp4",
        status: "saved",
        poster: "https://example.com/p.png",
      });
      const [restored] = restore.restoreElements([video], null);
      expect(restored.type).toBe("video");
      expect((restored as any).src).toBe("https://example.com/v.mp4");
      expect((restored as any).status).toBe("saved");
      expect((restored as any).poster).toBe("https://example.com/p.png");
    });

    it("preserves audio element fields through restore", () => {
      const audio = API.createElement({
        type: "audio",
        src: "https://example.com/a.mp3",
        status: "saved",
      });
      const [restored] = restore.restoreElements([audio], null);
      expect(restored.type).toBe("audio");
      expect((restored as any).src).toBe("https://example.com/a.mp3");
      expect((restored as any).status).toBe("saved");
    });

    it("defaults missing src/status on restore (forward-compat)", () => {
      const video = API.createElement({ type: "video" });
      delete (video as any).src;
      delete (video as any).status;
      const [restored] = restore.restoreElements([video], null);
      expect((restored as any).src).toBe(null);
      expect((restored as any).status).toBe("saved");
    });
  });

  describe("native video lifecycle", () => {
    let lifecyclePauseSpy: ReturnType<typeof vi.spyOn>;

    beforeAll(() => {
      lifecyclePauseSpy = vi
        .spyOn(window.HTMLMediaElement.prototype, "pause")
        .mockImplementation(() => undefined);
    });

    afterAll(() => {
      lifecyclePauseSpy.mockRestore();
    });

    it("creates, selects, moves, resizes, and deletes without losing metadata", async () => {
      const video = createNativeVideoFixture();
      const expectedMetadata = getNativeVideoMetadata(video);
      const mouse = new Pointer("mouse");

      await render(
        <Excalidraw
          initialData={{ elements: [video] }}
          handleKeyboardGlobally
        />,
      );

      mouse.select(video);
      expect(API.getSelectedElement().id).toBe(video.id);
      expect(getNativeVideoMetadata(getVideo(video.id))).toEqual(
        expectedMetadata,
      );

      const beforeMove = getNativeVideoSnapshot(getVideo(video.id));
      mouse.downAt(video.x + 40, video.y + 40);
      mouse.moveTo(video.x + 80, video.y + 60);
      mouse.upAt(video.x + 80, video.y + 60);
      const moved = getVideo(video.id);
      expect(moved.x).toBe(beforeMove.x + 40);
      expect(moved.y).toBe(beforeMove.y + 20);
      expect(getNativeVideoMetadata(moved)).toEqual(expectedMetadata);

      const beforeResize = getNativeVideoSnapshot(moved);
      UI.resize(moved, "se", [40, 20]);
      const resized = getVideo(video.id);
      expect(resized.width).not.toBe(beforeResize.width);
      expect(resized.height).not.toBe(beforeResize.height);
      expect(getNativeVideoMetadata(resized)).toEqual(expectedMetadata);

      API.setSelectedElements([video]);
      Keyboard.keyPress(KEYS.DELETE);
      const deleted = getVideo(video.id);
      expect(deleted.isDeleted).toBe(true);
      expect(getNativeVideoMetadata(deleted)).toEqual(expectedMetadata);
    });

    it("preserves a deleted video through undo and redo", async () => {
      const video = createNativeVideoFixture();
      const original = getNativeVideoSnapshot(video);

      await render(
        <Excalidraw
          initialData={{ elements: [video] }}
          handleKeyboardGlobally
        />,
      );
      API.setSelectedElements([video]);
      Keyboard.keyPress(KEYS.DELETE);

      await waitFor(() => expect(getVideo(video.id).isDeleted).toBe(true));
      Keyboard.undo();
      expect(getNativeVideoSnapshot(getVideo(video.id))).toEqual(original);
      Keyboard.redo();
      expect(getNativeVideoSnapshot(getVideo(video.id))).toEqual({
        ...original,
        isDeleted: true,
      });
    });

    it("preserves a moved video through undo and redo", async () => {
      const video = createNativeVideoFixture();
      const original = getNativeVideoSnapshot(video);
      const mouse = new Pointer("mouse");

      await render(
        <Excalidraw
          initialData={{ elements: [video] }}
          handleKeyboardGlobally
        />,
      );
      mouse.downAt(video.x + 40, video.y + 40);
      mouse.moveTo(video.x + 80, video.y + 60);
      mouse.upAt(video.x + 80, video.y + 60);
      const moved = getNativeVideoSnapshot(getVideo(video.id));
      expect(moved.x).toBe(original.x + 40);
      expect(moved.y).toBe(original.y + 20);

      await waitFor(() => expect(API.getUndoStack()).toHaveLength(1));
      Keyboard.undo();
      expect(getNativeVideoSnapshot(getVideo(video.id))).toEqual(original);
      Keyboard.redo();
      expect(getNativeVideoSnapshot(getVideo(video.id))).toEqual(moved);
    });

    it("preserves a resized video through undo and redo", async () => {
      const video = createNativeVideoFixture();
      const original = getNativeVideoSnapshot(video);

      await render(
        <Excalidraw
          initialData={{ elements: [video] }}
          handleKeyboardGlobally
        />,
      );
      UI.resize(video, "se", [40, 20]);
      const resized = getNativeVideoSnapshot(getVideo(video.id));
      expect(resized.width).not.toBe(original.width);
      expect(resized.height).not.toBe(original.height);

      Keyboard.undo();
      expect(getNativeVideoSnapshot(getVideo(video.id))).toEqual(original);
      Keyboard.redo();
      expect(getNativeVideoSnapshot(getVideo(video.id))).toEqual(resized);
    });

    it("survives JSON serialization and the normal scene-loading path", async () => {
      const video = createNativeVideoFixture();
      await render(<Excalidraw />);
      const serialized = serializeAsJSON([video], h.state, {}, "local");

      const restoredScene = await loadFromBlob(
        new Blob([serialized], { type: MIME_TYPES.excalidraw }),
        h.state,
        [],
      );

      expect(
        getNativeVideoSnapshot(
          restoredScene.elements[0] as ExcalidrawVideoElement,
        ),
      ).toEqual(getNativeVideoSnapshot(video));
    });

    it("survives library add, export, import, and instantiation", async () => {
      const video = createNativeVideoFixture();
      const expectedMetadata = getNativeVideoMetadata(video);

      await render(<Excalidraw initialData={{ elements: [video] }} />);
      API.setSelectedElements([video]);
      API.executeAction(actionAddToLibrary);

      await waitFor(async () => {
        const libraryItems = await h.app.library.getLatestLibrary();
        expect(libraryItems).toHaveLength(1);
      });
      const addedItems = await h.app.library.getLatestLibrary();
      expect(
        getNativeVideoMetadata(
          addedItems[0].elements[0] as ExcalidrawVideoElement,
        ),
      ).toEqual(expectedMetadata);

      const exported = serializeLibraryAsJSON(addedItems);
      const parsed = parseLibraryJSON(exported);
      expect(
        getNativeVideoMetadata(parsed[0].elements[0] as ExcalidrawVideoElement),
      ).toEqual(expectedMetadata);

      await h.app.library.resetLibrary();
      await h.app.library.updateLibrary({
        libraryItems: new Blob([exported], {
          type: MIME_TYPES.excalidrawlib,
        }),
      });
      const importedItems = await h.app.library.getLatestLibrary();
      expect(
        getNativeVideoMetadata(
          importedItems[0].elements[0] as ExcalidrawVideoElement,
        ),
      ).toEqual(expectedMetadata);

      API.setElements([]);
      await API.drop([
        {
          kind: "string",
          value: serializeLibraryAsJSON(importedItems),
          type: MIME_TYPES.excalidrawlib,
        },
      ]);

      await waitFor(() => expect(h.elements).toHaveLength(1));
      const instantiated = h.elements[0] as ExcalidrawVideoElement;
      expect(instantiated.id).not.toBe(video.id);
      expect(getNativeVideoMetadata(instantiated)).toEqual(expectedMetadata);
    });
  });

  describe("node interaction (overlay + viewer)", () => {
    let playSpy: ReturnType<typeof vi.spyOn>;
    let pauseSpy: ReturnType<typeof vi.spyOn>;

    beforeAll(() => {
      // jsdom doesn't implement media playback; stub it so syncMediaPlayback
      // (hover-to-preview) doesn't throw
      playSpy = vi
        .spyOn(window.HTMLMediaElement.prototype, "play")
        .mockImplementation(() => Promise.resolve());
      pauseSpy = vi
        .spyOn(window.HTMLMediaElement.prototype, "pause")
        .mockImplementation(() => undefined);
    });

    afterAll(() => {
      playSpy.mockRestore();
      pauseSpy.mockRestore();
    });

    beforeEach(() => {
      playSpy.mockClear();
      pauseSpy.mockClear();
    });

    const savedVideo = () =>
      API.createElement({
        type: "video",
        x: 0,
        y: 0,
        width: 320,
        height: 180,
        src: "https://example.com/v.mp4",
        status: "saved",
      });

    it("renders a non-interactive, controls-less video preview overlay", async () => {
      await render(<Excalidraw />);
      const video = savedVideo();
      API.setElements([video]);

      const container = document.querySelector(
        ".excalidraw__media-container",
      ) as HTMLElement | null;
      const player = document.querySelector(
        "video.excalidraw__media-video",
      ) as HTMLVideoElement | null;

      expect(container).not.toBeNull();
      expect(player).not.toBeNull();
      // overlay must not steal canvas pointer events (select/drag stays smooth)
      expect(container!.style.pointerEvents).toBe("none");
      // no inline controls on the canvas node
      expect(player!.hasAttribute("controls")).toBe(false);
      expect(player!.hasAttribute("loop")).toBe(true);
    });

    it("expand button opens the modal viewer; close dismisses it", async () => {
      await render(<Excalidraw />);
      const video = savedVideo();
      API.setElements([video]);
      // chrome (expand button) shows when hovered or selected
      API.setSelectedElements([video]);

      const expand = document.querySelector(
        ".excalidraw__media-expand",
      ) as HTMLButtonElement | null;
      expect(expand).not.toBeNull();

      act(() => expand!.click());
      expect(h.state.activeMediaViewer?.elementId).toBe(video.id);
      expect(
        document.querySelector(".excalidraw__media-viewer"),
      ).not.toBeNull();
      expect(
        document.querySelector(".excalidraw__media-viewer__video"),
      ).not.toBeNull();

      const close = document.querySelector(
        ".excalidraw__media-viewer__close",
      ) as HTMLButtonElement;
      act(() => close.click());
      expect(h.state.activeMediaViewer).toBe(null);
      expect(document.querySelector(".excalidraw__media-viewer")).toBeNull();
    });

    it("hovering a video node previews it (plays); leaving pauses", async () => {
      await render(<Excalidraw />);
      const video = savedVideo();
      API.setElements([video]);

      await act(async () => {
        (h.app as any).handleMediaElementHover({
          hitElement: video,
          event: { buttons: 0 },
        });
      });
      expect(h.state.hoveredMediaElementId).toBe(video.id);
      expect(playSpy).toHaveBeenCalled();

      await act(async () => {
        (h.app as any).handleMediaElementHover({
          hitElement: null,
          event: { buttons: 0 },
        });
      });
      expect(h.state.hoveredMediaElementId).toBe(null);
      expect(pauseSpy).toHaveBeenCalled();
    });

    it("does not hover-preview while a button is held (dragging)", async () => {
      await render(<Excalidraw />);
      const video = savedVideo();
      API.setElements([video]);

      await act(async () => {
        (h.app as any).handleMediaElementHover({
          hitElement: video,
          event: { buttons: 1 },
        });
      });
      expect(h.state.hoveredMediaElementId).toBe(null);
    });
  });
});
