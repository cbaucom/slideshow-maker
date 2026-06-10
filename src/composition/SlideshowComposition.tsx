import React from 'react'
import { AbsoluteFill, Img } from 'remotion'
import { Video } from '@remotion/media'
import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import type { MediaSlide } from '../timeline-core/types'

export const CROSSFADE_FRAMES = 15

export type SlideshowProps = {
  slides: MediaSlide[]
}

export function SlideshowComposition({ slides }: SlideshowProps) {
  if (slides.length === 0) {
    return (
      <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 24 }}>No media</span>
      </AbsoluteFill>
    )
  }

  return (
    <TransitionSeries>
      {slides.map((slide, i) => (
        <React.Fragment key={slide.id}>
          <TransitionSeries.Sequence
            durationInFrames={slide.durationInFrames}
            premountFor={30}
          >
            <MediaSlideView slide={slide} />
          </TransitionSeries.Sequence>
          {i < slides.length - 1 && (
            <TransitionSeries.Transition
              presentation={fade()}
              timing={linearTiming({ durationInFrames: CROSSFADE_FRAMES })}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  )
}

function MediaSlideView({ slide }: { slide: MediaSlide }) {
  const fillStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }

  if (slide.type === 'video') {
    return (
      <AbsoluteFill>
        <Video
          src={slide.blobUrl}
          style={fillStyle}
        />
      </AbsoluteFill>
    )
  }

  return (
    <AbsoluteFill>
      <Img
        src={slide.blobUrl}
        style={fillStyle}
        alt=""
      />
    </AbsoluteFill>
  )
}
