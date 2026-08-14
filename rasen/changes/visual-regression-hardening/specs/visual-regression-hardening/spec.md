## ADDED Requirements

### Requirement: Declarative representative visual scenario contract

The repository SHALL define one internal typed manifest as the source of truth for representative visual scenarios. Each scenario SHALL declare a stable identity, deterministic setup adapter, editor geometry and input profile, theme, editor-root direction, locale, physical safe areas, interactions, semantic capture roots or regions, assertions, bounded comparison policy, optional performance budget, and artifact stem. Automated Chrome verification and human implementation/reviewer replay SHALL consume the same manifest without exporting the capability through a public package barrel.

#### Scenario: Automated and human paths share one scenario

- **WHEN** a representative scenario is added or changed
- **THEN** the automated runner and human replay checklist SHALL resolve the same setup identity, interactions, assertions, capture regions, and deterministic artifact stem from the manifest

#### Scenario: Invalid manifest entry is rejected

- **WHEN** a manifest contains a duplicate id or artifact stem, invalid geometry, unsafe output path, missing semantic assertions, unbounded mask, or performance gate without a budget source
- **THEN** validation SHALL fail before a browser target is opened or a baseline is written

#### Scenario: Capability remains internal and deep

- **WHEN** the final implementation is audited
- **THEN** the visual-scenario capability SHALL NOT be exported from a public package entry, and deleting it would force naming, setup, crop, tolerance, assertion, approval, budget, and evidence policy back into multiple runners and reviewer instructions

### Requirement: Deterministic fixture and preparation lifecycle

Every scenario SHALL use fixed local scene and application fixtures with stable ids, seeds, versions, coordinates, text, timestamps, and owned state. Preparation SHALL set explicit viewport, device scale, theme, editor-root direction, locale, physical safe areas, input capability, and scenario state; disable motion; wait for required fonts and semantic readiness; settle microtasks and animation frames; and require consecutive stable geometry signatures. Network-dependent, random, clock-dependent, or inherited transient content SHALL NOT determine an accepted capture.

#### Scenario: Scene and application state is reproducible

- **WHEN** the same scenario is prepared in two fresh targets on the supported environment
- **THEN** it SHALL use identical fixed fixture identities and reach the same declared semantic state without remote Library, collaboration, AI, sharing, clock, or random-data dependence

#### Scenario: Fonts and layout must settle

- **WHEN** a scenario reaches its visible state
- **THEN** capture SHALL wait for `document.fonts.ready`, all scenario-required font faces, semantic readiness, pending microtasks, at least two stable animation frames, and identical consecutive geometry signatures

#### Scenario: Transient presentation is controlled

- **WHEN** caret blink, selection blink, cursor motion, collaboration avatars, timestamps, toasts, animated transitions, or status badges are not the subject of a scenario
- **THEN** preparation SHALL freeze or suppress them through test-only state/style controls and SHALL record those controls in the result metadata

#### Scenario: Readiness cannot be reached

- **WHEN** a scenario times out before its declared stable semantic and geometry state
- **THEN** the runner SHALL fail with the last readiness and geometry observations and SHALL NOT emit or approve a canonical baseline

### Requirement: Visual debugger and global state restoration

Product geometry capture SHALL disable the development visual debugger after recording its persisted and live state because its fixed-size canvas can alter root horizontal geometry. The runner SHALL restore the exact prior debugger, storage, locale, media/input emulation, safe-area, clock, injected-style, console, and focus state in a `finally`-equivalent cleanup path, and cleanup failures SHALL remain visible in the result.

#### Scenario: Debugger is enabled before capture

- **WHEN** the persisted or live visual debugger is enabled before a product scenario
- **THEN** preparation SHALL record that state, disable it, confirm the debug canvas is absent before geometry assertions, and restore the prior state after the scenario

#### Scenario: Scenario fails during setup or comparison

- **WHEN** setup, interaction, capture, assertion, or comparison throws
- **THEN** every registered restore action SHALL still run before target close, and any restore failure SHALL be reported in addition to the original failure

#### Scenario: Product overflow is measured without debug contamination

- **WHEN** a scenario asserts that an editor or fixture root has no horizontal overflow
- **THEN** the assertion SHALL run with the visual debugger absent and SHALL compare the intended product root's `clientWidth` and `scrollWidth`

### Requirement: Canonical baseline governance

Canonical baselines SHALL be committed versioned test assets captured from stable semantic roots rather than uncontrolled browser chrome. Their metadata SHALL include scenario id, canonical filename, dimensions, device scale, crop, supported browser/platform facts, font and fixture versions, comparison policy, image hash, and approval classification. Normal verification SHALL treat baseline files as read-only; baseline creation or replacement SHALL require a separate explicit update mode and personal image review.

#### Scenario: Verification detects a missing or changed baseline

- **WHEN** verify mode encounters a missing baseline or current pixels outside policy
- **THEN** it SHALL fail and emit result artifacts without creating, replacing, or modifying any canonical baseline

#### Scenario: Update candidates are generated

- **WHEN** explicit update mode runs for semantically passing scenarios
- **THEN** it SHALL write candidate images outside the canonical baseline directory and SHALL NOT promote them automatically

#### Scenario: Candidate is classified before approval

- **WHEN** a baseline candidate is considered for promotion
- **THEN** the producing role SHALL open it and classify the difference as intentional visual change, deterministic harness/environment drift, or product regression before an approved candidate can replace the canonical image

#### Scenario: Prior manual evidence exists

- **WHEN** earlier child changes contain implementation or reviewer screenshots
- **THEN** those screenshots MAY guide scenario selection but SHALL NOT be copied into the canonical baseline set or satisfy this change's implementation/reviewer evidence

### Requirement: Bounded pixel comparison and actionable reports

The comparator SHALL validate image dimensions, decode canonical and current PNGs, apply only small documented color/antialias tolerances, and apply masks only to proven nondeterministic regions anchored by stable semantics and bounded by maximum area. A whole toolbar, menu, property surface, dialog, sidebar, editor, or application-content surface SHALL NOT be masked. Pixel comparison SHALL be accompanied by required semantic assertions.

#### Scenario: Pixel comparison passes within policy

- **WHEN** current and expected dimensions match, all semantic assertions pass, and changed pixels remain inside the documented tolerance and bounded masks
- **THEN** the scenario SHALL pass with recorded mismatch, mask, hash, and environment metadata

#### Scenario: Pixel comparison fails

- **WHEN** dimensions differ, pixels exceed policy, or a required semantic assertion fails
- **THEN** the runner SHALL emit expected, current, high-visibility diff, mismatch count and ratio, changed bounding box, masked-pixel count, hashes, environment facts, and semantic failures in a machine-readable report

#### Scenario: Mask or threshold is broadened

- **WHEN** a change increases tolerance or mask area
- **THEN** validation SHALL require a documented nondeterminism reason and reviewer approval and SHALL reject a blanket high threshold or an entire interactive-surface mask

#### Scenario: Pixels match but semantics regress

- **WHEN** current pixels match the baseline but a role, accessible name, state, focus, geometry, pointer, responsive, or isolation assertion fails
- **THEN** the scenario SHALL fail rather than treating the matching bitmap as acceptance

### Requirement: Orthogonal desktop and application-content matrix

The representative manifest SHALL cover desktop `1440×900` light/LTR and dark/RTL states across the default/welcome shell, selected rectangle and property presentation, text editing with stabilized caret/focus, toolbar overflow or group menu, main menu/submenu or context surface, docked and overlay sidebars, and representative Library, AI, sharing, and collaboration content. The scenario set SHALL combine orthogonal facts and add targeted high-risk states without attempting every combination.

#### Scenario: Desktop light LTR matrix runs

- **WHEN** the desktop light/LTR subset is verified at `1440×900`
- **THEN** it SHALL include the default/welcome shell, selected-element/property state, text-editing/focus state, one toolbar or group overflow state, and representative application content across its scenarios

#### Scenario: Desktop dark RTL matrix runs

- **WHEN** the desktop dark/RTL subset is verified at `1440×900`
- **THEN** it SHALL include one nested or contextual floating surface, docked or overlay sidebar presentation, logical direction/placement assertions, and representative application content

#### Scenario: New defect exposes an uncovered risk

- **WHEN** implementation or review finds a repeatable defect outside the representative matrix
- **THEN** the fix SHALL add the smallest targeted visual scenario or focused nonvisual regression that would have caught it rather than multiplying every unrelated state

### Requirement: Tablet phone embed multi-editor and recovery matrix

The manifest SHALL include `1024×768` dark/RTL with Library/sidebar, `768×1024` light/LTR with compact properties, `375×812` light/LTR with Library/property/tool surfaces, `812×375` dark/RTL short landscape, `640×480` dark/RTL with asymmetric safe areas and Help or another large surface, simultaneous multi-editor isolation, and bounded narrow recovery/loading/error coverage.

#### Scenario: Tablet states retain desktop adapter behavior

- **WHEN** the two tablet scenarios run
- **THEN** their declared responsive profile and desktop adapter SHALL match the rendered Library/sidebar or compact-property presentation without whole-editor horizontal fallback

#### Scenario: Phone portrait and short landscape remain operable

- **WHEN** the phone portrait and short-landscape scenarios run
- **THEN** all declared tool, property, Library, and overflow actions SHALL remain reachable, bounded, and touch-sized with no root horizontal overflow

#### Scenario: Constrained embed uses physical safe areas

- **WHEN** the `640×480` dark/RTL scenario applies asymmetric top/right/bottom/left safe areas
- **THEN** the large surface and persistent leaves SHALL remain inside the editor and respect physical insets without swapping them when logical direction changes

#### Scenario: Multiple editors disagree semantically

- **WHEN** two editors with different bounds, themes, directions, and responsive profiles are rendered on one page
- **THEN** each SHALL retain its own profile, adapter, styling, focus associations, surface ownership, and geometry when the other updates or unmounts

#### Scenario: Narrow recovery is displayed

- **WHEN** the recovery/loading/error fixture renders in a narrow host
- **THEN** its content and actions SHALL be bounded, readable, reachable, and independent of unavailable editor context where the recovery owner lives outside the editor tree

### Requirement: Accessibility and focus gates

Representative scenarios SHALL assert applicable roles, accessible names and descriptions, expanded/selected/checked/disabled states, live-region behavior, keyboard focus and visible focus styling, modal background isolation, continuous focus containment, focus return, and touch-target dimensions. Contrast SHALL be calculated from computed foreground/background colors for representative normal text, controls, selected, focus, destructive, disabled, and error states in light and dark themes.

#### Scenario: Keyboard focus state is captured

- **WHEN** a keyboard scenario focuses a toolbar, menu, property, dialog, sidebar, or application control
- **THEN** the real active element SHALL be the declared target, its accessible relationship SHALL be valid, and a visible focus treatment SHALL be present in computed style and the inspected capture

#### Scenario: Modal opens and closes

- **WHEN** a representative modal or confirmation surface is opened and then closed through keyboard input
- **THEN** focus SHALL remain contained while open, background editor chrome SHALL be isolated, and focus SHALL return to the connected declared owner without leaving stale scroll lock or portal state

#### Scenario: Touch target is measured

- **WHEN** a coarse-pointer or phone control is included in a scenario
- **THEN** its physical hit rectangle SHALL meet the existing touch-target contract and its complete visible area SHALL remain reachable

#### Scenario: Contrast is evaluated

- **WHEN** representative theme states are captured
- **THEN** computed colors SHALL meet the repository's documented WCAG contrast target for each declared text/control category or the scenario SHALL fail with the measured ratio and color inputs

### Requirement: Theme layout marker and overflow gates

The final matrix SHALL assert semantic light/dark surface hierarchy; distinct default, hover, open, selected, focus, disabled, destructive, loading, and error presentation where applicable; and absence of clipping, unintended overlap, unreachable controls, or editor-root horizontal overflow. Canvas layout roots, rows, zones, portal hosts, and positioners SHALL remain pointer- and viewport-measurement-neutral, while actual persistent occluding leaves SHALL retain the correct marker and reservation.

#### Scenario: Theme states remain distinct

- **WHEN** a scenario presents selected/open/focus/destructive/error state in light or dark theme
- **THEN** computed token-backed surface, foreground, border, and focus values SHALL retain the intended semantic distinctions without relying on a new override system

#### Scenario: Persistent and transient surfaces are measured

- **WHEN** a toolbar, property surface, or docked sidebar is visible beside a transient menu, dialog, tooltip, toast, or overlay sidebar
- **THEN** only the persistent occluding leaf SHALL own viewport reservation and neutral wrappers/transient surfaces SHALL remain unmarked

#### Scenario: Hidden toolbar measurement rail is present

- **WHEN** the toolbar measures its complete candidate inventory in a narrow editor
- **THEN** the hidden rail SHALL retain intrinsic candidate widths while its owning toolbar Island isolates overflow, and the fix SHALL NOT shrink targets, omit candidates, add whole-editor horizontal scrolling, or move reservation to a wrapper

#### Scenario: Visible actions remain inside usable geometry

- **WHEN** any declared surface opens in desktop, tablet, phone, short, safe-area, or RTL geometry
- **THEN** all required actions SHALL remain inside the editor or its bounded scroll viewport with no unintended clipping or overlap

### Requirement: Browser-equivalent toolbar and physical pointer coverage

Durable automation SHALL cover real point routing, short-height toolbar collision, complete final-row hits, adjacent-action shielding, visual close restoration, empty-shell canvas routing, and focus return in a real browser. `elementFromPoint` observations SHALL be paired with trusted coordinate input. Pen/touch latch acceptance SHALL use the complete mounted editor test harness or a proven browser path that preserves the full React/editor pointer contract; simplified synthetic DOM PointerEvent probes SHALL NOT be reported as browser success.

#### Scenario: Final overflow row is hit across its width

- **WHEN** the toolbar overflow menu is open in a narrow or short editor
- **THEN** left, center, and right samples of the final visible row SHALL resolve to that row, and trusted clicks at representative samples SHALL activate only its intended action

#### Scenario: Adjacent phone actions are shielded and restored

- **WHEN** a phone toolbar foreground menu opens and then closes through Escape or outside interaction
- **THEN** adjacent actions SHALL be visually, pointer, and accessibility isolated while open and SHALL be fully visible, reachable, and correctly focused after close or unmount

#### Scenario: Blank shell point reaches canvas

- **WHEN** trusted input targets an empty point inside a canvas-layout wrapper but outside every interactive leaf
- **THEN** the physical target and resulting editor behavior SHALL belong to the canvas rather than the shell wrapper

#### Scenario: Pen or touch latch is tested

- **WHEN** a regression requires the editor's pen/touch activation contract
- **THEN** the test SHALL use the full mounted editor harness or a verified real-browser input path and SHALL reject evidence produced only by dispatching a simplified DOM event

### Requirement: Responsive context public type and directional isolation

The existing editor-local responsive resolver, App container observer, context provider, and root projection SHALL remain authoritative. A semantic context identity change that is independent of state geometry SHALL produce an explicit React render signal before internal consumers are accepted. The public `useEditorInterface` hook SHALL retain an explicit legacy `EditorInterface` return type, while deep responsive consumers SHALL use a separate internal non-barrel accessor. Directional styling SHALL anchor to each editor instance root rather than document-root selectors.

#### Scenario: Fixed-size semantic input changes

- **WHEN** direction, physical safe areas, or input capability changes while editor bounds stay fixed
- **THEN** the responsive profile, provider identity, internal consumers, rendered adapter facts, and editor-root attributes SHALL update in the same accepted state

#### Scenario: Root attribute changes without consumer freshness

- **WHEN** root `data-responsive-*` attributes match a new profile but a context consumer retains old semantic data
- **THEN** the scenario SHALL fail because attributes are observable projections rather than a substitute for React provider freshness

#### Scenario: Public and internal hooks are type-checked

- **WHEN** the responsive hook contract suite runs
- **THEN** `useEditorInterface` SHALL have the exact legacy `EditorInterface` return type and the deep responsive accessor SHALL remain internal and absent from public barrels

#### Scenario: Two editor directions differ from document direction

- **WHEN** simultaneous editors use different directions while document-root direction is held constant
- **THEN** each editor's toolbar, property, floating, large, sidebar, and application-content geometry SHALL follow its own root, and document-root directional selectors SHALL NOT couple the instances

### Requirement: Repeated warm performance regression budgets

Budgeted scenarios SHALL distinguish cold navigation/readiness observations from steady-state product setup and interaction gates. The runner SHALL activate the target, perform one warm-up, collect at least three accepted samples, record all samples, and compare the median with budgets calibrated from the accepted branch plus documented regression allowance. Required unavailable metrics SHALL be inconclusive failures rather than passes.

#### Scenario: Steady-state layout settles

- **WHEN** a budgeted scenario completes deterministic settle and performs its declared interaction
- **THEN** post-settle CLS SHALL remain zero except for an explicitly expected transition and no unexpected long task SHALL exceed the recorded branch-calibrated threshold

#### Scenario: Shell interaction samples are collected

- **WHEN** responsive profile update, toolbar/menu opening, sidebar transition, or another declared shell interaction is budgeted
- **THEN** the runner SHALL warm once, collect at least three target-activated samples, and gate the recorded median duration rather than one noisy sample

#### Scenario: Resource or harness budget regresses

- **WHEN** a scenario exceeds its declared resource count/transfer or total harness-duration budget
- **THEN** the report SHALL show every sample, median, baseline source, allowance, and exceeded limit

#### Scenario: Paint metric is unavailable

- **WHEN** FP, FCP, LCP, or another metric is null because the target was backgrounded or the metric is unsupported
- **THEN** a required metric SHALL fail as inconclusive and a diagnostic metric SHALL be marked unavailable; neither SHALL silently pass or be treated as zero

### Requirement: Browser target console and artifact lifecycle

Every browser run SHALL verify proxy dependencies, use fresh disposable targets, apply viewport before navigation, activate targets before accepted input/performance sampling, capture target-scoped console/checker state, and restore scenario state before closing targets. The sticky shared proxy SHALL remain running. Deterministic filenames SHALL separate canonical baselines, implementer evidence, reviewer evidence, fixer deltas, and machine-readable reports.

#### Scenario: Browser dependencies are unavailable

- **WHEN** the required Chrome or proxy capability check fails
- **THEN** the run SHALL stop before capture or baseline update and report the missing capability without starting or stopping an alternate shared proxy

#### Scenario: Accepted scenario has runtime errors

- **WHEN** the target records an unexpected error-level console event, checker message, or visible unexpected error overlay
- **THEN** the scenario SHALL fail even if pixel and semantic comparisons otherwise pass

#### Scenario: Target cleanup completes

- **WHEN** a role's matrix finishes or aborts
- **THEN** every disposable target SHALL be closed and final target enumeration SHALL confirm it is absent while the sticky proxy remains alive

#### Scenario: Retained artifact is named

- **WHEN** a baseline, current, diff, report, or role evidence image is retained
- **THEN** its filename SHALL deterministically identify scenario, geometry, theme, direction, and state, with role/run suffixes only outside canonical baselines

### Requirement: Separate implementation and independent reviewer acceptance

The implementer and a non-author reviewer SHALL each personally run the required manifest through their own fresh targets, retain at least one role-owned screenshot for every required matrix scenario, produce separate evidence directories, open and visually inspect every retained image, inspect semantic and performance results, and record a severity-tagged verdict. No implementer screenshot, report, or image inspection SHALL satisfy reviewer acceptance.

#### Scenario: Implementation evidence is completed

- **WHEN** implementation verification finishes
- **THEN** the implementer SHALL capture and personally inspect at least one retained image for every required matrix scenario and record the full scenario/result manifest, image hashes, semantic and performance observations, checker/console state, and target cleanup

#### Scenario: Reviewer repeats the matrix

- **WHEN** independent review begins
- **THEN** the reviewer SHALL create fresh targets, capture and personally inspect at least one reviewer-owned image for every required matrix scenario, repeat the required interactions, and issue findings without reusing implementation captures as proof

#### Scenario: Evidence roles are mixed

- **WHEN** an artifact path or report attempts to use an implementation screenshot as reviewer evidence or overwrite a canonical baseline
- **THEN** evidence validation SHALL fail

### Requirement: Findings produce targeted fixes and delta review

Harness drift SHALL be repaired in deterministic setup, readiness, comparison, or environment policy. Product regressions SHALL be fixed at the smallest existing owning seam and receive a focused automated regression. Intentional visual changes SHALL use explicit baseline approval. Material findings SHALL NOT be closed by inflating tolerance, broadening masks, weakening semantic gates, or documenting the defect without an in-scope fix.

#### Scenario: Product regression is found

- **WHEN** implementation or review identifies an accessibility, theme, layout, RTL, responsive, context, measurement, pointer, or performance defect owned by this portfolio
- **THEN** the owning product module SHALL be fixed and a focused test or targeted visual scenario SHALL demonstrate the regression and its resolution

#### Scenario: Harness drift is found

- **WHEN** repeated evidence proves a difference comes from nondeterministic setup, unsupported environment, font/readiness, or capture policy rather than product output
- **THEN** the harness SHALL be repaired or the scenario marked unsupported/inconclusive without changing product appearance or approving the drift as a baseline

#### Scenario: Reviewer reports a finding

- **WHEN** independent review reports an in-scope finding
- **THEN** a fixer SHALL record the focused delta and a non-author reviewer SHALL repeat the affected scenarios plus adjacent risks before the finding can close

#### Scenario: Review rounds are exhausted

- **WHEN** the capped review loop ends with an unresolved material finding
- **THEN** the change SHALL be escalated with the open evidence and SHALL NOT be declared clean or locally delivered as complete

### Requirement: Focused verification scope and local delivery

Focused automated tests SHALL cover manifest validation, fixture stability, comparator/mask/report behavior, baseline write protection, semantic/contrast/geometry helpers, browser cleanup, responsive context/public types, and every product fix. The package build SHALL run before root typecheck against the same source fingerprint, followed by browser verification and final audits. Delivery SHALL be a local child commit only and SHALL NOT include push, PR mutation, archive, spec sync, deployment, merge, or run-state writes.

#### Scenario: Automated and build gates run

- **WHEN** final implementation verification executes
- **THEN** focused suites SHALL pass, `yarn build:excalidraw` SHALL pass before `yarn test:typecheck`, and both SHALL use the same recorded source fingerprint

#### Scenario: Final artifact audit runs

- **WHEN** the change is ready for local delivery
- **THEN** strict UTF-8/no-BOM checks, JSON/YAML parsing, PNG signature/hash checks, scenario/task uniqueness, baseline completeness/write audit, dependency/license scope, public-export, design-token, `!important`, marker, whole-editor overflow, debug residue, originality, restricted-term, and diff-whitespace audits SHALL pass

#### Scenario: Known-flaky broad snapshots differ

- **WHEN** a broad unrelated snapshot remains flaky or differs outside a directly migrated adapter
- **THEN** it SHALL NOT be updated merely to make this child pass, and focused suites plus the declared browser matrix SHALL remain the acceptance gate

#### Scenario: Local delivery completes

- **WHEN** all implementation, independent review, delta-review, automated, browser, performance, and audit gates are clean
- **THEN** the change MAY create one local child commit while portfolio-level push, PR, archive, spec sync, deployment, merge, and run-state operations remain untouched
