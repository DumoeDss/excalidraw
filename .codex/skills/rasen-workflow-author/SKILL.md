---
name: rasen-workflow-author
description: Author installable workflows and pipelines safely — stage, statically validate, independently review, and import only with user approval
license: MIT
compatibility: Requires rasen CLI.
metadata:
  author: rasen
  version: "1.0"
  generatedBy: "0.1.7-dev.local.1"
---

# /workflow-author — Installable Workflow Authoring

Create a portable user workflow through a staging directory. The Rasen CLI's
static validator is the security boundary; semantic review is a separate
quality gate. Never edit the user-wide workflow registry directly.

## 1. Define the contract

Before writing files, establish these six items with the user. Ask only for
information that cannot be inferred from the repository or request:

1. Purpose — the bounded job this workflow owns.
2. Trigger — when an agent should select it.
3. Inputs — required files, arguments, and preconditions.
4. Expected output — files, decisions, or reports it produces.
5. Completion condition — observable proof that the workflow is done.
6. Prohibited actions — destructive, network, secret, or external-write boundaries.

## 2. Check the library and choose staging

Run `rasen workflow list --json` and inspect workflow IDs and skill names
before choosing a portable lowercase ID. Pick a writable staging
directory outside the final user-wide registry. Then scaffold explicitly:

```sh
rasen workflow init <id> --output <staging-parent>/<id>
```

If the environment cannot write the user-wide library, that is acceptable:
finish in staging and hand the user the validated path and exact import command.

## 3. Author the smallest source tree

Edit only `workflow.yaml`, `SKILL.md`, and sidecars that are actually needed.

- Put workflow dependencies in `requires.workflows`, not only in prose.
- Put always-installed expert dependencies in `requires.skills`.
- Put optional related workflows in `recommends.workflows`.
- Optionally declare a human-readable display title in the manifest's
  `skill:` block (`name` is required inside the block; `category` and
  `tags` are optional; there is no `enabled` field). Pickers show the title
  verbatim, and `rasen workflow list --json` / `show` expose it as `title`.
- Declare every sidecar and script in the manifest.
- Keep paths relative and portable; never embed an absolute machine path.
- Do not add binary files, generated output, credentials, or machine metadata.
- Do not execute sidecar scripts while authoring, validating, or importing.

## 4. Static validation loop

Run `rasen workflow validate <staging-path> --json`. Fix every error by its
stable diagnostic code and repeat until the result is valid. Warnings must be
reported and either resolved or explicitly explained; never hide them.

## 5. Independent semantic review

Invoke `rasen-workflow-review` on the validated staging directory. When
multi-agent execution is available, dispatch a reviewer that did not author the
draft. Otherwise perform a clearly separated second pass using the review
checklist. Static validity does not replace this review.

Apply required findings in staging, then run
`rasen workflow validate <staging-path> --json` again until it is valid.

## 6. Handoff and optional import

Present:

- the staged file tree;
- workflow ID and skill identity;
- required and recommended dependencies;
- every declared script and its purpose;
- the final validation result and content digest;
- unresolved warnings or semantic risks.

Do not install implicitly. Only after the user asks to install, run:

```sh
rasen workflow import <staging-path>
rasen workflow validate <id> --json
rasen workflow show <id> --json
```

If import is unavailable, return the exact command instead. Never claim that a
workflow was imported, reviewed, or validated unless that action actually ran.

## 7. Authoring a pipeline instead of a workflow

A pipeline is a different unit than a workflow: it sequences multiple workflow
runs (stages) rather than describing one. The same staging discipline applies
— author in a draft directory, statically validate, review, then import only
on request.

Scaffold and iterate with:

```sh
rasen pipeline init <name> --output <staging-path>
rasen pipeline validate <staging-path> --json
```

Author `pipeline.yaml` with only the fields the pipeline needs:

- `stages` — an ordered list, each with a unique `id`.
- `skill` — required on every `standard` stage; the workflow it dispatches
  (must be an installed, enabled skill — check `rasen workflow list --json`).
- `kind: decompose` — a fan-out stage that runs a `childPipeline` per child
  change instead of dispatching a skill directly. Omit `skill` on these
  stages. The referenced child pipeline must itself be decompose-free — a
  decompose stage cannot fan out into another decompose stage.
- `role` — one of `planner`, `implementer`, `reviewer`, `fixer`,
  `shipper`; ties the stage to the pipeline's per-role `agents` block.
- `runtime` — `claude` or `codex`, either per-stage or per-role under the
  top-level `agents` block (stage overrides the role default). Only use
  `codex` where the LEAD's non-interactive `codex exec` bridge is the
  intended dispatch path; the pipeline execution preflight will refuse to run
  a codex stage on a machine without the codex CLI, so document that
  requirement for whoever installs the pipeline.
- `gate` — `true`/`false` for a human-confirmation pause before the stage
  (`true` pauses by default). Every gate is individually controllable via
  `pipelines.<name>.gates.<stage>`, so under `--no-gate` or an autopilot
  gate-off base a `true` gate is auto-approved unless a per-stage `on`
  instance restores the pause.
- `loop` — attaches a review-cycle or goal-loop shape to the stage; only add
  it when the stage genuinely iterates.

Run `rasen pipeline validate <staging-path> --json` after every edit; fix
every diagnostic before moving on. Once valid, hand the user the exact import
command rather than importing implicitly:

```sh
rasen pipeline import <staging-path>
rasen pipeline validate <name> --json
```

Structural validation (parsing, schema, stage-DAG shape) is the CLI's job and
its security boundary. It does not check whether the pipeline's skills exist
or are enabled on the installing machine, or whether its prose is safe to
run — that is why the review step below and the trust-boundary section in
`docs/workflow-packages.md` both matter: a package (workflow or pipeline) is
executable prompt content, not sandboxed data.

**Store selection:** If the user names a store (a store is a standalone Rasen repo registered on this machine) or the work lives in one, run `rasen store list --json` to discover registered store ids and project ids (the `type` field on each entry), then pass `--store <id>` (or `--project <id>` for a project registered via `store add-project`) on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `retain prepare`, and the top-level `context`). The `rasen pipeline` inspection group (`pipeline list`, `pipeline show`, `pipeline agents`, `pipeline classify`, `pipeline resume`) also accepts `--store <id>`/`--project <id>` and resolves its root exactly like `validate` — in a store- or project-scoped run you MUST thread the SAME flag onto `pipeline resume <change>` so it reads the change's run-state from that root's change directory, not the cwd. `--store` and `--project` are mutually exclusive on one invocation — pass only one. A store and a project may share the same id (they are separate namespaces); a bare id with neither flag always means the store namespace. On `retain prepare` these two flags select the planning root only; its knowledge-owner selectors are the separate `--owner-store`/`--owner-project`, and the change's planning root must agree with the space the session plans in. Commands outside those groups do not take either flag — in particular `rasen agent context` (the agent-runtime probe) is NOT the same command as the top-level `rasen context` and does NOT accept `--store`/`--project`; do not paste either flag onto it. Hints printed by commands already carry the right flag; keep it on follow-ups. Without a store or project flag, commands act on the nearest local `rasen/` root.
