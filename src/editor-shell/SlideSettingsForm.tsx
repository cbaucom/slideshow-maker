import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import type { MediaSlide } from '../timeline-core/types'
import type { FitMode, GlobalSettings, SlideOverrides, TransitionType } from '../timeline-core'
import { OverrideField } from './OverrideField'

type Props = {
  globalSettings: GlobalSettings
  onOverride: (id: string, overrides: SlideOverrides | undefined) => void
  slide: MediaSlide
}

export function SlideSettingsForm({ globalSettings, onOverride, slide }: Props) {
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
    <div className="flex flex-col gap-3">
      {slide.type === 'image' ? (
        <OverrideField
          defaultHint="global"
          htmlFor={`${slide.id}-duration`}
          isOverridden={ov.imageDurationSecs !== undefined}
          label="Duration"
          onReset={() => clearField('imageDurationSecs')}
        >
          <Input
            className="h-7 w-16 text-right"
            id={`${slide.id}-duration`}
            max={30}
            min={1}
            onChange={(event) => {
              const value = parseFloat(event.target.value)
              if (!isNaN(value) && value >= 1 && value <= 30) setField('imageDurationSecs', value)
            }}
            step={0.5}
            type="number"
            value={ov.imageDurationSecs ?? globalSettings.imageDurationSecs}
          />
          <span className="text-xs text-muted-foreground">s</span>
        </OverrideField>
      ) : null}

      <OverrideField
        defaultHint="global"
        htmlFor={`${slide.id}-transition`}
        isOverridden={ov.transitionType !== undefined}
        label="Transition"
        onReset={() => clearField('transitionType')}
      >
        <Select
          onValueChange={(value) => setField('transitionType', value as TransitionType)}
          value={ov.transitionType ?? globalSettings.transitionType}
        >
          <SelectTrigger className="w-full" id={`${slide.id}-transition`} size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="crossfade">Crossfade</SelectItem>
            <SelectItem value="dip-to-black">Dip to black</SelectItem>
            <SelectItem value="cut">Cut</SelectItem>
          </SelectContent>
        </Select>
      </OverrideField>

      {slide.type === 'image' ? (
        <OverrideField
          defaultHint="global"
          htmlFor={`${slide.id}-ken-burns`}
          isOverridden={ov.kenBurns !== undefined}
          label="Ken Burns"
          onReset={() => clearField('kenBurns')}
        >
          <Switch
            checked={ov.kenBurns ?? globalSettings.kenBurns}
            id={`${slide.id}-ken-burns`}
            onCheckedChange={(checked) => setField('kenBurns', checked)}
          />
        </OverrideField>
      ) : null}

      {slide.type === 'image' ? (
        <OverrideField
          defaultHint="global"
          htmlFor={`${slide.id}-fit-mode`}
          isOverridden={ov.fitMode !== undefined}
          label="Fit mode"
          onReset={() => clearField('fitMode')}
        >
          <Select
            onValueChange={(value) => setField('fitMode', value as FitMode)}
            value={ov.fitMode ?? globalSettings.fitMode}
          >
            <SelectTrigger className="w-full" id={`${slide.id}-fit-mode`} size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smart-fit">Smart fit</SelectItem>
              <SelectItem value="cover">Cover (crop)</SelectItem>
              <SelectItem value="contain">Letterbox</SelectItem>
              <SelectItem value="blur-fill">Blur fill</SelectItem>
            </SelectContent>
          </Select>
        </OverrideField>
      ) : null}

      <OverrideField
        defaultHint="off"
        htmlFor={`${slide.id}-mute-music`}
        isOverridden={ov.muteMusic !== undefined}
        label="Mute music"
        onReset={() => clearField('muteMusic')}
      >
        <Switch
          checked={ov.muteMusic ?? false}
          id={`${slide.id}-mute-music`}
          onCheckedChange={(checked) => {
            if (checked) {
              setField('muteMusic', true)
              return
            }
            clearField('muteMusic')
          }}
        />
      </OverrideField>

      <OverrideField
        defaultHint="auto"
        htmlFor={`${slide.id}-music-volume`}
        isOverridden={ov.musicVolume !== undefined}
        label="Music level"
        onReset={() => clearField('musicVolume')}
      >
        <Slider
          aria-label="Music level"
          className="flex-1"
          disabled={ov.muteMusic === true}
          id={`${slide.id}-music-volume`}
          max={100}
          min={0}
          onValueChange={([value]) => setField('musicVolume', value / 100)}
          step={5}
          value={[Math.round((ov.musicVolume ?? 1) * 100)]}
        />
        <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
          {Math.round((ov.musicVolume ?? 1) * 100)}%
        </span>
      </OverrideField>

      {slide.type === 'video' ? (
        <>
          <OverrideField
            defaultHint="off"
            htmlFor={`${slide.id}-mute-video-audio`}
            isOverridden={ov.muteVideoAudio !== undefined}
            label="Mute video audio"
            onReset={() => clearField('muteVideoAudio')}
          >
            <Switch
              checked={ov.muteVideoAudio ?? false}
              id={`${slide.id}-mute-video-audio`}
              onCheckedChange={(checked) => {
                if (checked) {
                  setField('muteVideoAudio', true)
                  return
                }
                clearField('muteVideoAudio')
              }}
            />
          </OverrideField>

          <OverrideField
            defaultHint="100%"
            htmlFor={`${slide.id}-video-volume`}
            isOverridden={ov.videoVolume !== undefined}
            label="Video level"
            onReset={() => clearField('videoVolume')}
          >
            <Slider
              aria-label="Video level"
              className="flex-1"
              disabled={ov.muteVideoAudio === true}
              id={`${slide.id}-video-volume`}
              max={100}
              min={0}
              onValueChange={([value]) => setField('videoVolume', value / 100)}
              step={5}
              value={[Math.round((ov.videoVolume ?? 1) * 100)]}
            />
            <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
              {Math.round((ov.videoVolume ?? 1) * 100)}%
            </span>
          </OverrideField>
        </>
      ) : null}

      {hasOverrides ? (
        <Button className="self-start" onClick={resetAll} size="sm" variant="outline">
          Reset all to global defaults
        </Button>
      ) : null}
    </div>
  )
}
