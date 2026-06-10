---
description: Pick the next unblocked ready-for-agent issue, implement it, and open a small PR
argument-hint: [issue-number (optional, to force a specific issue)]
---

# Work Next Issue

Implement exactly ONE issue end-to-end and open ONE small PR. Never batch multiple issues into a single PR.

**Input**: $ARGUMENTS

## 1. SELECT

If an issue number was passed as an argument, use it. Otherwise:

1. `gh issue list --label ready-for-agent --state open --json number,title,body,labels --limit 50`
2. Filter out issues whose body references a "Blocked by #N" where issue N is still open (`gh issue view N --json state`).
3. Filter out issues already linked to an open PR (`gh pr list --search "<issue number> in:body" --state open`).
4. Of the remainder, pick the LOWEST issue number (they were created in dependency order).
5. If the selected issue has the `hitl` label, STOP and tell the user it needs their involvement — summarize what decision/review is needed. Do not implement HITL issues unattended.
6. If nothing is selectable, report why (all blocked / all done / all in review) and stop.

## 2. PREPARE

- `git checkout main && git pull`
- Read the issue fully, including comments. Read the parent PRD issue if referenced.
- Load relevant skills before writing code (e.g. `remotion-best-practices` for anything touching the composition or player).
- Create a branch: `feat/<issue-number>-<short-slug>`.

## 3. IMPLEMENT

- Build ONLY what the issue's acceptance criteria require. Resist scope creep; if you discover necessary work outside this slice, note it for a follow-up issue instead of doing it.
- Follow the module boundaries in the PRD: decisions live in pure modules (Timeline Core, Beat Grid, Sequence Planner); the Composition and Editor Shell stay thin.
- Keep render paths deterministic: no wall-clock time or unseeded randomness in anything the Composition consumes.
- Write/extend tests for every pure module touched (Vitest). Project Store against in-memory FS fakes; Jamendo client against mocked responses. No live network in tests.

## 4. VERIFY

- `npm run test` and `npm run build` (and `npm run lint` if configured) must pass.
- Walk each acceptance criterion and confirm it is satisfied. If one cannot be met, say so in the PR rather than silently skipping it.

## 5. PULL REQUEST

- Commit in small logical commits.
- `gh pr create` with:
  - Title: `<issue title> (#<issue number>)`
  - Body: `Closes #<issue number>`, a brief summary of the approach, the acceptance-criteria checklist with each item checked or explained, and any follow-ups discovered.
- Comment on the issue with the PR link.
- STOP after one PR. The next run of this command picks up the next issue.
