import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AudioTrack } from '../project-store'

const NONE_VALUE = '__none__'

type Props = {
  audioTracks: AudioTrack[]
  onChange: (filename: string | null) => void
  soundtrackFilename: string | null
}

export function SoundtrackPanel({ audioTracks, onChange, soundtrackFilename }: Props) {
  if (audioTracks.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="soundtrack-select" className="text-xs text-muted-foreground">Track</Label>
      <Select
        value={soundtrackFilename ?? NONE_VALUE}
        onValueChange={value => onChange(value === NONE_VALUE ? null : value)}
      >
        <SelectTrigger id="soundtrack-select" size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>None</SelectItem>
          {audioTracks.map(track => (
            <SelectItem key={track.filename} value={track.filename}>
              {track.filename}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
