import React from 'react'
import { AbsoluteFill, Img } from 'remotion'
import { Video } from '@remotion/media'
import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions'
import type { RenderPlan } from '../sequence-planner/types'
import type { TransitionType } from '../timeline-core/settings'
import type { MediaSlide } from '../timeline-core/types'

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
            <MediaSlideView slide={entry.slide} />
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
    </TransitionSeries>
  )
}

function MediaSlideView({ slide }: { slide: MediaSlide }) {
  const fillStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' }

  if (slide.type === 'video') {
    return (
      <AbsoluteFill>
        <Video src={slide.blobUrl} style={fillStyle} />
      </AbsoluteFill>
    )
  }

  return (
    <AbsoluteFill>
      <Img src={slide.blobUrl} style={fillStyle} alt="" />
    </AbsoluteFill>
  )
}
