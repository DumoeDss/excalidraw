import { vi } from "vitest";

import {
  isGeneratorElement,
  getGeneratorConfig,
  newGeneratorConfig,
} from "@excalidraw/element";

import { Excalidraw } from "../index";
import * as restore from "../data/restore";

import { API } from "./helpers/api";
import { render, act } from "./test-utils";

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
