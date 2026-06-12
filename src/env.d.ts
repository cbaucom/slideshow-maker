/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JAMENDO_CLIENT_ID?: string
}

// File System Access API — not yet fully in lib.dom.d.ts
interface Window {
  showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
  showSaveFilePicker(options?: {
    suggestedName?: string
    types?: { description?: string; accept: Record<string, string[]> }[]
  }): Promise<FileSystemFileHandle>
}

interface FileSystemDirectoryHandle {
  queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
}
