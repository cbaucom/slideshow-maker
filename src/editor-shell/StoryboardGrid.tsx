import { useRef } from 'react'
import type { MediaSlide } from '../timeline-core/types'

type Props = {
  slides: MediaSlide[]
  selectedSlideId: string | null
  onReorder: (fromIndex: number, toIndex: number) => void
  onToggleExclude: (id: string) => void
  onSlideClick: (id: string) => void
}

function hasOverrides(slide: MediaSlide): boolean {
  return !!slide.overrides && Object.keys(slide.overrides).length > 0
}

export function StoryboardGrid({ slides, selectedSlideId, onReorder, onToggleExclude, onSlideClick }: Props) {
  const dragIndexRef = useRef<number | null>(null)
  const included = slides.filter(s => !s.excluded).length

  return (
    <div className="storyboard-grid">
      <p className="storyboard-count">
        {included === slides.length
          ? `${slides.length} media file${slides.length !== 1 ? 's' : ''}`
          : `${included} / ${slides.length} included`}
      </p>
      <ul className="storyboard-list">
        {slides.map((slide, index) => (
          <li
            key={slide.id}
            className={[
              'storyboard-item',
              slide.excluded ? 'storyboard-item--excluded' : '',
              selectedSlideId === slide.id ? 'storyboard-item--selected' : '',
            ].filter(Boolean).join(' ')}
            draggable
            onDragStart={() => { dragIndexRef.current = index }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
                onReorder(dragIndexRef.current, index)
              }
              dragIndexRef.current = null
            }}
            onDragEnd={() => { dragIndexRef.current = null }}
            onClick={() => onSlideClick(slide.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="storyboard-thumb-wrap">
              {slide.type === 'video' ? (
                <video
                  src={slide.blobUrl}
                  className="storyboard-thumb"
                  muted
                  draggable={false}
                />
              ) : (
                <img
                  src={slide.blobUrl}
                  alt={slide.filename}
                  className="storyboard-thumb"
                  draggable={false}
                />
              )}
              {slide.type === 'video' && <span className="storyboard-badge">▶</span>}
              {slide.excluded && <div className="storyboard-excluded-overlay">excluded</div>}
              {hasOverrides(slide) && (
                <span className="storyboard-customized" title="Has custom settings">★</span>
              )}
            </div>
            <span className="storyboard-name">{slide.filename}</span>
            <button
              className="storyboard-toggle"
              onClick={e => { e.stopPropagation(); onToggleExclude(slide.id) }}
              title={slide.excluded ? 'Re-include in slideshow' : 'Exclude from slideshow'}
              aria-label={slide.excluded ? `Include ${slide.filename}` : `Exclude ${slide.filename}`}
            >
              {slide.excluded ? '+' : '×'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
