import type { Note } from '../types/note'

export type FilterScope = 'all' | 'pinned' | 'tag'

export interface NoteFilters {
  scope: FilterScope
  tag: string | null
  query: string
}

const normalize = (value: string) => value.trim().toLocaleLowerCase()

export function filterAndSortNotes(notes: Note[], filters: NoteFilters): Note[] {
  const query = normalize(filters.query)
  const selectedTag = normalize(filters.tag ?? '')

  return notes
    .filter((note) => {
      const haystack = [note.title, note.content, ...note.tags].join(' ').toLocaleLowerCase()
      const hasQuery = !query || haystack.includes(query)
      const hasScope =
        filters.scope === 'all' ||
        (filters.scope === 'pinned' && note.pinned) ||
        (filters.scope === 'tag' && note.tags.some((tag) => normalize(tag) === selectedTag))

      return hasQuery && hasScope
    })
    .sort((first, second) => {
      if (first.pinned !== second.pinned) return first.pinned ? -1 : 1
      return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
    })
}
