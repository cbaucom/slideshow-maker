# Issue 16 — Drag-and-drop import to folder

## Goal

Drop media files onto the app window → copy into the open project folder → append to the storyboard grid.

## Pure module (`src/project-store/import-media.ts`)

- `resolveUniqueFilename(existingFilenames, desiredFilename)` — suffix `-1`, `-2`, … before extension when name collides.
- `importDroppedMediaFiles(dirHandle, files, existingFilenames)` — validate type first (no writes for unsupported), write blob, return `{ imported: MediaSlide[], skipped: { filename, reason }[] }`.
- Reuse `createMediaSlideFromFile` extracted from `media-loader.ts`.

## Editor shell (thin)

- `useProject.importDroppedFiles(files)` — list folder filenames, call import module, append slides, set dismissible notice for skipped types.
- `DropImportLayer` — `dragover`/`drop` on window when `folderOpen`; ignores non-file drops.

## Tests

In-memory dir fake (blob writable). No live FS/network. Vertical TDD on acceptance criteria.

## Acceptance mapping

| Criterion | Verification |
| --- | --- |
| Files in folder + end of grid | import test + playwright smoke |
| Duplicate suffixed, both playable | import test |
| Unsupported skipped + notice, no partial writes | import test + UI notice |
