import React from 'react'
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion'
import { Video } from '@remotion/media'
import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions'
import { loadFont } from '@remotion/google-fonts/Inter'
import type { RenderPlanEntry, RenderPlan } from '../sequence-planner/types'
import type { TransitionType } from '../timeline-core/settings'
import { isTitleSlide } from '../timeline-core/types'
import type { MediaSlide, TitleSlide } from '../timeline-core/types'

type MediaRenderPlanEntry = Omit<RenderPlanEntry, 'slide'> & { slide: MediaSlide }
type TitleRenderPlanEntry = Omit<RenderPlanEntry, 'slide'> & { slide: TitleSlide }

const { fontFamily } = loadFont('normal', { weights: ['400', '700'], subsets: ['latin'] })

export type SlideshowProps = {
  plan: RenderPlan
}

// Custom dip-to-black presentation: both scenes fade through solid black.
type DipToBlackProps = Record<string, never>

const DipToBlackComponent: React.FC<TransitionPresentationComponentProps<DipToBlackProps>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  const opacity =
    presentationDirection === 'exiting' ? presentationProgress : 1 - presentationProgress
  return (
    <AbsoluteFill>
      {children}
      <AbsoluteFill style={{ background: '#000', opacity }} />
    </AbsoluteFill>
  )
}

function dipToBlack(): TransitionPresentation<DipToBlackProps> {
  return { component: DipToBlackComponent, props: {} }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPresentation(type: TransitionType): TransitionPresentation<any> {
  switch (type) {
    case 'crossfade': return fade()
    case 'dip-to-black': return dipToBlack()
    case 'cut': return fade()  // unreachable: cut entries have durationInFrames=0
  }
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
    <TransitionSeries>
      {plan.entries.map((entry) => (
        <React.Fragment key={entry.slide.id}>
          {entry.transitionIn && entry.transitionIn.durationInFrames > 0 && (
            <TransitionSeries.Transition
              presentation={getPresentation(entry.transitionIn.type)}
              timing={linearTiming({ durationInFrames: entry.transitionIn.durationInFrames })}
            />
          )}
          <TransitionSeries.Sequence durationInFrames={entry.durationInFrames} premountFor={30}>
            {isTitleSlide(entry.slide) ? (
              <TitleSlideView entry={entry as TitleRenderPlanEntry} />
            ) : (
              <MediaSlideView entry={entry as MediaRenderPlanEntry} />
            )}
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
  )
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
            fontFamily,
            fontWeight: 700,
            fontSize: 96,
            color: fg,
            lineHeight: 1.15,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {slide.heading}
        </div>
        {slide.subtext && (
          <div
            style={{
              fontFamily,
              fontWeight: 400,
              fontSize: 48,
              color: fg,
              lineHeight: 1.4,
              marginTop: 32,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {slide.subtext}
          </div>
        )}
      </div>
    </AbsoluteFill>
  )
}

function MediaSlideView({ entry }: { entry: MediaRenderPlanEntry }) {
  const { slide, fitMode, kenBurns, durationInFrames } = entry
  const frame = useCurrentFrame()

  // Compute Ken Burns transform (images only; null for videos).
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
    // Videos are always letterboxed (contain), never cropped.
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        <Video
          src={slide.blobUrl}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </AbsoluteFill>
    )
  }

  if (fitMode === 'blur-fill') {
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        {/* Blurred full-bleed background */}
        <AbsoluteFill style={{ overflow: 'hidden' }}>
          <Img
            src={slide.blobUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(24px)',
              transform: 'scale(1.1)',
            }}
            alt=""
          />
        </AbsoluteFill>
        {/* Contained image on top with Ken Burns */}
        <AbsoluteFill style={kenBurnsStyle}>
          <Img
            src={slide.blobUrl}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            alt=""
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
            src={slide.blobUrl}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            alt=""
          />
        </AbsoluteFill>
      </AbsoluteFill>
    )
  }

  // Default: cover (crop-to-fill) with Ken Burns.
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={kenBurnsStyle}>
        <Img
          src={slide.blobUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          alt=""
        />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
