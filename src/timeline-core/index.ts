export { getMediaType, isSupportedAudio, isSupportedMedia, sortByFilename } from './media'
export { moveSlide, toggleExcluded, filterIncluded, createTitleSlide } from './timeline'
export { resolve, applyImageDuration, DEFAULT_GLOBAL_SETTINGS } from './settings'
export type {
  GlobalSettings,
  ResolvedSlideSettings,
  SlideAudioOverrides,
  SlideOverrides,
  TransitionType,
  FitMode,
} from './settings'
export type { MediaSlide, TitleSlide, Slide, MediaType } from './types'
export { isTitleSlide } from './types'
