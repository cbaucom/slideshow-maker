import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
    <Dialog open onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{slide.filename}</DialogTitle>
          <DialogDescription className="sr-only">
            Per-slide setting overrides for {slide.filename}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {slide.type === 'image' && (
            <OverrideField
              label="Duration"
              htmlFor={`${slide.id}-duration`}
              isOverridden={ov.imageDurationSecs !== undefined}
              defaultHint="global"
              onReset={() => clearField('imageDurationSecs')}
            >
              <Input
                id={`${slide.id}-duration`}
                type="number"
                className="h-7 w-16 text-right"
                min={1}
                max={30}
                step={0.5}
                value={ov.imageDurationSecs ?? globalSettings.imageDurationSecs}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v) && v >= 1 && v <= 30) setField('imageDurationSecs', v)
                }}
              />
              <span className="text-xs text-muted-foreground">s</span>
            </OverrideField>
          )}

          <OverrideField
            label="Transition"
            htmlFor={`${slide.id}-transition`}
            isOverridden={ov.transitionType !== undefined}
            defaultHint="global"
            onReset={() => clearField('transitionType')}
          >
            <Select
              value={ov.transitionType ?? globalSettings.transitionType}
              onValueChange={value => setField('transitionType', value as TransitionType)}
            >
              <SelectTrigger id={`${slide.id}-transition`} size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crossfade">Crossfade</SelectItem>
                <SelectItem value="dip-to-black">Dip to black</SelectItem>
                <SelectItem value="cut">Cut</SelectItem>
              </SelectContent>
            </Select>
          </OverrideField>

          {slide.type === 'image' && (
            <OverrideField
              label="Ken Burns"
              htmlFor={`${slide.id}-ken-burns`}
              isOverridden={ov.kenBurns !== undefined}
              defaultHint="global"
              onReset={() => clearField('kenBurns')}
            >
              <Switch
                id={`${slide.id}-ken-burns`}
                checked={ov.kenBurns ?? globalSettings.kenBurns}
                onCheckedChange={checked => setField('kenBurns', checked)}
              />
            </OverrideField>
          )}

          {slide.type === 'image' && (
            <OverrideField
              label="Fit mode"
              htmlFor={`${slide.id}-fit-mode`}
              isOverridden={ov.fitMode !== undefined}
              defaultHint="global"
              onReset={() => clearField('fitMode')}
            >
              <Select
                value={ov.fitMode ?? globalSettings.fitMode}
                onValueChange={value => setField('fitMode', value as FitMode)}
              >
                <SelectTrigger id={`${slide.id}-fit-mode`} size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover (crop)</SelectItem>
                  <SelectItem value="contain">Letterbox</SelectItem>
                  <SelectItem value="blur-fill">Blur fill</SelectItem>
                </SelectContent>
              </Select>
            </OverrideField>
          )}

          <OverrideField
            label="Mute music"
            htmlFor={`${slide.id}-mute-music`}
            isOverridden={ov.muteMusic !== undefined}
            defaultHint="off"
            onReset={() => clearField('muteMusic')}
          >
            <Switch
              id={`${slide.id}-mute-music`}
              checked={ov.muteMusic ?? false}
              onCheckedChange={checked => {
                if (checked) {
                  setField('muteMusic', true)
                  return
                }
                clearField('muteMusic')
              }}
            />
          </OverrideField>

          <OverrideField
            label="Music level"
            htmlFor={`${slide.id}-music-volume`}
            isOverridden={ov.musicVolume !== undefined}
            defaultHint="auto"
            onReset={() => clearField('musicVolume')}
          >
            <Slider
              id={`${slide.id}-music-volume`}
              aria-label="Music level"
              disabled={ov.muteMusic === true}
              min={0}
              max={100}
              step={5}
              value={[Math.round((ov.musicVolume ?? 1) * 100)]}
              onValueChange={([value]) => setField('musicVolume', value / 100)}
              className="flex-1"
            />
            <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
              {Math.round((ov.musicVolume ?? 1) * 100)}%
            </span>
          </OverrideField>

          {slide.type === 'video' && (
            <>
              <OverrideField
                label="Mute video audio"
                htmlFor={`${slide.id}-mute-video-audio`}
                isOverridden={ov.muteVideoAudio !== undefined}
                defaultHint="off"
                onReset={() => clearField('muteVideoAudio')}
              >
                <Switch
                  id={`${slide.id}-mute-video-audio`}
                  checked={ov.muteVideoAudio ?? false}
                  onCheckedChange={checked => {
                    if (checked) {
                      setField('muteVideoAudio', true)
                      return
                    }
                    clearField('muteVideoAudio')
                  }}
                />
              </OverrideField>

              <OverrideField
                label="Video level"
                htmlFor={`${slide.id}-video-volume`}
                isOverridden={ov.videoVolume !== undefined}
                defaultHint="100%"
                onReset={() => clearField('videoVolume')}
              >
                <Slider
                  id={`${slide.id}-video-volume`}
                  aria-label="Video level"
                  disabled={ov.muteVideoAudio === true}
                  min={0}
                  max={100}
                  step={5}
                  value={[Math.round((ov.videoVolume ?? 1) * 100)]}
                  onValueChange={([value]) => setField('videoVolume', value / 100)}
                  className="flex-1"
                />
                <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
                  {Math.round((ov.videoVolume ?? 1) * 100)}%
                </span>
              </OverrideField>
            </>
          )}
        </div>

        {hasOverrides && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={resetAll}>
              Reset all to global defaults
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
