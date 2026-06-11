import { useCallback, useEffect, useRef, useState } from 'react'
import type { Slide } from '../timeline-core/types'
import { isTitleSlide } from '../timeline-core/types'
import { DEFAULT_GLOBAL_SETTINGS } from '../timeline-core'
import type { GlobalSettings, ThemeName } from '../timeline-core'
import {
  addRecentProject,
  enumerateAudioTracks,
  listRecentProjects,
  openProject,
  requestHandlePermission,
  revokeAudioBlobUrls,
  saveProject,
  type AudioTrack,
  type RecentProject,
  type SlideshowJson,
} from '../project-store'
import { enumerateFolder, revokeSlideBlobUrls } from '../project-store/media-loader'
import { reconcileSlides, slidesToJson } from './slidePersistence'
import type { JamendoAttribution, JamendoTrack } from '../jamendo/types'
import { downloadTrack, sanitizeFilename } from '../jamendo'
import { FPS } from './PlayerPane'

const AUTOSAVE_DELAY = 2000

type Options = {
  onFolderLoaded?: () => void
}

export function useProject({ onFolderLoaded }: Options = {}) {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS)
  const [slides, setSlides] = useState<Slide[]>([])
  const [soundtrackFilename, setSoundtrackFilename] = useState<string | null>(null)
  const [soundtrackAttribution, setSoundtrackAttribution] = useState<JamendoAttribution | null>(null)
  const [themeName, setThemeName] = useState<ThemeName | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [corruptError, setCorruptError] = useState<string | null>(null)
  const [folderOpen, setFolderOpen] = useState(false)
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
      saveProject(handle, slidesToJson(globalSettings, slides, soundtrackFilename, themeName, soundtrackAttribution)).catch(console.error)
    }, AUTOSAVE_DELAY)
  }, [globalSettings, slides, soundtrackFilename, soundtrackAttribution, themeName])

  const loadFolder = useCallback(
    async (handle: FileSystemDirectoryHandle, savedData?: SlideshowJson) => {
      setLoading(true)
      setError(null)
      try {
        const enumerated = await enumerateFolder(handle)
        const nextAudioTracks = await enumerateAudioTracks(handle)
        const restoredSettings = savedData?.globalSettings ?? DEFAULT_GLOBAL_SETTINGS
        const restoredThemeName = savedData?.themeName ?? null
        const savedSoundtrack = savedData?.soundtrackFilename ?? null
        const validSoundtrack =
          savedSoundtrack && nextAudioTracks.some((track) => track.filename === savedSoundtrack)
            ? savedSoundtrack
            : null
        const restoredAttribution = validSoundtrack ? (savedData?.soundtrackAttribution ?? null) : null
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
        setAudioTracks(nextAudioTracks)
        setGlobalSettings(restoredSettings)
        setThemeName(restoredThemeName)
        setSlides(finalSlides)
        setSoundtrackFilename(validSoundtrack)
        setSoundtrackAttribution(restoredAttribution)
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
      setSoundtrackFilename(filename)
      setSoundtrackAttribution(attribution)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh audio tracks')
    }
  }, [])

  const changeSoundtrack = useCallback((filename: string | null) => {
    setSoundtrackFilename(filename)
    setSoundtrackAttribution(null)
  }, [])

  const dismissCorruptError = useCallback(() => {
    setCorruptError(null)
  }, [])

  return {
    audioTracks,
    globalSettings,
    setGlobalSettings,
    slides,
    setSlides,
    soundtrackFilename,
    themeName,
    setThemeName,
    loading,
    error,
    corruptError,
    folderOpen,
    recentProjects,
    pickFolder,
    refresh,
    openRecent,
    addJamendoTrack,
    changeSoundtrack,
    dismissCorruptError,
  }
}
