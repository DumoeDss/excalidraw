import { vi } from "vitest";

import {
  newAudioElement,
  newVideoElement,
  isAudioElement,
  isMediaElement,
  isVideoElement,
  shouldTestInside,
} from "@excalidraw/element";

import { Excalidraw } from "../index";
import * as restore from "../data/restore";

import { API } from "./helpers/api";
import { render, act } from "./test-utils";

const h = window.h;

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
