import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Player } from '@remotion/player'
import type { Slide, TitleSlide } from '../timeline-core/types'
import { isTitleSlide } from '../timeline-core/types'
import {
  moveSlide,
  toggleExcluded,
  filterIncluded,
  applyImageDuration,
  DEFAULT_GLOBAL_SETTINGS,
  createTitleSlide,
} from '../timeline-core'
import type { GlobalSettings, SlideOverrides, ThemeName } from '../timeline-core'
import { applyTheme } from '../timeline-core'
import {
  addRecentProject,
  enumerateAudioTracks,
  listRecentProjects,
  openProject,
  requestHandlePermission,
  revokeAudioBlobUrls,
  saveProject,
  type AudioTrack,
  type RecentProject,
  type SlideshowJson,
} from '../project-store'
import { enumerateFolder, revokeSlideBlobUrls } from '../project-store/media-loader'
import { plan } from '../sequence-planner'
import { SlideshowComposition } from '../composition'
import { StoryboardGrid } from './StoryboardGrid'
import { GlobalSettingsPanel } from './GlobalSettingsPanel'
import { SoundtrackPanel } from './SoundtrackPanel'
import { SlideSettingsDialog } from './SlideSettingsDialog'
import { TitleSlideDialog } from './TitleSlideDialog'
import { reconcileSlides, slidesToJson } from './slidePersistence'
import './App.css'

const FPS = 30
const COMP_WIDTH = 1920
const COMP_HEIGHT = 1080
const AUTOSAVE_DELAY = 2000

export function App() {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS)
  const [slides, setSlides] = useState<Slide[]>([])
  const [soundtrackFilename, setSoundtrackFilename] = useState<string | null>(null)
  const [themeName, setThemeName] = useState<ThemeName | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [corruptError, setCorruptError] = useState<string | null>(null)
  const [folderOpen, setFolderOpen] = useState(false)
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)

  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const pendingAudioRevokeRef = useRef<AudioTrack[]>([])
  const pendingRevokeRef = useRef<Slide[]>([])
  const latestAudioTracksRef = useRef<AudioTrack[]>([])
  const latestSlidesRef = useRef<Slide[]>([])
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    listRecentProjects().then(setRecentProjects).catch(() => {})
  }, [])

  useEffect(() => {
    revokeAudioBlobUrls(pendingAudioRevokeRef.current)
    pendingAudioRevokeRef.current = []
    latestAudioTracksRef.current = audioTracks
  }, [audioTracks])

  useEffect(() => {
    revokeSlideBlobUrls(pendingRevokeRef.current)
    pendingRevokeRef.current = []
    latestSlidesRef.current = slides
  }, [slides])

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
      revokeAudioBlobUrls(latestAudioTracksRef.current)
      revokeSlideBlobUrls(latestSlidesRef.current)
    }
  }, [])

  // Autosave on slides or settings change
  useEffect(() => {
    const handle = dirHandleRef.current
    if (!handle) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      saveProject(handle, slidesToJson(globalSettings, slides, soundtrackFilename, themeName)).catch(console.error)
    }, AUTOSAVE_DELAY)
  }, [globalSettings, slides, soundtrackFilename, themeName])

  const loadFolder = useCallback(
    async (handle: FileSystemDirectoryHandle, savedData?: SlideshowJson) => {
      setLoading(true)
      setError(null)
      try {
        const enumerated = await enumerateFolder(handle)
        const nextAudioTracks = await enumerateAudioTracks(handle)
        const restoredSettings = savedData?.globalSettings ?? DEFAULT_GLOBAL_SETTINGS
        const restoredThemeName = savedData?.themeName ?? null
        const savedSoundtrack = savedData?.soundtrackFilename ?? null
        const validSoundtrack =
          savedSoundtrack && nextAudioTracks.some((track) => track.filename === savedSoundtrack)
            ? savedSoundtrack
            : null
        let finalSlides: Slide[] = savedData ? reconcileSlides(enumerated, savedData) : enumerated
        // Apply global duration only to media slides not already in savedData (new files added to folder).
        const savedFilenames = new Set(
          savedData?.slides.flatMap(s => ('filename' in s ? [s.filename] : [])) ?? [],
        )
        finalSlides = finalSlides.map(s => {
          if (isTitleSlide(s)) return s
          return s.type === 'image' && !savedFilenames.has(s.filename)
            ? { ...s, durationInFrames: Math.round(restoredSettings.imageDurationSecs * FPS) }
            : s
        })
        pendingAudioRevokeRef.current = audioTracks
        pendingRevokeRef.current = latestSlidesRef.current
        setAudioTracks(nextAudioTracks)
        setGlobalSettings(restoredSettings)
        setThemeName(restoredThemeName)
        setSlides(finalSlides)
        setSoundtrackFilename(validSoundtrack)
        setFolderOpen(true)
        setSelectedSlideId(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to read folder')
      } finally {
        setLoading(false)
      }
    },
    [audioTracks],
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
    setThemeName(null)
    setSlides(prev => applyImageDuration(prev, updated.imageDurationSecs))
  }, [])

  const handleThemeChange = useCallback((name: ThemeName) => {
    const themeSettings = applyTheme(name)
    setGlobalSettings(themeSettings)
    setThemeName(name)
    setSlides(prev => applyImageDuration(prev, themeSettings.imageDurationSecs))
  }, [])

  const handleSlideClick = useCallback((id: string) => {
    setSelectedSlideId(prev => prev === id ? null : id)
  }, [])

  const handleSlideOverride = useCallback((id: string, overrides: SlideOverrides | undefined) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, overrides } : s))
  }, [])

  const handleAddTitleSlide = useCallback(() => {
    setSlides(prev => [...prev, createTitleSlide(crypto.randomUUID())])
  }, [])

  const handleUpdateTitleSlide = useCallback((
    id: string,
    updates: Partial<Pick<TitleSlide, 'heading' | 'subtext' | 'style' | 'durationInFrames'>>,
  ) => {
    setSlides(prev => prev.map(s => (s.id === id && isTitleSlide(s) ? { ...s, ...updates } : s)))
  }, [])

  const handleStartFresh = useCallback(() => {
    setCorruptError(null)
  }, [])

  const selectedSoundtrack = useMemo(
    () => (soundtrackFilename
      ? audioTracks.find((track) => track.filename === soundtrackFilename)
      : undefined),
    [audioTracks, soundtrackFilename],
  )

  const renderPlan = useMemo(
    () => plan(
      filterIncluded(slides),
      globalSettings,
      undefined,
      selectedSoundtrack
        ? {
            blobUrl: selectedSoundtrack.blobUrl,
            durationInFrames: selectedSoundtrack.durationInFrames,
          }
        : undefined,
    ),
    [globalSettings, selectedSoundtrack, slides],
  )
  const totalFrames = renderPlan.totalFrames > 0 ? renderPlan.totalFrames : FPS

  const selectedSlide: Slide | null = selectedSlideId ? slides.find(s => s.id === selectedSlideId) ?? null : null

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
              onChange={handleSettingsChange}
              onThemeChange={handleThemeChange}
              settings={globalSettings}
              themeName={themeName}
            />
            <SoundtrackPanel
              audioTracks={audioTracks}
              onChange={setSoundtrackFilename}
              soundtrackFilename={soundtrackFilename}
            />
            <div className="sidebar-actions">
              <button onClick={handleAddTitleSlide} className="add-title-btn">
                + Add Title Slide
              </button>
            </div>
            {slides.length > 0 && (
              <StoryboardGrid
                slides={slides}
                selectedSlideId={selectedSlideId}
                onReorder={handleReorder}
                onToggleExclude={handleToggleExclude}
                onSlideClick={handleSlideClick}
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

      {selectedSlide && isTitleSlide(selectedSlide) && (
        <TitleSlideDialog
          slide={selectedSlide}
          onUpdate={handleUpdateTitleSlide}
          onOverride={handleSlideOverride}
          onClose={() => setSelectedSlideId(null)}
        />
      )}
      {selectedSlide && !isTitleSlide(selectedSlide) && (
        <SlideSettingsDialog
          slide={selectedSlide}
          globalSettings={globalSettings}
          onOverride={handleSlideOverride}
          onClose={() => setSelectedSlideId(null)}
        />
      )}
    </div>
  )
}
