# VHR-R1-004 atomic fix report

## Status

**IMPLEMENTED AND ATOMICALLY EVIDENCED, WITH DISCLOSED PROXY PROCESS DEGRADATION — OPEN pending non-author reviewer disposition and integration reruns.** The retained six-file input implementation was independently audited rather than accepted from the retired worker. Real Chrome receipts now prove target-scoped coarse/fine application before navigation, exact post-navigation readback, mounted editor responsive projection, a current full mounted-editor contract test, and exact capability restoration. This fixer also repaired a newly reproduced sticky-proxy session leak in the DevTools helper cleanup path.

The complete visual scenarios are not claimed green. `phone-light-library` and `desktop-welcome` passed their 004 input gates and then stopped at a separate exact-target trusted-keyboard verification. The short-landscape 004 contract was therefore captured through a narrower real-Chrome receipt without executing or certifying the toolbar interaction. No candidate or canonical baseline was written or promoted.

`VHR-R1-004` remains **OPEN** until the original reviewer independently repeats the affected scenarios and adjacency risks.

## Independent retained-line audit

Every retained 004 seam in the six files named by the predecessor handoff was read and checked against the review finding, design, and specification:

1. `scripts/visual-regression/types.ts`
   - `VisualInputProfile` distinguishes exact fine/coarse pointer, hover, numeric-or-preserved touch points, and browser versus mounted-editor acceptance.
   - `VisualInputCapabilities` records fresh observed values rather than requested metadata.
   - `VisualMountedInputReceipt` is source-fingerprint-bound and requires a passing full mounted-editor test.
2. `scripts/visual-regression/scenarios.ts`
   - Fine input is `fine / hover / preserve`.
   - Both phone scenarios are `coarse / no-hover / 1 / mounted-editor` and require touch-density responsive assertions.
3. `scripts/visual-regression/browserScripts.ts`
   - The acceptance expression reads `matchMedia` and `navigator.maxTouchPoints` from the navigated document.
   - Mounted acceptance requires exactly one interactive editor root with `phone / phone / touch` and a non-empty responsive signature.
4. `scripts/visual-regression/runner.ts`
   - Input application occurs after viewport setup and before navigation.
   - The navigated document is freshly queried after preparation/readiness; a browser mismatch or mounted projection mismatch fails immediately.
   - Coarse scenarios require the current source fingerprint's full mounted-editor receipt.
   - Browser input restoration is registered on the LIFO cleanup stack and `restoredExactly` is mandatory before target close.
5. `scripts/visual-regression/proxy.ts`
   - The target is attached through its exact internal inspection session; the inspected session verifies the temporary title marker before accepting the channel.
   - Commands use target-scoped `Emulation.setTouchEmulationEnabled` and `Emulation.setEmulatedMedia`; no JavaScript capability monkeypatch is present.
   - Prior, expected, immediate actual, and restored actual capabilities are fresh reads.
   - Fine input preserves the physical touch count instead of pretending the mixed-input host has zero touch points.
6. `scripts/visual-regression/visual.unit.test.ts`
   - Focused coverage proves exact CDP commands, apply/readback/restore order, mismatch failure and cleanup, coarse manifest/root requirements, exact auxiliary target-tree selection, and the proxy's empty success response for non-page cleanup.

No simplified DOM pointer event, direct product-state mutation, assertion weakening, tolerance change, mask change, public API, or external source was introduced by this atomic work.

## Narrow cleanup repair

The input commands themselves were sound, but navigation while the internal DevTools page stayed attached created two auxiliary targets that the sticky proxy also attached to:

- an internal formatting worker;
- a DevTools extension iframe.

Both target infos had `parentId` equal to the exact helper DevTools target. Closing only the page target removed the visible tab but left those two target ids in the proxy's in-memory session map.

The repair is deliberately target-specific:

- `ownedAuxiliaryTargetIds()` follows only the exact DevTools target's `parentId` tree, including nested descendants;
- unrelated or parentless targets are excluded;
- those exact auxiliary ids are closed before the helper page;
- the adapter accepts the proxy's empty HTTP 200 response for successful non-page cleanup while still rejecting non-2xx responses;
- helper cleanup failures remain reported instead of being suppressed.

The actual source/test change made by this successor is limited to `scripts/visual-regression/proxy.ts` and `scripts/visual-regression/visual.unit.test.ts`. The other four 004 files were retained after independent semantic audit.

## Focused verification

- `yarn test:visual:unit` — **PASS, 40/40**.
- `yarn test:app --run packages/excalidraw/tests/interactivity.test.tsx -t "uses the complete mounted-editor pointer-aware activation authority"` — **PASS, 2/2; 81 skipped**.
  - The mounted application receives pen pointer down/up/click through the complete test harness on desktop and phone form factors.
  - The resulting editor state requires the text tool plus `penMode=true` and `penDetected=true`.
- Exact-file Prettier check over all six 004 files — **PASS**.
- Exact-file ESLint over all six 004 files — **PASS**.
- Strict UTF-8 decode for the six files — **PASS**; no BOM, replacement character, or known mojibake signature.

## Real Chrome receipts

Chrome used the existing sticky proxy on port 3456, the app on port 3001, and disposable exact target ids. The proxy was never stopped or restarted.

### Portrait coarse receipt

- Prior: `fine / hover / 10`.
- Requested: `coarse / no-hover / 1 / mounted-editor`.
- Immediate actual: `coarse / no-hover / 1`.
- Actual after navigation: `coarse / no-hover / 1`.
- Mounted root: `tier=phone`, `adapter=phone`, `density=touch`, non-empty responsive signature.
- Browser match: `true`.
- Mounted projection match: `true`.
- Restored: `fine / hover / 10`.
- Restored exactly: `true`.
- Two exact helper auxiliary targets closed.
- Proxy before/after: `sessions=21`, `managedTabs=0`; exact targets absent.

The full `phone-light-library` run `fixer-004b-phone-light-3` independently reached input acceptance, all phone responsive/geometry/Library assertions, and screenshot capture. It then stopped at the separate exact-target trusted-keyboard gate. Lifecycle cleanup reported no failure, the input profile restored exactly, and the proxy remained `21 / 0`.

### Short-landscape coarse receipt

- Prior: `fine / hover / 10`.
- Immediate and post-navigation actual: `coarse / no-hover / 1`.
- Mounted root: `phone / phone / landscape / short / touch`, with a non-empty responsive signature.
- Browser and mounted projection matches: `true`.
- Restored: `fine / hover / 10`; exact match `true`.
- Two exact helper auxiliary targets closed.
- Proxy before/after: `21 / 0`; exact targets absent.

This receipt intentionally does not claim the toolbar interaction sequence. That interaction remains owned by its separate finding.

### Fine desktop adjacency receipt

- Prior: `fine / hover / 10`.
- Requested: `fine / hover / preserve / browser`.
- Immediate and post-navigation actual: `fine / hover / 10`.
- Mounted root: `desktop / desktop / compact`, with a non-empty responsive signature.
- Browser match: `true`.
- Restored exactly: `true`.
- Two exact helper auxiliary targets closed.
- Proxy before/after: `21 / 0`; exact targets absent.

The full `desktop-welcome` attempt reached input acceptance and then stopped at the same separate exact-target trusted-keyboard gate before screenshot capture. Its cleanup and proxy counts remained clean.

## Personal image inspection

All 14 PNGs retained by this successor were opened and inspected, not inferred from DOM data:

| Evidence group | PNG count | Dimensions | Key hashes | Inspection disposition |
| --- | --: | --- | --- | --- |
| `fixer-004b-phone-light-1` | 4 | 375×812 | evidence/current `753e6147…`; viewport `f6d7ecb3…`; diff `6aacfa7d…` | Localized empty-Library drift and visible red checker badge; rejected as acceptance evidence. |
| `fixer-004b-phone-light-2` | 4 | 375×812 | evidence/current `82108902…`; viewport `3fce8ddc…`; diff `1ea20a2c…` | Populated Library and phone shell visible; red checker badge and large stale-baseline diff; diagnostic only. |
| `fixer-004b-phone-light-3` | 4 | 375×812 | evidence/current `6aba6f40…`; viewport `59808d0b…`; diff `23533e61…` | Latest populated Library/phone capture; red checker badge remains; diagnostic only. |
| `fixer-004b-desktop-fine-direct.png` | 1 | 1440×900 | `ae1db8eb…` | Desktop shell and compact toolbar visible; red checker badge; not a scenario baseline. |
| `fixer-004b-phone-dark-direct.png` | 1 | 812×375 | `e19c959a…` | Short touch toolbar projection visible and bounded; red checker badge; not a scenario baseline. |

The checker badge conflicts with earlier detector claims of zero overlays. None of these images may be promoted. The integration fixer must resolve the badge/detector mismatch before producing fresh candidates.

## Sticky-proxy lifecycle and process degradation

The initial inherited health was `sessions=18`, `managedTabs=0`. A pure `about:blank` helper lifecycle temporarily moved `18 → 21 → 18`, proving that the three page targets themselves close correctly.

Navigation reproduced the missing auxiliary cleanup. Before the repair:

- the first full phone attempt left `18 → 19`;
- an instrumented navigation probe left `19 → 21`;
- those stale target ids were already closed and the running proxy exposes no safe endpoint to enumerate or delete closed session-map keys;
- restarting the proxy merely to clear the count was forbidden, so the inherited process now remains at 21.

One early diagnostic difference probe also sent an exact close to a newly started, unattached extension service worker because it initially selected every new non-page target. It was not a page or ordinary tab and was not used as evidence, but the action was broader than necessary. That approach was rejected. The delivered implementation does **not** use time-window difference or attached-state heuristics; it follows only the exact helper page's `parentId` tree.

After the repair, every subsequent navigation receipt and full-scenario failure path remained `21 → 21`, with `managedTabs=0`, no `visual-input-*` title, no inspection page, no DevTools page, and every exact owned target absent. No ordinary page/tab was closed. This report does not conceal the net diagnostic increase from 18 to 21.

## Retired-worker formatter collateral audit

The exact 32 paths numbered in `handoff/fixer-004.md` were audited without rewriting them:

- 27 JSON files strictly decode as UTF-8, parse, and preserve semantic equality through parse/stringify/parse round trips.
- The nine run inventories retain required envelope fields and unchanged before/after canonical hashes.
- The 17 result reports retain their required result/evidence fields and self-consistent report paths.
- `.rasen/changes/visual-regression-hardening/ephemera/auto-run.json` retains a valid `pipeline`/six-stage envelope. It is the sole path that does not currently satisfy Prettier check; it was not rewritten because run-state ownership belongs to the lead.
- `manual-replay.md` contains all 20 current manifest scenario identities.
- `handoff/implementer-2.md` retains its intent, position, done/remaining, decisions, dead ends, eliminated hypotheses, working set, and next-action sections.
- The three code files in the collateral set are covered by the focused semantic audit/tests above.
- All 32 have no BOM, replacement character, or known mojibake signature.
- Current semantic audit aggregate: `948e4f70de3a9b71f9173c0fa2809d31981442c873b5c105e5bac764a42b8f23`.

These files were untracked when the retired worker ran the broad formatter, and no pre-command bytes or semantic hashes exist. Therefore this audit proves current validity, round-trip semantics, cross-artifact structure, and retained Markdown anchors; it does **not** pretend to recover or prove the original whitespace or an unavailable before/after byte identity.

## Fingerprints and baseline governance

- Current six-path 004 fingerprint, sorted `path + NUL + bytes + NUL`: `b272e6b40677e92127f8c7c856ba6b3780ea55d717e705fa985351eb7a395723`.
- Current full implementation source fingerprint over 32 allowed sources: `9282a3e1a0660cb4f32795e321157838b6fb367aa03a57d79f181df3011110f8`.
- Canonical baseline directory hash: `8fcb425de07249e7f93eae0c23cda149b39333fc939882d97a51ef8f852c9188` — unchanged.
- No update mode, promotion, canonical write, task/run-state edit, commit, push, archive, or spec sync occurred.

## Reviewer and integration remainder

The non-author reviewer must independently verify:

1. coarse portrait and short-landscape browser values before/after navigation;
2. exact phone root projection plus a current full mounted-editor receipt;
3. fine desktop preserve behavior;
4. exact restoration and helper auxiliary cleanup without session-map growth from the reviewer's starting count;
5. complete affected scenarios after the separate trusted-input findings are green;
6. fresh images only after the checker badge/detector mismatch is resolved.

## Durable findings

1. Closing a DevTools page is insufficient when the sticky proxy auto-attaches helper workers or extension iframes; cleanup must follow the exact helper target's `parentId` tree before closing the parent.
2. A browser input claim needs three independent facts: target-scoped application before navigation, fresh navigated-document readback, and a source-bound full mounted-editor receipt.
3. Formatter collateral in untracked artifacts can be audited for current parse/round-trip semantics and structural anchors, but historical whitespace or unavailable pre-command identity must remain explicitly unproven.

`VHR-R1-004` remains **OPEN pending original reviewer disposition and integration reruns**.
