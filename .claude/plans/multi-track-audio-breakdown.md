# Approved issue breakdown — Multi-track audio timeline

Source: parent PRD issue #1. Approved by Chris on 2026-06-22. Expands PRD out-of-scope items (multi-track audio, media looping). Create in listed order; blocked-by references use real issue numbers.

---

## Slice 19 — Audio clip sequence: model, planner, composition

**Type**: AFK | **Stories**: 17 | **Blocked by**: #34 | **Issue**: #45

**What to build**: Replace the single-soundtrack model with an ordered, sequential playlist of audio clips. Migrate `soundtrackFilename` → `audioClips` on load.

**Acceptance criteria**:
- [ ] Given multiple audio files in the folder, when the user builds a clip sequence (add / reorder / remove), then `slideshow.json` stores `audioClips: [{ filename, gainDb? }]` and persists across reopen.
- [ ] Given a clip sequence, when planned, then `RenderPlan` contains ordered audio segments with absolute `startFrame`, `durationInFrames`, `blobUrl`, and per-clip gain (default 0 dB).
- [ ] Given sequential clips, when played/exported, then clip 2 starts exactly when clip 1 ends (frame-accurate, no gap/overlap).
- [ ] Given an existing project with only `soundtrackFilename`, when opened, then it loads as a one-clip sequence without data loss.

**Technical notes**: Timeline Core `AudioClip` type; `slidePersistence` migration; `planner.ts` multi-audio; `SlideshowComposition` multiple `<Audio>`; minimal `SoundtrackPanel` clip list. Duration unchanged — `totalFrames` still visual-only.

---

## Slice 20 — Loudness normalization + per-clip gain overrides

**Type**: AFK | **Stories**: new | **Blocked by**: #45 | **Issue**: #47

**What to build**: Pure loudness-analysis module computing recommended gain offset (dB) per audio file. Auto-normalize by default; manual `gainDb` on clip overrides.

**Acceptance criteria**:
- [ ] Given two synthetic tracks with known RMS difference, when analyzed, then recommended offsets bring perceived levels within ±1 dB of a target.
- [ ] Given analyzed tracks, when a clip has no manual `gainDb`, then playback/export uses the auto-normalized level.
- [ ] Given a user-adjusted gain on a clip, when saved, then the manual value wins until reset.
- [ ] Given analysis results, when the project reopens, then cached offsets in `loudnessCache` avoid re-analysis unless the file changes.

**Technical notes**: `src/audio-analysis/` or extend beat-grid decode; RMS/peak target level; planner `effectiveGainDb`; `soundtrackVolume.ts` combines gain + ducking.

---

## Slice 21 — Audio-driven duration + full-sequence media loop

**Type**: AFK | **Stories**: 17, 18 | **Blocked by**: #45 | **Issue**: #46

**What to build**: When audio exceeds visual timeline, `totalFrames` = sum of clip durations. Loop entire slide sequence deterministically until audio ends.

**Acceptance criteria**:
- [ ] Given audio longer than one pass of slides, when planned, then `totalFrames` equals total audio duration and slide entries repeat with correct transitions at loop boundaries.
- [ ] Given audio shorter than visual, when planned, then `totalFrames` equals visual duration.
- [ ] Given beat sync on, when looping, then nudged durations apply on every pass.
- [ ] Given a fixed fixture, when planned, then RenderPlan matches a golden snapshot including looped entries.

**Technical notes**: Core planner change; loop boundaries use normal adjacent-slide transitions; videos replay each pass.

---

## Slice 22 — Proportional timeline UI + audio lane with gain controls

**Type**: HITL | **Stories**: 6, 31 | **Blocked by**: #45, #47, #46 | **Issue**: #48

**What to build**: Time-proportional timeline: media thumbnails (width ∝ duration) + audio lane with waveforms, clip boundaries, per-clip gain sliders. Shared scroll; playhead sync.

**Acceptance criteria**:
- [ ] Given mixed durations, when rendered, then thumbnail widths are proportional to slide duration.
- [ ] Given an audio clip sequence, when rendered, then clips appear on a lane below media aligned to start times.
- [ ] Given a gain slider, when adjusted, then playback changes immediately and `gainDb` persists.
- [ ] Given playback or scrubbing, when the playhead moves, then media and audio lanes highlight consistently.
- [ ] HITL: owner signs off on iMovie-like usability on a 10-clip project.

**Technical notes**: `TimelinePanel.tsx` or refactor `StoryboardFilmstrip`; composition-patterns skill; Remotion waveform or Web Audio peaks.

---

## Slice 23 — Beat grid across multi-clip audio timeline

**Type**: AFK | **Stories**: 18–22 | **Blocked by**: #45, #46 | **Issue**: #49

**What to build**: Beat sync against concatenated virtual soundtrack. Per-file `beatGridCache`; effective grid spans full timeline with clip start offsets.

**Acceptance criteria**:
- [ ] Given 2+ clips, when beat sync on, then boundaries nudge against beats on combined timeline.
- [ ] Given manual beat grid, when clips reordered, then beat positions stay correct relative to concatenated playback.
- [ ] Given beat sync with looped media, when planned, then nudging aligns across full audio duration.
- [ ] Given per-file cache, when a new clip added, then only that file is analyzed.

**Technical notes**: `concatBeatGrid` pure function; `useBeatGrid` on clip list changes.

---

## Published

| Slice | Issue |
|-------|-------|
| 19 — Audio clip sequence | #45 |
| 20 — Loudness normalization | #47 |
| 21 — Audio-driven duration + loop | #46 |
| 22 — Proportional timeline UI | #48 |
| 23 — Beat grid multi-clip | #49 |
