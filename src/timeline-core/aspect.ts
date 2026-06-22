export const ASPECT_RATIOS = ['16:9', '9:16', '1:1'] as const

export type AspectRatio = (typeof ASPECT_RATIOS)[number]

export const DEFAULT_ASPECT_RATIO: AspectRatio = '16:9'

export type CanvasDimensions = {
  width: number
  height: number
}

/** Boundary guard: slideshow.json is untrusted input, so validate before use. */
export function isAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === 'string' && (ASPECT_RATIOS as readonly string[]).includes(value)
}

export const DEFAULT_MEDIA_ASPECT_RATIO_CSS = '16 / 9'

export function mediaAspectRatioCss(width?: number, height?: number): string {
  if (width !== undefined && height !== undefined && width > 0 && height > 0) {
    return `${width} / ${height}`
  }
  return DEFAULT_MEDIA_ASPECT_RATIO_CSS
}

export function dimensionsForAspectRatio(ratio: AspectRatio): CanvasDimensions {
  switch (ratio) {
    case '16:9':
      return { width: 1920, height: 1080 }
    case '9:16':
      return { width: 1080, height: 1920 }
    case '1:1':
      return { width: 1080, height: 1080 }
  }
}
