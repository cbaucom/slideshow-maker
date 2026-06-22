export { plan, TRANSITION_FRAMES } from './planner'
export { slideIdAtFrame, startFrameForSlideId } from './playback'
export {
  buildTimelineLayout,
  DEFAULT_MIN_BLOCK_WIDTH_PX,
  DEFAULT_PIXELS_PER_FRAME,
  firstPassEntries,
  MAX_PIXELS_PER_FRAME,
  MIN_PIXELS_PER_FRAME,
  TIMELINE_BLOCK_GAP_PX,
  TIMELINE_ZOOM_STEP,
} from './timelineLayout'
export type { TimelineAudioBlock, TimelineLayout, TimelineMediaBlock } from './timelineLayout'
export type { AudioClipInput } from './planner'
export type {
  AudioSegment,
  MediaMetadata,
  RenderPlan,
  RenderPlanEntry,
  SoundtrackTrack,
  TransitionSpec,
  DuckingEnvelope,
  DuckingSegment,
  VolumeKeyframe,
} from './types'
