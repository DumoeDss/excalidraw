import React from "react";

import {
  FloatingSurfaceHeading,
  FloatingSurfaceSection,
} from "../floatingSurface";

const MenuGroup = ({
  children,
  className = "",
  style,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) => {
  return (
    <FloatingSurfaceSection
      className={`dropdown-menu-group ${className}`}
      style={style}
    >
      {title && (
        <FloatingSurfaceHeading className="dropdown-menu-group-title">
          {title}
        </FloatingSurfaceHeading>
      )}
      {children}
    </FloatingSurfaceSection>
  );
};

export default MenuGroup;
MenuGroup.displayName = "DropdownMenuGroup";
