/**
 * Mock / example generator backend.
 *
 * Demonstrates the backend-agnostic generator contract the editor expects:
 *   - onListGeneratorModels(kind)  → model list + param schema
 *   - onGeneratorSubmit(req)       → create an async job, return its id
 *   - onGeneratorPoll(jobId)       → poll until done, return a result URL
 *
 * Replace these with calls to a real backend (the editor only cares about the
 * shapes). The mock completes a job after a few polls and returns:
 *   - image → an inline SVG data URL (works offline)
 *   - audio → a short silent WAV data URL (works offline)
 *   - video → a small sample URL (illustrative; needs network)
 */
import type {
  GeneratorModel,
  GeneratorPoll,
  GeneratorRequest,
} from "@excalidraw/excalidraw";
import type { GeneratorKind } from "@excalidraw/element/types";

const MODELS: Record<GeneratorKind, GeneratorModel[]> = {
  image: [
    {
      id: "mock-image-v1",
      label: "Mock Image v1",
      kind: "image",
      params: [
        {
          type: "select",
          key: "size",
          label: "Size",
          options: [
            { value: "512", label: "512" },
            { value: "1024", label: "1024" },
          ],
          default: "512",
        },
        {
          type: "number",
          key: "steps",
          label: "Steps",
          min: 1,
          max: 50,
          step: 1,
          default: 20,
        },
      ],
    },
  ],
  audio: [
    {
      id: "mock-audio-v1",
      label: "Mock Audio v1",
      kind: "audio",
      params: [
        {
          type: "number",
          key: "seconds",
          label: "Duration (s)",
          min: 1,
          max: 30,
          step: 1,
          default: 3,
        },
      ],
    },
  ],
  video: [
    {
      id: "mock-video-v1",
      label: "Mock Video v1",
      kind: "video",
      params: [],
    },
  ],
};

type Job = { kind: GeneratorKind; prompt: string; polls: number };
const jobs = new Map<string, Job>();
let jobCounter = 0;

const svgDataUrl = (prompt: string): string => {
  const text = (prompt || "generated").slice(0, 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="#6741d9"/><text x="50%" y="50%" fill="#fff" font-family="sans-serif" font-size="28" text-anchor="middle" dominant-baseline="middle">${text.replace(
    /[<>&]/g,
    "",
  )}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// minimal valid silent WAV (44-byte header + 0 samples) as a data URL
const silentWavDataUrl = (): string => {
  const header = new Uint8Array([
    82, 73, 70, 70, 36, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32, 16, 0, 0, 0,
    1, 0, 1, 0, 68, 172, 0, 0, 136, 88, 1, 0, 2, 0, 16, 0, 100, 97, 116, 97, 0,
    0, 0, 0,
  ]);
  let binary = "";
  header.forEach((b) => (binary += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(binary)}`;
};

const SAMPLE_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const resultUrl = (kind: GeneratorKind, prompt: string): string => {
  switch (kind) {
    case "image":
      return svgDataUrl(prompt);
    case "audio":
      return silentWavDataUrl();
    case "video":
      return SAMPLE_VIDEO_URL;
  }
};

export const listGeneratorModels = async (
  kind: GeneratorKind,
): Promise<GeneratorModel[]> => {
  return MODELS[kind] ?? [];
};

export const submitGenerator = async (
  req: GeneratorRequest,
): Promise<{ jobId: string }> => {
  const jobId = `job-${++jobCounter}`;
  jobs.set(jobId, { kind: req.kind, prompt: req.prompt, polls: 0 });
  return { jobId };
};

export const pollGenerator = async (jobId: string): Promise<GeneratorPoll> => {
  const job = jobs.get(jobId);
  if (!job) {
    return { status: "error", message: "Unknown job" };
  }
  job.polls += 1;
  // pretend the job takes ~3 polls
  if (job.polls < 3) {
    return { status: "pending", progress: job.polls / 3 };
  }
  jobs.delete(jobId);
  return { status: "done", url: resultUrl(job.kind, job.prompt) };
};
