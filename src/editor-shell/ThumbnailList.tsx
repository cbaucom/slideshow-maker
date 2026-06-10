import type { MediaSlide } from '../timeline-core/types'

type Props = {
  slides: MediaSlide[]
}

export function ThumbnailList({ slides }: Props) {
  return (
    <div className="thumbnail-list">
      <p className="thumbnail-count">{slides.length} media file{slides.length !== 1 ? 's' : ''}</p>
      <ul className="thumbnail-grid">
        {slides.map((slide) => (
          <li key={slide.id} className="thumbnail-item">
            <div className="thumbnail-media">
              {slide.type === 'image' ? (
                <img src={slide.blobUrl} alt={slide.filename} className="thumbnail-img" />
              ) : (
                <video src={slide.blobUrl} className="thumbnail-img" muted playsInline />
              )}
              {slide.type === 'video' && (
                <span className="thumbnail-badge">▶</span>
              )}
            </div>
            <span className="thumbnail-name" title={slide.filename}>
              {slide.filename}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
