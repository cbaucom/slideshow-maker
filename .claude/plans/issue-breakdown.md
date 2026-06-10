# Approved issue breakdown — Slideshow Creator

Source: parent PRD issue #1. Approved by the project owner on 2026-06-09 (granularity, dependencies, and HITL marking confirmed). The `to-issues` skill may publish these verbatim without re-quizzing. Create in listed order; replace "Blocked by: slice N" with real issue numbers as they are created. Label all `ready-for-agent`; label slice 9 `hitl` as well.

---

## Slice 1 — Walking skeleton: folder in, slideshow out

**Type**: AFK | **Stories**: 1, 4, 8, 30 | **Blocked by**: none

**What to build**: Vite + React + TypeScript scaffold with `@remotion/player`. User picks a folder via the File System Access API; the app enumerates photos/videos inside and plays them as a fixed-duration (3s) crossfade slideshow in a preview pane. Hardcoded settings, no persistence, no grid yet — but the path from disk to playing pixels is complete.

**Acceptance criteria**:
- [ ] Given a folder containing JPG/PNG/HEIC images and MP4/MOV videos, when the user picks it, then all supported media appear as a thumbnail list and unsupported files are ignored.
- [ ] Given enumerated media, when playback starts, then images show for 3s each with crossfades and videos play through at natural length, in filename order.
- [ ] Given a refresh after adding a file to the folder, when the folder is re-read, then the new file appears (story 4).
- [ ] Given `npm run test` and `npm run build`, then both pass in CI.

**Technical notes**: Establish the repo layout for all modules (Timeline Core, Sequence Planner, Composition, Project Store, Editor Shell as folders, even if mostly stubs). Video durations via Mediabunny (see remotion-best-practices: get-video-duration, calculate-metadata). Vitest configured. Composition must be deterministic from props.

---

## Slice 2 — Persistence: project = folder

**Type**: AFK | **Stories**: 2, 3, 34 | **Blocked by**: slice 1

**What to build**: `slideshow.json` written into the project folder holding timeline + settings; debounced autosave on every edit; recent-projects list (directory handles persisted in IndexedDB) with permission re-grant flow on reopen.

**Acceptance criteria**:
- [ ] Given an open project, when any timeline state changes, then `slideshow.json` in the folder reflects it within 2s without user action.
- [ ] Given a previously opened project, when the app loads, then it appears in a recent-projects list and one click (plus any browser permission prompt) reopens it with state intact.
- [ ] Given a folder with no `slideshow.json`, when opened, then a fresh project is initialized without error; given a folder with one, its state is restored.
- [ ] Given a corrupt `slideshow.json`, when opened, then the app surfaces a readable error and offers to start fresh rather than crashing.

**Technical notes**: Project Store module. Serialization round-trip tests against an in-memory fake of FileSystemDirectoryHandle/FileSystemFileHandle. Schema-version field in the JSON from day one.

---

## Slice 3 — Storyboard grid

**Type**: AFK | **Stories**: 6, 7 | **Blocked by**: slice 2

**What to build**: The media bin rendered as a reorderable thumbnail grid (drag to reorder); per-item include/exclude toggle that removes a slide from the timeline without touching the file. Order and inclusion persist via slice 2.

**Acceptance criteria**:
- [ ] Given the grid, when a thumbnail is dragged to a new position, then playback order and `slideshow.json` reflect the new order.
- [ ] Given an excluded item, when the slideshow plays, then it is skipped, and the grid visually distinguishes it; re-including restores it at its position.
- [ ] Given a reorder, when the project is reopened, then the order is preserved.

**Technical notes**: Ordering operations live in Timeline Core (pure, tested); grid is Editor Shell glue.

---

## Slice 4 — Settings cascade + global settings panel

**Type**: AFK | **Stories**: 10 | **Blocked by**: slice 2

**What to build**: The Timeline Core settings-cascade model — global defaults resolved against (not-yet-editable) per-slide overrides — plus a global settings panel exposing image duration, transition type, Ken Burns on/off, and fit mode. Playback consumes resolved settings (transition/motion/fit may be visually stubbed until slices 5–6, but duration must take effect).

**Acceptance criteria**:
- [ ] Given a global image duration of N seconds, when playback runs, then images hold N seconds.
- [ ] Given the resolution function with a global value and a slide override, when resolved, then the override wins; absent an override, the global wins (unit-tested table, even though no override UI exists yet).
- [ ] Given settings changes, when the project reopens, then they persist.

**Technical notes**: `resolve(globalSettings, slideOverrides) → ResolvedSlideSettings` is the contract every later slice builds on — table-driven tests required. No special-cased behavior outside the cascade.

---

## Slice 5 — Sequence Planner + transition vocabulary

**Type**: AFK | **Stories**: foundation for 12, 18, 30 | **Blocked by**: slice 4

**What to build**: The pure Sequence Planner: `(timeline, mediaMetadata) → RenderPlan` with absolute frame positions, per-slide durations, and transition windows. Composition becomes a thin executor of the plan. Implement the full v1 transition set: crossfade, dip-to-black, hard cut.

**Acceptance criteria**:
- [ ] Given a fixed timeline + metadata fixture, when planned, then the RenderPlan matches a golden snapshot (frame positions, windows).
- [ ] Given any plan, property tests hold: total duration consistent with parts; non-transition windows never overlap; transition windows only span adjacent slides.
- [ ] Given each transition type set globally, when played, then it renders correctly between every slide pair, including image→video and video→image boundaries.

**Technical notes**: The most-tested module in the repo. See remotion-best-practices: transitions, sequencing, timing. No decisions downstream of the plan.

---

## Slice 6 — Ken Burns + fit modes

**Type**: AFK | **Stories**: 25, 26, 27, 28 | **Blocked by**: slice 5

**What to build**: Crop-to-fill as the default photo fit with Ken Burns motion (slow zoom in/out + pan), direction auto-alternating across consecutive slides via the RenderPlan; letterbox and blur-fill as alternative fit modes; videos always letterboxed, never cropped.

**Acceptance criteria**:
- [ ] Given a portrait photo in a 16:9 project with default settings, when shown, then it fills the frame with gentle motion and no visible bars.
- [ ] Given consecutive photo slides, when planned, then Ken Burns directions alternate deterministically (assert on RenderPlan, not pixels).
- [ ] Given fit mode letterbox or blur-fill, when applied, then the full photo is visible with black bars or a blurred self-background respectively.
- [ ] Given a video slide of any aspect, when shown, then it is fitted, never cropped, regardless of global fit mode.

**Technical notes**: Motion vectors and fit decisions computed in the Planner (seeded by slide index — deterministic); Composition only applies transforms.

---

## Slice 7 — Per-slide overrides UI

**Type**: AFK | **Stories**: 11, 32 | **Blocked by**: slice 6

**What to build**: Clicking a slide in the grid opens a settings popover exposing per-slide overrides for duration, transition, Ken Burns, and fit mode, with a clear "using global default" state and one-click reset to default.

**Acceptance criteria**:
- [ ] Given a slide override of any setting, when played, then only that slide differs from globals, and the grid marks the slide as customized.
- [ ] Given an override reset, when played, then the slide follows globals again and the override is removed from `slideshow.json`.
- [ ] Given overrides, when the project reopens, then they persist.

**Technical notes**: Pure UI over the slice-4 cascade — no new resolution logic permitted.

---

## Slice 8 — Title slides

**Type**: AFK | **Stories**: 9 | **Blocked by**: slice 5

**What to build**: A title/text slide type insertable at any grid position: editable text (heading + optional subtext), simple styling (light/dark), participates in ordering, transitions, and duration like any slide.

**Acceptance criteria**:
- [ ] Given an inserted title slide with text, when played, then it renders legibly at 1080p for its configured duration with normal transitions on both edges.
- [ ] Given a title slide, when reordered or excluded, then it behaves exactly like a media slide.
- [ ] Given reopen, then title content and position persist.

**Technical notes**: Title slides are first-class Timeline Core entities. Fonts per remotion-best-practices: fonts; avoid text overflow per measuring-text.

---

## Slice 9 — Themes (Classic, Energetic, Plain)

**Type**: **HITL** | **Stories**: 12, 13 | **Blocked by**: slice 7

**What to build**: Theme presets as saved settings objects applied to the global layer: Classic (crossfade, Ken Burns, moderate pacing), Energetic (hard cuts, faster, zoom-in only), Plain (no transitions, no motion, fixed X seconds, videos untouched). Applying a theme does not erase per-slide overrides.

**Acceptance criteria**:
- [ ] Given each theme applied, when played, then global behavior matches its definition, and switching themes is non-destructive to overrides.
- [ ] Given Plain theme, when played, then there are zero transitions and zero motion, images hold exactly the configured duration, and videos play as-is.
- [ ] HITL: the owner reviews each theme on a real photo/video set and signs off on the aesthetics before merge.

**Technical notes**: Themes must be data, not code paths — a theme is a settings object, nothing more.

---

## Slice 10 — Folder audio + soundtrack playback

**Type**: AFK | **Stories**: 17 | **Blocked by**: slice 5

**What to build**: Audio files (MP3/M4A/WAV) in the project folder are detected and offered as soundtrack choices; the selected track plays under the slideshow from frame 0 and is recorded in `slideshow.json`. RenderPlan gains an audio track concept (constant volume for now).

**Acceptance criteria**:
- [ ] Given audio files in the folder, when the project opens, then they are listed as soundtrack options distinct from visual media (and excluded from the storyboard grid).
- [ ] Given a selected soundtrack, when played, then music starts with the show and the selection persists across reopen.
- [ ] Given a show longer than the track, when playback passes the track end, then audio ends gracefully (no crash, no loop) — looping is out of scope.

**Technical notes**: Audio duration via Mediabunny (remotion-best-practices: get-audio-duration, audio).

---

## Slice 11 — Video-audio ducking + per-slide audio overrides

**Type**: AFK | **Stories**: 23, 24 | **Blocked by**: slice 10

**What to build**: The Planner computes a ducking envelope: music ducks to 20% (with short attack/release ramps) wherever a video slide's own audio plays, restoring after. Per-slide audio overrides in the slice-7 popover: mute video audio / mute music / custom mix levels.

**Acceptance criteria**:
- [ ] Given a video slide between photo slides, when played, then music audibly ducks during the video and recovers after, with no pops (ramped, not stepped).
- [ ] Given "mute video audio" on a slide, when played, then music continues at full level through that slide; given "mute music", the inverse.
- [ ] Given a planned timeline, property test: ducking segments in the envelope exactly cover unmuted video-audio spans.

**Technical notes**: Envelope is Planner output (pure, tested); Composition applies volume curves per remotion-best-practices: audio.

---

## Slice 12 — Beat Grid: detection, nudge, energy

**Type**: AFK | **Stories**: 18, 19, 20, 22 | **Blocked by**: slice 10

**What to build**: Beat Grid module: decode the soundtrack (Web Audio), estimate BPM and beat offsets; `nudge(targetDuration, beatGrid, energy)` snaps each slide's boundary to the nearest beat without hard-quantizing. Energy setting (calm/medium/punchy) maps to beats-held-per-slide bands. Beat sync is a cascade setting with a global off switch.

**Acceptance criteria**:
- [ ] Given a synthesized click track of known BPM, when analyzed, then detected BPM is within ±2% and offset within ±30ms.
- [ ] Given beat sync on, when planned, then every slide boundary lands on a beat and each duration deviates from its target by at most half a beat interval.
- [ ] Given beat sync off, when planned, then durations equal targets exactly.
- [ ] Given each energy level on the same timeline+track, when planned, then average slide duration differs in the expected direction.

**Technical notes**: Decode adapter thin; all math pure and heavily tested with synthetic fixtures. Detection results cached in `slideshow.json` so reopen doesn't re-analyze.

---

## Slice 13 — Manual BPM/offset correction

**Type**: AFK | **Stories**: 21 | **Blocked by**: slice 12

**What to build**: A correction UI for bad detections: tap-along-to-the-beat to set BPM and first-beat offset (plus direct numeric entry), previewed live and stored as an override that beats automatic analysis.

**Acceptance criteria**:
- [ ] Given at least 8 taps along a playing track, when applied, then the derived BPM/offset replace the detected grid and the plan re-nudges accordingly.
- [ ] Given a manual correction, when the project reopens or the track is re-analyzed, then the manual values still win until explicitly cleared.
- [ ] Given numeric entry of BPM and offset, when applied, then behavior is identical to tapping.

**Technical notes**: Tap-to-BPM math (median inter-tap interval) is pure and unit-tested in Beat Grid.

---

## Slice 14 — Jamendo search, preview, download

**Type**: AFK | **Stories**: 14, 15, 16 | **Blocked by**: slice 10

**What to build**: In-app music finder backed by the Jamendo API: keyword/mood/genre search, in-place streaming preview, and one-click download of the chosen track into the project folder (after which it flows through slice 10 as a normal folder audio file). Attribution metadata (title, artist, license) saved alongside in `slideshow.json`.

**Acceptance criteria**:
- [ ] Given a search term, when submitted, then results show title/artist/duration with working preview play/stop.
- [ ] Given a chosen result, when added, then the audio file exists in the project folder, appears as a soundtrack option, and its attribution is recorded.
- [ ] Given API failure or zero results, when searching, then a readable empty/error state shows with a hint to drop an audio file into the folder instead.

**Technical notes**: Jamendo client tested against recorded/mocked responses only. Client ID via env config with a documented setup step in the README. Download goes through Project Store.

---

## Slice 15 — Drag-and-drop import to folder

**Type**: AFK | **Stories**: 5 | **Blocked by**: slice 2

**What to build**: Dropping files onto the app window copies them into the project folder and appends them to the timeline; duplicate filenames are auto-suffixed; unsupported types are rejected with a message.

**Acceptance criteria**:
- [ ] Given dropped media files, when the copy completes, then the files exist in the folder and appear at the end of the grid.
- [ ] Given a dropped file whose name already exists, when imported, then it is saved under a suffixed name and both remain playable.
- [ ] Given an unsupported file type, when dropped, then it is skipped with a visible notice and no partial writes remain.

---

## Slice 16 — Playback controls + fullscreen

**Type**: AFK | **Stories**: 31, 36 | **Blocked by**: slice 1

**What to build**: Player chrome: play/pause, scrubbing, click-a-slide-to-jump (grid ↔ player position sync), current-slide indicator, and fullscreen playback suitable for casting a browser tab to a TV.

**Acceptance criteria**:
- [ ] Given a playing show, when a grid slide is clicked, then playback jumps to that slide's start; when the playhead moves, the grid highlights the current slide.
- [ ] Given fullscreen mode, when active, then only the rendered show is visible (no editor chrome) and Esc exits.
- [ ] Given scrubbing to any time, then the rendered frame matches the RenderPlan for that time.

---

## Slice 17 — Missing-media detection

**Type**: AFK | **Stories**: 33 | **Blocked by**: slice 2

**What to build**: On project open (and folder refresh), timeline entries whose files are missing are flagged: a project-level warning lists them, affected grid slides show a broken state, and playback skips them cleanly. Resolution v1 is remove-from-timeline or restore-the-file-and-refresh.

**Acceptance criteria**:
- [ ] Given a timeline referencing a deleted file, when the project opens, then a warning names the missing file(s) and the slide shows a broken-media state.
- [ ] Given playback with a missing slide, when reached, then it is skipped without freezing or crashing.
- [ ] Given the file restored to the folder, when refreshed, then the slide returns to normal with its settings intact.

---

## Slice 18 — PWA + aspect-ratio setting

**Type**: AFK | **Stories**: 29, 35 | **Blocked by**: slice 4

**What to build**: Installable PWA (manifest + service worker for app-shell caching; media is never cached) so folder permissions persist; per-project aspect ratio setting (16:9 default, 9:16, 1:1) that re-derives composition dimensions, with fit modes and Ken Burns behaving correctly in every ratio.

**Acceptance criteria**:
- [ ] Given Chrome/Edge, when visiting, then the app is installable; when launched installed, a previously granted project folder reopens without a new permission prompt (or with at most a single re-grant click, per browser policy).
- [ ] Given aspect 9:16 on an existing project, when played, then the composition is portrait and crop-fill/letterbox/blur-fill all behave correctly.
- [ ] Given the service worker, when offline, then the app shell loads (projects on disk still open; Jamendo gracefully unavailable).

**Technical notes**: Compositions must already be dimension-parametric (PRD requirement); this slice proves it.
