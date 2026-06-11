import type { TitleSlide } from '../timeline-core/types'
import type { SlideOverrides, TransitionType } from '../timeline-core'

const FPS = 30

type Props = {
  onClose: () => void
  onOverride: (id: string, overrides: SlideOverrides | undefined) => void
  onUpdate: (id: string, updates: Partial<Pick<TitleSlide, 'heading' | 'subtext' | 'style' | 'durationInFrames'>>) => void
  slide: TitleSlide
}

export function TitleSlideDialog({ onClose, onOverride, onUpdate, slide }: Props) {
  const ov = slide.overrides ?? {}

  function setTransition(type: TransitionType) {
    onOverride(slide.id, { ...ov, transitionType: type })
  }

  function clearTransition() {
    const next = { ...ov }
    delete next.transitionType
    onOverride(slide.id, Object.keys(next).length > 0 ? next : undefined)
  }

  return (
    <div
      className="slide-dialog-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Title slide settings"
    >
      <div className="slide-dialog">
        <div className="slide-dialog-header">
          <h3 className="slide-dialog-title">Title Slide</h3>
          <button className="slide-dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="override-row">
          <span className="override-label">Heading</span>
          <input
            type="text"
            className="settings-input"
            value={slide.heading}
            onChange={e => onUpdate(slide.id, { heading: e.target.value })}
            placeholder="Enter heading"
            style={{ flex: 1 }}
          />
        </div>

        <div className="override-row">
          <span className="override-label">Subtext</span>
          <input
            type="text"
            className="settings-input"
            value={slide.subtext ?? ''}
            onChange={e => onUpdate(slide.id, { subtext: e.target.value || undefined })}
            placeholder="Optional subtext"
            style={{ flex: 1 }}
          />
        </div>

        <div className="override-row">
          <span className="override-label">Style</span>
          <select
            className="settings-select"
            value={slide.style}
            onChange={e => onUpdate(slide.id, { style: e.target.value as 'light' | 'dark' })}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div className="override-row">
          <span className="override-label">Duration</span>
          <input
            type="number"
            className="settings-input"
            min={1}
            max={30}
            step={0.5}
            value={slide.durationInFrames / FPS}
            onChange={e => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v) && v >= 1 && v <= 30) onUpdate(slide.id, { durationInFrames: Math.round(v * FPS) })
            }}
          />
          <span className="settings-unit">s</span>
        </div>

        <div className="override-row">
          <span className="override-label">Transition</span>
          <select
            className="settings-select"
            value={ov.transitionType ?? 'global'}
            onChange={e => {
              const v = e.target.value
              if (v === 'global') clearTransition()
              else setTransition(v as TransitionType)
            }}
          >
            <option value="global">Global default</option>
            <option value="crossfade">Crossfade</option>
            <option value="dip-to-black">Dip to black</option>
            <option value="cut">Cut</option>
          </select>
          {ov.transitionType !== undefined ? (
            <button className="override-reset" onClick={clearTransition} title="Reset to global">↩</button>
          ) : null}
        </div>

        <div className="slide-dialog-footer" />
      </div>
    </div>
  )
}
