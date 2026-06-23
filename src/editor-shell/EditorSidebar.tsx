import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import type { AspectRatio, GlobalSettings, SlideOverrides, ThemeName } from '../timeline-core'
import type { AudioClip, Slide, TitleSlide } from '../timeline-core/types'
import type { AudioTrack } from '../project-store'
import type { BeatGrid } from '../beat-grid/types'
import type { LoudnessCache } from '../audio-analysis/types'
import type { JamendoAttribution, JamendoTrack } from '../jamendo/types'
import { GlobalSettingsPanel } from './GlobalSettingsPanel'
import { JamendoPanel } from './JamendoPanel'
import { SelectedSlidePanel } from './SelectedSlidePanel'
import { SoundtrackPanel } from './SoundtrackPanel'
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
  onSlideOverride: (id: string, overrides: SlideOverrides | undefined) => void
  onThemeChange: (name: ThemeName) => void
  onUpdateTitleSlide: (
    id: string,
    updates: Partial<Pick<TitleSlide, 'heading' | 'subtext' | 'style' | 'durationInFrames'>>,
  ) => void
  audioClips: AudioClip[]
  globalSettings: GlobalSettings
  loudnessCache: LoudnessCache | undefined
  selectedSlide: Slide | null
  selectedSlideCount: number
  themeName: ThemeName | null
}

export function EditorSidebar({
  analysisStatus,
  aspectRatio,
  audioTracks,
  effectiveBeatGrid,
  globalSettings,
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
  onSlideOverride,
  onThemeChange,
  onUpdateTitleSlide,
  audioClips,
  loudnessCache,
  selectedSlide,
  selectedSlideCount,
  themeName,
}: Props) {
  const selectionKey = selectedSlideCount > 0
    ? `${selectedSlideCount}-${selectedSlide?.id ?? ''}`
    : 'none'
  const defaultOpenSections = selectedSlideCount > 0
    ? ['music', 'selected-slide', 'settings', 'soundtrack']
    : ['music', 'settings', 'soundtrack']

  return (
    <aside className="flex h-full min-h-0 flex-col bg-card">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <Accordion
          className="px-3"
          defaultValue={defaultOpenSections}
          key={selectionKey}
          type="multiple"
        >
          {selectedSlideCount > 0 && selectedSlide ? (
            <AccordionItem value="selected-slide">
              <AccordionTrigger className="py-3 text-sm">
                {selectedSlideCount === 1 ? 'Selected slide' : `${selectedSlideCount} slides selected`}
              </AccordionTrigger>
              <AccordionContent>
                <SelectedSlidePanel
                  globalSettings={globalSettings}
                  onOverride={onSlideOverride}
                  onUpdateTitleSlide={onUpdateTitleSlide}
                  selectedSlide={selectedSlide}
                  selectedSlideCount={selectedSlideCount}
                />
              </AccordionContent>
            </AccordionItem>
          ) : null}

          <AccordionItem value="settings">
            <AccordionTrigger className="py-3 text-sm">Settings</AccordionTrigger>
            <AccordionContent>
              <GlobalSettingsPanel
                aspectRatio={aspectRatio}
                onAspectRatioChange={onAspectRatioChange}
                onChange={onSettingsChange}
                onThemeChange={onThemeChange}
                settings={globalSettings}
                themeName={themeName}
              />
            </AccordionContent>
          </AccordionItem>

          {audioTracks.length > 0 ? (
            <AccordionItem value="soundtrack">
              <AccordionTrigger className="py-3 text-sm">Soundtrack</AccordionTrigger>
              <AccordionContent>
                <SoundtrackPanel
                  analysisStatus={analysisStatus}
                  audioClips={audioClips}
                  audioTracks={audioTracks}
                  beatSync={globalSettings.beatSync !== false}
                  effectiveBeatGrid={effectiveBeatGrid}
                  loudnessCache={loudnessCache}
                  manualBeatGrid={manualBeatGrid}
                  onApplyManualBpm={onApplyManualBpm}
                  onApplyTapTimestamps={onApplyTapTimestamps}
                  onChange={onAudioClipsChange}
                  onClearManualBeatGrid={onClearManualBeatGrid}
                />
              </AccordionContent>
            </AccordionItem>
          ) : null}

          {jamendoClientId ? (
            <AccordionItem value="music">
              <AccordionTrigger className="py-3 text-sm">Find Music (Jamendo)</AccordionTrigger>
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
