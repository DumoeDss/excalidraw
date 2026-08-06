---
name: rasen-navigator
description: A map of this repo's skills and Rasen workflows and when to reach for each.
disable-model-invocation: true
license: MIT
compatibility: Requires rasen CLI.
metadata:
  author: rasen
  version: "1.0"
  generatedBy: "0.1.7-dev.local.1"
---

<!-- adapted from mattpocock/skills (MIT, Copyright Matt Pocock) -->

## Preamble (run first)

```bash
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
```

**Config (embedded at install time):**
- **Proactive:** `true` — if `false`, do not proactively suggest expert skills. Only invoke them when the user explicitly asks.

# Navigator

You don't remember every skill, so ask. This is the map: the Rasen **main flow** that most work travels, two **on-ramps** that merge onto it, a **vocabulary layer** that runs underneath, and **standalone** specialists off to the side. Each entry says *when to reach for it*.

## The main flow: idea → ship

The route most work travels. **`rasen-auto`** drives this whole flow autonomously — classify the task, pick the pipeline, run the stages with gates. Reach for the individual commands below when you want to run one stage by hand.

1. **`rasen-explore`** — think a rough idea through before committing to it. (Not sure it's worth building at all? Start at `rasen-office-hours-command` — see On-ramps.)
2. **`rasen-propose`** — turn the sharpened idea into a change: proposal, design, specs, and tasks.
3. **`rasen-apply-change`** — implement the tasks against the change.
4. **`rasen-review-cycle`** — iterate review → triage → fix → re-review the delta until it's clean or escalates. Lighter gate: **`rasen-verify-change`** checks the implementation matches the artifacts. Heavier: **`rasen-verify-enhanced`** adds code-review, security, and browser passes, auto-scaled to the change size.
5. **`rasen-ship`** — resolve the delivery mode (pr / push / local), test only when evidence demands it, then deliver.
6. **`rasen-retain`** — the profile's retention step, run after ship and before archive. **report** and **codify** are mutually exclusive profile-policy choices: report preserves the retrospective in `retro.md`; codify completes evidence-gated learned-skill decisions (create / rewrite / retire / no-op); `off` does neither.
7. **`rasen-archive-change`** — fold the delta specs into the main specs once the change has merged; runs after retention and never codifies.

> `rasen-retro` remains only as a temporary user-invoked compatibility alias for `rasen-retain` **report** mode. It is not part of the main flow and is neither profile-selectable nor model-invoked.

## On-ramps

A starting situation that generates work, then merges onto the main flow.

- **Something's broken** → **`rasen-investigate`**. Systematic root-cause debugging. It **refuses to hypothesise until it has a red-capable feedback loop** — one command that already goes red on *this* bug — then fixes with a regression test. Reach for it on the hard ones: the bug that resists a first glance, the intermittent flake, the regression that crept in between two known-good states.
- **Is this worth building** → **`rasen-office-hours-command`**. YC-style demand validation before you write code. Reach for it when the idea's *value*, not its design, is the open question.

## Optional long-horizon governance

- **`rasen-direction`** — establish or calibrate durable direction, select one evidence-bearing Roadmap Slice, project that Slice into `rasen-propose` or `auto-decompose`, and reconcile results afterward. Reach for it only when work spans multiple Changes, versions, horizons, projects, or recurring principle-level choices. It sits above the normal Change flow but is never a required numbered step: everyday bugs and features still move directly from exploration/office-hours to propose.
- Direction's `target-state.md` describes cross-Change workstream state. **`rasen-goal`** is different: it runs a bounded iteration toward one measure, evaluation rubric, or research gate using `goal-plan.md` and `goal-run.json`.

## Vocabulary underneath

One reference that runs *beneath* the other skills — the single source of truth for its vocabulary. Reach for it directly when the **words**, not the process, are the problem; the skills above also pull it in.

- **`rasen-codebase-design`** — the deep-module vocabulary (module, interface, depth, seam, adapter, leverage, locality) for designing a module's *shape*: a lot of behaviour behind a small interface at a clean seam.

## Standalone

Off the main flow — reach for each by name when its situation comes up.

- **`rasen-tdd`** — build one concrete behaviour test-first, red → green, when you want a test worth keeping but not a full spec.
- **`rasen-prototype`** — throwaway code that answers one design question (does this state model feel right, what should this UI look like). Keep the answer, delete the code.
- **`rasen-review`** — a **two-axis** review of a diff: **Standards** (repo conventions + a code-smell baseline) and **Spec** (faithful to the originating proposal/tasks), reported side by side. Reach for it to review a branch or PR against a fixed point.
- **`rasen-qa`** — open a real browser, find bugs, fix them, re-verify.
- **`rasen-qa-only`** — the same browser sweep as `rasen-qa`, but report-only — no code changes.
- **`rasen-design-review`** — design audit of the rendered UI with a fix loop and atomic commits.
- **`rasen-design-consultation`** — build a complete design system from scratch.
- **`rasen-benchmark`** — measure performance against a baseline.
- **`rasen-cso`** — security review from a chief-security-officer lens.
- **`rasen-codex`** — hand a task to Codex for an independent second opinion or a parallel implementation.
- **`rasen-chrome-use`** — drives your real Chrome over the DevTools Protocol (real login state, real clicks) for scripted page interaction, DOM snapshots, and network capture.

**Safety controls** — use these during risky work.

- **`rasen-careful`** — warn before destructive commands (rm -rf, DROP TABLE, force-push).
- **`rasen-investigate`** — minimise the reproduction, declare the
  evidence-backed affected area before editing, and record the reason before
  any necessary scope expansion.
- **`rasen-review`**, **`rasen-verify-change`**, and
  **`rasen-verify-enhanced`** — inspect the actual changed-file set and diff,
  and surface unexplained out-of-scope work before delivery.
- Managed daemon/ECP workspace access and sandbox policy are execution
  containment controls when a managed runner is available. Scope declaration
  and diff review are evidence disciplines; they do not mechanically deny
  writes.

**Store selection:** If the user names a store (a store is a standalone Rasen repo registered on this machine) or the work lives in one, run `rasen store list --json` to discover registered store ids and project ids (the `type` field on each entry), then pass `--store <id>` (or `--project <id>` for a project registered via `store add-project`) on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `retain prepare`, and the top-level `context`). The `rasen pipeline` inspection group (`pipeline list`, `pipeline show`, `pipeline agents`, `pipeline classify`, `pipeline resume`) also accepts `--store <id>`/`--project <id>` and resolves its root exactly like `validate` — in a store- or project-scoped run you MUST thread the SAME flag onto `pipeline resume <change>` so it reads the change's run-state from that root's change directory, not the cwd. `--store` and `--project` are mutually exclusive on one invocation — pass only one. A store and a project may share the same id (they are separate namespaces); a bare id with neither flag always means the store namespace. On `retain prepare` these two flags select the planning root only; its knowledge-owner selectors are the separate `--owner-store`/`--owner-project`, and the change's planning root must agree with the space the session plans in. Commands outside those groups do not take either flag — in particular `rasen agent context` (the agent-runtime probe) is NOT the same command as the top-level `rasen context` and does NOT accept `--store`/`--project`; do not paste either flag onto it. Hints printed by commands already carry the right flag; keep it on follow-ups. Without a store or project flag, commands act on the nearest local `rasen/` root.
