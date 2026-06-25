import { vi } from "vitest";

import {
  isGeneratorElement,
  getGeneratorConfig,
  newGeneratorConfig,
  generatedImageCacheKey,
} from "@excalidraw/element";

import { Excalidraw } from "../index";
import * as restore from "../data/restore";

import { API } from "./helpers/api";
import { mockHTMLImageElement } from "./helpers/mocks";
import { render, act, queryByTestId } from "./test-utils";

const h = window.h;

describe("generator nodes", () => {
  describe("config helpers & guard", () => {
    it("newGeneratorConfig has idle defaults", () => {
      const config = newGeneratorConfig("image");
      expect(config).toEqual({
        kind: "image",
        prompt: "",
        model: null,
        params: {},
        refs: [],
        state: { status: "idle" },
        result: null,
      });
    });

    it("isGeneratorElement only matches image/video/audio with a config", () => {
      const img = API.createElement({ type: "image" });
      expect(isGeneratorElement(img)).toBe(false);
      (img as any).customData = { generator: newGeneratorConfig("image") };
      expect(isGeneratorElement(img)).toBe(true);

      const audio = API.createElement({ type: "audio" });
      (audio as any).customData = { generator: newGeneratorConfig("audio") };
      expect(isGeneratorElement(audio)).toBe(true);

      // a rectangle with a generator config is NOT a generator node
      const rect = API.createElement({ type: "rectangle" });
      (rect as any).customData = { generator: newGeneratorConfig("image") };
      expect(isGeneratorElement(rect)).toBe(false);

      expect(getGeneratorConfig(img)?.kind).toBe("image");
      expect(getGeneratorConfig(rect)).not.toBeNull(); // helper is type-agnostic
    });
  });

  describe("restore normalization", () => {
    it("coerces a stale pending job back to idle and preserves config", () => {
      const el = API.createElement({ type: "image" });
      (el as any).customData = {
        generator: {
          ...newGeneratorConfig("image"),
          prompt: "a cat",
          model: "m1",
          state: { status: "pending", jobId: "j1" },
        },
      };
      const [restored] = restore.restoreElements([el], null);
      const config = (restored.customData as any).generator;
      expect(config.state).toEqual({ status: "idle" });
      expect(config.prompt).toBe("a cat");
      expect(config.model).toBe("m1");
    });

    it("preserves a done state through restore", () => {
      const el = API.createElement({ type: "video" });
      (el as any).customData = {
        generator: {
          ...newGeneratorConfig("video"),
          state: { status: "done" },
        },
      };
      const [restored] = restore.restoreElements([el], null);
      expect((restored.customData as any).generator.state).toEqual({
        status: "done",
      });
    });

    it("preserves an image-result URL ref and keeps fileId null (no files entry)", () => {
      const url = "https://example.com/result.png";
      const el = API.createElement({ type: "image" });
      (el as any).customData = {
        generator: {
          ...newGeneratorConfig("image"),
          state: { status: "done" },
          result: url,
        },
      };

      const [restored] = restore.restoreElements([el], null);
      const config = (restored.customData as any).generator;

      // the URL ref survives save/load unchanged
      expect(config.result).toBe(url);
      expect(config.state).toEqual({ status: "done" });
      // fileId stays null → serialization writes no `files[fileId]` entry,
      // so the persisted scene carries only the URL string (no image bytes)
      expect((restored as any).fileId).toBe(null);
    });
  });

  describe("generation lifecycle", () => {
    const createSelectedVideoGenerator = () => {
      act(() => h.app.createGeneratorNode("video"));
      const el = h.app.scene.getNonDeletedElements().find(isGeneratorElement)!;
      // choose a model so generation is allowed
      act(() => {
        h.app.scene.mutateElement(el, {
          customData: {
            generator: { ...getGeneratorConfig(el)!, model: "m1" },
          },
        });
      });
      return h.app.scene.getElement(el.id)!;
    };

    const createSelectedImageGenerator = () => {
      act(() => h.app.createGeneratorNode("image"));
      const el = h.app.scene.getNonDeletedElements().find(isGeneratorElement)!;
      act(() => {
        h.app.scene.mutateElement(el, {
          customData: {
            generator: { ...getGeneratorConfig(el)!, model: "m1" },
          },
        });
      });
      return h.app.scene.getElement(el.id)!;
    };

    it("image: done sets result URL ref, leaves fileId null, adds no files entry", async () => {
      // stub Image so loadHTMLImageElement resolves (jsdom can't load images)
      mockHTMLImageElement(512, 384);

      const onGeneratorSubmit = vi.fn(async () => ({ jobId: "j1" }));
      const onGeneratorPoll = vi.fn(async () => ({
        status: "done" as const,
        url: "https://example.com/result.png",
      }));

      await render(
        <Excalidraw
          onGeneratorSubmit={onGeneratorSubmit}
          onGeneratorPoll={onGeneratorPoll}
          renderGeneratorPanel={() => null}
        />,
      );

      const el = createSelectedImageGenerator();
      expect(el.type).toBe("image");

      vi.useFakeTimers();
      try {
        await act(async () => {
          await (h.app as any).startGeneration(h.app.scene.getElement(el.id));
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });
      } finally {
        vi.useRealTimers();
      }
      // allow the loadHTMLImageElement microtask + mutate to settle
      await act(async () => {
        await Promise.resolve();
      });

      const done = h.app.scene.getElement(el.id)!;
      const config = getGeneratorConfig(done)!;
      expect(config.state.status).toBe("done");
      // result URL ref persisted on the generator config
      expect(config.result).toBe("https://example.com/result.png");
      expect((done as any).status).toBe("saved");
      // no bytes ingested: fileId stays null and the files store has no entry
      expect((done as any).fileId).toBe(null);
      expect(Object.keys(h.app.files)).toHaveLength(0);

      vi.unstubAllGlobals();
    });

    it("public updateScene primes the cache for a done URL-ref image generator", async () => {
      // stub Image so loadHTMLImageElement resolves (jsdom can't load images)
      mockHTMLImageElement(512, 384);

      await render(<Excalidraw renderGeneratorPanel={() => null} />);

      const url = "https://example.com/saved-result.png";
      // a persisted done image-generator node: URL ref, fileId null, NO files
      const el = API.createElement({ type: "image" });
      (el as any).customData = {
        generator: {
          ...newGeneratorConfig("image"),
          state: { status: "done" },
          result: url,
        },
      };

      const cacheKey = generatedImageCacheKey(url);
      // not primed before the host loads the scene via the public API
      expect(h.app.imageCache.has(cacheKey)).toBe(false);

      // load the saved canvas the way the downstream integration does:
      // updateScene({ elements }) — NOT initialData / addFiles
      await act(async () => {
        h.app.updateScene({ elements: [el] });
        // allow the async primeGeneratedImageCache load to settle
        await Promise.resolve();
        await Promise.resolve();
      });

      // the URL ref was loaded into the cache under the synthetic key, so the
      // render gate resolves it instead of drawing a placeholder
      expect(h.app.imageCache.has(cacheKey)).toBe(true);
      // still byte-free: no files entry, element keeps fileId null
      expect(Object.keys(h.app.files)).toHaveLength(0);
      const loaded = h.app.scene.getElement(el.id)!;
      expect((loaded as any).fileId).toBe(null);

      vi.unstubAllGlobals();
    });

    it("video: idle → pending → done sets src", async () => {
      const onGeneratorSubmit = vi.fn(async () => ({ jobId: "j1" }));
      let polls = 0;
      const onGeneratorPoll = vi.fn(async () => {
        polls += 1;
        return polls < 2
          ? ({ status: "pending", progress: 0.5 } as const)
          : ({ status: "done", url: "https://example.com/v.mp4" } as const);
      });

      await render(
        <Excalidraw
          onGeneratorSubmit={onGeneratorSubmit}
          onGeneratorPoll={onGeneratorPoll}
          renderGeneratorPanel={() => null}
        />,
      );

      const el = createSelectedVideoGenerator();
      expect(getGeneratorConfig(el)!.state.status).toBe("idle");

      vi.useFakeTimers();
      try {
        await act(async () => {
          await (h.app as any).startGeneration(h.app.scene.getElement(el.id));
        });
        expect(onGeneratorSubmit).toHaveBeenCalledTimes(1);
        expect(
          getGeneratorConfig(h.app.scene.getElement(el.id)!)!.state.status,
        ).toBe("pending");

        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
          await vi.advanceTimersByTimeAsync(1600);
        });

        const done = h.app.scene.getElement(el.id)!;
        expect(getGeneratorConfig(done)!.state.status).toBe("done");
        expect((done as any).src).toBe("https://example.com/v.mp4");
        expect((done as any).status).toBe("saved");
      } finally {
        vi.useRealTimers();
      }
    });

    it("video: poll error sets error state", async () => {
      const onGeneratorSubmit = vi.fn(async () => ({ jobId: "j1" }));
      const onGeneratorPoll = vi.fn(async () => ({
        status: "error" as const,
        message: "boom",
      }));

      await render(
        <Excalidraw
          onGeneratorSubmit={onGeneratorSubmit}
          onGeneratorPoll={onGeneratorPoll}
          renderGeneratorPanel={() => null}
        />,
      );

      const el = createSelectedVideoGenerator();

      vi.useFakeTimers();
      try {
        await act(async () => {
          await (h.app as any).startGeneration(h.app.scene.getElement(el.id));
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });
        const state = getGeneratorConfig(h.app.scene.getElement(el.id)!)!.state;
        expect(state.status).toBe("error");
        expect(state.status === "error" && state.message).toBe("boom");
      } finally {
        vi.useRealTimers();
      }
    });

    it("deletes mid-job: aborts and never writes the result back", async () => {
      const onGeneratorSubmit = vi.fn(async () => ({ jobId: "j1" }));
      const onGeneratorPoll = vi.fn(async () => ({
        status: "done" as const,
        url: "https://example.com/v.mp4",
      }));

      await render(
        <Excalidraw
          onGeneratorSubmit={onGeneratorSubmit}
          onGeneratorPoll={onGeneratorPoll}
          renderGeneratorPanel={() => null}
        />,
      );

      const el = createSelectedVideoGenerator();

      vi.useFakeTimers();
      try {
        await act(async () => {
          await (h.app as any).startGeneration(h.app.scene.getElement(el.id));
        });
        // soft-delete the node before the poll fires
        act(() => {
          h.app.scene.mutateElement(h.app.scene.getElement(el.id)!, {
            isDeleted: true,
          });
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1600);
        });

        const deleted = h.app.scene
          .getElementsMapIncludingDeleted()
          .get(el.id)!;
        // poll never ran, no result written, state not flipped to done
        expect(onGeneratorPoll).not.toHaveBeenCalled();
        expect((deleted as any).src).toBe(null);
        expect((deleted.customData as any).generator.state.status).not.toBe(
          "done",
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("toolbar exposes image + video generators but NOT audio", async () => {
      const { container } = await render(
        <Excalidraw
          onGeneratorSubmit={vi.fn(async () => ({ jobId: "j1" }))}
          onGeneratorPoll={vi.fn(async () => ({ status: "pending" as const }))}
          renderGeneratorPanel={() => null}
        />,
      );

      expect(
        queryByTestId(container, "toolbar-image-generator"),
      ).not.toBeNull();
      expect(
        queryByTestId(container, "toolbar-video-generator"),
      ).not.toBeNull();
      // audio generation is disabled (no audio-generation backend)
      expect(queryByTestId(container, "toolbar-audio-generator")).toBeNull();
    });

    it("cancel returns a pending job to idle", async () => {
      const onGeneratorSubmit = vi.fn(async () => ({ jobId: "j1" }));
      const onGeneratorPoll = vi.fn(async () => ({
        status: "pending" as const,
      }));

      await render(
        <Excalidraw
          onGeneratorSubmit={onGeneratorSubmit}
          onGeneratorPoll={onGeneratorPoll}
          renderGeneratorPanel={() => null}
        />,
      );

      const el = createSelectedVideoGenerator();

      vi.useFakeTimers();
      try {
        await act(async () => {
          await (h.app as any).startGeneration(h.app.scene.getElement(el.id));
        });
        expect(
          getGeneratorConfig(h.app.scene.getElement(el.id)!)!.state.status,
        ).toBe("pending");
        act(() => {
          (h.app as any).cancelGeneration(h.app.scene.getElement(el.id));
        });
        expect(
          getGeneratorConfig(h.app.scene.getElement(el.id)!)!.state.status,
        ).toBe("idle");
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
