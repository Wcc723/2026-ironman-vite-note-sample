import { describe, expect, it } from 'vitest'
import { filterAndSortNotes } from '../src/utils/noteFilters'
import type { Note } from '../src/types/note'

const notes: Note[] = [
  {
    id: 'older',
    title: '閱讀清單',
    content: '下週讀完這本書',
    tags: ['學習'],
    pinned: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'pinned',
    title: '會議想法',
    content: '準備三個提案方向',
    tags: ['工作'],
    pinned: true,
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
  },
  {
    id: 'newer',
    title: '旅行筆記',
    content: '週末安排去看海',
    tags: ['生活', '靈感'],
    pinned: false,
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  },
]

describe('filterAndSortNotes', () => {
  it('keeps pinned notes first, then sorts by update time', () => {
    expect(filterAndSortNotes(notes, { scope: 'all', tag: null, query: '' }).map((note) => note.id)).toEqual([
      'pinned',
      'newer',
      'older',
    ])
  })

  it('finds notes across title, content, and tags', () => {
    expect(filterAndSortNotes(notes, { scope: 'all', tag: null, query: '提案' }).map((note) => note.id)).toEqual(['pinned'])
    expect(filterAndSortNotes(notes, { scope: 'all', tag: null, query: '靈感' }).map((note) => note.id)).toEqual(['newer'])
  })

  it('filters by pinned and tag scopes', () => {
    expect(filterAndSortNotes(notes, { scope: 'pinned', tag: null, query: '' }).map((note) => note.id)).toEqual(['pinned'])
    expect(filterAndSortNotes(notes, { scope: 'tag', tag: '生活', query: '' }).map((note) => note.id)).toEqual(['newer'])
  })
})
