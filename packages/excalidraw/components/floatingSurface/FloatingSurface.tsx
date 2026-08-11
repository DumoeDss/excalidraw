import clsx from "clsx";
import React from "react";
import { Slot } from "radix-ui";

import "./FloatingSurface.scss";

import type { FloatingSurfaceDensity, FloatingSurfaceKind } from "./policy";

type FrameProps = React.HTMLAttributes<HTMLDivElement> & {
  kind: FloatingSurfaceKind;
  density: FloatingSurfaceDensity;
  tone?: "default" | "elevated";
};

export const FloatingSurfaceFrame = React.forwardRef<
  HTMLDivElement,
  FrameProps
>(({ children, className, density, kind, tone = "default", ...rest }, ref) => (
  <div
    {...rest}
    className={clsx("floating-surface", className)}
    data-floating-surface
    data-surface-density={density}
    data-surface-kind={kind}
    data-surface-tone={tone}
    ref={ref}
  >
    {children}
  </div>
));
FloatingSurfaceFrame.displayName = "FloatingSurfaceFrame";

export const FloatingSurfaceSection = ({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...rest} className={clsx("floating-surface__section", className)} />
);

export const FloatingSurfaceHeading = ({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...rest} className={clsx("floating-surface__heading", className)} />
);

export const FloatingSurfaceSeparator = ({
  className,
  role = "separator",
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    {...rest}
    className={clsx("floating-surface__separator", className)}
    role={role}
  />
);

type ItemVisualProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
  checked?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  open?: boolean;
  selected?: boolean;
};

export const FloatingSurfaceItemVisual = React.forwardRef<
  HTMLElement,
  ItemVisualProps
>(
  (
    {
      asChild = false,
      checked = false,
      children,
      className,
      destructive = false,
      disabled = false,
      highlighted = false,
      open = false,
      selected = false,
      ...rest
    },
    ref,
  ) => {
    const Component = asChild ? Slot.Root : "div";
    return (
      <Component
        {...rest}
        className={clsx("floating-surface__item", className)}
        data-checked={checked || undefined}
        data-destructive={destructive || undefined}
        data-disabled={disabled || undefined}
        data-highlighted={highlighted || undefined}
        data-open={open || undefined}
        data-selected={selected || undefined}
        ref={ref as React.Ref<never>}
      >
        {children}
      </Component>
    );
  },
);
FloatingSurfaceItemVisual.displayName = "FloatingSurfaceItemVisual";

export const FloatingSurfaceScrollViewport = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => (
  <div
    {...rest}
    className={clsx("floating-surface__scroll-viewport", className)}
    ref={ref}
  />
));
FloatingSurfaceScrollViewport.displayName = "FloatingSurfaceScrollViewport";

const createCarrier =
  (className: string) =>
  ({
    className: callerClassName,
    ...rest
  }: React.HTMLAttributes<HTMLSpanElement>) =>
    <span {...rest} className={clsx(className, callerClassName)} />;

export const FloatingSurfaceShortcut = createCarrier(
  "floating-surface__shortcut",
);
export const FloatingSurfaceBadge = createCarrier("floating-surface__badge");
export const FloatingSurfaceCheck = createCarrier("floating-surface__check");
export const FloatingSurfaceChevron = createCarrier(
  "floating-surface__chevron",
);
