# Slideshow Maker

Local-first web app for turning a folder of photos and videos into beat-synced slideshows. Your media stays on your disk — nothing is uploaded to a server.

**Browser requirement:** Chrome or Edge (Chromium). The app uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) to read and write project folders.

## Running locally

**Prerequisites:** Node 22, [pnpm](https://pnpm.io/) 10+

```bash
pnpm install
cp .env.example .env.local   # optional — enables Jamendo music search
pnpm dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_JAMENDO_CLIENT_ID` | No | Jamendo API client ID. Without it, the "Find Music" panel is hidden. |

Vite inlines `VITE_*` vars at build time. The Jamendo client ID is public by design (same as embedding in a client app).

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server with HMR |
| `pnpm build` | Typecheck + production bundle → `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm test` | Run Vitest |
| `pnpm lint` | ESLint |

## Production deployment (Netlify)

The site is a static Vite SPA. Netlify builds on push to `main`:

- **Build command:** `pnpm build`
- **Publish directory:** `dist`
- **Node version:** 22 (via `.nvmrc` / `netlify.toml`)

Set `VITE_JAMENDO_CLIENT_ID` in Netlify → Site configuration → Environment variables (Production + Deploy Previews).

Repo config lives in [`netlify.toml`](netlify.toml).

## How to use the app

### 1. Open a project folder

Click **Open Folder** and pick a directory on your computer. The app scans it for images, videos, and audio files.

**Project layout:**

```
my-vacation/
├── photo1.jpg
├── clip.mp4
├── soundtrack.mp3
├── slideshow.json    ← created automatically — slide order, settings, exclusions
└── exports/          ← created on export — rendered videos land here
```

You can also pick a **Recent project** from the start screen.

Grant read/write permission when prompted — the app needs write access to save `slideshow.json` and exports.

### 2. Curate your storyboard

The filmstrip at the bottom shows every slide in order.

| Action | How |
|--------|-----|
| Reorder | Drag a thumbnail to a new position |
| Exclude / include | Click **×** on a thumbnail (excluded slides are skipped in playback and export) |
| Jump to slide | Click a thumbnail — the player seeks there |
| Per-slide settings | Click a thumbnail to select it, then edit in the dialog (duration, transition, Ken Burns, fit mode, etc.) |
| Title slide | **+ Add Title Slide** in the sidebar — heading, subtext, light/dark style |

A ★ on a thumbnail means that slide has custom overrides. Green ring = currently playing; blue ring = selected.

**Import more media:** With a folder open, drag files from your desktop onto the window. New files are copied into the project folder.

**Refresh:** **Refresh** rescans the folder for new or removed files and reloads `slideshow.json`.

Changes autosave to `slideshow.json` after a short delay.

### 3. Adjust settings

Use the **Settings** panel in the sidebar:

- **Theme** — Classic, Energetic, or Plain
- **Aspect ratio** — 16:9, 9:16, 4:3, 1:1
- **Image duration**, **transition**, **Ken Burns**, **fit mode** — global defaults; override per slide if needed

### 4. Soundtrack

If the folder contains audio files (`.mp3`, `.wav`, etc.), the **Soundtrack** panel lets you pick one. The slideshow is timed to the music's beat grid.

**Find Music (Jamendo):** Search royalty-free tracks and add one to the project folder (requires `VITE_JAMENDO_CLIENT_ID`). Attribution is stored in `slideshow.json`.

### 5. Preview

The main player shows the full composition with transitions and motion. Playback is deterministic — export matches what you see.

### 6. Export

Click **Export Video** when at least one slide is included.

| Option | Description |
|--------|-------------|
| **MP4 (H.264)** | Plays everywhere |
| **WebM (VP9)** | Smaller files |
| **MP3** | Soundtrack mix only |
| **Save to** | Project `exports/` folder, or choose a location with the system save dialog |

Rendering runs entirely in your browser (Remotion + Mediabunny). Long slideshows take time — keep the tab open until export finishes.

## Privacy

- Media files are read from your folder via blob URLs — they never leave your machine except when you explicitly export.
- Jamendo search/download calls `api.jamendo.com` directly from the browser.
- The production build registers a service worker that caches the app shell for offline loading; it does not cache your project media.

## Development

Architecture and contribution workflow: [`CLAUDE.md`](CLAUDE.md), [`standards/slideshow.md`](standards/slideshow.md).
