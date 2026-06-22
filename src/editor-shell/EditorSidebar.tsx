import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import type { AspectRatio, GlobalSettings, ThemeName } from '../timeline-core'
import type { AudioClip } from '../timeline-core/types'
import type { AudioTrack } from '../project-store'
import type { BeatGrid } from '../beat-grid/types'
import type { JamendoAttribution, JamendoTrack } from '../jamendo/types'
import { GlobalSettingsPanel } from './GlobalSettingsPanel'
import { SoundtrackPanel } from './SoundtrackPanel'
import { JamendoPanel } from './JamendoPanel'
import type { BeatGridAnalysisStatus } from './useBeatGrid'

type Props = {
  analysisStatus: BeatGridAnalysisStatus
  aspectRatio: AspectRatio
  audioTracks: AudioTrack[]
  effectiveBeatGrid: BeatGrid | undefined
  jamendoClientId: string | undefined
  manualBeatGrid: BeatGrid | undefined
  onAddTitleSlide: () => void
  onApplyManualBpm: (bpm: number, firstBeatOffsetSecs: number) => void
  onApplyTapTimestamps: (tapTimestampsMs: number[]) => void
  onAspectRatioChange: (ratio: AspectRatio) => void
  onAudioClipsChange: (clips: AudioClip[]) => void
  onClearManualBeatGrid: () => void
  onJamendoAdd: (track: JamendoTrack, attribution: JamendoAttribution) => Promise<void>
  onSettingsChange: (updated: GlobalSettings) => void
  onThemeChange: (name: ThemeName) => void
  audioClips: AudioClip[]
  settings: GlobalSettings
  themeName: ThemeName | null
}

export function EditorSidebar({
  analysisStatus,
  aspectRatio,
  audioTracks,
  effectiveBeatGrid,
  jamendoClientId,
  manualBeatGrid,
  onAddTitleSlide,
  onApplyManualBpm,
  onApplyTapTimestamps,
  onAspectRatioChange,
  onAudioClipsChange,
  onClearManualBeatGrid,
  onJamendoAdd,
  onSettingsChange,
  onThemeChange,
  audioClips,
  settings,
  themeName,
}: Props) {
  return (
    <aside className="flex h-full min-h-0 flex-col bg-card">
      {/* native scroll, not ScrollArea: Radix's viewport sizes content to its
          intrinsic width, so one long filename pushes every control off-panel */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <Accordion
          className="px-3"
          defaultValue={['settings', 'soundtrack', 'music']}
          type="multiple"
        >
          <AccordionItem value="settings">
            <AccordionTrigger className="py-3 text-sm">Settings</AccordionTrigger>
            <AccordionContent>
              <GlobalSettingsPanel
                aspectRatio={aspectRatio}
                onAspectRatioChange={onAspectRatioChange}
                onChange={onSettingsChange}
                onThemeChange={onThemeChange}
                settings={settings}
                themeName={themeName}
              />
            </AccordionContent>
          </AccordionItem>

          {audioTracks.length > 0 && (
            <AccordionItem value="soundtrack">
              <AccordionTrigger className="py-3 text-sm">Soundtrack</AccordionTrigger>
              <AccordionContent>
                <SoundtrackPanel
                  analysisStatus={analysisStatus}
                  audioClips={audioClips}
                  audioTracks={audioTracks}
                  beatSync={settings.beatSync !== false}
                  effectiveBeatGrid={effectiveBeatGrid}
                  manualBeatGrid={manualBeatGrid}
                  onApplyManualBpm={onApplyManualBpm}
                  onApplyTapTimestamps={onApplyTapTimestamps}
                  onChange={onAudioClipsChange}
                  onClearManualBeatGrid={onClearManualBeatGrid}
                />
              </AccordionContent>
            </AccordionItem>
          )}

          {jamendoClientId ? (
            <AccordionItem value="music">
              <AccordionTrigger className="py-3 text-sm">Find Music (Jamendo)</AccordionTrigger>
              {/* forceMount so collapsing doesn't wipe in-progress search state */}
              <AccordionContent forceMount>
                <JamendoPanel clientId={jamendoClientId} onAdd={onJamendoAdd} />
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
      </div>
      <div className="shrink-0 border-t p-3">
        <Button className="w-full" onClick={onAddTitleSlide} size="sm" variant="outline">
          + Add Title Slide
        </Button>
      </div>
    </aside>
  )
}
