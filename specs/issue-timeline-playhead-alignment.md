# Timeline playhead ↔ thumbnail alignment + scroll behavior

GitHub issue: #57

## Problem

1. **Misalignment**: Media blocks in `buildTimelineLayout` are placed with cumulative packing (`leftPx += width + gap`), but the playhead uses `currentFrame * pixelsPerFrame` (time axis). Changing slide duration widens/narrows packed blocks without moving them on the time axis, so the red line no longer lines up with thumbnails.
2. **Unwanted scroll**: `TimelinePanel` auto-scrolls to the playhead whenever it is outside the viewport, even while paused. Scrolling away to click a distant thumbnail snaps back to the old playhead position before the seek completes.

## Fix

### `sequence-planner/timelineLayout.ts`

- Position **included** media blocks at `entry.startFrame * pixelsPerFrame` (same coordinate system as playhead and audio lane).
- **Excluded** slides (no plan entry) keep compact packed placement after the previous block in storyboard order so reorder UX is unchanged.
- Update unit tests for start-frame positioning and transition overlap cases.

### `editor-shell/App.tsx`

- When a slide select triggers a seek, synchronously update `currentFrame` / `currentSlideId` (don't wait for player RAF poll).
- Track `isPlaying` via Remotion player `play` / `pause` events.

### `editor-shell/TimelinePanel.tsx`

- Auto-scroll to playhead **only while playing**.
- When paused and the user selects a single slide, scroll that block into view (centre if off-screen).

## Testing

- Extend `timelineLayout.test.ts` for start-frame block positions.
- `pnpm test`, `pnpm lint`, `pnpm build`.
