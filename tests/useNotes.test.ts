import { describe, expect, it } from 'vitest'
import { useNotes } from '../src/composables/useNotes'

describe('useNotes', () => {
  it('adds, edits, pins, deletes, and restores browser notes', () => {
    const memo = useNotes(window.localStorage)
    const created = memo.addNote({ title: '買花', content: '週五帶回家', tags: ['生活'], pinned: false })
    const firstNote = memo.notes.value[0]

    expect(created).toBe(true)
    expect(firstNote?.pinned).toBe(false)

    const updated = memo.updateNote(firstNote!.id, {
      title: '買一束花',
      content: '週五帶回家，選白色。',
      tags: ['生活', '提醒'],
      pinned: true,
    })

    expect(updated).toBe(true)
    expect(memo.notes.value[0]).toMatchObject({ title: '買一束花', pinned: true, tags: ['生活', '提醒'] })
    expect(useNotes(window.localStorage).notes.value).toHaveLength(1)

    expect(memo.removeNote(firstNote!.id)).toBe(true)
    expect(memo.notes.value).toEqual([])
  })
})
