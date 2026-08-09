import React from "react";

import "./CanvasUiLayout.scss";

export type CanvasUiZone =
  | "topStart"
  | "topCenter"
  | "topEnd"
  | "bottomStart"
  | "bottomCenter"
  | "bottomEnd";

export type CanvasUiZones = Readonly<
  Partial<Record<CanvasUiZone, React.ReactNode>>
>;

type CanvasUiLayoutProps = {
  mode: "desktop" | "phone";
  zones: CanvasUiZones;
  dockedSidebar?: boolean;
};

const ZONES: readonly (readonly [CanvasUiZone, string])[] = [
  ["topStart", "top-start"],
  ["topCenter", "top-center"],
  ["topEnd", "top-end"],
  ["bottomStart", "bottom-start"],
  ["bottomCenter", "bottom-center"],
  ["bottomEnd", "bottom-end"],
] as const;

export const CanvasUiLayout = ({
  mode,
  zones,
  dockedSidebar = false,
}: CanvasUiLayoutProps) => {
  const renderZone = ([zone, hook]: typeof ZONES[number]) => (
    <div
      className={`canvas-ui-layout__zone canvas-ui-layout__zone--${hook}`}
      data-canvas-ui-zone={hook}
      key={zone}
    >
      {zones[zone] == null ? null : (
        <div className="canvas-ui-layout__content">{zones[zone]}</div>
      )}
    </div>
  );

  return (
    <div
      className={`canvas-ui-layout canvas-ui-layout--${mode}${
        mode === "desktop" && dockedSidebar
          ? " canvas-ui-layout--docked-sidebar"
          : ""
      }`}
      data-canvas-ui-layout={mode}
    >
      <div
        className="canvas-ui-layout__row canvas-ui-layout__row--top"
        data-canvas-ui-row="top"
      >
        {ZONES.slice(0, 3).map(renderZone)}
      </div>
      <footer
        className="canvas-ui-layout__row canvas-ui-layout__row--bottom"
        data-canvas-ui-row="bottom"
        role="contentinfo"
      >
        {ZONES.slice(3).map(renderZone)}
      </footer>
    </div>
  );
};
