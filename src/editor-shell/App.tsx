import { useCallback, useEffect, useRef, useState } from 'react'
import { Player } from '@remotion/player'
import type { MediaSlide } from '../timeline-core/types'
import { enumerateFolder, revokeSlideBlobUrls } from '../project-store/media-loader'
import { SlideshowComposition, CROSSFADE_FRAMES } from '../composition'
import { ThumbnailList } from './ThumbnailList'
import './App.css'

const FPS = 30
const COMP_WIDTH = 1920
const COMP_HEIGHT = 1080

function computeTotalFrames(slides: MediaSlide[]): number {
  if (slides.length === 0) return FPS // 1s placeholder
  const sum = slides.reduce((acc, s) => acc + s.durationInFrames, 0)
  const transitions = (slides.length - 1) * CROSSFADE_FRAMES
  return Math.max(1, sum - transitions)
}

export function App() {
  const [slides, setSlides] = useState<MediaSlide[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folderOpen, setFolderOpen] = useState(false)
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
  // Queue of slides whose blob URLs to revoke after next slides commit.
  const pendingRevokeRef = useRef<MediaSlide[]>([])
  // Mirror of current slides, kept up-to-date via effect for use in cleanup.
  const latestSlidesRef = useRef<MediaSlide[]>([])

  // After each slides commit: revoke queued old URLs; track new current.
  useEffect(() => {
    revokeSlideBlobUrls(pendingRevokeRef.current)
    pendingRevokeRef.current = []
    latestSlidesRef.current = slides
  }, [slides])

  // Revoke current slides on unmount.
  useEffect(() => {
    return () => revokeSlideBlobUrls(latestSlidesRef.current)
  }, [])

  const loadFolder = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setLoading(true)
    setError(null)
    try {
      const newSlides = await enumerateFolder(handle)
      // Queue current slides for revocation after newSlides renders.
      pendingRevokeRef.current = latestSlidesRef.current
      setSlides(newSlides)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read folder')
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePickFolder = useCallback(async () => {
    try {
      const handle = await window.showDirectoryPicker()
      dirHandleRef.current = handle
      setFolderOpen(true)
      await loadFolder(handle)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError('Could not open folder')
    }
  }, [loadFolder])

  const handleRefresh = useCallback(async () => {
    if (!dirHandleRef.current) return
    await loadFolder(dirHandleRef.current)
  }, [loadFolder])

  const totalFrames = computeTotalFrames(slides)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Slideshow Maker</h1>
        <div className="header-actions">
          <button onClick={handlePickFolder} disabled={loading}>
            Open Folder
          </button>
          {folderOpen && (
            <button onClick={handleRefresh} disabled={loading}>
              Refresh
            </button>
          )}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {loading && <div className="loading-bar">Loading media…</div>}

      <main className="app-main">
        <div className="preview-pane">
          <Player
            component={SlideshowComposition}
            durationInFrames={totalFrames}
            compositionWidth={COMP_WIDTH}
            compositionHeight={COMP_HEIGHT}
            fps={FPS}
            inputProps={{ slides }}
            controls
            style={{ width: '100%', aspectRatio: `${COMP_WIDTH}/${COMP_HEIGHT}` }}
          />
        </div>

        {slides.length > 0 && (
          <aside className="thumbnail-panel">
            <ThumbnailList slides={slides} />
          </aside>
        )}

        {slides.length === 0 && !loading && !folderOpen && (
          <div className="empty-state">
            <p>Pick a folder containing photos and videos to get started.</p>
          </div>
        )}
      </main>
    </div>
  )
}
