import {
  lstat,
  mkdir,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  assertRoleMayWrite,
  parseVisualRole,
  VISUAL_ARTIFACT_ROOTS,
} from "./paths";

import type { VisualArtifactKind, VisualArtifactRoots } from "./paths";
import type { VisualRole } from "./types";

type ArtifactWriteOperation<T> = (destination: string) => Promise<T>;

const pathIsInside = (root: string, destination: string) => {
  const relative = path.relative(root, destination);
  return (
    relative === "" ||
    (!path.isAbsolute(relative) &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`))
  );
};

const nearestExistingPath = async (value: string) => {
  let current = path.resolve(value);
  while (true) {
    try {
      await lstat(current);
      return current;
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        throw new Error(
          `No existing parent for visual artifact path: ${value}`,
        );
      }
      current = parent;
    }
  }
};

const assertNoReparsePoint = async (value: string, rejectHardLink = false) => {
  try {
    const info = await lstat(value);
    if (info.isSymbolicLink()) {
      throw new Error(
        `Visual artifact path contains a symlink or junction: ${value}`,
      );
    }
    if (rejectHardLink && info.isFile() && info.nlink > 1) {
      throw new Error(`Visual artifact destination is a hard link: ${value}`);
    }
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
};

const assertExistingComponentsAreDirect = async (
  rootAnchor: string,
  destination: string,
) => {
  const relative = path.relative(rootAnchor, destination);
  if (!pathIsInside(rootAnchor, destination)) {
    throw new Error(
      `Visual artifact path escapes its nearest existing root: ${destination}`,
    );
  }
  let current = rootAnchor;
  await assertNoReparsePoint(current);
  if (!relative) {
    return;
  }
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) {
        throw new Error(
          `Visual artifact path contains a symlink or junction: ${current}`,
        );
      }
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        return;
      }
      throw error;
    }
  }
};

const effectivePathFromNearestParent = async (value: string) => {
  const nearest = await nearestExistingPath(value);
  const nearestReal = await realpath(nearest);
  return path.resolve(nearestReal, path.relative(nearest, path.resolve(value)));
};

const rootFor = (
  roots: VisualArtifactRoots,
  role: VisualRole,
  kind: VisualArtifactKind,
) =>
  kind === "candidate"
    ? path.join(roots.candidate, role)
    : kind === "result"
    ? path.join(roots.result, role)
    : kind === "canonical"
    ? roots.baseline
    : path.join(roots.evidence, role);

export class GuardedArtifactWriter {
  readonly role: VisualRole;

  private readonly roots: VisualArtifactRoots;

  constructor(
    roleValue: unknown,
    roots: VisualArtifactRoots = VISUAL_ARTIFACT_ROOTS,
  ) {
    this.role = parseVisualRole(roleValue);
    this.roots = {
      baseline: path.resolve(roots.baseline),
      candidate: path.resolve(roots.candidate),
      result: path.resolve(roots.result),
      evidence: path.resolve(roots.evidence),
    };
  }

  private async prepareDestination(
    kind: VisualArtifactKind,
    destinationValue: string,
  ) {
    const destination = assertRoleMayWrite(
      this.role,
      destinationValue,
      kind,
      this.roots,
    );
    const root = path.resolve(rootFor(this.roots, this.role, kind));
    const rootAnchor = await nearestExistingPath(root);
    await assertExistingComponentsAreDirect(rootAnchor, destination);

    const effectiveRoot = await effectivePathFromNearestParent(root);
    const effectiveDestination = await effectivePathFromNearestParent(
      destination,
    );
    if (!pathIsInside(effectiveRoot, effectiveDestination)) {
      throw new Error(
        `Visual artifact path escapes through its nearest existing parent: ${destination}`,
      );
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await assertExistingComponentsAreDirect(rootAnchor, destination);
    const createdRoot = await realpath(root);
    const createdParent = await realpath(path.dirname(destination));
    if (!pathIsInside(createdRoot, createdParent)) {
      throw new Error(
        `Visual artifact parent escapes its declared root: ${destination}`,
      );
    }
    await assertNoReparsePoint(destination, true);
    return destination;
  }

  private async verifyDestination(
    kind: VisualArtifactKind,
    destination: string,
  ) {
    const root = await realpath(rootFor(this.roots, this.role, kind));
    await assertNoReparsePoint(destination, true);
    const resolved = await realpath(destination);
    if (!pathIsInside(root, resolved)) {
      throw new Error(
        `Visual artifact write escaped its declared root: ${destination}`,
      );
    }
  }

  // This is the sole retained-artifact write seam. Authorization, parent
  // creation, the actual open/write callback, and post-write verification stay
  // in one operation. Windows does not expose a race-free openat/no-follow
  // chain through Node, so an attacker with concurrent local filesystem write
  // access could still race the final validation and the callback's open.
  async writeThrough<T>(
    kind: VisualArtifactKind,
    destinationValue: string,
    operation: ArtifactWriteOperation<T>,
  ) {
    const destination = await this.prepareDestination(kind, destinationValue);
    const value = await operation(destination);
    await this.verifyDestination(kind, destination);
    return value;
  }

  writeFile(
    kind: VisualArtifactKind,
    destination: string,
    value: Uint8Array | string,
  ) {
    return this.writeThrough(kind, destination, (authorizedDestination) =>
      writeFile(authorizedDestination, value),
    );
  }

  writeStableJson(
    kind: VisualArtifactKind,
    destination: string,
    value: unknown,
  ) {
    return this.writeThrough(kind, destination, (authorizedDestination) =>
      writeFile(
        authorizedDestination,
        `${JSON.stringify(value, null, 2)}\n`,
        "utf8",
      ),
    );
  }

  async writeFileAtomically(
    kind: VisualArtifactKind,
    destination: string,
    value: Uint8Array,
  ) {
    const temporary = `${destination}.candidate`;
    let temporaryWritten = false;
    try {
      await this.writeThrough(kind, temporary, (authorizedTemporary) =>
        writeFile(authorizedTemporary, value),
      );
      temporaryWritten = true;
      await this.writeThrough(kind, destination, (authorizedDestination) =>
        rename(temporary, authorizedDestination),
      );
    } catch (error) {
      if (temporaryWritten) {
        await unlink(temporary).catch((cleanupError: any) => {
          if (cleanupError?.code !== "ENOENT") {
            throw new AggregateError(
              [error, cleanupError],
              `Visual artifact atomic write and temporary cleanup failed: ${destination}`,
            );
          }
        });
      }
      throw error;
    }
  }
}

export const createArtifactWriter = (
  roleValue: unknown,
  roots: VisualArtifactRoots = VISUAL_ARTIFACT_ROOTS,
) => new GuardedArtifactWriter(roleValue, roots);
