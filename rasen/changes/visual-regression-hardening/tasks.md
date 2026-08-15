## 1. Harness boundaries and dependency setup

- [x] 1.1 Inventory the existing Vitest configurations, mounted editor fixtures, development-only editor access, Chrome proxy capabilities, baseline-ignore rules, and package scripts; record the chosen internal module, fixture, baseline, result, and evidence paths before editing product code.
- [x] 1.2 Select and pin only the narrowly scoped development dependency needed for PNG decode/diff if native or existing repository capabilities are insufficient; audit its license and keep it out of runtime packages, public exports, and application bundles without adding a second browser framework.
- [x] 1.3 Add a Node-environment visual-verification configuration and explicit verify/update scripts while preserving the existing JSDOM suite and ensuring normal verify mode has no baseline write path.
- [x] 1.4 Add the internal visual-regression directory structure and test-only entry points without widening `LayerUIProps`, package barrels, public APIs, host hooks, tunnels, sidebar contracts, or application domain interfaces.
- [x] 1.5 Add a dependency/preflight check for the documented Chrome/proxy endpoints and supported browser/environment metadata; fail before target creation or baseline writes when a required capability is unavailable, and never stop or replace the sticky proxy.
- [x] 1.6 Add focused tests that prove the visual runner is absent from production/public bundles, update and verify commands are distinct, and baseline/result/evidence paths cannot escape their declared roots.

## 2. Scenario manifest and deterministic fixtures

- [x] 2.1 Define the typed scenario, geometry, input profile, capture region, semantic assertion, mask, comparison, performance budget, and artifact metadata interfaces plus `defineVisualScenarios()` validation.
- [x] 2.2 Add manifest tests for duplicate ids/stems, invalid dimensions or DPR, unsafe paths, absent semantic assertions, unbounded masks, undeclared setup/action adapters, and performance gates without a branch-derived budget source.
- [x] 2.3 Create fixed scene fixtures for default/welcome, selected rectangle, selected text, and active text editing using stable ids, seeds, nonces, versions, coordinates, copy, and update values.
- [x] 2.4 Create local application fixture adapters for Library, AI, sharing, collaboration, loading, recoverable error, top-level recovery, and multi-editor states without remote network, clock, random, or persisted-user dependence.
- [x] 2.5 Create named interaction adapters for real visible toolbar, property, menu/submenu, context surface, dialog/Help, docked/overlay sidebar, and application-content controls; seed only prerequisites and use trusted browser input for the acceptance action.
- [x] 2.6 Add a manual replay renderer/checklist that consumes the same manifest identities, setup steps, assertions, regions, and artifact stems as automated verification and supports distinct implementer/reviewer roles.
- [x] 2.7 Add deterministic filename generation that encodes scenario id, geometry, theme, editor-root direction, and state while allowing role/run suffixes only for noncanonical evidence and results.
- [x] 2.8 Test repeated fixture creation, manifest ordering, scenario filtering, and filename generation for byte-stable identities and identical output across fresh processes.

## 3. Browser adapter, settling, and cleanup

- [x] 3.1 Implement the existing-proxy browser adapter for dependency check, fresh target creation, viewport-before-navigation, activation, evaluation, semantic snapshot, screenshot, trusted keyboard/click input, performance capture, console queries, target close, and final absence confirmation.
- [x] 3.2 Add a development/test-only scenario host adapter around existing editor/application APIs and stable hooks; verify it is unavailable in production and does not become a public imperative API.
- [x] 3.3 Implement scoped preparation for storage reset, fixed fixture installation, viewport/DPR, locale, theme, editor-root direction, physical safe areas, input profile, focus, console buffer, and transient portal/queue cleanup.
- [x] 3.4 Inject test-only no-motion and transient-state controls for animations, transitions, smooth scrolling, caret/selection blink, cursor, timestamps, avatars, toasts, and badges only when they are not the declared subject.
- [x] 3.5 Implement semantic readiness that waits for required font faces, local resource quiescence, scenario hooks, microtasks, at least two stable animation frames, and identical consecutive geometry signatures; report last observations on timeout instead of using a fixed sleep.
- [x] 3.6 开发 visual debugger 的固定尺寸 canvas 会污染根 `scrollWidth`，产品几何取证应暂时禁用并在结束后恢复原设置。
- [x] 3.7 Implement a LIFO restore stack for debugger state, storage, locale, media/input emulation, physical safe areas, clock, injected styles, console capture, and focus; run it before target close in every success/failure path and report cleanup failures alongside the primary result.
- [x] 3.8 Add adapter lifecycle tests for setup failure, assertion failure, capture failure, restore failure, target-close failure, and final enumeration while proving the sticky proxy is never terminated.

## 4. Comparator, baseline policy, and reports

- [x] 4.1 Implement semantic editor/fixture-root crop resolution and record editor-relative plus target coordinates; reject uncontrolled browser-chrome captures and missing or ambiguous crop roots.
- [x] 4.2 Implement PNG dimension validation and bounded pixel comparison with documented color/antialias tolerance, changed bounding boxes, bounded semantic masks, and rejection of whole interactive-surface masks or blanket thresholds.
- [x] 4.3 Emit expected, current, high-visibility diff, mismatch count/ratio, changed bounds, mask count/ratio, image hashes, environment metadata, semantic failures, cleanup state, and per-scenario pass/fail/inconclusive status in machine-readable results.
- [x] 4.4 Add comparator tests for exact match, dimension mismatch, edge antialias variance, threshold breach, bounded masks, excessive masks, corrupt PNGs, and deterministic diff/report output.
- [x] 4.5 Define the canonical baseline metadata schema for scenario, filename, dimensions, DPR, crop, browser/platform, font/fixture version, comparison policy, hash, budget source, and approval classification; validate metadata against images and the manifest.
- [x] 4.6 Implement verify-mode read-only enforcement so missing or changed baselines fail without any canonical write, and add tests that compare pre/post baseline directory hashes.
- [x] 4.7 Implement update mode to write semantically passing candidates outside the canonical directory, refuse dirty/unsupported/inconclusive scenarios, and require explicit personally inspected classification before promotion.
- [x] 4.8 Add audit/tests proving earlier child screenshots cannot be promoted by copy or counted as current implementer/reviewer evidence and reviewer paths cannot overwrite canonical or implementer artifacts.

## 5. Representative scenario matrix and canonical baselines

- [x] 5.1 Define and stabilize `1440×900` light/LTR desktop scenarios covering the welcome/default shell, selected rectangle/property state, active text editing with stabilized caret/focus, and one toolbar overflow or group-menu state.
- [x] 5.2 Define and stabilize `1440×900` dark/RTL desktop scenarios covering one main-menu/submenu or context surface, docked and overlay sidebar presentations, and logical placement/isolation assertions.
- [x] 5.3 Define and stabilize representative desktop application-content scenarios for Library, AI, share, and collaboration while preserving their existing domain actions, async owners, roles, and information architecture.
- [x] 5.4 Define and stabilize tablet scenarios at `1024×768` dark/RTL with Library/sidebar and `768×1024` light/LTR with compact property rail and a representative inward surface.
- [x] 5.5 Define and stabilize phone scenarios at `375×812` light/LTR with Library/property/tool surfaces and `812×375` dark/RTL short landscape; accept touch/pen density only after the declared full harness or proven browser capability is observed.
- [x] 5.6 Define and stabilize the `640×480` dark/RTL constrained-embed scenario with asymmetric physical safe areas and Help or another large surface, including bounded internal scrolling and reachable actions.
- [x] 5.7 Define and stabilize a simultaneous multi-editor fixture with different bounds, themes, directions, profiles, focus/surface owners, and update/unmount sequences per editor.
- [x] 5.8 Define and stabilize narrow recovery/loading/error scenarios that cover the editor-owned states and the top-level recovery owner without assuming editor context is available.
- [x] 5.9 Run repeated candidate captures until deterministic, open and personally inspect every candidate, classify every difference, approve canonical baselines explicitly, and record baseline hashes/metadata without reusing prior change evidence.

## 6. Semantic, accessibility, layout, and responsive hardening

- [x] 6.1 Implement reusable assertions for roles, accessible names/descriptions, expanded/selected/checked/disabled states, live regions, current focus, visible focus style, focus containment/return, background isolation, and connected owner cleanup.
- [x] 6.2 Implement computed-color/contrast assertions for representative normal text, controls, selected, focus, destructive, disabled, loading, and error states in light/dark themes, with measured ratios and inputs in failures.
- [x] 6.3 Implement geometry assertions for container/leaf/surface rectangles, safe-area clearances, bounded scroll, touch-target size, clipping, overlap, reachability, editor-root horizontal overflow, and marker ownership on persistent leaves only.
- [x] 6.4 Implement physical-routing assertions that pair `elementFromPoint` with trusted full-control/full-row coordinate clicks and trusted outside canvas input while keeping layout/portal wrappers pointer-neutral.
- [x] 6.5 Automate the accepted-known toolbar gap: short-height collision, left/center/right final-row hits, adjacent-action shielding, Escape/outside close, focus and visual restoration, unmount cleanup, and a blank shell point that reaches canvas.
- [x] 6.6 隐藏的固有宽度 measurement rail 必须在拥有它的 toolbar Island 上隔离溢出，不能通过缩小 target 或破坏测量宽度解决。
- [x] 6.7 简化 DOM PointerEvent 不足以模拟完整 React/editor pointer 契约；pen/touch latch 应使用完整测试 harness，不能把失败探测冒充浏览器成功证据。
- [x] 6.8 Mutable context payloads need an explicit React-render signal when semantic identity changes independently of state geometry; root attributes are not a substitute for provider freshness.
- [x] 6.9 Existing public hooks that read a deepened private context must state their legacy return type explicitly, while internal consumers use a separate non-barrel accessor.
- [x] 6.10 Directional CSS for multi-editor pages must anchor to the editor instance root; document-root selectors silently couple otherwise isolated editors.
- [x] 6.11 Run the representative matrix, fix every in-scope accessibility/theme/layout/RTL/responsive/context/measurement/pointer finding at its smallest existing owning seam, and add one focused Vitest or targeted visual regression for each product fix.
- [x] 6.12 Re-run affected scenarios plus adjacency risks after each fix and require semantic assertions and bounded pixel comparison to agree rather than weakening tolerances or masks.

## 7. Repeated performance gates

- [x] 7.1 Implement target-activated performance collection that separates cold navigation/readiness diagnostics from post-settle steady-state setup and interaction observation windows.
- [x] 7.2 Add one warm-up plus at least three accepted samples per budgeted scenario, preserve individual samples, and compute deterministic medians for post-settle CLS, long tasks, shell/profile updates, surface interactions, resources/transfer, and harness duration as declared.
- [x] 7.3 Calibrate initial budgets from the accepted branch on the supported environment with a modest documented allowance; store the baseline source and avoid inventing universal cross-machine paint limits.
- [x] 7.4 Treat required null/unavailable metrics as inconclusive failures and diagnostic metrics as unavailable, with explicit reporting for background/noisy paint observations rather than zero or pass.
- [x] 7.5 Run performance scenarios, fix evidence-backed product or harness regressions at the owning seam, add focused timing/behavior coverage where stable, and repeat sampling until medians satisfy the recorded budgets.

## 8. Implementer verification and evidence

- [x] 8.1 Run focused tests for manifest/fixtures, comparator/masks/reports, baseline write protection, browser cleanup, semantic/contrast/geometry helpers, responsive context/public types, toolbar pointer coverage, and every targeted product fix.
- [x] 8.2 Run the complete implementer manifest in fresh disposable targets and retain at least one implementer-owned screenshot for every required matrix scenario plus separate current/diff/report artifacts for every failure.
- [x] 8.3 Personally open and inspect every retained implementer image, record per-file dimensions/hashes and observed hierarchy/clipping/focus/theme state, and do not infer image facts from DOM rectangles alone.
- [x] 8.4 Record implementation semantic, trusted-hit, marker, responsive, multi-editor, debugger-restoration, performance-sample, error-console, checker/overlay, and target-cleanup evidence in the implementation evidence directory.
- [x] 8.5 Run `yarn build:excalidraw` before `yarn test:typecheck` against one recorded source fingerprint, then run the visual verify command again if the build/type gates changed any relevant source or generated input.
- [x] 8.6 Require zero unexpected error-level console events, checker messages, visible unexpected overlays, missing baselines, canonical writes, inconclusive required metrics, and leaked targets in the accepted implementer run.

## 9. Independent review only

- [x] 9.1 Dispatch a non-author reviewer with the proposal, design, specification, tasks, implementation diff, canonical baseline metadata, and manifest but no authority to reuse implementation screenshots as proof or edit product code during the review pass.
- [x] 9.2 Have the reviewer run the same required manifest through fresh personally owned targets and separate reviewer output paths, retain at least one reviewer-owned screenshot for every required matrix scenario, and include independent semantic queries, trusted interactions, warm performance samples, console/checker capture, and target cleanup.
- [x] 9.3 Require the reviewer to open and personally inspect every retained reviewer image, record file hashes and machine-readable results, and explicitly compare the observed visual hierarchy, accessibility, layout, RTL, responsive, and application-content states.
- [x] 9.4 Require a severity-tagged review report that distinguishes product regression, deterministic harness/environment drift, legitimate intentional visual change, and unsupported/inconclusive evidence, including a clean report when no findings remain.
- [x] 9.5 Fail evidence validation if any reviewer acceptance path references an implementer screenshot/result as its own capture, writes a canonical baseline, leaves a target open, or omits a required scenario/image inspection.

## 10. Fixer and delta re-review only

- [x] 10.1 If review finds an issue, assign a non-reviewer fixer to change only the owning product or harness seam, add the smallest regression that would have caught it, and record a focused delta report without self-certifying closure.
- [x] 10.2 For product defects, preserve responsive tiers, physical safe-area/direction policy, context/public types, marker/pointer neutrality, domain actions, public APIs, and baseline governance; for harness drift, repair setup/readiness/environment policy without approving drift as product output.
- [x] 10.3 Have the original or another non-author reviewer repeat the affected scenarios plus adjacency risks with fresh reviewer-owned captures/samples, personally inspect every retained delta image, and issue an explicit finding-by-finding disposition.
- [x] 10.4 Repeat the capped fix/re-review loop until clean; escalate unresolved material findings with evidence rather than inflating tolerance, widening masks, weakening assertions, accepting inconclusive metrics, or declaring the change complete.

## 11. Final audits and local-only delivery

- [x] 11.1 Validate strict UTF-8 decoding with no BOM, U+FFFD, or known mojibake signatures for source/config/docs; parse every changed JSON/YAML file; and validate every baseline/current/diff PNG signature and metadata/hash association.
- [x] 11.2 Audit scenario/task id uniqueness, manifest-to-baseline completeness, deterministic filenames, candidate/canonical separation, verify-mode baseline directory hashes, implementer/reviewer/fixer evidence separation, and personal-inspection inventories.
- [x] 11.3 Audit the final diff for dependency/license scope, public entry exports, new design tokens, new `!important`, browser-viewport authority, document-root directional selectors, wrapper viewport markers, whole-editor horizontal fallback, visual-debug residue, unsupported synthetic pointer claims, debug statements, and unrelated snapshot updates.
- [x] 11.4 Audit all new code, comments, identifiers, artifacts, evidence, and delivery text for originality and restricted reference terms; confirm no copied source, CSS selectors, icons, fonts, or assets and no unrelated product/test change.
- [x] 11.5 Run final focused tests, package build before root typecheck on one fingerprint, complete visual verify/performance gates, `git diff --check`, and the independent review-cycle gate; record all exact commands and results.
- [x] 11.6 Create one local child commit only after every task and review finding is closed; write the local ship log and do not push, mutate a PR, archive, sync specs, deploy, merge, edit `.rasen/**` run state, or touch portfolio-level delivery.
