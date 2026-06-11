export type JamendoTrack = {
  id: string
  name: string
  artistName: string
  durationSecs: number
  audioUrl: string
  licenseUrl: string
}

export type JamendoAttribution = {
  jamendoId: string
  name: string
  artist: string
  licenseUrl: string
}
