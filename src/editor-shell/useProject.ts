import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioClip, Slide } from '../timeline-core/types'
import { isTitleSlide } from '../timeline-core/types'
import { addAudioClip, DEFAULT_ASPECT_RATIO, DEFAULT_GLOBAL_SETTINGS, isAspectRatio } from '../timeline-core'
import type { AspectRatio, GlobalSettings, ThemeName } from '../timeline-core'
import {
  addRecentProject,
  enumerateAudioTracks,
  exportFilename,
  importDroppedMediaFiles,
  listRecentProjects,
  openProject,
  requestHandlePermission,
  revokeAudioBlobUrls,
  saveProject,
  writeExportedVideo,
  type AudioTrack,
  type RecentProject,
  type SlideshowJson,
} from '../project-store'
import { enumerateFolder, revokeSlideBlobUrls } from '../project-store/media-loader'
import { audioClipsFromJson, reconcileSlides, slidesToJson } from './slidePersistence'
import type { JamendoAttribution, JamendoTrack } from '../jamendo/types'
import { downloadTrack, sanitizeFilename } from '../jamendo'
import type { BeatGrid } from '../beat-grid'
import type { LoudnessCache } from '../audio-analysis/types'
import { FPS } from './PlayerPane'

const AUTOSAVE_DELAY = 2000

async function listFolderFilenames(handle: FileSystemDirectoryHandle): Promise<Set<string>> {
  const names = new Set<string>()
  for await (const entry of handle.values()) {
    if (entry.kind === 'file') names.add(entry.name)
  }
  return names
}

function filterValidAudioClips(clips: AudioClip[], audioTracks: AudioTrack[]): AudioClip[] {
  const filenames = new Set(audioTracks.map((track) => track.filename))
  return clips.filter((clip) => filenames.has(clip.filename))
}

type Options = {
  onFolderLoaded?: () => void
}

export function useProject({ onFolderLoaded }: Options = {}) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(DEFAULT_ASPECT_RATIO)
  const [audioClips, setAudioClips] = useState<AudioClip[]>([])
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS)
  const [slides, setSlides] = useState<Slide[]>([])
  const [soundtrackAttribution, setSoundtrackAttribution] = useState<JamendoAttribution | null>(null)
  const [themeName, setThemeName] = useState<ThemeName | null>(null)
  const [beatGridCache, setBeatGridCache] = useState<BeatGrid | undefined>()
  const [loudnessCache, setLoudnessCache] = useState<LoudnessCache | undefined>()
  const [manualBeatGrid, setManualBeatGrid] = useState<BeatGrid | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [corruptError, setCorruptError] = useState<string | null>(null)
  const [folderOpen, setFolderOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [importNotice, setImportNotice] = useState<string | null>(null)
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])

  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const pendingAudioRevokeRef = useRef<AudioTrack[]>([])
  const pendingRevokeRef = useRef<Slide[]>([])
  const latestAudioTracksRef = useRef<AudioTrack[]>([])
  const latestSlidesRef = useRef<Slide[]>([])
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    listRecentProjects().then(setRecentProjects).catch(() => {})
  }, [])

  useEffect(() => {
    revokeAudioBlobUrls(pendingAudioRevokeRef.current)
    pendingAudioRevokeRef.current = []
    latestAudioTracksRef.current = audioTracks
  }, [audioTracks])

  useEffect(() => {
    revokeSlideBlobUrls(pendingRevokeRef.current)
    pendingRevokeRef.current = []
    latestSlidesRef.current = slides
  }, [slides])

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
      revokeAudioBlobUrls(latestAudioTracksRef.current)
      revokeSlideBlobUrls(latestSlidesRef.current)
    }
  }, [])

  // Autosave on slides or settings change
  useEffect(() => {
    const handle = dirHandleRef.current
    if (!handle) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      saveProject(handle, slidesToJson(
        globalSettings,
        slides,
        audioClips,
        themeName,
        soundtrackAttribution,
        aspectRatio,
        beatGridCache,
        manualBeatGrid,
        loudnessCache,
      )).catch(console.error)
    }, AUTOSAVE_DELAY)
  }, [aspectRatio, audioClips, beatGridCache, globalSettings, loudnessCache, manualBeatGrid, slides, soundtrackAttribution, themeName])

  const loadFolder = useCallback(
    async (handle: FileSystemDirectoryHandle, savedData?: SlideshowJson) => {
      setLoading(true)
      setError(null)
      try {
        const enumerated = await enumerateFolder(handle)
        const nextAudioTracks = await enumerateAudioTracks(handle)
        const restoredSettings = savedData?.globalSettings ?? DEFAULT_GLOBAL_SETTINGS
        const restoredThemeName = savedData?.themeName ?? null
        const restoredClips = filterValidAudioClips(
          savedData ? audioClipsFromJson(savedData) : [],
          nextAudioTracks,
        )
        const restoredAttribution = restoredClips.length > 0
          ? (savedData?.soundtrackAttribution ?? null)
          : null
        let finalSlides: Slide[] = savedData ? reconcileSlides(enumerated, savedData) : enumerated
        // Apply global duration only to media slides not already in savedData (new files added to folder).
        const savedFilenames = new Set(
          savedData?.slides.flatMap(s => ('filename' in s ? [s.filename] : [])) ?? [],
        )
        finalSlides = finalSlides.map(s => {
          if (isTitleSlide(s)) return s
          return s.type === 'image' && !savedFilenames.has(s.filename)
            ? { ...s, durationInFrames: Math.round(restoredSettings.imageDurationSecs * FPS) }
            : s
        })
        pendingAudioRevokeRef.current = audioTracks
        pendingRevokeRef.current = latestSlidesRef.current
        setAspectRatio(isAspectRatio(savedData?.aspectRatio) ? savedData.aspectRatio : DEFAULT_ASPECT_RATIO)
        setAudioClips(restoredClips)
        setAudioTracks(nextAudioTracks)
        setGlobalSettings(restoredSettings)
        setThemeName(restoredThemeName)
        setSlides(finalSlides)
        setSoundtrackAttribution(restoredAttribution)
        setBeatGridCache(restoredClips.length > 0 ? savedData?.beatGridCache : undefined)
        setLoudnessCache(savedData?.loudnessCache)
        setManualBeatGrid(restoredClips.length > 0 ? savedData?.manualBeatGrid : undefined)
        setProjectName(handle.name)
        setFolderOpen(true)
        onFolderLoaded?.()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to read folder')
      } finally {
        setLoading(false)
      }
    },
    [audioTracks, onFolderLoaded],
  )

  const openFolder = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      dirHandleRef.current = handle
      const result = await openProject(handle)
      setCorruptError(null)
      if (result.status === 'corrupt') {
        setCorruptError(result.error)
        await loadFolder(handle)
        return
      }
      await loadFolder(handle, result.data)
      await addRecentProject(handle).catch(() => {})
      setRecentProjects(await listRecentProjects().catch(() => []))
    },
    [loadFolder],
  )

  const pickFolder = useCallback(async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      await openFolder(handle)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError('Could not open folder')
    }
  }, [openFolder])

  const refresh = useCallback(async () => {
    const handle = dirHandleRef.current
    if (!handle) return
    const result = await openProject(handle)
    if (result.status === 'corrupt') {
      setCorruptError(result.error)
      await loadFolder(handle)
      return
    }
    setCorruptError(null)
    await loadFolder(handle, result.data)
  }, [loadFolder])

  const openRecent = useCallback(
    async (project: RecentProject) => {
      const permission = await requestHandlePermission(project.handle).catch(() => 'denied' as const)
      if (permission !== 'granted') {
        setError(`Permission denied for "${project.name}". Try opening the folder manually.`)
        return
      }
      await openFolder(project.handle)
    },
    [openFolder],
  )

  const addJamendoTrack = useCallback(async (track: JamendoTrack, attribution: JamendoAttribution) => {
    const handle = dirHandleRef.current
    if (!handle) return
    const filename = sanitizeFilename(`${track.artistName} - ${track.name}`)
    await downloadTrack(track.audioUrl, filename, handle)
    try {
      const nextAudioTracks = await enumerateAudioTracks(handle)
      pendingAudioRevokeRef.current = latestAudioTracksRef.current
      setAudioTracks(nextAudioTracks)
      setAudioClips((previous) => addAudioClip(previous, filename))
      setSoundtrackAttribution(attribution)
      setBeatGridCache(undefined)
      setManualBeatGrid(undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh audio tracks')
    }
  }, [])

  const saveExportedVideo = useCallback(async (blob: Blob, extension: string): Promise<string> => {
    const handle = dirHandleRef.current
    if (!handle) throw new Error('No project folder open')
    const filename = exportFilename(handle.name, new Date(), extension)
    await writeExportedVideo(handle, filename, blob)
    return filename
  }, [])

  const updateAudioClips = useCallback((clips: AudioClip[]) => {
    const primaryChanged = audioClips[0]?.filename !== clips[0]?.filename
    if (primaryChanged || clips.length === 0) {
      setBeatGridCache(undefined)
      setManualBeatGrid(undefined)
    }
    if (clips.length === 0) {
      setSoundtrackAttribution(null)
    }
    setAudioClips(clips)
  }, [audioClips])

  const updateLoudnessCache = useCallback((cache: LoudnessCache) => {
    setLoudnessCache(cache)
  }, [])

  const updateBeatGridPersist = useCallback((update: {
    beatGridCache?: BeatGrid
    manualBeatGrid?: BeatGrid
  }) => {
    if ('beatGridCache' in update) setBeatGridCache(update.beatGridCache)
    if ('manualBeatGrid' in update) setManualBeatGrid(update.manualBeatGrid)
  }, [])

  const dismissCorruptError = useCallback(() => {
    setCorruptError(null)
  }, [])

  const dismissImportNotice = useCallback(() => {
    setImportNotice(null)
  }, [])

  const importDroppedFiles = useCallback(async (files: File[]) => {
    const handle = dirHandleRef.current
    if (!handle || files.length === 0) return

    try {
      const existingFilenames = await listFolderFilenames(handle)
      const { imported, skipped } = await importDroppedMediaFiles(handle, files, existingFilenames)

      if (imported.length > 0) {
        pendingRevokeRef.current = latestSlidesRef.current
        setSlides((previousSlides) => [
          ...previousSlides,
          ...imported.map((slide) => (
            slide.type === 'image'
              ? { ...slide, durationInFrames: Math.round(globalSettings.imageDurationSecs * FPS) }
              : slide
          )),
        ])
      }

      if (skipped.length > 0) {
        const names = skipped.map((entry) => entry.filename).join(', ')
        setImportNotice(`Skipped unsupported file type${skipped.length > 1 ? 's' : ''}: ${names}`)
      } else {
        setImportNotice(null)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import files')
    }
  }, [globalSettings])

  return {
    aspectRatio,
    setAspectRatio,
    audioClips,
    audioTracks,
    beatGridCache,
    globalSettings,
    setGlobalSettings,
    loudnessCache,
    manualBeatGrid,
    slides,
    setSlides,
    soundtrackAttribution,
    themeName,
    setThemeName,
    updateAudioClips,
    updateBeatGridPersist,
    updateLoudnessCache,
    loading,
    error,
    corruptError,
    dismissImportNotice,
    folderOpen,
    projectName,
    importDroppedFiles,
    importNotice,
    recentProjects,
    pickFolder,
    refresh,
    openRecent,
    addJamendoTrack,
    dismissCorruptError,
    saveExportedVideo,
  }
}
