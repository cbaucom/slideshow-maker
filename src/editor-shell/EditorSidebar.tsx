import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import type { AspectRatio, GlobalSettings, ThemeName } from '../timeline-core'
import type { AudioTrack } from '../project-store'
import type { JamendoAttribution, JamendoTrack } from '../jamendo/types'
import { GlobalSettingsPanel } from './GlobalSettingsPanel'
import { SoundtrackPanel } from './SoundtrackPanel'
import { JamendoPanel } from './JamendoPanel'

type Props = {
  aspectRatio: AspectRatio
  onAspectRatioChange: (ratio: AspectRatio) => void
  settings: GlobalSettings
  themeName: ThemeName | null
  onSettingsChange: (updated: GlobalSettings) => void
  onThemeChange: (name: ThemeName) => void
  audioTracks: AudioTrack[]
  soundtrackFilename: string | null
  onSoundtrackChange: (filename: string | null) => void
  jamendoClientId: string | undefined
  onJamendoAdd: (track: JamendoTrack, attribution: JamendoAttribution) => Promise<void>
  onAddTitleSlide: () => void
}

export function EditorSidebar({
  aspectRatio,
  onAspectRatioChange,
  settings,
  themeName,
  onSettingsChange,
  onThemeChange,
  audioTracks,
  soundtrackFilename,
  onSoundtrackChange,
  jamendoClientId,
  onJamendoAdd,
  onAddTitleSlide,
}: Props) {
  return (
    <aside className="flex h-full min-h-0 flex-col bg-card">
      {/* native scroll, not ScrollArea: Radix's viewport sizes content to its
          intrinsic width, so one long filename pushes every control off-panel */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <Accordion
          type="multiple"
          defaultValue={['settings', 'soundtrack', 'music']}
          className="px-3"
        >
          <AccordionItem value="settings">
            <AccordionTrigger className="py-3 text-sm">Settings</AccordionTrigger>
            <AccordionContent>
              <GlobalSettingsPanel
                aspectRatio={aspectRatio}
                onAspectRatioChange={onAspectRatioChange}
                settings={settings}
                themeName={themeName}
                onChange={onSettingsChange}
                onThemeChange={onThemeChange}
              />
            </AccordionContent>
          </AccordionItem>

          {audioTracks.length > 0 && (
            <AccordionItem value="soundtrack">
              <AccordionTrigger className="py-3 text-sm">Soundtrack</AccordionTrigger>
              <AccordionContent>
                <SoundtrackPanel
                  audioTracks={audioTracks}
                  soundtrackFilename={soundtrackFilename}
                  onChange={onSoundtrackChange}
                />
              </AccordionContent>
            </AccordionItem>
          )}

          {jamendoClientId && (
            <AccordionItem value="music">
              <AccordionTrigger className="py-3 text-sm">Find Music (Jamendo)</AccordionTrigger>
              {/* forceMount so collapsing doesn't wipe in-progress search state */}
              <AccordionContent forceMount>
                <JamendoPanel clientId={jamendoClientId} onAdd={onJamendoAdd} />
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
      <div className="shrink-0 border-t p-3">
        <Button variant="outline" size="sm" className="w-full" onClick={onAddTitleSlide}>
          + Add Title Slide
        </Button>
      </div>
    </aside>
  )
}
