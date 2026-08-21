import { useEffect, useRef, useState } from "react";

import type {
  GeneratorModel,
  GeneratorPanelContext,
} from "@excalidraw/excalidraw";

import "./GeneratorPanel.scss";

import type { ReactElement, ReactNode } from "react";

const icon = (paths: ReactNode): ReactElement => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
);

const ImageIcon = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="8.5" cy="9" r="1.5" />
    <path d="m5 18 5-5 3.5 3.5 2.5-2.5 3 3" />
  </>,
);
const VideoIcon = icon(
  <>
    <rect x="3" y="5" width="14" height="14" rx="3" />
    <path d="m10 9 4 3-4 3V9Z" />
    <path d="m17 10 4-2v8l-4-2" />
  </>,
);
const AudioIcon = icon(
  <>
    <path d="M8 18V6l9-2v12" />
    <circle cx="5.5" cy="18" r="2.5" />
    <circle cx="14.5" cy="16" r="2.5" />
  </>,
);
const UploadIcon = icon(
  <>
    <path d="M12 16V4" />
    <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
  </>,
);
const ChevronIcon = icon(<path d="m8 10 4 4 4-4" />);
const CheckIcon = icon(<path d="m5 12 4 4L19 6" />);
const LightningIcon = icon(<path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />);
const CameraIcon = icon(
  <>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="m16 10 5-3v10l-5-3" />
  </>,
);
const ReferenceIcon = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="m7 15 3-3 2.5 2.5L15 12l2 2" />
  </>,
);
const EditIcon = icon(
  <>
    <path d="M12 20h9" />
    <path d="m16.5 3.5 4 4L9 19l-5 1 1-5L16.5 3.5Z" />
  </>,
);
const FrameIcon = icon(
  <>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M9 4v16" />
  </>,
);
const ModelBarsIcon = icon(
  <>
    <path d="M4 19V10M8 16V5M12 20V11M16 15V7M20 18V4" />
  </>,
);
const BananaIcon = icon(
  <path d="M5 5c1 8 6 12 14 12-3 4-10 4-14-1C1 11 2 6 5 5Z" />,
);
const SparkModelIcon = icon(
  <>
    <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
    <circle cx="18.5" cy="5.5" r="1.5" />
  </>,
);

const IMAGE_ASPECT_RATIOS = [
  "21:9",
  "16:9",
  "3:2",
  "4:3",
  "5:4",
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "9:16",
];

const DETAILED_IMAGE_ASPECT_RATIOS = [
  "1:1",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "9:16",
  "1:1(2k)",
  "16:9(2k)",
  "9:16(2k)",
  "16:9(4k)",
  "9:16(4k)",
  "auto",
];

const VIDEO_ASPECT_RATIOS = [
  "Auto",
  "16:9",
  "4:3",
  "1:1",
  "3:4",
  "9:16",
  "21:9",
];

const numberParam = (
  params: GeneratorPanelContext["config"]["params"],
  key: string,
  fallback: number,
) => {
  const value = params[key];
  return typeof value === "number" ? value : fallback;
};

const stringParam = (
  params: GeneratorPanelContext["config"]["params"],
  key: string,
  fallback: string,
) => {
  const value = params[key];
  return typeof value === "string" ? value : fallback;
};

const booleanParam = (
  params: GeneratorPanelContext["config"]["params"],
  key: string,
  fallback: boolean,
) => {
  const value = params[key];
  return typeof value === "boolean" ? value : fallback;
};

const AspectIcon = ({ ratio }: { ratio: string }) => (
  <span
    className={`gen-aspect-icon gen-aspect-icon--${ratio
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`}
    aria-hidden="true"
  />
);

const getModelIcon = (kind: "image" | "video" | "audio", id: string) => {
  if (kind === "video") {
    return ModelBarsIcon;
  }
  if (id.startsWith("nano-banana")) {
    return BananaIcon;
  }
  if (id.startsWith("gpt-image") || id.startsWith("luma")) {
    return SparkModelIcon;
  }
  return ImageIcon;
};

const ModelMenu = ({
  kind,
  models,
  selectedId,
  onSelect,
}: {
  kind: "image" | "video" | "audio";
  models: GeneratorModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) => (
  <div className="gen-popover-surface gen-model-menu" role="listbox">
    {models.length ? (
      models.map((model) => {
        const selected = model.id === selectedId;
        return (
          <button
            type="button"
            role="option"
            aria-selected={selected}
            className={`gen-model-option${
              selected ? " gen-model-option--selected" : ""
            }`}
            key={model.id}
            onClick={() => onSelect(model.id)}
          >
            <span className="gen-model-option__icon">
              {getModelIcon(kind, model.id)}
            </span>
            <span className="gen-model-option__label">{model.label}</span>
            {kind === "video" && (
              <span className="gen-model-option__premium">会员专属</span>
            )}
            {selected && (
              <span className="gen-model-option__check">{CheckIcon}</span>
            )}
          </button>
        );
      })
    ) : (
      <div className="gen-popover-empty">暂无可用模型</div>
    )}
  </div>
);

export const GeneratorPanel = (ctx: GeneratorPanelContext) => {
  const { config } = ctx;
  const panelRef = useRef<HTMLDivElement>(null);
  const [openPopover, setOpenPopover] = useState<
    "settings" | "models" | "references" | null
  >(null);
  const modelList = Array.isArray(ctx.models) ? ctx.models : [];
  const fallbackModel = modelList[0] ?? null;
  const selectedModel =
    modelList.find((model) => model.id === config.model) ?? fallbackModel;
  const kind = config.kind === "video" ? "video" : "image";
  const isVideo = kind === "video";
  const usesDetailedImageSettings =
    !isVideo && selectedModel?.id === "gpt-image-2";
  const isPending = config.state.status === "pending";
  const canGenerate = Boolean(selectedModel && config.prompt.trim());
  const ratio = stringParam(
    config.params,
    "aspectRatio",
    isVideo ? "Auto" : "16:9",
  );
  const imageQuality = stringParam(
    config.params,
    "quality",
    usesDetailedImageSettings ? "中" : "1K",
  );
  const imageWidth = numberParam(config.params, "width", 1456);
  const imageHeight = numberParam(config.params, "height", 816);
  const duration = numberParam(config.params, "duration", 5);
  const resolution = stringParam(config.params, "resolution", "720p");
  const includeAudio = booleanParam(config.params, "audio", true);
  const webSearch = booleanParam(config.params, "webSearch", false);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !panelRef.current?.contains(event.target)
      ) {
        setOpenPopover(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPopover(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const setParam = (key: string, value: string | number | boolean) => {
    ctx.setConfig({ params: { ...config.params, [key]: value } });
  };

  const selectModel = (id: string) => {
    const nextUsesDetailedSettings = id === "gpt-image-2";
    ctx.setConfig({
      model: id,
      params: isVideo
        ? config.params
        : {
            ...config.params,
            quality: nextUsesDetailedSettings ? "中" : "1K",
            width: 1456,
            height: 816,
            aspectRatio: "16:9",
          },
    });
    setOpenPopover(null);
  };

  const imageSettingsSummary = usesDetailedImageSettings
    ? `${imageQuality} · ${imageWidth}×${imageHeight} · 1张`
    : `${ratio} · ${imageQuality}`;

  const submit = () => {
    if (!selectedModel || !config.prompt.trim()) {
      return;
    }
    if (!config.model) {
      ctx.setConfig({ model: selectedModel.id });
    }
    ctx.generate();
  };

  const toggle = (popover: typeof openPopover) => {
    setOpenPopover((current) => (current === popover ? null : popover));
  };

  return (
    <div
      ref={panelRef}
      className={`gen-panel gen-panel--${kind}`}
      data-testid={`generator-panel-${kind}`}
    >
      {isVideo ? (
        <>
          <div className="gen-video-notice">
            <span>角色素材需通过素材库审核后方可使用</span>
            <button
              type="button"
              className="gen-upload-button"
              onClick={() => void ctx.addFileRefs()}
            >
              {UploadIcon}
              上传
            </button>
          </div>
          <div className="gen-media-types" aria-label="Reference media types">
            {[
              ["视频", VideoIcon],
              ["图片", ImageIcon],
              ["音频", AudioIcon],
            ].map(([label, mediaIcon]) => (
              <button
                type="button"
                className="gen-media-type"
                key={label as string}
                onClick={() => void ctx.addFileRefs()}
              >
                <span>{mediaIcon}</span>
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="gen-image-reference-row">
          <button
            type="button"
            className="gen-image-upload"
            onClick={() => void ctx.addFileRefs()}
          >
            <span>{ImageIcon}</span>
            <strong>
              {config.refs.length ? `已添加 ${config.refs.length}` : "参考图"}
            </strong>
          </button>
          {config.refs.length > 0 && (
            <div className="gen-reference-chips">
              {config.refs.slice(0, 3).map((reference, index) => (
                <span className="gen-reference-chip" key={index}>
                  {reference.type === "element" ? "画布选区" : "参考文件"}
                  <button
                    type="button"
                    aria-label="移除参考图"
                    onClick={() => ctx.removeRef(index)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <textarea
        className="gen-prompt"
        value={config.prompt}
        rows={2}
        aria-label={`${kind} prompt`}
        placeholder="今天我们要创作什么"
        onChange={(event) => ctx.setConfig({ prompt: event.target.value })}
      />

      {config.state.status === "error" && (
        <div className="gen-error" role="alert">
          {config.state.message ?? "生成失败"}
        </div>
      )}

      <div className="gen-footer">
        {isVideo && (
          <div className="gen-popover-anchor">
            <button
              type="button"
              className={`gen-footer-control${
                openPopover === "references"
                  ? " gen-footer-control--active"
                  : ""
              }`}
              aria-haspopup="menu"
              aria-expanded={openPopover === "references"}
              onClick={() => toggle("references")}
            >
              {ReferenceIcon}
              <span>参考图/视频</span>
              {ChevronIcon}
            </button>
            {openPopover === "references" && (
              <div
                className="gen-popover-surface gen-reference-menu"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void ctx.addFileRefs()}
                >
                  {ReferenceIcon}
                  <span>参考图/视频</span>
                  {CheckIcon}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => ctx.addSelectionRefs()}
                >
                  {EditIcon}
                  <span>视频编辑</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void ctx.addFileRefs()}
                >
                  {FrameIcon}
                  <span>首尾帧</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="gen-popover-anchor">
          <button
            type="button"
            className={`gen-footer-control${
              openPopover === "settings" ? " gen-footer-control--active" : ""
            }`}
            aria-haspopup="dialog"
            aria-expanded={openPopover === "settings"}
            onClick={() => toggle("settings")}
          >
            <span>
              {isVideo
                ? `${ratio} · ${duration}s · ${resolution}`
                : imageSettingsSummary}
            </span>
            {ChevronIcon}
          </button>
          {openPopover === "settings" && (
            <div
              className={`gen-popover-surface gen-settings-menu gen-settings-menu--${kind}`}
              role="dialog"
              aria-label={`${kind} settings`}
            >
              <div className="gen-settings-title">
                {isVideo ? "视频设置" : "图像设置"}
              </div>

              {!isVideo && (
                <>
                  <div className="gen-settings-label">
                    {usesDetailedImageSettings ? "质量" : "分辨率"}
                  </div>
                  <div
                    className={`gen-segmented${
                      usesDetailedImageSettings ? " gen-segmented--quality" : ""
                    }`}
                  >
                    {(usesDetailedImageSettings
                      ? ["自动", "高", "中", "低"]
                      : ["1K", "2K", "4K"]
                    ).map((quality) => (
                      <button
                        type="button"
                        className={
                          imageQuality === quality ? "is-selected" : ""
                        }
                        key={quality}
                        onClick={() => setParam("quality", quality)}
                      >
                        {quality}
                      </button>
                    ))}
                  </div>

                  {usesDetailedImageSettings && (
                    <>
                      <div className="gen-settings-label gen-settings-label--with-info">
                        尺寸 <span aria-hidden="true">ⓘ</span>
                      </div>
                      <div className="gen-size-fields">
                        <label>
                          <span>W</span>
                          <input
                            aria-label="宽度"
                            type="number"
                            value={imageWidth}
                            onChange={(event) =>
                              setParam("width", Number(event.target.value))
                            }
                          />
                        </label>
                        <span>↕</span>
                        <label>
                          <span>H</span>
                          <input
                            aria-label="高度"
                            type="number"
                            value={imageHeight}
                            onChange={(event) =>
                              setParam("height", Number(event.target.value))
                            }
                          />
                        </label>
                      </div>
                    </>
                  )}

                  <div className="gen-settings-label gen-settings-label--with-info">
                    宽高比 <span aria-hidden="true">ⓘ</span>
                  </div>
                  <div className="gen-aspect-grid">
                    {(usesDetailedImageSettings
                      ? DETAILED_IMAGE_ASPECT_RATIOS
                      : IMAGE_ASPECT_RATIOS
                    ).map((item) => (
                      <button
                        type="button"
                        className={ratio === item ? "is-selected" : ""}
                        key={item}
                        onClick={() => setParam("aspectRatio", item)}
                      >
                        <AspectIcon ratio={item} />
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {isVideo && (
                <>
                  <div className="gen-settings-label">宽高比</div>
                  <div className="gen-aspect-grid">
                    {VIDEO_ASPECT_RATIOS.map((item) => (
                      <button
                        type="button"
                        className={ratio === item ? "is-selected" : ""}
                        key={item}
                        onClick={() => setParam("aspectRatio", item)}
                      >
                        <AspectIcon ratio={item} />
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                  <label className="gen-duration">
                    <span>
                      <strong>时长</strong>
                      <small>{duration}s</small>
                    </span>
                    <input
                      type="range"
                      min="3"
                      max="12"
                      step="1"
                      value={duration}
                      onChange={(event) =>
                        setParam("duration", Number(event.target.value))
                      }
                    />
                  </label>
                  <div className="gen-settings-label">分辨率</div>
                  <div className="gen-resolution-options">
                    {["480p", "720p", "1080p"].map((item) => (
                      <button
                        type="button"
                        className={resolution === item ? "is-selected" : ""}
                        key={item}
                        onClick={() => setParam("resolution", item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  {[
                    ["音频", "audio", includeAudio],
                    ["网络搜索", "webSearch", webSearch],
                  ].map(([label, key, checked]) => (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked as boolean}
                      className="gen-switch-row"
                      key={key as string}
                      onClick={() =>
                        setParam(key as string, !(checked as boolean))
                      }
                    >
                      <span>{label}</span>
                      <span className={`gen-switch${checked ? " is-on" : ""}`}>
                        <span />
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {isVideo && (
          <button
            type="button"
            className="gen-icon-control"
            aria-label="摄像机设置"
          >
            {CameraIcon}
          </button>
        )}

        <div className="gen-footer-spacer" />

        <div className="gen-popover-anchor gen-model-anchor">
          <button
            type="button"
            className={`gen-footer-control gen-model-trigger${
              openPopover === "models" ? " gen-footer-control--active" : ""
            }`}
            aria-haspopup="listbox"
            aria-expanded={openPopover === "models"}
            onClick={() => toggle("models")}
          >
            {selectedModel
              ? getModelIcon(kind, selectedModel.id)
              : isVideo
              ? ModelBarsIcon
              : ImageIcon}
            <span>{selectedModel?.label ?? "选择模型"}</span>
            {ChevronIcon}
          </button>
          {openPopover === "models" && (
            <ModelMenu
              kind={kind}
              models={modelList}
              selectedId={selectedModel?.id ?? null}
              onSelect={selectModel}
            />
          )}
        </div>

        <button
          type="button"
          className="gen-generate"
          disabled={!canGenerate && !isPending}
          onClick={isPending ? () => ctx.cancel() : submit}
        >
          {LightningIcon}
          <span>
            {isPending
              ? "取消"
              : isVideo
              ? "175"
              : selectedModel?.id === "gpt-image-2"
              ? "8"
              : "0"}
          </span>
        </button>
      </div>
    </div>
  );
};
