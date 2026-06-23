import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { AudioClip } from '../timeline-core/types'
import type { Slide } from '../timeline-core/types'
import type { LoudnessCache } from '../audio-analysis/types'
import {
  buildTimelineLayout,
  type RenderPlan,
  type TimelineMediaBlock as TimelineMediaBlockLayout,
} from '../sequence-planner'
import type { AudioTrack } from '../project-store'
import { TimelineAudioClip } from './TimelineAudioClip'
import { TimelineMediaBlock } from './TimelineMediaBlock'
import { TimelineZoomControls } from './TimelineZoomControls'
import type { TimelineDragState } from './timelineDrag'
import { useTimelineZoom } from './useTimelineZoom'
import { useWaveformPeaks } from './useWaveformPeaks'

const TIMELINE_SCROLL_MARGIN_PX = 48

function blockCenterPx(block: TimelineMediaBlockLayout): number {
  return block.leftPx + block.widthPx / 2
}

type Props = {
  audioClips: AudioClip[]
  audioTracks: AudioTrack[]
  currentFrame: number
  currentSlideId: string | null
  isPlaying: boolean
  loudnessCache: LoudnessCache | undefined
  onClearSelection: () => void
  onMoveToBeginning: (indices: number[]) => void
  onMoveToEnd: (indices: number[]) => void
  onReorderBlock: (fromIndices: number[], toIndex: number) => void
  onSeek: (frame: number) => void
  onSlideSelect: (id: string, event: { metaKey: boolean; seek?: boolean; shiftKey: boolean }) => void
  onToggleExclude: (id: string) => void
  onToggleExcludeIndices: (indices: number[]) => void
  renderPlan: RenderPlan
  selectedSlideIds: ReadonlySet<string>
  slides: Slide[]
}

export function TimelinePanel({
  audioClips,
  audioTracks,
  currentFrame,
  currentSlideId,
  isPlaying,
  loudnessCache,
  onClearSelection,
  onMoveToBeginning,
  onMoveToEnd,
  onReorderBlock,
  onSeek,
  onSlideSelect,
  onToggleExclude,
  onToggleExcludeIndices,
  renderPlan,
  selectedSlideIds,
  slides,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const mediaDragRef = useRef<TimelineDragState | null>(null)
  const lastScrolledSelectionRef = useRef<string | null>(null)
  const { waveformCache } = useWaveformPeaks({ audioClips, audioTracks })
  const {
    pixelsPerFrame,
    resetZoom,
    setPixelsPerFrame,
    zoomIn,
    zoomOut,
    zoomPercent,
  } = useTimelineZoom({ scrollRef })

  const audioFilenames = useMemo(
    () => audioClips.map((clip) => clip.filename),
    [audioClips],
  )

  const layout = useMemo(
    () => buildTimelineLayout(slides, renderPlan, audioFilenames, pixelsPerFrame),
    [audioFilenames, pixelsPerFrame, renderPlan, slides],
  )

  const playheadLeftPx = currentFrame * pixelsPerFrame
  const included = slides.filter((slide) => !slide.excluded).length
  const selectionCount = selectedSlideIds.size

  const handleTimelineClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-timeline-block]')) return

    onClearSelection()

    const bounds = event.currentTarget.getBoundingClientRect()
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0
    const clickX = event.clientX - bounds.left + scrollLeft
    const frame = Math.round(clickX / pixelsPerFrame)
    const clampedFrame = Math.max(0, Math.min(frame, Math.max(renderPlan.totalFrames - 1, 0)))
    onSeek(clampedFrame)
  }, [onClearSelection, onSeek, pixelsPerFrame, renderPlan.totalFrames])

  const scrollToCenterPx = useCallback((targetPx: number) => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const margin = TIMELINE_SCROLL_MARGIN_PX
    const viewStart = scrollElement.scrollLeft
    const viewEnd = viewStart + scrollElement.clientWidth

    if (targetPx < viewStart + margin || targetPx > viewEnd - margin) {
      scrollElement.scrollLeft = Math.max(0, targetPx - scrollElement.clientWidth / 2)
    }
  }, [])

  useEffect(() => {
    if (!isPlaying) return
    scrollToCenterPx(playheadLeftPx)
  }, [isPlaying, playheadLeftPx, scrollToCenterPx])

  const selectedSlideId = selectedSlideIds.size === 1 ? [...selectedSlideIds][0] : null

  useEffect(() => {
    if (!selectedSlideId) {
      lastScrolledSelectionRef.current = null
    }
  }, [selectedSlideId])

  useEffect(() => {
    if (isPlaying || !selectedSlideId) return
    if (lastScrolledSelectionRef.current === selectedSlideId) return

    const block = layout.mediaBlocks.find((entry) => entry.slideId === selectedSlideId)
    if (!block) return

    scrollToCenterPx(blockCenterPx(block))
    lastScrolledSelectionRef.current = selectedSlideId
  }, [isPlaying, layout.mediaBlocks, scrollToCenterPx, selectedSlideId])

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2">
        <p className="text-xs text-muted-foreground">
          {included === slides.length
            ? `${slides.length} slide${slides.length !== 1 ? 's' : ''}`
            : `${included} / ${slides.length} included`}
          {selectionCount > 0 ? (
            <span className="text-muted-foreground/70"> · {selectionCount} selected</span>
          ) : null}
          <span className="text-muted-foreground/70"> · ⌘/ctrl+click multi-select · shift+click range · overrides in sidebar</span>
        </p>
        <TimelineZoomControls
          onResetZoom={resetZoom}
          onZoomChange={setPixelsPerFrame}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          pixelsPerFrame={pixelsPerFrame}
          zoomPercent={zoomPercent}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto" ref={scrollRef}>
        <div
          className="relative cursor-crosshair pb-2"
          onClick={handleTimelineClick}
          style={{ width: layout.totalWidthPx }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"
            style={{ left: playheadLeftPx }}
          />

          <div className="relative h-28 border-b border-border/60 px-3 pt-2">
            <p className="mb-1 text-[10px] tracking-wide text-muted-foreground uppercase">Media</p>
            <ul className="relative h-[calc(100%-1rem)]">
              {slides.map((slide, slideIndex) => {
                const block = layout.mediaBlocks[slideIndex]
                if (!block) return null

                return (
                  <TimelineMediaBlock
                    currentSlideId={currentSlideId}
                    dragRef={mediaDragRef}
                    key={slide.id}
                    leftPx={block.leftPx}
                    onMoveToBeginning={onMoveToBeginning}
                    onMoveToEnd={onMoveToEnd}
                    onReorderBlock={onReorderBlock}
                    onSlideSelect={onSlideSelect}
                    onToggleExclude={onToggleExclude}
                    onToggleExcludeIndices={onToggleExcludeIndices}
                    selectedSlideIds={selectedSlideIds}
                    slide={slide}
                    slideIndex={slideIndex}
                    slides={slides}
                    widthPx={block.widthPx}
                  />
                )
              })}
            </ul>
          </div>

          {layout.audioBlocks.length > 0 ? (
            <div className="relative mt-1 h-24 px-3">
              <p className="mb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                Audio · reorder and gain in Soundtrack sidebar
              </p>
              <div className="relative h-[calc(100%-1rem)]">
                {layout.audioBlocks.map((segment, clipIndex) => (
                  <TimelineAudioClip
                    autoGainDb={loudnessCache?.[segment.filename]?.offsetDb}
                    clipIndex={clipIndex}
                    key={`${segment.filename}-${clipIndex}`}
                    manualGainDb={audioClips[clipIndex]?.gainDb}
                    peaks={waveformCache[segment.filename]}
                    segment={segment}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
