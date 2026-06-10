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

## 3. IMPLEMENT (TDD)

- Load the `tdd` skill. For all pure-module work (Timeline Core, Beat Grid, Sequence Planner, Project Store against fakes, Jamendo client against mocks), use the red-green-refactor loop in **vertical slices**: one test → minimal implementation → next test. Never write all tests up front.
- The issue's acceptance criteria ARE the approved behavior list — do not pause to ask the user which behaviors to test; the criteria were approved when the issue was created. Test through public interfaces only.
- Build ONLY what the acceptance criteria require. Resist scope creep; if you discover necessary work outside this slice, note it for a follow-up issue instead of doing it.
- Follow the module boundaries in the PRD: decisions live in pure modules; the Composition and Editor Shell stay thin.
- Keep render paths deterministic: no wall-clock time or unseeded randomness in anything the Composition consumes.
- No live network or real filesystem in tests.

## 4. VERIFY

- `npm run test` and `npm run build` (and `npm run lint` if configured) must pass.
- Walk each acceptance criterion and confirm it is satisfied. If one cannot be met, say so in the PR rather than silently skipping it.
- **UI smoke check** (only for slices touching the Editor Shell or player UI): load the `playwright-cli` skill, start the dev server, and drive the browser through each UI-facing acceptance criterion — click, type, snapshot. Capture a screenshot of the end state for the PR. Skip this step entirely for pure-module slices.

## 5. REVIEW

- Invoke the `code-reviewer` agent with the branch diff and the issue.
- Fix all blocking findings and re-run VERIFY. Iterate until the decision is APPROVE.
- Include the final review verdict in the PR body.

## 6. PULL REQUEST

- Commit in small logical commits.
- `gh pr create` with:
  - Title: `<issue title> (#<issue number>)`
  - Body: `Closes #<issue number>`, a brief summary of the approach, the acceptance-criteria checklist with each item checked or explained, and any follow-ups discovered.
- Comment on the issue with the PR link.
- STOP after one PR. The next run of this command picks up the next issue.
