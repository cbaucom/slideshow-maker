import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { GlobalSettings, TransitionType, FitMode, ThemeName } from '../timeline-core/settings'

const THEME_LABELS: Record<ThemeName, string> = {
  classic: 'Classic',
  energetic: 'Energetic',
  plain: 'Plain',
}

const THEME_NAMES: ThemeName[] = ['classic', 'energetic', 'plain']

type Props = {
  settings: GlobalSettings
  onChange: (updated: GlobalSettings) => void
  onThemeChange: (name: ThemeName) => void
  themeName: ThemeName | null
}

export function GlobalSettingsPanel({ settings, onChange, onThemeChange, themeName }: Props) {
  function set<K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) {
    onChange({ ...settings, [key]: value })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Theme</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="w-full"
          value={themeName ?? ''}
          onValueChange={value => {
            if (value) onThemeChange(value as ThemeName)
          }}
        >
          {THEME_NAMES.map(name => (
            <ToggleGroupItem key={name} value={name} className="flex-1 text-xs">
              {THEME_LABELS[name]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="image-duration" className="text-xs">Image duration</Label>
        <div className="flex items-center gap-1.5">
          <Input
            id="image-duration"
            type="number"
            className="h-7 w-16 text-right"
            min={1}
            max={30}
            step={0.5}
            value={settings.imageDurationSecs}
            onChange={e => {
              const v = parseFloat(e.target.value)
              if (!isNaN(v) && v >= 1 && v <= 30) set('imageDurationSecs', v)
            }}
          />
          <span className="text-xs text-muted-foreground">s</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="global-transition" className="text-xs">Transition</Label>
        <Select
          value={settings.transitionType}
          onValueChange={value => set('transitionType', value as TransitionType)}
        >
          <SelectTrigger id="global-transition" size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="crossfade">Crossfade</SelectItem>
            <SelectItem value="dip-to-black">Dip to black</SelectItem>
            <SelectItem value="cut">Cut</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="global-ken-burns" className="text-xs">Ken Burns</Label>
        <Switch
          id="global-ken-burns"
          checked={settings.kenBurns}
          onCheckedChange={checked => set('kenBurns', checked)}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="global-fit-mode" className="text-xs">Fit mode</Label>
        <Select
          value={settings.fitMode}
          onValueChange={value => set('fitMode', value as FitMode)}
        >
          <SelectTrigger id="global-fit-mode" size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover (crop)</SelectItem>
            <SelectItem value="contain">Letterbox</SelectItem>
            <SelectItem value="blur-fill">Blur fill</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
