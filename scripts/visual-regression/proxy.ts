import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type {
  VisualGeometry,
  VisualInputCapabilities,
  VisualInputProfile,
  VisualPerformanceSample,
} from "./types";

const DEFAULT_PROXY_URL = "http://127.0.0.1:3456";
const PROXY_REQUEST_TIMEOUT_MS = 30_000;
const TARGET_ACTIVATION_TIMEOUT_MS = 10_000;
const TARGET_ACTIVATION_RETRY_MS = 40;
const TRUSTED_KEY_DISPATCH_ATTEMPTS = 3;
const TRUSTED_KEY_RECEIPT_TIMEOUT_MS = 750;
const execFileAsync = promisify(execFile);

type CdpCommand = Readonly<{
  method: string;
  params?: Readonly<Record<string, unknown>>;
}>;

type ChromeTargetInfo = Readonly<{
  targetId: string;
  parentId?: string;
}>;

export const ownedAuxiliaryTargetIds = (
  targets: readonly ChromeTargetInfo[],
  ownerTargetId: string,
) => {
  const owned = new Set([ownerTargetId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const target of targets) {
      if (
        !owned.has(target.targetId) &&
        target.parentId &&
        owned.has(target.parentId)
      ) {
        owned.add(target.targetId);
        changed = true;
      }
    }
  }
  owned.delete(ownerTargetId);
  return [...owned];
};

export type TargetCdpPort = Readonly<{
  attach: (targetId: string) => Promise<void>;
  send: (targetId: string, command: CdpCommand) => Promise<void>;
  detach: (targetId: string) => Promise<void>;
  dispose: () => Promise<void>;
}>;

const mediaFeaturesForInputProfile = (profile: VisualInputProfile) => [
  { name: "pointer", value: profile.pointer },
  { name: "any-pointer", value: profile.pointer },
  { name: "hover", value: profile.hover ? "hover" : "none" },
  { name: "any-hover", value: profile.hover ? "hover" : "none" },
];

export const inputProfileCdpCommands = (
  profile: VisualInputProfile,
): readonly CdpCommand[] => [
  ...(typeof profile.touchPoints === "number"
    ? [
        {
          method: "Emulation.setTouchEmulationEnabled",
          params: { enabled: true, maxTouchPoints: profile.touchPoints },
        },
      ]
    : []),
  {
    method: "Emulation.setEmulatedMedia",
    params: { media: "", features: mediaFeaturesForInputProfile(profile) },
  },
];

export const clearInputProfileCdpCommands = (
  profile: VisualInputProfile,
): readonly CdpCommand[] => [
  {
    method: "Emulation.setEmulatedMedia",
    params: { media: "", features: [] },
  },
  ...(typeof profile.touchPoints === "number"
    ? [
        {
          method: "Emulation.setTouchEmulationEnabled",
          params: { enabled: false },
        },
      ]
    : []),
];

export const restoreInputCapabilitiesCdpCommands = (
  prior: VisualInputCapabilities,
): readonly CdpCommand[] => [
  {
    method: "Emulation.setTouchEmulationEnabled",
    params:
      prior.touchPoints > 0
        ? { enabled: true, maxTouchPoints: prior.touchPoints }
        : { enabled: false },
  },
  {
    method: "Emulation.setEmulatedMedia",
    params: {
      media: "",
      features: [
        { name: "pointer", value: prior.pointer },
        { name: "any-pointer", value: prior.pointer },
        { name: "hover", value: prior.hover ? "hover" : "none" },
        { name: "any-hover", value: prior.hover ? "hover" : "none" },
      ],
    },
  },
];

export const assertInputCapabilities = (
  expected: Pick<VisualInputCapabilities, "pointer" | "hover" | "touchPoints">,
  actual: VisualInputCapabilities,
  context: string,
) => {
  if (
    actual.pointer !== expected.pointer ||
    actual.hover !== expected.hover ||
    actual.touchPoints !== expected.touchPoints
  ) {
    throw new Error(
      `${context}: expected ${JSON.stringify(
        expected,
      )}, received ${JSON.stringify(actual)}`,
    );
  }
};

const WINDOWS_TRUSTED_INPUT_SOURCE = String.raw`
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class VisualTrustedInput {
  private delegate bool EnumWindowsProc(IntPtr handle, IntPtr parameter);

  [DllImport("user32.dll")]
  private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr parameter);
  [DllImport("user32.dll")]
  private static extern bool IsWindowVisible(IntPtr handle);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  private static extern int GetWindowText(IntPtr handle, StringBuilder text, int length);
  [DllImport("user32.dll")]
  private static extern int GetWindowTextLength(IntPtr handle);
  [DllImport("user32.dll")]
  private static extern uint GetWindowThreadProcessId(IntPtr handle, out uint processId);
  [DllImport("user32.dll")]
  private static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")]
  private static extern bool SetForegroundWindow(IntPtr handle);
  [DllImport("user32.dll")]
  private static extern bool BringWindowToTop(IntPtr handle);
  [DllImport("user32.dll")]
  private static extern bool ShowWindowAsync(IntPtr handle, int command);
  [DllImport("user32.dll")]
  private static extern IntPtr SetActiveWindow(IntPtr handle);
  [DllImport("user32.dll")]
  private static extern IntPtr SetFocus(IntPtr handle);
  [DllImport("user32.dll")]
  private static extern void SwitchToThisWindow(IntPtr handle, bool altTab);
  [DllImport("kernel32.dll")]
  private static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")]
  private static extern bool AttachThreadInput(uint first, uint second, bool attach);
  private static IntPtr FindChromeWindow(string marker) {
    IntPtr result = IntPtr.Zero;
    EnumWindows((handle, parameter) => {
      if (!IsWindowVisible(handle)) return true;
      int length = GetWindowTextLength(handle);
      if (length == 0) return true;
      var title = new StringBuilder(length + 1);
      GetWindowText(handle, title, title.Capacity);
      if (!title.ToString().Contains(marker)) return true;
      uint processId;
      GetWindowThreadProcessId(handle, out processId);
      try {
        if (!Process.GetProcessById((int)processId).ProcessName.Equals("chrome", StringComparison.OrdinalIgnoreCase)) return true;
      } catch {
        return true;
      }
      result = handle;
      return false;
    }, IntPtr.Zero);
    return result;
  }

  public static long Activate(string marker) {
    IntPtr target = IntPtr.Zero;
    for (int attempt = 0; attempt < 30 && target == IntPtr.Zero; attempt++) {
      target = FindChromeWindow(marker);
      if (target == IntPtr.Zero) Thread.Sleep(50);
    }
    if (target == IntPtr.Zero) throw new InvalidOperationException("Exact Chrome target window was not found");

    ShowWindowAsync(target, 9);
    IntPtr foreground = GetForegroundWindow();
    uint foregroundProcess;
    uint targetProcess;
    uint foregroundThread = GetWindowThreadProcessId(foreground, out foregroundProcess);
    uint targetThread = GetWindowThreadProcessId(target, out targetProcess);
    uint currentThread = GetCurrentThreadId();
    bool attachedForeground = foregroundThread != 0 && targetThread != 0 && foregroundThread != targetThread && AttachThreadInput(foregroundThread, targetThread, true);
    bool attachedCurrent = currentThread != 0 && targetThread != 0 && currentThread != targetThread && AttachThreadInput(currentThread, targetThread, true);
    try {
      BringWindowToTop(target);
      SetActiveWindow(target);
      SetFocus(target);
      SetForegroundWindow(target);
      SwitchToThisWindow(target, true);
    } finally {
      if (attachedCurrent) AttachThreadInput(currentThread, targetThread, false);
      if (attachedForeground) AttachThreadInput(foregroundThread, targetThread, false);
    }
    for (int attempt = 0; attempt < 20 && GetForegroundWindow() != target; attempt++) {
      SwitchToThisWindow(target, true);
      Thread.Sleep(50);
    }
    if (GetForegroundWindow() != target) throw new InvalidOperationException("Exact Chrome target window is not foreground");

    return target.ToInt64();
  }
}
`;

const trustedKeyDefinition = (key: string) => {
  switch (key) {
    case "Escape":
      return { code: "Escape", virtualKeyCode: 0x1b };
    case "ArrowLeft":
      return { code: "ArrowLeft", virtualKeyCode: 0x25 };
    case "Tab":
      return { code: "Tab", virtualKeyCode: 0x09 };
    default:
      throw new Error(`Unsupported trusted key: ${key}`);
  }
};

export const trustedKeyCdpCommands = (key: string): readonly CdpCommand[] => {
  const definition = trustedKeyDefinition(key);
  const params = {
    key,
    code: definition.code,
    windowsVirtualKeyCode: definition.virtualKeyCode,
    nativeVirtualKeyCode: definition.virtualKeyCode,
    modifiers: 0,
    autoRepeat: false,
    isKeypad: false,
  };
  return [
    {
      method: "Input.dispatchKeyEvent",
      params: { ...params, type: "keyDown" },
    },
    { method: "Input.dispatchKeyEvent", params: { ...params, type: "keyUp" } },
  ];
};

type ProxyTarget = {
  targetId: string;
  type?: string;
  title?: string;
  url?: string;
};

const readJson = async <T>(response: Response, context: string): Promise<T> => {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${context} failed (${response.status}): ${body}`);
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`${context} returned invalid JSON`);
  }
};

export const findChromeMetadata = async () => {
  const candidates = [
    path.join(
      process.env.LOCALAPPDATA ?? "",
      "Google",
      "Chrome",
      "User Data",
      "DevToolsActivePort",
    ),
    path.join(
      process.env.LOCALAPPDATA ?? "",
      "Chromium",
      "User Data",
      "DevToolsActivePort",
    ),
  ];
  let debuggingPort: number | null = null;
  let webSocketPath: string | null = null;
  for (const candidate of candidates) {
    if (!candidate.startsWith(path.parse(candidate).root)) {
      continue;
    }
    try {
      const [rawPort, rawWebSocketPath] = (await readFile(candidate, "utf8"))
        .trim()
        .split(/\r?\n/);
      const port = Number(rawPort);
      if (Number.isInteger(port) && port > 0 && port < 65536) {
        debuggingPort = port;
        webSocketPath = rawWebSocketPath || null;
        break;
      }
    } catch {
      // Continue to the supported fixed-port fallback.
    }
  }
  debuggingPort ??= 9222;
  return {
    browser: "Chrome",
    debuggingPort,
    platform: `${os.platform()}-${os.arch()}-${os.release()}`,
    node: process.version,
    webSocketUrl: webSocketPath
      ? `ws://127.0.0.1:${debuggingPort}${webSocketPath}`
      : `ws://127.0.0.1:${debuggingPort}/devtools/browser`,
  };
};

export class ChromeProxyAdapter {
  readonly baseUrl: string;
  private readonly inputCdp: TargetCdpPort;
  private readonly priorInputCapabilities = new Map<
    string,
    Readonly<{
      prior: VisualInputCapabilities;
      profile: VisualInputProfile;
    }>
  >();

  constructor(
    baseUrl = process.env.VISUAL_PROXY_URL ?? DEFAULT_PROXY_URL,
    inputCdp?: TargetCdpPort,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.inputCdp = inputCdp ?? new ChromeInspectTargetCdpPort(this);
  }

  private url(
    endpoint: string,
    query: Record<string, string | number | boolean | undefined> = {},
  ) {
    const result = new URL(endpoint, `${this.baseUrl}/`);
    for (const [key, value] of Object.entries(query)) {
      if (value != null) {
        result.searchParams.set(key, String(value));
      }
    }
    return result;
  }

  private async get<T>(
    endpoint: string,
    query?: Record<string, string | number | boolean | undefined>,
  ) {
    const url = this.url(endpoint, query);
    const target = url.searchParams.get("target") ?? "none";
    const started = performance.now();
    try {
      return readJson<T>(
        await fetch(url, {
          signal: AbortSignal.timeout(PROXY_REQUEST_TIMEOUT_MS),
        }),
        `GET /${endpoint} target=${target}`,
      );
    } catch (error) {
      const elapsed = Math.round(performance.now() - started);
      throw new Error(
        `Chrome proxy GET /${endpoint} target=${target} failed after ${elapsed}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }
  }

  private async post<T>(
    endpoint: string,
    targetId: string,
    body: string,
    query: Record<string, string | number | boolean | undefined> = {},
  ) {
    const url = this.url(endpoint, { target: targetId, ...query });
    const started = performance.now();
    try {
      return readJson<T>(
        await fetch(url, {
          method: "POST",
          body,
          headers: { "content-type": "text/plain; charset=utf-8" },
          signal: AbortSignal.timeout(PROXY_REQUEST_TIMEOUT_MS),
        }),
        `POST /${endpoint} target=${targetId}`,
      );
    } catch (error) {
      const elapsed = Math.round(performance.now() - started);
      throw new Error(
        `Chrome proxy POST /${endpoint} target=${targetId} failed after ${elapsed}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }
  }

  async preflight() {
    const health = await this.get<{
      status: string;
      connected: boolean;
      chromePort: number;
      managedTabs: number;
    }>("health");
    if (health.status !== "ok" || !health.connected || !health.chromePort) {
      throw new Error("The documented Chrome proxy is not connected");
    }
    const targets = await this.targets();
    const metadata = await findChromeMetadata();
    return { health, targets: targets.length, metadata };
  }

  targets() {
    return this.get<ProxyTarget[]>("targets");
  }

  async createTarget(url = "about:blank") {
    const created = await this.get<{ targetId: string }>("new", { url });
    if (!created.targetId) {
      throw new Error("Proxy did not return a fresh target id");
    }
    return created.targetId;
  }

  setViewport(targetId: string, geometry: VisualGeometry) {
    return this.get<{ applied: VisualGeometry }>("viewport", {
      target: targetId,
      width: geometry.width,
      height: geometry.height,
      scale: geometry.deviceScaleFactor,
      mobile: geometry.mobile,
    });
  }

  inputCapabilities(targetId: string) {
    return this.evaluate<VisualInputCapabilities>(
      targetId,
      `(() => ({
        pointer: matchMedia("(pointer: coarse)").matches ? "coarse" : matchMedia("(pointer: fine)").matches ? "fine" : "none",
        hover: matchMedia("(hover: hover)").matches,
        touchPoints: navigator.maxTouchPoints,
      }))()`,
    );
  }

  async applyInputProfile(targetId: string, profile: VisualInputProfile) {
    if (this.priorInputCapabilities.has(targetId)) {
      throw new Error(`Input profile is already active for ${targetId}`);
    }
    const prior = await this.inputCapabilities(targetId);
    const expected: VisualInputCapabilities = {
      pointer: profile.pointer,
      hover: profile.hover,
      touchPoints:
        typeof profile.touchPoints === "number"
          ? profile.touchPoints
          : prior.touchPoints,
    };
    let attached = false;
    try {
      await this.inputCdp.attach(targetId);
      attached = true;
      for (const command of inputProfileCdpCommands(profile)) {
        await this.inputCdp.send(targetId, command);
      }
      const actual = await this.inputCapabilities(targetId);
      assertInputCapabilities(
        expected,
        actual,
        "Browser input profile mismatch",
      );
      this.priorInputCapabilities.set(targetId, { prior, profile });
      return { prior, requested: profile, expected, actual };
    } catch (error) {
      try {
        if (attached) {
          for (const command of restoreInputCapabilitiesCdpCommands(prior)) {
            await this.inputCdp.send(targetId, command);
          }
        }
      } finally {
        if (attached) {
          await this.inputCdp.detach(targetId);
        }
        await this.inputCdp.dispose();
      }
      throw error;
    }
  }

  async clearInputProfile(targetId: string) {
    const active = this.priorInputCapabilities.get(targetId);
    if (!active) {
      throw new Error(`Input profile is not active for ${targetId}`);
    }
    let afterRestoreCommands: VisualInputCapabilities | null = null;
    try {
      for (const command of restoreInputCapabilitiesCdpCommands(active.prior)) {
        await this.inputCdp.send(targetId, command);
      }
      afterRestoreCommands = await this.inputCapabilities(targetId);
      return {
        prior: active.prior,
        afterRestoreCommands,
      };
    } finally {
      this.priorInputCapabilities.delete(targetId);
      await this.inputCdp.detach(targetId);
      await this.inputCdp.dispose();
    }
  }

  async disposeInputProfiles() {
    this.priorInputCapabilities.clear();
    await this.inputCdp.dispose();
  }

  navigate(targetId: string, url: string) {
    return this.get("navigate", { target: targetId, url, hard_reload: true });
  }

  private async activateChromeWindow(marker: string) {
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "$ProgressPreference = 'SilentlyContinue'",
      "$source = @'",
      WINDOWS_TRUSTED_INPUT_SOURCE,
      "'@",
      "Add-Type -TypeDefinition $source",
      `[VisualTrustedInput]::Activate('${marker}')`,
    ].join("\r\n");
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    try {
      const { stdout } = await execFileAsync(
        "powershell.exe",
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-OutputFormat",
          "Text",
          "-EncodedCommand",
          encoded,
        ],
        { windowsHide: true, timeout: 8000, encoding: "utf8" },
      );
      return stdout.trim();
    } catch (error: any) {
      const detail = String(error?.stderr ?? error?.message ?? error)
        .replace(/\s+/g, " ")
        .slice(-800);
      throw new Error(`Exact Chrome target activation failed: ${detail}`);
    }
  }

  async activateTarget(targetId: string) {
    const marker = `visual-activate-${process.pid}-${Date.now()}-${Math.round(
      performance.now(),
    )}`;
    const priorTitle = await this.evaluate<string>(
      targetId,
      `(() => {
        const priorTitle = document.title;
        document.title = ${JSON.stringify(marker)};
        return priorTitle;
      })()`,
    );
    const timeoutAt = performance.now() + TARGET_ACTIVATION_TIMEOUT_MS;
    let observation: { visibility: string; focused: boolean } | null = null;
    let windowHandle: string | null = null;
    let lastWindowActivationError: string | null = null;
    try {
      do {
        await this.inputCdp.send(targetId, { method: "Page.bringToFront" });
        if (process.platform === "win32") {
          try {
            windowHandle = await this.activateChromeWindow(marker);
          } catch (error) {
            lastWindowActivationError =
              error instanceof Error ? error.message : String(error);
            await new Promise((resolve) =>
              setTimeout(resolve, TARGET_ACTIVATION_RETRY_MS),
            );
            continue;
          }
        }
        observation = await this.evaluate<{
          visibility: string;
          focused: boolean;
        }>(
          targetId,
          `({
            visibility: document.visibilityState,
            focused: document.hasFocus(),
          })`,
        );
        if (observation.visibility === "visible" && observation.focused) {
          return {
            targetId,
            activated: true as const,
            windowHandle,
            observation,
          };
        }
        await new Promise((resolve) =>
          setTimeout(resolve, TARGET_ACTIVATION_RETRY_MS),
        );
      } while (performance.now() < timeoutAt);
      throw new Error(
        `Exact browser target did not become active within ${TARGET_ACTIVATION_TIMEOUT_MS}ms: ${JSON.stringify(
          observation,
        )}${
          lastWindowActivationError
            ? `; last window activation error: ${lastWindowActivationError}`
            : ""
        }`,
      );
    } finally {
      await this.evaluate(
        targetId,
        `document.title = ${JSON.stringify(priorTitle)}`,
      );
    }
  }

  evaluate<T>(targetId: string, expression: string) {
    return this.post<{ value?: T; error?: string }>(
      "eval",
      targetId,
      expression,
    ).then((result) => {
      if (result.error) {
        throw new Error(result.error);
      }
      return result.value as T;
    });
  }

  async evaluateJson<T>(targetId: string, expression: string) {
    const serialized = await this.evaluate<string>(targetId, expression);
    if (typeof serialized !== "string") {
      throw new Error(
        `Chrome evaluation did not return serialized JSON: ${JSON.stringify(
          serialized,
        )}`,
      );
    }
    let parsed: T & { __visualError?: string; stack?: string | null };
    try {
      parsed = JSON.parse(serialized) as typeof parsed;
    } catch (error) {
      throw new Error("Chrome evaluation returned invalid serialized JSON", {
        cause: error,
      });
    }
    if (parsed?.__visualError) {
      throw new Error(
        `Chrome evaluation failed: ${parsed.__visualError}${
          parsed.stack ? `\n${parsed.stack}` : ""
        }`,
      );
    }
    return parsed;
  }

  snapshot(targetId: string) {
    return this.get<{ elements: unknown[] }>("snapshot", {
      target: targetId,
      mode: "C",
    });
  }

  enableConsole(targetId: string) {
    return this.get("console/enable", { target: targetId });
  }

  clearConsole(targetId: string) {
    return this.get("console/clear", { target: targetId });
  }

  console(targetId: string, level?: string, since?: number) {
    return this.get<{ events?: unknown[] } | unknown[]>("console", {
      target: targetId,
      level,
      since,
    });
  }

  clickAt(
    targetId: string,
    selector: string,
    options: { nth?: number; text?: string } = {},
  ) {
    return this.post<{ clicked: boolean; x: number; y: number }>(
      "clickAt",
      targetId,
      selector,
      {
        visible: true,
        nth: options.nth,
        text: options.text,
      },
    );
  }

  async trustedKey(targetId: string, key: string) {
    const commands = trustedKeyCdpCommands(key);
    const prepared = await this.evaluate<{
      visibility: string;
      focused: boolean;
    }>(
      targetId,
      `(() => {
        const expected = ${JSON.stringify(key)};
        const expectedCode = ${JSON.stringify(trustedKeyDefinition(key).code)};
        const listener = (event) => {
          const receipt = {
            key: event.key,
            code: event.code,
            isTrusted: event.isTrusted,
            visibility: document.visibilityState,
            focused: document.hasFocus(),
          };
          if (event.key === expected && event.code === expectedCode) {
            window.__visualTrustedKeyProbe.observed = receipt;
            if (
              receipt.isTrusted === true &&
              receipt.visibility === "visible" &&
              receipt.focused
            ) {
              return;
            }
          }
          window.__visualTrustedKeyProbe.unexpected.push(receipt);
          event.preventDefault();
          event.stopImmediatePropagation();
        };
        window.__visualTrustedKeyProbe = { expected, expectedCode, observed: null, unexpected: [], listener };
        window.addEventListener("keydown", listener, { capture: true });
        return { visibility: document.visibilityState, focused: document.hasFocus() };
      })()`,
    );
    try {
      type TrustedKeyObservation = {
        key: string;
        code: string;
        isTrusted: boolean;
        visibility: string;
        focused: boolean;
      };
      const rejected: Array<TrustedKeyObservation | null> = [];
      for (
        let attempt = 0;
        attempt < TRUSTED_KEY_DISPATCH_ATTEMPTS;
        attempt += 1
      ) {
        const activation = await this.activateTarget(targetId);
        for (const command of commands) {
          await this.inputCdp.send(targetId, command);
        }
        const timeoutAt = performance.now() + TRUSTED_KEY_RECEIPT_TIMEOUT_MS;
        let observation: TrustedKeyObservation | null = null;
        do {
          observation = await this.evaluate<TrustedKeyObservation | null>(
            targetId,
            "window.__visualTrustedKeyProbe?.observed ?? null",
          );
          if (observation) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 40));
        } while (performance.now() < timeoutAt);
        if (
          observation?.key === key &&
          observation.code === trustedKeyDefinition(key).code &&
          observation.isTrusted === true &&
          observation.visibility === "visible" &&
          observation.focused
        ) {
          return {
            key,
            trusted: true,
            source: "browser-cdp",
            targetId,
            activation,
            prepared,
            observation,
          };
        }
        rejected.push(observation);
        if (attempt + 1 < TRUSTED_KEY_DISPATCH_ATTEMPTS) {
          await this.evaluate(
            targetId,
            "window.__visualTrustedKeyProbe.observed = null",
          );
        }
      }
      throw new Error(
        `Exact-target trusted keyboard verification failed after ${TRUSTED_KEY_DISPATCH_ATTEMPTS} attempts: ${JSON.stringify(
          rejected,
        )}`,
      );
    } finally {
      await this.evaluate(
        targetId,
        `(() => {
          const probe = window.__visualTrustedKeyProbe;
          if (probe?.listener) window.removeEventListener("keydown", probe.listener, { capture: true });
          delete window.__visualTrustedKeyProbe;
        })()`,
      );
    }
  }

  screenshot(targetId: string, file: string) {
    return this.get<{ saved?: string; bytes?: number }>("screenshot", {
      target: targetId,
      file,
      format: "png",
      full: false,
      retries: 2,
    });
  }

  async performance(
    targetId: string,
    activate = true,
  ): Promise<VisualPerformanceSample & Record<string, unknown>> {
    const started = performance.now();
    const metric = await this.get<any>("perf", { target: targetId, activate });
    const longTasks = Array.isArray(metric.longTasks?.tasks)
      ? metric.longTasks.tasks
      : [];
    return {
      ...metric,
      postSettleCls: typeof metric.cls === "number" ? metric.cls : null,
      longTaskDuration: longTasks.length
        ? Math.max(
            ...longTasks.map((entry: any) =>
              Number(entry.duration ?? entry.dur ?? 0),
            ),
          )
        : 0,
      interactionDuration: null,
      resourceCount:
        typeof metric.resources?.count === "number"
          ? metric.resources.count
          : null,
      transferBytes:
        typeof metric.resources?.transferBytes === "number"
          ? metric.resources.transferBytes
          : null,
      harnessDuration: performance.now() - started,
    };
  }

  async closeTarget(targetId: string) {
    const url = this.url("close", { target: targetId });
    const response = await fetch(url, {
      signal: AbortSignal.timeout(PROXY_REQUEST_TIMEOUT_MS),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(
        `GET /close target=${targetId} returned ${response.status}: ${body}`,
      );
    }
    return body
      ? (JSON.parse(body) as { success?: boolean })
      : { success: true };
  }

  async assertTargetsAbsent(targetIds: readonly string[]) {
    const timeoutAt = performance.now() + 2500;
    let leaked = [...targetIds];
    do {
      const open = new Set(
        (await this.targets()).map((target) => target.targetId),
      );
      leaked = targetIds.filter((targetId) => open.has(targetId));
      if (!leaked.length) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    } while (performance.now() < timeoutAt);
    if (leaked.length) {
      throw new Error(
        `Disposable Chrome targets remained after bounded close verification: ${leaked.join(
          ", ",
        )}`,
      );
    }
  }
}

type InspectCdpSession = Readonly<{
  devtoolsTargetId: string;
  sessionId: string;
}>;

class ChromeInspectTargetCdpPort implements TargetCdpPort {
  private readonly sessions = new Map<string, InspectCdpSession>();

  constructor(private readonly proxy: ChromeProxyAdapter) {}

  private async waitFor<T>(
    read: () => Promise<T | null>,
    context: string,
    timeoutMs = 10_000,
  ) {
    const timeoutAt = performance.now() + timeoutMs;
    do {
      const value = await read();
      if (value != null) {
        return value;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    } while (performance.now() < timeoutAt);
    throw new Error(`${context} timed out`);
  }

  private async sendWithResult(targetId: string, command: CdpCommand) {
    const session = this.sessions.get(targetId);
    if (!session) {
      throw new Error(`Chrome CDP target is not attached: ${targetId}`);
    }
    const response = await this.proxy.evaluate<{
      error: { code?: number; message?: string } | null;
      result: Record<string, unknown> | null;
    }>(
      session.devtoolsTargetId,
      `await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ error: { message: "CDP command callback timed out" }, result: null }), ${PROXY_REQUEST_TIMEOUT_MS});
        ProtocolClient.test.sendRawMessage(
          ${JSON.stringify(command.method)},
          ${JSON.stringify(command.params ?? {})},
          (error, result) => {
            clearTimeout(timeout);
            resolve({ error: error ?? null, result: result ?? null });
          },
          ${JSON.stringify(session.sessionId)}
        );
      })`,
    );
    if (response?.error) {
      throw new Error(
        `Chrome CDP command failed (${response.error.code ?? "unknown"}): ${
          response.error.message ?? "unknown error"
        }`,
      );
    }
    return response?.result ?? {};
  }

  async attach(targetId: string) {
    if (this.sessions.has(targetId)) {
      throw new Error(`Chrome CDP target already attached: ${targetId}`);
    }
    const marker = `visual-input-${targetId}`;
    const previousTitle = await this.proxy.evaluate<string>(
      targetId,
      "document.title",
    );
    const targetsBefore = new Set(
      (await this.proxy.targets()).map((target) => target.targetId),
    );
    let inspectTargetId: string | null = null;
    let devtoolsTargetId: string | null = null;
    try {
      await this.proxy.evaluate(
        targetId,
        `document.title = ${JSON.stringify(marker)}`,
      );
      inspectTargetId = await this.proxy.createTarget(
        "chrome://inspect/#pages",
      );
      await this.waitFor(async () => {
        const clicked = await this.proxy.evaluate<boolean>(
          inspectTargetId!,
          `(() => {
              const row = [...document.querySelectorAll(".row")].find((node) => node.textContent?.includes(${JSON.stringify(
                marker,
              )}));
              const inspect = row && [...row.querySelectorAll(".action")].find((node) => node.textContent?.trim() === "inspect");
              if (!inspect) return false;
              inspect.click();
              return true;
            })()`,
        );
        return clicked ? true : null;
      }, `Chrome inspect action for ${targetId}`);
      devtoolsTargetId = await this.waitFor(async () => {
        const targets = (await this.proxy.targets()).filter(
          (candidate) =>
            !targetsBefore.has(candidate.targetId) &&
            candidate.targetId !== inspectTargetId &&
            candidate.url?.startsWith("devtools://devtools/"),
        );
        if (targets.length > 1) {
          throw new Error(
            `Chrome inspect action created multiple DevTools targets: ${targets
              .map((target) => target.targetId)
              .join(", ")}`,
          );
        }
        return targets[0]?.targetId ?? null;
      }, `Chrome DevTools target for ${targetId}`);
      const sessionId = await this.proxy.evaluate<string>(
        devtoolsTargetId,
        `await (async () => {
          const SDK = await import("devtools://devtools/bundled/core/sdk/sdk.js");
          const timeoutAt = performance.now() + 10000;
          while (performance.now() < timeoutAt) {
            const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
            if (target?.sessionId) return target.sessionId;
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          throw new Error("Inspected page session did not become ready");
        })()`,
      );
      if (!sessionId) {
        throw new Error(
          `Chrome inspected-page session is absent for ${targetId}`,
        );
      }
      this.sessions.set(targetId, { devtoolsTargetId, sessionId });
      const probe = (await this.sendWithResult(targetId, {
        method: "Runtime.evaluate",
        params: { expression: "document.title", returnByValue: true },
      })) as { result?: { value?: unknown } };
      if (probe.result?.value !== marker) {
        throw new Error(
          `Chrome DevTools attached the wrong target: ${JSON.stringify(probe)}`,
        );
      }
    } catch (error) {
      this.sessions.delete(targetId);
      if (devtoolsTargetId) {
        await this.proxy.closeTarget(devtoolsTargetId).catch(() => undefined);
      }
      throw error;
    } finally {
      await this.proxy
        .evaluate(targetId, `document.title = ${JSON.stringify(previousTitle)}`)
        .catch(() => undefined);
      if (inspectTargetId) {
        await this.proxy.closeTarget(inspectTargetId).catch(() => undefined);
        await this.proxy
          .assertTargetsAbsent([inspectTargetId])
          .catch(() => undefined);
      }
    }
  }

  async send(targetId: string, command: CdpCommand) {
    await this.sendWithResult(targetId, command);
  }

  async detach(targetId: string) {
    const session = this.sessions.get(targetId);
    if (!session) {
      return;
    }
    const failures: string[] = [];
    try {
      const inventory = (await this.sendWithResult(targetId, {
        method: "Target.getTargets",
      })) as { targetInfos?: ChromeTargetInfo[] };
      const auxiliaryTargetIds = ownedAuxiliaryTargetIds(
        inventory.targetInfos ?? [],
        session.devtoolsTargetId,
      );
      for (const auxiliaryTargetId of auxiliaryTargetIds) {
        try {
          await this.proxy.closeTarget(auxiliaryTargetId);
        } catch (error) {
          failures.push(
            `auxiliary ${auxiliaryTargetId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    } catch (error) {
      failures.push(
        `auxiliary discovery: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    try {
      await this.proxy.closeTarget(session.devtoolsTargetId);
      await this.proxy.assertTargetsAbsent([session.devtoolsTargetId]);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      this.sessions.delete(targetId);
    }
    if (failures.length) {
      throw new Error(
        `Chrome CDP helper target disposal failed: ${failures.join("; ")}`,
      );
    }
  }

  async dispose() {
    const failures: string[] = [];
    for (const targetId of [...this.sessions.keys()]) {
      try {
        await this.detach(targetId);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    if (failures.length) {
      throw new Error(
        `Chrome CDP helper target disposal failed: ${failures.join("; ")}`,
      );
    }
  }
}

export type ChromeProxyPort = Pick<
  ChromeProxyAdapter,
  | "preflight"
  | "targets"
  | "createTarget"
  | "setViewport"
  | "inputCapabilities"
  | "applyInputProfile"
  | "clearInputProfile"
  | "disposeInputProfiles"
  | "navigate"
  | "activateTarget"
  | "evaluate"
  | "evaluateJson"
  | "snapshot"
  | "enableConsole"
  | "clearConsole"
  | "console"
  | "clickAt"
  | "trustedKey"
  | "screenshot"
  | "performance"
  | "closeTarget"
  | "assertTargetsAbsent"
>;
