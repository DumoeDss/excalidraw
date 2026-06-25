import type {
  ExcalidrawElement,
  GeneratorConfig,
  GeneratorKind,
} from "./types";

/**
 * Centralized typed access to a generator node's config, which lives untyped
 * under `element.customData.generator`.
 */
export const getGeneratorConfig = (
  element: ExcalidrawElement | null | undefined,
): GeneratorConfig | null => {
  const config = (
    element?.customData as { generator?: GeneratorConfig } | undefined
  )?.generator;
  return config ?? null;
};

/** A fresh, idle generator config for the given kind. */
export const newGeneratorConfig = (kind: GeneratorKind): GeneratorConfig => ({
  kind,
  prompt: "",
  model: null,
  params: {},
  refs: [],
  state: { status: "idle" },
  // explicit idle result so new nodes carry no image-result URL ref yet
  result: null,
});

/**
 * Returns the `customData` object with the generator config merged in,
 * preserving any other custom data already on the element.
 */
export const withGeneratorConfig = (
  element: ExcalidrawElement,
  config: GeneratorConfig,
): Record<string, any> => ({
  ...(element.customData ?? {}),
  generator: config,
});
