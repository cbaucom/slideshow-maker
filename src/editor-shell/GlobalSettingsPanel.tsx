import type { GlobalSettings, TransitionType, FitMode } from '../timeline-core/settings'

type Props = {
  settings: GlobalSettings
  onChange: (updated: GlobalSettings) => void
}

export function GlobalSettingsPanel({ settings, onChange }: Props) {
  function set<K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="settings-panel">
      <h2 className="settings-title">Settings</h2>

      <label className="settings-row">
        <span className="settings-label">Image duration</span>
        <input
          type="number"
          className="settings-input"
          min={1}
          max={30}
          step={0.5}
          value={settings.imageDurationSecs}
          onChange={e => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v) && v >= 1 && v <= 30) set('imageDurationSecs', v)
          }}
        />
        <span className="settings-unit">s</span>
      </label>

      <label className="settings-row">
        <span className="settings-label">Transition</span>
        <select
          className="settings-select"
          value={settings.transitionType}
          onChange={e => set('transitionType', e.target.value as TransitionType)}
        >
          <option value="crossfade">Crossfade</option>
          <option value="dip-to-black">Dip to black</option>
          <option value="cut">Cut</option>
        </select>
      </label>

      <label className="settings-row">
        <span className="settings-label">Ken Burns</span>
        <input
          type="checkbox"
          checked={settings.kenBurns}
          onChange={e => set('kenBurns', e.target.checked)}
        />
      </label>

      <label className="settings-row">
        <span className="settings-label">Fit mode</span>
        <select
          className="settings-select"
          value={settings.fitMode}
          onChange={e => set('fitMode', e.target.value as FitMode)}
        >
          <option value="cover">Cover (crop)</option>
          <option value="contain">Letterbox</option>
          <option value="blur-fill">Blur fill</option>
        </select>
      </label>
    </div>
  )
}
