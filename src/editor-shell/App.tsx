import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Player } from '@remotion/player'
import type { MediaSlide } from '../timeline-core/types'
import {
  moveSlide,
  toggleExcluded,
  filterIncluded,
  applyImageDuration,
  DEFAULT_GLOBAL_SETTINGS,
} from '../timeline-core'
import type { GlobalSettings } from '../timeline-core'
import { enumerateFolder, revokeSlideBlobUrls } from '../project-store/media-loader'
import {
  openProject,
  saveProject,
  addRecentProject,
  listRecentProjects,
  requestHandlePermission,
  type SlideshowJson,
  type RecentProject,
  SCHEMA_VERSION,
} from '../project-store'
import { plan } from '../sequence-planner'
import { SlideshowComposition } from '../composition'
import { StoryboardGrid } from './StoryboardGrid'
import { GlobalSettingsPanel } from './GlobalSettingsPanel'
import './App.css'

const FPS = 30
const COMP_WIDTH = 1920
const COMP_HEIGHT = 1080
const AUTOSAVE_DELAY = 2000

function reconcileSlides(enumerated: MediaSlide[], saved: SlideshowJson): MediaSlide[] {
  const byFilename = new Map(enumerated.map((s) => [s.filename, s]))
  const ordered: MediaSlide[] = []
  for (const s of saved.slides) {
    const live = byFilename.get(s.filename)
    if (live) {
      ordered.push({ ...live, durationInFrames: s.durationInFrames, excluded: s.excluded ?? false })
      byFilename.delete(s.filename)
    }
  }
  for (const slide of byFilename.values()) ordered.push(slide)
  return ordered
}

function slidesToJson(slides: MediaSlide[], globalSettings: GlobalSettings): SlideshowJson {
  return {
    schemaVersion: SCHEMA_VERSION,
    globalSettings,
    slides: slides.map(({ id, filename, type, durationInFrames, excluded }) => ({
      id,
      filename,
      type,
      durationInFrames,
      excluded,
    })),
  }
}

export function App() {
  const [slides, setSlides] = useState<MediaSlide[]>([])
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [corruptError, setCorruptError] = useState<string | null>(null)
  const [folderOpen, setFolderOpen] = useState(false)
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])

  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const pendingRevokeRef = useRef<MediaSlide[]>([])
  const latestSlidesRef = useRef<MediaSlide[]>([])
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    listRecentProjects().then(setRecentProjects).catch(() => {})
  }, [])

  useEffect(() => {
    revokeSlideBlobUrls(pendingRevokeRef.current)
    pendingRevokeRef.current = []
    latestSlidesRef.current = slides
  }, [slides])

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
      revokeSlideBlobUrls(latestSlidesRef.current)
    }
  }, [])

  // Autosave on slides or settings change
  useEffect(() => {
    const handle = dirHandleRef.current
    if (!handle) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      saveProject(handle, slidesToJson(slides, globalSettings)).catch(console.error)
    }, AUTOSAVE_DELAY)
  }, [slides, globalSettings])

  const loadFolder = useCallback(
    async (handle: FileSystemDirectoryHandle, savedData?: SlideshowJson) => {
      setLoading(true)
      setError(null)
      try {
        const enumerated = await enumerateFolder(handle)
        const restoredSettings = savedData?.globalSettings ?? DEFAULT_GLOBAL_SETTINGS
        let finalSlides = savedData ? reconcileSlides(enumerated, savedData) : enumerated
        // Apply global duration only to slides not already in savedData (new files added to folder).
        // Saved slides already carry the correct durationInFrames from when they were last written.
        const savedFilenames = new Set(savedData?.slides.map(s => s.filename) ?? [])
        finalSlides = finalSlides.map(s =>
          s.type === 'image' && !savedFilenames.has(s.filename)
            ? { ...s, durationInFrames: Math.round(restoredSettings.imageDurationSecs * FPS) }
            : s
        )
        pendingRevokeRef.current = latestSlidesRef.current
        setGlobalSettings(restoredSettings)
        setSlides(finalSlides)
        setFolderOpen(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to read folder')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const openFolder = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      dirHandleRef.current = handle
      const result = await openProject(handle)
      setCorruptError(null)
      if (result.status === 'corrupt') {
        setCorruptError(result.error)
        await loadFolder(handle)
        return
      }
      await loadFolder(handle, result.data)
      await addRecentProject(handle).catch(() => {})
      setRecentProjects(await listRecentProjects().catch(() => []))
    },
    [loadFolder],
  )

  const handlePickFolder = useCallback(async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      await openFolder(handle)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError('Could not open folder')
    }
  }, [openFolder])

  const handleRefresh = useCallback(async () => {
    const handle = dirHandleRef.current
    if (!handle) return
    const result = await openProject(handle)
    if (result.status === 'corrupt') {
      setCorruptError(result.error)
      await loadFolder(handle)
      return
    }
    setCorruptError(null)
    await loadFolder(handle, result.data)
  }, [loadFolder])

  const handleOpenRecent = useCallback(
    async (project: RecentProject) => {
      const permission = await requestHandlePermission(project.handle).catch(() => 'denied' as const)
      if (permission !== 'granted') {
        setError(`Permission denied for "${project.name}". Try opening the folder manually.`)
        return
      }
      await openFolder(project.handle)
    },
    [openFolder],
  )

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setSlides(prev => moveSlide(prev, fromIndex, toIndex))
  }, [])

  const handleToggleExclude = useCallback((id: string) => {
    setSlides(prev => toggleExcluded(prev, id))
  }, [])

  const handleSettingsChange = useCallback((updated: GlobalSettings) => {
    setGlobalSettings(updated)
    setSlides(prev => applyImageDuration(prev, updated.imageDurationSecs))
  }, [])

  const handleStartFresh = useCallback(() => {
    setCorruptError(null)
  }, [])

  const includedSlides = filterIncluded(slides)
  const renderPlan = useMemo(
    () => plan(includedSlides, globalSettings),
    [includedSlides, globalSettings],
  )
  const totalFrames = renderPlan.totalFrames > 0 ? renderPlan.totalFrames : FPS

  return (
    <div className="app">
      <header className="app-header">
        <h1>Slideshow Maker</h1>
        <div className="header-actions">
          <button onClick={handlePickFolder} disabled={loading}>
            Open Folder
          </button>
          {folderOpen && (
            <button onClick={handleRefresh} disabled={loading}>
              Refresh
            </button>
          )}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {corruptError && (
        <div className="error-banner">
          <strong>Could not restore project:</strong> {corruptError}
          <button onClick={handleStartFresh} style={{ marginLeft: 8 }}>
            Start Fresh
          </button>
        </div>
      )}

      {loading && <div className="loading-bar">Loading media…</div>}

      <main className="app-main">
        <div className="preview-pane">
          <Player
            component={SlideshowComposition}
            durationInFrames={totalFrames}
            compositionWidth={COMP_WIDTH}
            compositionHeight={COMP_HEIGHT}
            fps={FPS}
            inputProps={{ plan: renderPlan }}
            controls
            style={{ width: '100%', aspectRatio: `${COMP_WIDTH}/${COMP_HEIGHT}` }}
          />
        </div>

        {folderOpen && (
          <aside className="sidebar">
            <GlobalSettingsPanel
              settings={globalSettings}
              onChange={handleSettingsChange}
            />
            {slides.length > 0 && (
              <StoryboardGrid
                slides={slides}
                onReorder={handleReorder}
                onToggleExclude={handleToggleExclude}
              />
            )}
          </aside>
        )}

        {!folderOpen && !loading && (
          <div className="empty-state">
            <p>Pick a folder containing photos and videos to get started.</p>
            {recentProjects.length > 0 && (
              <div className="recent-projects">
                <p>Recent projects:</p>
                <ul>
                  {recentProjects.map((p) => (
                    <li key={p.name}>
                      <button onClick={() => handleOpenRecent(p)}>{p.name}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
