import { useCallback, useDeferredValue, useMemo, useRef, useState, startTransition } from 'react'
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
import { resolveEffectiveGainDb } from '../audio-analysis'
import { AppHeader } from './AppHeader'
import { DropImportLayer } from './DropImportLayer'
import { ExportDialog } from './ExportDialog'
import { EditorLayout } from './EditorLayout'
import { EditorSidebar } from './EditorSidebar'
import { EmptyState } from './EmptyState'
import { PlayerPane, FPS } from './PlayerPane'
import { TimelinePanel } from './TimelinePanel'
import { SlideSettingsDialog } from './SlideSettingsDialog'
import { TitleSlideDialog } from './TitleSlideDialog'
import { useProject } from './useProject'
import { useAudioClipAnalysis } from './useAudioClipAnalysis'
import { useBeatGrid } from './useBeatGrid'

export function App() {
  const playerRef = useRef<PlayerRef>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [currentSlideId, setCurrentSlideId] = useState<string | null>(null)
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const clearSelection = useCallback(() => setSelectedSlideId(null), [])
  const project = useProject({ onFolderLoaded: clearSelection })
  const {
    aspectRatio,
    setAspectRatio,
    audioClips,
    audioTracks,
    beatGridCache,
    globalSettings,
    setGlobalSettings,
    manualBeatGrid,
    loudnessCache,
    slides,
    setSlides,
    themeName,
    setThemeName,
    updateAudioClips,
    updateBeatGridCacheEntry,
    updateBeatGridPersist,
    updateLoudnessCache,
    loading,
    error,
    corruptError,
    folderOpen,
    importNotice,
    recentProjects,
  } = project

  const { pendingBeatFilenames } = useAudioClipAnalysis({
    audioClips,
    audioTracks,
    beatGridCache,
    loudnessCache,
    manualBeatGrid,
    onBeatGridCacheChange: updateBeatGridCacheEntry,
    onLoudnessCacheChange: updateLoudnessCache,
  })

  const beatGrid = useBeatGrid({
    audioClips,
    audioTracks,
    onPersistChange: updateBeatGridPersist,
    pendingBeatFilenames,
    persisted: { beatGridCache, manualBeatGrid },
  })

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
    startTransition(() => {
      setThemeName(name)
      setGlobalSettings((previous) => ({ ...previous, ...themeSettings }))
    })
  }, [setGlobalSettings, setThemeName])

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

  const planAudioClips = useMemo(
    () => audioClips.map((clip) => {
      const track = audioTracks.find((entry) => entry.filename === clip.filename)
      if (!track) return null
      const gainDb = resolveEffectiveGainDb(clip.gainDb, loudnessCache?.[clip.filename])
      return {
        blobUrl: track.blobUrl,
        durationInFrames: track.durationInFrames,
        gainDb,
      }
    }).filter((clip) => clip !== null),
    [audioClips, audioTracks, loudnessCache],
  )

  const planBeatTimes = beatGrid.analysisStatus === 'analyzing'
    ? undefined
    : beatGrid.concatenatedBeatTimes

  const deferredSlides = useDeferredValue(slides)
  const deferredGlobalSettings = useDeferredValue(globalSettings)
  const isReplanning = deferredSlides !== slides || deferredGlobalSettings !== globalSettings

  const renderPlan = useMemo(
    () => plan(
      filterIncluded(deferredSlides),
      deferredGlobalSettings,
      undefined,
      planAudioClips.length > 0 ? planAudioClips : undefined,
      beatGrid.effectiveBeatGrid,
      planBeatTimes,
    ),
    [beatGrid.effectiveBeatGrid, deferredGlobalSettings, deferredSlides, planAudioClips, planBeatTimes],
  )
  const totalFrames = renderPlan.totalFrames > 0 ? renderPlan.totalFrames : FPS
  const canvas = dimensionsForAspectRatio(aspectRatio)

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame)
    setCurrentSlideId(slideIdAtFrame(renderPlan, frame))
  }, [renderPlan])

  const handleSeek = useCallback((frame: number) => {
    playerRef.current?.seekTo(frame)
    setCurrentFrame(frame)
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
        canExport={renderPlan.entries.length > 0}
        folderOpen={folderOpen}
        loading={loading}
        onExport={() => setExporting(true)}
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

      {isReplanning ? (
        <div className="shrink-0 border-b bg-blue-950/40 px-4 py-1.5 text-sm text-blue-300">
          Updating preview…
        </div>
      ) : null}

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
              <TimelinePanel
                audioClips={audioClips}
                audioTracks={audioTracks}
                currentFrame={currentFrame}
                currentSlideId={currentSlideId}
                loudnessCache={loudnessCache}
                onReorder={handleReorder}
                onSeek={handleSeek}
                onSlideClick={handleSlideClick}
                onToggleExclude={handleToggleExclude}
                renderPlan={renderPlan}
                selectedSlideId={selectedSlideId}
                slides={slides}
              />
            ) : null}
            sidebar={
              <EditorSidebar
                analysisStatus={beatGrid.analysisStatus}
                aspectRatio={aspectRatio}
                audioTracks={audioTracks}
                effectiveBeatGrid={beatGrid.effectiveBeatGrid}
                jamendoClientId={import.meta.env.VITE_JAMENDO_CLIENT_ID}
                manualBeatGrid={manualBeatGrid}
                onAddTitleSlide={handleAddTitleSlide}
                onApplyManualBpm={beatGrid.applyManualBpm}
                onApplyTapTimestamps={beatGrid.applyTapTimestamps}
                onAspectRatioChange={setAspectRatio}
                onClearManualBeatGrid={beatGrid.clearManualBeatGrid}
                onJamendoAdd={project.addJamendoTrack}
                onSettingsChange={handleSettingsChange}
                onAudioClipsChange={updateAudioClips}
                onThemeChange={handleThemeChange}
                audioClips={audioClips}
                loudnessCache={loudnessCache}
                settings={globalSettings}
                themeName={themeName}
              />
            }
          />
        ) : (
          !loading && (
            <EmptyState recentProjects={recentProjects} onOpenRecent={project.openRecent} />
          )
        )}
      </main>

      {exporting && (
        <ExportDialog
          fps={FPS}
          height={canvas.height}
          onClose={() => setExporting(false)}
          onSaveVideo={project.saveExportedVideo}
          projectName={project.projectName}
          renderPlan={renderPlan}
          width={canvas.width}
        />
      )}

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
