export type CheckerDiagnosticSurface = Readonly<{
  hostIndex: number;
  text: string;
  rect: Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}>;

export type CheckerDiagnostics = Readonly<{
  hostCount: number;
  visibleHostCount: number;
  badgeCount: number;
  windowCount: number;
  overlays: number;
  dialogs: number;
  badges: readonly CheckerDiagnosticSurface[];
  windows: readonly CheckerDiagnosticSurface[];
}>;

export type CheckerScreenshotAudit = Readonly<{
  beforeScreenshot: CheckerDiagnostics;
  afterScreenshot: CheckerDiagnostics | null;
}>;

export const scanCheckerDiagnostics = (
  documentRef: Pick<Document, "querySelectorAll">,
  htmlElementConstructor: typeof HTMLElement,
  readStyle: typeof getComputedStyle,
): CheckerDiagnostics => {
  const hosts = Array.from(
    documentRef.querySelectorAll(
      "vite-plugin-checker-error-overlay, #vite-plugin-checker-error-overlay",
    ),
  );
  const visible = (node: Element) => {
    if (!(node instanceof htmlElementConstructor)) {
      return false;
    }
    const rect = node.getBoundingClientRect();
    const style = readStyle(node);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      style.contentVisibility !== "hidden"
    );
  };
  const surface = (
    node: Element,
    hostIndex: number,
  ): CheckerDiagnosticSurface => {
    const rect = node.getBoundingClientRect();
    return {
      hostIndex,
      text: (node.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2_000),
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    };
  };
  const badges: CheckerDiagnosticSurface[] = [];
  const windows: CheckerDiagnosticSurface[] = [];
  hosts.forEach((host, hostIndex) => {
    const root = host.shadowRoot;
    if (!root) {
      return;
    }
    badges.push(
      ...Array.from(root.querySelectorAll(".badge-base"))
        .filter(visible)
        .map((node) => surface(node, hostIndex)),
    );
    windows.push(
      ...Array.from(root.querySelectorAll(".window"))
        .filter(visible)
        .map((node) => surface(node, hostIndex)),
    );
  });
  const dialogs = Array.from(
    documentRef.querySelectorAll("[role='alert']"),
  ).filter(visible).length;
  return {
    hostCount: hosts.length,
    visibleHostCount: hosts.filter(visible).length,
    badgeCount: badges.length,
    windowCount: windows.length,
    overlays: badges.length + windows.length,
    dialogs,
    badges,
    windows,
  };
};

export const checkerDiagnosticsExpression = () =>
  `JSON.stringify((${scanCheckerDiagnostics.toString()})(document, HTMLElement, getComputedStyle))`;

const diagnosticSummary = (diagnostics: CheckerDiagnostics) =>
  [
    ...diagnostics.badges.map((entry) => `badge: ${entry.text || "(empty)"}`),
    ...diagnostics.windows.map((entry) => `window: ${entry.text || "(empty)"}`),
  ].join("; ");

export const checkerFailureMessages = (
  audit: CheckerScreenshotAudit,
): string[] =>
  audit.afterScreenshot?.overlays
    ? [
        `Visible checker diagnostics after screenshot: ${
          audit.afterScreenshot.overlays
        } (${diagnosticSummary(audit.afterScreenshot)})`,
      ]
    : [];

export const captureWithCheckerAudit = async ({
  readDiagnostics,
  capture,
  onAudit,
}: {
  readDiagnostics: () => Promise<CheckerDiagnostics>;
  capture: () => Promise<void>;
  onAudit?: (audit: CheckerScreenshotAudit) => void;
}): Promise<CheckerScreenshotAudit> => {
  const beforeScreenshot = await readDiagnostics();
  let audit: CheckerScreenshotAudit = {
    beforeScreenshot,
    afterScreenshot: null,
  };
  onAudit?.(audit);
  if (beforeScreenshot.overlays > 0) {
    throw new Error(
      `Screenshot refused: visible checker diagnostics: ${
        beforeScreenshot.overlays
      } (${diagnosticSummary(beforeScreenshot)})`,
    );
  }
  await capture();
  const afterScreenshot = await readDiagnostics();
  audit = { beforeScreenshot, afterScreenshot };
  onAudit?.(audit);
  return audit;
};

export const assertCheckerFreeArtifact = (
  checkerOverlays: unknown,
  artifact: "candidate" | "promotion",
) => {
  if (checkerOverlays !== 0) {
    throw new Error(
      `${artifact} refused: checkerOverlays must be exactly 0, received ${String(
        checkerOverlays,
      )}`,
    );
  }
};
