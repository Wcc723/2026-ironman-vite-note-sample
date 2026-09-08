export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface NoteDraft {
  title: string
  content: string
  tags: string[]
  pinned: boolean
}

export interface BackupFile {
  version: 1
  exportedAt: string
  notes: Note[]
}

export type Theme = 'light' | 'dark'
