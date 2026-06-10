/// <reference types="vite/client" />

// File System Access API — not yet in lib.dom.d.ts for all TS versions
interface Window {
  showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
}
