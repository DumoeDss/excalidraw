import { decodePng, encodePng, pngHash } from "./png";

import type { VisualComparisonPolicy } from "./types";

export type PixelMask = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  reason: string;
}>;

export type ComparisonResult = Readonly<{
  pass: boolean;
  width: number;
  height: number;
  mismatchCount: number;
  mismatchRatio: number;
  changedBounds: { x: number; y: number; width: number; height: number } | null;
  maskCount: number;
  maskRatio: number;
  expectedHash: string;
  currentHash: string;
  diff: Uint8Array;
}>;

const insideMask = (x: number, y: number, masks: readonly PixelMask[]) =>
  masks.some(
    (mask) =>
      x >= mask.x &&
      y >= mask.y &&
      x < mask.x + mask.width &&
      y < mask.y + mask.height,
  );

export const comparePng = ({
  expected,
  current,
  policy,
  masks = [],
}: {
  expected: Uint8Array;
  current: Uint8Array;
  policy: VisualComparisonPolicy;
  masks?: readonly PixelMask[];
}): ComparisonResult => {
  const left = decodePng(expected);
  const right = decodePng(current);
  if (left.width !== right.width || left.height !== right.height) {
    throw new Error(
      `PNG dimension mismatch: ${left.width}x${left.height} != ${right.width}x${right.height}`,
    );
  }
  const total = left.width * left.height;
  const maskCount = masks.reduce(
    (sum, mask) => sum + Math.max(0, mask.width) * Math.max(0, mask.height),
    0,
  );
  const maskRatio = maskCount / total;
  if (
    maskRatio > policy.maxMaskRatio ||
    masks.some((mask) => !mask.reason || mask.width <= 0 || mask.height <= 0)
  ) {
    throw new Error("Pixel masks exceed the bounded semantic mask policy");
  }
  const diff = new Uint8Array(left.data.length);
  let mismatchCount = 0;
  let minX = left.width;
  let minY = left.height;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < total; pixel++) {
    const x = pixel % left.width;
    const y = Math.floor(pixel / left.width);
    const offset = pixel * 4;
    if (insideMask(x, y, masks)) {
      diff.set([96, 96, 96, 255], offset);
      continue;
    }
    const channels = [0, 1, 2, 3].map((channel) =>
      Math.abs(left.data[offset + channel] - right.data[offset + channel]),
    );
    const maxDifference = Math.max(...channels);
    const edgeVariance =
      channels[3] <= policy.antialiasTolerance &&
      channels.slice(0, 3).every((value) => value <= policy.antialiasTolerance);
    const changed = maxDifference > policy.channelTolerance && !edgeVariance;
    if (changed) {
      mismatchCount++;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      diff.set([255, 0, 180, 255], offset);
    } else {
      const gray = Math.round(
        (right.data[offset] + right.data[offset + 1] + right.data[offset + 2]) /
          6 +
          64,
      );
      diff.set([gray, gray, gray, 255], offset);
    }
  }
  const mismatchRatio = mismatchCount / Math.max(1, total - maskCount);
  return {
    pass: mismatchRatio <= policy.maxMismatchRatio,
    width: left.width,
    height: left.height,
    mismatchCount,
    mismatchRatio,
    changedBounds:
      maxX >= 0
        ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
        : null,
    maskCount,
    maskRatio,
    expectedHash: pngHash(expected),
    currentHash: pngHash(current),
    diff: encodePng({ width: left.width, height: left.height, data: diff }),
  };
};
