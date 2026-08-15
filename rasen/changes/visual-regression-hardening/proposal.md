## Why

The redesigned editor has been implemented and independently inspected across its component changes, but the browser-only facts that protected those changes still live mostly in one-off evidence. The repository has no durable screenshot-comparison gate for real layout, compositing, hit routing, responsive isolation, or visual restoration, leaving the final integrated shell vulnerable to regressions that JSDOM snapshots and manual review alone cannot catch.

## What Changes

- Add one internal, declarative visual-scenario manifest that describes representative editor state, container geometry, theme, direction, safe areas, interaction setup, stable capture regions, semantic assertions, comparison tolerances, performance budgets, and artifact naming.
- Add deterministic browser preparation and capture tooling over the existing real-Chrome path, including fixed fixtures, explicit update versus verify modes, font/layout settling, transient-state suppression, visual-debugger isolation, and reliable cleanup.
- Commit reviewed canonical baselines for an orthogonal matrix spanning desktop, tablet, phone, constrained embed, multi-editor, recovery, selected-element, text-editing, toolbar/menu, sidebar, Library, AI, sharing, and collaboration states.
- Compare retained captures with bounded, documented pixel tolerances while also enforcing DOM/ARIA, geometry, pointer-routing, responsive-profile, theme, and multi-editor isolation assertions; emit expected, current, diff, and machine-readable results on failure.
- Establish repeatable warm performance sampling and branch-derived regression budgets for stable layout, long tasks, shell interactions, resources, and harness runtime without treating unavailable or background-tab metrics as passes.
- Use the final matrix to find and fix targeted accessibility, theme, layout, RTL, responsive, context-freshness, measurement-overflow, and performance defects, then add focused regressions at the owning seam.
- Require implementation and independent-review browser evidence from separate captures and retain the review/fix/delta-review loop before local child delivery.

## Capabilities

### New Capabilities

- `visual-regression-hardening`: Deterministic representative visual scenarios, committed baselines, bounded pixel and semantic comparison, browser-geometry automation, performance budgets, and independent final acceptance for the integrated editor shell.

### Modified Capabilities

<!-- None. This final child verifies and hardens the delivered internal capabilities without redefining their existing specifications. -->

## Impact

- Adds internal test/harness modules, deterministic fixtures, baseline images, focused regression tests, and root scripts needed to capture, compare, update, and report representative browser scenarios.
- Exercises the delivered canvas layout, adaptive toolbar, property surfaces, floating and large surfaces, application content, and responsive-shell seams without replacing their tier, safe-area, direction, context, reservation, adapter, or domain-state authorities.
- Preserves public APIs, host render hooks, tunnels, sidebar contracts, collaboration, import/export, AI, Library, shortcuts, undo/redo, canvas interaction, pointer-neutral wrappers, and leaf-only viewport measurement.
- Baseline updates are explicit and review-only; normal verification never rewrites expected images. Evidence and machine-readable reports stay separate from canonical baselines.
- The principal risks are flaky raster output, over-broad masking, accidental baseline approval, debug-canvas geometry contamination, noisy performance metrics, and a harness that bypasses real product interactions. Deterministic preparation, semantic companion assertions, small tolerances, full editor test harnesses for pointer capability, repeated warm samples, and independent reviewer ownership make each an acceptance requirement.
