import React from "react";

import "./AppContent.scss";

type Density = "compact" | "comfortable" | "touch";
type StateKind = "loading" | "empty" | "error" | "fallback";

type AppContentProps = {
  as?: "div" | "section" | "main";
  children: React.ReactNode;
  density?: Density;
  interaction?: "contained" | "neutral";
  label: string;
};

/**
 * Internal presentation vocabulary for application-owned content.
 *
 * Domain adapters continue to own data, state, copy, and actions. Existing
 * floating and large surfaces continue to own framing and lifecycle. This
 * module owns only recurring interior hierarchy, density, state presentation,
 * and bounds derived from the containing editor plus physical safe areas.
 * Keeping these policies together is intentional: deleting this module must
 * require every application adapter to recreate them rather than merely rename
 * a wrapper.
 */
export const AppContent = React.forwardRef<HTMLElement, AppContentProps>(
  (
    {
      as: Component = "section",
      children,
      density = "comfortable",
      interaction = "contained",
      label,
    },
    ref,
  ) => (
    <Component
      aria-label={label}
      className="app-content"
      data-app-content=""
      data-app-content-bounded="true"
      data-app-content-density={density}
      data-app-content-interaction={interaction}
      ref={ref as React.Ref<never>}
    >
      {children}
    </Component>
  ),
);
AppContent.displayName = "AppContent";

export const AppContentSection = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <section className="app-content__section" data-app-content-section="">
    {children}
  </section>
);

export const AppContentHeader = ({
  actions,
  description,
  title,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <header className="app-content__header" data-app-content-header="">
    <div className="app-content__heading-group">
      <div className="app-content__title">{title}</div>
      {description && (
        <div className="app-content__description">{description}</div>
      )}
    </div>
    {actions && <div className="app-content__header-actions">{actions}</div>}
  </header>
);

export const AppContentBody = ({ children }: { children: React.ReactNode }) => (
  <div className="app-content__body" data-app-content-body="">
    {children}
  </div>
);

export const AppContentFooter = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <footer className="app-content__footer" data-app-content-footer="">
    {children}
  </footer>
);

export const AppContentActionGroup = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => (
  <div
    aria-label={label}
    className="app-content__action-group"
    data-app-content-actions=""
    role="group"
  >
    {children}
  </div>
);

export const AppContentState = ({
  actions,
  kind,
  message,
  title,
  visual,
}: {
  actions?: React.ReactNode;
  kind: StateKind;
  message?: React.ReactNode;
  title: React.ReactNode;
  visual?: React.ReactNode;
}) => {
  const titleId = React.useId();

  return (
    <div
      aria-labelledby={titleId}
      className="app-content__state"
      data-app-content-state={kind}
      data-testid={`app-content-state-${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {visual && <div className="app-content__state-visual">{visual}</div>}
      <div className="app-content__state-copy">
        <div className="app-content__state-title" id={titleId}>
          {title}
        </div>
        {message && <div className="app-content__state-message">{message}</div>}
      </div>
      {actions && <div className="app-content__state-actions">{actions}</div>}
    </div>
  );
};
