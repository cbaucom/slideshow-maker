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
import type { FitMode, GlobalSettings, SlideOverrides, TransitionType } from '../timeline-core'
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
      ordered.push({
        ...live,
        durationInFrames: s.durationInFrames,
        excluded: s.excluded ?? false,
        overrides: s.overrides,
      })
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
    slides: slides.map(({ id, filename, type, durationInFrames, excluded, overrides }) => ({
      id,
      filename,
      type,
      durationInFrames,
      excluded,
      ...(overrides && Object.keys(overrides).length > 0 ? { overrides } : {}),
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
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)

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
        setSelectedSlideId(null)
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

  const handleSlideClick = useCallback((id: string) => {
    setSelectedSlideId(prev => prev === id ? null : id)
  }, [])

  const handleSlideOverride = useCallback((id: string, overrides: SlideOverrides | undefined) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, overrides } : s))
  }, [])

  const handleStartFresh = useCallback(() => {
    setCorruptError(null)
  }, [])

  const renderPlan = useMemo(
    () => plan(filterIncluded(slides), globalSettings),
    [slides, globalSettings],
  )
  const totalFrames = renderPlan.totalFrames > 0 ? renderPlan.totalFrames : FPS

  const selectedSlide = selectedSlideId ? slides.find(s => s.id === selectedSlideId) ?? null : null

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

      {selectedSlide && (
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

function SlideSettingsDialog({
  slide,
  globalSettings,
  onOverride,
  onClose,
}: {
  slide: MediaSlide
  globalSettings: GlobalSettings
  onOverride: (id: string, overrides: SlideOverrides | undefined) => void
  onClose: () => void
}) {
  const ov = slide.overrides ?? {}
  const hasOverrides = Object.keys(ov).length > 0

  function setField<K extends keyof SlideOverrides>(key: K, value: SlideOverrides[K]) {
    const next = { ...ov, [key]: value }
    onOverride(slide.id, next)
  }

  function clearField(key: keyof SlideOverrides) {
    const next = { ...ov }
    delete next[key]
    onOverride(slide.id, Object.keys(next).length > 0 ? next : undefined)
  }

  function resetAll() {
    onOverride(slide.id, undefined)
  }

  return (
    <div
      className="slide-dialog-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`Settings for ${slide.filename}`}
    >
      <div className="slide-dialog">
        <div className="slide-dialog-header">
          <h3 className="slide-dialog-title">{slide.filename}</h3>
          <button className="slide-dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Duration — images only */}
        {slide.type === 'image' && (
          <div className="override-row">
            <span className="override-label">Duration</span>
            <input
              type="number"
              className="settings-input"
              min={1}
              max={30}
              step={0.5}
              value={ov.imageDurationSecs ?? globalSettings.imageDurationSecs}
              onChange={e => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && v >= 1 && v <= 30) setField('imageDurationSecs', v)
              }}
            />
            <span className="settings-unit">s</span>
            {ov.imageDurationSecs !== undefined
              ? <button className="override-reset" onClick={() => clearField('imageDurationSecs')} title="Reset to global">↩</button>
              : <span className="override-default">global</span>
            }
          </div>
        )}

        {/* Transition */}
        <div className="override-row">
          <span className="override-label">Transition</span>
          <select
            className="settings-select"
            value={ov.transitionType ?? globalSettings.transitionType}
            onChange={e => setField('transitionType', e.target.value as TransitionType)}
          >
            <option value="crossfade">Crossfade</option>
            <option value="dip-to-black">Dip to black</option>
            <option value="cut">Cut</option>
          </select>
          {ov.transitionType !== undefined
            ? <button className="override-reset" onClick={() => clearField('transitionType')} title="Reset to global">↩</button>
            : <span className="override-default">global</span>
          }
        </div>

        {/* Ken Burns — images only */}
        {slide.type === 'image' && (
          <div className="override-row">
            <span className="override-label">Ken Burns</span>
            <input
              type="checkbox"
              checked={ov.kenBurns ?? globalSettings.kenBurns}
              onChange={e => setField('kenBurns', e.target.checked)}
            />
            {ov.kenBurns !== undefined
              ? <button className="override-reset" onClick={() => clearField('kenBurns')} title="Reset to global">↩</button>
              : <span className="override-default">global</span>
            }
          </div>
        )}

        {/* Fit mode — images only */}
        {slide.type === 'image' && (
          <div className="override-row">
            <span className="override-label">Fit mode</span>
            <select
              className="settings-select"
              value={ov.fitMode ?? globalSettings.fitMode}
              onChange={e => setField('fitMode', e.target.value as FitMode)}
            >
              <option value="cover">Cover (crop)</option>
              <option value="contain">Letterbox</option>
              <option value="blur-fill">Blur fill</option>
            </select>
            {ov.fitMode !== undefined
              ? <button className="override-reset" onClick={() => clearField('fitMode')} title="Reset to global">↩</button>
              : <span className="override-default">global</span>
            }
          </div>
        )}

        <div className="slide-dialog-footer">
          {hasOverrides && (
            <button className="override-reset-all" onClick={resetAll}>
              Reset all to global defaults
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
