# Final implementation Chrome evidence

## Session and acceptance boundary

- Fresh leaf target: `8E66ACC62CE92F045D7DD38AAB7C44A6`, opened from `http://localhost:3001/` through the sticky proxy on port 3456 and Chrome CDP port 9222.
- Device metrics were applied through the proxy, then independently confirmed with `/eval`: desktop `1440x900`, phone `375x812`; the editor rectangle matched each viewport exactly.
- This record supersedes earlier implementation evidence for tasks 25-28. It is implementation evidence only, never an independent review verdict.

## Personally inspected screenshots

| Screenshot | State | Accepted runtime facts |
| --- | --- | --- |
| `desktop-light-welcome.png` | light desktop welcome/host | editor `0,0,1440x900`; neutral app-content `32,32,1376x836`; Open, Help, collaboration, Sign up and Share leaves hit-test to interactive descendants; wrapper markers `0` |
| `desktop-dark-welcome.png` | dark desktop welcome | same bounds and marker neutrality; dark token treatment visually coherent |
| `desktop-light-share.png` | desktop share/collaboration | large surface `445,219.2,550x461.6`; app-content `466,295.2,504x368.6`; Start session and Export to Link visible; no content scroller required; markers `0` |
| `phone-light-welcome-host.png` | phone welcome/host fallback | editor `375x812`; app-content `32,32,311x716`; actions end at y `437.2`; bottom footer begins at y `678`, so no action is obscured; markers `0` |
| `phone-light-collaboration.png` | collaboration-only phone | large surface `20,20,335x772`; app-content `36,95,299x197.3`; Start session at `172.1,244.3,162.9x48`; document overflow remains `375x812`; markers `0` |
| `phone-light-library.png` | Library overlay/empty | overlay `82,0,293x812`, intentionally retaining an 82px canvas strip; Library app-content `83,68,288x728`; empty state `103,350,244x160`; Browse libraries `103,534,244x32` hit-tests to the anchor; markers `0` |
| `phone-dark-ai.png` | phone host AI/TTD | large surface `20,20,335x772`; app-content `36,95,299x681` with `overflow:auto`; input `65,723.4,197x43.6` and internally scrollable; markers `0` |
| `desktop-dark-ai.png` | desktop host AI/TTD | large surface `20,20,1400x860`, wholly within editor; app-content `41,96,1354x767`, internally bounded; markers `0` |
| `phone-dark-loading.png` | delayed generic loading | loading appears after the owned 250ms delay; copy remains centered and visible; established bottom shell remains separate |
| `phone-dark-error.png` | recoverable editor error | dialog stays within `20..355 x 20..792`; semantic alert copy and close action remain visible |
| `phone-dark-promo.png` | promo/comments island | 293px sidebar overlay; artwork/copy/outbound Sign up action retained; underlying canvas strip remains reachable after close |
| `desktop-dark-stats-host.png` | CustomStats/host callback island | stats island is visible at desktop and uses the shared section hierarchy; storage/version/scene rows and close action retained |

All twelve retained PNGs above were opened at original resolution. A provisional phone Stats capture was rejected because Stats is desktop-only and was deleted from retained evidence.

## Pointer, marker, overflow, checker, overlay, and console results

- Representative real hit tests resolved to the Open/Help/Share/Start session/Export/Browse/input/action leaves or their interactive descendants.
- Every inspected app-content wrapper had no `data-viewport-ui`; representative marker counts were zero.
- Share, collaboration, Library, AI, loading, error, promo, and CustomStats remained inside editor or large-surface bounds. When overflow existed, it was reachable through the adapter or surface scroller.
- The recurring mobile background/footer relationship is expected shell composition: welcome content occupies the canvas background, while actions end more than 240px above the footer. It is not content overlap.
- No bottom-left yellow badge appeared in the fresh target. The only bottom-left elements were established canvas actions/zoom controls; therefore the prior yellow badge is a dev-tool/checker status artifact, not an app-content leaf.
- Final clean hard reload: checker shadow root present with `messages: []`; checker message count `0`; visible error overlay count `0`; error-level console events `0`.

## Environment incident

- The direct CDP helper started by this leaf stalled while attached. Its exact owned process (`cdp-target.mjs ... 8E66... metrics`, PID 39880) was verified and terminated; Chrome, Vite, and the sticky proxy were not stopped or restarted. Proxy-native device metrics then succeeded and were independently confirmed by `/eval`.
