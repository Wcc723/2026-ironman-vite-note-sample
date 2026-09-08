import { describe, expect, it } from 'vitest'
import {
  NOTES_STORAGE_KEY,
  createBackup,
  createNote,
  loadNotes,
  normalizeTags,
  parseBackup,
  saveNotes,
} from '../src/services/noteStorage'

const draft = {
  title: '週末靈感',
  content: '去看海，帶上相機。',
  tags: ['生活', ' 靈感 ', '生活'],
  pinned: true,
}

describe('noteStorage', () => {
  it('normalizes tags and round-trips saved notes', () => {
    const note = createNote(draft, new Date('2026-09-08T08:00:00.000Z'))
    saveNotes([note])

    expect(note.tags).toEqual(['生活', '靈感'])
    expect(loadNotes()).toEqual([note])
  })

  it('creates a versioned backup that can be restored', () => {
    const note = createNote(draft)
    const backup = createBackup([note], new Date('2026-09-08T08:00:00.000Z'))
    const restored = parseBackup(JSON.stringify(backup))

    expect(restored.version).toBe(1)
    expect(restored.exportedAt).toBe('2026-09-08T08:00:00.000Z')
    expect(restored.notes).toEqual([note])
  })

  it('rejects invalid backup files without touching stored notes', () => {
    const note = createNote(draft)
    saveNotes([note])

    expect(() => parseBackup('{"version":1,"notes":[{}]}')).toThrow('備份檔')
    expect(loadNotes()).toEqual([note])
    expect(window.localStorage.getItem(NOTES_STORAGE_KEY)).not.toBeNull()
  })

  it('removes blank and duplicate tags', () => {
    expect(normalizeTags([' 工作 ', '', '工作', '閱讀'])).toEqual(['工作', '閱讀'])
  })
})
