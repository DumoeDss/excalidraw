## Context

The portfolio prerequisites now expose stable internal hooks for the six-zone shell, toolbar and property leaves, floating and large surfaces, application-content sections, responsive profiles, and named viewport reservations. Every child also produced implementation and non-author Chrome evidence. That evidence proves the current branch, but it is not executable policy: images live in separate change directories, scenario setup is largely manual, and there is no committed bitmap comparison runner.

The repository currently uses Vitest in JSDOM. It has DOM and state snapshots, a mature mounted-editor test harness, deterministic element fixtures, and development-only access to the live editor, but no screenshot matcher, PNG pixel comparator, or browser test framework. The existing sticky Chrome proxy can create and activate disposable targets, set viewports, evaluate setup/assertion code, dispatch trusted coordinate clicks, capture semantic snapshots and editor screenshots, collect console/network/performance observations, and close targets. This is sufficient for a focused runner; adopting a second full browser framework would duplicate browser lifecycle and increase the dependency surface.

Several facts are browser-only. CSS compositing, intrinsic measurement, collision, focus paint, physical hit testing, editor-local direction, and raster output cannot be accepted from JSDOM. Conversely, a screenshot cannot prove roles, accessible names, focus containment, state ownership, public types, or pointer capability semantics. The final gate therefore needs pixels and semantic assertions to agree.

One accepted-known gap is explicitly downstream-owned here: the toolbar has no durable browser-equivalent automation for real point routing, short-height collision, full-width final-row hits, or visual close restoration. The final change must also protect lessons discovered while responsive integration was reviewed:

- 隐藏的固有宽度 measurement rail 必须在拥有它的 toolbar Island 上隔离溢出，不能通过缩小 target 或破坏测量宽度解决。
- 开发 visual debugger 的固定尺寸 canvas 会污染根 `scrollWidth`，产品几何取证应暂时禁用并在结束后恢复原设置。
- 简化 DOM PointerEvent 不足以模拟完整 React/editor pointer 契约；pen/touch latch 应使用完整测试 harness，不能把失败探测冒充浏览器成功证据。
- Mutable context payloads need an explicit React-render signal when semantic identity changes independently of state geometry; root attributes are not a substitute for provider freshness.
- Existing public hooks that read a deepened private context must state their legacy return type explicitly, while internal consumers use a separate non-barrel accessor.
- Directional CSS for multi-editor pages must anchor to the editor instance root; document-root selectors silently couple otherwise isolated editors.

The change remains internal and original. It must not copy source, styles, selectors, icons, fonts, or assets from any external product. Existing public APIs, host composition, domain actions, responsive resolution, safe-area projection, marker ownership, and adapter policy remain the authorities under test.

## Goals / Non-Goals

**Goals:**

- Define one inspectable source of truth for representative visual scenarios and consume it from both automated verification and human replay.
- Make capture deterministic enough that a small pixel tolerance represents product change rather than animation, caret, network, font, or timestamp noise.
- Commit stable editor-region baselines with explicit update review and machine-readable expected/current/diff reporting.
- Pair pixels with accessibility, theme, geometry, pointer-routing, responsive, RTL, multi-editor, recovery, and context/type assertions.
- Establish branch-calibrated performance regression budgets from repeated warm samples.
- Convert every finding into the smallest owning product fix plus a focused regression, then independently re-review the delta.
- Complete separate implementation and reviewer evidence matrices before local delivery.

**Non-Goals:**

- Replacing the existing responsive profile, App container observer, canvas-layout zones, toolbar/property planners, surface modules, app-content module, viewport reservation, or domain adapters.
- Enumerating every theme, selection, tool, dialog, menu, sidebar, host, and responsive combination. The manifest uses an orthogonal representative set plus targeted high-risk states.
- Treating broad golden-image thresholds or whole-surface masks as accessibility or semantic proof.
- Making raw navigation paint timing a universal cross-machine product SLA.
- Adding a public screenshot API, exporting test helpers from package barrels, redesigning product workflows, or changing persisted scene data.
- Reusing prior child screenshots as canonical baselines or as reviewer-owned acceptance evidence.

## Decisions

### 1. Use one declarative scenario manifest with browser and replay adapters

Create an internal visual-regression module with an interface equivalent to:

```ts
defineVisualScenarios([...])

runVisualScenarios({
  mode: "verify" | "update",
  browserAdapter,
  outputDir,
  role: "implementer" | "reviewer",
})
```

Exact filenames may follow repository conventions. Each scenario descriptor has a stable id; editor crop root; viewport, device scale, theme, editor-root direction, locale, safe-area, and input profile; fixture/setup identity; interaction steps; capture regions; allowed masks; semantic, accessibility, geometry, and pointer assertions; comparison policy; optional performance budget; and deterministic artifact stem. Setup logic remains in named fixture/interaction adapters rather than being serialized as arbitrary code inside the manifest. The automated adapter drives the existing Chrome path. A manual replay adapter renders the same scenario inventory, steps, expected assertions, and evidence names for implementer and reviewer checklists.

The canonical filename encodes scenario id, geometry, theme, direction, and state. Role and run suffixes are added only to evidence/current artifacts; committed baseline names remain stable. Manifest validation rejects duplicate ids/stems, invalid dimensions, missing assertions, unbounded masks, unsafe paths, and a performance gate without a budget source.

Three substantially different designs were compared locally because delegation is prohibited for this planner:

1. **Chosen — manifest plus two adapters.** Policy is centralized while browser mechanics and human evidence ownership stay separate. Deleting the module would scatter deterministic setup, naming, crops, masks, tolerances, semantic assertions, baseline approval, performance budgets, and evidence formatting across scripts and reviewer instructions.
2. **Rejected — independent test/script per state.** Each state could optimize its own setup and screenshot, but names, thresholds, cleanup, and approval rules would drift. Reviewers would have no reliable guarantee that their replay matched the implementation matrix.
3. **Rejected — golden images with one broad pixel threshold.** This is superficially small, but it is brittle across legitimate raster variance and weak against semantic regressions. It also encourages masking or threshold inflation whenever a state flakes.

The seam stays internal. It is not exported from `packages/excalidraw/index.tsx` or a common barrel, and it does not widen `LayerUIProps`.

### 2. Drive the existing Chrome boundary and keep fixtures test-only

Use a dedicated Node-environment Vitest configuration/entry so TypeScript manifests and repository assertions run without introducing a second application test runner. The runner calls the existing Chrome proxy through its documented HTTP boundary, performs its dependency check, opens a fresh target, applies viewport before navigation, activates the target, and closes it in `finally`. It never stops or replaces the sticky proxy. A failed close is reported, and final target enumeration must prove disposable targets are absent.

The browser side uses a development/test-only scenario adapter around existing editor APIs and stable UI interactions. Deterministic element fixtures have fixed ids, seeds, nonces, versions, coordinates, text, and update values. Application scenarios use local fixture content and controlled states; they do not depend on remote Library, collaboration, AI, sharing, clock, or random data. Where a workflow must be proven, setup can seed its owned state but acceptance uses the real visible control and a trusted click/keyboard path. The adapter is absent from production builds and does not become a public imperative API.

The runner adds only narrowly scoped development dependencies needed to decode and compare PNGs if repository/built-in capabilities cannot provide that function. A full browser automation framework is not added. Dependency choice must be pinned, license-audited, and isolated to the visual test path; no runtime dependency or public package export changes.

For pen and touch latching, reuse the complete mounted editor test harness or a proven real-browser dispatch path that preserves the full React/editor contract. Constructing and dispatching a simplified DOM event is not browser acceptance. Coarse-pointer visual density can be captured only after the browser adapter proves the requested media/input state actually changed.

### 3. Make preparation deterministic and restore every global mutation

Before each scenario, the adapter:

- resets storage, scene, editor state, application fixture state, transient portals, toast queues, collaboration data, and prior focus;
- installs explicit viewport/device scale, locale, theme, editor-root direction, physical safe areas, input capability, and deterministic scene/application fixture;
- injects a test-only no-motion style for animations, transitions, smooth scrolling, and animated cursors without changing committed product styles;
- waits for `document.fonts.ready`, required font faces, scenario readiness hooks, network quiescence for local resources, two stable animation frames, microtasks, and identical consecutive geometry signatures;
- freezes or hides caret blink, selection blink, cursor, transient timestamps, collaboration avatars, toasts, and status badges unless they are the subject of the scenario;
- ensures console capture is active and clears inherited events before accepted interactions.

The visual-debugger state is read and recorded before geometry work. Product capture disables its persisted flag and live debug canvas, confirms the contaminating canvas is absent, then restores the exact prior persisted/live state in `finally`, even after setup or comparison failure. Other changes to locale, media emulation, safe-area properties, clock, storage, and injected styles use the same scoped restore stack. Cleanup runs before target close and its failures are included in the report rather than hidden by an earlier assertion.

Readiness is semantic, not a fixed sleep. A scenario that cannot reach its declared stable state times out with the last readiness/geometry facts and cannot produce an accepted baseline.

### 4. Commit canonical editor-region baselines under explicit approval policy

Capture the stable editor instance root or a named semantic subregion, never uncontrolled browser chrome. The crop must be resolved from a manifest-owned stable hook and recorded with editor-relative and target coordinates. Multi-editor and top-level recovery scenarios may use a dedicated fixture-host root because their subject spans more than one editor or exists outside an editor tree.

Canonical baselines live in a versioned test-asset directory, with a machine-readable metadata manifest containing scenario id, dimensions, DPR, crop, supported platform/browser facts, font readiness, fixture version, comparison policy, image hash, and approval note. Normal `verify` mode treats the directory as read-only. `update` is a separate explicit command, refuses a dirty or semantically failing scenario, writes candidates outside the canonical directory first, and promotes them only after every image is opened and classified as:

- legitimate intentional visual change;
- deterministic harness or environment drift requiring harness repair/recalibration;
- product regression requiring a product fix.

No script silently accepts current output because a baseline is missing. Adding a scenario requires an explicit candidate-generation and approval pass. Reviewer evidence never overwrites canonical baselines.

### 5. Use bounded regional pixel comparison with semantic companion gates

The comparator first validates exact dimensions and decodes both PNGs. It applies only manifest-declared small color/antialias tolerances and bounded masks for proven nondeterministic pixels. Masks have stable semantic anchors and maximum area/ratio limits; masking a whole toolbar, menu, dialog, sidebar, text editor, or application surface is rejected. Threshold increases require a reason in baseline metadata and reviewer sign-off.

Every failure emits expected, current, a high-visibility diff, mismatch count/ratio, changed bounding box, masked-pixel count, image hashes, environment metadata, and the failing semantic assertions in one JSON report. Passed runs also emit a compact result so missing scenarios cannot be mistaken for success.

Pixels never stand alone. Each scenario declares assertions appropriate to its subject:

- visible roles, accessible names, `aria-expanded`/`selected`/`checked`/`disabled`, descriptions, live regions, and instance-local associations;
- current focus and focus-visible paint, modal focus containment/return, background isolation, and connected return target;
- editor/container/leaf/surface rectangles, bounded internal scroll, safe-area clearances, no clipping/overlap, no root horizontal overflow, and reachable visible actions;
- computed theme/token values and WCAG contrast calculations for representative text, controls, focus, selected, disabled, destructive, and error states;
- marker ownership, neutral wrappers, actual leaf reservation, `elementFromPoint` results, trusted full-row/control hits, and trusted outside canvas routing;
- root responsive attributes plus rendered adapter identity, direction, safe-area projection, and multi-editor isolation.

Any required semantic gate failure fails the scenario even when pixels match. A pixel mismatch fails unless it is explicitly approved through update mode after semantic gates pass.

### 6. Encode an orthogonal representative matrix and targeted high-risk states

The initial manifest covers at least:

- desktop `1440×900`: light/LTR and dark/RTL across the welcome/default shell, selected rectangle/property state, text editing with stabilized caret/focus, toolbar overflow or group menu, main menu/submenu or context surface, docked and overlay sidebar, and representative Library, AI, share, and collaboration content;
- tablet: `1024×768` dark/RTL with Library/sidebar and `768×1024` light/LTR with compact properties;
- phone: `375×812` light/LTR with Library/property/tool surfaces and `812×375` dark/RTL short-landscape state, with touch/pen density accepted only through the full harness or proven browser path;
- constrained embed: `640×480` dark/RTL, asymmetric physical safe areas, and Help/large surface;
- multi-editor: different bounds, theme, direction, and responsive profile in simultaneous editor instances;
- recovery/loading/error: a bounded narrow recovery state and representative stable loading/error presentation.

These scenarios intentionally combine orthogonal facts instead of multiplying every state. A defect discovered outside the matrix adds the smallest targeted scenario or focused nonvisual regression that would have caught it; it does not trigger blanket combinatorial expansion.

The S9 scenario specifically opens the toolbar in a short/narrow editor, samples the complete visible final row with `elementFromPoint`, dispatches trusted clicks at multiple inline positions, proves adjacent actions are shielded, closes through Escape and outside interaction, and compares both open and restored captures. A real blank shell point must still reach canvas behavior.

### 7. Treat responsive/context/direction invariants as explicit regression gates

The final matrix does not recreate responsive policy. It reads the editor-root `data-responsive-*` projection and checks that the delivered adapter and profile agree with the manifest's expected semantic state.

Fixed-size direction, safe-area, and input-capability changes must trigger an actual React render/provider update before internal consumers are inspected. Root attributes are useful observable projections, but a matching attribute cannot excuse a stale context consumer. Focused tests keep `useEditorInterface`'s legacy `EditorInterface` return type exact and keep deep responsive access on its separate non-barrel internal hook.

Direction tests render two editors with different root directions while the document root remains deliberately unchanged. Directional styles and geometry must follow each editor root independently. Any remaining document-root selector in the delivered scope is replaced with an editor-instance-root selector and receives a two-editor regression.

The toolbar's hidden intrinsic-width rail retains its complete candidate width. Overflow containment belongs to the toolbar Island that owns the rail; fixes must not reduce candidate widths, hide items from measurement, add whole-editor horizontal scrolling, or move the marker to a wrapper. Product geometry capture always excludes visual-debugger pollution before asserting root `clientWidth === scrollWidth`.

### 8. Calibrate performance budgets from repeated warm branch samples

Performance has two classes:

1. cold navigation/readiness metrics are recorded for diagnosis and trend context;
2. steady-state setup and interaction metrics are the portable regression gate.

The target is activated before paint observation. For each budgeted scenario, run one warm-up followed by at least three accepted samples; store each sample and gate on the median. Start an in-page observation window after deterministic settle so post-settle layout shifts and long tasks are attributable to the scenario action. Require zero unexpected post-settle CLS, no unexpected long task beyond the documented branch-calibrated threshold, bounded shell/profile update or surface interaction duration, and bounded resource/transfer count or total harness duration where the scenario declares those metrics.

Initial numeric budgets come from the accepted branch on the supported test environment plus a modest, documented regression allowance. They are not invented universal limits. A missing/null required metric is `inconclusive` and fails the gate; it never passes silently. Background-tab FP/FCP/LCP may be null and raw LCP is not a hard cross-machine budget unless the target is activated and the metric proves reliable. The machine-readable report distinguishes required, diagnostic, unavailable, and failed metrics.

### 9. Fix findings at their owning seam and preserve reviewer independence

The implementation pass runs the full manifest, opens every retained current/candidate image, records semantic and performance output, and triages failures into harness drift, intentional visual change, or product regression. Harness drift is fixed in fixtures/readiness/comparison policy. Product regressions are fixed in the smallest owning module and receive a focused Vitest or visual scenario regression. Intentional changes follow the explicit baseline approval path.

Accessibility, theme, layout, RTL, context freshness, measurement overflow, and performance findings are not merely documented. Blocker/Major findings and in-scope Minor findings must be fixed. Review runs through a non-author role with its own fresh targets, current captures, artifact directory, image inspection, semantic queries, performance samples, and severity-tagged report. Every required matrix scenario retains at least one role-owned screenshot that its producing role personally opens and inspects. No implementation screenshot satisfies reviewer acceptance.

If review finds a defect, a fixer changes only the owning product/harness seam and records delta evidence. The original or another non-author reviewer repeats only the affected scenarios plus adjacency risks and issues the delta verdict. The loop is capped by the portfolio review policy; unresolved material findings are escalated, never converted to a high tolerance or broad mask.

### 10. Keep verification ordered, focused, and locally delivered

Focused Vitest suites cover manifest validation, deterministic fixture identities, comparator/mask/report behavior, baseline write protection, semantic/contrast/geometry helpers, browser adapter cleanup, responsive/context/type invariants, and each targeted product fix. The real browser matrix then proves integration. `yarn build:excalidraw` runs before `yarn test:typecheck` against the same source fingerprint. Known-flaky broad snapshots are not updated to make this child green unless the changed adapter directly owns them.

Final audits cover strict UTF-8/no BOM, PNG signatures and metadata/image hash agreement, JSON/YAML parsing, duplicate scenario/task ids, missing baselines, unexpected baseline rewrites, error console/checker overlays, dependency/license scope, public exports, design tokens, `!important`, viewport units, marker ownership, whole-editor overflow, debug residue, forbidden terms, and diff whitespace. Delivery is one local child commit only; push, PR mutation, archive, spec sync, deployment, merge, and run-state writes remain portfolio-owned.

## Risks / Trade-offs

- **[Raster differences vary across browser, platform, DPR, or fonts]** → Declare a canonical supported environment in baseline metadata, wait for exact font readiness, use small antialias tolerance, and classify environment mismatch as harness drift/inconclusive instead of approving a broad threshold.
- **[The manifest becomes an imperative test framework]** → Keep descriptors declarative and setup/actions in named adapters; validate the schema and reject arbitrary selector/CSS escapes in scenarios.
- **[A fixture bypasses the workflow it claims to prove]** → Seed only prerequisite state, then use the real visible action with trusted input for acceptance and assert its semantic result.
- **[Masks hide product regressions]** → Anchor masks semantically, cap their area, report masked pixels, and prohibit whole interactive surfaces.
- **[Baseline update normalizes a regression]** → Separate candidate and canonical directories, require semantic success plus personal image inspection/classification, and never write in verify mode.
- **[The existing proxy is unavailable or changes contract]** → Fail the dependency check before any baseline work, report the missing capability, and keep the browser boundary in one adapter so transport changes stay local.
- **[Performance is noisy]** → Activate the target, separate cold from steady-state, warm once, take at least three samples, gate on medians, and derive budgets from the accepted branch.
- **[Determinism cleanup leaks into later scenarios or the developer session]** → Use a scoped restore stack and fresh target per role/run; verify debugger, storage, injected styles, media state, console buffer, and targets in `finally`.
- **[Screenshot coverage gives false accessibility confidence]** → Require explicit semantic, focus, contrast, and geometry assertions and retain mounted harness tests for event contracts.
- **[The final hardening child grows into a redesign]** → Fix only evidence-backed defects at existing owning seams, preserve delivered authorities/public contracts, and require a focused regression for each fix.

## Migration Plan

1. Add manifest types/validation, deterministic fixture identities, comparator/report helpers, baseline path policy, and focused unit tests.
2. Add the existing-proxy browser adapter, development/test-only scenario host, scoped preparation/restoration, semantic query helpers, and lifecycle tests.
3. Implement the representative scenario manifest and capture candidate baselines. Repair determinism until repeated verify runs are stable, then inspect and approve canonical baselines explicitly.
4. Add accessibility/theme/layout/pointer/responsive/context/type gates and the S9 browser-equivalent scenario; fix evidence-backed product defects with focused tests.
5. Calibrate and record performance budgets from one warm-up plus at least three samples on the accepted branch, then enable required steady-state gates.
6. Complete implementer evidence, focused tests, build-before-typecheck, and full verify mode. Dispatch independent review, fix findings, and delta re-review until clean or explicitly escalated.
7. Run final scope, encoding, structured-data, image, baseline, originality, and diff audits, then create only the local child delivery commit.

Rollback is a normal revert of the local child commit. The visual runner and baselines are test-only, and product fixes are independently regression-covered; no persisted data, public API, service, deployment, or host migration is required.

## Open Questions

No product decision blocks implementation. Exact compatible PNG comparison package/version, canonical browser build metadata, numeric pixel tolerance, and numeric performance allowances are implementation-calibration decisions. They must satisfy the bounded-policy requirements above, be recorded in machine-readable metadata, and cannot be chosen merely to make an existing failure pass.
