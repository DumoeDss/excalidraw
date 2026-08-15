import { FloatingSurfaceHeading } from "../floatingSurface";

import type { ReactNode } from "react";

const PickerHeading = ({ children }: { children: ReactNode }) => (
  <FloatingSurfaceHeading className="color-picker__heading">
    {children}
  </FloatingSurfaceHeading>
);

export default PickerHeading;
