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
