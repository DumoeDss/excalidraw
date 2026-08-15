import { useEditorInterface } from "../App";

import { Ellipsify } from "../Ellipsify";
import {
  FloatingSurfaceBadge,
  FloatingSurfaceShortcut,
} from "../floatingSurface";

import type { JSX } from "react";

const MenuItemContent = ({
  textStyle,
  icon,
  shortcut,
  children,
  badge,
}: {
  icon?: JSX.Element;
  shortcut?: string;
  textStyle?: React.CSSProperties;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) => {
  const editorInterface = useEditorInterface();
  return (
    <>
      {icon && <div className="dropdown-menu-item__icon">{icon}</div>}
      <div style={textStyle} className="dropdown-menu-item__text">
        <Ellipsify>{children}</Ellipsify>
      </div>
      {badge && (
        <FloatingSurfaceBadge className="dropdown-menu-item__badge">
          {badge}
        </FloatingSurfaceBadge>
      )}
      {shortcut && editorInterface.formFactor !== "phone" && (
        <FloatingSurfaceShortcut className="dropdown-menu-item__shortcut">
          {shortcut}
        </FloatingSurfaceShortcut>
      )}
    </>
  );
};
export default MenuItemContent;
