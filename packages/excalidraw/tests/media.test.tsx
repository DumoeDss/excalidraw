import {
  newAudioElement,
  newVideoElement,
  isAudioElement,
  isMediaElement,
  isVideoElement,
} from "@excalidraw/element";

import * as restore from "../data/restore";

import { API } from "./helpers/api";

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
});
