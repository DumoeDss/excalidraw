---
name: rasen-prototype
description: Rapid prototyping — build a throwaway UI or logic spike to answer a question fast
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

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a branch

Identify which question is being answered — from the user's prompt, the surrounding code, or by asking if the user is around:

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). Build a tiny interactive terminal app that pushes the state machine through cases that are hard to reason about on paper.
- **"What should this look like?"** → [UI.md](UI.md). Generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar.

The two branches produce very different artifacts — getting this wrong wastes the whole prototype. If the question is genuinely ambiguous and the user isn't reachable, default to whichever branch better matches the surrounding code (a backend module → logic; a page or component → UI) and state the assumption at the top of the prototype.

## Rules that apply to both

1. **Throwaway from day one, and clearly marked as such.** Locate the prototype code close to where it will actually be used (next to the module or page it's prototyping for) so context is obvious — but name it so a casual reader can see it's a prototype, not production. For throwaway UI routes, obey whatever routing convention the project already uses; don't invent a new top-level structure.

**Where probe / prototype / harness code goes.** Probe code is a project deliverable, not scratch state: it lands in the **execution root** (the code checkout you are working in) so it enters code history and a later reader can check it out and re-run it. It NEVER goes under the machine root (`~/.rasen/`), and there is no external/internal option to choose.

1. **Follow the project's own convention first.** If the repo already has an `experiments/`, `prototypes/`, `tools/`, or `fixtures/` directory — or a module-adjacent location matching how it organizes this kind of code — put the probe there. A project convention always wins; do not invent a parallel home for code the project already has a place for.
2. **Only when no convention is identifiable**, use the fixed fallback `<executionRoot>/.rasen/probes/<change>/<probe>/` — one directory per probe, named for the question it answers. Resolve `<executionRoot>` as the code checkout root (`git rev-parse --show-toplevel`); `<change>` is the active change name, or the topic slug when no change is active.

Whether any of it enters Git is the user's `.gitignore` decision — Rasen writes no ignore rules.

2. **One command to run.** Whatever the project's existing task runner supports — `pnpm <name>`, `python <path>`, `bun <path>`, etc. The user must be able to start it without thinking.
3. **No persistence by default.** State lives in memory. Persistence is the thing the prototype is _checking_, not something it should depend on. If the question explicitly involves a database, hit a scratch DB or a local file with a clear "PROTOTYPE — wipe me" name.
4. **Skip the polish.** No tests, no error handling beyond what makes the prototype _runnable_, no abstractions. The point is to learn something fast and then delete it.
5. **Surface the state.** After every action (logic) or on every variant switch (UI), print or render the full relevant state so the user can see what changed.
6. **Delete or absorb when done.** When the prototype has answered its question, either delete it or fold the validated decision into the real code — don't leave it rotting in the repo.

## When done

The _answer_ is the only thing worth keeping from a prototype. Capture it somewhere durable (commit message, ADR, issue, or a `NOTES.md` next to the prototype) along with the question it was answering. If the user is around, that capture is a quick conversation; if not, leave the placeholder so they (or you, on the next pass) can fill in the verdict before deleting the prototype.

**Rasen change-context adaptation:** When you are invoked while a Rasen change is active (e.g. consulted from `rasen-explore`), capture your durable output — the verdict and the decisions it settles — in that change's directory: the change's `design.md` Decisions section or a change-directory sidecar. Resolve the absolute change directory from `rasen status --change <name> --json` (the `changeRoot` field). In this mode do NOT capture into repo-root artifacts such as an ADR or a `NOTES.md` beside the prototype code — the capture locations described earlier in this skill apply only to standalone (non-Rasen) use.

**Store selection:** If the user names a store (a store is a standalone Rasen repo registered on this machine) or the work lives in one, run `rasen store list --json` to discover registered store ids and project ids (the `type` field on each entry), then pass `--store <id>` (or `--project <id>` for a project registered via `store add-project`) on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `retain prepare`, and the top-level `context`). The `rasen pipeline` inspection group (`pipeline list`, `pipeline show`, `pipeline agents`, `pipeline classify`, `pipeline resume`) also accepts `--store <id>`/`--project <id>` and resolves its root exactly like `validate` — in a store- or project-scoped run you MUST thread the SAME flag onto `pipeline resume <change>` so it reads the change's run-state from that root's change directory, not the cwd. `--store` and `--project` are mutually exclusive on one invocation — pass only one. A store and a project may share the same id (they are separate namespaces); a bare id with neither flag always means the store namespace. On `retain prepare` these two flags select the planning root only; its knowledge-owner selectors are the separate `--owner-store`/`--owner-project`, and the change's planning root must agree with the space the session plans in. Commands outside those groups do not take either flag — in particular `rasen agent context` (the agent-runtime probe) is NOT the same command as the top-level `rasen context` and does NOT accept `--store`/`--project`; do not paste either flag onto it. Hints printed by commands already carry the right flag; keep it on follow-ups. Without a store or project flag, commands act on the nearest local `rasen/` root.
