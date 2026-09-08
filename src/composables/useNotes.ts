import { ref } from 'vue'
import { createNote, loadNotes, saveNotes } from '../services/noteStorage'
import type { Note, NoteDraft } from '../types/note'

const persistenceError = '儲存失敗：請確認瀏覽器沒有封鎖本機儲存空間。'

export function useNotes(storage: Storage = window.localStorage) {
  const errorMessage = ref('')
  const notes = ref<Note[]>([])

  try {
    notes.value = loadNotes(storage)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : persistenceError
  }

  const persist = (nextNotes: Note[]): boolean => {
    try {
      saveNotes(nextNotes, storage)
      notes.value = nextNotes
      errorMessage.value = ''
      return true
    } catch {
      errorMessage.value = persistenceError
      return false
    }
  }

  const addNote = (draft: NoteDraft): boolean => persist([...notes.value, createNote(draft)])

  const updateNote = (id: string, draft: NoteDraft): boolean => {
    const now = new Date().toISOString()
    const updatedNotes = notes.value.map((note) =>
      note.id === id
        ? {
            ...createNote(draft, new Date(now)),
            id: note.id,
            createdAt: note.createdAt,
            updatedAt: now,
          }
        : note,
    )

    return persist(updatedNotes)
  }

  const removeNote = (id: string): boolean => persist(notes.value.filter((note) => note.id !== id))

  const replaceNotes = (nextNotes: Note[]): boolean => persist(nextNotes)

  const clearError = () => {
    errorMessage.value = ''
  }

  return { notes, errorMessage, addNote, updateNote, removeNote, replaceNotes, clearError }
}
