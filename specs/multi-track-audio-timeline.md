# Multi-track audio timeline

Parent issues: #45–#49. This spec tracks slice 19 (#45) implementation.

## Slice 19 — Audio clip sequence (done)

Replace single `soundtrackFilename` with ordered `audioClips[]`. Sequential playback in RenderPlan. `totalFrames` remains visual-only.

Closes #45.

### Data model

```typescript
type AudioClip = { filename: string; gainDb?: number }
type SerializedAudioClip = { filename: string; gainDb?: number }
```

Migration: `soundtrackFilename` → single `audioClips` entry on load.

### RenderPlan

```typescript
type AudioSegment = {
  blobUrl: string
  durationInFrames: number
  gainDb: number
  startFrame: number
}

type RenderPlan = {
  entries: RenderPlanEntry[]
  audioSegments?: AudioSegment[]
  duckingEnvelope?: DuckingEnvelope
  totalFrames: number
}
```

### UI (minimal)

SoundtrackPanel: ordered clip list, add / reorder / remove. Beat grid uses first clip until #49.

## Slice 20 — Loudness normalization (done)

`audio-analysis` module: RMS normalization to -18 dBFS. `loudnessCache` in slideshow.json (filename + byteLength). Manual `gainDb` on clip overrides auto offset. Per-clip dB input in SoundtrackPanel.

Closes #47.

## Slice 21 — Audio-driven duration + media loop (done)

When audio exceeds visual timeline, `totalFrames` = sum of clip durations and slides loop in order until audio ends. Partial tail truncates last slide. Visual wins when longer than audio.

Closes #46.

## Slice 23 — Beat grid across multi-clip timeline (done)

Per-file `beatGridCache` in slideshow.json (migrates legacy single `BeatGrid`). `buildConcatenatedBeatTimes` shifts each clip's beats by clip start. Manual beat grid spans total audio duration. Planner uses position-aware `nudgeSlideEndFrame` when concatenated beat times are provided. `useBeatGrid` analyzes only clips missing from cache; reorder preserves cache.

Closes #49.

## Slice 22 — Proportional timeline UI (in progress)

`TimelinePanel` replaces `StoryboardFilmstrip`: proportional media widths, audio lane with waveforms and gain sliders, shared scroll + playhead.

Closes #48.
