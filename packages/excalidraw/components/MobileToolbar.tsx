import { useStylesPanelMode } from "./App";
import { AdaptiveEditorToolbar } from "./AdaptiveEditorToolbar";

import type { AppClassProperties, UIAppState } from "../types";

type MobileToolbarProps = {
  app: AppClassProperties;
  setAppState: React.Component<any, UIAppState>["setState"];
};

export const MobileToolbar = ({ app, setAppState }: MobileToolbarProps) => {
  const isFullStylesPanel = useStylesPanelMode() === "full";
  return (
    <AdaptiveEditorToolbar
      app={app}
      activeTool={app.state.activeTool}
      setAppState={setAppState}
      UIOptions={app.props.UIOptions}
      isFullStylesPanel={isFullStylesPanel}
      variant="phone"
    />
  );
};
