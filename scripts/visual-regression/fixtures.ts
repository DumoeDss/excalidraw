export const FIXTURE_VERSION = "visual-fixtures-v1";
export const FIXED_TIME = 1_725_000_000_000;

type SceneSkeleton = Readonly<Record<string, unknown>>;

const elementDefaults = {
  angle: 0,
  strokeColor: "#1b1b1f",
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: null,
  boundElements: null,
  updated: FIXED_TIME,
  link: null,
  locked: false,
} as const;

export const createSceneFixture = (
  identity:
    | "welcome"
    | "selected-rectangle"
    | "selected-text"
    | "active-text-editing",
): readonly SceneSkeleton[] => {
  if (identity === "welcome") {
    return [];
  }
  if (identity === "selected-rectangle") {
    return [
      {
        ...elementDefaults,
        type: "rectangle",
        id: "visual-rectangle-01",
        seed: 10101,
        version: 3,
        versionNonce: 11001,
        index: "a0",
        x: 360,
        y: 220,
        width: 320,
        height: 210,
        backgroundColor: "#d0bfff",
        strokeColor: "#6741d9",
      },
    ];
  }
  const text = {
    ...elementDefaults,
    type: "text",
    id: "visual-text-01",
    seed: 20202,
    version: 4,
    versionNonce: 22002,
    index: "a0",
    x: 350,
    y: 260,
    width: 360,
    height: 50,
    text: "A deterministic editing state",
    originalText: "A deterministic editing state",
    fontSize: 28,
    fontFamily: 1,
    textAlign: "left",
    verticalAlign: "top",
    containerId: null,
    lineHeight: 1.25,
    autoResize: true,
  } as const;
  return [text];
};

export const createApplicationFixtures = () => ({
  library: {
    id: "visual-library-01",
    name: "Reusable card",
    status: "published" as const,
    created: FIXED_TIME,
    scene: "selected-rectangle" as const,
  },
  ai: {
    prompt: "Create a three-step local workflow",
    state: "ready",
  },
  sharing: {
    owner: "Local owner",
    link: "https://example.invalid/local-share",
  },
  collaboration: [
    { id: "visual-collaborator-01", username: "Aster", color: "#6741d9" },
    { id: "visual-collaborator-02", username: "Birch", color: "#0b7285" },
    { id: "visual-collaborator-03", username: "Cedar", color: "#c2255c" },
  ],
  loading: { title: "Preparing local content", progress: 0.5 },
  recoverableError: {
    title: "Local content could not be prepared",
    action: "Try again",
  },
  topLevelRecovery: {
    title: "The editor can be reopened",
    action: "Open editor",
  },
  multiEditor: {
    left: { id: "visual-editor-left", theme: "light", direction: "ltr" },
    right: { id: "visual-editor-right", theme: "dark", direction: "rtl" },
  },
});
