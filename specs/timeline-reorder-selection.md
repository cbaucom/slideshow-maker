# Timeline reorder & multi-select

## Goals

- Right-click a slide block → **Send to Beginning** / **Send to End**
- Multi-select slides (⌘/ctrl+click toggle, shift+click range)
- Drag reorder moves the whole selection, preserving relative order
- Click empty timeline clears selection

## Pure module (`timeline-core/timeline.ts`)

| Function | Behavior |
| -------- | -------- |
| `moveSlidesToBeginning(slides, indices)` | Selected slides (original order) prepended |
| `moveSlidesToEnd(slides, indices)` | Selected slides (original order) appended |
| `moveSlideBlock(slides, fromIndices, toIndex)` | Multi-item drag; single index delegates to `moveSlide` |

## Editor shell

- `selectedSlideIds: ReadonlySet<string>` in `App` (+ anchor for shift-range)
- Settings dialog opens only when exactly one slide is selected
- `TimelineMediaBlock`: context menu, selection ring, multi-drag via shared drag ref
- Hint text in timeline header for selection shortcuts

## Editor shell (updated)

- Selection no longer opens a blocking modal
- Per-slide overrides live in sidebar **Selected slide** accordion (auto-expands on select)
- Multi-select shows a summary in the same accordion section

## Keyboard (stretch — not in initial slice)

- ⌘↑ / ⌘↓ move selection block — defer unless trivial
