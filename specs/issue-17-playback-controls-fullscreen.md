# Issue 17 — Playback controls + fullscreen

## Scope

Player chrome: play/pause, scrubbing (Remotion `controls`), grid ↔ player position sync, current-slide indicator, and presentation fullscreen (no editor chrome, Esc exits).

## Pure module (`sequence-planner/playback.ts`)

- `slideIdAtFrame(renderPlan, frame)` — last entry whose `startFrame <= frame`
- `startFrameForSlideId(renderPlan, slideId)` — entry start or `null` (excluded / missing)

## Editor shell

- `PlayerPane`: `PlayerRef`, `frameupdate` → `onFrameChange`, presentation fullscreen on container (`fixed inset-0` + Fullscreen API)
- `App`: `currentSlideId` from frame; slide click → `seekTo(startFrame)` + open settings dialog (stories 31 & 32)
- `StoryboardFilmstrip`: `currentSlideId` highlight distinct from settings selection

## Acceptance criteria mapping

| Criterion | Implementation |
| --- | --- |
| Grid click → jump; playhead → highlight | `startFrameForSlideId` + `seekTo`; `slideIdAtFrame` + `currentSlideId` |
| Fullscreen: show only, Esc exits | Presentation overlay + `requestFullscreen` / `fullscreenchange` |
| Scrub matches RenderPlan | Remotion Player renders `SlideshowComposition` at seeked frame |
