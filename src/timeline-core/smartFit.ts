import type { FitMode } from './settings'

export type ConcreteFitMode = Exclude<FitMode, 'smart-fit'>

const ORIENTATION_THRESHOLD = 0.05

function isLandscape(aspect: number): boolean {
  return aspect > 1 + ORIENTATION_THRESHOLD
}

function isPortrait(aspect: number): boolean {
  return aspect < 1 - ORIENTATION_THRESHOLD
}

function isSquare(aspect: number): boolean {
  return !isLandscape(aspect) && !isPortrait(aspect)
}

export function resolveSmartFit(
  mediaWidth: number,
  mediaHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): ConcreteFitMode {
  if (mediaWidth <= 0 || mediaHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return 'contain'
  }

  const mediaAspect = mediaWidth / mediaHeight
  const canvasAspect = canvasWidth / canvasHeight

  const orientationMismatch =
    (isLandscape(mediaAspect) && isPortrait(canvasAspect))
    || (isPortrait(mediaAspect) && isLandscape(canvasAspect))

  if (orientationMismatch) {
    return 'blur-fill'
  }

  const shapeMismatch = isSquare(mediaAspect) !== isSquare(canvasAspect)
  if (shapeMismatch) {
    return 'blur-fill'
  }

  return 'cover'
}
