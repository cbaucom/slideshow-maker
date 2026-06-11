export { DEFAULT_ASPECT_RATIO, dimensionsForAspectRatio } from './aspect'
export type { AspectRatio, CanvasDimensions } from './aspect'
export { getMediaType, isSupportedAudio, isSupportedMedia, sortByFilename } from './media'
export { moveSlide, toggleExcluded, filterIncluded, createTitleSlide } from './timeline'
export { resolve, applyImageDuration, DEFAULT_GLOBAL_SETTINGS, THEMES, applyTheme } from './settings'
export type {
  GlobalSettings,
  ResolvedSlideSettings,
  SlideAudioOverrides,
  SlideOverrides,
  TransitionType,
  FitMode,
  KenBurnsMode,
  ThemeName,
} from './settings'
export type { MediaSlide, TitleSlide, Slide, MediaType } from './types'
export { isTitleSlide } from './types'
