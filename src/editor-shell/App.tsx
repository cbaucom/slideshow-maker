import { useCallback, useMemo, useRef, useState } from 'react'
import type { PlayerRef } from '@remotion/player'
import { Button } from '@/components/ui/button'
import type { Slide, TitleSlide } from '../timeline-core/types'
import { isTitleSlide } from '../timeline-core/types'
import {
  moveSlide,
  toggleExcluded,
  filterIncluded,
  applyImageDuration,
  createTitleSlide,
} from '../timeline-core'
import type { GlobalSettings, SlideOverrides, ThemeName } from '../timeline-core'
import { applyTheme, dimensionsForAspectRatio } from '../timeline-core'
import { plan, slideIdAtFrame, startFrameForSlideId } from '../sequence-planner'
import { AppHeader } from './AppHeader'
import { DropImportLayer } from './DropImportLayer'
import { EditorLayout } from './EditorLayout'
import { EditorSidebar } from './EditorSidebar'
import { EmptyState } from './EmptyState'
import { PlayerPane, FPS } from './PlayerPane'
import { StoryboardFilmstrip } from './StoryboardFilmstrip'
import { SlideSettingsDialog } from './SlideSettingsDialog'
import { TitleSlideDialog } from './TitleSlideDialog'
import { useProject } from './useProject'

export function App() {
  const playerRef = useRef<PlayerRef>(null)
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null)
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)

  const clearSelection = useCallback(() => setSelectedSlideId(null), [])
  const project = useProject({ onFolderLoaded: clearSelection })
  const {
    aspectRatio,
    setAspectRatio,
    audioTracks,
    globalSettings,
    setGlobalSettings,
    slides,
    setSlides,
    soundtrackFilename,
    themeName,
    setThemeName,
    loading,
    error,
    corruptError,
    folderOpen,
    importNotice,
    recentProjects,
  } = project

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setSlides(prev => moveSlide(prev, fromIndex, toIndex))
  }, [setSlides])

  const handleToggleExclude = useCallback((id: string) => {
    setSlides(prev => toggleExcluded(prev, id))
  }, [setSlides])

  const handleSettingsChange = useCallback((updated: GlobalSettings) => {
    setGlobalSettings(updated)
    setThemeName(null)
    setSlides(prev => applyImageDuration(prev, updated.imageDurationSecs))
  }, [setGlobalSettings, setSlides, setThemeName])

  const handleThemeChange = useCallback((name: ThemeName) => {
    const themeSettings = applyTheme(name)
    setGlobalSettings(themeSettings)
    setThemeName(name)
    setSlides(prev => applyImageDuration(prev, themeSettings.imageDurationSecs))
  }, [setGlobalSettings, setSlides, setThemeName])

  const handleSlideOverride = useCallback((id: string, overrides: SlideOverrides | undefined) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, overrides } : s))
  }, [setSlides])

  const handleAddTitleSlide = useCallback(() => {
    setSlides(prev => [...prev, createTitleSlide(crypto.randomUUID())])
  }, [setSlides])

  const handleUpdateTitleSlide = useCallback((
    id: string,
    updates: Partial<Pick<TitleSlide, 'heading' | 'subtext' | 'style' | 'durationInFrames'>>,
  ) => {
    setSlides(prev => prev.map(s => (s.id === id && isTitleSlide(s) ? { ...s, ...updates } : s)))
  }, [setSlides])

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
  const canvas = dimensionsForAspectRatio(aspectRatio)

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentSlideId(slideIdAtFrame(renderPlan, frame))
  }, [renderPlan])

  const handleSlideClick = useCallback((id: string) => {
    const startFrame = startFrameForSlideId(renderPlan, id)
    if (startFrame !== null) {
      playerRef.current?.seekTo(startFrame)
    }
    setSelectedSlideId((previousId) => (previousId === id ? null : id))
  }, [renderPlan])

  const selectedSlide: Slide | null = selectedSlideId ? slides.find(s => s.id === selectedSlideId) ?? null : null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DropImportLayer enabled={folderOpen} onDropFiles={project.importDroppedFiles} />
      <AppHeader
        folderOpen={folderOpen}
        loading={loading}
        onPickFolder={project.pickFolder}
        onRefresh={project.refresh}
      />

      {error && (
        <div className="shrink-0 border-b border-destructive/30 bg-destructive/15 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {corruptError && (
        <div className="flex shrink-0 items-center gap-2 border-b border-destructive/30 bg-destructive/15 px-4 py-2 text-sm text-destructive">
          <span>
            <strong>Could not restore project:</strong> {corruptError}
          </span>
          <Button size="xs" variant="outline" onClick={project.dismissCorruptError}>
            Start Fresh
          </Button>
        </div>
      )}

      {importNotice ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-sm text-amber-200">
          <span>{importNotice}</span>
          <Button size="xs" variant="outline" onClick={project.dismissImportNotice}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {loading && (
        <div className="shrink-0 border-b bg-blue-950/40 px-4 py-1.5 text-sm text-blue-300">
          Loading media…
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        {folderOpen ? (
          <EditorLayout
            player={(
              <PlayerPane
                compositionHeight={canvas.height}
                compositionWidth={canvas.width}
                onFrameChange={handleFrameChange}
                playerRef={playerRef}
                renderPlan={renderPlan}
                totalFrames={totalFrames}
              />
            )}
            filmstrip={slides.length > 0 ? (
              <StoryboardFilmstrip
                currentSlideId={currentSlideId}
                onReorder={handleReorder}
                onSlideClick={handleSlideClick}
                onToggleExclude={handleToggleExclude}
                selectedSlideId={selectedSlideId}
                slides={slides}
              />
            ) : null}
            sidebar={
              <EditorSidebar
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                settings={globalSettings}
                themeName={themeName}
                onSettingsChange={handleSettingsChange}
                onThemeChange={handleThemeChange}
                audioTracks={audioTracks}
                soundtrackFilename={soundtrackFilename}
                onSoundtrackChange={project.changeSoundtrack}
                jamendoClientId={import.meta.env.VITE_JAMENDO_CLIENT_ID}
                onJamendoAdd={project.addJamendoTrack}
                onAddTitleSlide={handleAddTitleSlide}
              />
            }
          />
        ) : (
          !loading && (
            <EmptyState recentProjects={recentProjects} onOpenRecent={project.openRecent} />
          )
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
