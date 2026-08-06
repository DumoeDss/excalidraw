---
name: rasen-review-cycle
description: Iterative review loop — review, triage, fix, re-review the delta, repeat until clean or escalate. Multi-agent path is primary (distinct reviewer/fixer workers, Tier A SendMessage warm resume); single-context is the fallback. Delegates each pass to rasen-review; enforces author != verifier and a max-rounds cap.
license: MIT
compatibility: Requires rasen CLI.
metadata:
  author: rasen
  version: "1.0"
  generatedBy: "0.1.7-dev.local.1"
---

Iterative review loop — drive a change to actually-clean: review the diff, triage findings, fix, re-review only the delta, and repeat until clean or escalate to a human.

**Store selection:** If the user names a store (a store is a standalone Rasen repo registered on this machine) or the work lives in one, run `rasen store list --json` to discover registered store ids and project ids (the `type` field on each entry), then pass `--store <id>` (or `--project <id>` for a project registered via `store add-project`) on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `retain prepare`, and the top-level `context`). The `rasen pipeline` inspection group (`pipeline list`, `pipeline show`, `pipeline agents`, `pipeline classify`, `pipeline resume`) also accepts `--store <id>`/`--project <id>` and resolves its root exactly like `validate` — in a store- or project-scoped run you MUST thread the SAME flag onto `pipeline resume <change>` so it reads the change's run-state from that root's change directory, not the cwd. `--store` and `--project` are mutually exclusive on one invocation — pass only one. A store and a project may share the same id (they are separate namespaces); a bare id with neither flag always means the store namespace. On `retain prepare` these two flags select the planning root only; its knowledge-owner selectors are the separate `--owner-store`/`--owner-project`, and the change's planning root must agree with the space the session plans in. Commands outside those groups do not take either flag — in particular `rasen agent context` (the agent-runtime probe) is NOT the same command as the top-level `rasen context` and does NOT accept `--store`/`--project`; do not paste either flag onto it. Hints printed by commands already carry the right flag; keep it on follow-ups. Without a store or project flag, commands act on the nearest local `rasen/` root.

This workflow does NOT reimplement the reviewer — each review pass delegates to the always-installed `rasen-review` engine. It does NOT reimplement the orchestration — it runs on the shared LEAD orchestration playbook below. It owns: change selection, the loop bound, fix-size triage, the author != verifier invariant, and the cycle report.

**The multi-agent path is PRIMARY.** Review, fix, and re-review run as distinct role-isolated workers. Dispatch the reviewer and fixer **LOOP_BOUND** (playbook Step B.4): between rounds each parks warm in `rasen agent wait` and the LEAD delivers the next round's brief as a `resume` signal file — never `SendMessage` to a parked worker (mid-turn delivery rebases its cache; the park exists to preserve it). On Claude Code with agent-teams (Tier A), a reviewer that already COMPLETED its turn (not parked, or stood down at its beat cap) is resumed via `SendMessage` to re-review only the delta — within the SAME session. Across a session boundary (`SendMessage` cannot reach a worker from a prior session) the LEAD instead warm-seeds a fresh reviewer from the original reviewer's recorded transcript (playbook Step F.1), so it still re-reviews only the delta with the prior findings in hand. Single-context execution is the explicit FALLBACK (Tier C), used only when the tool has no subagent capability — NOT the baseline.

## When to Use

Use when: "review cycle", "keep reviewing until clean", "drive the findings to closure", "iterate on the review", "loop the review", "make sure the fixes actually got re-reviewed".

Use this AFTER implementation, against the live diff. For a single one-shot verification gate, use `rasen-verify-enhanced` instead; this command is the loop that wraps a reviewer and keeps going.

## The Loop

```
review -> triage -> fix -> re-review(delta) -> { pass | loop | escalate }
```

Run rounds until a review pass returns no unresolved Blocker or Major findings, OR the max-rounds cap is reached. Default cap: 3. On hitting the cap with unresolved Blocker/Major findings, do NOT loop further and do NOT silently pass — run the playbook's **Step H.5/H.6 escalation ladder**: a LEAD strategy review where each retry changes a material variable (different fix approach or seeding, design-level rework via the planner, isolating the stubborn finding), recorded in `strategyAttempts`; when the strategy budget is exhausted, park the change as `escalated` with the full history and surface it at the next natural pause point for the human.

### Select the change

If a change name is provided, use it. Otherwise infer from context, auto-select if only one active change exists, or run `rasen list --json` and prompt. Initialize round counter `r = 1` and read the configured/argument max-rounds (default 3).

## Run the loop via the orchestration playbook

Execute **Step E (the review -> fix loop)** of the playbook below against the current diff. Tier detection (Step A), role-isolated dispatch (Step B), the author != verifier enforcement (Step C), and run-state (Step F) all apply — they are how this loop achieves a structurally independent re-review rather than a same-context promise.

## Orchestration Playbook — LEAD drives role-isolated subagents

You are the **LEAD**. You orchestrate; you do NOT author WHOLE stage outputs yourself. **Exception:** you MAY apply a **trivial inline fix** per Step E.2 (a one-character typo, an obvious rename) — which is then re-reviewed by a non-author like any other fix; a trivial finding does NOT warrant spawning a separate fixer worker. Anything larger than a trivial inline fix is authored by a dispatched worker, never by you. Each pipeline stage is dispatched to a **leaf worker** subagent that invokes that stage's existing Rasen skill and returns its result to you. Workers never spawn their own subagents — you are the sole orchestrator (flat hierarchy: LEAD + leaf workers).

### Step A — Detect the capability tier (once, at start)

- Run `rasen pipeline show <name> --for-execution --json` once, appending every run-local role flag supplied to this workflow (for example `--planner codex --reviewer claude`), and consume its detected `hostRuntime`, `hostRuntimeSource`, and per-stage `runtime`, `runtimeSource`, `dispatchMode`, and `bridge`. Do not infer the host independently from whichever worker tool happens to be visible.
- **Tier A (native):** the host's native leaf-worker tools are available. On a Claude host this is the existing Task/Agent + `SendMessage` lifecycle. On a Codex host this is `spawn_agent`, `send_message`, `followup_task`, and `wait_agent`; native Codex completion is the worker's final response, which is delivered to the LEAD automatically.
- **Tier B (no warm continuation):** native spawning is available but the host cannot warm-continue a completed worker. Spawn a FRESH worker per stage/round and reconstruct its context from the change directory + run-state (and, when available, the prior worker's recorded transcript — Step F.1).
- **Tier C (degraded fallback):** No subagent capability. Execute the pipeline sequentially in a single context. This is the explicit fallback, NOT the primary path.

For Claude native dispatch, agent-teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) enables `SendMessage` re-engagement of a worker by its **agentId** in general — but it does NOT guarantee a COMPLETED worker is reachable. So record **agentId** + **transcript**, re-engage **agentId-first**, and fall back to the transcript warm-seed of Step F.1. Only the LEAD may originate `SendMessage`; it is within-session only.

Record the detected host, tier, and each stage's dispatch mode in run-state. The pipeline definition is identical across hosts; only the mechanics below differ.

### Step A.1 — Resolve each agent runtime (Claude or Codex)

Each stage has an effective **runtime** and **dispatch mode**. The execution view returned in Step A is the authoritative FINAL plan: because Step A forwarded the invocation role flags, the registry has already applied each run-local choice before route validation. Do not apply or validate the flags a second time after preflight. The reported precedence is:

1. Per-invocation role overrides from the user, e.g. `--planner codex --reviewer claude --fixer codex`.
2. The registry execution view: config role instance, then stage declaration, then `agents.<role>`, then the detected host runtime.
3. Only when the host has no dispatch adapter — unidentified, OR identified with no adapter for it — preserve the legacy Claude fallback and label the route `legacy-fallback`; never describe that compatibility result as confident host-native dispatch.

The mandatory `--for-execution` call computes every override's route against the same detected host and rejects an unsupported final route before any worker launches. Supported roles are `planner`, `implementer`, `reviewer`, `fixer`, and `shipper`. A single run may mix runtimes only where the host route matrix supports it.

The supported matrix is: Claude host → Claude worker `native`; Claude host → Codex worker `exec-bridge` with bridge `codex-exec`; Codex host → Codex worker `native`; Codex host → Claude worker `exec-bridge` with bridge `claude-print`. A host with no dispatch adapter — an unknown host, or a named one like `omp` — uses `legacy-fallback` only, and reports `runtimeSource: legacy-default` with a named host rather than `unknown`: treat that pair as the legacy compatibility route (Tier C, Step B.3), NOT as a contradiction of the detected host. Never silently substitute a different runtime for an explicit choice.

### Step B — Dispatch a stage to a role-isolated worker

For each stage, dispatch a worker of the stage's **role** using the effective runtime from Step A.1.

For a **Claude-native** stage, spawn a worker and have it invoke the stage's **skill** via the Task tool, e.g.:

> Task tool (subagent_type: "general-purpose", prompt: "You are the <role> for change '<name>'. Use the Skill tool to invoke <skill>. Read rasen/changes/<name>/ for context. <stage-specific instructions>. Return <what the LEAD needs back> via `SendMessage` to the LEAD — not solely as your final turn's plain-text output, which the LEAD may never observe. Do only this one unit of work — do NOT spawn subagents of your own; the LEAD owns all orchestration. <handoff clause — Step H.3>")

For a **Codex-native** stage, call `spawn_agent` with a concrete leaf task and record the returned **agent id**. Use `send_message` only for intermediate guidance while that worker is running, and `followup_task` to start a new turn when an existing worker is idle. The worker's final `DONE` or `HANDOFF` response is delivered to the LEAD automatically: do NOT send a duplicate completion message. Collect independent work as it arrives. Call `wait_agent` only at a true dependency barrier where no useful local or sibling work remains, and prefer one long, barrier-sized event-driven wait over repeated 30- or 60-second polling cycles. Repeated `Waiting for agents` loops are orchestration churn, not a required Codex protocol.

Every dispatch prompt MUST end with the handoff clause of **Step H.3** (triggers + the structured `DONE`/`HANDOFF` return contract) — a worker that runs out of context mid-stage hands its work to a successor instead of silently degrading. The handoff document is runtime-agnostic; a Claude bridge `sessionId` or Codex bridge `threadId` is only an optimization for its route.

Isolation comes from the separate worker context — that is what keeps one stage's noise out of the next. Hand off between stages through the per-class landing directories Step F resolves and defines — the **change directory** (proposal.md, design.md, tasks.md, specs/) for review material, the **evidence directory** (review-report.md, ship-log.md, and the rest of the report set) for evidence, the **handoff directory** for handoff documents, and the **ephemera directory** for run-state and the rest of the process ephemera — never through shared memory. Use `SendMessage` only to continue a conversation with a worker you already spawned (Tier A), not as the inter-stage state channel. When you have several consecutive instructions ready for the same live (not parked) worker and do not need an intermediate result between them, combine them into a single `SendMessage` rather than sending them separately — each delivery rebases the worker's conversation and re-taxes its cache, so batching pays that cost once instead of once per instruction.

A worker MUST leave its stage's durable artifact before returning — its conversation output alone is NOT a handoff. In particular, the generic expert skills (review / cso / qa / qa-only / benchmark / design-review), when dispatched, run report-only (see their PREAMBLE "Dispatched vs standalone mode") and write their findings — tagged with canonical severities — to the canonical report file in the **evidence directory** THEMSELVES (Step F's resolved `evidenceDir`, under its sticky-legacy chain), not to their standalone `.rasen/*-reports/` paths: `review-report.md` (code review), `cso-report.md` (security), `qa-report.md` (qa or qa-only), `benchmark-report.md` (performance), `design-review-report.md` (design). The worker that invokes them verifies the report is present before returning. State the target report path in the dispatch prompt's stage-specific instructions. These files are what the resume artifact cross-check, `ship`'s verification pre-flight, and `retain` (report mode) consume.

For a **Claude exec-bridge** stage (bridge `claude-print`), first compose the complete stage prompt into a bounded UTF-8 prompt file: inline the selected workflow template and skill body, name the change/work artifact paths, include the Step H.3 return clause, and make the worker's author-or-verifier role explicit. Then run the shipped bridge command:

```
rasen agent dispatch --runtime claude --prompt-file <prompt.txt> \
  --contract <leaf|evaluate> --sandbox <read-only|workspace-write> \
  --cwd <exact-working-directory> --timeout-ms <bounded-ms> \
  [--model <model>] [--effort <effort>] [--resume <exact-session-id>] --json
```

The bridge sends the prompt through stdin (never argv), requests Claude print mode with strict JSON Schema, maps read-only/workspace-write to the corresponding Claude permission mode, and denies `Agent`, `Task`, team, and messaging tools. Its named `CLAUDE_FLAT_HIERARCHY_GUARD` makes the worker a leaf: it performs the stage itself and may not spawn, delegate, message, resume, or wait on subagents. Parse the command's one JSON receipt and accept stage results only when `ok: true`; the receipt then supplies `sessionId`, `cwd`, and the validated `result`. A `DONE`/`HANDOFF` leaf result or evaluate result is authoritative; free-form prose is not.

For continuation, invoke the same command with the exact recorded `--resume <sessionId>` and exact recorded `--cwd <cwd>`. Never use a "latest" session, never substitute the current directory, and never run two writers against one session ID. Independent session IDs may run in parallel. A Claude exec worker is a bounded print process, not a native parked agent: do NOT use `SendMessage`, `rasen agent wait`, or the signal-file parking protocol for it. Classify `failure.kind` before reacting: input/runtime/spawn/resume-cwd/session-busy/contract failures are actionable and not blind-retry candidates; timeout/output-limit/nonzero failures follow Step H.4a after inspecting the bounded diagnostics. Record the receipt before choosing exact-session retry/resume or document/transcript reconstruction.

For a **Codex exec-bridge** stage, dispatch a leaf worker as a `codex exec` process — the shipped invocation shape (`src/core/codex`'s `buildCodexExecInvocation`), rendered as the shell command you actually run:

```
codex exec --json --output-schema <schema.json> -o <last-message.txt> \
  -s <read-only|workspace-write> -m <model> -c model_reasoning_effort="<effort>" \
  "<inlined template + task prompt + flat-hierarchy guard>" < /dev/null
```

Non-negotiable invariants, not style preferences:

- **Always redirect stdin from `/dev/null`.** `codex exec` blocks forever awaiting EOF otherwise.
- **Always end the prompt with the flat-hierarchy no-delegation guard** (the library's `CODEX_FLAT_HIERARCHY_GUARD` constant — paraphrase it, do not skip it: it tells the worker it is a leaf and must not spawn, delegate, or wait on sub-agents under any circumstances). Codex's native multi-agent system is hierarchical by default and only prompt-level suppression is verified to work.
- **Never dispatch a leaf worker at `ultra` reasoning effort.** `ultra` auto-delegates to sub-agents, which breaks the flat-leaf invariant; use `xhigh` for the hardest leaf work instead.
- **Inline template and skill bodies into the prompt client-side** — never rely on Codex resolving a prompt file on its own (`$CODEX_HOME/prompts`); that path fails silently rather than erroring, so a worker that was supposed to receive a skill body can silently run without it.
- **Constrain worker returns with the structured-return contract.** Write the leaf-return schema to a schema file and pass it via `--output-schema`; parse the `-o` last-message file as strict JSON against that schema — do not accept free text as a worker's structured result.

Use `workspace-write` only for artifact-writing roles such as planner or explicitly approved fixing work; use `read-only` for reviewers, leadReview checks, and re-review.

When you spawn a worker, record its identity in run-state (Step F) FROM THE SPAWN RESULT: Claude-native workers record **runtime=claude**, **dispatchMode=native**, **role**, **agentId**, and **transcript**. Claude exec-bridge workers record **runtime=claude**, **dispatchMode=exec-bridge**, **role**, the receipt's exact **sessionId** and **cwd**, and any surfaced **transcript**/**sandbox**/**model**/**effort** metadata; never invent a native `agentId` or Codex `threadId`. Codex-native workers record **runtime=codex**, **dispatchMode=native**, **role**, and the returned **agentId**; record a transcript only if the host actually surfaces one, and never invent a `threadId` or `turnId`. Codex exec-bridge workers record **runtime=codex**, **dispatchMode=exec-bridge**, **role**, **threadId** (from the `--json` stream's `thread.started` event), **sandbox**/**model**/**effort**, and the rollout file path as **transcript**. Codex exec mode yields NO turn id. NEVER record a fabricated `name` in place of these handles. If a spawn result did not surface a handle, record what you have and flag it for the next dispatch — do not invent one.

### Step B.2 — Codex exec-bridge lifecycle (resume, death, failure, occupancy, parallelism)

- **Resume.** Re-engage an existing Codex worker with `codex exec resume <threadId> --json --output-schema <schema.json> -o <last-message.txt> -m <model> -c model_reasoning_effort="<effort>" "<message>" < /dev/null` — same capture flags and closed stdin as a fresh dispatch, including `--output-schema` whenever the resume expects a structured return (a completion-shaped "finish the remaining tasks" nudge still needs the leaf-return contract; omit it only for a genuinely free-form conversational nudge) — but with **NO `-s`/`--sandbox`**: sandbox mode is fixed at thread creation and `codex exec resume` rejects the flag outright. If a resume needs a different sandbox, that requires a fresh thread, not a resume call. Always resume by explicit `threadId` — there is no "latest thread" form (racy under parallel dispatch).
- **Death detection.** A Codex thread is dead-in-flight when the rollout's last turn-opening event (`task_started`) has no following turn-closing event (`task_complete` or `turn_aborted`) — this is the real rollout event vocabulary; the dotted `turn.*` names belong to `codex exec --json`'s stdout stream, not the rollout file. A rollout with no opener at all is idle, not dead.
- **Revival.** When re-engaging a thread that died mid-turn, prepend a revival notice to the resume message (the library's `CODEX_REVIVAL_NOTICE` semantics): the interrupted turn's last action may not have completed — do not trust that turn's claims about command or file state, re-verify before continuing.
- **Failure handling.** Classify a failed turn before deciding how to react: a rate-limit failure (429) is retryable — back off and retry starting around 20s, doubling each attempt, capped at 120s; a model-not-available failure (404) is fatal — do not retry, surface it; anything else is unknown — escalate per the Step H.4a worker-death taxonomy rather than guessing.
- **Occupancy.** Probe a Codex worker's context the same way as a Claude worker — `rasen agent context --transcript <rolloutPath> --json` — under the SAME thresholds (Step H); a zero-turn rollout legitimately reads 0% occupancy, that is normal, not an error.
- **Parallel discipline.** Any number of independent `codex exec` processes may run concurrently, each on its own thread — that is safe and verified. NEVER run two concurrent resumes against the SAME thread id: one thread id, one writer, always.

### Step B.3 — Codex project-context guidance

Pass per-change context to a Codex worker by **naming the change directory's artifact paths in the dispatch prompt** (e.g. "Read `rasen/changes/<name>/proposal.md`, `design.md`, and `tasks.md` before starting") — this is a verified mechanism, workers genuinely read referenced files, not an aspiration. Reserve repo-root `AGENTS.md` for repo-global conventions that apply to every worker regardless of change; it is NOT a per-change context vehicle. Do NOT relocate or `cd` a worker into a change directory to trigger nested `AGENTS.md` auto-discovery as a substitute for naming files explicitly.

### Step B.4 — Parked-worker keepalive (`rasen agent wait`)

At run start, the LEAD reads the effective `keepalive.enabled` entry ONCE for the current planning context (project > global > registry default `true`) through the effective-config view and snapshots that policy for the whole run. Before each stage dispatch, combine that snapshot with the stage route already resolved in Step A.1: **ONLY `keepalive.enabled=true` AND Claude `native` dispatch may receive a reusable horizon supported by this pipeline**. When the switch is disabled OR the route is not Claude-native (including `claude-print`), dispatch the stage as `ONE_SHOT`. A gate-forced `ONE_SHOT` prompt names only that horizon; it MUST omit the `rasen agent wait` loop, signal-file resume/stand-down protocol, parking timeout, and the raw switch value. The LEAD owns this decision — leaf workers never receive or re-resolve the switch.

Subagent prompt caches expire after ~5 minutes of idling; a worker resumed after that pays a full-context cache rewrite, and a `SendMessage` delivered to it rebases its conversation and forces the same rewrite even sooner. When a worker will be needed again shortly, park it WARM instead of letting it idle: the worker stays in its turn and calls `rasen agent wait --change <name> --role <key>` in a loop, acting on each returned JSON — `{beat, remaining}`: **emit no text and no deliberation — immediately re-issue the identical wait call** (each continuation stays a pure tool-result extension of the cached prefix); `{resumed, instruction}`: perform the instruction; `{standDown, reason}`: stand down (below). Each beat is a bounded blocking poll of `<changeRoot>/signals/<key>.json`, so every continuation stays a clean cache extension. The beat length resolves from config: an explicit `--beat-seconds` flag wins, else `keepalive.beatSeconds` (registry default 270 — near the optimal refresh cadence for the ~5-minute cache TTL), else a built-in 100s fuse when config is unreadable or the on-disk value is out of range; the 300s TTL hard cap always applies. A worker cannot read config, so **every park dispatch prompt MUST require the worker to issue its `rasen agent wait` call with an explicit Bash tool `timeout: 330000` (ms) named in the same sentence as the wait call** — a fixed constant covering the maximum 280s beat plus margin, so a configured beat is never killed mid-poll by the tool's default 120s timeout (which would silently defeat the keepalive). On the first beat of an episode the command discards any signal file older than ~2 minutes — a leftover standDown from a previous park cannot insta-kill a new one. The command self-limits: a uniform beat cap (12 beats for every role ≈ 54 minutes at the default beat — the economic stop-loss backstop, not the primary retirement mechanism), and route gating (Claude-native on, `claude-print` and Codex off — bounded bridge processes and non-Claude cache models do not park, so those workers follow the normal retire path). There is NO context floor by default — park any worker with scheduled reuse regardless of size (`keepalive.contextFloor` in config can re-enable a floor, enforced only when `--context-tokens` is passed).

**Reuse horizons — decide at dispatch, and SAY it in the dispatch prompt:**
- **ONE_SHOT** (default; ship, archive, every parallel fan-out member, any worker with no scheduled reuse): never calls `wait`; DONE → exit.
- **LOOP_BOUND** (review-loop reviewer/fixer): parks between rounds; stands down when the loop exits (clean or cap). The same horizon covers the **apply implementer**: when a review/verify stage immediately follows apply, dispatch it to park pending the first review verdict rather than leaving it un-parked to idle out its cache. Stand it down through the normal stand-down protocol when that first verdict is clean; when the verdict routes a fix back to it, deliver the fix through the signal protocol below, not `SendMessage`.

**LEAD signal protocol (the ONLY channel to a parked worker):** write `{"kind":"resume","instruction":"<next unit of work>"}` or `{"kind":"standDown"}` to `<changeRoot>/signals/<key>.json` — atomically (write a temp file in the same directory, then rename). NEVER `SendMessage` a parked worker: mid-turn delivery rebases its conversation and destroys exactly the cache the park is preserving (`SendMessage` rules for non-parked workers are unchanged). The worker consumes the signal file on read. **Write the `standDown` signal the moment a parked worker is no longer needed** — prompt stand-down is the retirement mechanism; the beat cap is only a stop-loss backstop for when you forget, never the intended way a park ends.

**Stand-down protocol (any `standDown` reason):** the worker writes/refreshes its handoff distillate per Step H.3, returns `DONE` with durable findings, and exits, freeing its slot. The LEAD treats a stood-down worker as retired — a successor is cold-seeded from the dispatch brief + handoff document, never resumed. Do NOT park across long or unbounded gaps (a long intervening stage, an open-ended human gate): the beat cap will burn out first — retire instead.

**Long-running-command warming (same cache discipline, applied to a worker's OWN commands):** a command a worker expects to run longer than ~2 minutes, or of unknown duration (test suites, builds), MUST run via the shell tool's background mode (`run_in_background`) paired with bounded FOREGROUND polling at intervals of at most 270 seconds — NOT a single blocking foreground call that idles past the cache TTL, and NOT a fire-and-forget background wait that idles until a completion notification. Two rationales, both load-bearing: a backgrounded command's completion notification can be lost (the original long-task discipline), and each foreground poll return refreshes the prompt cache exactly as a beat does (the keepalive rationale). Short, sub-2-minute commands stay in the foreground. The 270-second polling bound is a FIXED figure — it does NOT track `keepalive.beatSeconds`.

### Step C — Enforce author != verifier by role assignment

- The reviewer worker MUST NOT be the implementer worker.
- The fixer of a design-level finding MUST NOT be the original author.
- The worker that re-reviews a fix MUST NOT be the worker that authored the fix.

Under Tier C (single context) the non-author confirmation degrades to an independent gate-run (tests/lint/build) plus a diff-read of the exact change, recorded in run-state and marked as the fallback.

### Step E — The review -> fix loop (bounded; this is the review-cycle inner loop)

When a stage is a **loop**, narrow on `loop.kind`:

- **`loop.kind === 'review-cycle'`** runs the review -> fix protocol below (Steps 1–5). The steps are unchanged.

**Per-role threshold inside a loop stage.** A loop stage carries a single nominal `role` (e.g. a review-loop stage's `role: fixer`), but it dispatches reviewers, implementers, AND fixers internally. Resolve EACH dispatched worker's handoff threshold by that worker's ACTUAL role — `handoff.roles[<dispatched role>]` (Step H) — NOT by the loop stage's nominal `role`. A reviewer dispatched inside a `review-loop` stage uses the **reviewer** threshold, not the stage's fixer threshold.

For a **review-cycle** loop:

1. **Review** — dispatch reviewer worker(s), delegating each pass to the `rasen-review` engine, over the current diff; collect findings with severity (Blocker / Major / Minor / Trivial). Do NOT fork or reimplement the review heuristics.
2. **Triage by fix size** — trivial (you fix inline) / non-trivial (route to the implementer worker that wrote the code) / design-level (route to a SEPARATE fixer worker, never the author). If that implementer is parked pending its first review verdict (Step B.4), route the fix through the Step B.4 signal-file protocol, not `SendMessage` — mid-park delivery rebases its cache and defeats the purpose of parking it.
3. **Fix** via the routed actor; capture the exact fix delta so re-review can target only the delta.
4. **Re-review the delta with a non-author** — **Parked reviewer first (Step B.4):** when the reviewer was dispatched LOOP_BOUND and is parked in `rasen agent wait`, write a `resume` signal carrying the delta pointer — do NOT `SendMessage` it (mid-turn delivery rebases its cache). With a reviewer that already COMPLETED its turn (not parked), apply the Step H.2 warm-continue guard, then continue it through the stage's recorded route: Claude-native uses `SendMessage` by agentId; Codex-native uses `followup_task` by agent id; Claude exec-bridge uses `rasen agent dispatch --resume <sessionId> --cwd <cwd>`; Codex exec-bridge uses `codex exec resume <threadId>`. Re-review only the delta against its prior findings. Across a session boundary, resume the route's durable session/thread by its explicit ID; when a native reviewer has no live handle, warm-seed a fresh reviewer from that reviewer's recorded handoff/transcript pointers (Step F.1) so it carries the prior findings. Tier B/C: a fresh reviewer over just the delta, with prior findings + fix diff passed through a shared file. A finding is resolved ONLY after a non-author confirms it; self-certification by the fixer is rejected.
5. **Loop or terminate** — all Blocker/Major resolved (non-author confirmed) -> clean. Resolvable findings remain AND rounds < cap -> next round, re-review the new delta. Cap reached with any unresolved Blocker/Major -> do NOT stop for a human immediately: run the **Step H.5/H.6 escalation ladder** — a LEAD strategy review where each retry changes a material variable (different fix approach, design-level rework via the planner, isolating the stubborn finding), recorded in `strategyAttempts`; only after the strategy budget is exhausted is the stage parked as `escalated` and surfaced at the next natural pause point. Default cap: 3. A review round MAY span multiple worker relays (a fixer that hands off mid-fix is relayed within the same round); the round cap (`loop.maxRounds`) and the relay cap (`maxRelays`) are INDEPENDENT counters — see the counter table in Step H. Never report clean while a Blocker or Major finding is open. Any open Minor/Trivial findings at clean-time MUST be recorded in run-state as accepted-known — never silently dropped.

### Step F — Maintain run-state (observability + resume)

First resolve the change's landing directories: run `rasen status --change <name> --json` (or the artifact/apply instructions payload, which also carries them) and read the `changeRoot` field (NOT `changeDir`) — the change's directory under the SELECTED Rasen root, which for a `--store`-selected or non-cwd run is NOT under the current working directory — plus `evidenceDir`, `handoffDir`, and `ephemeraDir`. All three are always present and absolute; they derive from the planning and execution roots alone, so they resolve even for a project with no machine identity. A `workDir` field, when the payload still carries one, is the LEGACY machine-home work directory: a read-only location for files that already live there, never a landing point.

**Per-class blackboard.** Each artifact lands in its class's directory, always at the ABSOLUTE path the payload reports — never at a cwd-relative `rasen/changes/<name>/`, or a store-selected run strands it where a resumer (resolved to the same root) cannot find it:

- **Review material** — proposal.md, design.md, tasks.md, specs/, planning-context.md — under `changeRoot`.
- **Evidence** — review-report.md, cso-report.md, qa-report.md, benchmark-report.md, design-review-report.md, review-cycle-report.md, verification-report.md, ship-log.md — under `evidenceDir` (`<changeRoot>/evidence/`), so it travels with the change into the Archive.
- **Handoff** — handoff documents and relay prompts — under `handoffDir` (`<changeRoot>/handoff/`).
- **Ephemera** — run-state (auto-run.json), raw logs, captures, and other regenerable intermediates — under `ephemeraDir` (`<executionRoot>/.rasen/changes/<name>/ephemera/`, in the code checkout this run operates on). Whether it enters Git is the user's `.gitignore` decision alone; Rasen writes no ignore rules.

A store-selected run splits the two roots: review material, evidence, and handoff land store-side at the payload's absolute paths, while ephemera lands in the code checkout's ephemera directory.

**Sticky-legacy chain (stated once; every path elsewhere in this playbook follows it): a file that ALREADY exists at a legacy location — the machine-home `workDir`, or `changeRoot` itself for a change predating these directories — keeps living there. Never split one file's state across locations, and never migrate one as a side effect of touching it. Anything NEW always starts at its class's directory above.**

Record progress as JSON in `<ephemeraDir>/auto-run.json` (sticky-legacy: an `auto-run.json` that already exists in the legacy `workDir` or in `changeRoot` is updated in place). This exact filename + JSON shape is what `rasen pipeline resume` reads — do NOT write markdown or a different name, or resume will not see it; resume reports the directory it actually read as `runStateDir` — write further updates to that SAME directory rather than re-deriving the location. Minimum shape the reader understands:

```json
{
  "pipeline": "small-feature",
  "classification": "small-feature",
  "tier": "A",
  "stages": {
    "propose": { "status": "done", "worker": { "role": "planner", "agentId": "<id>", "transcript": "<project>/<session-id>/subagents/agent-<id>.jsonl" } },
    "verify":  { "status": "done", "worker": { "role": "reviewer", "agentId": "<id>", "transcript": "<project>/<session-id>/subagents/agent-<id>.jsonl" } },
    "apply":   {
      "status": "in_progress",
      "worker": { "role": "implementer", "agentId": "<id>" },
      "handoffs": [ { "n": 1, "path": "<handoffDir>/implementer-1.md", "reason": "compaction", "completed": ["1.1","1.2"], "remaining": ["1.3"], "at": "<iso>" } ],
      "strategyAttempts": [ { "round": 3, "action": "re-prompt", "rationale": "<why this changes the outcome>", "result": "<what happened>" } ]
    }
  },
  "sessionHandoff": { "n": 1, "path": "<handoffDir>/lead-1.md", "pct": 0.52, "afterStage": "apply", "at": "<iso>" },
  "rounds": 0,
  "openFindings": []
}
```

`status` is pending | in_progress | done | skipped | escalated | delegated; `delegated` is parent-stage-only, and **done | skipped | delegated** count as complete for resume. (A simpler `"completed": ["propose","apply"]` array is also accepted when you are not recording per-stage workers.) Record each dispatched worker's **role**, **runtime**, **dispatchMode**, and only the identity pointers actually returned by that route (Step B). Also record review `rounds`, `openFindings`, any skips/escalations, per-stage `handoffs` and `strategyAttempts` (Step H), and the top-level `sessionHandoff` when the session itself hands off. `sessionHandoff.n` is the session RELAY GENERATION (the example seeds it at `1`); Step H.7 caps it at `maxRelays`, and a `sessionHandoff` record written WITHOUT `n` reads as generation 1 and never advances — so always carry `n` and increment it each session relay, or the H.7 cap can never trip. Subagent work is otherwise opaque; this record is what lets the run be observed and resumed.

**Handoff pointers are ABSOLUTE.** Every `path` in `handoffs[]` and in `sessionHandoff` records the document's absolute location (the `handoffDir` one, or the legacy location the series actually uses). Run-state and handoff documents no longer share a parent — run-state is under `ephemeraDir`, documents under `handoffDir` — so a bare `handoff/<role>-<n>.md` has no base a reader can trust, and `rasen pipeline resume` prints these pointers next to `runStateDir`. Records written before this rule hold a relative path; resolve those against the change directory.

**Write canonical values only (host-runtime neutrality).** `worker.runtime` MUST be exactly `claude` or `codex`, and `worker.dispatchMode` MUST be exactly `native`, `exec-bridge`, or `legacy-fallback`. The runtime means which known worker runtime ran the stage, not what host is the LEAD. Never write JSON `null` for an absent optional field (`transcript`, `agentId`, `sessionId`, `cwd`, `threadId`, etc.) — OMIT the key instead. Archived records without `dispatchMode` remain valid: readers infer `exec-bridge` from a Claude `sessionId` or Codex `threadId`, `native` from a native `agentId`/Claude transcript, and otherwise keep the ambiguity explicit with a compatibility warning. Writers always emit the known mode.

### Step F.1 — Resume a run (cold start: a planned relay OR an unexpected interruption — crash, power loss, socket-close, killed terminal)

A new session has NO live **native** workers: Claude-native `SendMessage` and Codex-native `followup_task` cannot cross a host-session boundary; their agentIds die there. Claude exec-bridge `sessionId + cwd` and Codex exec-bridge `threadId` are process-durable: resume Claude with `rasen agent dispatch --resume <sessionId> --cwd <cwd>`, and Codex with `codex exec resume <threadId>`. Within a live session, use the recorded route-specific handle first, but a COMPLETED native worker may not resolve and a spawn `name` is never a handle. After an interruption, resume the exact bridge session/thread directly; otherwise seed a fresh native worker from its handoff, then its surfaced transcript. Do NOT reconstruct from artifacts while those pointers exist — they preserve findings, dead ends, and in-flight reasoning. To resume:

1. Run `rasen pipeline resume <name> --json` → it returns `completed`, the next incomplete stage(s) (`next`/`ready`), `remaining`, `workers` (the per-stage native `agentId`/`transcript`, Claude `sessionId + cwd`, or Codex `threadId` pointers), and — so nothing is silently stranded — `inProgressStages` (interrupted; re-engage these), `escalatedStages`, and `openFindings` (unresolved Blocker/Major — never ship past them). Run-state status is AUTHORITATIVE; artifact presence is a cross-check.
2. **Handoff document first, transcript second.** Seed from the latest holder's own `handoffs[]` (or LEAD `sessionHandoff`) before its transcript; the document is cheaper and cleaner. Mid-flight death produces no `HANDOFF`: native dispatch falls to step 3, while Claude exec-bridge first resumes its exact `sessionId + cwd` and Codex exec-bridge first resumes its `threadId`. A newer intact transcript beats an older generation's document. In the same live session, first try Claude-native `SendMessage` by agentId, Codex-native `followup_task` by agent id, Claude bridge dispatch with exact session/cwd, or Codex bridge resume by `threadId`; fall back when absent/unresolved, and never use a spawn `name`.
3. **Warm-seed, don't cold-restart.** When you must re-engage a prior role (e.g. re-review a fix, or continue an interrupted stage), spawn a FRESH worker of that role and seed it with its predecessor's context. Use the recorded transcript path when the route surfaced one. For Claude-native only, when the path is missing but agentId exists, GLOB `<claude-projects>/<cwd-as-slug>/**/subagents/agent-<agentId>.jsonl` (the `agent-<agentId>.meta.json` sidecar confirms its role). For Codex-native, use a transcript only when the host actually surfaced it — never invent one. Read the available context, extract the relevant prior findings/reasoning, and pass them into the new worker's prompt ("Here is what your predecessor established: …"). The new worker has a new agentId but carries the prior context — functionally a resumed reviewer.
4. **Fallback when the transcript is gone** (pruned / expired / unavailable): cold-reconstruct from the change directory + run-state alone (the Tier B path), and record in run-state that this resume was a cold reconstruction.

Within a live session, prefer Claude-native `SendMessage`, Codex-native `followup_task`, Claude exec-bridge continuation by exact `sessionId + cwd`, or Codex exec-bridge resume by `threadId`. Native handles fall back to warm-seeding and die across host sessions; bridge sessions/threads remain resumable across processes. Claude transcript globbing is not a Codex-native assumption.

### Step H — Context sensing & the handoff protocol

Agents cannot feel their own context usage; they MEASURE it. `rasen agent context` reads exact occupancy from a transcript's recorded API usage — `--latest` probes your own (the LEAD's) main session, `--transcript <path>` probes a worker via the pointer recorded in run-state (Step B). Probe ONLY at the discrete decision points below. NEVER inject a running token countdown into any agent's context — it breaks the prompt-cache prefix and induces premature wrap-up (context anxiety).

Resolve each dispatched worker's handoff threshold with its **actual dispatched role** and **effective runtime**, in this exact order: configured `pipelines.<name>.handoff.<stage>` instance > stage YAML `handoff` > runtime-bound threshold scheme (`handoffRoles[<actual role>]` before the scheme scalar) > pipeline YAML `handoff.roles[<actual role>]` > pipeline YAML `handoff.threshold` > legacy project `handoff.roles[<actual role>]` > project `handoff.threshold` > inherited-store role > inherited-store scalar > global role > global scalar > model preset (the suggested `handoffThreshold` of the resolved model) > built-in default `0.5`. Binding candidates are row-first: the worker's explicit effective-runtime row at project, store, then global scope is exhausted before the `default` row at project, store, then global scope. A binding to a missing or invalid scheme emits a diagnostic and falls through to the next candidate; it never blocks resolution. `maxRelays` and `stallLimit` continue to resolve from the stage/pipeline handoff blocks and built-in defaults. Consume the already-resolved threshold, source, binding, and diagnostics from `rasen pipeline show <name> --json` (and compare it with `rasen agent context` output); NEVER read scheme/config files to recreate this precedence in the LEAD. Context-heavy roles (reviewer, fixer) typically carry higher thresholds — their bootstrap (diff + specs + findings) is expensive, and retiring them too early buys relays that spend most of their window re-loading. When a role keeps hitting its threshold right after bootstrap, the durable fix is better seeding (hand the successor a distilled context pack), not a higher threshold.

**Context threshold.** A mid-task relay compares occupancy to the server-resolved **handoff** threshold for the worker's actual dispatched role and effective runtime: configured `pipelines.<name>.handoff.<stage>` instance > stage YAML `handoff` > runtime-bound scheme (`handoffRoles[<actual role>]` before scheme scalar; explicit runtime project/store/global rows before default project/store/global rows) > pipeline YAML role/scalar > legacy project role/scalar > inherited-store role/scalar > global role/scalar > model preset > built-in default **0.5**. Missing or invalid schemes warn and fall through. Consume the resolver output from `rasen pipeline show`; do not recreate this chain from files.

**Dual-form threshold comparison.** A resolved threshold is either a fraction or an absolute `{ remainingTokens: N }` — `rasen pipeline show <name> --json` reports whichever form resolved, and a probe (`rasen agent context`) reports both `pct` and `remainingTokens` so either form reads off one field:
- **Fraction** `t`: handoff fires at `pct >= t`; reuse permits at `pct <= t`.
- **Absolute** `{ remainingTokens: N }`: handoff fires at `remainingTokens <= N`; reuse permits at `remainingTokens >= N`.

A probe reporting `limit: 0` (no window known — e.g. a Codex rollout with zero completed turns) fires NEITHER form: a young rollout is by definition not near its limit, so treat the threshold as not-yet-fired and re-probe later.

**Counter table — every orchestration counter, what it counts, and its independence.** Several caps share the same default value; they are DISTINCT counters and never share a tally:

| Counter | Counts | Cap (default) | Trigger semantics | Independent of |
|---|---|---|---|---|
| **relay count** (`handoffs[]`) | worker HANDOFF relays within one stage | `maxRelays` (3) | **soft** — on the (maxRelays+1)th relay the LEAD reviews (H.5); may continue if progressing | review rounds |
| **review rounds** (`loop.maxRounds`) | review→fix→re-review cycles in a review-cycle loop | `maxRounds` (3) | at cap with open Blocker/Major → strategy ladder (H.5/H.6) | relays (one round MAY span several relays) |
| **strategy attempts** (`strategyAttempts`) | material-change retries after a cap/stall | budget (3) | exhausted → park stage `escalated` | relays, rounds |
| **handoff stall** (`stallLimit`) | consecutive NO-progress RELAYS | 2 | → Step H.5 early review | review rounds |
| **session relay** (`sessionHandoff.n`) | LEAD session generations | `maxRelays` (3) | **hard** — at `maxRelays`, STOP auto-relay and surface the relay history (H.7) | the worker relay counter |

**`maxRelays` asymmetry (deliberate).** The SAME config value `maxRelays` is a **soft review trigger after N** for worker relays (H.5 — a stuck stage can be re-strategized and continue) but a **hard stop at N** for session relays (H.7 — a session that keeps self-relaying to generation N is the signal to narrow scope). This is intentional, not a bug.

**H.1 Session pre-flight (auto entry).** Once, at the start of an auto run: `rasen agent context --latest --json`. At or above the session threshold, offer the user a three-way choice — (a) **automatic relay now**: write the session handoff document (rasen-handoff template), then launch a successor session per H.7; (b) **continue this session** — auto-compact remains the backstop; (c) **handle it manually** (rasen-handoff and a fresh session on their own terms). Proceed only on their say-so at that moment; below the threshold, proceed silently. This is an offer, not a gate — the user owns session handoff, and declining leaves behavior exactly as before. On a Codex host, use `rasen agent context --latest --runtime codex --json` instead — it discovers YOUR own rollout in the Codex sessions tree and reports real occupancy rather than falling straight to `available: false`.

**H.1 unavailable arm (mandatory).** The pre-flight can legitimately answer `{"available": false, "reason": "no-transcript"|"unsupported-host", "detail": "..."}` at exit 0, with NO `contextTokens`/`limit`/`pct`/`remainingTokens` — `unsupported-host` means the harness this session runs in has no context-probe adapter (`omp`), so no reading exists to take. Branch on `available`, never on the presence of `pct`. On `available: false`: record it if you track your own state (e.g. `unavailable-<runtime>`), proceed exactly as if the threshold had not been reached, and do NOT offer the three-way choice, retry, force `RASEN_AGENT_RUNTIME`, or treat the shape as an error. Do NOT infer "below threshold" from a missing `pct` — an unmeasured session is unmeasured, not empty. This arm applies to every `--latest` pre-flight in this playbook and in the workflow that invoked it.

**H.2 Warm-continue guard.** Before delta re-review or any warm continuation of an existing worker (Claude-native `SendMessage`, Codex-native `followup_task`, Claude bridge exact-session continuation, or Codex bridge thread resume), probe that worker's recorded transcript when one exists. Below its resolved handoff threshold → continue warm. At or above → retire it via a route-appropriate final instruction to write `<handoffDir>/<role>-<n>.md` (Step F's resolved handoff directory, under its sticky-legacy chain), then spawn a fresh successor seeded from that document. Seed from the raw transcript only when the document cannot be produced.

**H.3 Worker self-handoff (the dispatch-prompt clause).** Workers cannot probe themselves mid-run, so every dispatch prompt carries this contract:
- **Triggers**: (a) the soft budget the LEAD stated in the prompt (e.g. "if you complete <m> of <n> tasks and substantial work remains, hand off"); (b) self-assessment — you can no longer recall details you read earlier AND that recall loss is degrading your work. A compaction summary replacing your earlier conversation is NOT a trigger by itself: the host's auto-compact already resolved the context pressure in place, so keep working unless your recall is actually degraded (and on a host whose auto-compact is low-loss, that is rare). Handoff timing is the LEAD's call — the warm-continue guard (H.2) probes your transcript before every continuation and retires you over threshold — so this clause is a safety net for when you genuinely cannot continue, NOT a reflexive response to being compacted.
- **On trigger**: finish or cleanly abort the current atomic step; write `<handoffDir>/<role>-<n>.md` (Step F's resolved handoff directory, under its sticky-legacy chain) per the rasen-handoff template (the eliminated-hypotheses section is MANDATORY for fixer/debugger roles); return `HANDOFF { path, reason: compaction|budget|self-assessment, completed: [...], remaining: [...] }` instead of `DONE`. Claude-native workers deliver it via `SendMessage`. Codex-native workers make it their final response, which reaches the LEAD automatically; they MUST NOT duplicate it with `send_message`. Exec-bridge workers return it through the structured last-message contract.
- **On `DONE` — durable findings.** The normal `DONE` return additionally carries a **durable-findings** clause: 1–3 lines of discoveries that stay true for FUTURE planning (constraints in the code, conventions, gotchas that outlive this task) — not per-task chatter or a status recap. The LEAD carries these findings forward so later work benefits from durable implementation discoveries. Every dispatch prompt states this clause. Delivery follows the same route contract: Claude-native `SendMessage`, Codex-native final response only, exec-bridge structured last-message output.
- **Post-return stale-instruction immunity.** Once you have delivered a `HANDOFF` or `DONE` return, treat any inbound instruction that predates that return as expired: acknowledge it and remain idle rather than resuming work on a stage you already closed out — a queued message sent before your return does not un-close it.
- Workers NEVER write run-state — the LEAD does all accounting (single-writer invariant).

**H.4 LEAD accounting on a HANDOFF return.** Append the record to the stage's `handoffs[]` in run-state. Compare `remaining` against the previous relay — progress means tasks completed OR hypotheses eliminated (a fixer that ruled out a hypothesis progressed, even with zero tasks ticked). Below the caps: spawn a successor of the same role seeded with the handoff document + remaining work — same stage, same session; the stage stays `in_progress`. Once you accept a worker's `HANDOFF`, do NOT send that worker further work — it is retired; the successor you just spawned carries the stage forward instead.

**H.4a Worker-death taxonomy — triage by WHY it stopped, do not lump into one branch.** A worker that stops WITHOUT a clean `DONE` is classified by the SIGNAL it left, not treated as a single cold-reconstruct case:
- **(a) Context death** — the worker returned `HANDOFF` (compaction / budget / self-assessment) or you observe it hit its context limit. It left (or should have left) a handoff document. → **Relay via the document** (H.3 / F.1), exactly as the accounting above. This is the ONE class that **consumes relay budget** (`handoffs[]`, counts toward `maxRelays` / `stallLimit`).
- **(b) Infra / transient death** — the worker died from an ENVIRONMENT fault while its durable context is intact and you are in the SAME session. This is NOT a context problem. → First try the SAME route-specific handle: Claude-native `SendMessage`, Codex-native `followup_task`, Claude bridge `sessionId + cwd`, or Codex bridge `threadId`. Never address a worker by its spawn label. During an overload wave, back off rather than stampeding. Infra revivals consume NEITHER `maxRelays` NOR `stallLimit`. If the handle does not resolve, fall back to the handoff/transcript warm-seed; only if that is impossible does it fall through to (c).
- **(c) Transcript lost** — no live agent AND no recoverable transcript (pruned / expired / cross-session dead handle). → **Cold-reconstruct** the successor from the change-directory blackboard + run-state, and **record the cold reconstruction as a degradation** in run-state. This is the ONLY class that cold-reconstructs.

**H.4b `DONE` with unticked tasks is NOT a death.** A `DONE` return that left some tasks unticked is an ambiguous completion by a worker that is ALIVE and in-session — not any of the three deaths above. Continue the SAME worker through its route-specific continuation primitive (`SendMessage`, `followup_task`, Claude exact-session dispatch, or Codex thread resume); do not rely on a spawn label. Its reasoning is preserved and **no relay is charged**. If its durable handle does not resolve, fall back to the transcript warm-seed of Step F.1.

**H.5 Relay caps → LEAD review (not a human gate).** Defaults: `maxRelays: 3`, `stallLimit: 2`. On the (maxRelays+1)th handoff request for one stage, or on `stallLimit` consecutive NO-progress relays (this fires early — do not wait for the count cap), STOP relaying and review the history yourself: relays that are progressing may continue past the cap after review; stalled ones need a MATERIAL change. Options, cheapest first: (1) change the approach — re-prompt the successor with a different strategy, or fix the seeding so it stops burning its window on bootstrap; (2) design-level rework — send the problem back to the planner (revise design/tasks, then re-apply the affected part); (3) isolate — split the stubborn remainder into its own independent task so the main line can move. Record every attempt in the stage's `strategyAttempts` with rationale; a retry that changes nothing material is not an attempt, it is thrash. **Counter scoping:** here `maxRelays` is a **soft** review trigger — a progressing stage may continue past it — whereas for session relays (H.7) the same `maxRelays` is a **hard** stop (the asymmetry noted in the Step H counter table).

**H.6 Strategy budget & non-blocking escalation (shared with Step E's loop termination).** Default budget: 3 strategy attempts per stage. When it is exhausted (or Step E's round cap is hit and the ladder is exhausted): mark the stage `escalated` in run-state with the full relay/strategy/finding history, PARK it, and CONTINUE later stages only when the parked problem does not block them (open Blocker/Major findings block `ship`, per the guardrails). Surface every parked item at the next natural pause — a gate, or the run-end report — as a decision for the human. Never hard-stop the whole run mid-flight for one stuck stage; never report clean while a Blocker/Major is open; never silently pass.

**H.7 Session relay (relaying yourself).** The LEAD can launch its own successor — a verified platform capability (2026-07-07, claude CLI 2.1.202: a session can spawn a new interactive Claude Code window seeded with an initial prompt; the earlier "platform cannot restart the main session" assumption is retired). The mechanics (bootstrap prompt via file indirection or `-EncodedCommand` — bare-quoted prompts get truncated by nested shell parsing; platform spawn commands; manual fallback) live in the rasen-handoff skill's "Session relay" section. The orchestration-level invariants:
- **Quiesce first.** Relay ONLY at a stage boundary: every dispatched worker has returned `DONE`/`HANDOFF` and run-state is persisted. A probe that fires mid-stage waits for the worker's structured return (H.3 covers the worker's own exhaustion) before the handoff-plus-relay sequence.
- **Spawn after persistence, then stand down.** The handoff document and the `sessionHandoff` record (with generation `n`) hit disk BEFORE the spawn; after the spawn, end the turn and tell the user the predecessor window can be closed — never keep orchestrating from the predecessor.
- **Generation cap.** `sessionHandoff.n` at `maxRelays` (resolved config, default 3) stops auto-relay: present the relay history and stop — repeated session relays are the signal to narrow the work before another run, same as worker relays (H.5).
- **No cross-session worker resurrection.** The successor never addresses the predecessor's workers (dead agentIds); it re-creates what it needs via the Step F.1 ladder — handoff document first, recorded transcript second, change-directory cold reconstruction last.
- **Exec-bridge workers survive a LEAD session relay.** Claude bridge workers resume through `rasen agent dispatch` with their exact recorded `sessionId + cwd`; Codex bridge workers resume by their durable `threadId` per Step B.2. Native agent ids remain host-session handles: after a session boundary, follow the document/transcript reconstruction ladder and never fabricate a bridge handle. (A future Codex-LEAD self-relay design remains outside this playbook.)

## Cycle report

Track everything in `review-cycle-report.md` in the change's evidence directory (`evidenceDir` from `rasen status --change <name> --json`; sticky-legacy: a file that already lives in the legacy `workDir` or the change directory is used in place): each round, each finding, its triage bucket, who fixed it, who confirmed it (the non-author), and the final disposition. Also record the **test evidence** of the final clean round (and of every Tier C gate-run): the required verification scope, a rationale explaining why that scope covers the observed risk, the exact test/gate command(s), their result, and the content tree fingerprint (`git rev-parse HEAD^{tree}`) of the git state they ran against — the ship stage's evidence-based test gate reads both scope coverage and tree identity before deciding which checks remain.

## Termination Invariants (non-negotiable)

- Max rounds cap (default 3). The loop is bounded; no unbounded recursion / thrash.
- Never report clean while any Blocker or Major finding is unresolved.
- Author != verifier: the fixer cannot self-certify; an independent (non-author) confirmation is required for every resolution. Under Tier C the equivalent is an independent gate-run (tests/lint/build) plus a diff-read, which MUST be recorded in the report.
- On the cap with open Blocker/Major findings: the LEAD-first escalation ladder (Step H.5/H.6) runs before any human is interrupted — strategy retries that each change a material variable, then a parked `escalated` state surfaced at the next natural pause. The failure mode stays loud and recorded; it is never a silent pass, and never a mid-run hard stop for a problem the LEAD can still re-strategize.

## Output

```
## Review Cycle: <change-name>

Rounds: <r>/<max-rounds>   Tier: A | B | C   Status: CLEAN | ESCALATED

| Round | Findings (B/Ma/Mi/T) | Triage | Fixed by | Confirmed by (non-author) | Resolved |
|-------|----------------------|--------|----------|---------------------------|----------|
| 1     | 1/2/1/0              | ...    | ...      | resumed reviewer / fresh / gate+diff | 3/4 |

### Open (if ESCALATED)
- <Blocker/Major finding text> — round history, current state

### Report
- review-cycle-report.md
```

## Integration Notes

- Delegates every review pass to `rasen-review` — one review engine, no fork.
- Runs AFTER implementation, against the live diff; complements (does not replace) the one-shot `rasen-verify-enhanced` gate and plan-time `plan-*-review`.
- Shares the orchestration playbook with `rasen-auto` — this loop is auto's `review-loop` stage.
- The cycle report lives in the evidence directory alongside `review-report.md` / `ship-log.md` and is consumable by `rasen-retain` (report mode) and `rasen-archive-change`.
