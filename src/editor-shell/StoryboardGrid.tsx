import { useRef } from 'react'
import type { MediaSlide } from '../timeline-core/types'

type Props = {
  slides: MediaSlide[]
  onReorder: (fromIndex: number, toIndex: number) => void
  onToggleExclude: (id: string) => void
}

export function StoryboardGrid({ slides, onReorder, onToggleExclude }: Props) {
  const dragIndexRef = useRef<number | null>(null)

  return (
    <div className="storyboard-grid">
      <p className="storyboard-count">{slides.length} media file{slides.length !== 1 ? 's' : ''}</p>
      <ul className="storyboard-list">
        {slides.map((slide, index) => (
          <li
            key={slide.id}
            className={`storyboard-item${slide.excluded ? ' storyboard-item--excluded' : ''}`}
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
          >
            <div className="storyboard-thumb-wrap">
              <img
                src={slide.blobUrl}
                alt={slide.filename}
                className="storyboard-thumb"
                draggable={false}
              />
              {slide.type === 'video' && <span className="storyboard-badge">▶</span>}
              {slide.excluded && <div className="storyboard-excluded-overlay">excluded</div>}
            </div>
            <span className="storyboard-name">{slide.filename}</span>
            <button
              className="storyboard-toggle"
              onClick={() => onToggleExclude(slide.id)}
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
