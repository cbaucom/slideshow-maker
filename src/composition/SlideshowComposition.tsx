import React, { useCallback } from 'react'
import { AbsoluteFill, Img, interpolate, Sequence, useCurrentFrame } from 'remotion'
import { Audio, Video } from '@remotion/media'
import { loadFont } from '@remotion/google-fonts/Inter'
import type { AudioSegment, RenderPlanEntry, RenderPlan, TransitionSpec } from '../sequence-planner/types'
import { isTitleSlide } from '../timeline-core/types'
import type { MediaSlide, TitleSlide } from '../timeline-core/types'
import { dbToLinear, volumeAtFrame } from './soundtrackVolume'

type MediaRenderPlanEntry = Omit<RenderPlanEntry, 'slide'> & { slide: MediaSlide }
type TitleRenderPlanEntry = Omit<RenderPlanEntry, 'slide'> & { slide: TitleSlide }

const { fontFamily } = loadFont('normal', { weights: ['400', '700'], subsets: ['latin'] })

const LARGE_TIMELINE_ENTRY_COUNT = 60

export type SlideshowProps = {
  plan: RenderPlan
}

function transitionOpacity(frame: number, transitionIn: TransitionSpec | undefined): number {
  if (!transitionIn || transitionIn.durationInFrames <= 0) return 1

  const duration = transitionIn.durationInFrames
  if (transitionIn.type === 'dip-to-black') {
    const midpoint = duration / 2
    if (frame < midpoint) return 0
    return interpolate(frame, [midpoint, duration], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  }

  return interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

function TransitionLayer({
  children,
  transitionIn,
}: {
  children: React.ReactNode
  transitionIn: TransitionSpec | undefined
}) {
  const frame = useCurrentFrame()
  const opacity = transitionOpacity(frame, transitionIn)
  const showDipBlack = transitionIn?.type === 'dip-to-black'
    && transitionIn.durationInFrames > 0
    && frame < transitionIn.durationInFrames

  return (
    <AbsoluteFill>
      {showDipBlack ? <AbsoluteFill style={{ background: '#000' }} /> : null}
      <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  )
}

function SlideEntryView({ entry }: { entry: RenderPlanEntry }) {
  const content = isTitleSlide(entry.slide)
    ? <TitleSlideView entry={entry as TitleRenderPlanEntry} />
    : <MediaSlideView entry={entry as MediaRenderPlanEntry} />

  if (!entry.transitionIn || entry.transitionIn.durationInFrames <= 0) {
    return content
  }

  return (
    <TransitionLayer transitionIn={entry.transitionIn}>
      {content}
    </TransitionLayer>
  )
}

function AbsoluteTimeline({ entries }: { entries: RenderPlanEntry[] }) {
  const premountFor = entries.length > LARGE_TIMELINE_ENTRY_COUNT ? 0 : 30

  return entries.map((entry) => (
    <Sequence
      durationInFrames={entry.durationInFrames}
      from={entry.startFrame}
      key={`${entry.startFrame}-${entry.slide.id}`}
      premountFor={premountFor}
    >
      <SlideEntryView entry={entry} />
    </Sequence>
  ))
}

export function SlideshowComposition({ plan }: SlideshowProps) {
  if (plan.entries.length === 0) {
    return (
      <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 24 }}>No media</span>
      </AbsoluteFill>
    )
  }

  return (
    <AbsoluteFill>
      {plan.audioSegments && plan.duckingEnvelope ? (
        <AudioSegments duckingEnvelope={plan.duckingEnvelope} segments={plan.audioSegments} />
      ) : null}
      <AbsoluteTimeline entries={plan.entries} />
    </AbsoluteFill>
  )
}

// @remotion/media's Audio (not Html5Audio) — required for renderMediaOnWeb export.
function AudioSegments({
  duckingEnvelope,
  segments,
}: {
  duckingEnvelope: NonNullable<RenderPlan['duckingEnvelope']>
  segments: AudioSegment[]
}) {
  return segments.map((segment, index) => (
    <Sequence
      durationInFrames={segment.durationInFrames}
      from={segment.startFrame}
      key={`${segment.startFrame}-${segment.blobUrl}-${index}`}
      layout="none"
    >
      <AudioSegmentAudio duckingEnvelope={duckingEnvelope} segment={segment} />
    </Sequence>
  ))
}

function AudioSegmentAudio({
  duckingEnvelope,
  segment,
}: {
  duckingEnvelope: NonNullable<RenderPlan['duckingEnvelope']>
  segment: AudioSegment
}) {
  const gainLinear = dbToLinear(segment.gainDb)
  const volume = useCallback(
    (localFrame: number) =>
      volumeAtFrame(duckingEnvelope, segment.startFrame + localFrame) * gainLinear,
    [duckingEnvelope, gainLinear, segment.startFrame],
  )
  return <Audio src={segment.blobUrl} volume={volume} />
}

function TitleSlideView({ entry }: { entry: TitleRenderPlanEntry }) {
  const { slide } = entry
  const bg = slide.style === 'light' ? '#fff' : '#111'
  const fg = slide.style === 'light' ? '#111' : '#f0f0f0'

  return (
    <AbsoluteFill style={{ background: bg, alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
      <div style={{ textAlign: 'center', maxWidth: 1600, overflow: 'hidden' }}>
        <div
          style={{
            color: fg,
            fontFamily,
            fontSize: 96,
            fontWeight: 700,
            lineHeight: 1.15,
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          }}
        >
          {slide.heading}
        </div>
        {slide.subtext ? (
          <div
            style={{
              color: fg,
              fontFamily,
              fontSize: 48,
              fontWeight: 400,
              lineHeight: 1.4,
              marginTop: 32,
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            {slide.subtext}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  )
}

function MediaSlideView({ entry }: { entry: MediaRenderPlanEntry }) {
  const { durationInFrames, fitMode, kenBurns, slide, videoVolume } = entry
  const frame = useCurrentFrame()

  let kenBurnsStyle: React.CSSProperties = {}
  if (kenBurns) {
    const lastFrame = Math.max(1, durationInFrames - 1)
    const progress = interpolate(frame, [0, lastFrame], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
    const scale = interpolate(progress, [0, 1], [kenBurns.fromScale, kenBurns.toScale])
    const tx = interpolate(progress, [0, 1], [kenBurns.fromX * 100, kenBurns.toX * 100])
    const ty = interpolate(progress, [0, 1], [kenBurns.fromY * 100, kenBurns.toY * 100])
    kenBurnsStyle = { transform: `scale(${scale}) translate(${tx}%, ${ty}%)` }
  }

  if (slide.type === 'video') {
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        <Video
          muted={videoVolume === 0}
          src={slide.blobUrl}
          style={{ height: '100%', objectFit: 'contain', width: '100%' }}
          volume={videoVolume}
        />
      </AbsoluteFill>
    )
  }

  if (fitMode === 'blur-fill') {
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img
            alt=""
            src={slide.blobUrl}
            style={{
              filter: 'blur(24px)',
              height: '100%',
              objectFit: 'cover',
              transform: 'scale(1.1)',
              width: '100%',
            }}
          />
        </AbsoluteFill>
        <AbsoluteFill style={kenBurnsStyle}>
          <Img
            alt=""
            src={slide.blobUrl}
            style={{ height: '100%', objectFit: 'contain', width: '100%' }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    )
  }

  if (fitMode === 'contain') {
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        <AbsoluteFill style={kenBurnsStyle}>
          <Img
            alt=""
            src={slide.blobUrl}
            style={{ height: '100%', objectFit: 'contain', width: '100%' }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    )
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={kenBurnsStyle}>
        <Img
          alt=""
          src={slide.blobUrl}
          style={{ height: '100%', objectFit: 'cover', width: '100%' }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
