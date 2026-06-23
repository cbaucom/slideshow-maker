export { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO, DEFAULT_MEDIA_ASPECT_RATIO_CSS, dimensionsForAspectRatio, isAspectRatio, mediaAspectRatioCss } from './aspect'
export type { AspectRatio, CanvasDimensions } from './aspect'
export { getMediaType, isSupportedAudio, isSupportedMedia, sortByFilename } from './media'
export { addAudioClip, moveAudioClip, removeAudioClip, updateAudioClipGain } from './audioClips'
export {
  createTitleSlide,
  filterIncluded,
  moveSlide,
  moveSlideBlock,
  moveSlidesToBeginning,
  moveSlidesToEnd,
  toggleExcluded,
} from './timeline'
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
export type { AudioClip, MediaSlide, TitleSlide, Slide, MediaType } from './types'
export { isTitleSlide } from './types'
export { resolveSmartFit } from './smartFit'
export type { ConcreteFitMode } from './smartFit'
