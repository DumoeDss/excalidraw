---
name: rasen-chrome-use
description: Browser QA via CDP — drive the real Chrome browser through a local proxy for DOM snapshots, clicks, network capture, screenshots, and responsive audits
license: MIT
compatibility: Requires rasen CLI.
metadata:
  author: rasen
  version: "1.0"
  generatedBy: "0.1.7-dev.local.1"
---

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
```

**Config (embedded at install time):**
- **Proactive:** `true` — if `false`, do not proactively suggest expert skills. Only invoke them when the user explicitly asks.

# chrome-use: Browser QA via CDP

Drives the user's **everyday Chrome** over the Chrome DevTools Protocol (CDP)
through a sticky local HTTP proxy on port 3456. No headless binary, no
Playwright — it inherits the real browser's login state and fingerprint. Use it
for QA on pages that need auth, dynamic/SPA rendering, or resist bots, and for
browser-layer network capture, DOM snapshots, performance metrics, and
responsive audits.

## SETUP (run first, every session)

```bash
node "${CLAUDE_SKILL_DIR}/scripts/check-deps.mjs"
```

`check-deps.mjs` verifies Node, detects Chrome's debugging port, and starts the
CDP proxy if it is not already running. Expect output like `node: ok`,
`chrome: ok (port NNNN)`, `proxy: ready`.

**Prerequisites:**
- **Chrome** running with remote debugging enabled. If `check-deps.mjs` reports
  `chrome: not connected`, tell the user to open `chrome://inspect/#remote-debugging`
  and tick **Allow remote debugging** (Chrome must be running first).
- **Node 22+** (the proxy uses the native `WebSocket`). Older Node prints a warning.

**First-connection permission popup:** the **first** CDP connection triggers a
Chrome **"Allow"** authorization popup. If `check-deps.mjs` hangs on
`proxy: connecting...`, it is waiting on that popup — tell the user to click
**Allow**, then it finishes with `proxy: ready`. This only happens once per
Chrome session.

**Sticky proxy — never stop it.** The proxy binds port 3456 and stays resident;
a restart forces re-authorizing CDP (another Allow popup). Do **not** `pkill` it
between commands. `check-deps.mjs` reuses a healthy running instance. Logs go to
`os.tmpdir()/cdp-proxy.log`.

**Tab lifecycle (per-`targetId`, shared proxy).** The proxy is shared across
sub-agents; isolate your work by tab:
- `GET /new?url=URL` opens a **background** tab and returns `{targetId}`. Use this
  `targetId` on every subsequent call as `?target=<id>`.
- `GET /close?target=<id>` closes it when done. Managed tabs also auto-close after
  ~15 min idle.
- Emulation overrides (`/viewport`, `/responsive`) persist on the tab; reset via
  `/viewport` or just close the disposable tab.

## Core patterns (curl against http://localhost:3456)

```bash
BASE=http://localhost:3456
# --noproxy '*' on every call: a configured HTTP(S)_PROXY otherwise hijacks
# localhost and returns 502.

# open a disposable tab, capture its id
TAB=$(curl --noproxy '*' -s "$BASE/new?url=https://yourapp.com" | jq -r .targetId)

# verify a page loads
curl --noproxy '*' -s "$BASE/info?target=$TAB"                       # title / url / readyState
curl --noproxy '*' -s "$BASE/text?target=$TAB&selector=.main-content"
curl --noproxy '*' -s "$BASE/console/enable?target=$TAB"; curl --noproxy '*' -s "$BASE/console?target=$TAB&level=error"

# interact
curl --noproxy '*' -s -X POST "$BASE/click?target=$TAB" -d '#submit'     # JS-layer click (CSS selector in body)
curl --noproxy '*' -s "$BASE/screenshot?target=$TAB&file=/tmp/shot.png"

# reverse-engineer a request (browser-layer capture)
curl --noproxy '*' -s "$BASE/network/enable?target=$TAB&body=true"
curl --noproxy '*' -s "$BASE/network/wait?target=$TAB&url_pattern=/api/.*/submit&method=POST&timeout=60000&include_body=true"

# close when done
curl --noproxy '*' -s "$BASE/close?target=$TAB"
```

## Browser-QA endpoints

```bash
# structured interactive DOM snapshot (parity with browse snapshot -i/-C/-D)
curl --noproxy '*' -s "$BASE/snapshot?target=$TAB"            # interactive elements w/ @ref, role, name
curl --noproxy '*' -s "$BASE/snapshot?target=$TAB&mode=C"     # + non-ARIA clickables (@c refs)
curl --noproxy '*' -s "$BASE/snapshot?target=$TAB&mode=D"     # diff vs previous snapshot: added/removed

# performance metrics (FCP/LCP/CLS + long tasks + nav/resource timing)
curl --noproxy '*' -s "$BASE/perf?target=$TAB"

# device viewport emulation — does NOT resize the real window
curl --noproxy '*' -s "$BASE/viewport?target=$TAB&width=375&height=812&scale=2&mobile=true"

# responsive audit across mobile/tablet/desktop breakpoints (optional per-bp screenshot)
curl --noproxy '*' -s "$BASE/responsive?target=$TAB&screenshot=true&dir=/tmp"
```

Take `/snapshot` in pairs (baseline, then `mode=D` after an action) to see exactly
what changed. `/perf` returns whatever metrics the page has produced — a background
tab that never rendered reports `null` paint/`lcp` plus a `visibility`/`note`; pass
`&activate=true` to briefly foreground it and sample real paint (`lcp` reads from a
buffered observer, so any once-rendered tab already has it).

## Full endpoint reference

The complete API — navigation, input, network capture, waiting, console,
storage, DOM shortcuts, resources/iframes, and the QA endpoints above — is in
`references/cdp-api.md` beside this skill. Core primitives: `/health` `/targets`
`/new` `/close` `/navigate` `/back` `/info` `/eval` `/click` `/clickAt`
`/setFiles` `/scroll` `/screenshot` `/network/*` `/wait` `/console/*`
`/cookies` `/localStorage` `/text` `/attribute` `/resources` `/iframes`.

## Show screenshots to the user

After `/screenshot` or `/responsive` writes a PNG, use the Read tool on the
output file so the user can actually see it — otherwise the screenshot is invisible.

**Store selection:** If the user names a store (a store is a standalone Rasen repo registered on this machine) or the work lives in one, run `rasen store list --json` to discover registered store ids and project ids (the `type` field on each entry), then pass `--store <id>` (or `--project <id>` for a project registered via `store add-project`) on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `retain prepare`, and the top-level `context`). The `rasen pipeline` inspection group (`pipeline list`, `pipeline show`, `pipeline agents`, `pipeline classify`, `pipeline resume`) also accepts `--store <id>`/`--project <id>` and resolves its root exactly like `validate` — in a store- or project-scoped run you MUST thread the SAME flag onto `pipeline resume <change>` so it reads the change's run-state from that root's change directory, not the cwd. `--store` and `--project` are mutually exclusive on one invocation — pass only one. A store and a project may share the same id (they are separate namespaces); a bare id with neither flag always means the store namespace. On `retain prepare` these two flags select the planning root only; its knowledge-owner selectors are the separate `--owner-store`/`--owner-project`, and the change's planning root must agree with the space the session plans in. Commands outside those groups do not take either flag — in particular `rasen agent context` (the agent-runtime probe) is NOT the same command as the top-level `rasen context` and does NOT accept `--store`/`--project`; do not paste either flag onto it. Hints printed by commands already carry the right flag; keep it on follow-ups. Without a store or project flag, commands act on the nearest local `rasen/` root.
