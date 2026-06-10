---
name: to-issues
description: Break a plan, spec, or PRD into independently-grabbable GitHub issues using tracer-bullet vertical slices. Use when user wants to convert a plan or PRD into issues, create implementation tickets, or break down work into issues.
---

# To Issues

Break a plan into independently-grabbable GitHub issues using vertical slices (tracer bullets). Adapted from mattpocock/skills `to-issues`, with create-stories-style acceptance criteria.

## Pre-approved breakdowns

**Check `.claude/plans/` first.** If an approved issue breakdown exists there (e.g. `issue-breakdown.md`) and the user is asking to create the issues from it, SKIP the drafting and quiz phases — go straight to "Create the GitHub issues" using the plan file verbatim. Mark the plan file as published (append a `## Published` section listing created issue numbers) when done.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a GitHub issue number or URL as an argument, fetch it with `gh issue view <number> --comments`.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code.

### 3. Draft vertical slices

Break the plan into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be 'HITL' or 'AFK'. HITL slices require human interaction, such as an architectural decision or a design/aesthetics review. AFK slices can be implemented and merged without human interaction. Prefer AFK over HITL where possible.

- Each slice delivers a narrow but COMPLETE path through every layer it touches (model, planner, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones; no slice should exceed ~1 day of work
- Map each slice to the user stories it satisfies (by number, from the source PRD)
- Acceptance criteria are testable Given/When/Then statements, verifiable without asking the author
- Dependencies must form a valid DAG (no cycles)
- Every PRD user story must be covered by at least one slice

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

* **Title**: short descriptive name
* **Type**: HITL / AFK
* **Blocked by**: which other slices (if any) must complete first
* **User stories covered**: which user stories this addresses

Ask the user:

* Does the granularity feel right? (too coarse / too fine)
* Are the dependency relationships correct?
* Should any slices be merged or split further?
* Are the correct slices marked as HITL and AFK?

Iterate until the user approves the breakdown. Consider saving the approved breakdown to `.claude/plans/` before publishing.

### 5. Create the GitHub issues

For each approved slice, create a GitHub issue using `gh issue create`, applying the labels `ready-for-agent` and `hitl` (HITL slices only). Use the issue body template below.

Create issues in dependency order (blockers first) so you can reference real issue numbers in the "Blocked by" field.

Do NOT close or modify the parent issue, except to add a single comment linking the created child issues.

## Issue body template

```
## Parent

#<parent issue number> (omit section if no parent)

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

## User stories covered

Story numbers and one-line restatements, from the parent PRD.

## Acceptance criteria

- [ ] Given <context>, when <action>, then <result>
- [ ] ...

## Technical notes

Module(s) touched per the PRD's Implementation Decisions; testing expectations per its Testing Decisions; relevant skills to load (e.g. remotion-best-practices).

## Blocked by

- Blocked by #<issue> (or "None - can start immediately")
```
