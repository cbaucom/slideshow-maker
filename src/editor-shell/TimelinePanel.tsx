import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { AudioClip } from '../timeline-core/types'
import type { Slide } from '../timeline-core/types'
import { moveAudioClip, removeAudioClip } from '../timeline-core'
import type { LoudnessCache } from '../audio-analysis/types'
import {
  buildTimelineLayout,
  type RenderPlan,
} from '../sequence-planner'
import type { AudioTrack } from '../project-store'
import { TimelineAudioClip } from './TimelineAudioClip'
import { TimelineMediaBlock } from './TimelineMediaBlock'
import { TimelineZoomControls } from './TimelineZoomControls'
import { useTimelineZoom } from './useTimelineZoom'
import { useWaveformPeaks } from './useWaveformPeaks'

type Props = {
  audioClips: AudioClip[]
  audioTracks: AudioTrack[]
  currentFrame: number
  currentSlideId: string | null
  loudnessCache: LoudnessCache | undefined
  onAudioClipGainChange: (clipIndex: number, gainDb: number | undefined) => void
  onAudioClipsChange: (clips: AudioClip[]) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onSeek: (frame: number) => void
  onSlideClick: (id: string) => void
  onToggleExclude: (id: string) => void
  renderPlan: RenderPlan
  selectedSlideId: string | null
  slides: Slide[]
}

export function TimelinePanel({
  audioClips,
  audioTracks,
  currentFrame,
  currentSlideId,
  loudnessCache,
  onAudioClipGainChange,
  onAudioClipsChange,
  onReorder,
  onSeek,
  onSlideClick,
  onToggleExclude,
  renderPlan,
  selectedSlideId,
  slides,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const mediaDragIndexRef = useRef<number | null>(null)
  const audioDragIndexRef = useRef<number | null>(null)
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

  const handleTimelineClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-timeline-block]')) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0
    const clickX = event.clientX - bounds.left + scrollLeft
    const frame = Math.round(clickX / pixelsPerFrame)
    const clampedFrame = Math.max(0, Math.min(frame, Math.max(renderPlan.totalFrames - 1, 0)))
    onSeek(clampedFrame)
  }, [onSeek, pixelsPerFrame, renderPlan.totalFrames])

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const playheadX = playheadLeftPx
    const viewStart = scrollElement.scrollLeft
    const viewEnd = viewStart + scrollElement.clientWidth
    const margin = 48

    if (playheadX < viewStart + margin || playheadX > viewEnd - margin) {
      scrollElement.scrollLeft = Math.max(0, playheadX - scrollElement.clientWidth / 2)
    }
  }, [playheadLeftPx])

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2">
        <p className="text-xs text-muted-foreground">
          {included === slides.length
            ? `${slides.length} slide${slides.length !== 1 ? 's' : ''}`
            : `${included} / ${slides.length} included`}
          <span className="text-muted-foreground/70"> · ⌘/ctrl + scroll to zoom</span>
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
                    dragIndexRef={mediaDragIndexRef}
                    key={slide.id}
                    leftPx={block.leftPx}
                    onReorder={onReorder}
                    onSlideClick={onSlideClick}
                    onToggleExclude={onToggleExclude}
                    selectedSlideId={selectedSlideId}
                    slide={slide}
                    slideIndex={slideIndex}
                    widthPx={block.widthPx}
                  />
                )
              })}
            </ul>
          </div>

          {layout.audioBlocks.length > 0 ? (
            <div className="relative mt-1 h-36 px-3">
              <p className="mb-1 text-[10px] tracking-wide text-muted-foreground uppercase">Audio</p>
              <div className="relative h-[calc(100%-1rem)]">
                {layout.audioBlocks.map((segment, clipIndex) => (
                  <TimelineAudioClip
                    autoGainDb={loudnessCache?.[segment.filename]?.offsetDb}
                    clipIndex={clipIndex}
                    dragIndexRef={audioDragIndexRef}
                    key={`${segment.filename}-${clipIndex}`}
                    manualGainDb={audioClips[clipIndex]?.gainDb}
                    onGainChange={onAudioClipGainChange}
                    onRemove={(index) => onAudioClipsChange(removeAudioClip(audioClips, index))}
                    onReorder={(fromIndex, toIndex) => {
                      onAudioClipsChange(moveAudioClip(audioClips, fromIndex, toIndex))
                    }}
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
