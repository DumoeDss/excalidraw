import type {
  GeneratorPanelContext,
  GeneratorParam,
} from "@excalidraw/excalidraw";

/**
 * Example host-rendered generator panel, wired via the `renderGeneratorPanel`
 * prop. The library anchors this to the selected generator node and owns the
 * job lifecycle; this component only renders the form.
 */
const ParamControl = ({
  param,
  value,
  onChange,
}: {
  param: GeneratorParam;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}) => {
  switch (param.type) {
    case "select":
      return (
        <label style={{ display: "flex", justifyContent: "space-between" }}>
          {param.label}
          <select
            value={String(value ?? param.default ?? "")}
            onChange={(e) => onChange(e.target.value)}
          >
            {param.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );
    case "number":
      return (
        <label style={{ display: "flex", justifyContent: "space-between" }}>
          {param.label}
          <input
            type="number"
            min={param.min}
            max={param.max}
            step={param.step}
            value={Number(value ?? param.default ?? 0)}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ width: 80 }}
          />
        </label>
      );
    case "boolean":
      return (
        <label style={{ display: "flex", gap: 6 }}>
          <input
            type="checkbox"
            checked={Boolean(value ?? param.default)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {param.label}
        </label>
      );
    case "string":
      return (
        <label style={{ display: "flex", justifyContent: "space-between" }}>
          {param.label}
          <input
            value={String(value ?? param.default ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      );
  }
};

export const GeneratorPanel = (ctx: GeneratorPanelContext) => {
  const { config, models } = ctx;
  const status = config.state.status;
  const isPending = status === "pending";
  const modelList = Array.isArray(models) ? models : [];
  const currentModel = modelList.find((m) => m.id === config.model);

  return (
    <div
      style={{
        width: 280,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontSize: 13,
        color: "var(--text-primary-color)",
      }}
    >
      <div style={{ fontWeight: 600, textTransform: "capitalize" }}>
        {config.kind} generator
      </div>
      <textarea
        value={config.prompt}
        placeholder="Prompt…"
        onChange={(e) => ctx.setConfig({ prompt: e.target.value })}
        rows={3}
        style={{ resize: "vertical", width: "100%", boxSizing: "border-box" }}
      />
      <label style={{ display: "flex", justifyContent: "space-between" }}>
        Model
        <select
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
              : "Select…"}
          </option>
          {modelList.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      {currentModel?.params?.map((p) => (
        <ParamControl
          key={p.key}
          param={p}
          value={config.params[p.key]}
          onChange={(v) =>
            ctx.setConfig({ params: { ...config.params, [p.key]: v } })
          }
        />
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => ctx.addFileRefs()}>+ File ref</button>
        <button onClick={() => ctx.addSelectionRefs()}>+ Selection ref</button>
      </div>
      {config.refs.length > 0 && (
        <div style={{ fontSize: 12, display: "flex", flexDirection: "column" }}>
          {config.refs.map((r, i) => (
            <div
              key={i}
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span>
                {r.type}:{" "}
                {r.type === "element"
                  ? r.elementId.slice(0, 6)
                  : r.url.slice(0, 24)}
              </span>
              <button onClick={() => ctx.removeRef(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
      {status === "error" && (
        <div style={{ color: "crimson" }}>{config.state.message}</div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {isPending ? (
          <button onClick={() => ctx.cancel()}>Cancel</button>
        ) : (
          <button onClick={() => ctx.generate()} disabled={!config.model}>
            Generate
          </button>
        )}
      </div>
    </div>
  );
};
