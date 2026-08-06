---
name: rasen-retro
description: Temporary compatibility alias for rasen-retain report mode (user-invoked only).
disable-model-invocation: true
license: MIT
compatibility: Requires rasen CLI.
metadata:
  author: rasen
  version: "1.0"
  generatedBy: "0.1.7-dev.local.1"
---

Temporary compatibility alias for `rasen-retain` **report** mode. Retro as a standalone workflow is retired; this wrapper exists only so `rasen-retro` keeps working during the migration window.

## Behavior

- Forward the user's scope/change argument unchanged:
  - `rasen-retro <change-name>` → change-scoped report
  - `rasen-retro` (no args) → prompt for change-scoped or general
  - `rasen-retro global` → global report
- Run **only** the report branch of `rasen-retain` (read its `report.md` sidecar), forcing `report` mode regardless of the active profile's retention mode.
- Do NOT create, update, promote, or retire a learned skill, and do NOT change the saved profile retention mode.

## Migration

Use profile retention `report` with `rasen-retain` for the canonical workflow. This alias is user-invoked only and will be removed after its announced migration window.
