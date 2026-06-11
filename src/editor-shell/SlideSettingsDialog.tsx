import type { MediaSlide } from '../timeline-core/types'
import type { FitMode, GlobalSettings, SlideOverrides, TransitionType } from '../timeline-core'

type Props = {
  globalSettings: GlobalSettings
  onClose: () => void
  onOverride: (id: string, overrides: SlideOverrides | undefined) => void
  slide: MediaSlide
}

export function SlideSettingsDialog({ globalSettings, onClose, onOverride, slide }: Props) {
  const ov = slide.overrides ?? {}
  const hasOverrides = Object.keys(ov).length > 0

  function setField<K extends keyof SlideOverrides>(key: K, value: SlideOverrides[K]) {
    const next = { ...ov, [key]: value }
    onOverride(slide.id, next)
  }

  function clearField(key: keyof SlideOverrides) {
    const next = { ...ov }
    delete next[key]
    onOverride(slide.id, Object.keys(next).length > 0 ? next : undefined)
  }

  function resetAll() {
    onOverride(slide.id, undefined)
  }

  return (
    <div
      className="slide-dialog-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`Settings for ${slide.filename}`}
    >
      <div className="slide-dialog">
        <div className="slide-dialog-header">
          <h3 className="slide-dialog-title">{slide.filename}</h3>
          <button className="slide-dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {slide.type === 'image' ? (
          <div className="override-row">
            <span className="override-label">Duration</span>
            <input
              type="number"
              className="settings-input"
              min={1}
              max={30}
              step={0.5}
              value={ov.imageDurationSecs ?? globalSettings.imageDurationSecs}
              onChange={e => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && v >= 1 && v <= 30) setField('imageDurationSecs', v)
              }}
            />
            <span className="settings-unit">s</span>
            {ov.imageDurationSecs !== undefined
              ? <button className="override-reset" onClick={() => clearField('imageDurationSecs')} title="Reset to global">↩</button>
              : <span className="override-default">global</span>
            }
          </div>
        ) : null}

        <div className="override-row">
          <span className="override-label">Transition</span>
          <select
            className="settings-select"
            value={ov.transitionType ?? globalSettings.transitionType}
            onChange={e => setField('transitionType', e.target.value as TransitionType)}
          >
            <option value="crossfade">Crossfade</option>
            <option value="dip-to-black">Dip to black</option>
            <option value="cut">Cut</option>
          </select>
          {ov.transitionType !== undefined
            ? <button className="override-reset" onClick={() => clearField('transitionType')} title="Reset to global">↩</button>
            : <span className="override-default">global</span>
          }
        </div>

        {slide.type === 'image' ? (
          <div className="override-row">
            <span className="override-label">Ken Burns</span>
            <input
              type="checkbox"
              checked={ov.kenBurns ?? globalSettings.kenBurns}
              onChange={e => setField('kenBurns', e.target.checked)}
            />
            {ov.kenBurns !== undefined
              ? <button className="override-reset" onClick={() => clearField('kenBurns')} title="Reset to global">↩</button>
              : <span className="override-default">global</span>
            }
          </div>
        ) : null}

        {slide.type === 'image' ? (
          <div className="override-row">
            <span className="override-label">Fit mode</span>
            <select
              className="settings-select"
              value={ov.fitMode ?? globalSettings.fitMode}
              onChange={e => setField('fitMode', e.target.value as FitMode)}
            >
              <option value="cover">Cover (crop)</option>
              <option value="contain">Letterbox</option>
              <option value="blur-fill">Blur fill</option>
            </select>
            {ov.fitMode !== undefined
              ? <button className="override-reset" onClick={() => clearField('fitMode')} title="Reset to global">↩</button>
              : <span className="override-default">global</span>
            }
          </div>
        ) : null}

        <div className="slide-dialog-footer">
          {hasOverrides ? (
            <button className="override-reset-all" onClick={resetAll}>
              Reset all to global defaults
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
