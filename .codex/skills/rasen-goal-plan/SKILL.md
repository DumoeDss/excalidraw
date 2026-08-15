---
name: rasen-goal-plan
description: Goal-loop define-goal stage (planner role) — produces goal-plan.md with the goal, a measure XOR evaluate gate, work product, and maxRounds. Does NOT produce proposal/design/specs.
license: MIT
compatibility: Requires rasen CLI.
metadata:
  author: rasen
  version: "1.0"
  generatedBy: "0.1.7-dev.local.1"
---

Define the goal and gate for a goal-loop task — produce goal-plan.md.

**Store selection:** If the user names a store (a store is a standalone Rasen repo registered on this machine) or the work lives in one, run `rasen store list --json` to discover registered store ids and project ids (the `type` field on each entry), then pass `--store <id>` (or `--project <id>` for a project registered via `store add-project`) on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `retain prepare`, and the top-level `context`). The `rasen pipeline` inspection group (`pipeline list`, `pipeline show`, `pipeline agents`, `pipeline classify`, `pipeline resume`) also accepts `--store <id>`/`--project <id>` and resolves its root exactly like `validate` — in a store- or project-scoped run you MUST thread the SAME flag onto `pipeline resume <change>` so it reads the change's run-state from that root's change directory, not the cwd. `--store` and `--project` are mutually exclusive on one invocation — pass only one. A store and a project may share the same id (they are separate namespaces); a bare id with neither flag always means the store namespace. On `retain prepare` these two flags select the planning root only; its knowledge-owner selectors are the separate `--owner-store`/`--owner-project`, and the change's planning root must agree with the space the session plans in. Commands outside those groups do not take either flag — in particular `rasen agent context` (the agent-runtime probe) is NOT the same command as the top-level `rasen context` and does NOT accept `--store`/`--project`; do not paste either flag onto it. Hints printed by commands already carry the right flag; keep it on follow-ups. Without a store or project flag, commands act on the nearest local `rasen/` root.

You are the **planner** for a goal-driven iteration loop. Your output is the contract the implementer iterates against and the LEAD injects before round 1. You do NOT produce proposal.md / design.md / specs — a goal-loop is condition-driven, not document-driven.

## Input

The task description (what condition the user wants driven to satisfaction) plus any change-directory context. If the task is ambiguous about the success condition, clarify it before proceeding; do not invent a gate the user did not ask for.

## Output: goal-plan.md

Write `goal-plan.md` to the change directory with these fields:

```markdown
# Goal Plan

## Goal
<one-to-three sentence NL success criterion — what "done" means>

## Gate
<exactly ONE of the following>

### measure  (quantifiable target — score / latency / memory / throughput)
- command: <shell command whose stdout is JSON { score: number, passed?: number, detail?: string }>
- threshold: <number>          # score stop threshold
- target: <number>             # optional passed-count target
- direction: gte | lte         # gte = higher is better; lte = lower is better (latency/memory)
- timeoutSec: <number>         # default 120

### evaluate  (quality judgment against a rubric)
- goal: <NL success criterion the reviewer judges>
- rubric: <optional structured rubric / acceptance bullets>

## Work Product
code | prose   # code = edit the codebase; prose = research + write a document (research pipeline)

## maxRounds
<number>   # default 5; research/evaluate MAY set lower (e.g. 3)

## blockedThreshold
<number>   # optional; default 3 when omitted. Consecutive rounds the same
           # implementer-reported blocker must recur before the loop escalates
           # it as genuinely blocked (each intervening round retried from a
           # different angle). Distinct from maxRounds and loopStallLimit. Lower
           # it for a genuinely one-shot gate; raise it for a hard research task.
```

## Choosing the gate

Pick exactly ONE gate type by task nature — never both:
- **measure** when the target is quantifiable and a deterministic command can emit `{score, passed}`. Examples: Lighthouse score, p99 latency, memory peak, benchmark throughput, test-pass count.
- **evaluate** when "done" is a quality judgment against a standard that no command can score. Examples: code-quality against a rubric, refactor cleanliness, research-report completeness.

## measure.command safety

`measure.command` is arbitrary shell. The define-goal stage carries `gate: true`, so under the default policy the user confirms the command before any round runs — but it is an ordinary gate now: under `--no-gate` or an `autopilot.gates: off` base it is auto-approved and the command runs unattended for up to `maxRounds`, unless `pipelines.<name>.gates.define-goal: on` restores the pause (autopilot-gate-policy). Prefer commands that are read-only or idempotent. State the command plainly in goal-plan.md so the user can review it at the gate. Do NOT add sandbox enforcement beyond that confirmation.

## Constraints

- Exactly ONE gate (measure XOR evaluate). Do not combine.
- The concrete `command`/`threshold` (measure) or `goal`/`rubric` (evaluate) live HERE — the pipeline YAML registers only the gate TYPE; the LEAD reads this file to inject them into `iterate.loopConfig`.
- Keep the goal falsifiable: a future round must be able to tell satisfied from not-satisfied.
- Fix the goal at its true scope. Do NOT frame success around a smaller or easier task than the user asked for — the goal you write here is the goal the gate judges every round, and the implementer is forbidden from shrinking it. State the full success condition, not a convenient subset.
- This is a planning stage. Do NOT edit code or write the work product here — that is the implementer's job in the iterate stage.
