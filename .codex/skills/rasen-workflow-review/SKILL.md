---
name: rasen-workflow-review
description: Review installable workflows and pipelines independently — semantic quality, security boundaries, portability, dependencies, and completion
license: MIT
compatibility: Requires rasen CLI.
metadata:
  author: rasen
  version: "1.0"
  generatedBy: "0.1.7-dev.local.1"
---

# /workflow-review — Independent Workflow Review

Review a staged installable workflow for semantic quality, safety, and
portability. Read `checklist.md` beside this skill before reviewing. The review
is read-only unless the user separately asks for fixes.

## Preconditions

1. Review a staging directory, never the final user-wide registry.
2. Run `rasen workflow validate <path> --json` first. Static errors block the
   semantic review and must be returned to the author.
3. Do not execute scripts from the workflow.
4. When multi-agent execution is available, the reviewer must be distinct from
   the author. Otherwise declare that this is a separated second pass.

## Review procedure

Read the complete `workflow.yaml`, `SKILL.md`, and every declared sidecar.
Use `checklist.md` and verify:

- purpose, trigger, scope, inputs, outputs, completion, and escalation;
- manifest `requires` / `recommends` agreement with instruction references;
- responsibility overlap with built-in workflows and always-installed experts;
- skill identity and cross-tool portability;
- confirmation boundaries for destructive, network, secret, and external writes;
- shell interpolation, path traversal, credential handling, and absolute paths;
- profile/pipeline input-output contracts and deterministic failure behavior;
- bounded loops, recovery behavior, and a clear terminal condition.

## Findings contract

Return each real finding in this exact shape:

```text
[severity] location
Evidence: concrete text or behavior
Required fix: specific correction and acceptance condition
```

Severity is `critical`, `high`, `medium`, or `low`. Do not report stylistic
preferences as defects. End with one verdict: `APPROVE`, `CHANGES REQUIRED`,
or `BLOCK`, followed by the reason.

After fixes, rerun static validation and review only the changed surface plus
affected dependencies. A successful review is not a signature or attestation:
do not add a reviewed flag to the workflow or package, and do not import it.

## Reviewing a pipeline instead of a workflow

Run `rasen pipeline validate <path> --json` first, exactly as for a workflow —
static errors block the semantic review and go back to the author. Then read
the complete `pipeline.yaml` and check:

- **Stage-DAG acyclicity** — every stage's `requires` list resolves to a real,
  earlier stage id, with no cycle; the CLI validator already enforces this at
  parse time, so a pipeline that reaches review has passed it, but confirm the
  resulting build order still matches the author's intent.
- **Unique stage ids** — also CLI-enforced; treat a near-duplicate id
  (misleading rather than colliding) as a review finding.
- **Decompose recursion bound** — a `kind: decompose` stage's `childPipeline`
  must resolve to an installed pipeline that is itself decompose-free. Flag
  any design that assumes deeper fan-out than one level.
- **Runtime/model resolvability** — for every stage, trace the effective
  runtime (stage `runtime` > pipeline `agents.<role>` > default `claude`).
  A `codex` runtime is a portability cost: the execution preflight will
  refuse to run that stage on a machine without the codex CLI installed, so
  confirm the pipeline's docs say so and that a `claude` fallback path
  (role override or stage-level `runtime: claude`) is realistic.
- **Skill enablement** — every `standard` stage's `skill` must name a
  workflow that exists AND is enabled in the installing machine's active
  profile; a pipeline package's static validator only checks structure, not
  skill existence, so this is a review-time judgment call, not something the
  CLI already guarantees.

Apply the same static-validate-first discipline as workflow review: never
approve on the strength of `rasen pipeline validate` output alone, and never
treat a passing structural validation as evidence the pipeline's prose or
skill choices are safe or complete.

**Store selection:** If the user names a store (a store is a standalone Rasen repo registered on this machine) or the work lives in one, run `rasen store list --json` to discover registered store ids and project ids (the `type` field on each entry), then pass `--store <id>` (or `--project <id>` for a project registered via `store add-project`) on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `retain prepare`, and the top-level `context`). The `rasen pipeline` inspection group (`pipeline list`, `pipeline show`, `pipeline agents`, `pipeline classify`, `pipeline resume`) also accepts `--store <id>`/`--project <id>` and resolves its root exactly like `validate` — in a store- or project-scoped run you MUST thread the SAME flag onto `pipeline resume <change>` so it reads the change's run-state from that root's change directory, not the cwd. `--store` and `--project` are mutually exclusive on one invocation — pass only one. A store and a project may share the same id (they are separate namespaces); a bare id with neither flag always means the store namespace. On `retain prepare` these two flags select the planning root only; its knowledge-owner selectors are the separate `--owner-store`/`--owner-project`, and the change's planning root must agree with the space the session plans in. Commands outside those groups do not take either flag — in particular `rasen agent context` (the agent-runtime probe) is NOT the same command as the top-level `rasen context` and does NOT accept `--store`/`--project`; do not paste either flag onto it. Hints printed by commands already carry the right flag; keep it on follow-ups. Without a store or project flag, commands act on the nearest local `rasen/` root.
