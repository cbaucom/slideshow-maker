# Slideshow Creator

Local-first web app: hand-curated slideshows with automatic, Apple-Memories-grade presentation. The spec is **issue #1 (the PRD)** — read it before implementing anything. Approved work breakdown: `.claude/plans/issue-breakdown.md`.

## Workflow

- Work happens one issue at a time via `/work-next-issue` → one small PR per issue, `Closes #N` in the body.
- Issues labeled `ready-for-agent` are grabbable when their blockers are closed; `hitl` issues need the owner.
- Creating issues from a plan: use the `to-issues` skill.
- Pure-module implementation follows the `tdd` skill (vertical red-green-refactor; acceptance criteria are the approved behavior list).
- Before any PR: the `code-reviewer` agent must APPROVE with zero blocking findings; UI-facing slices also get a `playwright-cli` smoke check against their acceptance criteria.

## Architecture (non-negotiable)

- **Decisions live in pure modules**: Timeline Core (domain + settings cascade), Beat Grid (audio analysis math), Sequence Planner (`(timeline, beatGrid, mediaMetadata) → RenderPlan`). Everything downstream executes the RenderPlan and decides nothing.
- **Composition (Remotion) and Editor Shell stay thin.** Load the `remotion-best-practices` skill before touching composition/player code. Load the `composition-patterns` skill before adding or refactoring `src/editor-shell/` UI.
- **Determinism**: no wall-clock time or unseeded randomness anywhere the Composition consumes — export depends on it. Variation derives from slide index/seed in the RenderPlan.
- **Project = folder**: media referenced by filename; all state in `slideshow.json` (schema-versioned) written into the user's folder via the Project Store. No backend, ever.
- **Settings are a cascade** (global → per-slide). Themes and "Plain mode" are settings data, never special-cased code.

## Stack & testing

Vite + React + TypeScript, `@remotion/player`, Web Audio API, File System Access API (Chromium), Jamendo API, Mediabunny for media metadata. Tests: Vitest, colocated per module. Pure modules get table-driven/golden/property tests; Project Store against in-memory FS fakes; Jamendo client against mocked responses. No live network or real filesystem in tests. `pnpm test`, `pnpm build`, **and `pnpm lint`** must all pass before any PR.

## Code standards

Project-wide rules live in `standards/` — read the relevant file before writing code in that domain:

- `standards/architecture.md` — TypeScript strictness, module boundaries, naming, file size limits
- `standards/testing.md` — TDD workflow, coverage floors, what to test
- `standards/react.md` — component rules, state hierarchy, anti-patterns
- `standards/security.md` — secrets, input validation, dependency policy

Key rules that apply here: no `any`, explicit return types on all exported functions, no magic numbers (use named constants), files ≤ 300 lines (split when you exceed this).
