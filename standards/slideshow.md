# Slideshow Maker — Code Standards

> Project-specific rules for agents and humans. Read alongside `CLAUDE.md` and the PRD (issue #1).

---

## Module map

```
src/timeline-core/     — pure domain: slides, settings cascade, ordering
src/beat-grid/         — (future) BPM detection + nudge math
src/sequence-planner/  — (timeline, beatGrid, metadata) → RenderPlan
src/project-store/     — File System Access API, slideshow.json, autosave
src/composition/       — thin Remotion layer, executes RenderPlan only
src/editor-shell/      — storyboard, settings panels, player host
src/components/ui/     — shadcn/ui primitives (generated, owned by us)
src/lib/               — shared helpers (`cn`)
```

**Boundaries:**

- Pure modules own decisions (timing, beats, fit, cascade). Composition and Editor Shell execute plans and glue UI — they do not re-derive slideshow logic.
- No circular dependencies across modules.

---

## TypeScript

- `strict` always. No `any` — use `unknown` and narrow.
- Prefer type inference; add explicit return types only when inference fails or the linter requires it.
- Named exports only (no default exports).
- No enums — use `as const` objects and derived union types.
- No magic numbers or strings — named constants at module top.

---

## File and function size

- Files ≤ 300 lines — split when exceeded (e.g. dedicated dialog components, `slidePersistence.ts`).
- Functions ≤ 40 lines when practical — extract helpers.

---

## React (Vite SPA)

- One component per file in `editor-shell/` and `composition/`. (`src/components/ui/` is the exception — shadcn files ship multiple related exports.)
- Props type in the same file (`type Props = { ... }`).
- App-level state with callback props is fine at current scale; lift to providers when siblings outside a subtree need the same state (see `composition-patterns` skill).
- Explicit variant components over boolean props (`TitleSlideDialog` / `SlideSettingsDialog`, not one dialog with `isTitle`).
- Modals use the shadcn `Dialog` (Radix provides `role="dialog"`/`aria-modal` and focus trapping); controls still need labels (`Label htmlFor` / `aria-label`).

**Styling:**

- Editor-shell styling is Tailwind utility classes plus shadcn/ui primitives from `src/components/ui/` (imported via the `@/` alias; config in `components.json`, theme variables in `src/index.css`).
- shadcn files are generated-but-owned: edit deliberately, keep diffs reviewable. They are exempt from `react-refresh/only-export-components` (see `eslint.config.js`).
- Data-driven values (e.g. title-slide thumb colors, player dimensions) use inline `style` — never string-built class names.
- Plain colocated `.css` only when utilities can't express it (complex keyframes); none currently exist.
- `src/composition/` uses inline styles only — never Tailwind classes. Rendered output must depend only on the RenderPlan, not on editor stylesheets.

**Skills for UI work:**

- `src/composition/` or player → `remotion-best-practices`
- `src/editor-shell/` refactors → `composition-patterns`

---

## Testing

Follow `.claude/skills/tdd/` for pure-module work (red → green → refactor on acceptance criteria).

| Layer | Unit tests? | Notes |
| --- | --- | --- |
| Timeline Core, Beat Grid, Sequence Planner | Yes | Table, golden, property tests; colocated `*.test.ts` |
| Project Store, Jamendo client | Yes | In-memory FS fakes; mocked HTTP — no live network |
| Composition, Editor Shell | No | UI slices: `playwright-cli` smoke; correctness flows from RenderPlan tests |

- Test through public interfaces only.
- `pnpm test`, `pnpm build`, and `pnpm lint` must pass before merge.

---

## Determinism (Composition)

- No `Date.now()`, `performance.now()`, or unseeded `Math.random()` in anything the Composition renders.
- Motion, transitions, and variation derive from RenderPlan indices and seeds.

---

## Security and config

- No secrets in the repo. Jamendo `client_id` via environment (`.env.local`; document in `.env.example` when wired).
- Treat folder contents as untrusted input — validate filenames and paths at boundaries.
- Chromium-only (File System Access API). No pretend cross-browser FS support.

---

## Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Component files | PascalCase | `StoryboardGrid.tsx` |
| Helper modules | camelCase or domain name | `slidePersistence.ts` |
| Event handlers | `handle` prefix | `handleSlideClick` |
| Type guards / booleans | `is` / `has` prefix | `isTitleSlide` |

---

## Do not

- Special-case themes or Plain mode in code — they are settings data in the cascade.
- Re-decide timing, fit, or transitions in Composition or Editor Shell.
- Introduce Next.js, RSC, TanStack Query, or server-side patterns — client-only Vite SPA.
- Add a backend, accounts, or cloud sync — project = folder on disk.
