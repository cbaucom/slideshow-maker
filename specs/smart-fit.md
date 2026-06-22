# Smart Fit — Technical Spec

## Problem

Default `cover` fit crops media when its aspect ratio differs from the project canvas (e.g. 16:9 photo in a 9:16 project). Users expect the full image to remain visible unless they explicitly choose crop.

## Behavior

- **`smart-fit`** becomes the default global `fitMode` (themes included).
- At plan time, `smart-fit` resolves to a concrete fit per slide:
  - **Orientation mismatch** (landscape ↔ portrait) or **square ↔ non-square** → `blur-fill` (full media visible, blurred background).
  - **Compatible orientation** (both landscape, both portrait, or both square) → `cover` (Ken Burns-friendly crop-fill).
  - **Missing media dimensions** → `contain` (safe fallback, no crop).
- **Videos** remain always `contain` (unchanged).
- **Per-slide overrides** (`cover`, `contain`, `blur-fill`, `smart-fit`) still win via the settings cascade.
- **Persisted `fitMode: 'cover'`** in existing projects is unchanged until the user switches.

## Architecture

| Layer | Responsibility |
| --- | --- |
| `timeline-core/smartFit.ts` | Pure `resolveSmartFit(mediaW, mediaH, canvasW, canvasH)` |
| `timeline-core/settings.ts` | Add `'smart-fit'` to `FitMode`, default + themes |
| `project-store/media-loader.ts` | Extract `width`/`height` at import (image bitmap, video track) |
| `sequence-planner/planner.ts` | Accept `aspectRatio`, resolve `smart-fit` using slide dims + canvas |
| `composition/` | No changes — receives resolved fit modes only |

## Tests

- `smartFit.test.ts`: orientation pairs, square cases, missing/zero dimensions.
- `planner.test.ts`: smart-fit resolution with metadata + aspect ratio; overrides still win.
