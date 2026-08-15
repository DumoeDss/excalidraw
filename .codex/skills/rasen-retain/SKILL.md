---
name: rasen-retain
description: "Policy-driven retention runner: routes to report (retrospective) or codify (managed learned skills), or no-ops when retention is off."
license: MIT
compatibility: Requires rasen CLI.
metadata:
  author: rasen
  version: "1.2"
  generatedBy: "0.1.7-dev.local.1"
---

Policy-driven retention runner. Resolve exactly one retention mode, then load ONLY the matching branch. report and codify are mutually exclusive — never run both.

**Store selection:** If the user names a store (a store is a standalone Rasen repo registered on this machine) or the work lives in one, run `rasen store list --json` to discover registered store ids and project ids (the `type` field on each entry), then pass `--store <id>` (or `--project <id>` for a project registered via `store add-project`) on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `retain prepare`, and the top-level `context`). The `rasen pipeline` inspection group (`pipeline list`, `pipeline show`, `pipeline agents`, `pipeline classify`, `pipeline resume`) also accepts `--store <id>`/`--project <id>` and resolves its root exactly like `validate` — in a store- or project-scoped run you MUST thread the SAME flag onto `pipeline resume <change>` so it reads the change's run-state from that root's change directory, not the cwd. `--store` and `--project` are mutually exclusive on one invocation — pass only one. A store and a project may share the same id (they are separate namespaces); a bare id with neither flag always means the store namespace. On `retain prepare` these two flags select the planning root only; its knowledge-owner selectors are the separate `--owner-store`/`--owner-project`, and the change's planning root must agree with the space the session plans in. Commands outside those groups do not take either flag — in particular `rasen agent context` (the agent-runtime probe) is NOT the same command as the top-level `rasen context` and does NOT accept `--store`/`--project`; do not paste either flag onto it. Hints printed by commands already carry the right flag; keep it on follow-ups. Without a store or project flag, commands act on the nearest local `rasen/` root.

## 1. Prepare the run: resolve the mode, freeze identity for codify

- Run `rasen retain prepare <change> --json` before creating any candidate (thread the same `--store`/`--project` selector used for the change). This is the ONE Rasen-owned operation that reports the effective retention mode, freezes or reuses this change's durable knowledge identity, and returns the absolute `runStateDir`. It works for a change that never ran through a classified pipeline and therefore has no run-state at all.
- Pass the returned `runStateDir` as `--run-state-dir "<runStateDir>"` on every project/store knowledge command so the CLI loads and revalidates BOTH frozen identities. A `--project`/`--store` supplied there remains only a consistency check; a conflicting selector is an error and the CLI never falls back to the new cwd.
- `prepare` keeps its two selectors separate: `--store`/`--project` pick the PLANNING ROOT (the same selector the change itself uses), and `--owner-store`/`--owner-project` pick the KNOWLEDGE OWNER independently. Pass an owner selector only when zero-selector resolution requests one; an owner selector that disagrees with an already-recorded identity is refused, never applied.
- `contextSource: "recorded"` means the change already carried a `knowledgeContext`: it is authoritative at ANY version, was left exactly as written, and was NOT upgraded in place. `contextSource: "prepared"` means preparation froze it now. Either way the reported identity is the one to use — never hand-write run-state, never synthesize an owner, and never derive one from the cwd, a directory basename, candidate evidence, or model output.
- `contextSource: "skipped"` means neither the effective mode nor a mode frozen in run-state is `codify`, so preparation resolved and wrote NOTHING — no `knowledgeContext`, no run-state file, no change to any learning state. That is the expected outcome under `off` and `report`, which never read a frozen identity; it is not a failure and there is nothing to repair. The reported `runStateDir` is where durable state WOULD live, not a claim that it exists. Preparing again once the effective mode is `codify` freezes the identity then.
- If preparation fails, pause before candidate creation and report the condition it named (ambiguous, missing, renamed, or stale ownership; an owner selector conflicting with a recorded identity; an unreadable run-state). Direct store planning does not imply a member project.

## 2. Use the frozen mode or the reported standalone mode

- When dispatched for any pipeline stage whose canonical ID is `retain`, use the retention mode the LEAD froze in run-state before dispatch (`rasen pipeline resume <change> --json`, or the `frozenRetention` field `rasen retain prepare` reports). The LEAD is the sole writer of the `retention` field; this worker never records or changes it.
- On resume, always reuse that recorded mode. Never re-read the current profile for a canonical `retain` stage; a profile edit mid-run SHALL NOT switch the branch.
- Only for a standalone invocation outside a canonical `retain` stage, use the `retention` value `rasen retain prepare` reported. That is the EFFECTIVE mode — the same resolution that decides whether a project-scoped lesson may be applied — so it answers even when no `retention` key was ever stored. It is exactly one of `off`, `report`, or `codify`.

## 3. Dispatch

- **off** → Complete immediately as a successful no-op. Do NOT load `report.md` or `codify.md`, write a retrospective report, or change any learned-skill state.
- **report** → Read and follow this skill's `report.md` sidecar. Do NOT read `codify.md`, and do NOT create, update, promote, or retire a learned skill.
- **codify** → Read and follow this skill's `codify.md` sidecar. Do NOT read `report.md`. codify v1 requires a specific change; if none can be resolved, fail with an actionable error.

Archive runs after retention completes; archive itself never reports or codifies.
