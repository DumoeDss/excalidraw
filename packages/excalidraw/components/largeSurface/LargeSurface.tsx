import clsx from "clsx";
import React from "react";

import "./LargeSurface.scss";

import type {
  LargeSurfaceDensity,
  LargeSurfaceKind,
  LargeSurfacePresentation,
} from "./types";

type FrameProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  kind: LargeSurfaceKind;
  presentation: LargeSurfacePresentation;
  density: LargeSurfaceDensity;
  elevation: "flat" | "raised" | "modal";
  header?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
};

export const LargeSurfaceFrame = React.forwardRef<HTMLDivElement, FrameProps>(
  (
    {
      children,
      className,
      density,
      description,
      elevation,
      footer,
      header,
      kind,
      presentation,
      ...rest
    },
    ref,
  ) => (
    <div
      {...rest}
      className={clsx("large-surface", className)}
      data-large-surface
      data-large-surface-kind={kind}
      data-large-surface-presentation={presentation}
      data-large-surface-density={density}
      data-large-surface-elevation={elevation}
      ref={ref}
    >
      {(header || description) && (
        <header className="large-surface__header" data-large-surface-header>
          {header}
          {description && (
            <div className="large-surface__description">{description}</div>
          )}
        </header>
      )}
      <div className="large-surface__content" data-large-surface-content>
        {children}
      </div>
      {footer && (
        <footer className="large-surface__footer" data-large-surface-footer>
          {footer}
        </footer>
      )}
    </div>
  ),
);
LargeSurfaceFrame.displayName = "LargeSurfaceFrame";

export const LargeSurfaceSection = ({
  className,
  ...rest
}: React.HTMLAttributes<HTMLElement>) => (
  <section {...rest} className={clsx("large-surface__section", className)} />
);

export const LargeSurfaceDivider = ({
  className,
  role = "separator",
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    {...rest}
    className={clsx("large-surface__divider", className)}
    role={role}
  />
);

export const LargeSurfaceActionGroup = ({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...rest} className={clsx("large-surface__action-group", className)} />
);
