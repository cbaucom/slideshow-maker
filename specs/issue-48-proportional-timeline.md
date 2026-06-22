# Issue #48 — Proportional timeline UI + audio lane with gain controls

Closes #48.

## Scope

Replace `StoryboardFilmstrip` with a time-proportional `TimelinePanel`:

- Media lane: slide cards width ∝ first-pass duration from `RenderPlan`
- Audio lane: clip blocks aligned to `audioSegments.startFrame`, waveform peaks, gain sliders (dB)
- Shared horizontal scroll; playhead at `currentFrame`
- Drag-reorder on media lane (slides) and audio lane (clips)
- Gain/reorder removed from sidebar `SoundtrackPanel` (add track + beat grid remain)

## Pure modules

### `sequence-planner/timelineLayout.ts`

- `firstPassEntries(renderPlan)` — entries before loop boundary
- `buildTimelineLayout(renderPlan, pixelsPerFrame, minBlockWidthPx)` → `{ totalWidthPx, mediaBlocks, audioBlocks }`

### `audio-analysis/waveformPeaks.ts`

- `computeWaveformPeaks(samples, barCount)` → normalized 0–1 peaks

## Editor shell

- `TimelinePanel` — scroll container, playhead, lanes
- `useWaveformPeaks` — decode mono via beat-grid `decodeMono`, cache by filename
- `App` tracks `currentFrame` for playhead; click timeline → seek

## Testing

- Unit: `timelineLayout.test.ts`, `waveformPeaks.test.ts`
- Smoke: `scripts/playwright-issue-48-smoke.mjs` — proportional widths, playhead highlight

## HITL

Owner review on 10-clip project before merge.
