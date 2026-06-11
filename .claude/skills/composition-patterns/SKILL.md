---
name: composition-patterns
description: React composition patterns for the editor shell. Use when refactoring components with boolean prop proliferation, splitting large components, or designing flexible component APIs in src/editor-shell/.
metadata:
  tags: react, composition, architecture, editor-shell
  source: vercel-labs/agent-skills (subset)
---

## When to use

Load this skill before adding or refactoring UI in `src/editor-shell/`. Read `standards/react.md` and `standards/architecture.md` alongside these rules.

Triggers:

- A component file approaches or exceeds the 300-line cap
- Adding boolean props to customize component behavior (`isEditing`, `showFooter`, etc.)
- One component handles multiple slide/dialog/panel modes via conditionals
- Sibling components need shared state (e.g. drag preview + storyboard grid)

## Applicable rules (this project)

Only three rules from the Vercel composition-patterns skill apply at current scale. Read the full rule file before implementing:

| Priority | Rule | File |
| -------- | ---- | ---- |
| CRITICAL | Avoid boolean prop proliferation | [rules/architecture-avoid-boolean-props.md](rules/architecture-avoid-boolean-props.md) |
| MEDIUM | Explicit variant components | [rules/patterns-explicit-variants.md](rules/patterns-explicit-variants.md) |
| HIGH | Lift state into providers | [rules/state-lift-state.md](rules/state-lift-state.md) |

## Not applicable yet

Skip these until the codebase needs them:

- `architecture-compound-components` — no shared compound context yet
- `state-context-interface` / `state-decouple-implementation` — state still lives in App with callback props
- `patterns-children-over-render-props` — no render-prop APIs
- `react19-no-forwardref` — not using forwardRef

## Local examples

- `TitleSlideDialog` and `SlideSettingsDialog` are explicit variants (not one dialog with `isTitle` boolean)
- App lifts state; dialogs receive data + callbacks — provider pattern becomes relevant when siblings outside the dialog need the same state
