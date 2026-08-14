import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { decodePng, pngHash } from "./png";
import { canonicalFilename } from "./naming";

import type { VisualBaselineMetadata, VisualScenario } from "./types";

export const directoryHash = async (root: string) => {
  const hash = createHash("sha256");
  const visit = async (directory: string) => {
    let entries: string[] = [];
    try {
      entries = await readdir(directory);
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        return;
      }
      throw error;
    }
    for (const entry of entries.sort()) {
      const absolute = path.join(directory, entry);
      const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
      const info = await stat(absolute);
      if (info.isDirectory()) {
        await visit(absolute);
      } else {
        hash.update(relative);
        hash.update(await readFile(absolute));
      }
    }
  };
  await visit(root);
  return hash.digest("hex");
};

export const validateBaselineMetadata = (
  metadata: VisualBaselineMetadata,
  image: Uint8Array,
  scenario: VisualScenario,
) => {
  const decoded = decodePng(image);
  const failures: string[] = [];
  if (metadata.schemaVersion !== 1) {
    failures.push("schemaVersion");
  }
  if (metadata.scenarioId !== scenario.id) {
    failures.push("scenarioId");
  }
  if (metadata.filename !== canonicalFilename(scenario)) {
    failures.push("filename");
  }
  if (metadata.width !== decoded.width || metadata.height !== decoded.height) {
    failures.push("dimensions");
  }
  if (metadata.deviceScaleFactor !== scenario.geometry.deviceScaleFactor) {
    failures.push("deviceScaleFactor");
  }
  if (metadata.imageHash !== pngHash(image)) {
    failures.push("imageHash");
  }
  if (!/^[a-f0-9]{64}$/.test(metadata.imageHash)) {
    failures.push("imageHashFormat");
  }
  if (
    metadata.filename.includes("implementer") ||
    metadata.filename.includes("reviewer")
  ) {
    failures.push("canonicalRoleSuffix");
  }
  if (
    JSON.stringify(metadata.comparison) !== JSON.stringify(scenario.comparison)
  ) {
    failures.push("comparison");
  }
  if (metadata.budgetSource !== (scenario.performance?.source ?? null)) {
    failures.push("budgetSource");
  }
  if (
    metadata.approval !== "intentional-change" ||
    (metadata.approvedBy !== "implementer" && metadata.approvedBy !== "fixer")
  ) {
    failures.push("approval");
  }
  if (!Number.isFinite(Date.parse(metadata.inspectedAt))) {
    failures.push("inspectedAt");
  }
  if (
    metadata.crop.selector !== scenario.capture.selector ||
    metadata.crop.target.width <= 0 ||
    metadata.crop.target.height <= 0 ||
    metadata.crop.editor.width <= 0 ||
    metadata.crop.editor.height <= 0
  ) {
    failures.push("crop");
  }
  if (
    !metadata.browser.trim() ||
    !metadata.platform.trim() ||
    !metadata.fontVersion.trim() ||
    !metadata.fixtureVersion.trim()
  ) {
    failures.push("environment");
  }
  if (!/^[a-f0-9]{64}$/.test(metadata.sourceFingerprint)) {
    failures.push("sourceFingerprint");
  }
  if (failures.length) {
    throw new Error(
      `Invalid baseline metadata for ${scenario.id}: ${failures.join(", ")}`,
    );
  }
};
