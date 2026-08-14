export const captureVisualAppOwner = <
  TApp extends { readonly api: unknown; readonly library: unknown },
>(
  app: TApp,
) =>
  // Preserve the exact mount owner before another editor mutates window.h.
  Object.freeze({
    app,
    api: app.api as TApp["api"],
    library: app.library as TApp["library"],
  });
