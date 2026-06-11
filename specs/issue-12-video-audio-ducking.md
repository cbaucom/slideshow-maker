# Issue 12 — Video-audio ducking + per-slide audio overrides

## Scope

Planner computes a soundtrack ducking envelope; Composition applies volume curves. Per-slide audio overrides live in `SlideSettingsDialog`.

## Types

### SlideOverrides (timeline-core)

| Field | Type | Effect |
| --- | --- | --- |
| `muteMusic` | `boolean?` | Soundtrack silent for slide span |
| `muteVideoAudio` | `boolean?` | Video plays muted; no ducking |
| `musicVolume` | `number?` | Custom soundtrack level (0–1) during slide |
| `videoVolume` | `number?` | Custom video audio level (0–1); default 1 |

### RenderPlan (sequence-planner)

- `SoundtrackTrack.duckingEnvelope`: `{ keyframes, rampFrames, segments }`
- `RenderPlanEntry.videoVolume`: resolved 0–1 for video slides

Constants: `DUCK_LEVEL = 0.2`, `DUCK_RAMP_FRAMES = 6`.

## Ducking rules

1. Video slide, default: duck music to 20% for slide span with 6-frame attack/release ramps.
2. `muteVideoAudio`: music stays at full level; `videoVolume = 0`.
3. `muteMusic`: music at 0 for slide span; video audio unchanged unless `videoVolume` set.
4. `musicVolume` override replaces duck level (or sets level on non-video slides).
5. `videoVolume` override sets video playback volume.

## Composition

- `Html5Audio` uses envelope keyframes interpolated by composition frame.
- `Video` uses `volume` / `muted` from entry `videoVolume`.

## UI

`SlideSettingsDialog`: audio section on all slides; video-only mute-video control.

## Tests

- Golden: photo–video–photo produces one duck segment aligned to video entry.
- Override: muteVideoAudio → no segment; muteMusic → keyframes at 0.
- Property: duck segments exactly cover unmuted, non–mute-music video spans.
