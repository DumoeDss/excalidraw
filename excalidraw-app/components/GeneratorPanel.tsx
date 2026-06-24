import type {
  GeneratorPanelContext,
  GeneratorParam,
} from "@excalidraw/excalidraw";

import "./GeneratorPanel.scss";

import type { ReactElement, ReactNode } from "react";

/**
 * Example host-rendered generator panel, wired via the `renderGeneratorPanel`
 * prop. The library anchors this to the selected generator node and owns the
 * job lifecycle; this component only renders the form.
 *
 * Styling lives in `GeneratorPanel.scss` and is built entirely on Excalidraw's
 * own theme tokens (`--island-bg-color`, `--color-primary`, …) so it tracks
 * light/dark mode automatically. Aesthetic is modelled on tldraw's panels:
 * soft layered shadow, rounded corners, hairline dividers, transparent hover.
 */

// ---- icons (inline, currentColor, no deps) -------------------------------

const icon = (paths: ReactNode): ReactElement => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
);

const ImageIcon = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </>,
);

const AudioIcon = icon(
  <>
    <path d="M9 18V5l10-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="16" cy="16" r="3" />
  </>,
);

const VideoIcon = icon(
  <>
    <rect x="2" y="5" width="14" height="14" rx="3" />
    <path d="M16 10l6-3v10l-6-3z" />
  </>,
);

const WandIcon = icon(
  <>
    <path d="M5 19l9-9" />
    <path d="M14 6l1.5-1.5M19 11l1.5-1.5M17 4l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
  </>,
);

const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
const CloseIcon = icon(<path d="M6 6l12 12M18 6L6 18" />);
const LinkIcon = icon(
  <>
    <path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
    <path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
  </>,
);
const FileIcon = icon(
  <>
    <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
    <path d="M14 3v5h5" />
  </>,
);
const LayersIcon = icon(
  <>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </>,
);
const AlertIcon = icon(
  <>
    <path d="M10.3 4.3L2.5 18a1.7 1.7 0 001.5 2.6h16a1.7 1.7 0 001.5-2.6L13.7 4.3a1.7 1.7 0 00-3 0z" />
    <path d="M12 9v4M12 17h.01" />
  </>,
);

const KIND_ICON: Record<string, ReactElement> = {
  image: ImageIcon,
  audio: AudioIcon,
  video: VideoIcon,
};

const labelFromUrl = (url: string) => {
  if (url.startsWith("data:")) {
    return "inline data";
  }
  if (url.startsWith("blob:")) {
    return "uploaded file";
  }
  const clean = url.split("?")[0].split("#")[0];
  const seg = clean.substring(clean.lastIndexOf("/") + 1);
  return seg || clean;
};

// ---- param control -------------------------------------------------------

const ParamControl = ({
  param,
  value,
  onChange,
}: {
  param: GeneratorParam;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}) => {
  let control: ReactElement;

  switch (param.type) {
    case "select":
      control = (
        <div className="gen-param__control gen-param__control--select">
          <div className="gen-select-wrap">
            <select
              className="gen-input gen-select"
              value={String(value ?? param.default ?? "")}
              onChange={(e) => onChange(e.target.value)}
            >
              {param.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
      break;
    case "number":
      control = (
        <div className="gen-param__control">
          <input
            className="gen-input"
            type="number"
            min={param.min}
            max={param.max}
            step={param.step}
            value={Number(value ?? param.default ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );
      break;
    case "boolean": {
      const checked = Boolean(value ?? param.default);
      control = (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={param.label}
          className={`gen-toggle${checked ? " gen-toggle--on" : ""}`}
          onClick={() => onChange(!checked)}
        >
          <span className="gen-toggle__thumb" />
        </button>
      );
      break;
    }
    case "string":
    default:
      control = (
        <div className="gen-param__control">
          <input
            className="gen-input"
            value={String(value ?? param.default ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
  }

  return (
    <div className="gen-param">
      <span className="gen-param__label">{param.label}</span>
      {control}
    </div>
  );
};

// ---- panel ---------------------------------------------------------------

const STATUS_META: Record<
  string,
  { cls: string; label: string; spinner?: boolean }
> = {
  idle: { cls: "gen-status--ready", label: "Ready" },
  pending: { cls: "gen-status--working", label: "Working", spinner: true },
  done: { cls: "gen-status--done", label: "Done" },
  error: { cls: "gen-status--error", label: "Error" },
};

export const GeneratorPanel = (ctx: GeneratorPanelContext) => {
  const { config, models } = ctx;
  const status = config.state.status;
  const isPending = status === "pending";
  const modelList = Array.isArray(models) ? models : [];
  const currentModel = modelList.find((m) => m.id === config.model);
  const statusMeta = STATUS_META[status] ?? STATUS_META.idle;
  const canGenerate = !!config.model && config.prompt.trim().length > 0;

  return (
    <div className="gen-panel">
      <div className="gen-panel__header">
        <span className="gen-panel__kind-icon">
          {KIND_ICON[config.kind] ?? ImageIcon}
        </span>
        <span className="gen-panel__title">{config.kind} generator</span>
        <span className={`gen-status ${statusMeta.cls}`}>
          {statusMeta.spinner ? (
            <span className="gen-status__spinner" />
          ) : (
            <span className="gen-status__dot" />
          )}
          {statusMeta.label}
        </span>
      </div>

      <div className="gen-panel__body">
        <div className="gen-field">
          <label className="gen-field__label">Prompt</label>
          <textarea
            className="gen-input gen-textarea"
            value={config.prompt}
            placeholder="Describe what you want to generate…"
            onChange={(e) => ctx.setConfig({ prompt: e.target.value })}
            rows={3}
          />
        </div>

        <div className="gen-field">
          <label className="gen-field__label">Model</label>
          <div className="gen-select-wrap">
            <select
              className="gen-input gen-select"
              value={config.model ?? ""}
              onChange={(e) =>
                ctx.setConfig({ model: e.target.value || null, params: {} })
              }
            >
              <option value="">
                {models === "loading"
                  ? "Loading…"
                  : models === "error"
                  ? "Unavailable"
                  : "Select a model…"}
              </option>
              {modelList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentModel?.params && currentModel.params.length > 0 && (
          <div className="gen-field">
            <label className="gen-field__label">Parameters</label>
            <div className="gen-params">
              {currentModel.params.map((p) => (
                <ParamControl
                  key={p.key}
                  param={p}
                  value={config.params[p.key]}
                  onChange={(v) =>
                    ctx.setConfig({ params: { ...config.params, [p.key]: v } })
                  }
                />
              ))}
            </div>
          </div>
        )}

        <div className="gen-field">
          <div className="gen-field__label-row">
            <label className="gen-field__label">References</label>
            <div className="gen-ref-actions">
              <button
                type="button"
                className="gen-btn gen-btn--ghost"
                onClick={() => ctx.addFileRefs()}
              >
                {PlusIcon} File
              </button>
              <button
                type="button"
                className="gen-btn gen-btn--ghost"
                onClick={() => ctx.addSelectionRefs()}
              >
                {PlusIcon} Selection
              </button>
            </div>
          </div>
          {config.refs.length > 0 ? (
            <div className="gen-refs">
              {config.refs.map((r, i) => (
                <span className="gen-ref" key={i}>
                  <span className="gen-ref__icon">
                    {r.type === "element"
                      ? LayersIcon
                      : r.type === "file"
                      ? FileIcon
                      : LinkIcon}
                  </span>
                  <span className="gen-ref__label">
                    {r.type === "element"
                      ? `#${r.elementId.slice(0, 6)}`
                      : labelFromUrl(r.url)}
                  </span>
                  <button
                    type="button"
                    className="gen-ref__remove"
                    aria-label="Remove reference"
                    onClick={() => ctx.removeRef(i)}
                  >
                    {CloseIcon}
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="gen-refs-empty">No references added</div>
          )}
        </div>

        {status === "error" && config.state.status === "error" && (
          <div className="gen-alert">
            {AlertIcon}
            <span>{config.state.message ?? "Generation failed"}</span>
          </div>
        )}
      </div>

      <div className="gen-panel__footer">
        {isPending ? (
          <>
            <span className="gen-progress">
              <span className="gen-spinner" />
              Generating…
            </span>
            <button
              type="button"
              className="gen-btn gen-btn--subtle"
              onClick={() => ctx.cancel()}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="gen-btn gen-btn--primary"
            onClick={() => ctx.generate()}
            disabled={!canGenerate}
            title={
              !config.model
                ? "Select a model first"
                : !config.prompt.trim()
                ? "Enter a prompt first"
                : undefined
            }
          >
            {WandIcon}
            Generate
          </button>
        )}
      </div>
    </div>
  );
};
