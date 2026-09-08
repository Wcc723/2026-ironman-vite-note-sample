import type { BackupFile, Note, NoteDraft, Theme } from '../types/note'

export const NOTES_STORAGE_KEY = 'memoire.notes.v1'
export const THEME_STORAGE_KEY = 'memoire.theme.v1'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNote = (value: unknown): value is Note =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.title === 'string' &&
  typeof value.content === 'string' &&
  Array.isArray(value.tags) &&
  value.tags.every((tag) => typeof tag === 'string') &&
  typeof value.pinned === 'boolean' &&
  typeof value.createdAt === 'string' &&
  typeof value.updatedAt === 'string'

const getStorage = (): Storage => window.localStorage

const messageFromError = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()

  return tags.reduce<string[]>((result, tag) => {
    const trimmed = tag.trim().replaceAll('  ', ' ')
    const comparisonKey = trimmed.toLocaleLowerCase()

    if (trimmed && !seen.has(comparisonKey)) {
      seen.add(comparisonKey)
      result.push(trimmed)
    }

    return result
  }, [])
}

export function createNote(draft: NoteDraft, now = new Date()): Note {
  const timestamp = now.toISOString()
  const id = globalThis.crypto?.randomUUID?.() ?? `note-${timestamp}-${Math.random()}`

  return {
    id,
    title: draft.title.trim(),
    content: draft.content.trim(),
    tags: normalizeTags(draft.tags),
    pinned: draft.pinned,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function loadNotes(storage: Storage = getStorage()): Note[] {
  try {
    const storedNotes = storage.getItem(NOTES_STORAGE_KEY)
    if (!storedNotes) return []

    const parsed: unknown = JSON.parse(storedNotes)
    if (!Array.isArray(parsed) || !parsed.every(isNote)) {
      throw new Error('已儲存的備忘錄格式無法辨識。')
    }

    return parsed.map((note) => ({ ...note, tags: normalizeTags(note.tags) }))
  } catch (error) {
    throw new Error(messageFromError(error, '無法讀取瀏覽器中的備忘錄。'))
  }
}

export function saveNotes(notes: Note[], storage: Storage = getStorage()): void {
  try {
    storage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
  } catch (error) {
    throw new Error(messageFromError(error, '無法將備忘錄儲存到瀏覽器。'))
  }
}

export function loadTheme(storage: Storage = getStorage()): Theme {
  try {
    return storage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function saveTheme(theme: Theme, storage: Storage = getStorage()): void {
  try {
    storage.setItem(THEME_STORAGE_KEY, theme)
  } catch (error) {
    throw new Error(messageFromError(error, '無法儲存顯示主題設定。'))
  }
}

export function createBackup(notes: Note[], now = new Date()): BackupFile {
  return {
    version: 1,
    exportedAt: now.toISOString(),
    notes: notes.map((note) => ({ ...note, tags: [...note.tags] })),
  }
}

export function parseBackup(text: string): BackupFile {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('這不是有效的 JSON 備份檔。')
  }

  if (!isRecord(parsed) || parsed.version !== 1 || typeof parsed.exportedAt !== 'string') {
    throw new Error('備份檔版本不支援。')
  }

  if (!Array.isArray(parsed.notes) || !parsed.notes.every(isNote)) {
    throw new Error('備份檔中的筆記資料格式不正確。')
  }

  return {
    version: 1,
    exportedAt: parsed.exportedAt,
    notes: parsed.notes.map((note) => ({ ...note, tags: normalizeTags(note.tags) })),
  }
}
