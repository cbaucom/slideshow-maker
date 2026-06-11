# Issue #11 — Folder audio + soundtrack playback

## Scope

- Detect MP3/M4A/WAV in project folder; exclude from storyboard grid
- UI to pick soundtrack; persist `soundtrackFilename` in `slideshow.json`
- `RenderPlan.soundtrack` with constant volume; Composition plays from frame 0
- Audio ends when track ends (no loop) if show is longer

## Module changes

| Module | Change |
| --- | --- |
| `timeline-core/media.ts` | `isSupportedAudio()` |
| `project-store/audio-loader.ts` | `enumerateAudioTracks()`, blob URL lifecycle |
| `project-store/schema.ts` | `soundtrackFilename?: string` on `SlideshowJson` |
| `sequence-planner/types.ts` | `SoundtrackTrack` on `RenderPlan` |
| `sequence-planner/planner.ts` | Optional soundtrack input → plan output |
| `composition/SlideshowComposition.tsx` | `<Audio>` when plan has soundtrack |
| `editor-shell/SoundtrackPanel.tsx` | Soundtrack picker |
| `editor-shell/slidePersistence.ts` | Round-trip `soundtrackFilename` |
| `editor-shell/App.tsx` | Wire audio state, autosave, plan |

## Tests

- `media.test.ts`: audio extension detection
- `planner.test.ts`: soundtrack on RenderPlan, volume constant
- `slidePersistence.test.ts`: soundtrack in JSON round-trip

## Out of scope

- Ducking, beat sync, Jamendo, looping
